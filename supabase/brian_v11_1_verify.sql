-- Brian English Studio V11.1.0 verification
select component,version,installed_at from public.bes_schema_registry
where component in ('application','runtime_core','connected_teaching_suite','classroom_delivery') order by component;
select t.table_name,
  (select count(*) from information_schema.columns c where c.table_schema='public' and c.table_name=t.table_name) as columns,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.table_name) as rls_policies
from (values('classroom_sessions'),('classroom_teams'),('classroom_participants'),('classroom_responses')) as t(table_name)
order by t.table_name;
select proname from pg_proc join pg_namespace n on n.oid=pronamespace
where n.nspname='public' and proname in ('classroom_join_session','classroom_get_public_state','classroom_submit_response','classroom_ping_participant') order by proname;
