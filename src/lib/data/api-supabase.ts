/**
 * Supabase implementation of the data layer. Mirrors api-local.ts function-for-function so pages
 * and server actions never know which backend is active (see api.ts).
 *
 * Every call runs as the signed-in user, so Row Level Security scopes all reads and writes.
 * Money moves only through the SECURITY DEFINER functions (save_invoice, record_payment, ...),
 * which recompute totals with numeric arithmetic and lock rows against overpayment.
 */
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth";
import { effectiveSnapshots } from "@/lib/analytics/post-metrics";
import type {
  Brand,
  BrandContact,
  Collaboration,
  Task,
  Invoice,
  InvoiceItem,
  Payment,
  ActivityEvent,
  InvoiceProfileSettings,
  CreatorSnapshot,
  SponsoredPost,
  PostSnapshot,
} from "@/lib/types";

async function ctx() {
  const user = await requireUser();
  const supabase = await createClient();
  return { supabase, userId: user.id };
}

type Res<T> = { data: T | null; error: { message: string } | null };

function one<T>(res: Res<T>, what = "Record"): T {
  if (res.error) throw new Error(res.error.message);
  if (!res.data) throw new Error(`${what} not found`);
  return res.data;
}

function many<T>(res: Res<T[]>): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

const day = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : null);
const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

function normalizeTask(t: Task): Task {
  return { ...t, due_date: day(t.due_date) };
}

// --- BRANDS & CONTACTS ---

export async function getBrands(includeArchived = false) {
  const { supabase } = await ctx();
  let q = supabase.from("brands").select("*").order("updated_at", { ascending: false });
  if (!includeArchived) q = q.eq("is_archived", false);
  return many<Brand>(await q);
}

