-- Brian English Studio V11.4.2
-- AI Lesson Integration Studio project storage and RLS.
-- Safe to re-run. It does not alter the existing profiles table.

create table if not exists public.bes_lesson_integration_projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bes_lesson_integration_owner_updated_idx
  on public.bes_lesson_integration_projects(owner_id, updated_at desc);

alter table public.bes_lesson_integration_projects enable row level security;

create or replace function public.bes_v1142_is_lesson_integration_leader(target_user uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  role_value text := '';
begin
  if target_user is null then return false; end if;
  begin
    select lower(coalesce(role::text, ''))
      into role_value
      from public.profiles
      where id = target_user
      limit 1;
  exception when others then
    role_value := '';
  end;
  return role_value in ('admin','ttcm','department_head','department-head','department_leader','leader','head','to_truong','tổ trưởng');
end;
$$;

revoke all on function public.bes_v1142_is_lesson_integration_leader(uuid) from public;
grant execute on function public.bes_v1142_is_lesson_integration_leader(uuid) to authenticated;

drop policy if exists "bes_lesson_projects_select" on public.bes_lesson_integration_projects;
drop policy if exists "bes_lesson_projects_insert" on public.bes_lesson_integration_projects;
drop policy if exists "bes_lesson_projects_update" on public.bes_lesson_integration_projects;
drop policy if exists "bes_lesson_projects_delete" on public.bes_lesson_integration_projects;

create policy "bes_lesson_projects_select"
on public.bes_lesson_integration_projects
for select to authenticated
using (
  owner_id = auth.uid()
  or public.bes_v1142_is_lesson_integration_leader(auth.uid())
);

create policy "bes_lesson_projects_insert"
on public.bes_lesson_integration_projects
for insert to authenticated
with check (owner_id = auth.uid());

create policy "bes_lesson_projects_update"
on public.bes_lesson_integration_projects
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "bes_lesson_projects_delete"
on public.bes_lesson_integration_projects
for delete to authenticated
using (owner_id = auth.uid());

create or replace function public.bes_v1142_touch_lesson_integration_project()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bes_v1142_touch_lesson_integration_project_trigger
  on public.bes_lesson_integration_projects;
create trigger bes_v1142_touch_lesson_integration_project_trigger
before update on public.bes_lesson_integration_projects
for each row execute function public.bes_v1142_touch_lesson_integration_project();

comment on table public.bes_lesson_integration_projects is
  'Private English lesson integration projects. Owners have CRUD; department leaders have read-only review access.';
