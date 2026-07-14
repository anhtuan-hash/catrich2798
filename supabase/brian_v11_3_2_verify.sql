-- Brian English Studio V11.3.2 — App Visibility verification
select component,version,installed_at
from public.bes_schema_registry
where component in ('application','runtime_core','app_visibility')
order by component;

select
  to_regclass('public.app_visibility_settings') as visibility_table,
  (select count(*) from pg_policies where schemaname='public' and tablename='app_visibility_settings') as rls_policies,
  exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='app_visibility_settings'
  ) as realtime_enabled;

-- SQL Editor normally has no website auth.uid(), so use the real Admin UUID for a meaningful role test.
select public.bes_v1132_is_admin(auth.uid()) as current_sql_session_is_admin;
