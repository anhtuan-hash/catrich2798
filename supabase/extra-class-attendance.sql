-- Brian English — consolidated Admin-only attendance schema for remedial and gifted classes.
-- Fresh installer matching the production feature set as of 2026-09-08.
-- Safe to re-run for schema/functions/policies; it does not seed class data.

create or replace function public.can_manage_extra_class_attendance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'administrator')
  );
$$;

create table if not exists public.bes_extra_classes (
  id uuid primary key default gen_random_uuid(),
  class_type text not null check (class_type in ('remedial', 'gifted')),
  class_name text not null,
  subject text not null default '',
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text not null default '',
  teacher_email text not null default '',
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_key text,
  school_year text not null default '',
  grade_level text not null default '',
  expected_student_count integer,
  periods_per_week integer,
  room text not null default '',
  weekdays text not null default '',
  time_range text not null default ''
);

alter table public.bes_extra_classes
  add column if not exists source_key text,
  add column if not exists school_year text not null default '',
  add column if not exists grade_level text not null default '',
  add column if not exists expected_student_count integer,
  add column if not exists periods_per_week integer,
  add column if not exists room text not null default '',
  add column if not exists weekdays text not null default '',
  add column if not exists time_range text not null default '';

create unique index if not exists bes_extra_classes_source_key_uidx
  on public.bes_extra_classes (source_key);
create index if not exists bes_extra_classes_teacher_idx
  on public.bes_extra_classes (teacher_id, active, class_type);

create table if not exists public.bes_extra_class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.bes_extra_classes(id) on delete restrict,
  member_key text not null,
  student_code text not null default '',
  student_full_name text not null,
  school_class_name text not null default '',
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  removed_by uuid references public.profiles(id) on delete set null,
  removal_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_key text
);

alter table public.bes_extra_class_members
  add column if not exists source_key text;

create unique index if not exists bes_extra_class_members_active_uidx
  on public.bes_extra_class_members (class_id, member_key)
  where active = true;
create unique index if not exists bes_extra_class_members_source_key_uidx
  on public.bes_extra_class_members (source_key);
create index if not exists bes_extra_class_members_class_idx
  on public.bes_extra_class_members (class_id, active, student_full_name);

create table if not exists public.bes_extra_class_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.bes_extra_classes(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text not null,
  teacher_email text not null default '',
  position integer not null default 1 check (position > 0),
  source_key text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bes_extra_class_teachers_source_key_uidx
  on public.bes_extra_class_teachers (source_key);
create unique index if not exists bes_extra_class_teachers_class_name_uidx
  on public.bes_extra_class_teachers (class_id, lower(trim(teacher_name)));
create index if not exists bes_extra_class_teachers_class_idx
  on public.bes_extra_class_teachers (class_id, position, teacher_name);

create table if not exists public.bes_extra_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.bes_extra_classes(id) on delete restrict,
  class_type text not null check (class_type in ('remedial', 'gifted')),
  class_name text not null,
  subject text not null default '',
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text not null default '',
  teacher_email text not null default '',
  attendance_date date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  checked_at timestamptz not null default clock_timestamp(),
  checked_by uuid not null references public.profiles(id) on delete restrict,
  total_students integer not null check (total_students >= 0),
  present_count integer not null check (present_count >= 0),
  absent_count integer not null check (absent_count >= 0),
  note text not null default '',
  session_status text not null default 'completed',
  lesson_periods numeric(3,1) not null default 1,
  cancellation_reason text not null default '',
  teaching_room text not null default '',
  teaching_time_range text not null default '',
  created_at timestamptz not null default now(),
  constraint bes_extra_attendance_session_count_check
    check (present_count + absent_count = total_students),
  constraint bes_extra_attendance_sessions_status_check
    check (session_status in ('completed', 'cancelled')),
  constraint bes_extra_attendance_sessions_periods_check
    check (
      (session_status = 'completed' and lesson_periods in (1, 1.5, 2))
      or (session_status = 'cancelled' and lesson_periods = 0)
    ),
  constraint bes_extra_attendance_sessions_cancel_reason_check
    check (
      (session_status = 'completed' and cancellation_reason = '')
      or (session_status = 'cancelled' and length(trim(cancellation_reason)) > 0)
    )
);

