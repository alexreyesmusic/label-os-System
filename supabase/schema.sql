create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  label_name text not null,
  logo_url text,
  country text,
  currency text not null default 'EUR',
  main_genre text,
  primary_color text not null default '#B6FF1A',
  timezone text not null default 'Europe/Madrid',
  social_links jsonb not null default '{}'::jsonb,
  workspace_name text default 'Label OS',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users_tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','ar','marketing','finance','viewer')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create or replace function public.is_tenant_member(target_tenant uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.users_tenants
    where tenant_id = target_tenant and user_id = auth.uid()
  );
$$;

create or replace function public.current_role(target_tenant uuid)
returns text language sql security definer stable set search_path = public as $$
  select role from public.users_tenants
  where tenant_id = target_tenant and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_write(target_tenant uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(public.current_role(target_tenant) in ('owner','admin','ar','marketing','finance'), false);
$$;

create or replace function public.can_write_table(target_tenant uuid, target_table text)
returns boolean language sql security definer stable set search_path = public as $$
  select case
    when public.current_role(target_tenant) in ('owner','admin') then true
    when public.current_role(target_tenant) = 'ar'
      then target_table in ('artists','demos','tracks','releases','ar_reports','distribution_records','files')
    when public.current_role(target_tenant) = 'marketing'
      then target_table in ('campaigns','content_items','social_posts','editorial_calendar','files')
    when public.current_role(target_tenant) = 'finance'
      then target_table in ('revenue_records','royalty_splits','files')
    else false
  end;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  name text not null,
  country text,
  email text,
  instagram text,
  soundcloud text,
  photo_url text,
  status text default 'New',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.demos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  artist_name text,
  track_title text not null,
  genre text,
  bpm integer,
  musical_key text,
  mood text,
  energy text,
  status text default 'Pending',
  ar_score integer,
  label_fit text,
  decision text,
  assigned_release text,
  soundcloud_link text,
  drive_link text,
  cover_url text,
  audio_file_url text,
  internal_comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  artist_name text,
  track_title text not null,
  bpm integer,
  musical_key text,
  genre text,
  mood text,
  energy text,
  status text default 'Draft',
  ar_score integer,
  label_fit text,
  decision text,
  assigned_release text,
  soundcloud_link text,
  drive_link text,
  audio_file_url text,
  premaster_file_url text,
  master_file_url text,
  stems_folder_link text,
  artwork_link text,
  contract_file_url text,
  contract_status text default 'Pending',
  master_status text default 'Pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  title text not null,
  artist_name text,
  cover_url text,
  release_type text,
  status text default 'Idea',
  release_date date,
  distribution_date date,
  tracks_included text,
  contract_status text default 'Pending',
  master_status text default 'Pending',
  artwork_status text default 'Missing',
  metadata_status text default 'Incomplete',
  campaign_status text default 'Not Started',
  isrc text,
  upc text,
  label_copy text,
  credits text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.revenue_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  release_title text,
  artist_name text,
  platform text,
  gross_revenue numeric(12,2) default 0,
  expenses numeric(12,2) default 0,
  status text default 'Pending',
  payment_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  net_profit numeric(12,2) generated always as (gross_revenue - expenses) stored
);

create table public.royalty_splits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  release_title text,
  participant_name text,
  participant_type text,
  percentage numeric(5,2) default 0,
  status text default 'Pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  name text not null,
  type text,
  objective text,
  start_date date,
  end_date date,
  budget numeric(12,2) default 0,
  primary_channel text,
  audience text,
  release_title text,
  image_url text,
  status text default 'Planning',
  reach integer default 0,
  clicks integer default 0,
  conversions integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  content_code text,
  topic text not null,
  pillar text,
  type text,
  objective text,
  status text default 'Idea',
  owner_name text,
  target_date date,
  asset_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  platform text,
  format text,
  hook text,
  caption text,
  hashtags text,
  cta text,
  asset_url text,
  publish_date date,
  status text default 'Draft',
  reach integer default 0,
  likes integer default 0,
  comments integer default 0,
  saves integer default 0,
  shares integer default 0,
  clicks integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.editorial_calendar (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  date date,
  category text,
  title text not null,
  channel text,
  status text default 'Idea',
  owner_name text,
  cta text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ar_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  period text not null,
  demos_reviewed integer default 0,
  tracks_recommended text,
  artists_contacted text,
  releases_tracking text,
  problems_detected text,
  next_actions text,
  general_comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.distribution_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  release_title text,
  distributor text,
  upload_date date,
  approval_date date,
  dsps_active integer default 0,
  status text default 'Pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  bucket text not null,
  path text not null,
  public_url text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','tenants','users_tenants','artists','demos','tracks','releases','revenue_records',
    'royalty_splits','campaigns','content_items','social_posts','editorial_calendar','ar_reports',
    'distribution_records','files'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy tenants_member_select on public.tenants for select using (public.is_tenant_member(id));
create policy tenants_member_insert on public.tenants for insert with check (created_by = auth.uid());
create policy tenants_owner_update on public.tenants for update using (public.current_role(id) in ('owner','admin')) with check (public.current_role(id) in ('owner','admin'));
create policy users_tenants_member_select on public.users_tenants for select using (public.is_tenant_member(tenant_id));
create policy users_tenants_owner_write on public.users_tenants for all
using (public.current_role(tenant_id) in ('owner','admin'))
with check (
  public.current_role(tenant_id) in ('owner','admin')
  or (
    user_id = auth.uid()
    and exists (
      select 1 from public.tenants
      where tenants.id = users_tenants.tenant_id
      and tenants.created_by = auth.uid()
    )
  )
);

do $$
declare t text;
begin
  foreach t in array array[
    'artists','demos','tracks','releases','revenue_records','royalty_splits','campaigns',
    'content_items','social_posts','editorial_calendar','ar_reports','distribution_records','files'
  ] loop
    execute format('create policy %I on public.%I for select using (public.is_tenant_member(tenant_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert with check (public.is_tenant_member(tenant_id) and public.can_write_table(tenant_id, %L))', t || '_insert', t, t);
    execute format('create policy %I on public.%I for update using (public.is_tenant_member(tenant_id) and public.can_write_table(tenant_id, %L)) with check (public.is_tenant_member(tenant_id) and public.can_write_table(tenant_id, %L))', t || '_update', t, t, t);
    execute format('create policy %I on public.%I for delete using (public.is_tenant_member(tenant_id) and public.can_write_table(tenant_id, %L))', t || '_delete', t, t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch_updated_at', t);
  end loop;
end $$;

insert into storage.buckets (id, name, public) values
  ('covers', 'covers', true),
  ('audio', 'audio', true),
  ('documents', 'documents', true),
  ('promo-assets', 'promo-assets', true)
on conflict (id) do nothing;

create policy storage_read_member on storage.objects for select using (
  bucket_id in ('covers','audio','documents','promo-assets')
);

create policy storage_insert_member on storage.objects for insert with check (
  bucket_id in ('covers','audio','documents','promo-assets')
  and public.is_tenant_member((storage.foldername(name))[1]::uuid)
);

create policy storage_update_member on storage.objects for update using (
  bucket_id in ('covers','audio','documents','promo-assets')
  and public.is_tenant_member((storage.foldername(name))[1]::uuid)
);

create policy storage_delete_member on storage.objects for delete using (
  bucket_id in ('covers','audio','documents','promo-assets')
  and public.is_tenant_member((storage.foldername(name))[1]::uuid)
);
