-- 2026-09-12: make the visible Học bổ sung "Xóa lớp" action a real hard delete.
-- Match Phụ đạo/Bồi dưỡng semantics: remove the class and all class-owned attendance/session data.
-- Also keep archived/inactive legacy classes out of the live attendance schedule.

create or replace function public.bes_delete_supplemental_class(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_group public.bes_supplemental_groups%rowtype;
  v_session_count integer := 0;
  v_participant_count integer := 0;
  v_member_count integer := 0;
  v_teacher_count integer := 0;
  v_change_count integer := 0;
  v_proof_paths jsonb := '[]'::jsonb;
begin
  v_uid := private.bes_require_supplemental_manager();

  select * into v_group
  from public.bes_supplemental_groups g
  where g.id = p_group_id
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp Học bổ sung cần xóa.' using errcode = 'P0002';
  end if;

  select count(*)::integer,
         coalesce(jsonb_agg(s.proof_path) filter (where nullif(btrim(coalesce(s.proof_path, '')), '') is not null), '[]'::jsonb)
  into v_session_count, v_proof_paths
  from public.bes_supplemental_sessions s
  where s.group_id = p_group_id;

  select count(*)::integer into v_participant_count
  from public.bes_supplemental_session_participants p
  where p.session_id in (select s.id from public.bes_supplemental_sessions s where s.group_id = p_group_id);

  select count(*)::integer into v_change_count
  from public.bes_supplemental_attendance_record_changes c
  where c.session_id in (select s.id from public.bes_supplemental_sessions s where s.group_id = p_group_id);

  select count(*)::integer into v_member_count
  from public.bes_supplemental_group_memberships m
  where m.group_id = p_group_id;

  select count(*)::integer into v_teacher_count
  from public.bes_supplemental_group_teachers t
  where t.group_id = p_group_id;

  delete from public.bes_supplemental_attendance_record_changes c
  where c.session_id in (select s.id from public.bes_supplemental_sessions s where s.group_id = p_group_id);

  delete from public.bes_supplemental_session_participants p
  where p.session_id in (select s.id from public.bes_supplemental_sessions s where s.group_id = p_group_id);

  delete from public.bes_supplemental_sessions s where s.group_id = p_group_id;
  delete from public.bes_supplemental_group_memberships m where m.group_id = p_group_id;
  delete from public.bes_supplemental_group_teachers t where t.group_id = p_group_id;
  delete from public.bes_supplemental_groups g where g.id = p_group_id;

  return jsonb_build_object(
    'group_id', v_group.id,
    'class_name', v_group.group_name,
    'deleted_sessions', v_session_count,
    'deleted_participants', v_participant_count,
    'deleted_changes', v_change_count,
    'deleted_members', v_member_count,
    'deleted_teachers', v_teacher_count,
    'proof_paths', v_proof_paths,
    'deleted_by', v_uid
  );
end;
$$;

revoke all on function public.bes_delete_supplemental_class(uuid) from public, anon;
grant execute on function public.bes_delete_supplemental_class(uuid) to authenticated;

create or replace function public.bes_list_supplemental_attendance(
  p_from date default current_date,
  p_to date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.bes_require_supplemental_reader(array['attendance:calendar','attendance:quick','attendance:history','attendance:report']);
  if p_to < p_from then raise exception 'Khoảng ngày không hợp lệ.'; end if;

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
      and (s.group_id is null or (g.id is not null and g.active = true and g.archived_at is null))
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.bes_list_supplemental_attendance(date,date) from public, anon;
grant execute on function public.bes_list_supplemental_attendance(date,date) to authenticated;

comment on function public.bes_delete_supplemental_class(uuid) is
  'Permanently deletes one Học bổ sung class and all class-owned attendance/session data.';
