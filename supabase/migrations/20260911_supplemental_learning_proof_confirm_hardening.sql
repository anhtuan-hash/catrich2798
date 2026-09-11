-- 2026-09-11: harden supplemental attendance proof persistence.
-- Keep the existing RPC signature for client compatibility, but never trust the
-- proof path sent by the confirm call. A non-empty proof path is persisted only
-- later by bes_attach_supplemental_proof(), after Storage object verification.

create or replace function public.bes_confirm_supplemental_attendance(
  p_session_id uuid,
  p_participants jsonb,
  p_session_note text default '',
  p_proof_path text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_session public.bes_supplemental_sessions%rowtype;
  v_profile public.profiles%rowtype;
  v_access jsonb;
  v_expected integer;
  v_payload_count integer;
  v_present integer;
  v_absent integer;
  v_tardy integer;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập để điểm danh.';
  end if;

  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id=p_session_id
  for update;

  if not found then raise exception 'Không tìm thấy buổi Học bổ sung.'; end if;
  if v_session.status='cancelled' then raise exception 'Buổi Học bổ sung đã bị hủy.'; end if;
  if v_session.status='confirmed' then raise exception 'Buổi Học bổ sung đã chốt điểm danh.'; end if;
  if v_session.roster_frozen_at is null or v_session.status<>'in_progress' then
    raise exception 'Hãy bắt đầu điểm danh để khóa danh sách học sinh trước.';
  end if;

  v_access:=private.bes_attendance_access_decision(v_session.id,v_session.teacher_name,clock_timestamp());
  if coalesce((v_access->>'allowed')::boolean,false) is not true then
    raise exception '%',coalesce(v_access->>'reason','attendance_not_allowed');
  end if;

  if jsonb_typeof(p_participants)<>'array' then
    raise exception 'Dữ liệu điểm danh không hợp lệ.';
  end if;

  select count(*) into v_expected
  from public.bes_supplemental_session_participants p
  where p.session_id=v_session.id;

  select count(*) into v_payload_count
  from jsonb_array_elements(p_participants);

  if v_payload_count<>v_expected then
    raise exception 'Dữ liệu điểm danh phải có đúng toàn bộ học sinh của danh sách đã khóa.';
  end if;

  if (select count(distinct x->>'participantId') from jsonb_array_elements(p_participants) x)<>v_expected then
    raise exception 'Mỗi học sinh chỉ được gửi một trạng thái điểm danh.';
  end if;

  if exists(
    select 1
    from jsonb_array_elements(p_participants) x
    left join public.bes_supplemental_session_participants p
      on p.id::text=x->>'participantId' and p.session_id=v_session.id
    where p.id is null or coalesce(x->>'status','') not in('present','absent','tardy')
  ) then
    raise exception 'Danh sách hoặc trạng thái điểm danh không hợp lệ.';
  end if;

  update public.bes_supplemental_session_participants p
  set attendance_status=x.status,
      absence_reason_code=case when x.status='absent' then x.absence_reason_code else '' end,
      absence_note=case when x.status='absent' then x.absence_note else '' end,
      recorded_at=clock_timestamp(),
      updated_at=clock_timestamp()
  from (
    select (j->>'participantId')::uuid participant_id,
           j->>'status' status,
           coalesce(j->>'absenceReasonCode','') absence_reason_code,
           coalesce(j->>'absenceNote','') absence_note
    from jsonb_array_elements(p_participants) j
  ) x
  where p.id=x.participant_id and p.session_id=v_session.id;

  select count(*) filter(where p.attendance_status='present'),
         count(*) filter(where p.attendance_status='absent'),
         count(*) filter(where p.attendance_status='tardy')
  into v_present,v_absent,v_tardy
  from public.bes_supplemental_session_participants p
  where p.session_id=v_session.id;

  if coalesce(v_present,0)+coalesce(v_absent,0)+coalesce(v_tardy,0)<>v_expected then
    raise exception 'Chưa có trạng thái hợp lệ cho toàn bộ học sinh.';
  end if;

  select * into v_profile from public.profiles p where p.id=v_uid;

  update public.bes_supplemental_sessions s
  set status='confirmed',
      attendance_confirmed_at=clock_timestamp(),
      checked_by=v_uid,
      checked_by_name=coalesce(v_profile.full_name,v_profile.email,''),
      session_note=btrim(coalesce(p_session_note,'')),
      proof_path='',
      total_students=v_expected,
      present_count=coalesce(v_present,0),
      absent_count=coalesce(v_absent,0),
      tardy_count=coalesce(v_tardy,0),
      updated_by=v_uid,
      updated_at=clock_timestamp()
  where s.id=v_session.id
  returning * into v_session;

  return jsonb_build_object(
    'session',to_jsonb(v_session),
    'participants',coalesce((
      select jsonb_agg(to_jsonb(p) order by p.full_name_snapshot)
      from public.bes_supplemental_session_participants p
      where p.session_id=v_session.id
    ),'[]'::jsonb),
    'serverNow',clock_timestamp()
  );
end;
$$;

revoke all on function public.bes_confirm_supplemental_attendance(uuid,jsonb,text,text) from public, anon;
grant execute on function public.bes_confirm_supplemental_attendance(uuid,jsonb,text,text) to authenticated;
