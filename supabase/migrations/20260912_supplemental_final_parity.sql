-- 2026-09-12: final Học bổ sung parity hardening.
-- Keep supplemental authorization/table ownership separate while matching the shared
-- Phụ đạo/Bồi dưỡng rollcall invariants and post-confirm correction experience.

-- -----------------------------------------------------------------------------
-- 1. Complete assigned-teacher choices for one supplemental session.
-- -----------------------------------------------------------------------------
create or replace function public.bes_list_supplemental_session_teachers(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.bes_supplemental_sessions%rowtype;
  v_rows jsonb := '[]'::jsonb;
begin
  perform private.bes_require_supplemental_manager();

  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception 'Không tìm thấy buổi Học bổ sung.' using errcode = 'P0002';
  end if;

  if v_session.group_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'teacherId', t.teacher_id,
      'fullName', t.teacher_name,
      'email', t.teacher_email,
      'position', t.position
    ) order by t.position, t.teacher_name), '[]'::jsonb)
    into v_rows
    from public.bes_supplemental_group_teachers t
    where t.group_id = v_session.group_id;
  end if;

  if jsonb_array_length(v_rows) = 0 and nullif(btrim(v_session.teacher_name), '') is not null then
    v_rows := jsonb_build_array(jsonb_build_object(
      'id', null,
      'teacherId', v_session.teacher_id,
      'fullName', btrim(v_session.teacher_name),
      'email', btrim(coalesce(v_session.teacher_email, '')),
      'position', 1
    ));
  end if;

  return v_rows;
end;
$$;