export async function getBrandById(id: string) {
  const { supabase } = await ctx();
  const brandRes = await supabase.from("brands").select("*").eq("id", id).maybeSingle();
  if (brandRes.error) throw new Error(brandRes.error.message);
  if (!brandRes.data) return null;
  const [contacts, collabs, invoices] = await Promise.all([
    supabase.from("brand_contacts").select("*").eq("brand_id", id).order("created_at"),
    supabase.from("collaborations").select("*").eq("brand_id", id).order("updated_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("brand_id", id).order("issue_date", { ascending: false }),
  ]);
  return {
    brand: brandRes.data as Brand,
    contacts: many<BrandContact>(contacts),
    collabs: many<Collaboration>(collabs),
    invoices: many<Invoice>(invoices),
  };
}

export async function createBrand(data: {
  name: string;
  website?: string;
  industry?: string;
  notes?: string;
  legal_name?: string;
  gstin?: string;
  address?: string;
}) {
  const { supabase, userId } = await ctx();
  const res = await supabase
    .from("brands")
    .insert({
      user_id: userId,
      name: data.name.trim(),
      website: clean(data.website),
      industry: clean(data.industry),
      notes: clean(data.notes),
      legal_name: clean(data.legal_name),
      gstin: clean(data.gstin),
      address: clean(data.address),
    })
    .select("*")
    .single();
  return one<Brand>(res);
}

export async function updateBrand(
  id: string,
  data: {
    name: string;
    website?: string;
    industry?: string;
    notes?: string;
    legal_name?: string;
    gstin?: string;
    address?: string;
    is_archived?: boolean;
  },
) {
  const { supabase } = await ctx();
  const res = await supabase.from("brands").update(data).eq("id", id).select("*").single();
  return one<Brand>(res, "Brand");
}

export async function createBrandContact(
  brandId: string,
  data: { name: string; email?: string; phone?: string; job_title?: string; notes?: string },
) {
  const { supabase, userId } = await ctx();
  const res = await supabase
    .from("brand_contacts")
    .insert({
      user_id: userId,
      brand_id: brandId,
      name: data.name.trim(),
      email: clean(data.email),
      phone: clean(data.phone),
      job_title: clean(data.job_title),
      notes: clean(data.notes),
    })
    .select("*")
    .single();
  return one<BrandContact>(res);
}

export async function deleteBrandContact(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("brand_contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// --- COLLABORATIONS ---

export async function getCollaborations(includeArchived = false) {
  const { supabase } = await ctx();
  let q = supabase.from("collaborations").select("*").order("updated_at", { ascending: false });
  if (!includeArchived) q = q.eq("is_archived", false);
  const [collabs, brands, contacts] = await Promise.all([
    q,
    supabase.from("brands").select("*"),
    supabase.from("brand_contacts").select("*"),
  ]);
  const brandMap = new Map(many<Brand>(brands).map((b) => [b.id, b]));
  const contactMap = new Map(many<BrandContact>(contacts).map((c) => [c.id, c]));
  return many<Collaboration>(collabs).map((c) => ({
    ...c,
    start_date: day(c.start_date),
    end_date: day(c.end_date),
    brand: brandMap.get(c.brand_id) ?? null,
    contact: c.contact_id ? (contactMap.get(c.contact_id) ?? null) : null,
  }));
}

export async function getCollaborationById(id: string) {
  const { supabase } = await ctx();
  const collabRes = await supabase.from("collaborations").select("*").eq("id", id).maybeSingle();
  if (collabRes.error) throw new Error(collabRes.error.message);
  if (!collabRes.data) return null;
  const raw = collabRes.data as Collaboration;
  const collab: Collaboration = { ...raw, start_date: day(raw.start_date), end_date: day(raw.end_date) };

  const [brandRes, contactRes, tasks, invoices, events, posts, snapshots] = await Promise.all([
    supabase.from("brands").select("*").eq("id", collab.brand_id).maybeSingle(),
    collab.contact_id
      ? supabase.from("brand_contacts").select("*").eq("id", collab.contact_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("tasks").select("*").eq("collaboration_id", id).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("invoices").select("*").eq("collaboration_id", id).order("issue_date", { ascending: false }),
    supabase.from("activity_events").select("*").eq("collaboration_id", id).order("created_at", { ascending: false }),
    supabase.from("sponsored_posts").select("*").eq("collaboration_id", id).order("created_at", { ascending: false }),
    supabase.from("creator_metric_snapshots").select("*").eq("collaboration_id", id).order("snapshot_at", { ascending: false }),
  ]);

  const invoiceList = many<Invoice>(invoices);
  const invoiceIds = invoiceList.map((i) => i.id);
  const paymentsRes = invoiceIds.length
    ? await supabase.from("payments").select("*").in("invoice_id", invoiceIds).order("payment_date", { ascending: false })
    : { data: [], error: null };
  const postList = many<SponsoredPost>(posts);
  const postIds = postList.map((p) => p.id);
  const postSnapsRes = postIds.length
    ? await supabase.from("post_metric_snapshots").select("*").in("sponsored_post_id", postIds).order("captured_at", { ascending: false })
    : { data: [], error: null };

  return {
    collab,
    brand: (brandRes.data as Brand | null) ?? null,
    contact: (contactRes.data as BrandContact | null) ?? null,
    tasks: many<Task>(tasks).map(normalizeTask),
    invoices: invoiceList,
    payments: many<Payment>(paymentsRes as Res<Payment[]>),
    events: many<ActivityEvent>(events),
    posts: postList,
    snapshots: many<CreatorSnapshot>(snapshots),
    postSnapshots: effectiveSnapshots(many<PostSnapshot>(postSnapsRes as Res<PostSnapshot[]>)),
  };
}

export async function createCollaboration(data: {
  brand_id: string;
  contact_id?: string | null;
  title: string;
  description?: string;
  deal_amount: number;
  currency: string;
  status: Collaboration["status"];
  start_date?: string | null;
  end_date?: string | null;
  notes?: string;
  initialFollowerSnapshot?: number | null;
}) {
  const { supabase, userId } = await ctx();
  const res = await supabase
    .from("collaborations")
    .insert({
      user_id: userId,
      brand_id: data.brand_id,
      contact_id: data.contact_id || null,
      title: data.title.trim(),
      description: clean(data.description),
      deal_amount: data.deal_amount,
      currency: data.currency || "INR",
      status: data.status,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      notes: clean(data.notes),
    })
    .select("*")
    .single();
  const collab = one<Collaboration>(res);

  if (data.initialFollowerSnapshot && data.initialFollowerSnapshot > 0) {
    await supabase.from("creator_metric_snapshots").insert({
      user_id: userId,
      collaboration_id: collab.id,
      platform: "instagram",
      follower_count: data.initialFollowerSnapshot,
      source: "manual",
      notes: "Captured at collaboration creation",
    });
  }
  return collab;
}

export async function updateCollaboration(
  id: string,
  data: Partial<Omit<Collaboration, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const { supabase } = await ctx();
  const res = await supabase.from("collaborations").update(data).eq("id", id).select("*").single();
  return one<Collaboration>(res, "Collaboration");
}

// --- TASKS ---

export async function getTasks() {
  const { supabase } = await ctx();
  const [tasks, collabs, brands] = await Promise.all([
    supabase.from("tasks").select("*"),
    supabase.from("collaborations").select("*"),
    supabase.from("brands").select("*"),
  ]);
  const collabMap = new Map(many<Collaboration>(collabs).map((c) => [c.id, c]));
  const brandMap = new Map(many<Brand>(brands).map((b) => [b.id, b]));
  return many<Task>(tasks)
    .map(normalizeTask)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    })
    .map((t) => {
      const collaboration = t.collaboration_id ? (collabMap.get(t.collaboration_id) ?? null) : null;
      const brand = collaboration ? (brandMap.get(collaboration.brand_id) ?? null) : null;
      return { ...t, collaboration, brand };
    });
}

export async function createTask(data: {
  title: string;
  description?: string;
  due_date?: string | null;
  priority: Task["priority"];
  collaboration_id?: string | null;
}) {
  const { supabase, userId } = await ctx();
  const res = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: data.title.trim(),
      description: clean(data.description),
      due_date: data.due_date || null,
      priority: data.priority,
      collaboration_id: data.collaboration_id || null,
    })
    .select("*")
    .single();
  return normalizeTask(one<Task>(res));
}

