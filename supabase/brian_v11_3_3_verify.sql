-- Brian English Studio V11.3.3 — Work Assignment Delivery verification
select component,version,installed_at
from public.bes_schema_registry
where component in ('application','runtime_core','work_assignment_delivery')
order by component;

select
  to_regclass('public.work_hub_items') as work_items,
  to_regclass('public.work_hub_comments') as work_comments,
  to_regclass('public.work_hub_notifications') as work_notifications,
  to_regprocedure('public.bes_v1133_submit_work_response(uuid,text,jsonb)') as submit_response_rpc;

select id,name,public,file_size_limit
from storage.buckets
where id='work-hub-submissions';

select table_schema,table_name,count(*) as rls_policies
from information_schema.tables t
join pg_policies p on p.schemaname=t.table_schema and p.tablename=t.table_name
where (t.table_schema='public' and t.table_name in ('work_hub_items','work_hub_comments','work_hub_notifications'))
   or (t.table_schema='storage' and t.table_name='objects' and p.policyname like 'work_hub_files_%_v1133')
group by table_schema,table_name
order by table_schema,table_name;

select event_object_table,trigger_name
from information_schema.triggers
where trigger_schema='public'
  and trigger_name in ('bes_v1133_work_item_insert','bes_v1133_work_item_update','bes_v1133_work_comment_insert')
order by event_object_table,trigger_name;
