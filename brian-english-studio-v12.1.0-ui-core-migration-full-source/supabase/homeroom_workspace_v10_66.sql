-- Brian English Studio V10.66
-- Phase 1: Homeroom Teacher Workspace
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.bes_homeroom_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null default '',
  workspace_id text not null default 'default',
  class_name text not null default '',
  school_year text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, workspace_id)
);

create index if not exists bes_homeroom_workspaces_owner_idx
  on public.bes_homeroom_workspaces(owner_id);
create index if not exists bes_homeroom_workspaces_class_idx
  on public.bes_homeroom_workspaces(class_name, school_year);
create index if not exists bes_homeroom_workspaces_updated_idx
  on public.bes_homeroom_workspaces(updated_at desc);

alter table public.bes_homeroom_workspaces enable row level security;

-- A teacher can only read the homeroom workspace belonging to their own account.
drop policy if exists "homeroom_owner_select" on public.bes_homeroom_workspaces;
create policy "homeroom_owner_select"
on public.bes_homeroom_workspaces
for select
to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
      and p.approved = true
  )
);

-- Teachers create their own workspace; administrators may create a workspace for any account.
drop policy if exists "homeroom_owner_insert" on public.bes_homeroom_workspaces;
create policy "homeroom_owner_insert"
on public.bes_homeroom_workspaces
for insert
to authenticated
with check (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
      and p.approved = true
  )
);

-- Teachers update only their own workspace; administrators can support all workspaces.
drop policy if exists "homeroom_owner_update" on public.bes_homeroom_workspaces;
create policy "homeroom_owner_update"
on public.bes_homeroom_workspaces
for update
to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
      and p.approved = true
  )
)
with check (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
      and p.approved = true
  )
);

-- Deleting a workspace is restricted to its owner or an approved administrator.
drop policy if exists "homeroom_owner_delete" on public.bes_homeroom_workspaces;
create policy "homeroom_owner_delete"
on public.bes_homeroom_workspaces
for delete
to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
      and p.approved = true
  )
);

grant select, insert, update, delete on public.bes_homeroom_workspaces to authenticated;

comment on table public.bes_homeroom_workspaces is
'Account-scoped Phase 1 homeroom workspace. The payload stores class profile, students, attendance, schedule, class meetings, parent contacts and records.';
