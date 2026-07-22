-- Brian English Studio V1.0 Supabase Auth + permission setup
-- Run this in Supabase SQL Editor after creating the Supabase project.
-- Safe to run again when upgrading: it creates missing tables/columns and updates policies.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  school text,
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  approved boolean not null default false,
  permissions jsonb not null default '{"mode":"all","allowed":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists permissions jsonb not null default '{"mode":"all","allowed":[]}'::jsonb;

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and approved = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, school, role, approved, permissions)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'school', ''),
    'teacher',
    false,
    '{"mode":"all","allowed":[]}'::jsonb
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    school = coalesce(public.profiles.school, excluded.school),
    permissions = coalesce(public.profiles.permissions, excluded.permissions),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles
  for select
  using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- After your first admin signs up and confirms email if required, run this once.
-- Replace the email with your real admin email.
-- update public.profiles set role = 'admin', approved = true where email = 'your-email@example.com';

-- Permission examples stored in profiles.permissions:
-- Full teacher access:
--   {"mode":"all","allowed":[]}
-- Custom access only to QuizForge AI and Game Hub:
--   {"mode":"custom","allowed":["tool:text2quiz","tool:game-hub"]}

-- V1.0 upgrade: teacher access requests.
create table if not exists public.permission_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_email text not null,
  requester_name text,
  permission_id text not null,
  item_title text not null,
  item_type text not null default 'tool',
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists permission_requests_one_pending_per_item
  on public.permission_requests (requester_id, permission_id)
  where status = 'pending';

alter table public.permission_requests enable row level security;

drop policy if exists "Users can read their own permission requests" on public.permission_requests;
create policy "Users can read their own permission requests"
  on public.permission_requests
  for select
  using (auth.uid() = requester_id);

drop policy if exists "Users can create their own permission requests" on public.permission_requests;
create policy "Users can create their own permission requests"
  on public.permission_requests
  for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Admins can read all permission requests" on public.permission_requests;
create policy "Admins can read all permission requests"
  on public.permission_requests
  for select
  using (public.is_admin());

drop policy if exists "Admins can update all permission requests" on public.permission_requests;
create policy "Admins can update all permission requests"
  on public.permission_requests
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Shared approval helpers used by retained collaborative apps.
create or replace function public.is_approved_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approved = true
  );
$$;

-- Admin and explicitly appointed TTCM accounts may publish or review shared content.
create or replace function public.can_publish_department()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approved = true
      and (
        lower(coalesce(role, '')) in ('admin', 'ttcm', 'to_truong', 'tổ trưởng', 'department_leader', 'department leader', 'subject_leader', 'subject leader', 'leader')
        or coalesce(permissions->'allowed', '[]'::jsonb) ? 'department:publish'
      )
  );
$$;

