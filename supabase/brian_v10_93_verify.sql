-- V10.93 verification after migration.
select component,version,installed_at from public.bes_schema_registry order by component;
select table_name,
       (select count(*) from information_schema.columns c where c.table_schema='public' and c.table_name=t.table_name) as columns,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.table_name) as rls_policies
from (values
  ('ai_workspace_projects'),('ai_workspace_messages'),('content_factory_projects'),
  ('assessment_items'),('assessment_blueprints'),('assessment_tests'),('assessment_test_items')
) as t(table_name)
order by table_name;
select public.bes_v1093_is_leader(auth.uid()) as current_user_is_leader,
       public.bes_v1093_is_approved_user(auth.uid()) as current_user_is_approved;
