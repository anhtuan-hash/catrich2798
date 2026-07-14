-- Brian English Studio V11.3.3 — Work Assignment Delivery preflight
select
  to_regclass('public.work_hub_items') as work_items,
  to_regclass('public.work_hub_comments') as work_comments,
  to_regclass('public.work_hub_notifications') as work_notifications,
  to_regclass('storage.buckets') as storage_buckets,
  to_regclass('storage.objects') as storage_objects;

select table_name,column_name,data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('work_hub_items','work_hub_comments','work_hub_notifications')
order by table_name,ordinal_position;

select id,name,public,file_size_limit
from storage.buckets
where id='work-hub-submissions';
