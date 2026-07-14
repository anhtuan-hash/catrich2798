-- Brian English Studio V11.3.2 — App Visibility preflight (read-only)
select 'auth.users' as object_name, case when to_regclass('auth.users') is not null then 'ready' else 'missing' end as status
union all select 'public.system_roles', case when to_regclass('public.system_roles') is not null then 'ready' else 'optional/fallback' end
union all select 'public.bes_schema_registry', case when to_regclass('public.bes_schema_registry') is not null then 'ready' else 'will be created' end
union all select 'public.app_visibility_settings', case when to_regclass('public.app_visibility_settings') is not null then 'existing/will update' else 'will be created' end;