-- V5.6 admin account visibility repair.
-- These functions let the Admin page read all profiles and create missing profile rows
-- for users who exist in Supabase Auth but were not inserted into public.profiles.
create or replace function public.bes_admin_list_profiles()
returns table (
  id uuid,
  email text,
  full_name text,
  school text,
  role text,
  approved boolean,
  permissions jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select p.id, p.email, p.full_name, p.school, p.role, p.approved, p.permissions, p.created_at, p.updated_at
  from public.profiles p
  where public.is_admin()
  order by p.created_at desc nulls last;
$$;

grant execute on function public.bes_admin_list_profiles() to authenticated;

create or replace function public.bes_admin_sync_missing_profiles()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inserted_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admin can sync Auth users to profiles.';
  end if;

  insert into public.profiles (id, email, full_name, school, role, approved, permissions, created_at, updated_at)
  select
    u.id,
    lower(coalesce(u.email, '')),
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email, ''), '@', 1)),
    coalesce(u.raw_user_meta_data->>'school', ''),
    'teacher',
    false,
    '{"mode":"all","allowed":[]}'::jsonb,
    coalesce(u.created_at, now()),
    now()
  from auth.users u
  where u.email is not null
    and not exists (select 1 from public.profiles p where p.id = u.id)
  on conflict (id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.bes_admin_sync_missing_profiles() to authenticated;

create or replace function public.bes_admin_update_profile(target_id uuid, patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admin can update profiles.';
  end if;

  update public.profiles
  set
    role = coalesce(nullif(patch->>'role', ''), role),
    approved = coalesce((patch->>'approved')::boolean, approved),
    permissions = coalesce(patch->'permissions', permissions),
    full_name = coalesce(nullif(patch->>'full_name', ''), full_name),
    school = coalesce(nullif(patch->>'school', ''), school),
    updated_at = now()
  where id = target_id;
end;
$$;

grant execute on function public.bes_admin_update_profile(uuid, jsonb) to authenticated;

-- V5.7 admin visibility root-cause fix.
-- The UI may recognize an admin through VITE_ADMIN_EMAILS, while Supabase RLS still
-- sees the same row in public.profiles as role='teacher'. This function lets a
-- signed-in account whose email is listed in VITE_ADMIN_EMAILS promote/sync its own
-- database profile to role='admin', approved=true. Then is_admin() becomes true and
-- bes_admin_list_profiles() can return all teacher accounts.
create or replace function public.bes_admin_claim_configured_admin(allowed_emails text[])
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_email text := lower(coalesce(auth.jwt()->>'email', ''));
  normalized_allowed text[] := array(
    select lower(trim(email_item))
    from unnest(coalesce(allowed_emails, array[]::text[])) as email_item
    where trim(email_item) <> ''
  );
begin
  if auth.uid() is null or current_email = '' then
    return false;
  end if;

  if not (current_email = any(normalized_allowed)) then
    return false;
  end if;

  insert into public.profiles (id, email, full_name, school, role, approved, permissions, created_at, updated_at)
  values (
    auth.uid(),
    current_email,
    split_part(current_email, '@', 1),
    '',
    'admin',
    true,
    '{"mode":"all","allowed":[]}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    role = 'admin',
    approved = true,
    permissions = coalesce(public.profiles.permissions, excluded.permissions),
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.bes_admin_claim_configured_admin(text[]) to authenticated;

-- V10.58 upgrade: TTCM-approved shared custom games.
-- A teacher may keep a custom game private or submit it for TTCM review.
-- Approved games become visible to every approved teacher.
do $$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles
    add constraint profiles_role_check
    check (role in (
      'teacher', 'admin', 'ttcm', 'to_truong', 'tổ trưởng',
      'department_leader', 'department leader',
      'subject_leader', 'subject leader', 'leader'
    ));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.custom_game_platforms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_email text,
  owner_name text,
  label text not null,
  icon text not null default '🎮',
  home text not null,
  color text not null default 'violet',
  embed_mode text not null default 'iframe' check (embed_mode in ('iframe', 'newtab')),
  status text not null default 'private' check (status in ('private', 'pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_game_platforms_status_idx
  on public.custom_game_platforms (status, created_at desc);
create index if not exists custom_game_platforms_owner_idx
  on public.custom_game_platforms (owner_id, created_at desc);

alter table public.custom_game_platforms enable row level security;

drop policy if exists "Custom games visible to approved users" on public.custom_game_platforms;
create policy "Custom games visible to approved users"
  on public.custom_game_platforms
  for select
  using (
    status = 'approved'
    or auth.uid() = owner_id
    or public.can_publish_department()
  );

drop policy if exists "Teachers can create own custom games" on public.custom_game_platforms;
create policy "Teachers can create own custom games"
  on public.custom_game_platforms
  for insert
  with check (
    auth.uid() = owner_id
    and public.is_approved_profile()
    and (
      status in ('private', 'pending')
      or public.can_publish_department()
    )
  );

drop policy if exists "Teachers can update own unapproved custom games" on public.custom_game_platforms;
create policy "Teachers can update own unapproved custom games"
  on public.custom_game_platforms
  for update
  using (
    auth.uid() = owner_id
    and status <> 'approved'
  )
  with check (
    auth.uid() = owner_id
    and status in ('private', 'pending')
  );

drop policy if exists "Department leaders can review custom games" on public.custom_game_platforms;
create policy "Department leaders can review custom games"
  on public.custom_game_platforms
  for update
  using (public.can_publish_department())
  with check (public.can_publish_department());

drop policy if exists "Teachers can delete own unapproved custom games" on public.custom_game_platforms;
create policy "Teachers can delete own unapproved custom games"
  on public.custom_game_platforms
  for delete
  using (
    (auth.uid() = owner_id and status <> 'approved')
    or public.can_publish_department()
  );
