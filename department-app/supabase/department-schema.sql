-- Brian Department Workspace — Supabase schema
-- Run this migration once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.department_members (
  department_id uuid not null references public.departments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'department_head', 'teacher', 'viewer')),
  display_name text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (department_id, user_id)
);

create index if not exists department_members_user_idx
  on public.department_members(user_id, active);

create table if not exists public.department_entities (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'tasks', 'records', 'plans', 'calendar', 'meetings',
    'evidence', 'report_history', 'notifications'
  )),
  external_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, entity_type, external_id)
);

create index if not exists department_entities_lookup_idx
  on public.department_entities(department_id, entity_type, created_at);

create or replace function public.department_role(p_department_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select dm.role
  from public.department_members dm
  where dm.department_id = p_department_id
    and dm.user_id = auth.uid()
    and dm.active = true
  limit 1;
$$;

create or replace function public.is_department_member(p_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.department_members dm
    where dm.department_id = p_department_id
      and dm.user_id = auth.uid()
      and dm.active = true
  );
$$;

create or replace function public.is_department_manager(p_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.department_role(p_department_id) in ('admin', 'department_head'), false);
$$;

alter table public.departments enable row level security;
alter table public.department_members enable row level security;
alter table public.department_entities enable row level security;

-- Department members may see their own department.
drop policy if exists departments_select_members on public.departments;
create policy departments_select_members
on public.departments for select
to authenticated
using (public.is_department_member(id));

-- A user can see their own membership. TTCM/admin can see every member in the same department.
drop policy if exists department_members_select on public.department_members;
create policy department_members_select
on public.department_members for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_department_manager(department_id)
);

-- Membership management is limited to TTCM/admin.
drop policy if exists department_members_insert_manager on public.department_members;
create policy department_members_insert_manager
on public.department_members for insert
to authenticated
with check (public.is_department_manager(department_id));

drop policy if exists department_members_update_manager on public.department_members;
create policy department_members_update_manager
on public.department_members for update
to authenticated
using (public.is_department_manager(department_id))
with check (public.is_department_manager(department_id));

drop policy if exists department_members_delete_manager on public.department_members;
create policy department_members_delete_manager
on public.department_members for delete
to authenticated
using (public.is_department_manager(department_id));

-- All active members may read workspace data in their department.
drop policy if exists department_entities_select_members on public.department_entities;
create policy department_entities_select_members
on public.department_entities for select
to authenticated
using (public.is_department_member(department_id));

-- Collection-level writes are restricted to TTCM/admin.
drop policy if exists department_entities_insert_manager on public.department_entities;
create policy department_entities_insert_manager
on public.department_entities for insert
to authenticated
with check (public.is_department_manager(department_id));

drop policy if exists department_entities_update_manager on public.department_entities;
create policy department_entities_update_manager
on public.department_entities for update
to authenticated
using (public.is_department_manager(department_id))
with check (public.is_department_manager(department_id));

drop policy if exists department_entities_delete_manager on public.department_entities;
create policy department_entities_delete_manager
on public.department_entities for delete
to authenticated
using (public.is_department_manager(department_id));

-- Replace a complete collection atomically. Only TTCM/admin can execute the mutation.
create or replace function public.department_replace_collection(
  p_department_id uuid,
  p_entity_type text,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_external_id text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_department_manager(p_department_id) then
    raise exception 'Department manager permission required';
  end if;

  if p_entity_type not in (
    'tasks', 'records', 'plans', 'calendar', 'meetings',
    'evidence', 'report_history', 'notifications'
  ) then
    raise exception 'Unsupported department entity type: %', p_entity_type;
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  delete from public.department_entities
  where department_id = p_department_id
    and entity_type = p_entity_type;

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    insert into public.department_entities (
      department_id, entity_type, external_id, payload, created_by, updated_by
    ) values (
      p_department_id,
      p_entity_type,
      '__empty__',
      jsonb_build_object('__department_empty', true),
      auth.uid(),
      auth.uid()
    );
    return;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_external_id := coalesce(v_item ->> 'id', gen_random_uuid()::text);
    insert into public.department_entities (
      department_id, entity_type, external_id, payload, created_by, updated_by
    ) values (
      p_department_id,
      p_entity_type,
      v_external_id,
      v_item,
      auth.uid(),
      auth.uid()
    );
  end loop;
end;
$$;

revoke all on function public.department_replace_collection(uuid, text, jsonb) from public;
grant execute on function public.department_replace_collection(uuid, text, jsonb) to authenticated;

grant select on public.departments to authenticated;
grant select, insert, update, delete on public.department_members to authenticated;
grant select, insert, update, delete on public.department_entities to authenticated;

-- Optional private Storage bucket for future real attachments.
insert into storage.buckets (id, name, public)
values ('department-files', 'department-files', false)
on conflict (id) do nothing;

drop policy if exists department_files_select on storage.objects;
create policy department_files_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'department-files'
  and public.is_department_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists department_files_insert_manager on storage.objects;
create policy department_files_insert_manager
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'department-files'
  and public.is_department_manager(((storage.foldername(name))[1])::uuid)
);

drop policy if exists department_files_update_manager on storage.objects;
create policy department_files_update_manager
on storage.objects for update
to authenticated
using (
  bucket_id = 'department-files'
  and public.is_department_manager(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'department-files'
  and public.is_department_manager(((storage.foldername(name))[1])::uuid)
);

drop policy if exists department_files_delete_manager on storage.objects;
create policy department_files_delete_manager
on storage.objects for delete
to authenticated
using (
  bucket_id = 'department-files'
  and public.is_department_manager(((storage.foldername(name))[1])::uuid)
);

-- Bootstrap example (replace IDs before running):
-- insert into public.departments (id, name, code)
-- values ('00000000-0000-0000-0000-000000000001', 'Tổ Tiếng Anh', 'ENGLISH');
-- insert into public.department_members (department_id, user_id, role, display_name, email)
-- values (
--   '00000000-0000-0000-0000-000000000001',
--   '<AUTH_USER_UUID>',
--   'department_head',
--   'Nguyễn Anh Tuấn',
--   '<EMAIL>'
-- );
