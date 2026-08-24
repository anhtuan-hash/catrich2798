-- Brian Reports 1.0 preflight — read-only.
-- Run before supabase/brian-monthly-reports.sql.

select
  to_regclass('public.profiles') is not null as has_profiles,
  to_regclass('public.department_team_workspaces') is not null as has_department_team_workspaces,
  to_regprocedure('public.is_admin()') is not null as has_is_admin;

select
  case
    when to_regclass('public.profiles') is null then 'BLOCKED: public.profiles is missing'
    when to_regclass('public.department_team_workspaces') is null then 'BLOCKED: Brian Team workspace is missing'
    when to_regprocedure('public.is_admin()') is null then 'BLOCKED: public.is_admin() is missing'
    else 'READY: monthly reports migration dependencies are present'
  end as brian_reports_preflight;
