"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createBrand,
  createBrandContact,
  createCollaboration,
  updateCollaboration,
  createTask,
  toggleTaskStatus,
  saveInvoiceData,
  issueInvoice,
  cancelInvoice,
  recordPayment,
  deletePayment,
  updateInvoiceProfileSettings,
  createSponsoredPost,
  addPostSnapshot,
} from "@/lib/data/api";

export async function actionCreateBrand(formData: FormData) {
  const name = formData.get("name") as string;
  const website = formData.get("website") as string;
  const industry = formData.get("industry") as string;
  const notes = formData.get("notes") as string;

  if (!name?.trim()) throw new Error("Brand name is required");

  const brand = await createBrand({ name, website, industry, notes });
  revalidatePath("/brands");
  revalidatePath("/dashboard");
  redirect(`/brands/${brand.id}`);
}

export async function actionAddContact(formData: FormData) {
  const brandId = formData.get("brandId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const jobTitle = formData.get("job_title") as string;

  if (!name?.trim()) throw new Error("Contact name is required");

  await createBrandContact(brandId, { name, email, phone, job_title: jobTitle });
  revalidatePath(`/brands/${brandId}`);
}

export async function actionCreateCollaboration(formData: FormData) {
  const brand_id = formData.get("brand_id") as string;
  const contact_id = formData.get("contact_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const deal_amount = parseFloat(formData.get("deal_amount") as string) || 0;
  const currency = formData.get("currency") as string;
  const status = formData.get("status") as any;
  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;
  const notes = formData.get("notes") as string;
  const follower_snapshot = parseInt(formData.get("follower_snapshot") as string, 10);

  if (!title?.trim()) throw new Error("Title is required");
  if (!brand_id) throw new Error("Brand is required");

  const collab = await createCollaboration({
    brand_id,
    contact_id: contact_id || null,
    title,
    description,
    deal_amount,
    currency: currency || "INR",
    status: status || "lead",
    start_date,
    end_date,
    notes,
    initialFollowerSnapshot: isNaN(follower_snapshot) ? null : follower_snapshot,
  });

  revalidatePath("/collaborations");
  revalidatePath("/dashboard");
  redirect(`/collaborations/${collab.id}`);
}

export async function actionUpdateCollaborationStatus(collabId: string, status: any) {
  await updateCollaboration(collabId, { status });
  revalidatePath(`/collaborations/${collabId}`);
  revalidatePath("/collaborations");
  revalidatePath("/dashboard");
}

export async function actionCreateTask(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const due_date = formData.get("due_date") as string;
  const priority = (formData.get("priority") as any) || "medium";
  const collaboration_id = formData.get("collaboration_id") as string;

  if (!title?.trim()) throw new Error("Task title is required");

  await createTask({
    title,
    description,
    due_date: due_date || null,
    priority,
    collaboration_id: collaboration_id || null,
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (collaboration_id) revalidatePath(`/collaborations/${collaboration_id}`);
}

export async function actionToggleTask(taskId: string, collabId?: string | null) {
  await toggleTaskStatus(taskId);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (collabId) revalidatePath(`/collaborations/${collabId}`);
}

export async function actionSaveInvoice(payload: any) {
  const invId = await saveInvoiceData(payload);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${invId}`);
}

export async function actionIssueInvoice(invoiceId: string) {
  await issueInvoice(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function actionCancelInvoice(invoiceId: string) {
  await cancelInvoice(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function actionRecordPayment(formData: FormData) {
  const invoice_id = formData.get("invoice_id") as string;
  const amount = parseFloat(formData.get("amount") as string) || 0;
  const payment_date = formData.get("payment_date") as string;
  const payment_method = (formData.get("payment_method") as any) || "bank_transfer";
  const reference_number = formData.get("reference_number") as string;
  const notes = formData.get("notes") as string;

  if (amount <= 0) throw new Error("Amount must be greater than zero");

  await recordPayment({
    invoice_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    notes,
  });

  revalidatePath(`/invoices/${invoice_id}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

export async function actionDeletePayment(paymentId: string, invoiceId: string) {
  await deletePayment(paymentId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

export async function actionUpdateSettings(formData: FormData) {
  const business_name = formData.get("business_name") as string;
  const address = formData.get("address") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const tax_registration_number = formData.get("tax_registration_number") as string;
  const default_payment_instructions = formData.get("default_payment_instructions") as string;
  const default_notes = formData.get("default_notes") as string;
  const legal_name = formData.get("legal_name") as string;
  const pan = formData.get("pan") as string;
  const instagram_handle = formData.get("instagram_handle") as string;
  const gst_status = formData.get("gst_status") as string;
  const bank_account_holder = formData.get("bank_account_holder") as string;
  const bank_account_number = formData.get("bank_account_number") as string;
  const bank_ifsc = formData.get("bank_ifsc") as string;
  const bank_name = formData.get("bank_name") as string;
  const bank_branch = formData.get("bank_branch") as string;

  await updateInvoiceProfileSettings({
    business_name,
    address,
    email,
    phone,
    tax_registration_number,
    default_payment_instructions,
    default_notes,
    legal_name,
    pan,
    instagram_handle,
    gst_status,
    bank_account_holder,
    bank_account_number,
    bank_ifsc,
    bank_name,
    bank_branch,
  });

  revalidatePath("/settings");
}

export async function actionAddSponsoredPost(formData: FormData) {
  const collaboration_id = formData.get("collaboration_id") as string;
  const title = formData.get("title") as string;
  const post_url = formData.get("post_url") as string;
  const content_type = (formData.get("content_type") as any) || "reel";
  const published_at = formData.get("published_at") as string;
  const allocated_fee = parseFloat(formData.get("allocated_fee") as string) || 0;

  if (!title?.trim()) throw new Error("Post title is required");

  await createSponsoredPost({
    collaboration_id,
    title,
    post_url,
    content_type,
    published_at: published_at || undefined,
    allocated_fee: allocated_fee || undefined,
  });

  revalidatePath(`/collaborations/${collaboration_id}`);
}

export async function actionAddPostSnapshot(formData: FormData) {
  const sponsored_post_id = formData.get("sponsored_post_id") as string;
  const collaboration_id = formData.get("collaboration_id") as string;
  const views = parseInt(formData.get("views") as string, 10);
  const reach = parseInt(formData.get("reach") as string, 10);
  const likes = parseInt(formData.get("likes") as string, 10);
  const comments = parseInt(formData.get("comments") as string, 10);
  const shares = parseInt(formData.get("shares") as string, 10);
  const saves = parseInt(formData.get("saves") as string, 10);
  const notes = formData.get("notes") as string;

  await addPostSnapshot({
    sponsored_post_id,
    views: isNaN(views) ? null : views,
    reach: isNaN(reach) ? null : reach,
    likes: isNaN(likes) ? null : likes,
    comments: isNaN(comments) ? null : comments,
    shares: isNaN(shares) ? null : shares,
    saves: isNaN(saves) ? null : saves,
    notes,
  });

  revalidatePath(`/collaborations/${collaboration_id}`);
}
