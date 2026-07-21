-- Brian English Studio V11.3.5 — Work Submission Archive verification
select component,version,installed_at
from public.bes_schema_registry
where component in (
  'application','runtime_core','work_assignment_delivery','work_assignment_bulk','work_submission_archive'
)
order by component;

select
  to_regclass('public.work_hub_comments') as work_comments,
  to_regclass('public.resource_items') as resource_items,
  to_regclass('public.resource_drive_connections') as drive_connections,
  to_regclass('public.resource_activity_logs') as resource_logs,
  to_regprocedure('public.bes_v1133_is_leader(uuid)') as leader_guard;

select indexname,indexdef
from pg_indexes
where schemaname='public'
  and indexname='work_hub_comments_resource_archive_v1135';

select id,name,public,file_size_limit
from storage.buckets
where id='work-hub-submissions';

select count(*) as active_drive_connections
from public.resource_drive_connections
where is_active=true;
