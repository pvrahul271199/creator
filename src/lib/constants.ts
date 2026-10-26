import type {
  CollaborationStatus,
  ContentType,
  Currency,
  EffectiveInvoiceStatus,
  MetricSource,
  PaymentMethod,
  TaskPriority,
} from "@/lib/types";

export const CURRENCIES: { code: Currency; label: string; locale: string }[] = [
  { code: "INR", label: "INR, Indian rupee", locale: "en-IN" },
  { code: "USD", label: "USD, US dollar", locale: "en-US" },
  { code: "EUR", label: "EUR, Euro", locale: "en-IE" },
  { code: "GBP", label: "GBP, Pound sterling", locale: "en-GB" },
  { code: "AED", label: "AED, UAE dirham", locale: "en-AE" },
];

export const COLLAB_STATUSES: { value: CollaborationStatus; label: string; open: boolean }[] = [
  { value: "lead", label: "Lead", open: true },
  { value: "negotiating", label: "Negotiating", open: true },
  { value: "confirmed", label: "Confirmed", open: false },
  { value: "in_progress", label: "In progress", open: false },
  { value: "completed", label: "Completed", open: false },
  { value: "cancelled", label: "Cancelled", open: false },
];
/** Stages where the creator is actively working. */
export const ACTIVE_STATUSES: CollaborationStatus[] = ["confirmed", "in_progress"];
/** Stages that are pipeline opportunities, not yet committed. */
export const OPEN_STATUSES: CollaborationStatus[] = ["lead", "negotiating"];

export const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "reel", label: "Reel" },
  { value: "feed_post", label: "Feed post" },
  { value: "carousel", label: "Carousel" },
  { value: "story", label: "Story" },
  { value: "video", label: "Video" },
  { value: "other", label: "Other" },
];

export const INVOICE_STATUS_LABEL: Record<EffectiveInvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const SOURCE_LABEL: Record<MetricSource, string> = {
  manual: "Manually entered",
  instagram_api: "Synced from Instagram",
};

export const PAYMENT_TERMS = [
  "Due on receipt",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "50% advance, 50% on delivery",
];

/** Suggestions only, never mandatory. */
export const SERVICE_SUGGESTIONS = [
  "Instagram Reel",
  "Instagram Story sequence",
  "Sponsored feed post",
  "UGC video production",
  "Content usage rights",
  "Additional revision",
  "Campaign management",
];

export const labelOf = <T extends { value: string; label: string }>(list: T[], value: string | null | undefined) =>
  list.find((i) => i.value === value)?.label ?? "Unavailable";
