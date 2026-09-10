-- 2026-09-10: add a first-class tardy/late attendance status.
-- A late student is present for attendance totals/rates, but remains separately
-- identifiable in records, history and reports. Late and absent are exclusive.

alter table public.bes_extra_attendance_records
  drop constraint if exists bes_extra_attendance_records_status_check;

alter table public.bes_extra_attendance_records
  add constraint bes_extra_attendance_records_status_check
  check (status in ('present', 'late', 'absent'));

alter table public.bes_extra_attendance_records
  drop constraint if exists bes_extra_attendance_records_absence_reason_check;

alter table public.bes_extra_attendance_records
  add constraint bes_extra_attendance_records_absence_reason_check
  check (
    (
      status in ('present', 'late')
      and absence_reason_code = ''
      and absence_note = ''
    )
    or
    (
      status = 'absent'
      and absence_reason_code in ('excused', 'unexcused', 'sick', 'family', 'other', 'unspecified')
      and (absence_reason_code <> 'other' or length(trim(absence_note)) > 0)
    )
  );

-- Replace the old 8-argument RPC with a backward-compatible 9-argument RPC.
-- The final argument has a default, so existing clients that do not send late
-- students continue to work and treat everyone non-absent as present.
drop function if exists public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text);

create function public.bes_confirm_extra_class_attendance(
  p_class_id uuid,
  p_attendance_date date,
  p_teacher_name text,
  p_lesson_periods numeric,
  p_absence_details jsonb,
  p_note text,
  p_teaching_room text,
  p_teaching_time_range text,
  p_late_member_keys text[] default '{}'::text[]
)
returns public.bes_extra_attendance_sessions
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_teacher_conflict public.bes_extra_attendance_sessions%rowtype;
  v_checked_at timestamptz := clock_timestamp();
  v_today date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_teacher_name text := trim(coalesce(p_teacher_name, ''));
  v_checked_by_name text := '';
  v_room text := trim(coalesce(p_teaching_room, ''));
  v_time text := trim(coalesce(p_teaching_time_range, ''));
  v_details jsonb := coalesce(p_absence_details, '[]'::jsonb);
  v_absent_keys text[] := '{}'::text[];
  v_late_keys text[] := '{}'::text[];
  v_total integer := 0;
  v_absent integer := 0;
  v_unknown integer := 0;
  v_detail_count integer := 0;
  v_distinct_count integer := 0;
  v_late_input_count integer := 0;
  v_late_distinct_count integer := 0;
