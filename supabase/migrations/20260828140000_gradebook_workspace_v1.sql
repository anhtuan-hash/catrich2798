-- Gradebook Workspace V1
-- Separates teaching-grade data from Homeroom while preserving a safe one-time
-- migration path from bes_homeroom_workspaces. This migration is idempotent.

create table if not exists public.bes_gradebook_workspaces (
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null default '',
  workspace_id text not null,
  class_name text not null default 'Lớp bộ môn',
  school_year text not null default '',
  grade text not null default '',
  semester text not null default 'Học kỳ I',
  class_type text not null default 'subject',
  status text not null default 'active',
  archived_at timestamptz,
  student_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  migrated_from_homeroom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, workspace_id)
);

create index if not exists bes_gradebook_workspaces_owner_updated_idx
  on public.bes_gradebook_workspaces (owner_id, updated_at desc);

create index if not exists bes_gradebook_workspaces_owner_status_idx
  on public.bes_gradebook_workspaces (owner_id, status, updated_at desc);

alter table public.bes_gradebook_workspaces enable row level security;

drop policy if exists "bes_gradebook_owner_select" on public.bes_gradebook_workspaces;
create policy "bes_gradebook_owner_select"
  on public.bes_gradebook_workspaces
  for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "bes_gradebook_owner_insert" on public.bes_gradebook_workspaces;
create policy "bes_gradebook_owner_insert"
  on public.bes_gradebook_workspaces
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "bes_gradebook_owner_update" on public.bes_gradebook_workspaces;
create policy "bes_gradebook_owner_update"
  on public.bes_gradebook_workspaces
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "bes_gradebook_owner_delete" on public.bes_gradebook_workspaces;
create policy "bes_gradebook_owner_delete"
  on public.bes_gradebook_workspaces
  for delete
  to authenticated
  using (auth.uid() = owner_id);

-- Remove any partially-created legacy Admin policy from earlier drafts. Gradebook
-- V1 intentionally relies only on owner-scoped policies so this migration has no
-- dependency on the shape of public.profiles. Cross-owner Admin access can be
-- added later in a dedicated permission migration once the profile contract is fixed.
drop policy if exists "bes_gradebook_admins_all" on public.bes_gradebook_workspaces;

grant select, insert, update, delete on public.bes_gradebook_workspaces to authenticated;

-- Seed existing gradebooks only when the legacy Homeroom table is present.
-- This allows the same migration to work on both an upgraded production DB and
-- a clean installation that starts directly with the standalone Gradebook.
do $$
begin
  if to_regclass('public.bes_homeroom_workspaces') is not null then
    insert into public.bes_gradebook_workspaces (
      owner_id,
      owner_email,
      workspace_id,
      class_name,
      school_year,
      grade,
      semester,
      class_type,
      status,
      archived_at,
      student_count,
      payload,
      migrated_from_homeroom,
      created_at,
      updated_at
    )
    select
      h.owner_id,
      coalesce(h.owner_email, ''),
      h.workspace_id,
      coalesce(nullif(h.payload #>> '{classProfile,className}', ''), nullif(h.class_name, ''), 'Lớp bộ môn'),
      coalesce(nullif(h.payload #>> '{classProfile,schoolYear}', ''), nullif(h.school_year, ''), ''),
      coalesce(h.payload #>> '{classProfile,grade}', ''),
      coalesce(nullif(h.payload ->> 'semester', ''), 'Học kỳ I'),
      coalesce(nullif(h.payload #>> '{classProfile,classType}', ''), 'subject'),
      coalesce(nullif(h.payload ->> 'status', ''), 'active'),
      case
        when nullif(h.payload ->> 'archivedAt', '') is not null
          and (h.payload ->> 'archivedAt') ~ '^\d{4}-\d{2}-\d{2}'
          then (h.payload ->> 'archivedAt')::timestamptz
        else null
      end,
      case
        when jsonb_typeof(h.payload -> 'students') = 'array'
          then jsonb_array_length(h.payload -> 'students')
        else 0
      end,
      jsonb_build_object(
        'id', h.workspace_id,
        'status', coalesce(nullif(h.payload ->> 'status', ''), 'active'),
        'archivedAt', h.payload -> 'archivedAt',
        'semester', coalesce(nullif(h.payload ->> 'semester', ''), 'Học kỳ I'),
        'classProfile', coalesce(h.payload -> 'classProfile', '{}'::jsonb),
        'students', case when jsonb_typeof(h.payload -> 'students') = 'array' then h.payload -> 'students' else '[]'::jsonb end,
        'learningGradebook', coalesce(h.payload -> 'learningGradebook', '{}'::jsonb),
        'learningRecords', case when jsonb_typeof(h.payload -> 'learningRecords') = 'array' then h.payload -> 'learningRecords' else '[]'::jsonb end,
        'gradeSettings', coalesce(h.payload -> 'gradeSettings', '{}'::jsonb),
        'academicTerms', coalesce(h.payload -> 'academicTerms', '[]'::jsonb),
        'createdAt', coalesce(h.payload -> 'createdAt', to_jsonb(h.created_at)),
        'updatedAt', coalesce(h.payload -> 'updatedAt', to_jsonb(h.updated_at)),
        'gradebookStorageVersion', 1
      ),
      true,
      h.created_at,
      h.updated_at
    from public.bes_homeroom_workspaces h
    on conflict (owner_id, workspace_id) do nothing;
  end if;
end
$$;
