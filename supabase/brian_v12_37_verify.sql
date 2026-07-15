-- V12.37.0 verification
select to_regclass('public.ai_governance_settings') as settings_table,
       to_regclass('public.ai_governance_events') as events_table,
       to_regclass('public.ai_governance_daily') as daily_table;
select proname
from pg_proc join pg_namespace n on n.oid = pronamespace
where n.nspname='public' and proname in (
  'bes_v1237_is_ai_admin',
  'bes_v1237_save_ai_governance_settings',
  'bes_v1237_get_ai_governance_settings',
  'bes_v1237_ingest_ai_events',
  'bes_v1237_get_ai_governance_dashboard'
)
order by proname;
select scope, settings->>'schemaVersion' as schema_version, updated_at
from public.ai_governance_settings
where scope='global';
