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

-- V1.0 upgrade: English Department Workspace permissions.
-- No additional table is required for local-first department data in this build.
-- Admin can grant the route card and granular submodule permissions through profiles.permissions:
--   tool:department-workspace
--   department:dashboard
--   department:plans
--   department:meetings
--   department:lesson-study
--   department:observations
--   department:assessment
--   department:tasks
--   department:documents
--   department:submissions
--   department:teacher-development
--   department:student-activities
--   department:reports
--   department:policies
--   department:publish

-- V1.0 upgrade: shared cloud snapshot for English Department Workspace.
-- This lets TTCM save one shared department workspace per school year.
create table if not exists public.department_workspace_snapshots (
  school_year text primary key,
  semester text,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_by_email text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.department_workspace_snapshots enable row level security;

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

drop policy if exists "Approved users can read department snapshots" on public.department_workspace_snapshots;
create policy "Approved users can read department snapshots"
  on public.department_workspace_snapshots
  for select
  using (public.is_approved_profile());

drop policy if exists "Approved users can insert department snapshots" on public.department_workspace_snapshots;
create policy "Approved users can insert department snapshots"
  on public.department_workspace_snapshots
  for insert
  with check (public.is_approved_profile());

drop policy if exists "Approved users can update department snapshots" on public.department_workspace_snapshots;
create policy "Approved users can update department snapshots"
  on public.department_workspace_snapshots
  for update
  using (public.is_approved_profile())
  with check (public.is_approved_profile());

-- Optional stricter mode after you test: replace the update/insert policies above with public.is_admin()
-- if only admin/TTCM should be allowed to publish the shared snapshot.

-- V1.0 upgrade: stricter TTCM publishing and teacher evidence submissions.
-- Teachers may read the shared workspace snapshot, but only admin or an explicitly appointed TTCM/tổ phó
-- with permission "department:publish" can save the official shared snapshot, create submission notices, review all submissions,
-- and open every uploaded evidence file. Normal teachers can only read their own submissions/files and can submit only against open notices.
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

drop policy if exists "Approved users can insert department snapshots" on public.department_workspace_snapshots;
drop policy if exists "Approved users can update department snapshots" on public.department_workspace_snapshots;
drop policy if exists "Department publishers can insert department snapshots" on public.department_workspace_snapshots;
drop policy if exists "Department publishers can update department snapshots" on public.department_workspace_snapshots;

create policy "Department publishers can insert department snapshots"
  on public.department_workspace_snapshots
  for insert
  with check (public.can_publish_department());

create policy "Department publishers can update department snapshots"
  on public.department_workspace_snapshots
  for update
  using (public.can_publish_department())
  with check (public.can_publish_department());


-- V1.0 upgrade: TTCM notices/requests gate teacher submissions.
-- Teachers may submit reports, plans, documents or task updates only when there is an open request from TTCM.
create table if not exists public.department_submission_requests (
  id uuid primary key default gen_random_uuid(),
  school_year text not null,
  semester text,
  title text not null,
  category text not null default 'Nhiệm vụ',
  description text,
  due_date date,
  target_mode text not null default 'all' check (target_mode in ('all', 'selected')),
  target_emails text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_by_email text,
  file_name text,
  file_path text,
  file_mime text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- V6.4: Categories now cover all professional-work cards, so old four-value checks are removed.
alter table public.department_submission_requests
  drop constraint if exists department_submission_requests_category_check;

alter table public.department_submission_requests
  add column if not exists semester text,
  add column if not exists description text,
  add column if not exists due_date date,
  add column if not exists target_mode text not null default 'all',
  add column if not exists target_emails text[] not null default '{}',
  add column if not exists status text not null default 'open',
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_by_email text,
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_mime text,
  add column if not exists file_size bigint,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists department_submission_requests_school_year_idx
  on public.department_submission_requests (school_year, status, created_at desc);

create index if not exists department_submission_requests_created_by_idx
  on public.department_submission_requests (created_by, created_at desc);

alter table public.department_submission_requests enable row level security;

drop policy if exists "Department publishers can manage submission requests" on public.department_submission_requests;
drop policy if exists "Department publishers can read submission requests" on public.department_submission_requests;
drop policy if exists "Teachers can read open requests addressed to them" on public.department_submission_requests;

create policy "Department publishers can read submission requests"
  on public.department_submission_requests
  for select
  using (public.can_publish_department());

create policy "Department publishers can manage submission requests"
  on public.department_submission_requests
  for all
  using (public.can_publish_department())
  with check (public.can_publish_department());

create policy "Teachers can read open requests addressed to them"
  on public.department_submission_requests
  for select
  to authenticated
  using (
    public.is_approved_profile()
    and status = 'open'
    and (
      target_mode = 'all'
      or lower(coalesce(auth.jwt() ->> 'email', '')) = any(target_emails)
    )
  );

create table if not exists public.department_submissions (
  id uuid primary key default gen_random_uuid(),
  school_year text not null,
  semester text,
  request_id uuid references public.department_submission_requests(id) on delete restrict,
  request_title text,
  request_category text,
  title text not null,
  category text,
  link text,
  note text,
  related_task text,
  submitter_id uuid not null references public.profiles(id) on delete cascade,
  submitter_email text,
  submitter_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_by_email text,
  reviewed_at timestamptz,
  file_name text,
  file_path text,
  file_mime text,
  file_size bigint,
  archive_folder text,
  archive_note text,
  archived_by uuid references public.profiles(id) on delete set null,
  archived_by_email text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists department_submissions_school_year_idx
  on public.department_submissions (school_year, created_at desc);

create index if not exists department_submissions_submitter_idx
  on public.department_submissions (submitter_id, created_at desc);

-- V1.0 upgrade: uploaded evidence files for teacher submissions.
alter table public.department_submissions
  add column if not exists request_id uuid references public.department_submission_requests(id) on delete restrict,
  add column if not exists request_title text,
  add column if not exists request_category text,
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_mime text,
  add column if not exists file_size bigint,
  add column if not exists archive_folder text,
  add column if not exists archive_note text,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_by_email text,
  add column if not exists archived_at timestamptz;

-- Private Supabase Storage bucket for department evidence upload.
-- Teachers can upload under their own user-id folder. TTCM/Admin can read every uploaded evidence file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('department-evidence', 'department-evidence', false, 52428800)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800;

create index if not exists department_submissions_file_path_idx
  on public.department_submissions (file_path)
  where file_path is not null;

create index if not exists department_submissions_request_idx
  on public.department_submissions (request_id, created_at desc)
  where request_id is not null;

create index if not exists department_submissions_archive_idx
  on public.department_submissions (school_year, archive_folder, archived_at desc)
  where archived_at is not null;

-- Storage RLS for private evidence files. File path convention: <auth.uid>/<school-year>/<timestamp>-filename.
drop policy if exists "Users can upload their own department evidence" on storage.objects;
drop policy if exists "Users can read their own department evidence" on storage.objects;
drop policy if exists "Department publishers can read every evidence file" on storage.objects;
drop policy if exists "Approved users can read department request attachments" on storage.objects;
drop policy if exists "Users can update their own department evidence" on storage.objects;
drop policy if exists "Users can delete their own department evidence" on storage.objects;

create policy "Users can upload their own department evidence"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'department-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved_profile()
  );

create policy "Users can read their own department evidence"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'department-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Department publishers can read every evidence file"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'department-evidence'
    and public.can_publish_department()
  );

create policy "Approved users can read department request attachments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'department-evidence'
    and (storage.foldername(name))[1] = 'requests'
    and public.is_approved_profile()
  );