begin
  if not public.bes_can_operate_extra_class_attendance(p_class_id, p_teacher_name, clock_timestamp()) then
    raise exception 'Bạn không có quyền điểm danh lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.email), ''), auth.uid()::text, '')
    into v_checked_by_name
  from public.profiles p
  where p.id = auth.uid()
    and p.approved = true;
  v_checked_by_name := coalesce(v_checked_by_name, auth.uid()::text, '');

  if p_attendance_date is null then
    raise exception 'Vui lòng chọn ngày điểm danh.' using errcode = '22004';
  end if;
  if p_attendance_date > v_today then
    raise exception 'Không thể điểm danh cho ngày tương lai theo giờ Việt Nam.' using errcode = '22008';
  end if;
  if v_teacher_name = '' then
    raise exception 'Vui lòng chọn giáo viên dạy hôm nay.' using errcode = '22023';
  end if;
  if p_lesson_periods is null or p_lesson_periods not in (1, 1.5, 2) then
    raise exception 'Số tiết phải là 1, 1,5 hoặc 2.' using errcode = '22023';
  end if;
  if v_room = '' then
    raise exception 'Vui lòng nhập phòng học.' using errcode = '22023';
  end if;
  if v_time = '' then
    raise exception 'Vui lòng nhập thời gian dạy.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_details) <> 'array' then
    raise exception 'Dữ liệu lý do vắng không hợp lệ.' using errcode = '22023';
  end if;

  select * into v_class
  from public.bes_extra_classes
  where id = p_class_id
    and active = true
  for update;
  if not found then
    raise exception 'Không tìm thấy lớp phụ đạo/bồi dưỡng đang hoạt động.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.bes_extra_class_teachers t
    where t.class_id = p_class_id
      and lower(trim(t.teacher_name)) = lower(v_teacher_name)
  ) and not exists (
    select 1
    from regexp_split_to_table(coalesce(v_class.teacher_name, ''), '\s*,\s*') as fallback_teacher(name)
    where lower(trim(fallback_teacher.name)) = lower(v_teacher_name)
  ) then
    raise exception 'Giáo viên không thuộc phân công của lớp.' using errcode = '22023';
  end if;

  select s.* into v_teacher_conflict
  from public.bes_extra_attendance_sessions s
  where s.attendance_date = p_attendance_date
    and s.session_status = 'completed'
    and lower(trim(s.teacher_name)) = lower(v_teacher_name)
    and s.class_id <> p_class_id
  order by s.checked_at asc
  limit 1;
  if found then
    raise exception 'Giáo viên % đã được điểm danh tại lớp % ngày %.',
      v_teacher_name, v_teacher_conflict.class_name, to_char(p_attendance_date, 'DD/MM/YYYY')
      using errcode = '23505';
  end if;

  if exists (
    select 1 from public.bes_extra_attendance_sessions s
    where s.class_id = p_class_id and s.attendance_date = p_attendance_date
  ) then
    raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end if;

  select count(*), count(distinct trim(x.member_key))
    into v_detail_count, v_distinct_count
  from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text);
  if v_detail_count <> v_distinct_count then
    raise exception 'Danh sách vắng có học sinh bị lặp.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text)
    where trim(coalesce(x.member_key, '')) = ''
      or trim(coalesce(x.reason_code, '')) not in ('excused', 'unexcused', 'sick', 'family', 'other')
      or (trim(coalesce(x.reason_code, '')) = 'other' and trim(coalesce(x.note, '')) = '')
  ) then
    raise exception 'Mỗi học sinh vắng phải có lý do hợp lệ; lý do Khác phải có ghi chú.' using errcode = '22023';
  end if;

  select count(*)::integer into v_unknown
  from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text)
  where not exists (
    select 1 from public.bes_extra_class_members m
    where m.class_id = p_class_id and m.active = true and m.member_key = trim(x.member_key)
  );
  if v_unknown > 0 then
    raise exception 'Danh sách vắng có học sinh không còn thuộc lớp. Hãy tải lại danh sách trước khi điểm danh.' using errcode = '40001';
  end if;

  select coalesce(array_agg(trim(x.member_key)), '{}'::text[])
    into v_absent_keys
  from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text);

  select count(*)::integer, count(distinct trim(k))::integer
    into v_late_input_count, v_late_distinct_count
  from unnest(coalesce(p_late_member_keys, '{}'::text[])) as late(k)
  where trim(coalesce(k, '')) <> '';

  if v_late_input_count <> v_late_distinct_count then
    raise exception 'Danh sách đi trễ có học sinh bị lặp.' using errcode = '22023';
  end if;

  select coalesce(array_agg(trim(k)), '{}'::text[])
    into v_late_keys
  from unnest(coalesce(p_late_member_keys, '{}'::text[])) as late(k)
  where trim(coalesce(k, '')) <> '';

  if exists (
    select 1 from unnest(v_late_keys) as late(member_key)
    where late.member_key = any(v_absent_keys)
  ) then
    raise exception 'Một học sinh không thể đồng thời Đi trễ và Vắng.' using errcode = '22023';
  end if;

  select count(*)::integer into v_unknown
  from unnest(v_late_keys) as late(member_key)
  where not exists (
    select 1 from public.bes_extra_class_members m
    where m.class_id = p_class_id and m.active = true and m.member_key = late.member_key
  );
  if v_unknown > 0 then
    raise exception 'Danh sách đi trễ có học sinh không còn thuộc lớp. Hãy tải lại danh sách trước khi điểm danh.' using errcode = '40001';
  end if;

  select count(*)::integer into v_total
  from public.bes_extra_class_members m
  where m.class_id = p_class_id and m.active = true;
  v_absent := coalesce(array_length(v_absent_keys, 1), 0);

  begin
    insert into public.bes_extra_attendance_sessions (
      class_id, class_type, class_name, subject,
      teacher_id, teacher_name, teacher_email,
      attendance_date, checked_at, checked_by, checked_by_name,
      total_students, present_count, absent_count,
      note, session_status, lesson_periods, cancellation_reason,
      teaching_room, teaching_time_range
    ) values (
      v_class.id, v_class.class_type, v_class.class_name, v_class.subject,
      null, v_teacher_name, '',
      p_attendance_date, v_checked_at, auth.uid(), v_checked_by_name,
      v_total, v_total - v_absent, v_absent,
      coalesce(trim(p_note), ''), 'completed', p_lesson_periods, '',
      v_room, v_time
    ) returning * into v_session;
  exception when unique_violation then
    select s.* into v_teacher_conflict
    from public.bes_extra_attendance_sessions s
    where s.attendance_date = p_attendance_date
      and s.session_status = 'completed'
      and lower(trim(s.teacher_name)) = lower(v_teacher_name)
      and s.class_id <> p_class_id
    order by s.checked_at asc limit 1;
    if found then
      raise exception 'Giáo viên % đã được điểm danh tại lớp % ngày %.',
        v_teacher_name, v_teacher_conflict.class_name, to_char(p_attendance_date, 'DD/MM/YYYY')
        using errcode = '23505';
    end if;
    raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end;

  insert into public.bes_extra_attendance_records (
    session_id, class_id, member_id, member_key,
    student_code, student_full_name, school_class_name,
    status, recorded_at, absence_reason_code, absence_note
  )
  select
    v_session.id, m.class_id, m.id, m.member_key,
    m.student_code, m.student_full_name, m.school_class_name,
    case
      when d.member_key is not null then 'absent'
      when m.member_key = any(v_late_keys) then 'late'
      else 'present'
    end,
    v_checked_at,
    case when d.member_key is null then '' else trim(d.reason_code) end,
    case when d.member_key is null then '' else trim(coalesce(d.note, '')) end
  from public.bes_extra_class_members m
  left join lateral (
    select x.member_key, x.reason_code, x.note
    from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text)
    where trim(x.member_key) = m.member_key
    limit 1
  ) d on true
  where m.class_id = p_class_id and m.active = true;

  return v_session;
