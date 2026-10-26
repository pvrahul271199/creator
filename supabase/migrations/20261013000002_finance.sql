-- Boardroom finance: invoices, items, payments, audit log, numbering.
-- Clients may READ these tables (RLS) but can only change them through the SECURITY DEFINER
-- functions below, which validate ownership with auth.uid(), recompute every total with
-- numeric arithmetic, and lock the invoice row so concurrent requests cannot overpay.

-- ------------------------------------------------------------------ invoices
create table public.invoice_counters (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_number integer not null default 0
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_id uuid not null,
  collaboration_id uuid,
  invoice_number text not null check (char_length(btrim(invoice_number)) between 1 and 40),
  issue_date date not null default current_date,
  due_date date,
  currency text not null check (currency in ('INR', 'USD', 'EUR', 'GBP', 'AED')),
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'partially_paid', 'paid', 'cancelled')),
  subtotal numeric(14, 2) not null default 0 check (subtotal >= 0),
  discount_type text not null default 'fixed' check (discount_type in ('percent', 'fixed')),
  discount_value numeric(14, 2) not null default 0 check (discount_value >= 0),
  discount_amount numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  payment_terms text,
  reference_number text,
  notes text,
  terms text,
  payment_instructions text,
  logo_path text,
  -- Point-in-time document data. Editable while draft, frozen by issue_invoice().
  sender_snapshot jsonb not null default '{}'::jsonb,
  recipient_snapshot jsonb not null default '{}'::jsonb,
  issued_document jsonb,
  issued_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date is null or due_date >= issue_date),
  check (discount_amount between 0 and subtotal),
  check (total_amount = subtotal - discount_amount + tax_amount),
  check (discount_type <> 'percent' or discount_value <= 100),
  check ((status = 'draft') = (issued_at is null)),
  unique (user_id, invoice_number),
  unique (id, user_id),
  foreign key (brand_id, user_id) references public.brands (id, user_id) on delete restrict,
  foreign key (collaboration_id, user_id) references public.collaborations (id, user_id) on delete set null (collaboration_id)
);
create index invoices_user_status_idx on public.invoices (user_id, status);
create index invoices_due_idx on public.invoices (user_id, due_date);
create index invoices_brand_idx on public.invoices (user_id, brand_id);
create index invoices_collab_idx on public.invoices (user_id, collaboration_id);
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  invoice_id uuid not null,
  description text not null check (char_length(btrim(description)) between 1 and 500),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (line_total = round(quantity * unit_price, 2)),
  foreign key (invoice_id, user_id) references public.invoices (id, user_id) on delete cascade
);
create index invoice_items_invoice_idx on public.invoice_items (user_id, invoice_id, sort_order);
create trigger invoice_items_updated_at before update on public.invoice_items
  for each row execute function public.set_updated_at();

-- Items of a non-draft invoice are historical and immutable.
create or replace function public.trg_invoice_items_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  inv_status text;
begin
  select status into inv_status from public.invoices
  where id = coalesce(new.invoice_id, old.invoice_id);
  if inv_status is not null and inv_status <> 'draft' then
    raise exception 'Items of an issued invoice cannot be changed' using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger invoice_items_guard before insert or update or delete on public.invoice_items
  for each row execute function public.trg_invoice_items_guard();