revoke all on function public.bes_list_supplemental_session_teachers(uuid) from public, anon;
grant execute on function public.bes_list_supplemental_session_teachers(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Server-authoritative shared-rollcall invariants.
-- -----------------------------------------------------------------------------
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
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_result jsonb;
  v_session public.bes_supplemental_sessions%rowtype;
  v_teacher_row public.bes_supplemental_group_teachers%rowtype;
  v_teacher_name text;
  v_room text;
  v_start_time time;
  v_end_time time;
begin
  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'Không tìm thấy buổi Học bổ sung.' using errcode = 'P0002';
  end if;

  if coalesce(p_lesson_periods, 1) not in (1, 1.5, 2) then
    raise exception 'Số tiết chỉ được là 1, 1.5 hoặc 2.' using errcode = '22023';
  end if;

  v_teacher_name := coalesce(nullif(btrim(coalesce(p_teacher_name, '')), ''), nullif(btrim(v_session.teacher_name), ''));
  v_room := coalesce(nullif(btrim(coalesce(p_room, '')), ''), nullif(btrim(v_session.room), ''));
  v_start_time := coalesce(p_start_time, v_session.start_time);
  v_end_time := coalesce(p_end_time, v_session.end_time);

  if v_teacher_name is null then
    raise exception 'Vui lòng chọn giáo viên dạy hôm nay.' using errcode = '22023';
  end if;
  if v_room is null then
    raise exception 'Vui lòng nhập phòng học.' using errcode = '22023';
  end if;
  if v_start_time is null or v_end_time is null then
    raise exception 'Vui lòng nhập thời gian dạy.' using errcode = '22023';
  end if;
  if v_start_time >= v_end_time then
    raise exception 'Giờ kết thúc phải sau giờ bắt đầu.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_participants, '[]'::jsonb)) <> 'array' then
    raise exception 'Danh sách điểm danh không hợp lệ.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_participants, '[]'::jsonb)) as x(
      "participantId" uuid,
      status text,
      "absenceReasonCode" text,
      "absenceNote" text
    )
    where lower(btrim(coalesce(x.status, ''))) not in ('present', 'tardy', 'absent')
       or (
         lower(btrim(coalesce(x.status, ''))) = 'absent'
         and btrim(coalesce(x."absenceReasonCode", '')) not in ('excused', 'unexcused', 'sick', 'family', 'other', 'unspecified')
       )
       or (
         lower(btrim(coalesce(x.status, ''))) = 'absent'
         and btrim(coalesce(x."absenceReasonCode", '')) = 'other'
         and btrim(coalesce(x."absenceNote", '')) = ''
       )
       or (
         lower(btrim(coalesce(x.status, ''))) in ('present', 'tardy')
         and (btrim(coalesce(x."absenceReasonCode", '')) <> '' or btrim(coalesce(x."absenceNote", '')) <> '')
       )
  ) then
    raise exception 'Trạng thái hoặc lý do vắng không hợp lệ; lý do Khác phải có ghi chú.' using errcode = '22023';
  end if;

  -- If the recurring class has normalized teacher assignments, the chosen teacher
  -- must be one of them. Teacher metadata never grants supplemental access.
  if v_session.group_id is not null and exists (
    select 1 from public.bes_supplemental_group_teachers t where t.group_id = v_session.group_id
  ) then
    select * into v_teacher_row
    from public.bes_supplemental_group_teachers t
    where t.group_id = v_session.group_id
      and lower(btrim(t.teacher_name)) = lower(v_teacher_name)
    order by t.position, t.teacher_name
    limit 1;

    if not found then
      raise exception 'Giáo viên đã chọn không thuộc phân công của lớp Học bổ sung.' using errcode = '22023';
    end if;
  end if;

  -- Match the global teacher/day lock across both attendance sources.
  if exists (
    select 1
    from public.bes_extra_attendance_sessions e
    where e.attendance_date = v_session.attendance_date
      and e.session_status = 'completed'
      and lower(btrim(e.teacher_name)) = lower(v_teacher_name)
  ) or exists (
    select 1
    from public.bes_supplemental_sessions s
    where s.id <> v_session.id
      and s.attendance_date = v_session.attendance_date
      and s.status = 'confirmed'
      and lower(btrim(s.teacher_name)) = lower(v_teacher_name)
  ) then
    raise exception 'Giáo viên % đã được chốt điểm danh ở một lớp khác ngày %.',
      v_teacher_name, to_char(v_session.attendance_date, 'DD/MM/YYYY')
      using errcode = '23505';
  end if;

  -- Reuse the hardened base confirmation for exact-roster validation, counts,
  -- proof semantics, actor snapshots and strict supplemental authorization.
  v_result := public.bes_confirm_supplemental_attendance(
    p_session_id,
    coalesce(p_participants, '[]'::jsonb),
    coalesce(p_session_note, ''),
    coalesce(p_proof_path, '')
  );

  update public.bes_supplemental_sessions
  set lesson_periods = coalesce(p_lesson_periods, 1),
      teacher_id = coalesce(v_teacher_row.teacher_id, teacher_id),
      teacher_name = v_teacher_name,
      teacher_email = case when v_teacher_row.id is not null then coalesce(v_teacher_row.teacher_email, '') else teacher_email end,
      room = v_room,
      start_time = v_start_time,
      end_time = v_end_time,
      updated_by = v_uid,
      updated_at = clock_timestamp()
  where id = p_session_id
  returning * into v_session;

  return jsonb_set(coalesce(v_result, '{}'::jsonb), '{session}', to_jsonb(v_session), true);
end;
$$;

revoke all on function public.bes_confirm_supplemental_attendance_v2(uuid,jsonb,text,text,numeric,text,text,time,time) from public, anon;
grant execute on function public.bes_confirm_supplemental_attendance_v2(uuid,jsonb,text,text,numeric,text,text,time,time) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Dedicated supplemental audit trail for post-confirm corrections.
-- -----------------------------------------------------------------------------
create table if not exists public.bes_supplemental_attendance_record_changes (
  id bigint generated by default as identity primary key,
  session_id uuid not null references public.bes_supplemental_sessions(id) on delete cascade,
  participant_id uuid references public.bes_supplemental_session_participants(id) on delete cascade,
  group_id uuid references public.bes_supplemental_groups(id) on delete set null,
  canonical_student_key text not null default '',
  student_full_name text not null default '',
  change_kind text not null default 'record' check (change_kind in ('record', 'session_note')),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_by_name text not null default '',
  changed_at timestamptz not null default clock_timestamp(),
  old_status text not null default '',
  new_status text not null default '',
  old_absence_reason_code text not null default '',
  new_absence_reason_code text not null default '',
  old_absence_note text not null default '',
  new_absence_note text not null default '',
  session_note_before text not null default '',
  session_note_after text not null default ''
);

