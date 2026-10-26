import { readStore, writeStore } from "./store";
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
import { DEMO_USER_ID } from "@/lib/demo";
import { initialInvoiceSettings } from "./initial-data";
import { effectiveSnapshots } from "@/lib/analytics/post-metrics";
import { calculateInvoice, statusAfterPayments, effectiveStatus } from "@/lib/invoice-calc";
import { todayISO } from "@/lib/format";

// --- BRANDS & CONTACTS ---

export async function getBrands(includeArchived = false) {
  const store = readStore();
  return store.brands
    .filter((b) => b.user_id === DEMO_USER_ID && (includeArchived ? true : !b.is_archived))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getBrandById(id: string) {
  const store = readStore();
  const brand = store.brands.find((b) => b.id === id && b.user_id === DEMO_USER_ID);
  if (!brand) return null;
  const contacts = store.contacts.filter((c) => c.brand_id === id);
  const collabs = store.collaborations.filter((c) => c.brand_id === id);
  const invoices = store.invoices.filter((i) => i.brand_id === id);
  return { brand, contacts, collabs, invoices };
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
  const store = readStore();
  const id = "b_" + Date.now().toString(36);
  const now = new Date().toISOString();
  const brand: Brand = {
    id,
    user_id: DEMO_USER_ID,
    name: data.name.trim(),
    website: data.website?.trim() || null,
    industry: data.industry?.trim() || null,
    notes: data.notes?.trim() || null,
    legal_name: data.legal_name?.trim() || null,
    gstin: data.gstin?.trim() || null,
    address: data.address?.trim() || null,
    is_archived: false,
    created_at: now,
    updated_at: now,
  };
  store.brands.unshift(brand);
  writeStore(store);
  return brand;
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
  }
) {
  const store = readStore();
  const idx = store.brands.findIndex((b) => b.id === id && b.user_id === DEMO_USER_ID);
  if (idx === -1) throw new Error("Brand not found");
  const now = new Date().toISOString();
  store.brands[idx] = {
    ...store.brands[idx],
    ...data,
    updated_at: now,
  };
  writeStore(store);
  return store.brands[idx];
}

export async function createBrandContact(brandId: string, data: { name: string; email?: string; phone?: string; job_title?: string; notes?: string }) {
  const store = readStore();
  const id = "bc_" + Date.now().toString(36);
  const now = new Date().toISOString();
  const contact: BrandContact = {
    id,
    user_id: DEMO_USER_ID,
    brand_id: brandId,
    name: data.name.trim(),
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    job_title: data.job_title?.trim() || null,
    notes: data.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };
  store.contacts.push(contact);
  writeStore(store);
  return contact;
}

export async function deleteBrandContact(id: string) {
  const store = readStore();
  store.contacts = store.contacts.filter((c) => c.id !== id || c.user_id !== DEMO_USER_ID);
  writeStore(store);
}

// --- COLLABORATIONS ---

export async function getCollaborations(includeArchived = false) {
  const store = readStore();
  const collabs = store.collaborations
    .filter((c) => c.user_id === DEMO_USER_ID && (includeArchived ? true : !c.is_archived))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const brandMap = new Map(store.brands.map((b) => [b.id, b]));
  const contactMap = new Map(store.contacts.map((c) => [c.id, c]));

  return collabs.map((c) => ({
    ...c,
    brand: brandMap.get(c.brand_id) ?? null,
    contact: c.contact_id ? contactMap.get(c.contact_id) ?? null : null,
  }));
}