alter table public.bes_extra_attendance_sessions
  add column if not exists attendance_date date,
  add column if not exists session_status text not null default 'completed',
  add column if not exists lesson_periods numeric(3,1) not null default 1,
  add column if not exists cancellation_reason text not null default '',
  add column if not exists teaching_room text not null default '',
  add column if not exists teaching_time_range text not null default '';

update public.bes_extra_attendance_sessions
set attendance_date = (checked_at at time zone 'Asia/Ho_Chi_Minh')::date
where attendance_date is null;

alter table public.bes_extra_attendance_sessions
  alter column attendance_date set default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  alter column attendance_date set not null,
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

create unique index if not exists bes_extra_attendance_sessions_class_date_uidx
  on public.bes_extra_attendance_sessions (class_id, attendance_date);
create index if not exists bes_extra_attendance_sessions_class_month_idx
  on public.bes_extra_attendance_sessions (class_id, attendance_date, checked_at desc);
create index if not exists bes_extra_attendance_sessions_checked_idx
  on public.bes_extra_attendance_sessions (checked_at desc, class_id);
create unique index if not exists bes_extra_attendance_sessions_teacher_day_uidx
  on public.bes_extra_attendance_sessions (attendance_date, lower(trim(teacher_name)))
  where session_status = 'completed' and length(trim(teacher_name)) > 0;

create table if not exists public.bes_extra_attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bes_extra_attendance_sessions(id) on delete cascade,
  class_id uuid not null references public.bes_extra_classes(id) on delete restrict,
  member_id uuid references public.bes_extra_class_members(id) on delete set null,
  member_key text not null,
  student_code text not null default '',
  student_full_name text not null,
  school_class_name text not null default '',
  status text not null check (status in ('present', 'absent')),
  recorded_at timestamptz not null default now(),
  absence_reason_code text not null default '',
  absence_note text not null default '',
  unique (session_id, member_key),
  constraint bes_extra_attendance_records_absence_reason_check
    check (
      (status = 'present' and absence_reason_code = '' and absence_note = '')
      or (
        status = 'absent'
        and absence_reason_code in ('excused', 'unexcused', 'sick', 'family', 'other', 'unspecified')
        and (absence_reason_code <> 'other' or length(trim(absence_note)) > 0)
      )
    )
);

alter table public.bes_extra_attendance_records
  add column if not exists absence_reason_code text not null default '',
  add column if not exists absence_note text not null default '';

update public.bes_extra_attendance_records
set absence_reason_code = 'unspecified',
    absence_note = coalesce(absence_note, '')
where status = 'absent'
  and trim(coalesce(absence_reason_code, '')) = '';

update public.bes_extra_attendance_records
set absence_reason_code = '', absence_note = ''
where status <> 'absent';

alter table public.bes_extra_attendance_records
  drop constraint if exists bes_extra_attendance_records_absence_reason_check,
  add constraint bes_extra_attendance_records_absence_reason_check
    check (
      (status = 'present' and absence_reason_code = '' and absence_note = '')
      or (
        status = 'absent'
        and absence_reason_code in ('excused', 'unexcused', 'sick', 'family', 'other', 'unspecified')
        and (absence_reason_code <> 'other' or length(trim(absence_note)) > 0)
      )
    );

create index if not exists bes_extra_attendance_records_session_idx
  on public.bes_extra_attendance_records (session_id, status, student_full_name);

alter table public.bes_extra_classes enable row level security;
alter table public.bes_extra_class_members enable row level security;
alter table public.bes_extra_class_teachers enable row level security;
alter table public.bes_extra_attendance_sessions enable row level security;
alter table public.bes_extra_attendance_records enable row level security;

drop policy if exists "Extra attendance Admins read classes" on public.bes_extra_classes;
create policy "Extra attendance Admins read classes"
  on public.bes_extra_classes for select using (public.can_manage_extra_class_attendance());
