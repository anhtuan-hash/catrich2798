-- Brian English Studio V11.2.0 verification
select component,version,installed_at from public.bes_schema_registry where component in ('application','runtime_core','connected_teaching_suite','content_ecosystem') order by component;
select t.table_name,
  (select count(*) from information_schema.columns c where c.table_schema='public' and c.table_name=t.table_name) as columns,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.table_name) as rls_policies
from (values('content_ecosystem_assets'),('content_ecosystem_kits'),('content_ecosystem_runs')) as t(table_name)
order by t.table_name;
select public.bes_v1120_is_leader(auth.uid()) as current_user_is_leader;
