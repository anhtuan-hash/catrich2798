-- Brian English Studio V11.3.5 — Work Submission Archive preflight
-- Read-only checks. Safe to rerun.
select
  to_regclass('public.work_hub_items') as work_hub_items,
  to_regclass('public.work_hub_comments') as work_hub_comments,
  to_regclass('public.resource_items') as resource_items,
  to_regclass('public.resource_drive_connections') as resource_drive_connections,
  to_regclass('public.resource_activity_logs') as resource_activity_logs,
  to_regprocedure('public.bes_v1133_is_leader(uuid)') as leader_guard;

select id,name,public,file_size_limit
from storage.buckets
where id='work-hub-submissions';

select component,version
from public.bes_schema_registry
where component in ('application','runtime_core','work_assignment_delivery','work_assignment_bulk')
order by component;