drop policy if exists "Extra attendance Admins insert classes" on public.bes_extra_classes;
create policy "Extra attendance Admins insert classes"
  on public.bes_extra_classes for insert
  with check (public.can_manage_extra_class_attendance() and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "Extra attendance Admins update classes" on public.bes_extra_classes;
create policy "Extra attendance Admins update classes"
  on public.bes_extra_classes for update
  using (public.can_manage_extra_class_attendance())
  with check (public.can_manage_extra_class_attendance() and updated_by = auth.uid());

drop policy if exists "Extra attendance Admins read members" on public.bes_extra_class_members;
create policy "Extra attendance Admins read members"
  on public.bes_extra_class_members for select using (public.can_manage_extra_class_attendance());
drop policy if exists "Extra attendance Admins insert members" on public.bes_extra_class_members;
create policy "Extra attendance Admins insert members"
  on public.bes_extra_class_members for insert
  with check (public.can_manage_extra_class_attendance() and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "Extra attendance Admins update members" on public.bes_extra_class_members;
create policy "Extra attendance Admins update members"
  on public.bes_extra_class_members for update
  using (public.can_manage_extra_class_attendance())
  with check (
    public.can_manage_extra_class_attendance()
    and updated_by = auth.uid()
    and (active = true or (left_at is not null and removed_by = auth.uid()))
  );

drop policy if exists "Extra attendance Admins read class teachers" on public.bes_extra_class_teachers;
create policy "Extra attendance Admins read class teachers"
  on public.bes_extra_class_teachers for select using (public.can_manage_extra_class_attendance());
drop policy if exists "Extra attendance Admins read sessions" on public.bes_extra_attendance_sessions;
create policy "Extra attendance Admins read sessions"
  on public.bes_extra_attendance_sessions for select using (public.can_manage_extra_class_attendance());
drop policy if exists "Extra attendance Admins read records" on public.bes_extra_attendance_records;
create policy "Extra attendance Admins read records"
  on public.bes_extra_attendance_records for select using (public.can_manage_extra_class_attendance());

create or replace function public.bes_create_extra_class_with_teachers(
  p_class_type text,
  p_class_name text,
  p_subject text,
  p_source_key text,
  p_school_year text,
  p_grade_level text,
  p_teacher_names text[]
)
returns public.bes_extra_classes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_teacher_name text;
  v_teacher_names text[] := '{}'::text[];
  v_position integer := 0;
  v_class_name text := trim(coalesce(p_class_name, ''));
  v_subject text := trim(coalesce(p_subject, ''));
  v_source_key text := trim(coalesce(p_source_key, ''));
  v_school_year text := trim(coalesce(p_school_year, ''));
  v_grade_level text := trim(coalesce(p_grade_level, ''));
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền tạo lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;
  if p_class_type not in ('remedial', 'gifted') then
    raise exception 'Loại lớp không hợp lệ.' using errcode = '22023';
  end if;
  if v_class_name = '' or v_subject = '' or v_source_key = '' or v_grade_level = '' then
    raise exception 'Tên lớp, môn, khối và mã phân công không được để trống.' using errcode = '22023';
  end if;
  if v_grade_level not in ('10', '11', '12') then
    raise exception 'Chỉ hỗ trợ lớp khối 10, 11, 12.' using errcode = '22023';
  end if;

  foreach v_teacher_name in array coalesce(p_teacher_names, '{}'::text[])
  loop
    v_teacher_name := trim(coalesce(v_teacher_name, ''));
    if v_teacher_name <> '' and not (v_teacher_name = any(v_teacher_names)) then
      v_teacher_names := array_append(v_teacher_names, v_teacher_name);
    end if;
  end loop;
  if coalesce(array_length(v_teacher_names, 1), 0) = 0 then
    raise exception 'Lớp phải có ít nhất một giáo viên theo phân công.' using errcode = '22023';
  end if;

  insert into public.bes_extra_classes (
    class_type, class_name, subject, teacher_id, teacher_name, teacher_email,
    active, source_key, school_year, grade_level, created_by, updated_by, created_at, updated_at
  ) values (
    p_class_type, v_class_name, v_subject, null, array_to_string(v_teacher_names, ', '), '',
    true, v_source_key, v_school_year, v_grade_level, auth.uid(), auth.uid(), clock_timestamp(), clock_timestamp()
  ) returning * into v_class;

  foreach v_teacher_name in array v_teacher_names
  loop
    v_position := v_position + 1;
    insert into public.bes_extra_class_teachers (
      class_id, teacher_id, teacher_name, teacher_email, position, source_key,
      created_by, updated_by, created_at, updated_at
    ) values (
      v_class.id, null, v_teacher_name, '', v_position,
      v_source_key || '::teacher::' || lpad(v_position::text, 2, '0'),
      auth.uid(), auth.uid(), clock_timestamp(), clock_timestamp()
    );
  end loop;
  return v_class;
exception
  when unique_violation then
    raise exception 'Lớp hoặc mã phân công này đã tồn tại trên hệ thống.' using errcode = '23505';
end;
$$;

create or replace function public.bes_add_extra_class_teacher(p_class_id uuid, p_teacher_name text)
returns public.bes_extra_class_teachers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_teacher public.bes_extra_class_teachers%rowtype;
  v_teacher_name text := trim(coalesce(p_teacher_name, ''));
  v_position integer;
  v_id uuid := gen_random_uuid();
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền thêm giáo viên cho lớp.' using errcode = '42501';
  end if;
  if v_teacher_name = '' then
    raise exception 'Vui lòng nhập họ tên giáo viên.' using errcode = '22023';
  end if;

  select * into v_class from public.bes_extra_classes
  where id = p_class_id and active = true for update;
  if not found then
    raise exception 'Không tìm thấy lớp đang hoạt động.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.bes_extra_class_teachers
    where class_id = p_class_id and lower(trim(teacher_name)) = lower(v_teacher_name)
  ) then
    raise exception 'Giáo viên này đã có trong lớp.' using errcode = '23505';
  end if;

  select coalesce(max(position), 0) + 1 into v_position
  from public.bes_extra_class_teachers where class_id = p_class_id;

  insert into public.bes_extra_class_teachers (
    id, class_id, teacher_id, teacher_name, teacher_email, position, source_key,
    created_by, updated_by, created_at, updated_at
  ) values (
    v_id, p_class_id, null, v_teacher_name, '', v_position,
    'manual:' || p_class_id::text || ':' || v_id::text,
    auth.uid(), auth.uid(), now(), now()
  ) returning * into v_teacher;

  update public.bes_extra_classes c
  set teacher_name = coalesce((
        select string_agg(t.teacher_name, ', ' order by t.position, t.teacher_name)
        from public.bes_extra_class_teachers t where t.class_id = p_class_id
      ), ''),
      updated_by = auth.uid(), updated_at = now()
  where c.id = p_class_id;
  return v_teacher;
exception
  when unique_violation then
    raise exception 'Giáo viên này đã có trong lớp.' using errcode = '23505';
end;
$$;

create or replace function public.bes_delete_extra_attendance_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_record_count integer := 0;
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền xóa điểm danh đã duyệt.' using errcode = '42501';
  end if;
  select * into v_session from public.bes_extra_attendance_sessions where id = p_session_id for update;
  if not found then
    raise exception 'Không tìm thấy buổi điểm danh cần xóa.' using errcode = 'P0002';
  end if;
  select count(*)::integer into v_record_count from public.bes_extra_attendance_records where session_id = p_session_id;
  delete from public.bes_extra_attendance_sessions where id = p_session_id;
  return jsonb_build_object(
    'session_id', v_session.id, 'class_id', v_session.class_id,
    'class_name', v_session.class_name, 'checked_at', v_session.checked_at,
    'deleted_records', v_record_count
  );
end;
$$;

create or replace function public.bes_delete_extra_class(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_session_count integer := 0;
  v_member_count integer := 0;
  v_teacher_count integer := 0;
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền xóa lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;
  select * into v_class from public.bes_extra_classes where id = p_class_id for update;
  if not found then
    raise exception 'Không tìm thấy lớp cần xóa.' using errcode = 'P0002';
  end if;
  select count(*)::integer into v_session_count from public.bes_extra_attendance_sessions where class_id = p_class_id;
  select count(*)::integer into v_member_count from public.bes_extra_class_members where class_id = p_class_id;
  select count(*)::integer into v_teacher_count from public.bes_extra_class_teachers where class_id = p_class_id;
  delete from public.bes_extra_attendance_sessions where class_id = p_class_id;
  delete from public.bes_extra_class_members where class_id = p_class_id;
  delete from public.bes_extra_class_teachers where class_id = p_class_id;
  delete from public.bes_extra_classes where id = p_class_id;
  return jsonb_build_object(
    'class_id', v_class.id, 'class_name', v_class.class_name,
    'deleted_sessions', v_session_count, 'deleted_members', v_member_count,
    'deleted_teachers', v_teacher_count
  );
end;
$$;

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
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_teacher_conflict public.bes_extra_attendance_sessions%rowtype;
  v_checked_at timestamptz := clock_timestamp();
  v_today date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_teacher_name text := trim(coalesce(p_teacher_name, ''));
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
  if v_room = '' then
    raise exception 'Vui lòng nhập phòng học.' using errcode = '22023';
  end if;
  if v_time = '' then
    raise exception 'Vui lòng nhập thời gian dạy.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_details) <> 'array' then
    raise exception 'Dữ liệu lý do vắng không hợp lệ.' using errcode = '22023';
  end if;

  select * into v_class from public.bes_extra_classes
  where id = p_class_id and active = true for update;
  if not found then
    raise exception 'Không tìm thấy lớp phụ đạo/bồi dưỡng đang hoạt động.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.bes_extra_class_teachers t
    where t.class_id = p_class_id and lower(trim(t.teacher_name)) = lower(v_teacher_name)
  ) and not exists (
    select 1 from regexp_split_to_table(coalesce(v_class.teacher_name, ''), '\s*,\s*') as fallback_teacher(name)
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
  order by s.checked_at asc limit 1;
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

  select count(*), count(distinct trim(x.member_key)) into v_detail_count, v_distinct_count
  from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text);
  if v_detail_count <> v_distinct_count then
    raise exception 'Danh sách vắng có học sinh bị lặp.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text)
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

  select coalesce(array_agg(trim(x.member_key)), '{}'::text[]) into v_absent_keys
  from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text);
  select count(*)::integer into v_total from public.bes_extra_class_members m
  where m.class_id = p_class_id and m.active = true;
  v_absent := coalesce(array_length(v_absent_keys, 1), 0);

  begin
    insert into public.bes_extra_attendance_sessions (
      class_id, class_type, class_name, subject, teacher_id, teacher_name, teacher_email,
      attendance_date, checked_at, checked_by, total_students, present_count, absent_count,
      note, session_status, lesson_periods, cancellation_reason, teaching_room, teaching_time_range
    ) values (
      v_class.id, v_class.class_type, v_class.class_name, v_class.subject, null, v_teacher_name, '',
      p_attendance_date, v_checked_at, auth.uid(), v_total, v_total - v_absent, v_absent,
      coalesce(trim(p_note), ''), 'completed', p_lesson_periods, '', v_room, v_time
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
    session_id, class_id, member_id, member_key, student_code, student_full_name,
    school_class_name, status, recorded_at, absence_reason_code, absence_note
  )
  select
    v_session.id, m.class_id, m.id, m.member_key, m.student_code, m.student_full_name,
    m.school_class_name,
    case when d.member_key is null then 'present' else 'absent' end,
    v_checked_at,
    case when d.member_key is null then '' else trim(d.reason_code) end,
    case when d.member_key is null then '' else trim(coalesce(d.note, '')) end
  from public.bes_extra_class_members m
  left join lateral (
    select x.member_key, x.reason_code, x.note
    from jsonb_to_recordset(v_details) as x(member_key text, reason_code text, note text)
    where trim(x.member_key) = m.member_key limit 1
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
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_checked_at timestamptz := clock_timestamp();
  v_today date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_reason text := trim(coalesce(p_cancellation_reason, ''));
  v_room text := trim(coalesce(p_teaching_room, ''));
  v_time text := trim(coalesce(p_teaching_time_range, ''));
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

  select * into v_class from public.bes_extra_classes
  where id = p_class_id and active = true for update;
  if not found then
    raise exception 'Không tìm thấy lớp đang hoạt động.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.bes_extra_attendance_sessions s
    where s.class_id = p_class_id and s.attendance_date = p_attendance_date
  ) then
    raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end if;

  if v_room = '' then v_room := trim(coalesce(v_class.room, '')); end if;
  if v_time = '' then v_time := trim(coalesce(v_class.time_range, '')); end if;

  begin
    insert into public.bes_extra_attendance_sessions (
      class_id, class_type, class_name, subject, teacher_id, teacher_name, teacher_email,
      attendance_date, checked_at, checked_by, total_students, present_count, absent_count,
      note, session_status, lesson_periods, cancellation_reason, teaching_room, teaching_time_range
    ) values (
      v_class.id, v_class.class_type, v_class.class_name, v_class.subject, null, '', '',
      p_attendance_date, v_checked_at, auth.uid(), 0, 0, 0,
      '', 'cancelled', 0, v_reason, v_room, v_time
    ) returning * into v_session;
  exception when unique_violation then
    raise exception 'Lớp này đã được xử lý điểm danh ngày %.', to_char(p_attendance_date, 'DD/MM/YYYY') using errcode = '23505';
  end;
  return v_session;
