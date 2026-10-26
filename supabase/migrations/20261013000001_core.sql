-- Boardroom core schema: profiles, brands, contacts, collaborations, tasks, activity.
-- Every user-owned table carries user_id. Child rows reference parents with COMPOSITE
-- foreign keys (parent_id, user_id) so the database itself refuses cross-user links.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  business_name text,
  email text,
  phone text,
  currency text not null default 'INR' check (currency in ('INR', 'USD', 'EUR', 'GBP', 'AED')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Creates the profile when a user first authenticates. Never blocks sign-in: a failure is
-- logged as a warning and the app falls back to ensure_profile() on first load.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result public.profiles;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  insert into public.profiles (id, email, full_name)
  select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
  from auth.users u
  where u.id = uid
  on conflict (id) do nothing;
  select * into result from public.profiles where id = uid;
  return result;
end;
$$;

-- ------------------------------------------------------------------ brands
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  website text,
  industry text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
-- Prevent accidental duplicates for one user (case-insensitive) among live brands.
create unique index brands_user_name_unique
  on public.brands (user_id, lower(btrim(name))) where not is_archived;
create index brands_user_idx on public.brands (user_id, is_archived);
create trigger brands_updated_at before update on public.brands
  for each row execute function public.set_updated_at();

create table public.brand_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  email text,
  phone text,
  job_title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (brand_id, user_id) references public.brands (id, user_id) on delete cascade
);
create index brand_contacts_brand_idx on public.brand_contacts (user_id, brand_id);
create trigger brand_contacts_updated_at before update on public.brand_contacts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- collaborations
create table public.collaborations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_id uuid not null,
  contact_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  deal_amount numeric(14, 2) not null default 0 check (deal_amount >= 0),
  currency text not null default 'INR' check (currency in ('INR', 'USD', 'EUR', 'GBP', 'AED')),
  status text not null default 'lead'
    check (status in ('lead', 'negotiating', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  unique (id, user_id),
  -- Brands with history cannot be hard-deleted; they are archived instead.
  foreign key (brand_id, user_id) references public.brands (id, user_id) on delete restrict,
  foreign key (contact_id, user_id) references public.brand_contacts (id, user_id) on delete set null (contact_id)
);
create index collaborations_user_status_idx on public.collaborations (user_id, status) where not is_archived;
create index collaborations_brand_idx on public.collaborations (user_id, brand_id);
create index collaborations_end_idx on public.collaborations (user_id, end_date);
create trigger collaborations_updated_at before update on public.collaborations
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------- tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  collaboration_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  description text,
  due_date timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (completed_at is not null)),
  unique (id, user_id),
  foreign key (collaboration_id, user_id) references public.collaborations (id, user_id) on delete set null (collaboration_id)
);
create index tasks_user_status_due_idx on public.tasks (user_id, status, due_date);
create index tasks_collab_idx on public.tasks (user_id, collaboration_id);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- activity_events
-- Written only by trigger functions below; clients can read their own rows but never insert.
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  collaboration_id uuid,
  event_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  foreign key (collaboration_id, user_id) references public.collaborations (id, user_id) on delete cascade
);
create index activity_events_collab_idx on public.activity_events (user_id, collaboration_id, created_at desc);

create or replace function public.log_event(
  p_user uuid, p_collab uuid, p_type text, p_description text, p_metadata jsonb default null
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events (user_id, collaboration_id, event_type, description, metadata)
  values (p_user, p_collab, p_type, p_description, p_metadata);
$$;
revoke all on function public.log_event(uuid, uuid, text, text, jsonb) from public, anon, authenticated;

create or replace function public.trg_collaboration_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_event(new.user_id, new.id, 'collaboration_created',
      'Collaboration created: ' || new.title, jsonb_build_object('status', new.status));
  elsif new.status is distinct from old.status then
    perform public.log_event(new.user_id, new.id, 'status_changed',
      'Status changed from ' || old.status || ' to ' || new.status,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;
create trigger collaborations_events after insert or update on public.collaborations
  for each row execute function public.trg_collaboration_events();

create or replace function public.trg_task_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.collaboration_id is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    perform public.log_event(new.user_id, new.collaboration_id, 'task_created', 'Task added: ' || new.title);
  elsif new.status is distinct from old.status then
    perform public.log_event(new.user_id, new.collaboration_id,
      case when new.status = 'completed' then 'task_completed' else 'task_reopened' end,
      case when new.status = 'completed' then 'Task completed: ' else 'Task reopened: ' end || new.title);
  end if;
  return new;
end;
$$;
create trigger tasks_events after insert or update on public.tasks
  for each row execute function public.trg_task_events();

-- ---------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.brand_contacts enable row level security;
alter table public.collaborations enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy brands_all on public.brands for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy brand_contacts_all on public.brand_contacts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy collaborations_all on public.collaborations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tasks_all on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy activity_events_select on public.activity_events for select to authenticated
  using (user_id = (select auth.uid()));