export async function toggleTaskStatus(id: string) {
  const { supabase } = await ctx();
  const current = one<Task>(await supabase.from("tasks").select("*").eq("id", id).maybeSingle(), "Task");
  const next = current.status === "pending" ? "completed" : "pending";
  const res = await supabase
    .from("tasks")
    .update({ status: next, completed_at: next === "completed" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();
  return normalizeTask(one<Task>(res, "Task"));
}

export async function deleteTask(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// --- INVOICES ---

type BalanceRow = { invoice_id: string; paid_amount: number; balance_due: number; effective_status: string };

export async function getInvoices() {
  const { supabase } = await ctx();
  const [invoices, balances, brands, collabs] = await Promise.all([
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
    supabase.from("invoice_balances").select("*"),
    supabase.from("brands").select("*"),
    supabase.from("collaborations").select("*"),
  ]);
  const balMap = new Map(many<BalanceRow>(balances).map((b) => [b.invoice_id, b]));
  const brandMap = new Map(many<Brand>(brands).map((b) => [b.id, b]));
  const collabMap = new Map(many<Collaboration>(collabs).map((c) => [c.id, c]));
  return many<Invoice>(invoices).map((inv) => {
    const bal = balMap.get(inv.id);
    return {
      ...inv,
      brand: brandMap.get(inv.brand_id) ?? null,
      collaboration: inv.collaboration_id ? (collabMap.get(inv.collaboration_id) ?? null) : null,
      paid_amount: bal?.paid_amount ?? 0,
      balance_due: bal?.balance_due ?? inv.total_amount,
      effective_status: (bal?.effective_status ?? inv.status) as Invoice["status"] | "overdue",
    };
  });
}

export async function getInvoiceById(id: string) {
  const { supabase } = await ctx();
  const invRes = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (invRes.error) throw new Error(invRes.error.message);
  if (!invRes.data) return null;
  const invoice = invRes.data as Invoice;

  const [brandRes, collabRes, items, payments, balRes] = await Promise.all([
    supabase.from("brands").select("*").eq("id", invoice.brand_id).maybeSingle(),
    invoice.collaboration_id
      ? supabase.from("collaborations").select("*").eq("id", invoice.collaboration_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order"),
    supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: false }),
    supabase.from("invoice_balances").select("*").eq("invoice_id", id).maybeSingle(),
  ]);
  const bal = balRes.data as BalanceRow | null;
  return {
    invoice,
    brand: (brandRes.data as Brand | null) ?? null,
    collab: (collabRes.data as Collaboration | null) ?? null,
    items: many<InvoiceItem>(items),
    payments: many<Payment>(payments),
    paid_amount: bal?.paid_amount ?? 0,
    balance_due: bal?.balance_due ?? invoice.total_amount,
    effective_status: (bal?.effective_status ?? invoice.status) as Invoice["status"] | "overdue",
  };
}

export async function saveInvoiceData(payload: {
  id?: string;
  brand_id: string;
  collaboration_id?: string | null;
  invoice_number?: string;
  issue_date: string;
  due_date?: string | null;
  currency: Invoice["currency"];
  payment_terms?: string;
  reference_number?: string;
  notes?: string;
  terms?: string;
  payment_instructions?: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  tax_rate: number;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  sender: Invoice["sender_snapshot"];
  recipient: Invoice["recipient_snapshot"];
}) {
  const { supabase } = await ctx();
  const { data, error } = await supabase.rpc("save_invoice", { p_id: payload.id ?? null, p_payload: payload });
  if (error) throw new Error(error.message);
  return data as string;
}

async function fetchInvoice(id: string) {
  const { supabase } = await ctx();
  return one<Invoice>(await supabase.from("invoices").select("*").eq("id", id).maybeSingle(), "Invoice");
}

export async function issueInvoice(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("issue_invoice", { p_id: id });
  if (error) throw new Error(error.message);
  return fetchInvoice(id);
}

export async function cancelInvoice(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("cancel_invoice", { p_id: id });
  if (error) throw new Error(error.message);
  return fetchInvoice(id);
}

// --- PAYMENTS ---

export async function getPayments() {
  const { supabase } = await ctx();
  const [payments, invoices, brands, collabs] = await Promise.all([
    supabase.from("payments").select("*").order("payment_date", { ascending: false }),
    supabase.from("invoices").select("*"),
    supabase.from("brands").select("*"),
    supabase.from("collaborations").select("*"),
  ]);
  const invMap = new Map(many<Invoice>(invoices).map((i) => [i.id, i]));
  const brandMap = new Map(many<Brand>(brands).map((b) => [b.id, b]));
  const collabMap = new Map(many<Collaboration>(collabs).map((c) => [c.id, c]));
  return many<Payment>(payments).map((p) => {
    const invoice = invMap.get(p.invoice_id) ?? null;
    const brand = invoice ? (brandMap.get(invoice.brand_id) ?? null) : null;
    const collaboration = invoice?.collaboration_id ? (collabMap.get(invoice.collaboration_id) ?? null) : null;
    return { ...p, invoice, brand, collaboration };
  });
}

export async function recordPayment(data: {
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: Payment["payment_method"];
  reference_number?: string;
  notes?: string;
}) {
  const { supabase } = await ctx();
  const { data: id, error } = await supabase.rpc("record_payment", {
    p_invoice_id: data.invoice_id,
    p_amount: data.amount,
    p_date: data.payment_date,
    p_method: data.payment_method,
    p_reference: clean(data.reference_number),
    p_notes: clean(data.notes),
  });
  if (error) throw new Error(error.message);
  return one<Payment>(await supabase.from("payments").select("*").eq("id", id as string).maybeSingle(), "Payment");
}

export async function deletePayment(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("delete_payment", { p_id: id });
  if (error) throw new Error(error.message);
}

// --- SETTINGS ---

export async function getInvoiceProfileSettings(): Promise<InvoiceProfileSettings> {
  const { supabase, userId } = await ctx();
  const res = await supabase.from("invoice_profile_settings").select("*").eq("user_id", userId).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  if (res.data) return res.data as InvoiceProfileSettings;

  // First visit: pre-fill from the Google profile instead of showing a blank form.
  const profile = await getProfile();
  return {
    id: "",
    user_id: userId,
    business_name: profile.business_name || profile.full_name || "",
    address: null,
    email: profile.email,
    phone: profile.phone,
    website: null,
    tax_registration_number: null,
    logo_path: null,
    default_currency: profile.currency,
    default_payment_instructions: null,
    default_notes: null,
    default_terms: null,
    legal_name: profile.full_name,
  };
}

export async function updateInvoiceProfileSettings(data: Partial<InvoiceProfileSettings>) {
  const { supabase, userId } = await ctx();
  const current = await getInvoiceProfileSettings();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = { ...current, ...data };
  const res = await supabase
    .from("invoice_profile_settings")
    .upsert({ ...rest, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();
  return one<InvoiceProfileSettings>(res);
}

// --- ANALYTICS & SPONSORED POSTS ---

export async function createSponsoredPost(data: {
  collaboration_id: string;
  title: string;
  post_url?: string;
  content_type: SponsoredPost["content_type"];
  published_at?: string;
  deliverable?: string;
  allocated_fee?: number;
  notes?: string;
}) {
  const { supabase, userId } = await ctx();
  const res = await supabase
    .from("sponsored_posts")
    .insert({
      user_id: userId,
      collaboration_id: data.collaboration_id,
      platform: "instagram",
      title: data.title.trim(),
      post_url: clean(data.post_url),
      content_type: data.content_type,
      published_at: data.published_at || null,
      deliverable: clean(data.deliverable),
      sponsorship_status: data.published_at ? "published" : "planned",
      tracking_source: "manual",
      allocated_fee: data.allocated_fee || null,
      notes: clean(data.notes),
    })
    .select("*")
    .single();
  return one<SponsoredPost>(res);
}

export async function addPostSnapshot(data: {
  sponsored_post_id: string;
  views?: number | null;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  accounts_engaged?: number | null;
  notes?: string;
}) {
  const { supabase, userId } = await ctx();
  const res = await supabase
    .from("post_metric_snapshots")
    .insert({
      user_id: userId,
      sponsored_post_id: data.sponsored_post_id,
      views: data.views ?? null,
      reach: data.reach ?? null,
      likes: data.likes ?? null,
      comments: data.comments ?? null,
      shares: data.shares ?? null,
      saves: data.saves ?? null,
      accounts_engaged: data.accounts_engaged ?? null,
      source: "manual",
      notes: clean(data.notes),
    })
    .select("*")
    .single();
  return one<PostSnapshot>(res);
}
