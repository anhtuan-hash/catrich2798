-- Brian English Studio V10.96.0 preflight (read only)
select
  current_database() as database_name,
  current_user as database_role,
  to_regclass('public.bes_schema_registry') is not null as has_schema_registry,
  to_regclass('public.automation_rules') is not null as has_automation_rules,
  to_regclass('public.automation_runs') is not null as has_automation_runs,
  to_regclass('public.automation_events') is not null as has_automation_events,
  to_regclass('public.profiles') is not null as has_profiles,
  now() as checked_at;