create index if not exists bes_supplemental_attendance_changes_session_idx
  on public.bes_supplemental_attendance_record_changes (session_id, changed_at desc);
create index if not exists bes_supplemental_attendance_changes_participant_idx
  on public.bes_supplemental_attendance_record_changes (participant_id, changed_at desc)
  where participant_id is not null;

alter table public.bes_supplemental_attendance_record_changes enable row level security;
revoke all on table public.bes_supplemental_attendance_record_changes from public, anon, authenticated;

create or replace function private.bes_supplemental_attendance_edit_decision(
  p_session_id uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_session public.bes_supplemental_sessions%rowtype;
  v_now timestamptz := coalesce(p_now, clock_timestamp());
  v_expires_at timestamptz;
  v_remaining_seconds integer := 0;
  v_is_admin boolean := false;
  v_has_report boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_authenticated', 'server_now', v_now);
  end if;

  if not private.bes_is_supplemental_manager() then
    return jsonb_build_object('allowed', false, 'reason', 'supplemental_not_allowed', 'server_now', v_now);
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_uid and p.approved = true;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'profile_not_approved', 'server_now', v_now);
  end if;

  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id = p_session_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'session_not_found', 'server_now', v_now);
  end if;

  if v_session.status <> 'confirmed' then
    return jsonb_build_object('allowed', false, 'reason', 'not_completed', 'session_id', v_session.id, 'server_now', v_now);
  end if;

  if v_session.attendance_confirmed_at is null then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_checked_at', 'session_id', v_session.id, 'server_now', v_now);
  end if;

  v_expires_at := v_session.attendance_confirmed_at + interval '30 minutes';
  v_remaining_seconds := greatest(0, floor(extract(epoch from (v_expires_at - v_now)))::integer);
  v_is_admin := lower(coalesce(v_profile.role, '')) in ('admin', 'administrator');
  v_has_report := coalesce(v_profile.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:report';

  if v_is_admin or v_has_report then
    return jsonb_build_object(
      'allowed', true,
      'reason', case when v_is_admin then 'admin_bypass' else 'report_bypass' end,
      'bypass', true,
      'session_id', v_session.id,
      'checked_at', v_session.attendance_confirmed_at,
      'expires_at', v_expires_at,
      'remaining_seconds', v_remaining_seconds,
      'server_now', v_now
    );
  end if;

  if v_session.checked_by is distinct from v_uid then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'not_session_teacher',
      'session_id', v_session.id,
      'expires_at', v_expires_at,
      'remaining_seconds', v_remaining_seconds,
      'server_now', v_now
    );
  end if;

  if v_now > v_expires_at then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'edit_window_expired',
      'session_id', v_session.id,
      'checked_at', v_session.attendance_confirmed_at,
      'expires_at', v_expires_at,
      'remaining_seconds', 0,
      'server_now', v_now
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'within_edit_window',
    'bypass', false,
    'session_id', v_session.id,
    'checked_at', v_session.attendance_confirmed_at,
    'expires_at', v_expires_at,
    'remaining_seconds', v_remaining_seconds,
    'server_now', v_now
  );
end;
$$;

