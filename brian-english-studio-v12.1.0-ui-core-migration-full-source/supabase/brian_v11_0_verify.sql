-- Brian English Studio V11.0.0 verification
select component,version,installed_at from public.bes_schema_registry where component in ('application','runtime_core','connected_teaching_suite') order by component;
select table_name,
  (select count(*) from information_schema.columns c where c.table_schema='public' and c.table_name=t.table_name) as columns,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.table_name) as rls_policies
from (values ('lesson_packs'),('lesson_pack_items')) as t(table_name)
order by table_name;
select public.bes_v1100_is_leader(auth.uid()) as current_user_is_leader;
