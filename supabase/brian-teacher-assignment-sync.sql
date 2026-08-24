-- Brian Team assignment synchronization 1.0
-- Purpose: every assignment made by TTCM is materialized for each assigned teacher account.
-- Safe to re-run. Run after supabase/brian-team.sql and supabase/brian-monthly-reports.sql.

create table if not exists public.department_teacher_sync (
  department_head_id uuid not null references public.profiles(id) on delete cascade,
  department_id text not null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  department_name text not null default '',
  department_short_name text not null default '',
  member jsonb not null default '{}'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  document_requirements jsonb not null default '[]'::jsonb,
  absences jsonb not null default '[]'::jsonb,
  evaluations jsonb not null default '[]'::jsonb,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (department_head_id, department_id, teacher_id)
);

create index if not exists department_teacher_sync_teacher_idx
  on public.department_teacher_sync (teacher_id, department_id);
create index if not exists department_teacher_sync_head_idx
  on public.department_teacher_sync (department_head_id, department_id);

alter table public.department_teacher_sync enable row level security;

drop policy if exists "Teachers read their synchronized Brian assignments" on public.department_teacher_sync;
create policy "Teachers read their synchronized Brian assignments"
  on public.department_teacher_sync
  for select
  using (
    teacher_id = auth.uid()
    or department_head_id = auth.uid()
    or public.is_admin()
  );

-- The materialized rows are written only by the security-definer trigger below.
revoke insert, update, delete on public.department_teacher_sync from authenticated;
grant select on public.department_teacher_sync to authenticated;

create or replace function public.bes_sync_department_teacher_rows(
  p_owner_id uuid,
  p_payload jsonb,
  p_source_updated_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.department_teacher_sync
  where department_head_id = p_owner_id;

  insert into public.department_teacher_sync (
    department_head_id,
    department_id,
    teacher_id,
    department_name,
    department_short_name,
    member,
    assignments,
    document_requirements,
    absences,
    evaluations,
    source_updated_at,
    synced_at
  )
  select
    p_owner_id,
    d ->> 'id',
    p.id,
    coalesce(nullif(d ->> 'name', ''), 'Tổ chuyên môn'),
    coalesce(nullif(d ->> 'shortName', ''), nullif(d ->> 'name', ''), 'Tổ'),
    m,
    coalesce((
      select jsonb_agg(a order by coalesce(a ->> 'dueDate', ''), coalesce(a ->> 'title', ''))
      from jsonb_array_elements(coalesce(d -> 'assignments', '[]'::jsonb)) a
      where exists (
        select 1
        from jsonb_array_elements_text(coalesce(a -> 'assigneeIds', '[]'::jsonb)) assignee_id
        where assignee_id = m ->> 'id'
      )
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(doc order by coalesce(doc ->> 'dueDate', ''), coalesce(doc ->> 'title', ''))
      from jsonb_array_elements(coalesce(d -> 'documentRequirements', '[]'::jsonb)) doc
      where doc ->> 'memberId' = m ->> 'id'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(entry order by coalesce(entry ->> 'date', ''))
      from jsonb_array_elements(coalesce(d -> 'absences', '[]'::jsonb)) entry
      where entry ->> 'memberId' = m ->> 'id'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(entry order by coalesce(entry ->> 'date', ''))
      from jsonb_array_elements(coalesce(d -> 'evaluations', '[]'::jsonb)) entry
      where entry ->> 'memberId' = m ->> 'id'
    ), '[]'::jsonb),
    p_source_updated_at,
    now()
  from jsonb_array_elements(coalesce(p_payload -> 'departments', '[]'::jsonb)) d
  cross join lateral jsonb_array_elements(coalesce(d -> 'members', '[]'::jsonb)) m
  join public.profiles p
    on p.id::text = m ->> 'teacherAccountId'
  where coalesce(d ->> 'id', '') <> ''
  on conflict (department_head_id, department_id, teacher_id)
  do update set
    department_name = excluded.department_name,
    department_short_name = excluded.department_short_name,
    member = excluded.member,
    assignments = excluded.assignments,
    document_requirements = excluded.document_requirements,
    absences = excluded.absences,
    evaluations = excluded.evaluations,
    source_updated_at = excluded.source_updated_at,
    synced_at = now();
end;
$$;

create or replace function public.bes_department_workspace_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.department_teacher_sync where department_head_id = old.owner_id;
    return old;
  end if;

  perform public.bes_sync_department_teacher_rows(
    new.owner_id,
    new.payload,
    coalesce(new.updated_at, now())
  );
  return new;
end;
$$;

drop trigger if exists bes_department_workspace_sync on public.department_team_workspaces;
create trigger bes_department_workspace_sync
after insert or update of payload or delete
on public.department_team_workspaces
for each row execute function public.bes_department_workspace_sync_trigger();

-- Backfill every assignment already stored before this migration was installed.
do $$
declare
  row_data record;
begin
  for row_data in
    select owner_id, payload, updated_at
    from public.department_team_workspaces
  loop
    perform public.bes_sync_department_teacher_rows(
      row_data.owner_id,
      row_data.payload,
      row_data.updated_at
    );
  end loop;
end $$;

-- One RPC gives every teacher all synchronized assignments that belong to their account.
create or replace function public.bes_my_brian_assignments()
returns table (
  department_head_id uuid,
  department_id text,
  department_name text,
  department_short_name text,
  teacher_account_id uuid,
  member jsonb,
  assignments jsonb,
  document_requirements jsonb,
  absences jsonb,
  evaluations jsonb,
  synced_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.department_head_id,
    s.department_id,
    s.department_name,
    s.department_short_name,
    s.teacher_id,
    s.member,
    s.assignments,
    s.document_requirements,
    s.absences,
    s.evaluations,
    s.synced_at
  from public.department_teacher_sync s
  where s.teacher_id = auth.uid()
  order by lower(s.department_name), s.department_id;
$$;

grant execute on function public.bes_my_brian_assignments() to authenticated;

-- Monthly Reports now reads the synchronized assignment snapshot. This ensures the class list,
-- homeroom class and other TTCM assignments are identical on every assigned teacher account.
create or replace function public.bes_monthly_report_context()
returns table (
  department_head_id uuid,
  department_id text,
  department_name text,
  department_short_name text,
  teacher_account_id uuid,
  member jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.department_head_id,
    s.department_id,
    s.department_name,
    s.department_short_name,
    s.teacher_id,
    s.member || jsonb_build_object(
      'assignedTasks', s.assignments,
      'documentRequirements', s.document_requirements,
      'syncedAt', s.synced_at
    )
  from public.department_teacher_sync s
  where s.teacher_id = auth.uid()
  order by lower(s.department_name), s.department_id;
$$;

grant execute on function public.bes_monthly_report_context() to authenticated;

-- Membership checks use the synchronized source of truth as well.
create or replace function public.bes_monthly_report_membership(
  p_department_head_id uuid,
  p_department_id text,
  p_teacher_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.department_teacher_sync s
    where s.department_head_id = p_department_head_id
      and s.department_id = p_department_id
      and s.teacher_id = p_teacher_id
  );
$$;

grant execute on function public.bes_monthly_report_membership(uuid, text, uuid) to authenticated;

comment on table public.department_teacher_sync is
  'Materialized per-teacher Brian Team assignments. Automatically rebuilt whenever a TTCM workspace changes.';
comment on function public.bes_my_brian_assignments() is
  'Returns all Brian Team class/member/task/document assignments synchronized to the authenticated teacher.';
