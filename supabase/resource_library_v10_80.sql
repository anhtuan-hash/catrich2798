-- Brian Resource Library V10.80
create extension if not exists pgcrypto;

create table if not exists public.resource_drive_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  owner_email text,
  refresh_token text not null,
  root_folder_id text not null,
  folder_map jsonb not null default '{}'::jsonb,
  scope text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  category_id text not null default 'professional',
  grade text default '', cefr text default '', skills text[] default '{}', tags text[] default '{}', source text default '',
  copyright_status text default 'internal', visibility text default 'department', allow_download boolean default true,
  status text not null default 'pending' check (status in ('pending','approved','revision','rejected','archived')),
  uploader_id uuid references auth.users(id) on delete set null,
  uploader_name text default '', mime_type text default '', file_name text default '', file_size bigint default 0,
  drive_file_id text, drive_web_view_link text, drive_download_link text,
  ai_summary text default '', ai_uses jsonb default '[]'::jsonb, extracted_text text default '', checksum text default '',
  version_number int default 1, parent_resource_id uuid references public.resource_items(id) on delete set null,
  views int default 0, downloads int default 0,
  approved_at timestamptz, approved_by text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.resource_collections (
  id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete cascade,
  title text not null, description text default '', visibility text default 'private', created_at timestamptz default now()
);
create table if not exists public.resource_collection_items (
  collection_id uuid references public.resource_collections(id) on delete cascade,
  resource_id uuid references public.resource_items(id) on delete cascade,
  created_at timestamptz default now(), primary key(collection_id, resource_id)
);
create table if not exists public.resource_comments (
  id uuid primary key default gen_random_uuid(), resource_id uuid references public.resource_items(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade, body text not null, created_at timestamptz default now()
);
create table if not exists public.resource_favorites (
  user_id uuid references auth.users(id) on delete cascade, resource_id uuid references public.resource_items(id) on delete cascade,
  created_at timestamptz default now(), primary key(user_id, resource_id)
);
create table if not exists public.resource_activity_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
  resource_id uuid references public.resource_items(id) on delete set null, action text not null, details jsonb default '{}'::jsonb, created_at timestamptz default now()
);

alter table public.resource_items enable row level security;
alter table public.resource_collections enable row level security;
alter table public.resource_collection_items enable row level security;
alter table public.resource_comments enable row level security;
alter table public.resource_favorites enable row level security;
alter table public.resource_activity_logs enable row level security;
alter table public.resource_drive_connections enable row level security;

drop policy if exists resource_items_read on public.resource_items;
create policy resource_items_read on public.resource_items for select to authenticated using (status = 'approved' or uploader_id = auth.uid() or public.is_admin() or exists(select 1 from public.resource_drive_connections c where c.owner_user_id = auth.uid() and c.is_active = true));
drop policy if exists resource_items_insert on public.resource_items;
create policy resource_items_insert on public.resource_items for insert to authenticated with check (uploader_id = auth.uid());
drop policy if exists resource_items_update_own on public.resource_items;
create policy resource_items_update_own on public.resource_items for update to authenticated using (uploader_id = auth.uid() or public.is_admin() or exists(select 1 from public.resource_drive_connections c where c.owner_user_id = auth.uid() and c.is_active = true)) with check (uploader_id = auth.uid() or public.is_admin() or exists(select 1 from public.resource_drive_connections c where c.owner_user_id = auth.uid() and c.is_active = true));

drop policy if exists resource_collections_owner on public.resource_collections;
create policy resource_collections_owner on public.resource_collections for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists resource_collection_items_owner on public.resource_collection_items;
create policy resource_collection_items_owner on public.resource_collection_items for all to authenticated using (exists(select 1 from public.resource_collections c where c.id=collection_id and c.owner_id=auth.uid())) with check (exists(select 1 from public.resource_collections c where c.id=collection_id and c.owner_id=auth.uid()));
drop policy if exists resource_comments_auth on public.resource_comments;
create policy resource_comments_auth on public.resource_comments for all to authenticated using (true) with check (author_id = auth.uid());
drop policy if exists resource_favorites_owner on public.resource_favorites;
create policy resource_favorites_owner on public.resource_favorites for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists resource_logs_read on public.resource_activity_logs;
create policy resource_logs_read on public.resource_activity_logs for select to authenticated using (true);

-- Drive connection and approval operations are server-side only through the service role.
revoke all on public.resource_drive_connections from anon, authenticated;
grant select, insert, update on public.resource_items to authenticated;
grant all on public.resource_collections, public.resource_collection_items, public.resource_comments, public.resource_favorites to authenticated;
grant select on public.resource_activity_logs to authenticated;

create index if not exists resource_items_status_idx on public.resource_items(status);
create index if not exists resource_items_category_idx on public.resource_items(category_id);
create index if not exists resource_items_uploader_idx on public.resource_items(uploader_id);
create index if not exists resource_items_checksum_idx on public.resource_items(checksum);
create index if not exists resource_items_search_idx on public.resource_items using gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(ai_summary,'') || ' ' || coalesce(extracted_text,'')));
