-- Brian English Studio V11.3.4 — Bulk Work Assignment & Safe Delete
-- Safe to rerun. Existing work items, comments, notifications and uploaded files are preserved.
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
    raise exception 'V11.3.3 Work Assignment Delivery must be installed first';
  end if;
  if to_regprocedure('public.bes_v1133_is_leader(uuid)') is null then
    raise exception 'Missing leader guard from V11.3.3';
  end if;
end
$do$;

-- Bulk assignment uses the existing assignee_ids array and creates one row per teacher.
-- The UI stores batch metadata in work_hub_items.metadata, so no destructive schema change is required.
create index if not exists work_hub_items_assignment_batch_v1134
on public.work_hub_items ((metadata->>'assignment_batch_id'))
where metadata ? 'assignment_batch_id';

-- Only Admin/TTCM/department leaders may delete work items.
drop policy if exists work_hub_items_delete_v1134 on public.work_hub_items;
create policy work_hub_items_delete_v1134 on public.work_hub_items
for delete to authenticated
using (public.bes_v1133_is_leader(auth.uid()));

grant delete on public.work_hub_items to authenticated;

insert into public.bes_schema_registry(component,version,installed_at,metadata) values
('application','11.3.4',now(),jsonb_build_object('release','Bulk Work Assignment & Safe Delete')),
('runtime_core','2.3.4',now(),jsonb_build_object('bulk_assignment',true,'safe_work_delete',true,'notification_sound',true)),
('work_assignment_delivery','11.3.4',now(),jsonb_build_object('individual_tracking',true,'teacher_file_responses',true)),
('work_assignment_bulk','11.3.4',now(),jsonb_build_object('multi_select',true,'whole_department',true,'batch_delete',true))
on conflict(component) do update
set version=excluded.version,installed_at=excluded.installed_at,metadata=excluded.metadata;

commit;