end;
$$;

-- Remove signatures that cannot carry the complete attendance snapshot.
drop function if exists public.bes_confirm_extra_class_attendance(uuid, text[], text);
drop function if exists public.bes_confirm_extra_class_attendance(uuid, date, text, text[], text);
drop function if exists public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, text[], text);
drop function if exists public.bes_cancel_extra_class_session(uuid, date, text);

revoke all on function public.can_manage_extra_class_attendance() from public;
revoke all on function public.can_manage_extra_class_attendance() from anon;
grant execute on function public.can_manage_extra_class_attendance() to authenticated;

revoke all on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) from public;
revoke all on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) from anon;
grant execute on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) to authenticated;
revoke all on function public.bes_add_extra_class_teacher(uuid, text) from public;
revoke all on function public.bes_add_extra_class_teacher(uuid, text) from anon;
grant execute on function public.bes_add_extra_class_teacher(uuid, text) to authenticated;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from public;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from anon;
grant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;
revoke all on function public.bes_delete_extra_class(uuid) from public;
revoke all on function public.bes_delete_extra_class(uuid) from anon;
grant execute on function public.bes_delete_extra_class(uuid) to authenticated;
revoke all on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, jsonb, text, text, text) from public;
revoke all on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, jsonb, text, text, text) from anon;
grant execute on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, jsonb, text, text, text) to authenticated;
revoke all on function public.bes_cancel_extra_class_session(uuid, date, text, text, text) from public;
revoke all on function public.bes_cancel_extra_class_session(uuid, date, text, text, text) from anon;
grant execute on function public.bes_cancel_extra_class_session(uuid, date, text, text, text) to authenticated;

grant select, insert, update on public.bes_extra_classes to authenticated;
grant select, insert, update on public.bes_extra_class_members to authenticated;
grant select on public.bes_extra_class_teachers to authenticated;
grant select on public.bes_extra_attendance_sessions to authenticated;
grant select on public.bes_extra_attendance_records to authenticated;

comment on table public.bes_extra_class_members is
  'Lifecycle-safe memberships for remedial/gifted classes; removal preserves historical attendance.';
comment on table public.bes_extra_attendance_sessions is
  'Immutable daily attendance-session snapshots including actual teacher, periods, room and teaching time.';
comment on table public.bes_extra_attendance_records is
  'Immutable student attendance snapshots with structured absence reasons for absent students.';
