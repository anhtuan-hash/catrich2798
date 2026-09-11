-- Keep open recurring Học bổ sung sessions aligned with the effective group roster.
-- Confirmed/cancelled sessions remain immutable snapshots for audit/history.

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
          when s.kind='recurring' and s.status in ('scheduled','in_progress') then (
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

create or replace function public.bes_begin_supplemental_attendance(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_session public.bes_supplemental_sessions%rowtype;
  v_access jsonb;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập để điểm danh.'; end if;
  perform public.can_take_extra_class_attendance();

  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id=p_session_id
  for update;

  if not found then raise exception 'Không tìm thấy buổi Học bổ sung.'; end if;
  if v_session.status='cancelled' then raise exception 'Buổi Học bổ sung đã bị hủy.'; end if;
  if v_session.status='confirmed' then raise exception 'Buổi Học bổ sung đã chốt điểm danh.'; end if;

  v_access:=private.bes_attendance_access_decision(v_session.id,v_session.teacher_name,clock_timestamp());
  if coalesce((v_access->>'allowed')::boolean,false) is not true then
    raise exception '%',coalesce(v_access->>'reason','attendance_not_allowed');
  end if;

  -- A recurring session remains configuration-driven until it is confirmed.
  -- This repairs sessions that were opened/frozen while the group roster was still empty.
  if v_session.kind='recurring' then
    delete from public.bes_supplemental_session_participants p
    where p.session_id=v_session.id;

    insert into public.bes_supplemental_session_participants(
      session_id,student_id,canonical_student_key,student_code_snapshot,
      full_name_snapshot,school_class_snapshot,updated_at
    )
    select distinct on(private.bes_supplemental_canonical_key(st.id))
      v_session.id,
      st.id,
      private.bes_supplemental_canonical_key(st.id),
      st.student_code,
      st.full_name,
      st.school_class_name,
      clock_timestamp()
    from public.bes_supplemental_group_memberships m
    join public.bes_supplemental_students st on st.id=m.student_id and st.active=true
    where m.group_id=v_session.group_id
      and m.effective_from<=v_session.attendance_date
      and (m.effective_until is null or m.effective_until>=v_session.attendance_date)
    order by private.bes_supplemental_canonical_key(st.id),st.id;

    update public.bes_supplemental_sessions s
    set roster_frozen_at=clock_timestamp(),
        status='in_progress',
        total_students=(
          select count(*)
          from public.bes_supplemental_session_participants p
          where p.session_id=v_session.id
        ),
        updated_by=v_uid,
        updated_at=clock_timestamp()
    where s.id=v_session.id
    returning * into v_session;

  elsif v_session.roster_frozen_at is null then
    if not exists(
      select 1
      from public.bes_supplemental_session_participants p
      where p.session_id=v_session.id
    ) then
      raise exception 'Buổi phát sinh chưa có học sinh.';
    end if;

    update public.bes_supplemental_session_participants p
    set canonical_student_key=private.bes_supplemental_canonical_key(st.id),
        student_code_snapshot=st.student_code,
        full_name_snapshot=st.full_name,
        school_class_snapshot=st.school_class_name,
        updated_at=clock_timestamp()
    from public.bes_supplemental_students st
    where p.session_id=v_session.id and st.id=p.student_id;

    update public.bes_supplemental_sessions s
    set roster_frozen_at=clock_timestamp(),
        status='in_progress',
        total_students=(
          select count(*)
          from public.bes_supplemental_session_participants p
          where p.session_id=v_session.id
        ),
        updated_by=v_uid,
        updated_at=clock_timestamp()
    where s.id=v_session.id
    returning * into v_session;

  elsif v_session.status='scheduled' then
    update public.bes_supplemental_sessions s
    set status='in_progress',updated_by=v_uid,updated_at=clock_timestamp()
    where s.id=v_session.id
    returning * into v_session;
  end if;

  return jsonb_build_object(
    'session',to_jsonb(v_session),
    'participants',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,
        'studentId',p.student_id,
        'canonicalStudentKey',p.canonical_student_key,
        'studentCode',p.student_code_snapshot,
        'fullName',p.full_name_snapshot,
        'schoolClassName',p.school_class_snapshot,
        'status',coalesce(p.attendance_status,'present'),
        'absenceReasonCode',p.absence_reason_code,
        'absenceNote',p.absence_note
      ) order by p.full_name_snapshot)
      from public.bes_supplemental_session_participants p
      where p.session_id=v_session.id
    ),'[]'::jsonb),
    'access',v_access,
    'serverNow',clock_timestamp()
  );
end;
$$;

revoke all on function public.bes_begin_supplemental_attendance(uuid) from public,anon;
grant execute on function public.bes_begin_supplemental_attendance(uuid) to authenticated;

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
          when s.kind='recurring' and s.status in ('scheduled','in_progress') then (
            select count(distinct private.bes_supplemental_canonical_key(m.student_id))
            from public.bes_supplemental_group_memberships m
            join public.bes_supplemental_students st on st.id=m.student_id and st.active=true
            where m.group_id=s.group_id
              and m.effective_from<=s.attendance_date
              and (m.effective_until is null or m.effective_until>=s.attendance_date)
          )::integer
          else (
            select count(*)
            from public.bes_supplemental_session_participants p
            where p.session_id=s.id
          )::integer
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
