-- Brian English Studio V11.0.0 preflight (read only)
select 'application' as check_name, coalesce((select version from public.bes_schema_registry where component='application'),'missing') as value
union all select 'runtime_core', coalesce((select version from public.bes_schema_registry where component='runtime_core'),'missing')
union all select 'system_roles', case when to_regclass('public.system_roles') is not null then 'ready' else 'missing' end
union all select 'lesson_packs', case when to_regclass('public.lesson_packs') is not null then 'upgrade' else 'create' end
union all select 'lesson_pack_items', case when to_regclass('public.lesson_pack_items') is not null then 'upgrade' else 'create' end;