export async function getCollaborationById(id: string) {
  const store = readStore();
  const collab = store.collaborations.find((c) => c.id === id && c.user_id === DEMO_USER_ID);
  if (!collab) return null;

  const brand = store.brands.find((b) => b.id === collab.brand_id) ?? null;
  const contact = collab.contact_id ? store.contacts.find((c) => c.id === collab.contact_id) ?? null : null;
  const tasks = store.tasks.filter((t) => t.collaboration_id === id).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const invoices = store.invoices.filter((i) => i.collaboration_id === id).sort((a, b) => b.issue_date.localeCompare(a.issue_date));
  const invoiceIds = new Set(invoices.map((i) => i.id));
  const payments = store.payments.filter((p) => invoiceIds.has(p.invoice_id)).sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  const events = store.activityEvents.filter((e) => e.collaboration_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const posts = store.sponsoredPosts.filter((p) => p.collaboration_id === id);
  const snapshots = store.creatorSnapshots.filter((s) => s.collaboration_id === id);
  const postIds = new Set(posts.map((p) => p.id));
  const postSnapshots = effectiveSnapshots(
    store.postSnapshots.filter((s) => postIds.has(s.sponsored_post_id)),
  ).sort((a, b) => b.captured_at.localeCompare(a.captured_at));

  return {
    collab,
    brand,
    contact,
    tasks,
    invoices,
    payments,
    events,
    posts,
    snapshots,
    postSnapshots,
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
  const store = readStore();
  const id = "c_" + Date.now().toString(36);
  const now = new Date().toISOString();

  const collab: Collaboration = {
    id,
    user_id: DEMO_USER_ID,
    brand_id: data.brand_id,
    contact_id: data.contact_id || null,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    deal_amount: data.deal_amount,
    currency: (data.currency as Collaboration["currency"]) || "INR",
    status: data.status,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    notes: data.notes?.trim() || null,
    is_archived: false,
    created_at: now,
    updated_at: now,
  };

  store.collaborations.unshift(collab);

  // Add timeline event
  store.activityEvents.unshift({
    id: "ae_" + Date.now().toString(36),
    collaboration_id: id,
    event_type: "collaboration_created",
    description: `Collaboration created: ${collab.title}`,
    created_at: now,
  });

  // Optional creator snapshot captured at deal creation
  if (data.initialFollowerSnapshot && data.initialFollowerSnapshot > 0) {
    store.creatorSnapshots.unshift({
      id: "cs_" + Date.now().toString(36),
      collaboration_id: id,
      platform: "instagram",
      username: null,
      profile_url: null,
      snapshot_at: now,
      follower_count: data.initialFollowerSnapshot,
      average_views: null,
      average_reach: null,
      engagement_rate: null,
      source: "manual",
      notes: "Captured at collaboration creation",
      corrects_snapshot_id: null,
      created_at: now,
    });
  }

  writeStore(store);
  return collab;
}

export async function updateCollaboration(
  id: string,
  data: Partial<Omit<Collaboration, "id" | "user_id" | "created_at" | "updated_at">>
) {
  const store = readStore();
  const idx = store.collaborations.findIndex((c) => c.id === id && c.user_id === DEMO_USER_ID);
  if (idx === -1) throw new Error("Collaboration not found");

  const old = store.collaborations[idx];
  const now = new Date().toISOString();

  store.collaborations[idx] = {
    ...old,
    ...data,
    updated_at: now,
  };

  if (data.status && data.status !== old.status) {
    store.activityEvents.unshift({
      id: "ae_" + Date.now().toString(36),
      collaboration_id: id,
      event_type: "status_changed",
      description: `Status changed from ${old.status} to ${data.status}`,
      created_at: now,
    });
  }

  writeStore(store);
  return store.collaborations[idx];
}

// --- TASKS ---

export async function getTasks() {
  const store = readStore();
  const collabMap = new Map(store.collaborations.map((c) => [c.id, c]));
  const brandMap = new Map(store.brands.map((b) => [b.id, b]));

  return store.tasks
    .filter((t) => t.user_id === DEMO_USER_ID)
    .sort((a, b) => {
      // Incomplete first, then by due date asc
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    })
    .map((t) => {
      const collab = t.collaboration_id ? collabMap.get(t.collaboration_id) ?? null : null;
      const brand = collab ? brandMap.get(collab.brand_id) ?? null : null;
      return { ...t, collaboration: collab, brand };
    });
}

export async function createTask(data: {
  title: string;
  description?: string;
  due_date?: string | null;
  priority: Task["priority"];
  collaboration_id?: string | null;
}) {
  const store = readStore();
  const id = "t_" + Date.now().toString(36);
  const now = new Date().toISOString();

  const task: Task = {
    id,
    user_id: DEMO_USER_ID,
    collaboration_id: data.collaboration_id || null,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    due_date: data.due_date || null,
    priority: data.priority,
    status: "pending",
    completed_at: null,
    created_at: now,
    updated_at: now,
  };

  store.tasks.unshift(task);

  if (data.collaboration_id) {
    store.activityEvents.unshift({
      id: "ae_" + Date.now().toString(36),
      collaboration_id: data.collaboration_id,
      event_type: "task_created",
      description: `Task added: ${task.title}`,
      created_at: now,
    });
  }

  writeStore(store);
  return task;
}

export async function toggleTaskStatus(id: string) {
  const store = readStore();
  const idx = store.tasks.findIndex((t) => t.id === id && t.user_id === DEMO_USER_ID);
  if (idx === -1) throw new Error("Task not found");

  const task = store.tasks[idx];
  const nextStatus = task.status === "pending" ? "completed" : "pending";
  const now = new Date().toISOString();

  store.tasks[idx] = {
    ...task,
    status: nextStatus,
    completed_at: nextStatus === "completed" ? now : null,
    updated_at: now,
  };

  if (task.collaboration_id) {
    store.activityEvents.unshift({
      id: "ae_" + Date.now().toString(36),
      collaboration_id: task.collaboration_id,
      event_type: nextStatus === "completed" ? "task_completed" : "task_reopened",
      description: nextStatus === "completed" ? `Task completed: ${task.title}` : `Task reopened: ${task.title}`,
      created_at: now,
    });
  }

  writeStore(store);
  return store.tasks[idx];
}

export async function deleteTask(id: string) {
  const store = readStore();
  store.tasks = store.tasks.filter((t) => t.id !== id || t.user_id !== DEMO_USER_ID);
  writeStore(store);
}

// --- INVOICES ---

export async function getInvoices() {
  const store = readStore();
  const brandMap = new Map(store.brands.map((b) => [b.id, b]));
  const collabMap = new Map(store.collaborations.map((c) => [c.id, c]));

  // Calculate payment sums
  const paidMap = new Map<string, number>();
  for (const p of store.payments) {
    paidMap.set(p.invoice_id, (paidMap.get(p.invoice_id) ?? 0) + p.amount);
  }

  const today = todayISO();

  return store.invoices
    .filter((i) => i.user_id === DEMO_USER_ID)
    .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
    .map((inv) => {
      const paid = paidMap.get(inv.id) ?? 0;
      const balance = Math.max(0, inv.total_amount - paid);
      const effStatus = effectiveStatus(inv.status, inv.total_amount, paid, inv.due_date, today);
      return {
        ...inv,
        brand: brandMap.get(inv.brand_id) ?? null,
        collaboration: inv.collaboration_id ? collabMap.get(inv.collaboration_id) ?? null : null,
        paid_amount: paid,
        balance_due: balance,
        effective_status: effStatus,
      };
    });
}

export async function getInvoiceById(id: string) {
  const store = readStore();
  const inv = store.invoices.find((i) => i.id === id && i.user_id === DEMO_USER_ID);
  if (!inv) return null;

  const brand = store.brands.find((b) => b.id === inv.brand_id) ?? null;
  const collab = inv.collaboration_id ? store.collaborations.find((c) => c.id === inv.collaboration_id) ?? null : null;
  const items = store.invoiceItems.filter((it) => it.invoice_id === id).sort((a, b) => a.sort_order - b.sort_order);
  const payments = store.payments.filter((p) => p.invoice_id === id).sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, inv.total_amount - paid);
  const effStatus = effectiveStatus(inv.status, inv.total_amount, paid, inv.due_date, todayISO());

  return {
    invoice: inv,
    brand,
    collab,
    items,
    payments,
    paid_amount: paid,
    balance_due: balance,
    effective_status: effStatus,
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
  const store = readStore();
  const now = new Date().toISOString();

  // Validate line items & compute server totals
  const calc = calculateInvoice(payload.items, payload.discount_type, payload.discount_value, payload.tax_rate);

  let invId = payload.id;
  let invNumber = payload.invoice_number;

  if (!invId) {
    invId = "inv_" + Date.now().toString(36);
    store.invoiceCounter += 1;
    const year = new Date().getFullYear();
    invNumber = `INV-${year}-${store.invoiceCounter.toString().padStart(4, "0")}`;

    const newInvoice: Invoice = {
      id: invId,
      user_id: DEMO_USER_ID,
      brand_id: payload.brand_id,
      collaboration_id: payload.collaboration_id || null,
      invoice_number: invNumber,
      issue_date: payload.issue_date,
      due_date: payload.due_date || null,
      currency: payload.currency,
      status: "draft",
      subtotal: calc.subtotal,
      discount_type: payload.discount_type,
      discount_value: payload.discount_value,
      discount_amount: calc.discount_amount,
      tax_rate: payload.tax_rate,
      tax_amount: calc.tax_amount,
      total_amount: calc.total,
      payment_terms: payload.payment_terms || null,
      reference_number: payload.reference_number || null,
      notes: payload.notes || null,
      terms: payload.terms || null,
      payment_instructions: payload.payment_instructions || null,
      logo_path: null,
      sender_snapshot: payload.sender,
      recipient_snapshot: payload.recipient,
      issued_document: null,
      issued_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
    };

    store.invoices.unshift(newInvoice);
  } else {
    const idx = store.invoices.findIndex((i) => i.id === invId && i.user_id === DEMO_USER_ID);
    if (idx === -1) throw new Error("Invoice not found");
    if (store.invoices[idx].status !== "draft") {
      throw new Error("Issued invoices cannot be edited");
    }

    store.invoices[idx] = {
      ...store.invoices[idx],
      brand_id: payload.brand_id,
      collaboration_id: payload.collaboration_id || null,
      issue_date: payload.issue_date,
      due_date: payload.due_date || null,
      currency: payload.currency,
      subtotal: calc.subtotal,
      discount_type: payload.discount_type,
      discount_value: payload.discount_value,
      discount_amount: calc.discount_amount,
      tax_rate: payload.tax_rate,
      tax_amount: calc.tax_amount,
      total_amount: calc.total,
      payment_terms: payload.payment_terms || null,
      reference_number: payload.reference_number || null,
      notes: payload.notes || null,
      terms: payload.terms || null,
      payment_instructions: payload.payment_instructions || null,
      sender_snapshot: payload.sender,
      recipient_snapshot: payload.recipient,
      updated_at: now,
    };

    // Remove old items
    store.invoiceItems = store.invoiceItems.filter((it) => it.invoice_id !== invId);
  }

  // Insert items
  payload.items.forEach((it, idx) => {
    store.invoiceItems.push({
      id: "ii_" + Date.now().toString(36) + "_" + idx,
      invoice_id: invId!,
      description: it.description.trim(),
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: Math.round(it.quantity * it.unit_price * 100) / 100,
      sort_order: idx,
    });
  });

  writeStore(store);
  return invId;
}

export async function issueInvoice(id: string) {
  const store = readStore();
  const idx = store.invoices.findIndex((i) => i.id === id && i.user_id === DEMO_USER_ID);
  if (idx === -1) throw new Error("Invoice not found");
  const inv = store.invoices[idx];
  if (inv.status !== "draft") throw new Error("Invoice is already issued");
  if (inv.total_amount <= 0) throw new Error("Invoice total must be greater than zero to issue");

  const now = new Date().toISOString();
  store.invoices[idx] = {
    ...inv,
    status: "issued",
    issued_at: now,
    updated_at: now,
  };

  if (inv.collaboration_id) {
    store.activityEvents.unshift({
      id: "ae_" + Date.now().toString(36),
      collaboration_id: inv.collaboration_id,
      event_type: "invoice_issued",
      description: `Invoice ${inv.invoice_number} issued`,
      created_at: now,
    });
  }

  writeStore(store);
  return store.invoices[idx];
}

export async function cancelInvoice(id: string) {
  const store = readStore();
  const idx = store.invoices.findIndex((i) => i.id === id && i.user_id === DEMO_USER_ID);
  if (idx === -1) throw new Error("Invoice not found");
  const inv = store.invoices[idx];

  const hasPayments = store.payments.some((p) => p.invoice_id === id);
  if (hasPayments) throw new Error("Cannot cancel an invoice with recorded payments. Reverse payments first.");

  const now = new Date().toISOString();
  store.invoices[idx] = {
    ...inv,
    status: "cancelled",
    cancelled_at: now,
    updated_at: now,
  };

  if (inv.collaboration_id) {
    store.activityEvents.unshift({
      id: "ae_" + Date.now().toString(36),
      collaboration_id: inv.collaboration_id,
      event_type: "invoice_cancelled",
      description: `Invoice ${inv.invoice_number} cancelled`,
      created_at: now,
    });
  }

  writeStore(store);
  return store.invoices[idx];
}

// --- PAYMENTS ---

export async function getPayments() {
  const store = readStore();
  const invMap = new Map(store.invoices.map((i) => [i.id, i]));
  const brandMap = new Map(store.brands.map((b) => [b.id, b]));
  const collabMap = new Map(store.collaborations.map((c) => [c.id, c]));

  return store.payments
    .filter((p) => p.user_id === DEMO_USER_ID)
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
    .map((p) => {
      const inv = invMap.get(p.invoice_id) ?? null;
      const brand = inv ? brandMap.get(inv.brand_id) ?? null : null;
      const collab = inv?.collaboration_id ? collabMap.get(inv.collaboration_id) ?? null : null;
      return { ...p, invoice: inv, brand, collaboration: collab };
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
  const store = readStore();
  const inv = store.invoices.find((i) => i.id === data.invoice_id && i.user_id === DEMO_USER_ID);
  if (!inv) throw new Error("Invoice not found");
  if (inv.status !== "issued" && inv.status !== "partially_paid") {
    throw new Error("Payments can only be added to issued invoices with a balance");
  }

  const existingPayments = store.payments.filter((p) => p.invoice_id === data.invoice_id);
  const alreadyPaid = existingPayments.reduce((s, p) => s + p.amount, 0);

  if (alreadyPaid + data.amount > inv.total_amount) {
    throw new Error(`Payment exceeds balance due. Max allowed: ${inv.currency} ${(inv.total_amount - alreadyPaid).toFixed(2)}`);
  }

  const id = "pay_" + Date.now().toString(36);
  const now = new Date().toISOString();

  const payment: Payment = {
    id,
    user_id: DEMO_USER_ID,
    invoice_id: data.invoice_id,
    amount: data.amount,
    currency: inv.currency,
    payment_date: data.payment_date,
    payment_method: data.payment_method,
    reference_number: data.reference_number?.trim() || null,
    notes: data.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  store.payments.unshift(payment);

  // Update invoice status
  const totalPaid = alreadyPaid + data.amount;
  const nextStatus = statusAfterPayments(inv.status, inv.total_amount, totalPaid);
  const invIdx = store.invoices.findIndex((i) => i.id === inv.id);
  store.invoices[invIdx].status = nextStatus;
  store.invoices[invIdx].updated_at = now;

  // Add activity event
  if (inv.collaboration_id) {
    store.activityEvents.unshift({
      id: "ae_" + Date.now().toString(36),
      collaboration_id: inv.collaboration_id,
      event_type: "payment_recorded",
      description: `Payment recorded: ${payment.currency} ${payment.amount.toLocaleString()} on ${inv.invoice_number}`,
      created_at: now,
    });
  }

  writeStore(store);
  return payment;
}

export async function deletePayment(id: string) {
  const store = readStore();
  const pay = store.payments.find((p) => p.id === id && p.user_id === DEMO_USER_ID);
  if (!pay) throw new Error("Payment not found");

  store.payments = store.payments.filter((p) => p.id !== id);

  // Recalculate invoice status
  const invIdx = store.invoices.findIndex((i) => i.id === pay.invoice_id);
  if (invIdx !== -1) {
    const inv = store.invoices[invIdx];
    const remaining = store.payments.filter((p) => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0);
    store.invoices[invIdx].status = statusAfterPayments(inv.status, inv.total_amount, remaining);
    store.invoices[invIdx].updated_at = new Date().toISOString();
  }

  writeStore(store);
}

// --- SETTINGS ---

export async function getInvoiceProfileSettings() {
  const store = readStore();
  return { ...initialInvoiceSettings, ...store.invoiceSettings };
}

export async function updateInvoiceProfileSettings(data: Partial<InvoiceProfileSettings>) {
  const store = readStore();
  store.invoiceSettings = {
    ...store.invoiceSettings,
    ...data,
  };
  writeStore(store);
  return store.invoiceSettings;
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
  const store = readStore();
  const id = "sp_" + Date.now().toString(36);
  const now = new Date().toISOString();

  const post: SponsoredPost = {
    id,
    collaboration_id: data.collaboration_id,
    platform: "instagram",
    platform_media_id: null,
    title: data.title.trim(),
    post_url: data.post_url?.trim() || null,
    content_type: data.content_type,
    published_at: data.published_at || null,
    deliverable: data.deliverable?.trim() || null,
    sponsorship_status: data.published_at ? "published" : "planned",
    tracking_source: "manual",
    allocated_fee: data.allocated_fee || null,
    notes: data.notes?.trim() || null,
    created_at: now,
  };

  store.sponsoredPosts.unshift(post);
  writeStore(store);
  return post;
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
  const store = readStore();
  const id = "ps_" + Date.now().toString(36);
  const now = new Date().toISOString();

  const snap: PostSnapshot = {
    id,
    sponsored_post_id: data.sponsored_post_id,
    captured_at: now,
    views: data.views ?? null,
    reach: data.reach ?? null,
    likes: data.likes ?? null,
    comments: data.comments ?? null,
    shares: data.shares ?? null,
    saves: data.saves ?? null,
    accounts_engaged: data.accounts_engaged ?? null,
    profile_activity: null,
    link_clicks: null,
    average_watch_time: null,
    source: "manual",
    notes: data.notes?.trim() || null,
    corrects_snapshot_id: null,
    raw_metrics: null,
    created_at: now,
  };

  store.postSnapshots.unshift(snap);
  writeStore(store);
  return snap;
}
