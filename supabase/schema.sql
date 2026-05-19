create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  label_name text not null,
  country text,
  currency text not null default 'EUR',
  main_genre text,
  brand_color text not null default '#B6FF1A',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','ar','marketing','finance','viewer')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace and user_id = auth.uid()
  );
$$;

create or replace function public.current_workspace_role(target_workspace uuid)
returns text language sql security definer stable set search_path = public as $$
  select role from public.workspace_members
  where workspace_id = target_workspace and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_write_workspace(target_workspace uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(public.current_workspace_role(target_workspace) in ('owner','admin','ar','marketing','finance'), false);
$$;

create or replace function public.workspace_was_created_by_auth_user(target_workspace uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workspaces
    where id = target_workspace and created_by = auth.uid()
  );
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  updated_at timestamptz not null default now()
);

create table public.royalty_splits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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

create table public.editorial_calendar_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','workspaces','workspace_members','artists','demos','tracks','releases','revenue_records',
    'royalty_splits','campaigns','content_items','social_posts','editorial_calendar_items','ar_reports',
    'distribution_records'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy workspaces_member_select on public.workspaces for select using (public.is_workspace_member(id));
create policy workspaces_owner_insert on public.workspaces for insert with check (created_by = auth.uid());
create policy workspaces_owner_update on public.workspaces for update using (public.current_workspace_role(id) in ('owner','admin')) with check (public.current_workspace_role(id) in ('owner','admin'));
create policy workspaces_owner_delete on public.workspaces for delete using (public.current_workspace_role(id) = 'owner');

create policy workspace_members_select on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy workspace_members_insert on public.workspace_members for insert with check (
  public.current_workspace_role(workspace_id) in ('owner','admin')
  or (user_id = auth.uid() and public.workspace_was_created_by_auth_user(workspace_id))
);
create policy workspace_members_update on public.workspace_members for update using (public.current_workspace_role(workspace_id) in ('owner','admin')) with check (public.current_workspace_role(workspace_id) in ('owner','admin'));
create policy workspace_members_delete on public.workspace_members for delete using (public.current_workspace_role(workspace_id) in ('owner','admin'));

do $$
declare t text;
begin
  foreach t in array array[
    'artists','demos','tracks','releases','revenue_records','royalty_splits','campaigns',
    'content_items','social_posts','editorial_calendar_items','ar_reports','distribution_records'
  ] loop
    execute format('create policy %I on public.%I for select using (public.is_workspace_member(workspace_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert with check (public.is_workspace_member(workspace_id) and public.can_write_workspace(workspace_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.is_workspace_member(workspace_id) and public.can_write_workspace(workspace_id)) with check (public.is_workspace_member(workspace_id) and public.can_write_workspace(workspace_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.is_workspace_member(workspace_id) and public.can_write_workspace(workspace_id))', t || '_delete', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch_updated_at', t);
  end loop;
end $$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger workspaces_touch_updated_at before update on public.workspaces for each row execute function public.touch_updated_at();
create trigger workspace_members_touch_updated_at before update on public.workspace_members for each row execute function public.touch_updated_at();