-- ------------------------------------------------------------------ payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  invoice_id uuid not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('INR', 'USD', 'EUR', 'GBP', 'AED')),
  payment_date date not null,
  payment_method text not null check (payment_method in ('bank_transfer', 'upi', 'cash', 'other')),
  reference_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- A paid invoice keeps its payments: restrict deleting invoices that have any.
  foreign key (invoice_id, user_id) references public.invoices (id, user_id) on delete restrict
);
create index payments_user_date_idx on public.payments (user_id, payment_date desc);
create index payments_invoice_idx on public.payments (user_id, invoice_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Audit trail kept even after a payment row is edited or removed.
create table public.payment_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  invoice_id uuid not null,
  payment_id uuid not null,
  action text not null check (action in ('recorded', 'updated', 'deleted')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index payment_audit_invoice_idx on public.payment_audit_log (user_id, invoice_id, created_at desc);

-- ------------------------------------------------------------ balances view
create view public.invoice_balances
with (security_invoker = true) as
select
  i.id as invoice_id,
  i.user_id,
  coalesce(p.paid, 0)::numeric(14, 2) as paid_amount,
  greatest(i.total_amount - coalesce(p.paid, 0), 0)::numeric(14, 2) as balance_due,
  case
    when i.status in ('issued', 'partially_paid')
      and i.due_date is not null
      and i.due_date < current_date
      and i.total_amount - coalesce(p.paid, 0) > 0 then 'overdue'
    else i.status
  end as effective_status
from public.invoices i
left join (
  select invoice_id, sum(amount) as paid from public.payments group by invoice_id
) p on p.invoice_id = i.id;

-- ------------------------------------------------------------ internal helpers
create or replace function public.next_invoice_number(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  -- Single atomic upsert: concurrent callers serialize on the row, so no duplicates.
  insert into public.invoice_counters as c (user_id, last_number)
  values (p_user, 1)
  on conflict (user_id) do update set last_number = c.last_number + 1
  returning c.last_number into n;
  return 'INV-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 4, '0');
end;
$$;

create or replace function public.refresh_invoice_status(p_invoice uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid numeric(14, 2);
  inv public.invoices;
begin
  select * into inv from public.invoices where id = p_invoice;
  if not found or inv.status in ('draft', 'cancelled') then
    return;
  end if;
  select coalesce(sum(amount), 0) into paid from public.payments where invoice_id = p_invoice;
  update public.invoices
  set status = case
    when inv.total_amount > 0 and paid >= inv.total_amount then 'paid'
    when paid > 0 then 'partially_paid'
    else 'issued'
  end
  where id = p_invoice;
end;
$$;

-- --------------------------------------------------------------- save_invoice
create or replace function public.save_invoice(p_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_brand uuid := nullif(p_payload ->> 'brand_id', '')::uuid;
  v_collab uuid := nullif(p_payload ->> 'collaboration_id', '')::uuid;
  v_currency text := coalesce(nullif(p_payload ->> 'currency', ''), 'INR');
  v_issue date := coalesce(nullif(p_payload ->> 'issue_date', '')::date, current_date);
  v_due date := nullif(p_payload ->> 'due_date', '')::date;
  v_dtype text := coalesce(nullif(p_payload ->> 'discount_type', ''), 'fixed');
  v_dvalue numeric(14, 2) := coalesce(nullif(p_payload ->> 'discount_value', '')::numeric, 0);
  v_tax_rate numeric(5, 2) := coalesce(nullif(p_payload ->> 'tax_rate', '')::numeric, 0);
  v_number text := nullif(btrim(coalesce(p_payload ->> 'invoice_number', '')), '');
  v_items jsonb := coalesce(p_payload -> 'items', '[]'::jsonb);
  v_item jsonb;
  v_idx integer := 0;
  v_qty numeric;
  v_price numeric;
  v_desc text;
  v_subtotal numeric(14, 2) := 0;
  v_discount numeric(14, 2);
  v_tax numeric(14, 2);
  v_total numeric(14, 2);
  v_id uuid;
  existing public.invoices;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if v_brand is null or not exists (select 1 from public.brands where id = v_brand and user_id = uid) then
    raise exception 'Choose one of your brands for this invoice';
  end if;
  if v_collab is not null and not exists (
    select 1 from public.collaborations where id = v_collab and user_id = uid and brand_id = v_brand
  ) then
    raise exception 'That collaboration does not belong to the selected brand';
  end if;
  if v_currency not in ('INR', 'USD', 'EUR', 'GBP', 'AED') then
    raise exception 'Unsupported currency';
  end if;
  if v_dtype not in ('percent', 'fixed') then
    raise exception 'Discount type must be percent or fixed';
  end if;
  if v_dvalue < 0 or (v_dtype = 'percent' and v_dvalue > 100) then
    raise exception 'Discount is out of range';
  end if;
  if v_tax_rate < 0 or v_tax_rate > 100 then
    raise exception 'Tax rate must be between 0 and 100';
  end if;
  if v_due is not null and v_due < v_issue then
    raise exception 'Due date cannot be before the issue date';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) < 1 or jsonb_array_length(v_items) > 100 then
    raise exception 'Add between 1 and 100 line items';
  end if;

  -- Validate and total the items (the client-supplied line totals are ignored).
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_desc := btrim(coalesce(v_item ->> 'description', ''));
    v_qty := coalesce(nullif(v_item ->> 'quantity', '')::numeric, 0);
    v_price := coalesce(nullif(v_item ->> 'unit_price', '')::numeric, 0);
    if v_desc = '' then raise exception 'Every line item needs a description'; end if;
    if v_qty <= 0 then raise exception 'Quantity must be greater than zero'; end if;
    if v_price < 0 then raise exception 'Unit price cannot be negative'; end if;
    v_subtotal := v_subtotal + round(round(v_qty, 2) * round(v_price, 2), 2);
  end loop;

  v_discount := case
    when v_dvalue = 0 then 0
    when v_dtype = 'percent' then round(v_subtotal * v_dvalue / 100, 2)
    else least(v_dvalue, v_subtotal)
  end;
  v_tax := round((v_subtotal - v_discount) * v_tax_rate / 100, 2);
  v_total := v_subtotal - v_discount + v_tax;

  if p_id is null then
    insert into public.invoices (
      user_id, brand_id, collaboration_id, invoice_number, issue_date, due_date, currency,
      subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount, total_amount,
      payment_terms, reference_number, notes, terms, payment_instructions, logo_path,
      sender_snapshot, recipient_snapshot
    ) values (
      uid, v_brand, v_collab, coalesce(v_number, public.next_invoice_number(uid)), v_issue, v_due, v_currency,
      v_subtotal, v_dtype, v_dvalue, v_discount, v_tax_rate, v_tax, v_total,
      nullif(p_payload ->> 'payment_terms', ''), nullif(p_payload ->> 'reference_number', ''),
      nullif(p_payload ->> 'notes', ''), nullif(p_payload ->> 'terms', ''),
      nullif(p_payload ->> 'payment_instructions', ''), nullif(p_payload ->> 'logo_path', ''),
      coalesce(p_payload -> 'sender', '{}'::jsonb), coalesce(p_payload -> 'recipient', '{}'::jsonb)
    ) returning id into v_id;
  else
    select * into existing from public.invoices where id = p_id and user_id = uid for update;
    if not found then raise exception 'Invoice not found'; end if;
    if existing.status <> 'draft' then
      raise exception 'Issued invoices cannot be edited. Duplicate it into a new draft or cancel it.';
    end if;
    update public.invoices set
      brand_id = v_brand, collaboration_id = v_collab,
      invoice_number = coalesce(v_number, existing.invoice_number),
      issue_date = v_issue, due_date = v_due, currency = v_currency,
      subtotal = v_subtotal, discount_type = v_dtype, discount_value = v_dvalue,
      discount_amount = v_discount, tax_rate = v_tax_rate, tax_amount = v_tax, total_amount = v_total,
      payment_terms = nullif(p_payload ->> 'payment_terms', ''),
      reference_number = nullif(p_payload ->> 'reference_number', ''),
      notes = nullif(p_payload ->> 'notes', ''), terms = nullif(p_payload ->> 'terms', ''),
      payment_instructions = nullif(p_payload ->> 'payment_instructions', ''),
      logo_path = nullif(p_payload ->> 'logo_path', ''),
      sender_snapshot = coalesce(p_payload -> 'sender', '{}'::jsonb),
      recipient_snapshot = coalesce(p_payload -> 'recipient', '{}'::jsonb)
    where id = p_id;
    delete from public.invoice_items where invoice_id = p_id;
    v_id := p_id;
  end if;

  v_idx := 0;
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_qty := round((v_item ->> 'quantity')::numeric, 2);
    v_price := round((v_item ->> 'unit_price')::numeric, 2);
    insert into public.invoice_items (user_id, invoice_id, description, quantity, unit_price, line_total, sort_order)
    values (uid, v_id, btrim(v_item ->> 'description'), v_qty, v_price, round(v_qty * v_price, 2), v_idx);
    v_idx := v_idx + 1;
  end loop;

  return v_id;
exception when unique_violation then
  raise exception 'That invoice number is already in use' using errcode = '23505';
end;
$$;

-- -------------------------------------------------------------- issue / cancel
create or replace function public.issue_invoice(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invoices;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  select * into inv from public.invoices where id = p_id and user_id = uid for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.status <> 'draft' then raise exception 'Only a draft can be issued'; end if;
  if inv.total_amount <= 0 then raise exception 'An invoice needs a total above zero before it is issued'; end if;

  update public.invoices set
    status = 'issued',
    issued_at = now(),
    issued_document = jsonb_build_object(
      'invoice_number', inv.invoice_number,
      'issue_date', inv.issue_date,
      'due_date', inv.due_date,
      'currency', inv.currency,
      'payment_terms', inv.payment_terms,
      'reference_number', inv.reference_number,
      'sender', inv.sender_snapshot,
      'recipient', inv.recipient_snapshot,
      'logo_path', inv.logo_path,
      'notes', inv.notes,
      'terms', inv.terms,
      'payment_instructions', inv.payment_instructions,
      'totals', jsonb_build_object(
        'subtotal', inv.subtotal, 'discount_type', inv.discount_type, 'discount_value', inv.discount_value,
        'discount_amount', inv.discount_amount, 'tax_rate', inv.tax_rate, 'tax_amount', inv.tax_amount,
        'total', inv.total_amount),
      'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'description', description, 'quantity', quantity, 'unit_price', unit_price, 'line_total', line_total
        ) order by sort_order), '[]'::jsonb)
        from public.invoice_items where invoice_id = inv.id)
    )
  where id = inv.id;
end;
$$;

create or replace function public.cancel_invoice(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invoices;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  select * into inv from public.invoices where id = p_id and user_id = uid for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.status = 'cancelled' then raise exception 'This invoice is already cancelled'; end if;
  if exists (select 1 from public.payments where invoice_id = p_id) then
    raise exception 'This invoice has recorded payments. Reverse them first, then cancel.';
  end if;
  -- A cancelled draft never counted as issued, so keep issued_at consistent.
  update public.invoices set
    status = 'cancelled',
    cancelled_at = now(),
    issued_at = coalesce(issued_at, now())
  where id = p_id;
end;
$$;

create or replace function public.duplicate_invoice(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  src public.invoices;
  new_id uuid;
  gap integer;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  select * into src from public.invoices where id = p_id and user_id = uid;
  if not found then raise exception 'Invoice not found'; end if;
  gap := case when src.due_date is null then null else src.due_date - src.issue_date end;

  insert into public.invoices (
    user_id, brand_id, collaboration_id, invoice_number, issue_date, due_date, currency,
    subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount, total_amount,
    payment_terms, reference_number, notes, terms, payment_instructions, logo_path,
    sender_snapshot, recipient_snapshot
  ) values (
    uid, src.brand_id, src.collaboration_id, public.next_invoice_number(uid), current_date,
    case when gap is null then null else current_date + gap end, src.currency,
    src.subtotal, src.discount_type, src.discount_value, src.discount_amount, src.tax_rate, src.tax_amount,
    src.total_amount, src.payment_terms, src.reference_number, src.notes, src.terms,
    src.payment_instructions, src.logo_path, src.sender_snapshot, src.recipient_snapshot
  ) returning id into new_id;

  insert into public.invoice_items (user_id, invoice_id, description, quantity, unit_price, line_total, sort_order)
  select uid, new_id, description, quantity, unit_price, line_total, sort_order
  from public.invoice_items where invoice_id = p_id;

  return new_id;
end;
$$;

-- ------------------------------------------------------------------ payments
create or replace function public.record_payment(
  p_invoice_id uuid, p_amount numeric, p_date date, p_method text,
  p_reference text default null, p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invoices;
  paid numeric(14, 2);
  new_id uuid;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  if p_amount <> round(p_amount, 2) then raise exception 'Payment amount can have at most two decimals'; end if;
  if p_date is null then raise exception 'Payment date is required'; end if;

  -- The row lock serializes concurrent payments on the same invoice.
  select * into inv from public.invoices where id = p_invoice_id and user_id = uid for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.status not in ('issued', 'partially_paid') then
    raise exception 'Payments can only be recorded on an issued invoice that still has a balance';
  end if;
  select coalesce(sum(amount), 0) into paid from public.payments where invoice_id = p_invoice_id;
  if paid + p_amount > inv.total_amount then
    raise exception 'That exceeds the remaining balance of % %', inv.currency, (inv.total_amount - paid);
  end if;

  insert into public.payments (user_id, invoice_id, amount, currency, payment_date, payment_method, reference_number, notes)
  values (uid, p_invoice_id, p_amount, inv.currency, p_date, p_method, nullif(btrim(p_reference), ''), nullif(btrim(p_notes), ''))
  returning id into new_id;

  insert into public.payment_audit_log (user_id, invoice_id, payment_id, action, after_data)
  select uid, p_invoice_id, id, 'recorded', to_jsonb(p) from public.payments p where id = new_id;

  perform public.refresh_invoice_status(p_invoice_id);
  return new_id;
end;
$$;

create or replace function public.update_payment(
  p_id uuid, p_amount numeric, p_date date, p_method text,
  p_reference text default null, p_notes text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  pay public.payments;
  inv public.invoices;
  others numeric(14, 2);
  updated public.payments;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  if p_amount <> round(p_amount, 2) then raise exception 'Payment amount can have at most two decimals'; end if;

  select * into pay from public.payments where id = p_id and user_id = uid;
  if not found then raise exception 'Payment not found'; end if;
  select * into inv from public.invoices where id = pay.invoice_id and user_id = uid for update;
  if inv.status = 'cancelled' then raise exception 'This invoice is cancelled'; end if;
  select coalesce(sum(amount), 0) into others from public.payments
  where invoice_id = pay.invoice_id and id <> p_id;
  if others + p_amount > inv.total_amount then
    raise exception 'That exceeds the invoice total. Maximum for this payment is % %', inv.currency, (inv.total_amount - others);
  end if;

  update public.payments set
    amount = p_amount, payment_date = coalesce(p_date, payment_date),
    payment_method = p_method, reference_number = nullif(btrim(p_reference), ''), notes = nullif(btrim(p_notes), '')
  where id = p_id returning * into updated;

  insert into public.payment_audit_log (user_id, invoice_id, payment_id, action, before_data, after_data)
  values (uid, pay.invoice_id, p_id, 'updated', to_jsonb(pay), to_jsonb(updated));

  perform public.refresh_invoice_status(pay.invoice_id);
end;
$$;

create or replace function public.delete_payment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  pay public.payments;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  select * into pay from public.payments where id = p_id and user_id = uid;
  if not found then raise exception 'Payment not found'; end if;
  perform 1 from public.invoices where id = pay.invoice_id and user_id = uid for update;

  insert into public.payment_audit_log (user_id, invoice_id, payment_id, action, before_data)
  values (uid, pay.invoice_id, p_id, 'deleted', to_jsonb(pay));
  delete from public.payments where id = p_id;
  perform public.refresh_invoice_status(pay.invoice_id);
end;
$$;

-- Timeline events for invoices and payments (server-generated text only).
create or replace function public.trg_invoice_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.collaboration_id is null then return new; end if;
  if tg_op = 'INSERT' then
    perform public.log_event(new.user_id, new.collaboration_id, 'invoice_created',
      'Invoice ' || new.invoice_number || ' drafted');
  elsif new.status is distinct from old.status then
    if new.status = 'issued' then
      perform public.log_event(new.user_id, new.collaboration_id, 'invoice_issued',
        'Invoice ' || new.invoice_number || ' issued');
    elsif new.status = 'cancelled' then
      perform public.log_event(new.user_id, new.collaboration_id, 'invoice_cancelled',
        'Invoice ' || new.invoice_number || ' cancelled');
    elsif new.status = 'paid' then
      perform public.log_event(new.user_id, new.collaboration_id, 'invoice_paid',
        'Invoice ' || new.invoice_number || ' fully paid');
    end if;
  end if;
  return new;
end;
$$;
create trigger invoices_events after insert or update on public.invoices
  for each row execute function public.trg_invoice_events();

create or replace function public.trg_payment_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  collab uuid;
  num text;
  p public.payments := coalesce(new, old);
begin
  select collaboration_id, invoice_number into collab, num from public.invoices where id = p.invoice_id;
  if collab is null then return p; end if;
  perform public.log_event(p.user_id, collab,
    case tg_op when 'INSERT' then 'payment_recorded' when 'UPDATE' then 'payment_updated' else 'payment_deleted' end,
    case tg_op when 'INSERT' then 'Payment recorded: ' when 'UPDATE' then 'Payment edited: ' else 'Payment removed: ' end
      || p.currency || ' ' || p.amount || ' on ' || num,
    jsonb_build_object('amount', p.amount, 'invoice_id', p.invoice_id));
  return p;
end;
$$;
create trigger payments_events after insert or update or delete on public.payments
  for each row execute function public.trg_payment_events();

-- ----------------------------------------------------------- RLS and grants
alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_audit_log enable row level security;

create policy invoices_select on public.invoices for select to authenticated
  using (user_id = (select auth.uid()));
create policy invoice_items_select on public.invoice_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy payments_select on public.payments for select to authenticated
  using (user_id = (select auth.uid()));
create policy payment_audit_select on public.payment_audit_log for select to authenticated
  using (user_id = (select auth.uid()));
-- invoice_counters: no policy, no client access at all.

-- Defense in depth: even with a missing policy, clients have no write grants on finance tables.
revoke insert, update, delete, truncate on public.invoices, public.invoice_items, public.payments,
  public.payment_audit_log, public.invoice_counters, public.activity_events from anon, authenticated;
revoke all on public.invoice_counters from anon, authenticated;

-- Only signed-in users may call the finance functions.
revoke execute on function public.next_invoice_number(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_invoice_status(uuid) from public, anon, authenticated;
revoke execute on function public.save_invoice(uuid, jsonb) from public, anon;
revoke execute on function public.issue_invoice(uuid) from public, anon;
revoke execute on function public.cancel_invoice(uuid) from public, anon;
revoke execute on function public.duplicate_invoice(uuid) from public, anon;
revoke execute on function public.record_payment(uuid, numeric, date, text, text, text) from public, anon;
revoke execute on function public.update_payment(uuid, numeric, date, text, text, text) from public, anon;
revoke execute on function public.delete_payment(uuid) from public, anon;
revoke execute on function public.ensure_profile() from public, anon;
grant execute on function public.save_invoice(uuid, jsonb) to authenticated;
grant execute on function public.issue_invoice(uuid) to authenticated;
grant execute on function public.cancel_invoice(uuid) to authenticated;
grant execute on function public.duplicate_invoice(uuid) to authenticated;
grant execute on function public.record_payment(uuid, numeric, date, text, text, text) to authenticated;
grant execute on function public.update_payment(uuid, numeric, date, text, text, text) to authenticated;
grant execute on function public.delete_payment(uuid) to authenticated;
grant execute on function public.ensure_profile() to authenticated;
