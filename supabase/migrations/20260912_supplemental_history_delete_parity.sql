-- 2026-09-12: give Học bổ sung the same destructive history action as Phụ đạo/Bồi dưỡng.
-- The supplemental session row is also the scheduled lesson, so deleting history resets
-- the lesson to scheduled instead of deleting the schedule itself.

create or replace function public.bes_delete_supplemental_attendance_history(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.bes_supplemental_sessions%rowtype;
  v_participant_count integer := 0;
  v_proof_path text := '';
begin
  if not public.can_delete_extra_attendance_history() then
    raise exception 'Bạn không có quyền xóa lịch sử điểm danh.' using errcode = '42501';
  end if;

  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'Không tìm thấy buổi Học bổ sung cần xóa lịch sử.' using errcode = 'P0002';
  end if;

  if v_session.status not in ('confirmed', 'cancelled') then
    raise exception 'Buổi Học bổ sung này chưa có lịch sử đã chốt để xóa.' using errcode = '22023';
  end if;

  v_proof_path := coalesce(v_session.proof_path, '');

  select count(*)::integer into v_participant_count
  from public.bes_supplemental_session_participants p
  where p.session_id = p_session_id;

  -- Recurring lessons rebuild their roster from the class membership on the next
  -- attendance attempt. Legacy adhoc lessons must retain their manually chosen roster.
  if v_session.kind = 'recurring' then
    delete from public.bes_supplemental_session_participants p
    where p.session_id = p_session_id;
  else
    update public.bes_supplemental_session_participants p
    set attendance_status = null,
        absence_reason_code = '',
        absence_note = '',
        recorded_at = null,
        updated_at = clock_timestamp()
    where p.session_id = p_session_id;
  end if;

  update public.bes_supplemental_sessions s
  set status = 'scheduled',
      cancellation_reason = '',
      roster_frozen_at = null,
      attendance_confirmed_at = null,
      checked_by = null,
      checked_by_name = '',
      session_note = '',
      proof_path = '',
      total_students = 0,
      present_count = 0,
      absent_count = 0,
      tardy_count = 0,
      lesson_periods = 1,
      updated_by = v_uid,
      updated_at = clock_timestamp()
  where s.id = p_session_id;

  return jsonb_build_object(
    'session_id', v_session.id,
    'group_id', v_session.group_id,
    'title', v_session.title,
    'attendance_date', v_session.attendance_date,
    'proof_path', v_proof_path,
    'reset_participants', v_participant_count,
    'status', 'scheduled'
  );
end;
$$;

revoke all on function public.bes_delete_supplemental_attendance_history(uuid) from public;
revoke all on function public.bes_delete_supplemental_attendance_history(uuid) from anon;
grant execute on function public.bes_delete_supplemental_attendance_history(uuid) to authenticated;
