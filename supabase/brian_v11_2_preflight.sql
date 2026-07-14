-- Brian English Studio V11.2.0 preflight (read-only)
select 'bes_schema_registry' as object,to_regclass('public.bes_schema_registry') is not null as available;
select component,version,installed_at from public.bes_schema_registry where component in ('application','runtime_core','connected_teaching_suite','classroom_delivery') order by component;
select current_database() as database_name,current_user as database_role,now() as checked_at;
