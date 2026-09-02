-- Brian English · Hero Theme Studio V1
-- Safe to run repeatedly in the Production Supabase SQL Editor.
-- Draft/admin data is private; anonymous users can only execute hero_theme_public_manifest().

create extension if not exists pgcrypto;

create or replace function public.hero_theme_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'administrator')
      and coalesce(p.approved, true) = true
  );
$$;

revoke all on function public.hero_theme_is_admin() from public;
grant execute on function public.hero_theme_is_admin() to authenticated;

create table if not exists public.hero_theme_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hero_theme_drafts (
  theme_set_id uuid primary key references public.hero_theme_sets(id) on delete cascade,
  config jsonb not null default '{"version":1,"heroes":{}}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint hero_theme_drafts_config_object check (jsonb_typeof(config) = 'object')
);

create table if not exists public.hero_theme_revisions (
  id uuid primary key default gen_random_uuid(),
  theme_set_id uuid not null references public.hero_theme_sets(id) on delete restrict,
  revision_number bigint not null,
  config jsonb not null,
  published_by uuid,
  created_at timestamptz not null default now(),
  constraint hero_theme_revisions_config_object check (jsonb_typeof(config) = 'object'),
  unique (theme_set_id, revision_number)
);

create table if not exists public.hero_theme_active (
  id boolean primary key default true check (id),
  revision_id uuid not null references public.hero_theme_revisions(id) on delete restrict,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.hero_theme_media (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  width integer not null check (width > 0 and width <= 12000),
  height integer not null check (height > 0 and height <= 12000),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists hero_theme_revisions_set_created_idx
  on public.hero_theme_revisions(theme_set_id, created_at desc);
create index if not exists hero_theme_media_drive_idx
  on public.hero_theme_media(drive_file_id);

alter table public.hero_theme_sets enable row level security;
alter table public.hero_theme_drafts enable row level security;
alter table public.hero_theme_revisions enable row level security;
alter table public.hero_theme_active enable row level security;
alter table public.hero_theme_media enable row level security;

-- Theme library: approved Admin only.
drop policy if exists "Admins manage hero theme sets" on public.hero_theme_sets;
create policy "Admins manage hero theme sets"
  on public.hero_theme_sets
  for all
  to authenticated
  using (public.hero_theme_is_admin())
  with check (public.hero_theme_is_admin());

-- Drafts: approved Admin only.
drop policy if exists "Admins manage hero theme drafts" on public.hero_theme_drafts;
create policy "Admins manage hero theme drafts"
  on public.hero_theme_drafts
  for all
  to authenticated
  using (public.hero_theme_is_admin())
  with check (public.hero_theme_is_admin());

-- Revisions are immutable from PostgREST. Admin may read; only the security-definer
-- publish/restore RPCs below can insert new snapshots.
drop policy if exists "Admins read hero theme revisions" on public.hero_theme_revisions;
create policy "Admins read hero theme revisions"
  on public.hero_theme_revisions
  for select
  to authenticated
  using (public.hero_theme_is_admin());

-- Active pointer is also immutable from PostgREST and changed only by RPC.
drop policy if exists "Admins read hero theme active" on public.hero_theme_active;
create policy "Admins read hero theme active"
  on public.hero_theme_active
  for select
  to authenticated
  using (public.hero_theme_is_admin());

-- Media metadata: approved Admin can register/delete metadata. Public clients never
-- receive Drive file IDs directly; /api/hero-theme-media verifies active references.
drop policy if exists "Admins manage hero theme media" on public.hero_theme_media;
create policy "Admins manage hero theme media"
  on public.hero_theme_media
  for all
  to authenticated
  using (public.hero_theme_is_admin())
  with check (public.hero_theme_is_admin());

grant select, insert, update, delete on public.hero_theme_sets to authenticated;
grant select, insert, update, delete on public.hero_theme_drafts to authenticated;
grant select on public.hero_theme_revisions to authenticated;
grant select on public.hero_theme_active to authenticated;
grant select, insert, update, delete on public.hero_theme_media to authenticated;

create or replace function public.hero_theme_publish_draft(p_theme_set_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config jsonb;
  v_revision_number bigint;
  v_revision_id uuid;
begin
  if not public.hero_theme_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select d.config into v_config
  from public.hero_theme_drafts d
  where d.theme_set_id = p_theme_set_id
  for update;

  if v_config is null then
    raise exception 'Theme draft not found' using errcode = 'P0002';
  end if;

  select coalesce(max(r.revision_number), 0) + 1
    into v_revision_number
  from public.hero_theme_revisions r
  where r.theme_set_id = p_theme_set_id;

  insert into public.hero_theme_revisions (
    theme_set_id, revision_number, config, published_by
  ) values (
    p_theme_set_id, v_revision_number, v_config, auth.uid()
  ) returning id into v_revision_id;

  insert into public.hero_theme_active (id, revision_id, updated_by, updated_at)
  values (true, v_revision_id, auth.uid(), now())
  on conflict (id) do update
    set revision_id = excluded.revision_id,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return v_revision_id;
end;
$$;

create or replace function public.hero_theme_restore_revision(p_revision_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.hero_theme_revisions%rowtype;
  v_revision_number bigint;
  v_revision_id uuid;
begin
  if not public.hero_theme_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_source
  from public.hero_theme_revisions
  where id = p_revision_id;

  if v_source.id is null then
    raise exception 'Theme revision not found' using errcode = 'P0002';
  end if;

  -- Lock this set's draft row so concurrent publish/restore operations serialize.
  perform 1 from public.hero_theme_drafts
   where theme_set_id = v_source.theme_set_id
   for update;

  select coalesce(max(r.revision_number), 0) + 1
    into v_revision_number
  from public.hero_theme_revisions r
  where r.theme_set_id = v_source.theme_set_id;

  insert into public.hero_theme_revisions (
    theme_set_id, revision_number, config, published_by
  ) values (
    v_source.theme_set_id, v_revision_number, v_source.config, auth.uid()
  ) returning id into v_revision_id;

  insert into public.hero_theme_drafts (theme_set_id, config, updated_by, updated_at)
  values (v_source.theme_set_id, v_source.config, auth.uid(), now())
  on conflict (theme_set_id) do update
    set config = excluded.config,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  insert into public.hero_theme_active (id, revision_id, updated_by, updated_at)
  values (true, v_revision_id, auth.uid(), now())
  on conflict (id) do update
    set revision_id = excluded.revision_id,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return v_revision_id;
end;
$$;

revoke all on function public.hero_theme_publish_draft(uuid) from public;
revoke all on function public.hero_theme_restore_revision(uuid) from public;
grant execute on function public.hero_theme_publish_draft(uuid) to authenticated;
grant execute on function public.hero_theme_restore_revision(uuid) to authenticated;

-- Published-only public projection. It contains no draft, actor, Drive credential,
-- or Drive file ID data. The media UUID is an opaque app-level identifier.
create or replace function public.hero_theme_public_manifest()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'version', 1,
        'revisionId', r.id,
        'themeSetId', r.theme_set_id,
        'publishedAt', r.created_at,
        'heroes', coalesce(r.config->'heroes', '{}'::jsonb)
      )
      from public.hero_theme_active a
      join public.hero_theme_revisions r on r.id = a.revision_id
      where a.id = true
      limit 1
    ),
    '{"version":1,"revisionId":null,"themeSetId":null,"heroes":{}}'::jsonb
  );
$$;

revoke all on function public.hero_theme_public_manifest() from public;
grant execute on function public.hero_theme_public_manifest() to anon, authenticated;

comment on table public.hero_theme_revisions is
  'Immutable Hero Theme publish/restore snapshots. Inserts are only performed by security-definer RPCs.';
comment on function public.hero_theme_public_manifest() is
  'Anonymous-safe active Hero Theme projection. Never returns drafts or Google Drive IDs.';
