-- Brian English Studio V10.99.0 preflight (read only)
select current_database() as database_name, now() as checked_at;
select to_regclass('public.profiles') as profiles,
       to_regclass('public.backup_snapshots') as backup_snapshots,
       to_regclass('public.audit_events') as audit_events,
       to_regclass('public.bes_schema_registry') as schema_registry;
select extname from pg_extension where extname in ('pgcrypto','pg_cron') order by extname;
