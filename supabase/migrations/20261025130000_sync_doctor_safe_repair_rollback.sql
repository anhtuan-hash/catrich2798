-- Sync Doctor final-stage safe one-student repair and conditional rollback.
-- Requires TWO humans: requester authorizes execution / rollback; an independent reviewer executes.
-- All writes to academic records are single-workspace, transactional, revision and checksum locked.
alter table public.bes_sync_review_requests drop constraint if exists bes_sync_review_requests_status_check;
alter table public.bes_sync_review_requests add constraint bes_sync_review_requests_status_check
 check (status in ('submitted','approved_for_review','rejected','stale','cancelled',
                   'execution_authorized','repaired','rollback_authorized','rolled_back'));

alter table public.bes_sync_review_events drop constraint if exists bes_sync_review_events_action_check;
alter table public.bes_sync_review_events add constraint bes_sync_review_events_action_check
 check (action in ('submitted','approved_for_review','rejected','stale','cancelled',
                   'execution_authorized','repaired','rollback_authorized','rolled_back'));

alter table bes_internal.bes_sync_backup_snapshots
  add column if not exists post_checksum text,
  add column if not exists post_revision timestamptz,
  add column if not exists executed_at timestamptz,
  add column if not exists rolled_back_at timestamptz;
alter table public.bes_sync_review_requests
  add column if not exists execution_authorized_by uuid references auth.users(id),
  add column if not exists rollback_authorized_by uuid references auth.users(id);

create or replace function public.bes_sync_authorize_transition(p_request_id uuid, p_action text)
returns text
language plpgsql security definer set search_path=''
as $fn$
declare
 actor uuid:=auth.uid();
 r public.bes_sync_review_requests%rowtype;
 b bes_internal.bes_sync_backup_snapshots%rowtype;
 target public.bes_gradebook_workspaces%rowtype;
 canonical_time timestamptz;
 expected_status text;
 next_status text;
begin
 if actor is null or not exists(select 1 from public.profiles p where p.id=actor
  and p.approved and p.role in ('admin','department_head')) then
    raise exception 'Approved Admin/TTCM required' using errcode='42501'; end if;
 if p_action not in ('execution','rollback') then raise exception 'Invalid transition' using errcode='22023';end if;
 select * into r from public.bes_sync_review_requests where id=p_request_id for update;
 if not found then raise exception 'Request missing' using errcode='P0002';end if;
 if actor<>r.requester_id or actor=r.reviewer_id or r.reviewer_id is null then
   raise exception 'Only the original requester can separately authorize execution/rollback'
      using errcode='42501';end if;
 if r.issue_code<>'STUDENT_NOT_LINKED' or r.source<>'gradebook' then
   raise exception 'Only one-student gradebook links supported' using errcode='55000';end if;
 expected_status:=case when p_action='execution' then 'approved_for_review' else 'repaired' end;
 next_status:=case when p_action='execution' then 'execution_authorized' else 'rollback_authorized' end;
 if r.status<>expected_status then raise exception 'Workflow stage changed' using errcode='55000';end if;
 select * into b from bes_internal.bes_sync_backup_snapshots
 where request_id=r.id for update;
 if not found or b.expires_at<=now() or b.rehearsal_ok is not true then
   raise exception 'Verified nonexpired backup required' using errcode='55000';end if;

 select * into target from public.bes_gradebook_workspaces g where g.workspace_id=r.workspace_id
  and g.school_year=r.school_year and g.class_name=r.class_name for update;
 if not found then raise exception 'Target missing' using errcode='40001';end if;
 if p_action='execution' then
   select c.updated_at into canonical_time from public.bes_class_rosters c
    where c.roster_key='class:'||lower(r.school_year)||'||'||lower(r.class_name) for share;
   if canonical_time is distinct from r.canonical_revision
    or target.updated_at is distinct from r.source_revision
    or encode(sha256(convert_to(target.payload::text,'UTF8')),'hex')<>b.snapshot_hash then
       raise exception 'Source changed: re-run review' using errcode='40001'; end if;
 else
   if b.post_revision is null or b.post_checksum is null
    or target.updated_at is distinct from b.post_revision
    or encode(sha256(convert_to(target.payload::text,'UTF8')),'hex')<>b.post_checksum then
       raise exception 'Post-repair source changed, rollback blocked' using errcode='40001';end if;
 end if;

 update public.bes_sync_review_requests
  set status=next_status,updated_at=now(),
    execution_authorized_by=case when p_action='execution' then actor else execution_authorized_by end,
    rollback_authorized_by=case when p_action='rollback' then actor else rollback_authorized_by end
  where id=r.id;
 insert into public.bes_sync_review_events(request_id,actor_id,action,note)
 values(r.id,actor,next_status,'Separate user approval; does not by itself alter student records');
 return next_status;
end
$fn$;

