-- Brian Reports 1.0 verification — read-only.
-- Run after supabase/brian-monthly-reports.sql.

select
  to_regclass('public.department_monthly_reports') is not null as has_monthly_reports_table,
  to_regprocedure('public.bes_monthly_report_context()') is not null as has_context_rpc,
  to_regprocedure('public.bes_monthly_report_membership(uuid,text,uuid)') is not null as has_membership_rpc;

select
  c.relrowsecurity as row_level_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'department_monthly_reports';

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'department_monthly_reports'
order by policyname;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.department_monthly_reports'::regclass
order by conname;

select
  case
    when to_regclass('public.department_monthly_reports') is null then 'BLOCKED: monthly report table is missing'
    when to_regprocedure('public.bes_monthly_report_context()') is null then 'BLOCKED: context RPC is missing'
    when to_regprocedure('public.bes_monthly_report_membership(uuid,text,uuid)') is null then 'BLOCKED: membership RPC is missing'
    when not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'department_monthly_reports'
        and c.relrowsecurity
    ) then 'BLOCKED: RLS is not enabled'
    else 'READY: Brian monthly reports database objects are installed'
  end as brian_reports_verification;
