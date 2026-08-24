-- Brian Reports 1.1 — reporting deadlines shared by TTCM and department members.
-- Safe to re-run after supabase/brian-monthly-reports.sql.

create table if not exists public.department_monthly_report_settings (
  id uuid primary key default gen_random_uuid(),
  department_head_id uuid not null references public.profiles(id) on delete cascade,
  department_id text not null,
  report_month date not null,
  deadline_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_monthly_report_settings_unique
    unique (department_head_id, department_id, report_month)
);

create index if not exists department_monthly_report_settings_lookup_idx
  on public.department_monthly_report_settings (department_head_id, department_id, report_month desc);

alter table public.department_monthly_report_settings enable row level security;

drop policy if exists "Department members view monthly report settings" on public.department_monthly_report_settings;
create policy "Department members view monthly report settings"
  on public.department_monthly_report_settings
  for select
  using (
    department_head_id = auth.uid()
    or public.bes_monthly_report_membership(department_head_id, department_id, auth.uid())
    or public.is_admin()
  );

drop policy if exists "TTCM manage monthly report settings" on public.department_monthly_report_settings;
create policy "TTCM manage monthly report settings"
  on public.department_monthly_report_settings
  for all
  using (
    department_head_id = auth.uid()
    or public.is_admin()
  )
  with check (
    department_head_id = auth.uid()
    or public.is_admin()
  );

grant select, insert, update, delete on public.department_monthly_report_settings to authenticated;

comment on table public.department_monthly_report_settings is
  'Per-department monthly report settings such as the TTCM submission deadline.';
