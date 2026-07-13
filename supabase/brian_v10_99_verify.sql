-- Brian English Studio V10.99.0 verification
select component,version,installed_at from public.bes_schema_registry where component in ('application','runtime_core','production_hardening') order by component;
select to_regclass('public.system_roles') as system_roles,
       to_regclass('public.api_security_events') as api_security_events,
       to_regclass('public.api_rate_limits') as api_rate_limits;
select proname from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in ('bes_v1099_current_role','bes_v1099_consume_ai_quota','bes_v1099_create_snapshot','bes_v1099_restore_snapshot') order by proname;
select public.bes_v1099_current_role(auth.uid()) as current_role,
       public.bes_v1099_is_leader(auth.uid()) as current_user_is_leader;