create policy "Users can update their own department evidence"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'department-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'department-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own department evidence"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'department-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter table public.department_submissions enable row level security;

drop policy if exists "Users can read their own department submissions" on public.department_submissions;
drop policy if exists "Users can create their own department submissions" on public.department_submissions;
drop policy if exists "Users can update their pending department submissions" on public.department_submissions;
drop policy if exists "Department publishers can read all submissions" on public.department_submissions;
drop policy if exists "Department publishers can review all submissions" on public.department_submissions;

create policy "Users can read their own department submissions"
  on public.department_submissions
  for select
  using (auth.uid() = submitter_id or public.can_publish_department());

create policy "Users can create their own department submissions"
  on public.department_submissions
  for insert
  with check (
    auth.uid() = submitter_id
    and public.is_approved_profile()
    and request_id is not null
    and exists (
      select 1
      from public.department_submission_requests request
      where request.id = department_submissions.request_id
        and request.school_year = department_submissions.school_year
        and request.status = 'open'
        and (
          request.target_mode = 'all'
          or lower(coalesce(auth.jwt() ->> 'email', '')) = any(request.target_emails)
        )
    )
  );

create policy "Users can update their pending department submissions"
  on public.department_submissions
  for update
  using (auth.uid() = submitter_id and status = 'pending')
  with check (auth.uid() = submitter_id and status in ('pending', 'cancelled'));

create policy "Department publishers can read all submissions"
  on public.department_submissions
  for select
  using (public.can_publish_department());

create policy "Department publishers can review all submissions"
  on public.department_submissions
  for update
  using (public.can_publish_department())
  with check (public.can_publish_department());

-- Archive fields let TTCM/Admin keep approved teacher submissions in a retrievable folder view.
-- The uploaded file stays in the private storage bucket; archive_folder is the logical folder shown in the app.

-- To appoint a non-admin TTCM/tổ phó who can publish shared department data without full admin rights,
-- grant the custom permission "department:publish" in the Admin page.
-- SQL example:
-- update public.profiles
-- set permissions = jsonb_build_object('mode','custom','allowed', coalesce(permissions->'allowed','[]'::jsonb) || '["tool:department-workspace","department:dashboard","department:submissions","department:publish"]'::jsonb)
-- where email = 'leader@example.com';

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
