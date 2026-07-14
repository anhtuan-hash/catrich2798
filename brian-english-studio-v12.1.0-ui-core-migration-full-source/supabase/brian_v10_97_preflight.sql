-- Brian English Studio V10.97 preflight (read-only)
select current_database() as database_name, current_user as database_role, now() as checked_at;
select to_regclass('public.automation_rules') as automation_rules,
       to_regclass('public.automation_runs') as automation_runs,
       to_regclass('public.automation_events') as automation_events,
       to_regclass('public.work_hub_notifications') as work_hub_notifications,
       to_regclass('public.content_factory_projects') as content_factory_projects,
       to_regclass('public.bes_schema_registry') as schema_registry;
select extname, extversion from pg_extension where extname in ('pg_cron','pgcrypto');
