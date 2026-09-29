-- 2026-09-29: global lesson-period policy for extra-class attendance.
-- Admin always sees/uses 1, 1.5 or 2 periods. Teachers are fixed by class type
-- (remedial = 1.5, gifted = 2) unless Admin globally enables teacher choice.
-- Existing attendance history is intentionally untouched.

create table if not exists public.bes_attendance_global_settings (
  id boolean primary key default true check (id),
  allow_teacher_period_selection boolean not null default false,
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bes_attendance_global_settings is
  'Singleton attendance policy controlled by Admin; authenticated users may read it.';

alter table public.bes_attendance_global_settings enable row level security;

drop policy if exists "Attendance users can read global settings" on public.bes_attendance_global_settings;
create policy "Attendance users can read global settings"
  on public.bes_attendance_global_settings
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert attendance global settings" on public.bes_attendance_global_settings;
create policy "Admins can insert attendance global settings"
  on public.bes_attendance_global_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.approved = true
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  );

drop policy if exists "Admins can update attendance global settings" on public.bes_attendance_global_settings;
create policy "Admins can update attendance global settings"
  on public.bes_attendance_global_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.approved = true
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.approved = true
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
    )
  );

grant select, insert, update on public.bes_attendance_global_settings to authenticated;

insert into public.bes_attendance_global_settings (
  id,
  allow_teacher_period_selection,
  updated_by
)
values (true, false, 'system-default')
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.bes_attendance_global_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

create or replace function public.bes_confirm_extra_class_attendance(
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
  v_is_admin boolean := false;
  v_allow_teacher_period_selection boolean := false;
  v_required_lesson_periods numeric := 1.5;
begin
  if not public.bes_can_operate_extra_class_attendance(p_class_id, p_teacher_name, clock_timestamp()) then
    raise exception 'Bạn không có quyền điểm danh lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;

  select
    coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.email), ''), auth.uid()::text, ''),
    lower(coalesce(p.role, '')) in ('admin', 'administrator')
    into v_checked_by_name, v_is_admin
  from public.profiles p
  where p.id = auth.uid()
    and p.approved = true;
  v_checked_by_name := coalesce(v_checked_by_name, auth.uid()::text, '');
  v_is_admin := coalesce(v_is_admin, false);

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

  select coalesce(s.allow_teacher_period_selection, false)
    into v_allow_teacher_period_selection
  from public.bes_attendance_global_settings s
  where s.id = true;
  v_allow_teacher_period_selection := coalesce(v_allow_teacher_period_selection, false);

  if not v_is_admin and not v_allow_teacher_period_selection then
    v_required_lesson_periods := case
      when v_class.class_type = 'gifted' then 2::numeric
      else 1.5::numeric
    end;
    if p_lesson_periods is distinct from v_required_lesson_periods then
      raise exception 'Số tiết của lớp % được cố định ở % tiết theo thiết lập hệ thống.',
        case when v_class.class_type = 'gifted' then 'Bồi dưỡng HSG' else 'Phụ đạo' end,
        replace(v_required_lesson_periods::text, '.', ',')
        using errcode = '22023';
    end if;
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
