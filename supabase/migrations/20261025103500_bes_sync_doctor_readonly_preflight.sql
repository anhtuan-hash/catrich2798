-- Brian Sync Doctor v1.3: read-only, individually scoped repair simulation.
-- No inserts, updates, deletes, backups, student/score mutations, or execute/rollback endpoints.
create or replace function public.bes_sync_preview_review(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  r public.bes_sync_review_requests%rowtype;
  c_students jsonb;
  c_revision timestamptz;
  target_payload jsonb;
  target_revision timestamptz;
  target_students jsonb;
  candidate jsonb;
  candidate_id text;
  candidate_code text;
  test_case text;
  matched_count integer := 0;
  same_id_count integer := 0;
  same_code_count integer := 0;
  canonical_code_count integer := 0;
  n_before integer := 0;
  hash_before text;
begin
  if actor is null or not exists (
    select 1 from public.profiles p where p.id=actor and p.approved is true
      and p.role in ('admin','department_head')
  ) then raise exception 'Authorized Sync Doctor reviewer required' using errcode='42501'; end if;

  select * into r from public.bes_sync_review_requests where id=p_request_id;
  if not found then raise exception 'Review request not found' using errcode='P0002'; end if;

  if r.status <> 'approved_for_review' then
    return jsonb_build_object('state','blocked','reason','independent_review_not_approved',
      'readOnly',true,'canExecute',false);
  end if;
  if r.issue_code <> 'STUDENT_NOT_LINKED' or r.source not in ('gradebook','homeroom')
      or r.source_revision is null or r.canonical_revision is null
      or r.workspace_id = '' then
    return jsonb_build_object('state','blocked','reason','unsupported_scope',
      'readOnly',true,'canExecute',false);
  end if;

  select c.students, c.updated_at into c_students,c_revision
  from public.bes_class_rosters c
  where c.roster_key='class:'||lower(r.school_year)||'||'||lower(r.class_name)
  limit 1;

  if c_revision is distinct from r.canonical_revision then
    return jsonb_build_object('state','stale','reason','canonical_revision_changed',
      'readOnly',true,'canExecute',false);
  end if;

  if r.source='gradebook' then
    select g.payload,g.updated_at into target_payload,target_revision
    from public.bes_gradebook_workspaces g
    where g.workspace_id=r.workspace_id and g.school_year=r.school_year
      and g.class_name=r.class_name limit 1;
  else
    select h.payload,h.updated_at into target_payload,target_revision
    from public.bes_homeroom_workspaces h
    where h.workspace_id=r.workspace_id and h.school_year=r.school_year
      and h.class_name=r.class_name limit 1;
  end if;

  if target_revision is distinct from r.source_revision then
    return jsonb_build_object('state','stale','reason','target_revision_changed',
      'readOnly',true,'canExecute',false);
  end if;

  if jsonb_typeof(c_students) <> 'array' or
     jsonb_typeof(target_payload) <> 'object' or
     jsonb_typeof(target_payload->'students') <> 'array' then
    return jsonb_build_object('state','blocked','reason','unsupported_student_shape',
      'readOnly',true,'canExecute',false);
  end if;

  target_students := target_payload->'students';
  n_before := jsonb_array_length(target_students);
  if jsonb_array_length(c_students)>600 or n_before>600 then
    return jsonb_build_object('state','blocked','reason','scope_too_large',
      'readOnly',true,'canExecute',false);
  end if;

  -- Reconstruct the exact SHA-256 case hash from canonical stable IDs;
  -- no student names or identifiers are returned to the browser.
  for candidate in select value from jsonb_array_elements(c_students)
  loop
    candidate_id := nullif(trim(coalesce(candidate->>'rosterStudentId',candidate->>'id','')),'');
    if candidate_id is not null then
      test_case := concat_ws(':',r.issue_code,r.school_year,r.class_name,
        r.source,r.workspace_id,candidate_id);
      if encode(sha256(convert_to(test_case,'UTF8')),'hex')=r.case_hash then
        matched_count := matched_count + 1;
        exit when matched_count>1;
      end if;
    end if;
  end loop;

  if matched_count<>1 then
    return jsonb_build_object('state','blocked','reason','student_identity_not_unique',
      'readOnly',true,'canExecute',false);
  end if;
  candidate_id := nullif(trim(coalesce(candidate->>'rosterStudentId',candidate->>'id','')),'');
  candidate_code := lower(trim(coalesce(candidate->>'code','')));

  if candidate->>'active'='false'
     or lower(coalesce(candidate->>'lifecycleStatus','')) in ('archived','transferred','deleted')
     or coalesce(candidate->>'deletedAt','') <> ''
     or coalesce(candidate->>'archivedAt','') <> '' then
    return jsonb_build_object('state','blocked','reason','student_not_active',
      'readOnly',true,'canExecute',false);
  end if;

  select count(*) into canonical_code_count
  from jsonb_array_elements(c_students) t(value)
  where candidate_code<>'' and lower(trim(coalesce(t.value->>'code','')))=candidate_code;
  if canonical_code_count>1 then
    return jsonb_build_object('state','blocked','reason','duplicate_canonical_code',
      'readOnly',true,'canExecute',false);
  end if;

  select count(*) into same_id_count
  from jsonb_array_elements(target_students) t(value)
  where coalesce(t.value->>'rosterStudentId',t.value->>'id','')=candidate_id;
  select count(*) into same_code_count
  from jsonb_array_elements(target_students) t(value)
  where candidate_code<>'' and lower(trim(coalesce(t.value->>'code','')))=candidate_code;

  if same_id_count>0 or same_code_count>0 then
    return jsonb_build_object('state','blocked','reason','target_identity_already_present_or_conflicting',
      'readOnly',true,'canExecute',false);
  end if;

  -- Fingerprint only. No actual snapshot is stored, and no restore is offered.
  hash_before := encode(sha256(convert_to(target_payload::text,'UTF8')),'hex');
  return jsonb_build_object(
    'state','ready_for_manual_review',
    'reason','single_candidate_found',
    'source',r.source,'schoolYear',r.school_year,'className',r.class_name,
    'beforeCount',n_before,'proposedCount',n_before+1,
    'canonicalCount',jsonb_array_length(c_students),
    'targetRevision',to_char(target_revision at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'canonicalRevision',to_char(c_revision at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'targetChecksum',hash_before,
    'backupCreated',false,'rollbackAvailable',false,
    'reviewStatus',r.status,'requiresNewApprovalForExecution',true,
    'readOnly',true,'canExecute',false
  );
end;
$function$;
revoke execute on function public.bes_sync_preview_review(uuid) from public,anon;
grant execute on function public.bes_sync_preview_review(uuid) to authenticated;
comment on function public.bes_sync_preview_review(uuid) is
  'Read-only server preflight of approved per-student association. Does not snapshot, repair, or restore academic data.';
