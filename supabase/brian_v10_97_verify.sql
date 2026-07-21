-- Brian English Studio V10.97 verification
select component,version,installed_at from public.bes_schema_registry where component in('application','runtime_core','cloud_operations') order by component;
select table_name,
  (select count(*) from information_schema.columns c where c.table_schema='public' and c.table_name=t.table_name) as columns,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.table_name) as rls_policies
from(values('automation_cloud_jobs'),('automation_delivery_log'),('automation_worker_heartbeats'),('automation_digest_preferences'))t(table_name)
order by table_name;
select public.bes_v1097_cloud_status() as cloud_status;
