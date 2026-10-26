-- Boardroom: identity needed for professional Indian creator invoices.
-- Brands carry their billing identity; the creator profile carries PAN, GST status and bank details.

alter table public.brands
  add column if not exists legal_name text,
  add column if not exists gstin text,
  add column if not exists address text;

alter table public.invoice_profile_settings
  add column if not exists legal_name text,
  add column if not exists pan text,
  add column if not exists instagram_handle text,
  add column if not exists gst_status text,
  add column if not exists bank_account_holder text,
  add column if not exists bank_account_number text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_name text,
  add column if not exists bank_branch text;
