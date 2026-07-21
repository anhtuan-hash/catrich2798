-- Brian English Studio V11.1.0 preflight (read-only)
select component,version,installed_at from public.bes_schema_registry
where component in ('application','runtime_core','connected_teaching_suite') order by component;
select to_regclass('public.lesson_packs') as lesson_packs,
       to_regclass('public.lesson_pack_items') as lesson_pack_items,
       exists(select 1 from pg_extension where extname='pgcrypto') as pgcrypto_ready;
