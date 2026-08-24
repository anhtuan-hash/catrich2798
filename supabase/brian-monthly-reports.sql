-- Brian Reports 1.0 — monthly teacher reporting workflow for Brian Team.
-- Safe to re-run. Requires the existing public.profiles, public.department_team_workspaces
-- and public.is_admin() objects used by supabase/brian-team.sql.

create table if not exists public.department_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  department_head_id uuid not null references public.profiles(id) on delete cascade,
  department_id text not null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  report_month date not null,
  school_year text not null default '',
  status text not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  reviewer_comment text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_monthly_reports_status_check
    check (status in ('draft', 'submitted', 'revision', 'approved')),
  constraint department_monthly_reports_unique_month
    unique (department_head_id, department_id, teacher_id, report_month)
);

create index if not exists department_monthly_reports_head_month_idx
  on public.department_monthly_reports (department_head_id, department_id, report_month desc);

create index if not exists department_monthly_reports_teacher_month_idx
  on public.department_monthly_reports (teacher_id, report_month desc);

-- Verify that a teacher is currently listed in the selected Brian Team department.
-- Membership is resolved from the TTCM-owned JSON workspace so teachers cannot route a report
-- to an arbitrary account or department by changing client-side values.
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
    from public.department_team_workspaces w
    cross join lateral jsonb_array_elements(coalesce(w.payload -> 'departments', '[]'::jsonb)) d
    cross join lateral jsonb_array_elements(coalesce(d -> 'members', '[]'::jsonb)) m
    where w.owner_id = p_department_head_id
      and d ->> 'id' = p_department_id
      and m ->> 'teacherAccountId' = p_teacher_id::text
  );
$$;

-- Return the current teacher's valid reporting destination(s), together with the Brian Team
-- member record. Text comparison avoids unsafe UUID casts in legacy JSON records.
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
    w.owner_id as department_head_id,
    d ->> 'id' as department_id,
    coalesce(nullif(d ->> 'name', ''), 'Tổ chuyên môn') as department_name,
    coalesce(nullif(d ->> 'shortName', ''), nullif(d ->> 'name', ''), 'Tổ') as department_short_name,
    auth.uid() as teacher_account_id,
    m as member
  from public.department_team_workspaces w
  cross join lateral jsonb_array_elements(coalesce(w.payload -> 'departments', '[]'::jsonb)) d
  cross join lateral jsonb_array_elements(coalesce(d -> 'members', '[]'::jsonb)) m
  where m ->> 'teacherAccountId' = auth.uid()::text
  order by lower(coalesce(d ->> 'name', ''));
$$;

alter table public.department_monthly_reports enable row level security;

drop policy if exists "Monthly reports visible to teacher and TTCM" on public.department_monthly_reports;
create policy "Monthly reports visible to teacher and TTCM"
  on public.department_monthly_reports
  for select
  using (
    teacher_id = auth.uid()
    or (department_head_id = auth.uid() and status <> 'draft')
    or public.is_admin()
  );

drop policy if exists "Teachers create their monthly reports" on public.department_monthly_reports;
create policy "Teachers create their monthly reports"
  on public.department_monthly_reports
  for insert
  with check (
    (
      teacher_id = auth.uid()
      and status in ('draft', 'submitted')
      and public.bes_monthly_report_membership(department_head_id, department_id, auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists "Teachers and TTCM update monthly reports" on public.department_monthly_reports;
create policy "Teachers and TTCM update monthly reports"
  on public.department_monthly_reports
  for update
  using (
    (teacher_id = auth.uid() and status in ('draft', 'revision'))
    or department_head_id = auth.uid()
    or public.is_admin()
  )
  with check (
    (
      teacher_id = auth.uid()
      and status in ('draft', 'revision', 'submitted')
      and public.bes_monthly_report_membership(department_head_id, department_id, auth.uid())
    )
    or department_head_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "Teachers delete draft monthly reports" on public.department_monthly_reports;
create policy "Teachers delete draft monthly reports"
  on public.department_monthly_reports
  for delete
  using (
    (teacher_id = auth.uid() and status = 'draft')
    or department_head_id = auth.uid()
    or public.is_admin()
  );

grant select, insert, update, delete on public.department_monthly_reports to authenticated;
grant execute on function public.bes_monthly_report_membership(uuid, text, uuid) to authenticated;
grant execute on function public.bes_monthly_report_context() to authenticated;

comment on table public.department_monthly_reports is
  'Structured monthly reports submitted by teachers to their Brian Team department head, with draft/submitted/revision/approved workflow.';
comment on function public.bes_monthly_report_context() is
  'Returns the authenticated teacher current Brian Team membership(s) used as trusted monthly-report routing context.';
