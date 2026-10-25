-- Sync Doctor v1.4 / Private backup & in-memory rollback rehearsal.
-- Deliberately no student/gradebook update, insert, delete, or restore endpoint.
-- Gradebook only. Homeroom payloads are out of scope until privacy review.
create table if not exists bes_internal.bes_sync_backup_snapshots (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.bes_sync_review_requests(id) on delete cascade,
  workspace_id text not null,
  school_year text not null,
  class_name text not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot)='object'),
  snapshot_hash text not null check (snapshot_hash ~ '^[0-9a-f]{64}$'),
  source_revision timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  rehearsal_at timestamptz,
  rehearsal_ok boolean not null default false
);
create index if not exists bes_sync_backups_expiry_idx on bes_internal.bes_sync_backup_snapshots(expires_at);
alter table bes_internal.bes_sync_backup_snapshots enable row level security;
revoke all on bes_internal.bes_sync_backup_snapshots from public,anon,authenticated;
comment on table bes_internal.bes_sync_backup_snapshots is
  'Private 48-hour gradebook snapshots for an approved, single-student review; no client SELECT access.';

create or replace function public.bes_sync_create_private_backup(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $fn$
declare
 actor uuid:=auth.uid();
 r public.bes_sync_review_requests%rowtype;
 g public.bes_gradebook_workspaces%rowtype;
 c_rev timestamptz;
 preflight jsonb;
 backup_id uuid;
 h text;
 existing bes_internal.bes_sync_backup_snapshots%rowtype;
begin
 if actor is null or not exists (
   select 1 from public.profiles p where p.id=actor and p.role in ('admin','department_head')
    and p.approved is true
 ) then raise exception 'Admin/TTCM permission required' using errcode='42501'; end if;

 select * into r from public.bes_sync_review_requests where id=p_request_id for update;
 if not found then raise exception 'Review not found' using errcode='P0002'; end if;
 if r.status <> 'approved_for_review'
   or r.issue_code <> 'STUDENT_NOT_LINKED'
   or r.source <> 'gradebook'
   or r.reviewer_id is distinct from actor
   or r.requester_id = actor
   or r.source_revision is null or r.canonical_revision is null
   or r.workspace_id='' then
    raise exception 'Approved independent gradebook review required' using errcode='42501';
 end if;

 if (select count(*) from public.bes_gradebook_workspaces target_g
     where target_g.workspace_id=r.workspace_id and target_g.school_year=r.school_year
      and target_g.class_name=r.class_name)<>1 then
   raise exception 'Ambiguous workspace: one target required' using errcode='55000';
 end if;
 -- Lock target before the read-only identity/revision check and snapshot.
 select * into g from public.bes_gradebook_workspaces
  where workspace_id=r.workspace_id and school_year=r.school_year and class_name=r.class_name
  for update;
 if not found or g.updated_at is distinct from r.source_revision then
   raise exception 'Target revision changed; rescan' using errcode='40001'; end if;

 select c.updated_at into c_rev from public.bes_class_rosters c
   where c.roster_key=('class:'||lower(r.school_year)||'||'||lower(r.class_name))
   for share;
 if c_rev is distinct from r.canonical_revision then
   raise exception 'Canonical revision changed; rescan' using errcode='40001'; end if;

 preflight:=public.bes_sync_preview_review(p_request_id);
 if preflight->>'state' <> 'ready_for_manual_review' or
    preflight->>'canExecute' <> 'false' or
    preflight->>'readOnly' <> 'true' then
   raise exception 'Preflight failed; backup denied' using errcode='55000';
 end if;

 if pg_column_size(g.payload) > 131072 then
   raise exception 'Workspace is too large for private snapshot' using errcode='54000'; end if;
 if coalesce(jsonb_typeof(g.payload),'null')<>'object' then
   raise exception 'Unexpected gradebook payload shape' using errcode='22023'; end if;

 h:=encode(sha256(convert_to(g.payload::text,'UTF8')),'hex');
 select * into existing from bes_internal.bes_sync_backup_snapshots b
  where b.request_id=p_request_id for update;
 if found then
   if existing.created_by<>actor or existing.snapshot_hash<>h or existing.source_revision<>g.updated_at
     or existing.expires_at<=now() then
       raise exception 'Existing snapshot is outdated; cannot overwrite' using errcode='40001';
   end if;
   return jsonb_build_object('state','backup_ready','backupId',existing.id,
     'checksum',h,'expiresAt',existing.expires_at,'createdAt',existing.created_at,
     'studentDataExposed',false,'repairEnabled',false,'rollbackEnabled',false);
 end if;

 insert into bes_internal.bes_sync_backup_snapshots(
   request_id,workspace_id,school_year,class_name,snapshot,snapshot_hash,source_revision,created_by)
 values (p_request_id,g.workspace_id,g.school_year,g.class_name,
      g.payload,h,g.updated_at,actor)
 returning id into backup_id;

 return jsonb_build_object('state','backup_ready','backupId',backup_id,'checksum',h,
   'expiresAt',now()+interval '48 hours','studentDataExposed',false,
   'repairEnabled',false,'rollbackEnabled',false);
end
$fn$;

create or replace function public.bes_sync_rehearse_private_restore(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $fn$
declare
 actor uuid:=auth.uid();
 backup bes_internal.bes_sync_backup_snapshots%rowtype;
 r public.bes_sync_review_requests%rowtype;
 g public.bes_gradebook_workspaces%rowtype;
 simulated jsonb;
 restored jsonb;
 students jsonb;
 checksum text;
begin
 if actor is null or not exists(
   select 1 from public.profiles p where p.id=actor and p.approved is true
     and p.role in ('admin','department_head')
 ) then raise exception 'Admin/TTCM permission required' using errcode='42501';end if;

 select * into r from public.bes_sync_review_requests where id=p_request_id;
 if not found or r.status<>'approved_for_review'
    or r.reviewer_id is distinct from actor or r.requester_id=actor
 then raise exception 'Independent approved review required' using errcode='42501';end if;

 select * into backup from bes_internal.bes_sync_backup_snapshots
   where request_id=p_request_id for update;
 if not found then
   return jsonb_build_object('state','missing_backup','restorable',false,'repairEnabled',false);end if;
 if backup.expires_at<=now() then
   return jsonb_build_object('state','backup_expired','restorable',false,'repairEnabled',false);end if;

 select * into g from public.bes_gradebook_workspaces
   where workspace_id=backup.workspace_id and school_year=backup.school_year
     and class_name=backup.class_name for share;
 checksum:=encode(sha256(convert_to(backup.snapshot::text,'UTF8')),'hex');
 if not found or checksum<>backup.snapshot_hash
     or g.updated_at is distinct from backup.source_revision
     or encode(sha256(convert_to(g.payload::text,'UTF8')),'hex')<>checksum then
   return jsonb_build_object('state','source_changed','restorable',false,'repairEnabled',false);end if;

 students:=backup.snapshot->'students';
 if jsonb_typeof(students)<>'array' or jsonb_array_length(students)>600 then
   return jsonb_build_object('state','unsupported_shape','restorable',false,'repairEnabled',false);end if;

 -- Rehearsal is only an in-memory round trip with a synthetic marker;
 -- nothing is appended to persisted gradebook data.
 simulated:=jsonb_set(backup.snapshot,'{students}',
    students||jsonb_build_array(jsonb_build_object('__sync_doctor_simulated',true)),true);
 restored:=jsonb_set(simulated,'{students}',(simulated->'students')-1,true);
 if restored<>backup.snapshot
   or encode(sha256(convert_to(restored::text,'UTF8')),'hex')<>backup.snapshot_hash then
    raise exception 'In-memory rollback mismatch' using errcode='XX001';end if;

 update bes_internal.bes_sync_backup_snapshots
    set rehearsal_at=now(),rehearsal_ok=true where id=backup.id;

 return jsonb_build_object('state','rehearsal_passed','checksum',backup.snapshot_hash,
    'countBefore',jsonb_array_length(students),'countAfterRestore',jsonb_array_length(restored->'students'),
    'expiresAt',backup.expires_at,'studentDataExposed',false,
    'liveRestoreTested',false,'repairEnabled',false,'rollbackEnabled',false);
end
$fn$;

revoke execute on function public.bes_sync_create_private_backup(uuid) from public,anon;
revoke execute on function public.bes_sync_rehearse_private_restore(uuid) from public,anon;
grant execute on function public.bes_sync_create_private_backup(uuid) to authenticated;
grant execute on function public.bes_sync_rehearse_private_restore(uuid) to authenticated;

-- A database-owned job removes expired private copies daily. No REST access.
create or replace function bes_internal.bes_sync_prune_backups()
returns void language sql security definer set search_path=''
as $fn$
 delete from bes_internal.bes_sync_backup_snapshots where expires_at <= now();
$fn$;
revoke execute on function bes_internal.bes_sync_prune_backups() from public,anon,authenticated;
-- The deployment's postgres role owns this scheduled job.
select cron.schedule('bes_sync_backup_prune_v14','15 2 * * *',
  'select bes_internal.bes_sync_prune_backups();');
