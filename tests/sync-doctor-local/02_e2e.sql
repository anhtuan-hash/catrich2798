-- Executed ONLY after 01_bootstrap.sql in a fresh, disposable local PostgreSQL DB.
-- All identities and grades below are invented fixtures. No cloud credentials.
begin;
do $scenario$
declare
  requester uuid:='10000000-0000-4000-8000-000000000001';
  reviewer uuid:='10000000-0000-4000-8000-000000000002';
  teacher uuid:='10000000-0000-4000-8000-000000000003';
  local_request_id uuid;
  old_payload jsonb:='{"students":[{"id":"legacy-100","rosterStudentId":"r-legacy","code":"OLD100","fullName":"Legacy Fixture","notes":"teacher note"}],"scoreMap":{"legacy-100":{"oral":[9.0,8.5],"midterm":8.25}},"attachments":[{"ref":"old-evidence","grade":8}]}'::jsonb;
  current_payload jsonb;
  old_revision timestamptz;
  canonical_revision timestamptz;
  result jsonb;
  event_count integer;
  before_rows integer;
  after_rows integer;
begin
  insert into auth.users(id) values(requester),(reviewer),(teacher);
  insert into public.profiles(id,approved,role) values
    (requester,true,'admin'),(reviewer,true,'admin'),(teacher,true,'teacher');
  insert into public.bes_class_rosters(roster_key,school_year,class_name,students)
  values('class:2026-2027||12.synth','2026-2027','12.SYNTH',
    '[{"rosterStudentId":"r-legacy","code":"OLD100","fullName":"Legacy Fixture","active":true},
      {"rosterStudentId":"new-r101","rosterPersonKey":"code:new101","code":"NEW101",
       "fullName":"Synthetic New Student","birthDate":"2009-09-09","gender":"F","active":true}]'::jsonb)
  returning updated_at into canonical_revision;
  insert into public.bes_gradebook_workspaces(owner_id,workspace_id,school_year,class_name,payload,student_count)
  values(requester,'syn-12','2026-2027','12.SYNTH',old_payload,1)
  returning updated_at into old_revision;
  insert into public.bes_sync_review_requests(
    requester_id,reviewer_id,case_hash,issue_code,source,school_year,class_name,
    workspace_id,source_revision,canonical_revision,status
  ) values(requester,reviewer,
    encode(sha256(convert_to('STUDENT_NOT_LINKED:2026-2027:12.SYNTH:gradebook:syn-12:new-r101','UTF8')),'hex'),
    'STUDENT_NOT_LINKED','gradebook','2026-2027','12.SYNTH','syn-12',
    old_revision,canonical_revision,'approved_for_review'
  ) returning id into local_request_id;

  -- Authorize vs execute are independent people, and teacher has no authority.
  perform set_config('request.jwt.claim.sub',teacher::text,true);
  begin
    perform public.bes_sync_preview_review(local_request_id);
    raise exception 'Ordinary teacher unexpectedly previewed protected case';
  exception when insufficient_privilege then null;end;
  begin
    perform public.bes_sync_create_private_backup(local_request_id);
    raise exception 'Ordinary teacher unexpectedly created backup';
  exception when insufficient_privilege then null;end;

  perform set_config('request.jwt.claim.sub',requester::text,true);
  begin
    perform public.bes_sync_create_private_backup(local_request_id);
    raise exception 'Requester unexpectedly backed up own case';
  exception when insufficient_privilege then null;end;
  begin
    perform public.bes_sync_authorize_transition(local_request_id,'execution');
    raise exception 'Authorized execution without backup';
  exception when sqlstate '55000' then null;end;

  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  -- Negative: a second gradebook with the same workspace/class/year is unsafe.
  begin
    insert into public.bes_gradebook_workspaces(owner_id,workspace_id,school_year,class_name,payload,student_count)
      values(teacher,'syn-12','2026-2027','12.SYNTH',old_payload,1);
    perform public.bes_sync_create_private_backup(local_request_id);
    raise exception 'Ambiguous target was allowed';
  exception when sqlstate '55000' then null;end;

  -- Counter drift must block even if the JSON payload checksum has not changed.
  begin
    update public.bes_gradebook_workspaces set student_count=777
      where owner_id=requester and workspace_id='syn-12';
    perform public.bes_sync_create_private_backup(local_request_id);
    raise exception 'Inconsistent student_count was allowed to create a repair backup';
  exception when sqlstate '55000' then null;end;

  select public.bes_sync_preview_review(local_request_id) into result;
  if result->>'state'<>'ready_for_manual_review'
      or result->>'readOnly'<>'true' or result->>'canExecute'<>'false' then
    raise exception 'Read-only actual SQL preflight invalid: %',result;end if;
  select public.bes_sync_create_private_backup(local_request_id) into result;
  if result->>'state'<>'backup_ready' or result->>'repairEnabled'<>'false' then
    raise exception 'Private backup contract failed: %',result;end if;
  select public.bes_sync_rehearse_private_restore(local_request_id) into result;
  if result->>'state'<>'rehearsal_passed' or result->>'rollbackEnabled'<>'false' then
    raise exception 'In-memory backup rehearsal failed: %',result;end if;

  begin
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Repair executed without second authorization';
  exception when insufficient_privilege then null;end;
  begin
    perform public.bes_sync_authorize_transition(local_request_id,'execution');
    raise exception 'Reviewer was allowed to self-authorize';
  exception when insufficient_privilege then null;end;

  perform set_config('request.jwt.claim.sub',requester::text,true);
  if public.bes_sync_authorize_transition(local_request_id,'execution')<>'execution_authorized' then
    raise exception 'Requester consent failed';end if;
  begin
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Requester executed their own repair';
  exception when insufficient_privilege then null;end;

  perform set_config('request.jwt.claim.sub',reviewer::text,true);

  -- Real SQL negative cases inside nested subtransactions: each mutation rolls back.
  begin
    update public.bes_class_rosters set students=students ||
      jsonb_build_array(students->1) where roster_key='class:2026-2027||12.synth';
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Duplicate canonical roster identity was permitted';
  exception when sqlstate '55000' then null;end;
  begin
    update public.bes_class_rosters set students=jsonb_set(students,'{1,active}','false'::jsonb)
      where roster_key='class:2026-2027||12.synth';
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Inactive candidate was permitted';
  exception when sqlstate '55000' then null;end;
  begin
    update public.bes_class_rosters set students=jsonb_set(students,'{1,code}','"OLD100"'::jsonb)
      where roster_key='class:2026-2027||12.synth';
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Duplicate canonical code was permitted';
  exception when sqlstate '55000' then null;end;
  begin
    update public.bes_gradebook_workspaces
      set payload=jsonb_set(payload,'{scoreMap,legacy-100,midterm}','10'::jsonb,true)
      where owner_id=requester and workspace_id='syn-12';
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Changed gradebook checksum was permitted';
  exception when serialization_failure then null;end;
  begin
    update bes_internal.bes_sync_backup_snapshots
      set expires_at=now()-interval '1 second' where request_id=local_request_id;
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Expired backup was permitted';
  exception when sqlstate '55000' then null;end;
  begin
    update public.bes_gradebook_workspaces set student_count=999
      where owner_id=requester and workspace_id='syn-12';
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Counter drift at execution was permitted';
  exception when serialization_failure then null;end;

  select public.bes_sync_execute_one_student(local_request_id) into result;
  if result->>'state'<>'repaired' then raise exception 'Single student repair failed: %',result;end if;
  select payload,jsonb_array_length(payload->'students') into current_payload,after_rows
    from public.bes_gradebook_workspaces where owner_id=requester and workspace_id='syn-12';
  before_rows:=jsonb_array_length(old_payload->'students');
  if after_rows<>before_rows+1
    or current_payload->'students'->0<>(old_payload->'students'->0)
    or current_payload->'scoreMap'<>old_payload->'scoreMap'
    or current_payload->'attachments'<>old_payload->'attachments'
    or current_payload->'students'->1->>'rosterStudentId'<>'new-r101' then
    raise exception 'Student append touched legacy scores or identifiers';end if;
  begin
    perform public.bes_sync_execute_one_student(local_request_id);
    raise exception 'Duplicate repair not blocked';
  exception when insufficient_privilege then null;end;

  -- Counter drift after a repair must block separately authorizing a rollback.
  begin
    update public.bes_gradebook_workspaces set student_count=1234
      where owner_id=requester and workspace_id='syn-12';
    perform set_config('request.jwt.claim.sub',requester::text,true);
    perform public.bes_sync_authorize_transition(local_request_id,'rollback');
    raise exception 'Inconsistent post-repair student_count was accepted';
  exception when serialization_failure then null;end;
  perform set_config('request.jwt.claim.sub',reviewer::text,true);

  -- Requester must separately authorize actual rollback.
  perform set_config('request.jwt.claim.sub',requester::text,true);
  if public.bes_sync_authorize_transition(local_request_id,'rollback')<>'rollback_authorized' then
    raise exception 'Second-stage rollback consent failed';end if;

  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  -- A changed numeric counter alone is also a concurrent change, even when JSON is unchanged.
  begin
    update public.bes_gradebook_workspaces set student_count=888
      where owner_id=requester and workspace_id='syn-12';
    perform public.bes_sync_restore_single_link(local_request_id);
    raise exception 'Concurrent counter update was overwritten';
  exception when serialization_failure then null;end;

  -- Negative: real, legitimate concurrent grade edits MUST prevent rollback.
  begin
    update public.bes_gradebook_workspaces
      set payload=jsonb_set(payload,'{scoreMap,legacy-100,midterm}','9.99'::jsonb,true),
          updated_at=clock_timestamp()
      where owner_id=requester and workspace_id='syn-12';
    perform public.bes_sync_restore_single_link(local_request_id);
    raise exception 'Concurrent score edit was overwritten';
  exception when serialization_failure then null;end;

  select public.bes_sync_restore_single_link(local_request_id) into result;
  if result->>'state'<>'rolled_back' then raise exception 'Live rollback failed: %',result;end if;
  select payload into current_payload from public.bes_gradebook_workspaces
    where owner_id=requester and workspace_id='syn-12';
  if current_payload<>old_payload then raise exception 'Exact backup was not restored';end if;
  if (select student_count from public.bes_gradebook_workspaces
    where owner_id=requester and workspace_id='syn-12')<>1 then
    raise exception 'Original student_count was not restored';end if;
  select count(*) into event_count from public.bes_sync_review_events e
    where e.request_id=local_request_id and action in
    ('execution_authorized','repaired','rollback_authorized','rolled_back');
  if event_count<>4 then raise exception 'Audit trail missing steps: %',event_count;end if;
  raise notice 'PASS local SQL: independent roles, ambiguous workspace, approved private backup, one append preserving scores, anti-replay, concurrent edit refusal, exact rollback';
end $scenario$;
rollback;