create or replace function public.bes_sync_execute_one_student(p_request_id uuid)
returns jsonb
language plpgsql security definer set search_path=''
as $fn$
declare
 actor uuid:=auth.uid();
 r public.bes_sync_review_requests%rowtype;
 b bes_internal.bes_sync_backup_snapshots%rowtype;
 g public.bes_gradebook_workspaces%rowtype;
 canonical jsonb; canonical_rev timestamptz;
 item jsonb; selected jsonb; id_key text; cd text;
 seen integer:=0; existing jsonb; proposed jsonb; projection jsonb; after_checksum text;
 new_rev timestamptz; seen_code integer; previous_count integer;
begin
 if actor is null or not exists(select 1 from public.profiles p where p.id=actor
   and p.approved and p.role in ('admin','department_head')) then
   raise exception 'Approved independent reviewer required' using errcode='42501';end if;
 select * into r from public.bes_sync_review_requests where id=p_request_id for update;
 if not found then raise exception 'Review missing' using errcode='P0002';end if;
 if r.status<>'execution_authorized' or r.issue_code<>'STUDENT_NOT_LINKED'
   or r.source<>'gradebook' or r.reviewer_id is distinct from actor
   or r.execution_authorized_by is distinct from r.requester_id
   or r.requester_id=actor then
   raise exception 'Separate requester execution authorization required' using errcode='42501';end if;
 select * into b from bes_internal.bes_sync_backup_snapshots where request_id=r.id for update;
 if not found or b.expires_at<=now() or b.rehearsal_ok is not true
   or b.created_by<>actor or b.post_checksum is not null then
   raise exception 'Original verified reviewer backup required' using errcode='55000';end if;
 select * into g from public.bes_gradebook_workspaces
   where workspace_id=r.workspace_id and school_year=r.school_year and class_name=r.class_name for update;
 if not found or g.updated_at is distinct from r.source_revision
   or encode(sha256(convert_to(g.payload::text,'UTF8')),'hex')<>b.snapshot_hash
   or g.payload is distinct from b.snapshot then
   raise exception 'Academic data changed: abort' using errcode='40001';end if;
 select c.students,c.updated_at into canonical,canonical_rev
   from public.bes_class_rosters c
   where c.roster_key='class:'||lower(r.school_year)||'||'||lower(r.class_name) for share;
 if canonical_rev is distinct from r.canonical_revision
    or jsonb_typeof(canonical)<>'array'
    or jsonb_typeof(g.payload->'students')<>'array'
    or jsonb_array_length(canonical)>600
    or jsonb_array_length(g.payload->'students')>600 then
    raise exception 'Canonical roster changed or unsupported' using errcode='40001';end if;
 existing:=g.payload->'students';
 previous_count:=jsonb_array_length(existing);

 for item in select value from jsonb_array_elements(canonical) s(value) loop
   id_key:=coalesce(nullif(trim(item->>'rosterStudentId'),''),nullif(trim(item->>'id'),''));
   if id_key is not null and
      encode(sha256(convert_to(
        'STUDENT_NOT_LINKED:'||r.school_year||':'||r.class_name||':gradebook:'||
         r.workspace_id||':'||id_key,'UTF8')),'hex')=r.case_hash then
     selected:=item;seen:=seen+1;
   end if;
 end loop;
 if seen<>1 then raise exception 'Student identity not uniquely verified' using errcode='55000';end if;
 id_key:=coalesce(nullif(trim(selected->>'rosterStudentId'),''),nullif(trim(selected->>'id'),''));
 cd:=lower(trim(coalesce(selected->>'code','')));
 if id_key is null or length(id_key)>160 or
   selected->>'active'='false' or
   lower(coalesce(selected->>'lifecycleStatus','')) in ('deleted','archived','transferred')
   or coalesce(selected->>'archivedAt','')<>'' or coalesce(selected->>'deletedAt','')<>'' then
   raise exception 'Student is not safe to add' using errcode='55000';end if;
 if cd<>'' then
   select count(*) into seen_code from jsonb_array_elements(canonical) s(value)
    where lower(trim(coalesce(s.value->>'code','')))=cd;
   if seen_code<>1 then raise exception 'Canonical student code collision' using errcode='55000';end if;
 end if;
 if exists(select 1 from jsonb_array_elements(existing) s(value)
   where coalesce(s.value->>'rosterStudentId',s.value->>'id','')=id_key
    or s.value->>'id'=id_key
    or (cd<>'' and lower(trim(coalesce(s.value->>'code','')))=cd)
    or (coalesce(s.value->>'fullName','')=coalesce(selected->>'fullName','')
      and coalesce(s.value->>'birthDate','')=coalesce(selected->>'birthDate','')
      and coalesce(s.value->>'gender','')=coalesce(selected->>'gender',''))) then
   raise exception 'Possible duplicate or legacy student: do not add' using errcode='55000';end if;

 projection:=jsonb_build_object(
   'id',id_key, 'rosterStudentId',id_key,
   'rosterPersonKey',coalesce(selected->>'rosterPersonKey',''),
   'code',coalesce(selected->>'code',''),
   'fullName',coalesce(selected->>'fullName',''),
   'birthDate',coalesce(selected->>'birthDate',''),
   'gender',coalesce(selected->>'gender',''),
   'className',r.class_name,'active',true,'notes',''
 );
 if projection->>'fullName'='' and projection->>'code'='' then
   raise exception 'No display identity' using errcode='55000';end if;
 proposed:=jsonb_set(g.payload,'{students}',existing||jsonb_build_array(projection),false);
 if jsonb_array_length(proposed->'students')<>previous_count+1
   or (proposed->'students')-previous_count<>existing or
   (proposed-'students')<>(g.payload-'students') then
   raise exception 'Existing records or score maps changed' using errcode='XX001';end if;

 new_rev:=clock_timestamp();
 update public.bes_gradebook_workspaces
   set payload=proposed,student_count=previous_count+1,updated_at=new_rev
   where owner_id=g.owner_id and workspace_id=g.workspace_id;
 if not found then raise exception 'Academic write not completed' using errcode='40001';end if;
 after_checksum:=encode(sha256(convert_to(proposed::text,'UTF8')),'hex');
 update bes_internal.bes_sync_backup_snapshots set
   post_checksum=after_checksum,post_revision=new_rev,executed_at=now()
   where id=b.id;
 update public.bes_sync_review_requests set status='repaired',updated_at=now() where id=r.id;
 insert into public.bes_sync_review_events(request_id,actor_id,action,note)
 values(r.id,actor,'repaired','Single-student append checked, preexisting grade data unchanged');
 return jsonb_build_object('state','repaired','studentsBefore',previous_count,
  'studentsAfter',previous_count+1,'rollbackAvailableUntil',b.expires_at,
  'requestId',r.id,'academicDataChanged',true);
