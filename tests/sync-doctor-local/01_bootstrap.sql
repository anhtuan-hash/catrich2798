-- FOR A NEW, TEMPORARY LOCAL DATABASE ONLY.
-- Synthetic minimal schema matching the contracts read by the real RPC functions.
-- Never run in hosted Supabase or any database with real application data.
create schema auth;
create schema bes_internal;
do $bootstrap$
begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
  if not exists(select 1 from pg_roles where rolname='anon') then
    create role anon nologin;
  end if;
end $bootstrap$;
create table auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
  $func$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$func$;
create table public.profiles(
  id uuid primary key references auth.users(id),
  approved boolean not null default false,
  role text not null
);
create table public.bes_class_rosters(
  roster_key text primary key,
  school_year text not null,
  class_name text not null,
  students jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.bes_gradebook_workspaces(
  owner_id uuid not null references auth.users(id),
  workspace_id text not null,
  school_year text not null,
  class_name text not null,
  payload jsonb not null,
  student_count integer not null,
  updated_at timestamptz not null default now(),
  primary key(owner_id,workspace_id)
);
create table public.bes_homeroom_workspaces(
  owner_id uuid not null references auth.users(id),
  workspace_id text not null,
  school_year text not null,
  class_name text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key(owner_id,workspace_id)
);
create table public.bes_sync_review_requests(
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id),
  case_hash text not null,
  issue_code text not null,
  source text not null,
  school_year text not null,
  class_name text not null,
  workspace_id text not null,
  source_revision timestamptz,
  canonical_revision timestamptz,
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted',
  note text not null default '',
  reviewer_id uuid references auth.users(id),
  reviewer_note text not null default '',
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  execution_authorized_by uuid references auth.users(id),
  rollback_authorized_by uuid references auth.users(id)
);
create table public.bes_sync_review_events(
  id bigint generated always as identity primary key,
  request_id uuid not null references public.bes_sync_review_requests(id),
  actor_id uuid not null references auth.users(id),
  action text not null,
  occurred_at timestamptz not null default now(),
  note text not null default ''
);
create table bes_internal.bes_sync_backup_snapshots(
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.bes_sync_review_requests(id),
  workspace_id text not null,
  school_year text not null,
  class_name text not null,
  snapshot jsonb not null,
  snapshot_hash text not null,
  source_revision timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  rehearsal_at timestamptz,
  rehearsal_ok boolean not null default false,
  post_checksum text,
  post_revision timestamptz,
  original_student_count integer,
  post_student_count integer,
  executed_at timestamptz,
  rolled_back_at timestamptz
);
create index bes_sync_fixture_request_idx on public.bes_sync_review_events(request_id);
