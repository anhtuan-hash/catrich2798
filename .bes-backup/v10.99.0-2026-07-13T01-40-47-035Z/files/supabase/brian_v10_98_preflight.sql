-- Brian English Studio V10.98 preflight (read-only)
select current_database() as database_name, current_user as database_role, now() as checked_at;
select component, version, installed_at
from public.bes_schema_registry
where component in ('application','runtime_core','cloud_operations','automation_center')
order by component;
select to_regclass('public.profiles') as profiles,
       to_regclass('public.resource_items') as resource_items,
       to_regclass('public.work_hub_items') as work_hub_items,
       to_regclass('public.assessment_items') as assessment_items,
       to_regclass('public.automation_cloud_jobs') as automation_cloud_jobs;
select extname, extversion from pg_extension where extname in ('pgcrypto','pg_cron');
