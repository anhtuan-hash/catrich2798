-- 2026-09-11: keep Học bổ sung on the same rollcall metadata contract as extra classes.

alter table public.bes_supplemental_sessions
  add column if not exists lesson_periods numeric(3,1) not null default 1;

alter table public.bes_supplemental_sessions
  drop constraint if exists bes_supplemental_sessions_lesson_periods_check;
alter table public.bes_supplemental_sessions
  add constraint bes_supplemental_sessions_lesson_periods_check
  check (lesson_periods in (1, 1.5, 2));

create or replace function public.bes_confirm_supplemental_attendance_v2(
  p_session_id uuid,
  p_participants jsonb,
  p_session_note text default '',
  p_proof_path text default '',
  p_lesson_periods numeric default 1,
  p_teacher_name text default '',
  p_room text default '',
  p_start_time time default null,
  p_end_time time default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_result jsonb;
  v_session public.bes_supplemental_sessions%rowtype;
begin
  if coalesce(p_lesson_periods, 1) not in (1, 1.5, 2) then
    raise exception using errcode='22023', message='Số tiết chỉ được là 1, 1.5 hoặc 2.';
  end if;
  if p_start_time is not null and p_end_time is not null and p_start_time >= p_end_time then
    raise exception using errcode='22023', message='Giờ kết thúc phải sau giờ bắt đầu.';
  end if;

  -- Reuse the hardened confirmation function for authorization, roster validation,
  -- attendance counts and snapshot semantics.
  v_result := public.bes_confirm_supplemental_attendance(
    p_session_id,
    coalesce(p_participants, '[]'::jsonb),
    coalesce(p_session_note, ''),
    coalesce(p_proof_path, '')
  );

  update public.bes_supplemental_sessions
  set lesson_periods = coalesce(p_lesson_periods, 1),
      teacher_name = case when btrim(coalesce(p_teacher_name, '')) <> '' then btrim(p_teacher_name) else teacher_name end,
      room = case when btrim(coalesce(p_room, '')) <> '' then btrim(p_room) else room end,
      start_time = coalesce(p_start_time, start_time),
      end_time = coalesce(p_end_time, end_time),
      updated_at = now()
  where id = p_session_id
  returning * into v_session;

  if v_session.id is null then
    raise exception using errcode='P0002', message='Không tìm thấy buổi Học bổ sung.';
  end if;

  return jsonb_set(coalesce(v_result, '{}'::jsonb), '{session}', to_jsonb(v_session), true);
end;
$$;

revoke all on function public.bes_confirm_supplemental_attendance_v2(uuid,jsonb,text,text,numeric,text,text,time,time) from public, anon;
grant execute on function public.bes_confirm_supplemental_attendance_v2(uuid,jsonb,text,text,numeric,text,text,time,time) to authenticated;

create or replace function public.bes_list_supplemental_history(
  p_from date default (current_date - 31),
  p_to date default current_date,
  p_query text default ''
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_q text := lower(btrim(coalesce(p_query, '')));
begin
  perform private.bes_require_supplemental_reader(array['attendance:history','attendance:report']);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'activityType', 'supplemental',
      'kind', s.kind,
      'title', s.title,
      'groupName', g.group_name,
      'date', s.attendance_date,
      'subject', s.subject,
      'teacherName', s.teacher_name,
      'room', s.room,
      'timeRange', to_char(s.start_time,'HH24:MI') || '–' || to_char(s.end_time,'HH24:MI'),
      'lessonPeriods', coalesce(s.lesson_periods, 1),
      'status', s.status,
      'cancellationReason', s.cancellation_reason,
      'totalStudents', s.total_students,
      'presentCount', s.present_count,
      'absentCount', s.absent_count,
      'tardyCount', s.tardy_count,
      'checkedByName', s.checked_by_name,
      'sessionNote', s.session_note,
      'proofPath', s.proof_path,
      'participants', coalesce((
        select jsonb_agg(jsonb_build_object(
          'studentId', p.student_id,
          'canonicalStudentKey', p.canonical_student_key,
          'studentCode', p.student_code_snapshot,
          'fullName', p.full_name_snapshot,
          'schoolClassName', p.school_class_snapshot,
          'status', p.attendance_status,
          'absenceReasonCode', p.absence_reason_code,
          'absenceNote', p.absence_note
        ) order by p.full_name_snapshot)
        from public.bes_supplemental_session_participants p
        where p.session_id = s.id
      ), '[]'::jsonb)
    ) order by s.attendance_date desc, s.start_time desc)
    from public.bes_supplemental_sessions s
    left join public.bes_supplemental_groups g on g.id = s.group_id
    where s.attendance_date between p_from and p_to
      and s.status in ('confirmed','cancelled')
      and (
        v_q = ''
        or lower(s.title) like '%' || v_q || '%'
        or lower(s.subject) like '%' || v_q || '%'
        or lower(s.teacher_name) like '%' || v_q || '%'
        or lower(coalesce(g.group_name,'')) like '%' || v_q || '%'
        or exists (
          select 1 from public.bes_supplemental_session_participants p
          where p.session_id = s.id and lower(p.full_name_snapshot) like '%' || v_q || '%'
        )
      )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.bes_list_supplemental_history(date,date,text) from public, anon;
grant execute on function public.bes_list_supplemental_history(date,date,text) to authenticated;
