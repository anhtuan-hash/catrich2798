-- 2026-09-08: Material 3 attendance session semantics.
-- Adds taught-period tracking and cancelled sessions while preserving one class/date lock.

alter table public.bes_extra_attendance_sessions
  add column if not exists session_status text not null default 'completed',
  add column if not exists lesson_periods numeric(3,1) not null default 1,
  add column if not exists cancellation_reason text not null default '';

update public.bes_extra_attendance_sessions
set session_status = 'completed',
    lesson_periods = coalesce(lesson_periods, 1),
    cancellation_reason = coalesce(cancellation_reason, '')
where session_status is null
   or lesson_periods is null
   or cancellation_reason is null;

alter table public.bes_extra_attendance_sessions
  drop constraint if exists bes_extra_attendance_sessions_status_check,
  add constraint bes_extra_attendance_sessions_status_check
    check (session_status in ('completed', 'cancelled')),
  drop constraint if exists bes_extra_attendance_sessions_periods_check,
  add constraint bes_extra_attendance_sessions_periods_check
    check (
      (session_status = 'completed' and lesson_periods in (1, 1.5, 2))
      or (session_status = 'cancelled' and lesson_periods = 0)
    ),
  drop constraint if exists bes_extra_attendance_sessions_cancel_reason_check,
  add constraint bes_extra_attendance_sessions_cancel_reason_check
    check (
      (session_status = 'completed' and cancellation_reason = '')
      or (session_status = 'cancelled' and length(trim(cancellation_reason)) > 0)
    );

create or replace function public.bes_confirm_extra_class_attendance(
  p_class_id uuid,
  p_attendance_date date,
  p_teacher_name text,
  p_lesson_periods numeric,
  p_absent_member_keys text[] default '{}'::text[],
  p_note text default ''
)
returns public.bes_extra_attendance_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_checked_at timestamptz := clock_timestamp();
  v_today date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_teacher_name text := trim(coalesce(p_teacher_name, ''));
  v_total integer := 0;
  v_absent integer := 0;
  v_unknown integer := 0;
  v_absent_keys text[] := coalesce(p_absent_member_keys, '{}'::text[]);
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền điểm danh lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;

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

  select * into v_class
  from public.bes_extra_classes
  where id = p_class_id
    and active = true
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp phụ đạo/bồi dưỡng đang hoạt động.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.bes_extra_class_teachers t
    where t.class_id = p_class_id
      and lower(trim(t.teacher_name)) = lower(v_teacher_name)
  ) and not exists (
    select 1
    from regexp_split_to_table(coalesce(v_class.teacher_name, ''), '\s*,\s*') as fallback_teacher(name)
    where lower(trim(fallback_teacher.name)) = lower(v_teacher_name)
  ) then
    raise exception 'Giáo viên không thuộc phân công của lớp.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.bes_extra_attendance_sessions s
    where s.class_id = p_class_id
      and s.attendance_date = p_attendance_date
  ) then
    raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end if;

  select count(*)::integer into v_total
  from public.bes_extra_class_members m
  where m.class_id = p_class_id
    and m.active = true;

  select count(*)::integer into v_unknown
  from unnest(v_absent_keys) as requested(member_key)
  where not exists (
    select 1
    from public.bes_extra_class_members m
    where m.class_id = p_class_id
      and m.active = true
      and m.member_key = requested.member_key
  );

  if v_unknown > 0 then
    raise exception 'Danh sách vắng có học sinh không còn thuộc lớp. Hãy tải lại danh sách trước khi điểm danh.' using errcode = '40001';
  end if;

  select count(*)::integer into v_absent
  from public.bes_extra_class_members m
  where m.class_id = p_class_id
    and m.active = true
    and m.member_key = any(v_absent_keys);

  begin
    insert into public.bes_extra_attendance_sessions (
      class_id, class_type, class_name, subject,
      teacher_id, teacher_name, teacher_email,
      attendance_date, checked_at, checked_by,
      total_students, present_count, absent_count,
      note, session_status, lesson_periods, cancellation_reason
    ) values (
      v_class.id, v_class.class_type, v_class.class_name, v_class.subject,
      null, v_teacher_name, '',
      p_attendance_date, v_checked_at, auth.uid(),
      v_total, v_total - v_absent, v_absent,
      coalesce(trim(p_note), ''), 'completed', p_lesson_periods, ''
    )
    returning * into v_session;
  exception
    when unique_violation then
      raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end;

  insert into public.bes_extra_attendance_records (
    session_id, class_id, member_id, member_key,
    student_code, student_full_name, school_class_name,
    status, recorded_at
  )
  select
    v_session.id, m.class_id, m.id, m.member_key,
    m.student_code, m.student_full_name, m.school_class_name,
    case when m.member_key = any(v_absent_keys) then 'absent' else 'present' end,
    v_checked_at
  from public.bes_extra_class_members m
  where m.class_id = p_class_id
    and m.active = true;

  return v_session;
end;
$$;

create or replace function public.bes_cancel_extra_class_session(
  p_class_id uuid,
  p_attendance_date date,
  p_cancellation_reason text
)
returns public.bes_extra_attendance_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_checked_at timestamptz := clock_timestamp();
  v_today date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_reason text := trim(coalesce(p_cancellation_reason, ''));
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền hủy buổi học.' using errcode = '42501';
  end if;

  if p_attendance_date is null then
    raise exception 'Vui lòng chọn ngày học.' using errcode = '22004';
  end if;

  if p_attendance_date > v_today then
    raise exception 'Không thể hủy buổi học ở ngày tương lai theo giờ Việt Nam.' using errcode = '22008';
  end if;

  if v_reason = '' then
    raise exception 'Vui lòng nhập lý do hủy buổi học.' using errcode = '22023';
  end if;

  select * into v_class
  from public.bes_extra_classes
  where id = p_class_id
    and active = true
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp đang hoạt động.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.bes_extra_attendance_sessions s
    where s.class_id = p_class_id and s.attendance_date = p_attendance_date
  ) then
    raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end if;

  begin
    insert into public.bes_extra_attendance_sessions (
      class_id, class_type, class_name, subject,
      teacher_id, teacher_name, teacher_email,
      attendance_date, checked_at, checked_by,
      total_students, present_count, absent_count,
      note, session_status, lesson_periods, cancellation_reason
    ) values (
      v_class.id, v_class.class_type, v_class.class_name, v_class.subject,
      null, '', '',
      p_attendance_date, v_checked_at, auth.uid(),
      0, 0, 0,
      '', 'cancelled', 0, v_reason
    )
    returning * into v_session;
  exception
    when unique_violation then
      raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end;

  -- Cancelled sessions intentionally have no per-student attendance records.
  delete from public.bes_extra_attendance_records
  where session_id = v_session.id;

  return v_session;
end;
$$;

revoke all on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, text[], text) from public;
revoke all on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, text[], text) from anon;
grant execute on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, text[], text) to authenticated;

revoke all on function public.bes_cancel_extra_class_session(uuid, date, text) from public;
revoke all on function public.bes_cancel_extra_class_session(uuid, date, text) from anon;
grant execute on function public.bes_cancel_extra_class_session(uuid, date, text) to authenticated;