end;
$$;

revoke all on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text,text[]) from public;
revoke all on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text,text[]) from anon;
grant execute on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text,text[]) to authenticated;

create or replace function public.bes_update_extra_attendance_session(
  p_session_id uuid,
  p_records jsonb,
  p_note text default ''
)
returns public.bes_extra_attendance_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_decision jsonb;
  v_records jsonb := coalesce(p_records, '[]'::jsonb);
  v_record public.bes_extra_attendance_records%rowtype;
  v_item record;
  v_input_count integer := 0;
  v_distinct_count integer := 0;
  v_actual_count integer := 0;
  v_unknown_count integer := 0;
  v_present integer := 0;
  v_absent integer := 0;
  v_new_status text;
  v_new_reason text;
  v_new_note text;
  v_session_note_before text := '';
  v_session_note_after text := trim(coalesce(p_note, ''));
  v_changed_at timestamptz := clock_timestamp();
begin
  v_decision := private.bes_extra_attendance_edit_decision(p_session_id, v_changed_at);
  if not coalesce((v_decision ->> 'allowed')::boolean, false) then
    case coalesce(v_decision ->> 'reason', '')
      when 'edit_window_expired' then
        raise exception 'Đã hết 30 phút điều chỉnh kể từ lúc chốt điểm danh.' using errcode = '42501';
      when 'not_session_teacher' then
        raise exception 'Chỉ giáo viên đã chốt buổi điểm danh này mới được điều chỉnh.' using errcode = '42501';
      when 'missing_permission' then
        raise exception 'Bạn không có quyền Điểm danh nhanh.' using errcode = '42501';
      when 'not_completed' then
        raise exception 'Chỉ buổi đã điểm danh mới có thể điều chỉnh.' using errcode = '22023';
      else
        raise exception 'Bạn không có quyền điều chỉnh buổi điểm danh này.' using errcode = '42501';
    end case;
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_uid
    and p.approved = true;

  if not found then
    raise exception 'Tài khoản chưa được duyệt.' using errcode = '42501';
  end if;

  select * into v_session
  from public.bes_extra_attendance_sessions s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'Không tìm thấy buổi điểm danh.' using errcode = 'P0002';
  end if;

  if jsonb_typeof(v_records) <> 'array' then
    raise exception 'Danh sách điều chỉnh không hợp lệ.' using errcode = '22023';
  end if;

  select count(*)::integer into v_actual_count
  from public.bes_extra_attendance_records r
  where r.session_id = p_session_id;

  select count(*)::integer,
         count(distinct x.record_id)::integer
    into v_input_count, v_distinct_count
  from jsonb_to_recordset(v_records) as x(
    record_id uuid,
    status text,
    reason_code text,
    note text
  );

  if v_input_count <> v_actual_count or v_input_count <> v_distinct_count then
    raise exception 'Danh sách điều chỉnh phải chứa đúng một trạng thái cho mỗi học sinh của buổi học.' using errcode = '22023';
  end if;

  select count(*)::integer into v_unknown_count
  from jsonb_to_recordset(v_records) as x(record_id uuid, status text, reason_code text, note text)
  where x.record_id is null
     or not exists (
       select 1
       from public.bes_extra_attendance_records r
       where r.id = x.record_id
         and r.session_id = p_session_id
     );

  if v_unknown_count > 0 then
    raise exception 'Danh sách điều chỉnh có học sinh không thuộc buổi điểm danh này.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_records) as x(record_id uuid, status text, reason_code text, note text)
    where trim(coalesce(x.status, '')) not in ('present', 'late', 'absent')
       or (
         trim(coalesce(x.status, '')) = 'absent'
         and trim(coalesce(x.reason_code, '')) not in ('excused', 'unexcused', 'sick', 'family', 'other', 'unspecified')
       )
       or (
         trim(coalesce(x.status, '')) = 'absent'
         and trim(coalesce(x.reason_code, '')) = 'other'
         and trim(coalesce(x.note, '')) = ''
       )
       or (
         trim(coalesce(x.status, '')) in ('present', 'late')
         and (trim(coalesce(x.reason_code, '')) <> '' or trim(coalesce(x.note, '')) <> '')
       )
  ) then
    raise exception 'Trạng thái hoặc lý do vắng không hợp lệ; Đi trễ không thể đồng thời là Vắng.' using errcode = '22023';
  end if;

  v_session_note_before := coalesce(v_session.note, '');

  for v_item in
    select *
    from jsonb_to_recordset(v_records) as x(record_id uuid, status text, reason_code text, note text)
  loop
    select * into v_record
    from public.bes_extra_attendance_records r
    where r.id = v_item.record_id
      and r.session_id = p_session_id
    for update;

    v_new_status := trim(coalesce(v_item.status, ''));
    if v_new_status in ('present', 'late') then
      v_new_reason := '';
      v_new_note := '';
    else
      v_new_reason := trim(coalesce(v_item.reason_code, ''));
      v_new_note := trim(coalesce(v_item.note, ''));
    end if;

    if v_record.status is distinct from v_new_status
       or coalesce(v_record.absence_reason_code, '') is distinct from v_new_reason
       or coalesce(v_record.absence_note, '') is distinct from v_new_note then
      insert into public.bes_extra_attendance_record_changes (
        session_id, record_id, class_id, member_key, student_full_name,
        change_kind, changed_by, changed_by_name, changed_at,
        old_status, new_status,
        old_absence_reason_code, new_absence_reason_code,
        old_absence_note, new_absence_note,
        session_note_before, session_note_after
      ) values (
        v_session.id, v_record.id, v_session.class_id, v_record.member_key, v_record.student_full_name,
        'record', v_uid, coalesce(v_profile.full_name, v_profile.email, ''), v_changed_at,
        v_record.status, v_new_status,
        coalesce(v_record.absence_reason_code, ''), v_new_reason,
        coalesce(v_record.absence_note, ''), v_new_note,
        v_session_note_before, v_session_note_after
      );

      update public.bes_extra_attendance_records
      set status = v_new_status,
          absence_reason_code = v_new_reason,
          absence_note = v_new_note
      where id = v_record.id;
    end if;
  end loop;

  if v_session_note_before is distinct from v_session_note_after then
    insert into public.bes_extra_attendance_record_changes (
      session_id, record_id, class_id, member_key, student_full_name,
      change_kind, changed_by, changed_by_name, changed_at,
      old_status, new_status,
      old_absence_reason_code, new_absence_reason_code,
      old_absence_note, new_absence_note,
      session_note_before, session_note_after
    ) values (
      v_session.id, null, v_session.class_id, '', '',
      'session_note', v_uid, coalesce(v_profile.full_name, v_profile.email, ''), v_changed_at,
      '', '', '', '', '', '',
      v_session_note_before, v_session_note_after
    );
  end if;

  select
    count(*) filter (where r.status in ('present', 'late'))::integer,
    count(*) filter (where r.status = 'absent')::integer
  into v_present, v_absent
  from public.bes_extra_attendance_records r
  where r.session_id = p_session_id;

  update public.bes_extra_attendance_sessions
  set total_students = v_present + v_absent,
      present_count = v_present,
      absent_count = v_absent,
      note = v_session_note_after
  where id = p_session_id
  returning * into v_session;

  -- checked_at intentionally remains unchanged so an adjustment never restarts
  -- the teacher's 30-minute correction window.
  return v_session;
end;
$$;

revoke all on function public.bes_update_extra_attendance_session(uuid,jsonb,text) from public;
revoke all on function public.bes_update_extra_attendance_session(uuid,jsonb,text) from anon;
grant execute on function public.bes_update_extra_attendance_session(uuid,jsonb,text) to authenticated;
