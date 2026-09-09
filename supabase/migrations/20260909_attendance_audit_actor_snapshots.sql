-- 2026-09-09: preserve who actually confirmed/cancelled each attendance session.
-- teacher_name remains the teacher who taught; checked_by / checked_by_name identify
-- the signed-in account that performed the attendance action.

alter table public.bes_extra_attendance_sessions
  add column if not exists checked_by_name text not null default '';

update public.bes_extra_attendance_sessions s
set checked_by_name = coalesce(
  nullif(trim(p.full_name), ''),
  nullif(trim(p.email), ''),
  s.checked_by::text,
  ''
)
from public.profiles p
where p.id = s.checked_by
  and trim(coalesce(s.checked_by_name, '')) = '';

create or replace function public.bes_confirm_extra_class_attendance(
  p_class_id uuid,
  p_attendance_date date,
  p_teacher_name text,
  p_lesson_periods numeric,
  p_absence_details jsonb,
  p_note text,
  p_teaching_room text,
  p_teaching_time_range text
)
returns public.bes_extra_attendance_sessions
language plpgsql
security definer
set search_path to 'public'
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
  v_total integer := 0;
  v_absent integer := 0;
  v_unknown integer := 0;
  v_detail_count integer := 0;
  v_distinct_count integer := 0;
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
    case when d.member_key is null then 'present' else 'absent' end,
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

create or replace function public.bes_cancel_extra_class_session(
  p_class_id uuid,
  p_attendance_date date,
  p_cancellation_reason text,
  p_teaching_room text,
  p_teaching_time_range text
)
returns public.bes_extra_attendance_sessions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_checked_at timestamptz := clock_timestamp();
  v_today date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_reason text := trim(coalesce(p_cancellation_reason, ''));
  v_room text := trim(coalesce(p_teaching_room, ''));
  v_time text := trim(coalesce(p_teaching_time_range, ''));
  v_checked_by_name text := '';
begin
  if not public.bes_can_operate_extra_class_attendance(p_class_id, null, clock_timestamp()) then
    raise exception 'Bạn không có quyền hủy buổi học.' using errcode = '42501';
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.email), ''), auth.uid()::text, '')
    into v_checked_by_name
  from public.profiles p
  where p.id = auth.uid() and p.approved = true;
  v_checked_by_name := coalesce(v_checked_by_name, auth.uid()::text, '');

  if p_attendance_date is null then raise exception 'Vui lòng chọn ngày học.' using errcode = '22004'; end if;
  if p_attendance_date > v_today then raise exception 'Không thể hủy buổi học ở ngày tương lai theo giờ Việt Nam.' using errcode = '22008'; end if;
  if v_reason = '' then raise exception 'Vui lòng nhập lý do hủy buổi học.' using errcode = '22023'; end if;

  select * into v_class from public.bes_extra_classes where id = p_class_id and active = true for update;
  if not found then raise exception 'Không tìm thấy lớp đang hoạt động.' using errcode = 'P0002'; end if;
  if exists (select 1 from public.bes_extra_attendance_sessions s where s.class_id = p_class_id and s.attendance_date = p_attendance_date) then
    raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end if;
  if v_room = '' then v_room := trim(coalesce(v_class.room, '')); end if;
  if v_time = '' then v_time := trim(coalesce(v_class.time_range, '')); end if;

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
      null, '', '',
      p_attendance_date, v_checked_at, auth.uid(), v_checked_by_name,
      0, 0, 0, '', 'cancelled', 0, v_reason, v_room, v_time
    ) returning * into v_session;
  exception when unique_violation then
    raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end;
  return v_session;
end;
$$;

revoke all on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) from public, anon;
grant execute on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) to authenticated;
revoke all on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) from public, anon;
grant execute on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) to authenticated;