create or replace function public.bes_get_supplemental_attendance_edit_snapshot(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access jsonb;
  v_session public.bes_supplemental_sessions%rowtype;
  v_records jsonb := '[]'::jsonb;
  v_latest_change jsonb := '{}'::jsonb;
begin
  perform private.bes_require_supplemental_manager();
  v_access := private.bes_supplemental_attendance_edit_decision(p_session_id, clock_timestamp());

  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id = p_session_id;

  if not found then
    return jsonb_build_object('access', v_access, 'session', null, 'records', '[]'::jsonb, 'latestChange', '{}'::jsonb);
  end if;

  if coalesce((v_access ->> 'allowed')::boolean, false) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'session_id', p.session_id,
      'class_id', 'supplemental:' || coalesce(v_session.group_id::text, v_session.id::text),
      'member_id', p.student_id,
      'member_key', p.canonical_student_key,
      'student_code', p.student_code_snapshot,
      'student_full_name', p.full_name_snapshot,
      'school_class_name', p.school_class_snapshot,
      'status', case when p.attendance_status = 'tardy' then 'late' else p.attendance_status end,
      'absence_reason_code', p.absence_reason_code,
      'absence_note', p.absence_note
    ) order by p.full_name_snapshot), '[]'::jsonb)
    into v_records
    from public.bes_supplemental_session_participants p
    where p.session_id = p_session_id;
  end if;

  select coalesce(to_jsonb(c), '{}'::jsonb)
  into v_latest_change
  from public.bes_supplemental_attendance_record_changes c
  where c.session_id = p_session_id
  order by c.changed_at desc
  limit 1;

  return jsonb_build_object(
    'access', v_access,
    'session', jsonb_build_object(
      'id', v_session.id,
      'class_id', 'supplemental:' || coalesce(v_session.group_id::text, v_session.id::text),
      'class_name', coalesce(nullif(v_session.title, ''), 'Học bổ sung'),
      'subject', v_session.subject,
      'teacher_name', v_session.teacher_name,
      'attendance_date', v_session.attendance_date,
      'checked_at', v_session.attendance_confirmed_at,
      'checked_by', v_session.checked_by,
      'checked_by_name', v_session.checked_by_name,
      'total_students', v_session.total_students,
      'present_count', v_session.present_count + v_session.tardy_count,
      'absent_count', v_session.absent_count,
      'note', v_session.session_note,
      'session_status', case when v_session.status = 'confirmed' then 'completed' else v_session.status end
    ),
    'records', v_records,
    'latestChange', coalesce(v_latest_change, '{}'::jsonb)
  );
end;
$$;

