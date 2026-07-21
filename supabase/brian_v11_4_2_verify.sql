-- Brian English Studio V11.4.2 verification
select
  to_regclass('public.bes_lesson_integration_projects') is not null as table_ready,
  (select relrowsecurity from pg_class where oid='public.bes_lesson_integration_projects'::regclass) as rls_enabled,
  (select count(*) from pg_policies where schemaname='public' and tablename='bes_lesson_integration_projects') >= 4 as policies_ready,
  to_regprocedure('public.bes_v1142_is_lesson_integration_leader(uuid)') is not null as leader_helper_ready;
