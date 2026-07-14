-- Brian English Studio V11.3.4 — Bulk Work Assignment & Safe Delete verification
select component,version,installed_at
from public.bes_schema_registry
where component in ('application','runtime_core','work_assignment_delivery','work_assignment_bulk')
order by component;

select
  to_regclass('public.work_hub_items') as work_items,
  to_regclass('public.work_hub_comments') as work_comments,
  to_regclass('public.work_hub_notifications') as work_notifications,
  to_regprocedure('public.bes_v1133_submit_work_response(uuid,text,jsonb)') as submit_response_rpc;

select schemaname,tablename,policyname,roles,cmd
from pg_policies
where schemaname='public'
  and tablename='work_hub_items'
  and policyname='work_hub_items_delete_v1134';

select
  has_table_privilege('authenticated','public.work_hub_items','DELETE') as authenticated_delete_grant,
  exists(
    select 1 from pg_indexes
    where schemaname='public'
      and tablename='work_hub_items'
      and indexname='work_hub_items_assignment_batch_v1134'
  ) as batch_index_ready;

select event_object_table,trigger_name
from information_schema.triggers
where trigger_schema='public'
  and trigger_name in (
    'bes_v1133_work_item_insert',
    'bes_v1133_work_item_update',
    'bes_v1133_work_comment_insert'
  )
order by event_object_table,trigger_name;
