-- Require the authenticated GVCN to be verified against the school registry.
create or replace function public.bes_cloud_permanent_delete_archived_v1(
  p_workspace_id text, p_student_ids text[], p_expected_revision timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_actor uuid := auth.uid();
  v_ws public.bes_homeroom_workspaces%rowtype;
  v_selected jsonb := '[]'::jsonb;
  v_ids text[];
  v_codes text[];
  v_names text[];
  v_class text;
  v_year text;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_payload jsonb;
  v_tombstones jsonb;
  v_class_json jsonb;
  v_class_rows jsonb;
  v_name text;
  v_removed_count integer;
begin
  if v_actor is null then raise exception 'Bạn cần đăng nhập để xóa vĩnh viễn.'; end if;
  if not exists (
    select 1 from public.profiles
    where id=v_actor and approved is true
  ) then raise exception 'Tài khoản chưa được phê duyệt.'; end if;
  if p_workspace_id is null or pg_catalog.btrim(p_workspace_id) = ''
    or p_expected_revision is null
    or p_student_ids is null or pg_catalog.cardinality(p_student_ids) < 1
    or pg_catalog.cardinality(p_student_ids) > 100
    or pg_catalog.array_position(p_student_ids, null) is not null
    or (select count(distinct x) from pg_catalog.unnest(p_student_ids) x)
        <> pg_catalog.cardinality(p_student_ids)
  then raise exception 'Yêu cầu xóa không hợp lệ hoặc thiếu phiên bản dữ liệu.'; end if;

  select * into v_ws from public.bes_homeroom_workspaces
    where owner_id=v_actor and workspace_id=p_workspace_id for update;
  if not found then raise exception 'Bạn không có quyền xóa dữ liệu của lớp này.'; end if;
  if v_ws.updated_at is distinct from p_expected_revision then
    raise exception 'Dữ liệu lớp đã thay đổi. Hãy tải lại trước khi xóa.';
  end if;
  v_class := v_ws.class_name;
  v_year := v_ws.school_year;
  if coalesce(v_class,'')='' or coalesce(v_year,'')='' then
    raise exception 'Lớp hoặc năm học chưa được xác định.';
  end if;
  -- Ownership of a self-created class is not proof of a school assignment.
  -- Check the authoritative school registry for the GVCN link. Institution
  -- administrators are allowed to manage their own registered workspaces.
  if not exists (
    select 1 from public.school_class_registries sr,
      lateral pg_catalog.jsonb_array_elements(sr.payload->'classes') as c(item)
    where c.item->>'className'=v_class
      and c.item->'assignment'->>'homeroomTeacherId'=v_actor::text
  ) and not exists (
    select 1 from public.profiles p
    where p.id=v_actor and p.approved is true
      and pg_catalog.lower(p.role) in ('admin','department_head')
  ) then raise exception 'Chỉ GVCN được phân công hoặc quản trị viên mới có quyền xóa vĩnh viễn lớp này.';
  end if;

  v_ids := p_student_ids;
  select coalesce(pg_catalog.jsonb_agg(item),'[]'::jsonb) into v_selected
  from pg_catalog.jsonb_array_elements(coalesce(v_ws.payload->'students','[]'::jsonb)) item
  where item->>'id'=any(v_ids) and item->>'active'='false';
  v_removed_count := pg_catalog.jsonb_array_length(v_selected);
  if v_removed_count <> pg_catalog.cardinality(v_ids) then
    raise exception 'Chỉ được xóa vĩnh viễn học sinh đã lưu trữ. Hãy tải lại danh sách.';
  end if;

  select coalesce(pg_catalog.array_agg(distinct
    nullif(pg_catalog.regexp_replace(pg_catalog.lower(item->>'code'),'[^a-z0-9]','','g'),'')),
    '{}'::text[]) into v_codes
  from pg_catalog.jsonb_array_elements(v_selected) item;
  select coalesce(pg_catalog.array_agg(distinct
    nullif(pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(item->>'fullName'),
      '[[:space:]]+',' ','g')),'')), '{}'::text[]) into v_names
  from pg_catalog.jsonb_array_elements(v_selected) item;

  -- Matching by name is only allowed when unique in the authoritative class.
  for v_name in select pg_catalog.unnest(v_names) loop
    if v_name is not null and (
      select count(*) from pg_catalog.jsonb_array_elements(
        coalesce(v_ws.payload->'students','[]'::jsonb)
      ) candidate
      where pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(
        coalesce(candidate->>'fullName','')),'[[:space:]]+',' ','g'))=v_name
    ) <> 1 then raise exception 'Có học sinh trùng tên; cần phân biệt bằng mã học sinh.'; end if;
  end loop;

  -- Never finalize until all historical snapshot batches have been scrubbed
  -- by bes_cloud_scrub_archived_backups_v2. Keep the 19 backups intact here.
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(
      coalesce(v_ws.payload->'backups','[]'::jsonb)) bk
    where not (pg_catalog.to_jsonb(v_ids) <@
      coalesce(bk->'besPurgeStudentIds','[]'::jsonb))
  ) then raise exception 'Bản sao lưu chưa được dọn hết. Vui lòng tiếp tục quá trình xóa.'; end if;

  -- Double-check older backup snapshots cannot restore the learner.
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(
      coalesce(v_ws.payload->'backups','[]'::jsonb)) bk
    cross join lateral pg_catalog.jsonb_array_elements(
      case when jsonb_typeof(bk->'snapshot'->'students')='array'
        then bk->'snapshot'->'students' else '[]'::jsonb end
    ) s
    where public.bes_cloud_archived_match_v1(s,v_ids,v_codes,v_names)
  ) then raise exception 'Bản sao lưu vẫn chứa học sinh được chọn. Hãy kiểm tra lại trước khi xóa.'; end if;

  -- Fast path: do not re-traverse the 10 MB already-sanitized backups.
  -- The final write and all roster/gradebook updates remain transactional.
  v_payload := pg_catalog.jsonb_set(
    public.bes_cloud_archived_purge_fast_v2(v_ws.payload - 'backups',v_ids,v_codes,v_names),
    '{backups}',coalesce(v_ws.payload->'backups','[]'::jsonb),true
  );
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', item->>'id',
      'code', coalesce(item->>'code',''),
      'identity', coalesce(item->>'fullName','') || '|' || coalesce(item->>'birthDate',''),
      'fullName', coalesce(item->>'fullName',''),
      'birthDate', coalesce(item->>'birthDate',''),
      'deletedAt',v_now::text
    )), '[]'::jsonb) into v_tombstones
  from pg_catalog.jsonb_array_elements(v_selected) item;
  v_payload := pg_catalog.jsonb_set(v_payload,'{studentPermanentDeletionTombstones}',
    coalesce(v_payload->'studentPermanentDeletionTombstones','[]'::jsonb) || v_tombstones,true);
  v_payload := pg_catalog.jsonb_set(v_payload,'{studentPermanentDeletionAudit}',
    coalesce(v_payload->'studentPermanentDeletionAudit','[]'::jsonb)
    || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'count',v_removed_count,'deletedAt',v_now::text,'deletedBy',v_actor::text,'source','supabase-rpc')),true);
  v_payload := pg_catalog.jsonb_set(v_payload,'{updatedAt}',pg_catalog.to_jsonb(v_now::text),true);
  v_payload := pg_catalog.jsonb_set(v_payload,'{syncMeta,cloudUpdatedAt}',pg_catalog.to_jsonb(v_now::text),true);

  update public.bes_homeroom_workspaces
    set payload=v_payload, updated_at=v_now
    where id=v_ws.id;

  -- Remove from the school-wide canonical list and its historical snapshots.
  update public.bes_class_rosters r
    set students=public.bes_cloud_archived_purge_v1(r.students,v_ids,v_codes,v_names),
        updated_at=v_now, updated_by=v_actor
    where r.class_name=v_class and r.school_year=v_year;
  update public.bes_class_roster_history h
    set students=public.bes_cloud_archived_purge_v1(h.students,v_ids,v_codes,v_names)
    where h.class_name=v_class and h.school_year=v_year;

  -- School registry contains all classes in one JSON document; only alter
  -- the explicitly selected class, leaving unrelated classes untouched.
  for v_class_json in select payload from public.school_class_registries
    where jsonb_typeof(payload->'classes')='array'
    for update
  loop
    select coalesce(pg_catalog.jsonb_agg(
      case when cls.item->>'className'=v_class then
        public.bes_cloud_archived_purge_v1(cls.item,v_ids,v_codes,v_names)
      else cls.item end order by cls.ord
    ),'[]'::jsonb) into v_class_rows
    from pg_catalog.jsonb_array_elements(v_class_json->'classes') with ordinality cls(item,ord);
    update public.school_class_registries
      set payload=pg_catalog.jsonb_set(payload,'{classes}',v_class_rows,true),
          updated_at=v_now
      where payload=v_class_json;
  end loop;

  -- Gradebook shares class identities, but stores its own student/score JSON.
  update public.bes_gradebook_workspaces g
    set payload=public.bes_cloud_archived_purge_v1(g.payload,v_ids,v_codes,v_names),
        student_count=pg_catalog.jsonb_array_length(
          coalesce(public.bes_cloud_archived_purge_v1(g.payload,v_ids,v_codes,v_names)->'students','[]'::jsonb)
        ), updated_at=v_now
    where g.class_name=v_class and g.school_year=v_year;

  -- Legacy normalized homeroom tables and separate backups (if used).
  update public.bes_homeroom_backups
    set payload=public.bes_cloud_archived_purge_v1(payload,v_ids,v_codes,v_names)
    where owner_id=v_actor and workspace_id=p_workspace_id;
  delete from public.bes_homeroom_attendance where owner_id=v_actor
    and workspace_id=p_workspace_id and student_ref=any(v_ids);
  delete from public.bes_homeroom_learning_records where owner_id=v_actor
    and workspace_id=p_workspace_id and student_ref=any(v_ids);
  delete from public.bes_homeroom_parent_contacts where owner_id=v_actor
    and workspace_id=p_workspace_id and student_ref=any(v_ids);
  delete from public.bes_homeroom_incidents where owner_id=v_actor
    and workspace_id=p_workspace_id and student_ref=any(v_ids);
  delete from public.bes_homeroom_feedback_inbox where owner_id=v_actor
    and workspace_id=p_workspace_id and student_ref=any(v_ids);
  delete from public.bes_homeroom_portal_receipts where owner_id=v_actor
    and workspace_id=p_workspace_id and student_ref=any(v_ids);
  delete from public.bes_homeroom_portal_responses where owner_id=v_actor
    and workspace_id=p_workspace_id and student_ref=any(v_ids);
  delete from public.bes_homeroom_students where owner_id=v_actor
    and workspace_id=p_workspace_id and student_ref=any(v_ids);

  return pg_catalog.jsonb_build_object(
    'ok',true,'deletedCount',v_removed_count,'workspaceId',p_workspace_id,
    'updatedAt',v_now::text,'source','supabase','className',v_class
  );
end;
$fn$;

revoke all on function public.bes_cloud_permanent_delete_archived_v1(text,text[],timestamptz) from public, anon;
grant execute on function public.bes_cloud_permanent_delete_archived_v1(text,text[],timestamptz) to authenticated;
