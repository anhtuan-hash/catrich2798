-- V10.93 preflight: read-only checks.
select current_database() as database_name, current_user as database_role, now() as checked_at;
select to_regclass('public.profiles') as profiles,
       to_regclass('public.resource_items') as resource_items,
       to_regclass('public.work_hub_items') as work_hub_items,
       to_regclass('public.resource_smart_metadata') as smart_metadata;
select table_name,column_name,data_type
from information_schema.columns
where table_schema='public' and table_name in ('profiles','resource_items','work_hub_items','resource_collections')
order by table_name,ordinal_position;
