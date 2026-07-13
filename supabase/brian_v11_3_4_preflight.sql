-- Brian English Studio V11.3.4 — Bulk Work Assignment & Safe Delete preflight
select component,version,installed_at
from public.bes_schema_registry
where component in ('application','runtime_core','work_assignment_delivery','work_assignment_bulk')
order by component;

select
  to_regclass('public.work_hub_items') as work_items,
  to_regclass('public.work_hub_comments') as work_comments,
  to_regclass('public.work_hub_notifications') as work_notifications,
  to_regprocedure('public.bes_v1133_is_leader(uuid)') as leader_guard;

select column_name,data_type
from information_schema.columns
where table_schema='public'
  and table_name='work_hub_items'
  and column_name in ('assignee_ids','metadata','created_by','owner_id')
order by column_name;
