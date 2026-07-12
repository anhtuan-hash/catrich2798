-- Brian English Studio V10.94.0 preflight (read-only)
select current_database() as database_name, now() as checked_at;
select component, version, installed_at from public.bes_schema_registry order by component;
select to_regclass('public.assessment_items') as assessment_items,
       to_regclass('public.assessment_tests') as assessment_tests,
       to_regclass('public.profiles') as profiles;
select count(*) as assessment_item_count from public.assessment_items;