create or replace function public.bes_update_supplemental_attendance_session(
  p_session_id uuid,
  p_records jsonb,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_profile public.profiles%rowtype;
  v_session public.bes_supplemental_sessions%rowtype;
  v_decision jsonb;
  v_records jsonb := coalesce(p_records, '[]'::jsonb);
  v_participant public.bes_supplemental_session_participants%rowtype;
  v_item record;
  v_input_count integer := 0;
  v_distinct_count integer := 0;
  v_actual_count integer := 0;
  v_unknown_count integer := 0;
  v_present integer := 0;
  v_tardy integer := 0;
  v_absent integer := 0;
  v_new_status text;
  v_new_reason text;
  v_new_note text;
  v_session_note_before text := '';
  v_session_note_after text := btrim(coalesce(p_note, ''));
  v_changed_at timestamptz := clock_timestamp();
begin
  v_decision := private.bes_supplemental_attendance_edit_decision(p_session_id, v_changed_at);
  if not coalesce((v_decision ->> 'allowed')::boolean, false) then
    case coalesce(v_decision ->> 'reason', '')
      when 'edit_window_expired' then
        raise exception 'Đã hết 30 phút điều chỉnh kể từ lúc chốt điểm danh.' using errcode = '42501';
      when 'not_session_teacher' then
        raise exception 'Chỉ người đã chốt buổi điểm danh này mới được điều chỉnh trong thời gian cho phép.' using errcode = '42501';
      when 'not_completed' then
        raise exception 'Chỉ buổi Học bổ sung đã chốt mới có thể điều chỉnh.' using errcode = '22023';
      else
        raise exception 'Bạn không có quyền điều chỉnh buổi Học bổ sung này.' using errcode = '42501';
    end case;
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_uid and p.approved = true;

  if not found then
    raise exception 'Tài khoản chưa được duyệt.' using errcode = '42501';
  end if;

  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'Không tìm thấy buổi Học bổ sung.' using errcode = 'P0002';
  end if;

  if jsonb_typeof(v_records) <> 'array' then
    raise exception 'Danh sách điều chỉnh không hợp lệ.' using errcode = '22023';
  end if;

  select count(*)::integer into v_actual_count
  from public.bes_supplemental_session_participants p
  where p.session_id = p_session_id;

  select count(*)::integer, count(distinct x."participantId")::integer
  into v_input_count, v_distinct_count
  from jsonb_to_recordset(v_records) as x(
    "participantId" uuid,
    status text,
    "absenceReasonCode" text,
    "absenceNote" text
  );

  if v_input_count <> v_actual_count or v_input_count <> v_distinct_count then
    raise exception 'Danh sách điều chỉnh phải chứa đúng một trạng thái cho mỗi học sinh của buổi học.' using errcode = '22023';
  end if;

  select count(*)::integer into v_unknown_count
  from jsonb_to_recordset(v_records) as x(
    "participantId" uuid,
    status text,
    "absenceReasonCode" text,
    "absenceNote" text
  )
  where x."participantId" is null
     or not exists (
       select 1
       from public.bes_supplemental_session_participants p
       where p.id = x."participantId" and p.session_id = p_session_id
     );

  if v_unknown_count > 0 then
    raise exception 'Danh sách điều chỉnh có học sinh không thuộc buổi Học bổ sung này.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_records) as x(
      "participantId" uuid,
      status text,
      "absenceReasonCode" text,
      "absenceNote" text
    )
    where lower(btrim(coalesce(x.status, ''))) not in ('present', 'tardy', 'absent')
       or (
         lower(btrim(coalesce(x.status, ''))) = 'absent'
         and btrim(coalesce(x."absenceReasonCode", '')) not in ('excused', 'unexcused', 'sick', 'family', 'other', 'unspecified')
       )
       or (
         lower(btrim(coalesce(x.status, ''))) = 'absent'
         and btrim(coalesce(x."absenceReasonCode", '')) = 'other'
         and btrim(coalesce(x."absenceNote", '')) = ''
       )
       or (
         lower(btrim(coalesce(x.status, ''))) in ('present', 'tardy')
         and (btrim(coalesce(x."absenceReasonCode", '')) <> '' or btrim(coalesce(x."absenceNote", '')) <> '')
       )
  ) then
    raise exception 'Trạng thái hoặc lý do vắng không hợp lệ; Đi trễ không thể đồng thời là Vắng.' using errcode = '22023';
  end if;

  v_session_note_before := coalesce(v_session.session_note, '');

  for v_item in
    select *
    from jsonb_to_recordset(v_records) as x(
      "participantId" uuid,
      status text,
      "absenceReasonCode" text,
      "absenceNote" text
    )
  loop
    select * into v_participant
    from public.bes_supplemental_session_participants p
    where p.id = v_item."participantId" and p.session_id = p_session_id
    for update;

    v_new_status := lower(btrim(coalesce(v_item.status, '')));
    if v_new_status in ('present', 'tardy') then
      v_new_reason := '';
      v_new_note := '';
    else
      v_new_reason := btrim(coalesce(v_item."absenceReasonCode", ''));
      v_new_note := btrim(coalesce(v_item."absenceNote", ''));
    end if;

    if coalesce(v_participant.attendance_status, '') is distinct from v_new_status
       or coalesce(v_participant.absence_reason_code, '') is distinct from v_new_reason
       or coalesce(v_participant.absence_note, '') is distinct from v_new_note then
      insert into public.bes_supplemental_attendance_record_changes (
        session_id, participant_id, group_id, canonical_student_key, student_full_name,
        change_kind, changed_by, changed_by_name, changed_at,
        old_status, new_status,
        old_absence_reason_code, new_absence_reason_code,
        old_absence_note, new_absence_note,
        session_note_before, session_note_after
      ) values (
        v_session.id, v_participant.id, v_session.group_id, v_participant.canonical_student_key, v_participant.full_name_snapshot,
        'record', v_uid, coalesce(v_profile.full_name, v_profile.email, ''), v_changed_at,
        coalesce(v_participant.attendance_status, ''), v_new_status,
        coalesce(v_participant.absence_reason_code, ''), v_new_reason,
        coalesce(v_participant.absence_note, ''), v_new_note,
        v_session_note_before, v_session_note_after
      );

      update public.bes_supplemental_session_participants
      set attendance_status = v_new_status,
          absence_reason_code = v_new_reason,
          absence_note = v_new_note,
          updated_at = v_changed_at
      where id = v_participant.id;
    end if;
  end loop;

  if v_session_note_before is distinct from v_session_note_after then
    insert into public.bes_supplemental_attendance_record_changes (
      session_id, participant_id, group_id, canonical_student_key, student_full_name,
      change_kind, changed_by, changed_by_name, changed_at,
      old_status, new_status,
      old_absence_reason_code, new_absence_reason_code,
      old_absence_note, new_absence_note,
      session_note_before, session_note_after
    ) values (
      v_session.id, null, v_session.group_id, '', '',
      'session_note', v_uid, coalesce(v_profile.full_name, v_profile.email, ''), v_changed_at,
      '', '', '', '', '', '',
      v_session_note_before, v_session_note_after
    );
  end if;

  select
    count(*) filter (where p.attendance_status = 'present')::integer,
    count(*) filter (where p.attendance_status = 'tardy')::integer,
    count(*) filter (where p.attendance_status = 'absent')::integer
  into v_present, v_tardy, v_absent
  from public.bes_supplemental_session_participants p
  where p.session_id = p_session_id;

  update public.bes_supplemental_sessions
  set total_students = v_present + v_tardy + v_absent,
      present_count = v_present,
      tardy_count = v_tardy,
      absent_count = v_absent,
      session_note = v_session_note_after,
      updated_by = v_uid,
      updated_at = v_changed_at
  where id = p_session_id
  returning * into v_session;

  -- attendance_confirmed_at is intentionally untouched: a correction must never
  -- restart or extend the original 30-minute edit window.
  return jsonb_build_object('session', to_jsonb(v_session), 'access', v_decision);
