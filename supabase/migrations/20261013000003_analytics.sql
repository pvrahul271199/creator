-- Boardroom analytics: invoice profile, social accounts, creator and post metric snapshots, logo storage.
-- Metric snapshot tables are append-only (select + insert policies only). A correction is a new row
-- pointing at the one it corrects, so history is never rewritten.
-- Instagram sync is "Coming soon": the client may only write manual snapshots.

create table public.invoice_profile_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text not null default '',
  address text,
  email text,
  phone text,
  website text,
  tax_registration_number text,
  logo_path text,
  default_currency text not null default 'INR' check (default_currency in ('INR', 'USD', 'EUR', 'GBP', 'AED')),
  default_payment_instructions text,
  default_notes text,
  default_terms text,
  updated_at timestamptz not null default now()
);
create trigger invoice_profile_settings_updated_at before update on public.invoice_profile_settings
  for each row execute function public.set_updated_at();

-- Connection metadata only. Credentials will live in a separate server-only store when the
-- Instagram integration ships; never in this table.
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('instagram')),
  platform_account_id text not null,
  username text not null,
  account_type text,
  connection_status text not null default 'connected'
    check (connection_status in ('connected', 'needs_reauthorization', 'disconnected')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_sync_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, platform_account_id),
  unique (id, user_id)
);
create trigger social_accounts_updated_at before update on public.social_accounts
  for each row execute function public.set_updated_at();

create table public.creator_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  social_account_id uuid,
  collaboration_id uuid,
  platform text not null default 'instagram' check (platform in ('instagram')),
  username text,
  profile_url text,
  snapshot_at timestamptz not null default now(),
  follower_count bigint check (follower_count >= 0),
  average_views numeric(14, 2) check (average_views >= 0),
  average_reach numeric(14, 2) check (average_reach >= 0),
  engagement_rate numeric(7, 3) check (engagement_rate >= 0),
  source text not null default 'manual' check (source in ('manual', 'instagram_api')),
  notes text,
  corrects_snapshot_id uuid references public.creator_metric_snapshots (id),
  created_at timestamptz not null default now(),
  check (follower_count is not null or average_views is not null or average_reach is not null or engagement_rate is not null),
  foreign key (social_account_id, user_id) references public.social_accounts (id, user_id) on delete set null (social_account_id),
  foreign key (collaboration_id, user_id) references public.collaborations (id, user_id) on delete set null (collaboration_id)
);
create index creator_snapshots_user_time_idx on public.creator_metric_snapshots (user_id, snapshot_at desc);
create index creator_snapshots_collab_idx on public.creator_metric_snapshots (user_id, collaboration_id);

create table public.sponsored_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  collaboration_id uuid not null,
  social_account_id uuid,
  platform text not null default 'instagram' check (platform in ('instagram')),
  platform_media_id text,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  post_url text,
  content_type text not null default 'reel'
    check (content_type in ('reel', 'feed_post', 'carousel', 'story', 'video', 'other')),
  published_at timestamptz,
  deliverable text,
  sponsorship_status text not null default 'planned' check (sponsorship_status in ('planned', 'published', 'reported')),
  tracking_source text not null default 'manual' check (tracking_source in ('manual', 'instagram_api')),
  allocated_fee numeric(14, 2) check (allocated_fee >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (collaboration_id, user_id) references public.collaborations (id, user_id) on delete cascade,
  foreign key (social_account_id, user_id) references public.social_accounts (id, user_id) on delete set null (social_account_id)
);
create index sponsored_posts_collab_idx on public.sponsored_posts (user_id, collaboration_id);
create trigger sponsored_posts_updated_at before update on public.sponsored_posts
  for each row execute function public.set_updated_at();

create table public.post_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  sponsored_post_id uuid not null,
  captured_at timestamptz not null default now(),
  views bigint check (views >= 0),
  reach bigint check (reach >= 0),
  likes bigint check (likes >= 0),
  comments bigint check (comments >= 0),
  shares bigint check (shares >= 0),
  saves bigint check (saves >= 0),
  accounts_engaged bigint check (accounts_engaged >= 0),
  profile_activity bigint check (profile_activity >= 0),
  link_clicks bigint check (link_clicks >= 0),
  average_watch_time numeric(10, 2) check (average_watch_time >= 0),
  source text not null default 'manual' check (source in ('manual', 'instagram_api')),
  notes text,
  corrects_snapshot_id uuid references public.post_metric_snapshots (id),
  raw_metrics jsonb,
  created_at timestamptz not null default now(),
  check (
    views is not null or reach is not null or likes is not null or comments is not null or shares is not null
    or saves is not null or accounts_engaged is not null or profile_activity is not null
    or link_clicks is not null or average_watch_time is not null
  ),
  foreign key (sponsored_post_id, user_id) references public.sponsored_posts (id, user_id) on delete cascade
);
create index post_snapshots_post_idx on public.post_metric_snapshots (user_id, sponsored_post_id, captured_at desc);

-- ---------------------------------------------------------------------- RLS
alter table public.invoice_profile_settings enable row level security;
alter table public.social_accounts enable row level security;
alter table public.creator_metric_snapshots enable row level security;
alter table public.sponsored_posts enable row level security;
alter table public.post_metric_snapshots enable row level security;

create policy invoice_profile_all on public.invoice_profile_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy social_accounts_select on public.social_accounts for select to authenticated
  using (user_id = (select auth.uid()));

create policy creator_snapshots_select on public.creator_metric_snapshots for select to authenticated
  using (user_id = (select auth.uid()));
create policy creator_snapshots_insert on public.creator_metric_snapshots for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'manual');

create policy sponsored_posts_select on public.sponsored_posts for select to authenticated
  using (user_id = (select auth.uid()));
create policy sponsored_posts_insert on public.sponsored_posts for insert to authenticated
  with check (user_id = (select auth.uid()) and tracking_source = 'manual');
create policy sponsored_posts_update on public.sponsored_posts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and tracking_source = 'manual');
create policy sponsored_posts_delete on public.sponsored_posts for delete to authenticated
  using (user_id = (select auth.uid()));

create policy post_snapshots_select on public.post_metric_snapshots for select to authenticated
  using (user_id = (select auth.uid()));
create policy post_snapshots_insert on public.post_metric_snapshots for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'manual');

revoke insert, update, delete on public.social_accounts from anon, authenticated;
revoke update, delete on public.creator_metric_snapshots, public.post_metric_snapshots from anon, authenticated;

-- ------------------------------------------------------------ logo storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy logos_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
