-- Resumable archive-snapshot scrub: at most two snapshots per request.
-- The archived learner stays in the live roster until finalize succeeds.
-- Security: workspace owner + verified homeroom assignment, archived-only,
-- revision CAS and bounded IDs. All DB changes in each call are atomic.
create or replace function public.bes_cloud_scrub_archived_backups_v2(
  p_workspace_id text,p_student_ids text[],p_expected_revision timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_actor uuid := auth.uid();
  v_ws public.bes_homeroom_workspaces%rowtype;
  v_selected jsonb := '[]'::jsonb;
  v_ids text[];
  v_codes text[];
  v_names text[];
  v_class text;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_backups jsonb;
  v_entry jsonb;
  v_marker jsonb;
  v_index integer;
  v_total integer;
  v_processed integer := 0;
  v_remaining integer := 0;
  v_unique_name text;
begin
  if v_actor is null then raise exception 'Bạn cần đăng nhập để xóa vĩnh viễn.'; end if;
  if not exists(select 1 from public.profiles where id=v_actor and approved is true) then
    raise exception 'Tài khoản chưa được phê duyệt.';
  end if;
  if p_workspace_id is null or pg_catalog.btrim(p_workspace_id)=''
     or p_expected_revision is null
     or p_student_ids is null or pg_catalog.cardinality(p_student_ids) < 1
     or pg_catalog.cardinality(p_student_ids) > 100
     or pg_catalog.array_position(p_student_ids,null) is not null
     or (select count(distinct x) from pg_catalog.unnest(p_student_ids) x)
        <> pg_catalog.cardinality(p_student_ids)
  then raise exception 'Yêu cầu xóa không hợp lệ.'; end if;

  select * into v_ws from public.bes_homeroom_workspaces
    where owner_id=v_actor and workspace_id=p_workspace_id for update;
  if not found then raise exception 'Bạn không có quyền chỉnh sửa lớp này.'; end if;
  if v_ws.updated_at is distinct from p_expected_revision then
    raise exception 'Dữ liệu lớp đã thay đổi. Hãy tải lại trước khi xóa.';
  end if;
  v_class := v_ws.class_name;
  if not exists (
    select 1 from public.school_class_registries sr,
      lateral pg_catalog.jsonb_array_elements(sr.payload->'classes') c(item)
    where c.item->>'className'=v_class
      and c.item->'assignment'->>'homeroomTeacherId'=v_actor::text
  ) and not exists (
    select 1 from public.profiles p
     where p.id=v_actor and p.approved is true
       and pg_catalog.lower(p.role) in ('admin','department_head')
  ) then raise exception 'Bạn chưa được phân công GVCN lớp này.'; end if;

  v_ids := p_student_ids;
  select coalesce(pg_catalog.jsonb_agg(item),'[]'::jsonb) into v_selected
  from pg_catalog.jsonb_array_elements(coalesce(v_ws.payload->'students','[]'::jsonb)) item
  where item->>'id'=any(v_ids) and item->>'active'='false';
  if pg_catalog.jsonb_array_length(v_selected) <> pg_catalog.cardinality(v_ids) then
    raise exception 'Chỉ được xóa vĩnh viễn học sinh đã lưu trữ.';
  end if;

  select coalesce(pg_catalog.array_agg(distinct
    nullif(pg_catalog.regexp_replace(pg_catalog.lower(item->>'code'),'[^a-z0-9]','','g'),'')),
    '{}'::text[]) into v_codes
  from pg_catalog.jsonb_array_elements(v_selected) item;
  select coalesce(pg_catalog.array_agg(distinct
    nullif(pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(item->>'fullName'),
      '[[:space:]]+',' ','g')),'')), '{}'::text[]) into v_names
  from pg_catalog.jsonb_array_elements(v_selected) item;
  for v_unique_name in select pg_catalog.unnest(v_names) loop
    if v_unique_name is not null and (
      select count(*) from pg_catalog.jsonb_array_elements(
        coalesce(v_ws.payload->'students','[]'::jsonb)) candidate
      where pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(
          coalesce(candidate->>'fullName','')),'[[:space:]]+',' ','g'))=v_unique_name
    ) <> 1 then raise exception 'Trùng tên học sinh. Cần bổ sung mã để xác nhận.'; end if;
  end loop;

  v_backups := coalesce(v_ws.payload->'backups','[]'::jsonb);
  if jsonb_typeof(v_backups) <> 'array' then raise exception 'Dữ liệu sao lưu bị lỗi định dạng.'; end if;
  v_total := pg_catalog.jsonb_array_length(v_backups);

  if v_total > 0 then
    for v_index in 0..v_total-1 loop
      v_entry := v_backups->v_index;
      v_marker := coalesce(v_entry->'besPurgeStudentIds','[]'::jsonb);
      if not pg_catalog.to_jsonb(v_ids) <@ v_marker then
        if v_processed < 2 then
          if jsonb_typeof(v_entry->'snapshot')='object' then
            v_entry := pg_catalog.jsonb_set(v_entry,'{snapshot}',
              public.bes_cloud_archived_purge_fast_v2(v_entry->'snapshot',v_ids,v_codes,v_names),true);
          end if;
          v_entry := pg_catalog.jsonb_set(v_entry,'{besPurgeStudentIds}',
            v_marker || pg_catalog.to_jsonb(v_ids),true);
          v_backups := pg_catalog.jsonb_set(v_backups,array[v_index::text],v_entry,true);
          v_processed := v_processed + 1;
        else
          v_remaining := v_remaining + 1;
        end if;
      end if;
    end loop;
  end if;

  if v_processed > 0 then
    update public.bes_homeroom_workspaces set
      payload=pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(payload,'{backups}',v_backups,true),
        '{syncMeta,cloudUpdatedAt}',pg_catalog.to_jsonb(v_now::text),true
      ),
      updated_at=v_now
    where id=v_ws.id;
  else
    v_now := v_ws.updated_at;
  end if;

  return pg_catalog.jsonb_build_object(
    'ok',true,'scrubbed',v_processed,'remaining',v_remaining,
    'total',v_total,'updatedAt',v_now::text
  );
end;
$fn$;
revoke all on function public.bes_cloud_scrub_archived_backups_v2(text,text[],timestamptz) from public, anon;
grant execute on function public.bes_cloud_scrub_archived_backups_v2(text,text[],timestamptz) to authenticated;