end;
$$;

revoke all on function private.bes_supplemental_attendance_edit_decision(uuid,timestamptz) from public, anon;
revoke all on function public.bes_get_supplemental_attendance_edit_snapshot(uuid) from public, anon;
revoke all on function public.bes_update_supplemental_attendance_session(uuid,jsonb,text) from public, anon;
grant execute on function private.bes_supplemental_attendance_edit_decision(uuid,timestamptz) to authenticated;
grant execute on function public.bes_get_supplemental_attendance_edit_snapshot(uuid) to authenticated;
grant execute on function public.bes_update_supplemental_attendance_session(uuid,jsonb,text) to authenticated;

-- Deleting supplemental attendance history resets the same scheduled session row.
-- Clear its correction audit when that reset happens so a future attendance cycle
-- never displays stale correction history.
create or replace function private.bes_clear_supplemental_edit_audit_on_reset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('confirmed', 'cancelled')
     and new.status = 'scheduled'
     and new.attendance_confirmed_at is null then
    delete from public.bes_supplemental_attendance_record_changes c
    where c.session_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists bes_supplemental_clear_edit_audit_on_reset on public.bes_supplemental_sessions;
create trigger bes_supplemental_clear_edit_audit_on_reset
after update of status, attendance_confirmed_at on public.bes_supplemental_sessions
for each row execute function private.bes_clear_supplemental_edit_audit_on_reset();

comment on table public.bes_supplemental_attendance_record_changes is
  'Audit trail for post-confirm Học bổ sung attendance corrections.';
comment on function public.bes_update_supplemental_attendance_session(uuid,jsonb,text) is
  'Updates a confirmed Học bổ sung snapshot without changing attendance_confirmed_at.';
