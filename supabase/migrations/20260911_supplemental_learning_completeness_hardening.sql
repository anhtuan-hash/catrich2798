-- 2026-09-11: completeness hardening for Học bổ sung.
-- Forward-only overrides: authoritative official identities, accurate pre-freeze
-- recurring roster counts, and count-rich unified reporting rows.

create or replace function public.bes_upsert_supplemental_student(
  p_student_id uuid default null,
  p_source_type text default 'manual',
  p_official_key text default null,
  p_student_code text default '',
  p_full_name text default '',
  p_school_class_name text default '',
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_admin();
  v_row public.bes_supplemental_students%rowtype;
  v_source text := lower(btrim(coalesce(p_source_type,'manual')));
  v_official_key text := nullif(btrim(p_official_key),'');
  v_candidate record;
  v_candidate_found boolean := false;
begin
  if v_source not in ('official','manual') then
    raise exception 'Loại học sinh không hợp lệ.';
  end if;

  if v_source='official' then
    if v_official_key is null then
      raise exception 'Học sinh chính thức phải có khóa định danh.';
    end if;

    select c.* into v_candidate
    from private.bes_supplemental_official_candidates() c
    where lower(c.official_key)=lower(v_official_key)
    limit 1;
    v_candidate_found := found;

    -- Existing official identities may be deactivated/reactivated even if a
    -- source registry is temporarily unavailable, but new official identities
    -- must always resolve against authoritative school data.
    if not v_candidate_found and not exists (
      select 1
      from public.bes_supplemental_students s
      where s.id=coalesce(p_student_id,s.id)
        and s.source_type='official'
        and lower(s.official_key)=lower(v_official_key)
    ) then
      raise exception 'Không tìm thấy học sinh chính thức trong dữ liệu nhà trường.';
    end if;

    if p_student_id is null then
      select * into v_row
      from public.bes_supplemental_students s
      where s.source_type='official' and lower(s.official_key)=lower(v_official_key)
      for update;

      if found then
        update public.bes_supplemental_students s
        set student_code=case when v_candidate_found then coalesce(v_candidate.student_code,'') else s.student_code end,
            full_name=case when v_candidate_found then coalesce(v_candidate.full_name,s.full_name) else s.full_name end,
            school_class_name=case when v_candidate_found then coalesce(v_candidate.school_class_name,'') else s.school_class_name end,
            active=coalesce(p_active,s.active),
            updated_by=v_uid,
            updated_at=clock_timestamp()
        where s.id=v_row.id
        returning * into v_row;
        return to_jsonb(v_row);
      end if;

      insert into public.bes_supplemental_students(
        source_type,official_key,student_code,full_name,school_class_name,active,
        created_by,updated_by,created_at,updated_at
      ) values (
        'official',v_official_key,
        coalesce(v_candidate.student_code,''),
        coalesce(v_candidate.full_name,''),
        coalesce(v_candidate.school_class_name,''),
        coalesce(p_active,true),v_uid,v_uid,clock_timestamp(),clock_timestamp()
      ) returning * into v_row;
      return to_jsonb(v_row);
    end if;

    if exists (
      select 1 from public.bes_supplemental_students s
      where s.id<>p_student_id
        and s.source_type='official'
        and lower(s.official_key)=lower(v_official_key)
    ) then
      raise exception 'Học sinh chính thức này đã có hồ sơ Học bổ sung khác.';
    end if;

    update public.bes_supplemental_students s
    set source_type='official',
        official_key=v_official_key,
        linked_official_key=null,
        student_code=case when v_candidate_found then coalesce(v_candidate.student_code,'') else s.student_code end,
        full_name=case when v_candidate_found then coalesce(v_candidate.full_name,s.full_name) else s.full_name end,
        school_class_name=case when v_candidate_found then coalesce(v_candidate.school_class_name,'') else s.school_class_name end,
        active=coalesce(p_active,s.active),
        updated_by=v_uid,
        updated_at=clock_timestamp()
    where s.id=p_student_id
    returning * into v_row;
    if not found then raise exception 'Không tìm thấy học sinh Học bổ sung.'; end if;
    return to_jsonb(v_row);
  end if;

  if nullif(btrim(p_full_name),'') is null then
    raise exception 'Họ tên học sinh là bắt buộc.';
  end if;

  if p_student_id is null then
    insert into public.bes_supplemental_students(
      source_type,official_key,linked_official_key,student_code,full_name,
      school_class_name,active,created_by,updated_by,created_at,updated_at
    ) values (
      'manual',null,null,btrim(coalesce(p_student_code,'')),btrim(p_full_name),
      btrim(coalesce(p_school_class_name,'')),coalesce(p_active,true),
      v_uid,v_uid,clock_timestamp(),clock_timestamp()
    ) returning * into v_row;
  else
    update public.bes_supplemental_students s
    set source_type='manual',
        official_key=null,
        student_code=btrim(coalesce(p_student_code,'')),
        full_name=btrim(p_full_name),
        school_class_name=btrim(coalesce(p_school_class_name,'')),
        active=coalesce(p_active,s.active),
        updated_by=v_uid,
        updated_at=clock_timestamp()
    where s.id=p_student_id
    returning * into v_row;
    if not found then raise exception 'Không tìm thấy học sinh Học bổ sung.'; end if;
  end if;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.bes_upsert_supplemental_student(uuid,text,text,text,text,text,boolean) from public,anon;
grant execute on function public.bes_upsert_supplemental_student(uuid,text,text,text,text,text,boolean) to authenticated;

create or replace function public.bes_list_supplemental_attendance(
  p_from date default current_date,
  p_to date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  perform private.bes_require_supplemental_reader(array['attendance:calendar','attendance:quick','attendance:history','attendance:report']);
  if p_to<p_from then raise exception 'Khoảng ngày không hợp lệ.'; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id',s.id,
        'groupId',s.group_id,
        'kind',s.kind,
        'title',s.title,
        'groupName',g.group_name,
        'attendanceDate',s.attendance_date,
        'subject',s.subject,
        'teacherId',s.teacher_id,
        'teacherName',s.teacher_name,
        'teacherEmail',s.teacher_email,
        'room',s.room,
        'startTime',to_char(s.start_time,'HH24:MI'),
        'endTime',to_char(s.end_time,'HH24:MI'),
        'timeRange',to_char(s.start_time,'HH24:MI')||'–'||to_char(s.end_time,'HH24:MI'),
        'status',s.status,
        'participantCount',case
          when s.kind='recurring' and s.roster_frozen_at is null then (
            select count(distinct private.bes_supplemental_canonical_key(m.student_id))
            from public.bes_supplemental_group_memberships m
            join public.bes_supplemental_students st on st.id=m.student_id and st.active=true
            where m.group_id=s.group_id
              and m.effective_from<=s.attendance_date
              and (m.effective_until is null or m.effective_until>=s.attendance_date)
          )
          else (
            select count(*)
            from public.bes_supplemental_session_participants p
            where p.session_id=s.id
          )
        end,
        'rosterFrozenAt',s.roster_frozen_at,
        'sessionNote',s.session_note,
        'proofPath',s.proof_path
      ) order by s.attendance_date,s.start_time,s.title
    )
    from public.bes_supplemental_sessions s
    left join public.bes_supplemental_groups g on g.id=s.group_id
    where s.attendance_date between p_from and p_to
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.bes_list_supplemental_attendance(date,date) from public,anon;
grant execute on function public.bes_list_supplemental_attendance(date,date) to authenticated;

