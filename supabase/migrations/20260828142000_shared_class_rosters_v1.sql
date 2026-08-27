-- Shared Class Rosters V1
-- One canonical, subject-independent student roster per assigned class.
-- Gradebooks keep their own student ids and subject notes so existing score keys stay valid.

create table if not exists public.bes_class_rosters (
  roster_key text primary key,
  department_id text not null default '',
  class_name text not null,
  school_year text not null default '',
  grade text not null default '',
  students jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bes_class_rosters_students_array
    check (jsonb_typeof(students) = 'array')
);

create index if not exists bes_class_rosters_department_class_idx
  on public.bes_class_rosters (department_id, school_year, class_name);
create index if not exists bes_class_rosters_updated_idx
  on public.bes_class_rosters (updated_at desc);

-- True only when the authenticated teacher really has this class in the synchronized
-- Brian Team assignment source. Dynamic SQL keeps the function installable even in
-- environments where department_teacher_sync has not been installed yet.
create or replace function public.bes_has_class_assignment(
  p_department_id text,
  p_class_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
begin
  if auth.uid() is null
     or coalesce(trim(p_department_id), '') = ''
     or coalesce(trim(p_class_name), '') = '' then
    return false;
  end if;

  if to_regclass('public.department_teacher_sync') is null then
    return false;
  end if;

  execute $query$
    select exists (
      select 1
      from public.department_teacher_sync s
      where s.teacher_id = $1
        and s.department_id = $2
        and exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(s.member -> 'teachingClasses') = 'array'
                then s.member -> 'teachingClasses'
              else '[]'::jsonb
            end
          ) as c(class_name)
          where lower(trim(c.class_name)) = lower(trim($3))
        )
    )
  $query$ into allowed using auth.uid(), p_department_id, p_class_name;

  return coalesce(allowed, false);
end;
$$;

create or replace function public.bes_can_access_class_roster(
  p_created_by uuid,
  p_department_id text,
  p_class_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      p_created_by = auth.uid()
      or public.bes_has_class_assignment(p_department_id, p_class_name)
    );
$$;

grant execute on function public.bes_has_class_assignment(text, text) to authenticated;
grant execute on function public.bes_can_access_class_roster(uuid, text, text) to authenticated;

alter table public.bes_class_rosters enable row level security;

drop policy if exists "bes_class_rosters_select" on public.bes_class_rosters;
create policy "bes_class_rosters_select"
  on public.bes_class_rosters
  for select
  to authenticated
  using (
    public.bes_can_access_class_roster(created_by, department_id, class_name)
  );

drop policy if exists "bes_class_rosters_insert" on public.bes_class_rosters;
create policy "bes_class_rosters_insert"
  on public.bes_class_rosters
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      coalesce(trim(department_id), '') = ''
      or public.bes_has_class_assignment(department_id, class_name)
    )
  );

drop policy if exists "bes_class_rosters_update" on public.bes_class_rosters;
create policy "bes_class_rosters_update"
  on public.bes_class_rosters
  for update
  to authenticated
  using (
    public.bes_can_access_class_roster(created_by, department_id, class_name)
  )
  with check (
    public.bes_can_access_class_roster(created_by, department_id, class_name)
  );

-- V1 deliberately has no authenticated DELETE permission. A shared class roster is
-- recoverable infrastructure and should not disappear because one subject teacher clicks delete.
grant select, insert, update on public.bes_class_rosters to authenticated;
revoke delete on public.bes_class_rosters from authenticated;

-- Seed one canonical roster per existing Gradebook class. If several gradebooks map to
-- the same roster, the most recently updated one wins. Only minimal roster fields are copied.
do $$
begin
  if to_regclass('public.bes_gradebook_workspaces') is not null then
    insert into public.bes_class_rosters (
      roster_key,
      department_id,
      class_name,
      school_year,
      grade,
      students,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    select distinct on (source.roster_key)
      source.roster_key,
      source.department_id,
      source.class_name,
      source.school_year,
      source.grade,
      source.students,
      source.owner_id,
      source.owner_id,
      source.created_at,
      source.updated_at
    from (
      select
        g.owner_id,
        coalesce(nullif(g.payload #>> '{classProfile,assignmentDepartmentId}', ''), '') as department_id,
        coalesce(nullif(g.class_name, ''), nullif(g.payload #>> '{classProfile,className}', ''), 'Lớp bộ môn') as class_name,
        coalesce(nullif(g.school_year, ''), nullif(g.payload #>> '{classProfile,schoolYear}', ''), 'unknown-year') as school_year,
        coalesce(nullif(g.grade, ''), nullif(g.payload #>> '{classProfile,grade}', ''), '') as grade,
        (
          case
            when coalesce(nullif(g.payload #>> '{classProfile,assignmentDepartmentId}', ''), '') <> ''
              then 'department:' || lower(trim(g.payload #>> '{classProfile,assignmentDepartmentId}'))
            else 'owner:' || lower(g.owner_id::text)
          end
          || '||' || lower(trim(coalesce(nullif(g.school_year, ''), nullif(g.payload #>> '{classProfile,schoolYear}', ''), 'unknown-year')))
          || '||' || lower(trim(coalesce(nullif(g.class_name, ''), nullif(g.payload #>> '{classProfile,className}', ''), 'Lớp bộ môn')))
        ) as roster_key,
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'rosterStudentId', coalesce(nullif(student ->> 'rosterStudentId', ''), nullif(student ->> 'id', ''), md5(student::text)),
              'code', coalesce(student ->> 'code', ''),
              'fullName', coalesce(student ->> 'fullName', ''),
              'birthDate', coalesce(student ->> 'birthDate', ''),
              'gender', coalesce(student ->> 'gender', ''),
              'active', coalesce((student ->> 'active')::boolean, true),
              'archivedAt', coalesce(student ->> 'archivedAt', ''),
              'archivedReason', coalesce(student ->> 'archivedReason', '')
            )
          )
          from jsonb_array_elements(
            case
              when jsonb_typeof(g.payload -> 'students') = 'array' then g.payload -> 'students'
              else '[]'::jsonb
            end
          ) as student
        ), '[]'::jsonb) as students,
        g.created_at,
        g.updated_at
      from public.bes_gradebook_workspaces g
      where coalesce(g.status, 'active') <> 'archived'
    ) source
    order by source.roster_key, source.updated_at desc
    on conflict (roster_key) do nothing;
  end if;
end
$$;

comment on table public.bes_class_rosters is
  'Shared, subject-independent class roster. Subject notes and score-key student ids stay inside each teacher Gradebook.';