end
$fn$;

create or replace function public.bes_sync_restore_single_link(p_request_id uuid)
returns jsonb
language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid();
 r public.bes_sync_review_requests%rowtype;
 b bes_internal.bes_sync_backup_snapshots%rowtype;
 g public.bes_gradebook_workspaces%rowtype;
 rev timestamptz; before_count integer;
begin
 if actor is null or not exists(select 1 from public.profiles p where p.id=actor
   and p.approved and p.role in ('admin','department_head')) then
    raise exception 'Approved Admin/TTCM required' using errcode='42501';end if;
 select * into r from public.bes_sync_review_requests where id=p_request_id for update;
 if not found or r.status<>'rollback_authorized' or r.reviewer_id is distinct from actor
  or r.rollback_authorized_by is distinct from r.requester_id or r.requester_id=actor then
    raise exception 'Independent rollback authorization required' using errcode='42501';end if;
 select * into b from bes_internal.bes_sync_backup_snapshots
  where request_id=r.id for update;
 if not found or b.expires_at<=now() or b.post_checksum is null
   or b.post_revision is null or b.rolled_back_at is not null
   or b.created_by<>actor or b.rehearsal_ok is not true then
   raise exception 'Verified live restore snapshot unavailable' using errcode='55000';end if;
 select * into g from public.bes_gradebook_workspaces
  where workspace_id=b.workspace_id and school_year=b.school_year
    and class_name=b.class_name for update;
 if not found or g.updated_at is distinct from b.post_revision
   or encode(sha256(convert_to(g.payload::text,'UTF8')),'hex')<>b.post_checksum then
    raise exception 'Concurrent academic changes detected. Live rollback blocked' using errcode='40001';end if;
 if encode(sha256(convert_to(b.snapshot::text,'UTF8')),'hex')<>b.snapshot_hash or
    jsonb_typeof(b.snapshot->'students')<>'array' then
    raise exception 'Backup integrity mismatch' using errcode='XX001';end if;
 before_count:=jsonb_array_length(b.snapshot->'students');
 rev:=clock_timestamp();
 update public.bes_gradebook_workspaces
  set payload=b.snapshot,student_count=before_count,updated_at=rev
  where owner_id=g.owner_id and workspace_id=g.workspace_id;
 update bes_internal.bes_sync_backup_snapshots set rolled_back_at=now() where id=b.id;
 update public.bes_sync_review_requests set status='rolled_back',updated_at=now() where id=r.id;
 insert into public.bes_sync_review_events(request_id,actor_id,action,note)
 values(r.id,actor,'rolled_back','Exact private snapshot restored after post-write revision and hash checks');
 return jsonb_build_object('state','rolled_back','restoredStudents',before_count,'requestId',r.id);
end
$fn$;

revoke execute on function public.bes_sync_authorize_transition(uuid,text) from public,anon;
revoke execute on function public.bes_sync_execute_one_student(uuid) from public,anon;
revoke execute on function public.bes_sync_restore_single_link(uuid) from public,anon;
grant execute on function public.bes_sync_authorize_transition(uuid,text) to authenticated;
grant execute on function public.bes_sync_execute_one_student(uuid) to authenticated;
grant execute on function public.bes_sync_restore_single_link(uuid) to authenticated;