create or replace function public.bes_list_attendance_activities(
  p_from date default current_date,
  p_to date default current_date,
  p_activity_type text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_type text := lower(btrim(coalesce(p_activity_type,'all')));
begin
  perform private.bes_require_supplemental_reader(array['attendance:calendar','attendance:history','attendance:report']);
  if v_type not in ('all','remedial','enrichment','supplemental') then
    raise exception 'Loại hoạt động không hợp lệ.';
  end if;

  return coalesce((
    with activities as (
      select
        x.id::text as id,
        'extra'::text as source,
        case when lower(coalesce(x.class_type,'')) in ('gifted','enrichment') then 'enrichment' else 'remedial' end as activity_type,
        x.class_name as title,
        x.subject,
        x.teacher_name,
        x.attendance_date,
        x.teaching_time_range as time_range,
        x.teaching_room as room,
        x.total_students as participant_count,
        x.present_count as present_count,
        x.absent_count as absent_count,
        (select count(*) from public.bes_extra_attendance_records r where r.session_id=x.id and lower(coalesce(r.status,''))='tardy')::integer as tardy_count,
        x.session_status as status,
        null::text as supplemental_kind
      from public.bes_extra_attendance_sessions x
      where x.attendance_date between p_from and p_to

      union all

      select
        s.id::text,
        'supplemental',
        'supplemental',
        s.title,
        s.subject,
        s.teacher_name,
        s.attendance_date,
        to_char(s.start_time,'HH24:MI')||'–'||to_char(s.end_time,'HH24:MI'),
        s.room,
        case
          when s.kind='recurring' and s.roster_frozen_at is null then (
            select count(distinct private.bes_supplemental_canonical_key(m.student_id))
            from public.bes_supplemental_group_memberships m
            join public.bes_supplemental_students st on st.id=m.student_id and st.active=true
            where m.group_id=s.group_id
              and m.effective_from<=s.attendance_date
              and (m.effective_until is null or m.effective_until>=s.attendance_date)
          )::integer
          else (select count(*) from public.bes_supplemental_session_participants p where p.session_id=s.id)::integer
        end,
        s.present_count,
        s.absent_count,
        s.tardy_count,
        s.status,
        s.kind
      from public.bes_supplemental_sessions s
      where s.attendance_date between p_from and p_to
    )
    select jsonb_agg(jsonb_build_object(
      'id',a.id,
      'source',a.source,
      'activityType',a.activity_type,
      'title',a.title,
      'subject',a.subject,
      'teacherName',a.teacher_name,
      'date',a.attendance_date,
      'timeRange',a.time_range,
      'room',a.room,
      'participantCount',a.participant_count,
      'totalStudents',a.participant_count,
      'presentCount',coalesce(a.present_count,0),
      'absentCount',coalesce(a.absent_count,0),
      'tardyCount',coalesce(a.tardy_count,0),
      'status',a.status,
      'supplementalKind',a.supplemental_kind
    ) order by a.attendance_date,a.time_range,a.title)
    from activities a
    where v_type='all' or a.activity_type=v_type
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.bes_list_attendance_activities(date,date,text) from public,anon;
grant execute on function public.bes_list_attendance_activities(date,date,text) to authenticated;
