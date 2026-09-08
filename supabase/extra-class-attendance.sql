-- Brian English — Admin-only attendance for remedial and gifted-student classes.
-- Safe to re-run in Supabase SQL Editor.

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
  updated_at timestamptz not null default now()
);

create unique index if not exists bes_extra_classes_active_identity_uidx
  on public.bes_extra_classes (
    class_type,
    lower(class_name),
    lower(subject),
    coalesce(teacher_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(teacher_email)
  )
  where active = true;

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
  updated_at timestamptz not null default now()
);

create unique index if not exists bes_extra_class_members_active_uidx
  on public.bes_extra_class_members (class_id, member_key)
  where active = true;

create index if not exists bes_extra_class_members_class_idx
  on public.bes_extra_class_members (class_id, active, student_full_name);

create table if not exists public.bes_extra_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.bes_extra_classes(id) on delete restrict,
  class_type text not null check (class_type in ('remedial', 'gifted')),
  class_name text not null,
  subject text not null default '',
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text not null default '',
  teacher_email text not null default '',
  checked_at timestamptz not null default clock_timestamp(),
  checked_by uuid not null references public.profiles(id) on delete restrict,
  total_students integer not null check (total_students >= 0),
  present_count integer not null check (present_count >= 0),
  absent_count integer not null check (absent_count >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint bes_extra_attendance_session_count_check
    check (present_count + absent_count = total_students)
);

create index if not exists bes_extra_attendance_sessions_checked_idx
  on public.bes_extra_attendance_sessions (checked_at desc, class_id);

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
  unique (session_id, member_key)
);

create index if not exists bes_extra_attendance_records_session_idx
  on public.bes_extra_attendance_records (session_id, status, student_full_name);

alter table public.bes_extra_classes enable row level security;
alter table public.bes_extra_class_members enable row level security;
alter table public.bes_extra_attendance_sessions enable row level security;
alter table public.bes_extra_attendance_records enable row level security;

drop policy if exists "Extra attendance Admins read classes" on public.bes_extra_classes;
create policy "Extra attendance Admins read classes"
  on public.bes_extra_classes for select
  using (public.can_manage_extra_class_attendance());

drop policy if exists "Extra attendance Admins insert classes" on public.bes_extra_classes;
create policy "Extra attendance Admins insert classes"
  on public.bes_extra_classes for insert
  with check (
    public.can_manage_extra_class_attendance()
    and created_by = auth.uid()
    and updated_by = auth.uid()
  );

drop policy if exists "Extra attendance Admins update classes" on public.bes_extra_classes;
create policy "Extra attendance Admins update classes"
  on public.bes_extra_classes for update
  using (public.can_manage_extra_class_attendance())
  with check (
    public.can_manage_extra_class_attendance()
    and updated_by = auth.uid()
  );

drop policy if exists "Extra attendance Admins read members" on public.bes_extra_class_members;
create policy "Extra attendance Admins read members"
  on public.bes_extra_class_members for select
  using (public.can_manage_extra_class_attendance());

drop policy if exists "Extra attendance Admins insert members" on public.bes_extra_class_members;
create policy "Extra attendance Admins insert members"
  on public.bes_extra_class_members for insert
  with check (
    public.can_manage_extra_class_attendance()
    and created_by = auth.uid()
    and updated_by = auth.uid()
  );

drop policy if exists "Extra attendance Admins update members" on public.bes_extra_class_members;
create policy "Extra attendance Admins update members"
  on public.bes_extra_class_members for update
  using (public.can_manage_extra_class_attendance())
  with check (
    public.can_manage_extra_class_attendance()
    and updated_by = auth.uid()
    and (
      active = true
      or (left_at is not null and removed_by = auth.uid())
    )
  );

drop policy if exists "Extra attendance Admins read sessions" on public.bes_extra_attendance_sessions;
create policy "Extra attendance Admins read sessions"
  on public.bes_extra_attendance_sessions for select
  using (public.can_manage_extra_class_attendance());

drop policy if exists "Extra attendance Admins read records" on public.bes_extra_attendance_records;
create policy "Extra attendance Admins read records"
  on public.bes_extra_attendance_records for select
  using (public.can_manage_extra_class_attendance());

-- No direct client insert/update/delete policy is created for session/record tables.
-- Confirmed attendance is written only by the security-definer RPC below.

create or replace function public.bes_extra_attendance_list_teachers()
returns table (
  id uuid,
  email text,
  full_name text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(p.email, ''),
    coalesce(nullif(trim(p.full_name), ''), p.email, 'Giáo viên'),
    coalesce(p.role, 'teacher')
  from public.profiles p
  where public.can_manage_extra_class_attendance()
    and p.approved = true
    and lower(coalesce(p.role, 'teacher')) in (
      'teacher', 'admin', 'administrator',
      'department_head', 'department-head',
      'ttcm', 'to_truong', 'tổ trưởng',
      'department_leader', 'department leader',
      'subject_leader', 'subject leader', 'leader'
    )
  order by lower(coalesce(nullif(trim(p.full_name), ''), p.email, ''));
$$;

create or replace function public.bes_confirm_extra_class_attendance(
  p_class_id uuid,
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
  v_total integer := 0;
  v_absent integer := 0;
  v_unknown integer := 0;
  v_absent_keys text[] := coalesce(p_absent_member_keys, '{}'::text[]);
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền điểm danh lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;

  select * into v_class
  from public.bes_extra_classes
  where id = p_class_id
    and active = true
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp phụ đạo/bồi dưỡng đang hoạt động.' using errcode = 'P0002';
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

  insert into public.bes_extra_attendance_sessions (
    class_id,
    class_type,
    class_name,
    subject,
    teacher_id,
    teacher_name,
    teacher_email,
    checked_at,
    checked_by,
    total_students,
    present_count,
    absent_count,
    note
  ) values (
    v_class.id,
    v_class.class_type,
    v_class.class_name,
    v_class.subject,
    v_class.teacher_id,
    v_class.teacher_name,
    v_class.teacher_email,
    v_checked_at,
    auth.uid(),
    v_total,
    v_total - v_absent,
    v_absent,
    coalesce(trim(p_note), '')
  )
  returning * into v_session;

  insert into public.bes_extra_attendance_records (
    session_id,
    class_id,
    member_id,
    member_key,
    student_code,
    student_full_name,
    school_class_name,
    status,
    recorded_at
  )
  select
    v_session.id,
    m.class_id,
    m.id,
    m.member_key,
    m.student_code,
    m.student_full_name,
    m.school_class_name,
    case when m.member_key = any(v_absent_keys) then 'absent' else 'present' end,
    v_checked_at
  from public.bes_extra_class_members m
  where m.class_id = p_class_id
    and m.active = true;

  return v_session;
end;
$$;

grant execute on function public.can_manage_extra_class_attendance() to authenticated;
grant execute on function public.bes_extra_attendance_list_teachers() to authenticated;
grant execute on function public.bes_confirm_extra_class_attendance(uuid, text[], text) to authenticated;

grant select, insert, update on public.bes_extra_classes to authenticated;
grant select, insert, update on public.bes_extra_class_members to authenticated;
grant select on public.bes_extra_attendance_sessions to authenticated;
grant select on public.bes_extra_attendance_records to authenticated;

comment on table public.bes_extra_class_members is
  'Lifecycle-safe memberships for remedial/gifted classes. Removing a student sets active=false and preserves joined/left actor history.';

comment on table public.bes_extra_attendance_records is
  'Immutable student snapshots for confirmed attendance sessions. Current roster edits do not rewrite past attendance.';
