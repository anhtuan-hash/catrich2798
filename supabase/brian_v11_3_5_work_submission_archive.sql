-- Brian English Studio V11.3.5 — Archive teacher submissions to Resource Library
-- Safe to rerun. No work files or learning resources are deleted.
begin;

create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

do $do$
begin
  if to_regclass('public.work_hub_items') is null then
    raise exception 'Missing public.work_hub_items. Install V11.3.3 first.';
  end if;
  if to_regclass('public.work_hub_comments') is null then
    raise exception 'Missing public.work_hub_comments. Install V11.3.3 first.';
  end if;
  if to_regclass('public.resource_items') is null then
    raise exception 'Missing public.resource_items. Install Resource Library SQL first.';
  end if;
  if to_regclass('public.resource_drive_connections') is null then
    raise exception 'Missing public.resource_drive_connections. Configure Resource Library first.';
  end if;
  if to_regprocedure('public.bes_v1133_is_leader(uuid)') is null then
    raise exception 'Missing V11.3.3 leader guard.';
  end if;
end
$do$;

-- The archive link is stored inside each attachment JSON object. This GIN index
-- keeps future searches and audits efficient without changing existing rows.
create index if not exists work_hub_comments_resource_archive_v1135
on public.work_hub_comments using gin (attachments jsonb_path_ops);

insert into public.bes_schema_registry(component,version,installed_at,metadata) values
('application','11.3.5',now(),jsonb_build_object('release','Work Submission Archive to Resource Library')),
('runtime_core','2.3.5',now(),jsonb_build_object('work_submission_resource_archive',true,'notification_sound',true,'safe_work_delete',true)),
('work_assignment_delivery','11.3.5',now(),jsonb_build_object('teacher_file_responses',true,'resource_archive',true)),
('work_assignment_bulk','11.3.5',now(),jsonb_build_object('multi_select',true,'whole_department',true,'batch_delete',true)),
('work_submission_archive','11.3.5',now(),jsonb_build_object(
  'source_bucket','work-hub-submissions',
  'target','resource_items + Google Drive',
  'leader_only',true,
  'auto_approve',true,
  'duplicate_protection','sha256'
))
on conflict(component) do update
set version=excluded.version,installed_at=excluded.installed_at,metadata=excluded.metadata;

commit;
