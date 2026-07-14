-- Brian English Studio V10.96.0 verification
select component,version,installed_at,metadata
from public.bes_schema_registry
where component in('application','runtime_core','automation_center')
order by component;

select
  to_regclass('public.automation_rules') is not null as automation_rules_ready,
  to_regclass('public.automation_runs') is not null as automation_runs_ready,
  to_regclass('public.automation_events') is not null as automation_events_ready,
  (select count(*) from pg_policies where schemaname='public' and tablename in('automation_rules','automation_runs','automation_events')) as policy_count,
  now() as verified_at;
