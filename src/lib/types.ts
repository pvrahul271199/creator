// Hand-written row types mirroring supabase/migrations. Numeric columns arrive as
// numbers from PostgREST; bigint metric columns arrive as numbers (safe below 2^53).

export type Currency = "INR" | "USD" | "EUR" | "GBP" | "AED";
export type CollaborationStatus = "lead" | "negotiating" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type TaskStatus = "pending" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
export type EffectiveInvoiceStatus = InvoiceStatus | "overdue";
export type PaymentMethod = "bank_transfer" | "upi" | "cash" | "other";
export type MetricSource = "manual" | "instagram_api";
export type ContentType = "reel" | "feed_post" | "carousel" | "story" | "video" | "other";

export interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  currency: Currency;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  /** Billing identity used to pre-fill "Bill To" on invoices. */
  legal_name?: string | null;
  gstin?: string | null;
  address?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandContact {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collaboration {
  id: string;
  user_id: string;
  brand_id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  deal_amount: number;
  currency: Currency;
  status: CollaborationStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  collaboration_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  brand_id: string;
  collaboration_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: Currency;
  status: InvoiceStatus;
  subtotal: number;
  discount_type: "percent" | "fixed";
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  payment_terms: string | null;
  reference_number: string | null;
  notes: string | null;
  terms: string | null;
  payment_instructions: string | null;
  logo_path: string | null;
  sender_snapshot: PartyDetails;
  recipient_snapshot: PartyDetails;
  issued_document: Record<string, unknown> | null;
  issued_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankDetails {
  account_holder?: string | null;
  account_number?: string | null;
  ifsc?: string | null;
  bank_name?: string | null;
  branch?: string | null;
}

export interface PartyDetails {
  name?: string | null;
  legal_name?: string | null;
  /** Display handle, e.g. @gaya.cookss */
  handle?: string | null;
  contact?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  /** GSTIN for the recipient, or GST number for the sender. */
  tax_id?: string | null;
  pan?: string | null;
  instagram?: string | null;
  /** Free-text GST status, e.g. "Not registered for GST". */
  gst_status?: string | null;
  /** Sender only: where the money should be sent. */
  bank?: BankDetails | null;
  /** Sender only: date the content went live / work was delivered (yyyy-mm-dd). */
  delivered_on?: string | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export interface InvoiceBalance {
  invoice_id: string;
  paid_amount: number;
  balance_due: number;
  effective_status: EffectiveInvoiceStatus;
}

export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string;
  amount: number;
  currency: Currency;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  collaboration_id: string | null;
  event_type: string;
  description: string;
  created_at: string;
}

export interface InvoiceProfileSettings {
  id: string;
  user_id: string;
  business_name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  tax_registration_number: string | null;
  logo_path: string | null;
  default_currency: Currency;
  default_payment_instructions: string | null;
  default_notes: string | null;
  default_terms: string | null;
  legal_name?: string | null;
  pan?: string | null;
  instagram_handle?: string | null;
  gst_status?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
}

export interface CreatorSnapshot {
  id: string;
  collaboration_id: string | null;
  platform: "instagram";
  username: string | null;
  profile_url: string | null;
  snapshot_at: string;
  follower_count: number | null;
  average_views: number | null;
  average_reach: number | null;
  engagement_rate: number | null;
  source: MetricSource;
  notes: string | null;
  corrects_snapshot_id: string | null;
  created_at: string;
}

export interface SponsoredPost {
  id: string;
  collaboration_id: string;
  platform: "instagram";
  platform_media_id: string | null;
  title: string;
  post_url: string | null;
  content_type: ContentType;
  published_at: string | null;
  deliverable: string | null;
  sponsorship_status: "planned" | "published" | "reported";
  tracking_source: MetricSource;
  allocated_fee: number | null;
  notes: string | null;
  created_at: string;
}

export interface PostSnapshot {
  id: string;
  sponsored_post_id: string;
  captured_at: string;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  accounts_engaged: number | null;
  profile_activity: number | null;
  link_clicks: number | null;
  average_watch_time: number | null;
  source: MetricSource;
  notes: string | null;
  corrects_snapshot_id: string | null;
  raw_metrics?: Record<string, unknown> | null;
  created_at: string;
}
