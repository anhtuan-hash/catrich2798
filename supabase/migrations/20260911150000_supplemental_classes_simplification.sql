-- 2026-09-11: simplify Học bổ sung into class-centric management.
-- Additive only: preserve all legacy students, groups, sessions, participants and proof paths.

-- -----------------------------------------------------------------------------
-- Strict authorization: approved Admin OR the single approved Hồng Thắm profile.
-- Generic Attendance permissions and class-teacher metadata MUST NOT grant access.
-- -----------------------------------------------------------------------------
create or replace function private.bes_is_supplemental_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or p.id = '4c89bfa1-9e3f-4965-a082-99f6e974f5ba'::uuid
      )
  );
$$;

create or replace function private.bes_require_supplemental_manager()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập để quản lý Học bổ sung.' using errcode = '42501';
  end if;
  if not private.bes_is_supplemental_manager() then
    raise exception 'Tài khoản không có quyền truy cập Học bổ sung.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- Keep every legacy supplemental mutation locked to the new rule.
create or replace function private.bes_require_supplemental_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.bes_require_supplemental_manager();
end;
$$;

-- Legacy supplemental history/report readers are no longer broader than managers.
create or replace function private.bes_require_supplemental_reader(p_permissions text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform p_permissions;
  return private.bes_require_supplemental_manager();
end;
$$;

-- -----------------------------------------------------------------------------
-- Class metadata and normalized multi-teacher metadata.
-- -----------------------------------------------------------------------------
alter table public.bes_supplemental_groups
  add column if not exists note text not null default '',
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null;

create index if not exists bes_supplemental_groups_archive_idx
  on public.bes_supplemental_groups (active, archived_at, group_name);

create table if not exists public.bes_supplemental_group_teachers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.bes_supplemental_groups(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text not null,
  teacher_email text not null default '',
  position integer not null default 1 check (position > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (nullif(btrim(teacher_name), '') is not null)
);

create index if not exists bes_supplemental_group_teachers_group_idx
  on public.bes_supplemental_group_teachers (group_id, position, teacher_name);
create unique index if not exists bes_supplemental_group_teachers_identity_uidx
  on public.bes_supplemental_group_teachers (
    group_id,
    lower(btrim(teacher_name)),
    lower(btrim(teacher_email))
  );

alter table public.bes_supplemental_group_teachers enable row level security;
revoke all on table public.bes_supplemental_group_teachers from public, anon, authenticated;

-- Backfill the current primary teacher without altering old group/session snapshots.
insert into public.bes_supplemental_group_teachers (
  group_id, teacher_id, teacher_name, teacher_email, position,
  created_by, updated_by, created_at, updated_at
)
select
  g.id,
  g.teacher_id,
  btrim(g.teacher_name),
  btrim(coalesce(g.teacher_email, '')),
  1,
  g.created_by,
  g.updated_by,
  g.created_at,
  g.updated_at
from public.bes_supplemental_groups g
where nullif(btrim(g.teacher_name), '') is not null
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Replace teacher metadata for one class. Teacher metadata NEVER grants access.
-- -----------------------------------------------------------------------------
create or replace function public.bes_set_supplemental_class_teachers(
  p_group_id uuid,
  p_teachers jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_group public.bes_supplemental_groups%rowtype;
  v_primary public.bes_supplemental_group_teachers%rowtype;
begin
  select * into v_group
  from public.bes_supplemental_groups g
  where g.id = p_group_id
  for update;

  if not found then raise exception 'Không tìm thấy lớp Học bổ sung.'; end if;
  if v_group.archived_at is not null then raise exception 'Lớp đã được lưu trữ.'; end if;
  if jsonb_typeof(coalesce(p_teachers, '[]'::jsonb)) <> 'array' then
    raise exception 'Danh sách giáo viên không hợp lệ.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_teachers, '[]'::jsonb)) item
    where nullif(btrim(coalesce(item->>'fullName', item->>'teacherName', '')), '') is null
  ) then
    raise exception 'Họ và tên giáo viên không được để trống.';
  end if;

  delete from public.bes_supplemental_group_teachers t
  where t.group_id = p_group_id;

  insert into public.bes_supplemental_group_teachers (
    group_id, teacher_id, teacher_name, teacher_email, position,
    created_by, updated_by, created_at, updated_at
  )
  select
    p_group_id,
    case
      when nullif(btrim(coalesce(item->>'teacherId', '')), '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (item->>'teacherId')::uuid
      else null
    end,
    btrim(coalesce(item->>'fullName', item->>'teacherName', '')),
    btrim(coalesce(item->>'email', item->>'teacherEmail', '')),
    ordinality::integer,
    v_uid,
    v_uid,
    clock_timestamp(),
    clock_timestamp()
  from jsonb_array_elements(coalesce(p_teachers, '[]'::jsonb)) with ordinality as payload(item, ordinality)
  on conflict do nothing;

  select * into v_primary
  from public.bes_supplemental_group_teachers t
  where t.group_id = p_group_id
  order by t.position, t.created_at
  limit 1;

  update public.bes_supplemental_groups g
  set teacher_id = case when v_primary.id is null then null else v_primary.teacher_id end,
      teacher_name = case when v_primary.id is null then '' else v_primary.teacher_name end,
      teacher_email = case when v_primary.id is null then '' else v_primary.teacher_email end,
      updated_by = v_uid,
      updated_at = clock_timestamp()
  where g.id = p_group_id
  returning * into v_group;

  perform private.bes_materialize_supplemental_group_sessions(p_group_id);

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id,
      'teacherId', t.teacher_id,
      'fullName', t.teacher_name,
      'email', t.teacher_email,
      'position', t.position
    ) order by t.position, t.teacher_name)
    from public.bes_supplemental_group_teachers t
    where t.group_id = p_group_id
  ), '[]'::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- Create/update one visible class. Existing group ids remain stable.
-- -----------------------------------------------------------------------------
create or replace function public.bes_upsert_supplemental_class(
  p_group_name text,
  p_subject text,
  p_grade_level text,
  p_start_date date,
  p_end_date date,
  p_weekdays smallint[],
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_group_id uuid default null,
  p_room text default '',
  p_note text default '',
  p_active boolean default true,
  p_teachers jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_group public.bes_supplemental_groups%rowtype;
  v_name text := btrim(coalesce(p_group_name, ''));
  v_subject text := btrim(coalesce(p_subject, ''));
  v_grade text := btrim(coalesce(p_grade_level, ''));
begin
  if v_name = '' or v_subject = '' or v_grade = '' then
    raise exception 'Tên lớp, môn học và khối không được để trống.';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Khoảng ngày của lớp không hợp lệ.';
  end if;
  if p_start_time is null or p_end_time is null or p_start_time = p_end_time then
    raise exception 'Khung giờ của lớp không hợp lệ.';
  end if;
  if coalesce(cardinality(p_weekdays), 0) = 0
     or not (p_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]) then
    raise exception 'Hãy chọn ít nhất một thứ học hợp lệ trong tuần.';
  end if;

  if p_group_id is null then
    insert into public.bes_supplemental_groups (
      group_name, subject, grade_level, teacher_id, teacher_name, teacher_email,
      room, start_date, end_date, weekdays, start_time, end_time, active, note,
      archived_at, archived_by, created_by, updated_by, created_at, updated_at
    ) values (
      v_name, v_subject, v_grade, null, '', '', btrim(coalesce(p_room, '')),
      p_start_date, p_end_date, p_weekdays, p_start_time, p_end_time,
      coalesce(p_active, true), btrim(coalesce(p_note, '')), null, null,
      v_uid, v_uid, clock_timestamp(), clock_timestamp()
    ) returning * into v_group;
  else
    select * into v_group
    from public.bes_supplemental_groups g
    where g.id = p_group_id
    for update;
    if not found then raise exception 'Không tìm thấy lớp Học bổ sung.'; end if;
    if v_group.archived_at is not null then raise exception 'Lớp đã được lưu trữ.'; end if;

    update public.bes_supplemental_groups g
    set group_name = v_name,
        subject = v_subject,
        grade_level = v_grade,
        room = btrim(coalesce(p_room, '')),
        start_date = p_start_date,
        end_date = p_end_date,
        weekdays = p_weekdays,
        start_time = p_start_time,
        end_time = p_end_time,
        active = coalesce(p_active, true),
        note = btrim(coalesce(p_note, '')),
        updated_by = v_uid,
        updated_at = clock_timestamp()
    where g.id = p_group_id
    returning * into v_group;
  end if;

  perform public.bes_set_supplemental_class_teachers(v_group.id, coalesce(p_teachers, '[]'::jsonb));

  select * into v_group from public.bes_supplemental_groups g where g.id = v_group.id;
  return to_jsonb(v_group) || jsonb_build_object(
    'className', v_group.group_name,
    'note', v_group.note
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Archive instead of destructive delete. Historical sessions remain untouched.
-- -----------------------------------------------------------------------------
create or replace function public.bes_archive_supplemental_class(
  p_group_id uuid,
  p_reason text default 'Lớp đã được lưu trữ'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_group public.bes_supplemental_groups%rowtype;
  v_reason text := coalesce(nullif(btrim(p_reason), ''), 'Lớp đã được lưu trữ');
begin
  select * into v_group
  from public.bes_supplemental_groups g
  where g.id = p_group_id
  for update;
  if not found then raise exception 'Không tìm thấy lớp Học bổ sung.'; end if;

  if v_group.archived_at is null then
    update public.bes_supplemental_groups g
    set active = false,
        archived_at = clock_timestamp(),
        archived_by = v_uid,
        updated_by = v_uid,
        updated_at = clock_timestamp()
    where g.id = p_group_id
    returning * into v_group;

    update public.bes_supplemental_sessions s
    set status = 'cancelled',
        cancellation_reason = v_reason,
        updated_by = v_uid,
        updated_at = clock_timestamp()
    where s.group_id = p_group_id
      and s.kind = 'recurring'
      and s.status = 'scheduled'
      and s.roster_frozen_at is null
      and s.attendance_date >= current_date;
  end if;

  return to_jsonb(v_group);
end;
$$;

-- -----------------------------------------------------------------------------
-- Add/edit one manually managed student inside a class in one transaction.
-- -----------------------------------------------------------------------------
create or replace function public.bes_upsert_supplemental_class_member(
  p_group_id uuid,
  p_full_name text,
  p_student_id uuid default null,
  p_student_code text default '',
  p_school_class_name text default '',
  p_effective_from date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_group public.bes_supplemental_groups%rowtype;
  v_student public.bes_supplemental_students%rowtype;
  v_membership public.bes_supplemental_group_memberships%rowtype;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_code text := btrim(coalesce(p_student_code, ''));
  v_school_class text := btrim(coalesce(p_school_class_name, ''));
begin
  if v_name = '' then raise exception 'Họ và tên học sinh không được để trống.'; end if;

  select * into v_group
  from public.bes_supplemental_groups g
  where g.id = p_group_id and g.archived_at is null and g.active = true
  for update;
  if not found then raise exception 'Lớp Học bổ sung không hoạt động hoặc đã được lưu trữ.'; end if;

  if p_student_id is not null then
    select * into v_student
    from public.bes_supplemental_students s
    where s.id = p_student_id
    for update;
    if not found then raise exception 'Không tìm thấy học sinh.'; end if;
  elsif v_code <> '' then
    select * into v_student
    from public.bes_supplemental_students s
    where lower(btrim(s.student_code)) = lower(v_code)
      and s.source_type = 'manual'
      and s.linked_official_key is null
    order by s.active desc, s.updated_at desc
    limit 1
    for update;
  end if;

  if v_student.id is null then
    insert into public.bes_supplemental_students (
      source_type, official_key, linked_official_key, student_code, full_name,
      school_class_name, active, created_by, updated_by, created_at, updated_at
    ) values (
      'manual', null, null, v_code, v_name, v_school_class, true,
      v_uid, v_uid, clock_timestamp(), clock_timestamp()
    ) returning * into v_student;
  else
    update public.bes_supplemental_students s
    set student_code = v_code,
        full_name = v_name,
        school_class_name = v_school_class,
        active = true,
        updated_by = v_uid,
        updated_at = clock_timestamp()
    where s.id = v_student.id
    returning * into v_student;
  end if;

  select * into v_membership
  from public.bes_supplemental_group_memberships m
  where m.group_id = p_group_id
    and m.student_id = v_student.id
    and m.effective_until is null
  order by m.effective_from desc, m.created_at desc
  limit 1
  for update;

  if v_membership.id is null then
    insert into public.bes_supplemental_group_memberships (
      group_id, student_id, effective_from, effective_until, removal_reason,
      created_by, updated_by, created_at, updated_at
    ) values (
      p_group_id, v_student.id, coalesce(p_effective_from, current_date), null, '',
      v_uid, v_uid, clock_timestamp(), clock_timestamp()
    ) returning * into v_membership;
  end if;

  return jsonb_build_object(
    'student', to_jsonb(v_student),
    'membership', to_jsonb(v_membership),
    'status', 'active'
  );
end;
$$;

create or replace function public.bes_set_supplemental_class_member_status(
  p_group_id uuid,
  p_student_id uuid,
  p_active boolean,
  p_effective_date date default current_date,
  p_removal_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_group public.bes_supplemental_groups%rowtype;
  v_student public.bes_supplemental_students%rowtype;
  v_membership public.bes_supplemental_group_memberships%rowtype;
  v_date date := coalesce(p_effective_date, current_date);
begin
  select * into v_group
  from public.bes_supplemental_groups g
  where g.id = p_group_id
  for update;
  if not found then raise exception 'Không tìm thấy lớp Học bổ sung.'; end if;
  if v_group.archived_at is not null then raise exception 'Lớp đã được lưu trữ.'; end if;

  select * into v_student
  from public.bes_supplemental_students s
  where s.id = p_student_id
  for update;
  if not found then raise exception 'Không tìm thấy học sinh.'; end if;

  select * into v_membership
  from public.bes_supplemental_group_memberships m
  where m.group_id = p_group_id
    and m.student_id = p_student_id
    and m.effective_until is null
  order by m.effective_from desc, m.created_at desc
  limit 1
  for update;

  if coalesce(p_active, false) then
    if v_membership.id is null then
      insert into public.bes_supplemental_group_memberships (
        group_id, student_id, effective_from, effective_until, removal_reason,
        created_by, updated_by, created_at, updated_at
      ) values (
        p_group_id, p_student_id, v_date, null, '',
        v_uid, v_uid, clock_timestamp(), clock_timestamp()
      ) returning * into v_membership;
    end if;
    update public.bes_supplemental_students s
    set active = true, updated_by = v_uid, updated_at = clock_timestamp()
    where s.id = p_student_id;
  else
    if v_membership.id is not null then
      update public.bes_supplemental_group_memberships m
      set effective_until = greatest(m.effective_from, v_date),
          removal_reason = btrim(coalesce(p_removal_reason, '')),
          updated_by = v_uid,
          updated_at = clock_timestamp()
      where m.id = v_membership.id
      returning * into v_membership;
    end if;

    update public.bes_supplemental_students s
    set active = exists (
          select 1
          from public.bes_supplemental_group_memberships m
          where m.student_id = p_student_id
            and m.effective_until is null
        ),
        updated_by = v_uid,
        updated_at = clock_timestamp()
    where s.id = p_student_id;
  end if;

  select * into v_student from public.bes_supplemental_students s where s.id = p_student_id;
  return jsonb_build_object(
    'student', to_jsonb(v_student),
    'membership', to_jsonb(v_membership),
    'status', case when coalesce(p_active, false) then 'active' else 'stopped' end
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- One class-centric read model for management UI.
-- -----------------------------------------------------------------------------
create or replace function public.bes_list_supplemental_classes(
  p_include_archived boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.bes_require_supplemental_manager();

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'className', g.group_name,
        'groupName', g.group_name,
        'subject', g.subject,
        'gradeLevel', g.grade_level,
        'room', g.room,
        'startDate', g.start_date,
        'endDate', g.end_date,
        'weekdays', to_jsonb(g.weekdays),
        'startTime', to_char(g.start_time, 'HH24:MI'),
        'endTime', to_char(g.end_time, 'HH24:MI'),
        'active', g.active,
        'note', g.note,
        'archivedAt', g.archived_at,
        'archivedBy', g.archived_by,
        'teachers', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', t.id,
            'teacherId', t.teacher_id,
            'fullName', t.teacher_name,
            'email', t.teacher_email,
            'position', t.position
          ) order by t.position, t.teacher_name)
          from public.bes_supplemental_group_teachers t
          where t.group_id = g.id
        ), '[]'::jsonb),
        'members', coalesce((
          select jsonb_agg(jsonb_build_object(
            'membershipId', lm.membership_id,
            'studentId', lm.student_id,
            'studentCode', lm.student_code,
            'fullName', lm.full_name,
            'schoolClassName', lm.school_class_name,
            'effectiveFrom', lm.effective_from,
            'effectiveUntil', lm.effective_until,
            'removalReason', lm.removal_reason,
            'status', case when lm.effective_until is null and lm.student_active then 'active' else 'stopped' end
          ) order by lm.full_name, lm.student_code)
          from (
            select distinct on (m.student_id)
              m.id membership_id,
              m.student_id,
              st.student_code,
              st.full_name,
              st.school_class_name,
              st.active student_active,
              m.effective_from,
              m.effective_until,
              m.removal_reason
            from public.bes_supplemental_group_memberships m
            join public.bes_supplemental_students st on st.id = m.student_id
            where m.group_id = g.id
            order by m.student_id, m.effective_from desc, m.created_at desc
          ) lm
        ), '[]'::jsonb),
        'activeStudentCount', (
          select count(distinct m.student_id)
          from public.bes_supplemental_group_memberships m
          join public.bes_supplemental_students st on st.id = m.student_id
          where m.group_id = g.id
            and m.effective_until is null
            and st.active = true
        ),
        'nextSession', (
          select jsonb_build_object(
            'id', s.id,
            'date', s.attendance_date,
            'status', s.status,
            'startTime', to_char(s.start_time, 'HH24:MI'),
            'endTime', to_char(s.end_time, 'HH24:MI')
          )
          from public.bes_supplemental_sessions s
          where s.group_id = g.id
            and s.kind = 'recurring'
            and s.status in ('scheduled', 'in_progress')
            and s.attendance_date >= current_date
          order by s.attendance_date, s.start_time
          limit 1
        )
      )
      order by (g.archived_at is not null), g.active desc, g.group_name
    )
    from public.bes_supplemental_groups g
    where coalesce(p_include_archived, true) or g.archived_at is null
  ), '[]'::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- Supplemental attendance authorization branch. Extra-class behavior remains
-- unchanged; supplemental sessions bypass generic Attendance permissions entirely.
-- -----------------------------------------------------------------------------
create or replace function private.bes_attendance_access_decision(
  p_class_id uuid,
  p_teacher_name text,
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
  v_enforced boolean := false;
  v_start time := time '16:40';
  v_end time := time '17:15';
  v_local_time time := (coalesce(p_now, clock_timestamp()) at time zone 'Asia/Ho_Chi_Minh')::time;
  v_is_admin boolean := false;
  v_has_report boolean := false;
  v_in_window boolean := false;
  v_activity_exists boolean := false;
begin
  if exists (
    select 1 from public.bes_supplemental_sessions s
    where s.id = p_class_id and s.status <> 'cancelled'
  ) then
    if private.bes_is_supplemental_manager() then
      return jsonb_build_object('allowed', true, 'reason', 'supplemental_manager', 'bypass', true);
    end if;
    return jsonb_build_object('allowed', false, 'reason', 'supplemental_not_allowed');
  end if;

  if v_uid is null then return jsonb_build_object('allowed', false, 'reason', 'not_authenticated'); end if;
  select * into v_profile from public.profiles p where p.id = v_uid and p.approved = true;
  if not found then return jsonb_build_object('allowed', false, 'reason', 'profile_not_approved'); end if;

  v_is_admin := lower(coalesce(v_profile.role, '')) in ('admin', 'administrator');
  v_has_report := coalesce(v_profile.permissions->'allowed', '[]'::jsonb) ? 'attendance:report';
  if v_is_admin then return jsonb_build_object('allowed', true, 'reason', 'admin_bypass', 'bypass', true); end if;
  if v_has_report then return jsonb_build_object('allowed', true, 'reason', 'report_bypass', 'bypass', true); end if;
  if not public.can_take_extra_class_attendance() then return jsonb_build_object('allowed', false, 'reason', 'missing_permission'); end if;

  select coalesce(s.enforce_teacher_time_window, false), s.teacher_start_time, s.teacher_end_time
  into v_enforced, v_start, v_end
  from public.bes_attendance_access_settings s
  where s.id = 1;
  v_enforced := coalesce(v_enforced, false);
  v_start := coalesce(v_start, time '16:40');
  v_end := coalesce(v_end, time '17:15');

  if not v_enforced then
    return jsonb_build_object('allowed', true, 'reason', 'restriction_disabled', 'bypass', false,
      'window_start', to_char(v_start, 'HH24:MI'), 'window_end', to_char(v_end, 'HH24:MI'));
  end if;

  perform p_teacher_name;
  select exists(select 1 from public.bes_extra_classes c where c.id = p_class_id and c.active = true)
  into v_activity_exists;
  if not v_activity_exists then return jsonb_build_object('allowed', false, 'reason', 'class_not_found'); end if;
  if v_start = v_end then return jsonb_build_object('allowed', false, 'reason', 'invalid_time', 'class_id', p_class_id); end if;
  if v_end > v_start then
    v_in_window := v_local_time >= v_start and v_local_time <= v_end;
  else
    v_in_window := v_local_time >= v_start or v_local_time <= v_end;
  end if;
  if not v_in_window then
    return jsonb_build_object('allowed', false, 'reason', 'outside_time', 'class_id', p_class_id,
      'window_start', to_char(v_start, 'HH24:MI'), 'window_end', to_char(v_end, 'HH24:MI'));
  end if;
  return jsonb_build_object('allowed', true, 'reason', 'within_window', 'bypass', false, 'class_id', p_class_id,
    'window_start', to_char(v_start, 'HH24:MI'), 'window_end', to_char(v_end, 'HH24:MI'));
end;
$$;

-- Storage-policy helpers must also obey the dedicated supplemental rule.
create or replace function public.bes_can_upload_supplemental_proof(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.bes_is_supplemental_manager()
    and exists (
      select 1
      from public.bes_supplemental_sessions s
      where s.id::text = split_part(coalesce(p_object_name, ''), '/', 1)
        and s.status = 'confirmed'
        and s.checked_by = auth.uid()
    );
$$;

create or replace function public.bes_can_view_supplemental_proof(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.bes_is_supplemental_manager()
    and exists (
      select 1
      from public.bes_supplemental_sessions s
      where s.id::text = split_part(coalesce(p_object_name, ''), '/', 1)
        and s.status = 'confirmed'
        and nullif(btrim(s.proof_path), '') is not null
        and s.proof_path = p_object_name
    );
$$;

create or replace function public.bes_attach_supplemental_proof(
  p_session_id uuid,
  p_proof_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_session public.bes_supplemental_sessions%rowtype;
  v_path text := btrim(coalesce(p_proof_path, ''));
begin
  if v_path = '' or split_part(v_path, '/', 1) <> p_session_id::text then
    raise exception 'Đường dẫn minh chứng không hợp lệ.';
  end if;
  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id = p_session_id
  for update;
  if not found then raise exception 'Không tìm thấy buổi Học bổ sung.'; end if;
  if v_session.status <> 'confirmed' then raise exception 'Chỉ buổi đã chốt mới được gắn minh chứng.'; end if;
  if v_session.checked_by <> v_uid then raise exception 'Chỉ người chốt điểm danh mới được gắn minh chứng.'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'attendance-session-proofs' and o.name = v_path
  ) then raise exception 'Ảnh minh chứng chưa được tải lên máy chủ.'; end if;

  update public.bes_supplemental_sessions s
  set proof_path = v_path, updated_by = v_uid, updated_at = clock_timestamp()
  where s.id = p_session_id
  returning * into v_session;
  return to_jsonb(v_session);
end;
$$;

-- Shared Attendance activity feed: keep legacy extra-class visibility intact,
-- but supplemental rows are present only for the dedicated supplemental managers.
create or replace function public.bes_list_attendance_activities(
  p_from date default current_date,
  p_to date default current_date,
  p_activity_type text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := lower(btrim(coalesce(p_activity_type, 'all')));
  v_can_extra boolean := public.can_read_extra_class_attendance();
  v_can_supplemental boolean := private.bes_is_supplemental_manager();
begin
  if v_type not in ('all', 'remedial', 'enrichment', 'supplemental') then
    raise exception 'Loại hoạt động không hợp lệ.';
  end if;
  if v_type = 'supplemental' and not v_can_supplemental then
    raise exception 'Tài khoản không có quyền truy cập Học bổ sung.' using errcode = '42501';
  end if;
  if v_type in ('remedial', 'enrichment') and not v_can_extra then
    raise exception 'Tài khoản không có quyền xem dữ liệu Điểm danh.' using errcode = '42501';
  end if;
  if v_type = 'all' and not (v_can_extra or v_can_supplemental) then
    raise exception 'Tài khoản không có quyền xem dữ liệu Điểm danh.' using errcode = '42501';
  end if;

  return coalesce((
    with activities as (
      select
        x.id::text as id,
        'extra'::text as source,
        case when lower(coalesce(x.class_type, '')) in ('gifted', 'enrichment') then 'enrichment' else 'remedial' end as activity_type,
        x.class_name as title,
        x.subject,
        x.teacher_name,
        x.attendance_date,
        x.teaching_time_range as time_range,
        x.teaching_room as room,
        x.total_students as participant_count,
        x.present_count,
        x.absent_count,
        (select count(*) from public.bes_extra_attendance_records r where r.session_id = x.id and lower(coalesce(r.status, '')) = 'tardy')::integer as tardy_count,
        x.session_status as status,
        null::text as supplemental_kind
      from public.bes_extra_attendance_sessions x
      where v_can_extra and x.attendance_date between p_from and p_to

      union all

      select
        s.id::text,
        'supplemental',
        'supplemental',
        s.title,
        s.subject,
        s.teacher_name,
        s.attendance_date,
        to_char(s.start_time, 'HH24:MI') || '–' || to_char(s.end_time, 'HH24:MI'),
        s.room,
        case
          when s.kind = 'recurring' and s.status in ('scheduled', 'in_progress') then (
            select count(distinct private.bes_supplemental_canonical_key(m.student_id))
            from public.bes_supplemental_group_memberships m
            join public.bes_supplemental_students st on st.id = m.student_id and st.active = true
            where m.group_id = s.group_id
              and m.effective_from <= s.attendance_date
              and (m.effective_until is null or m.effective_until >= s.attendance_date)
          )::integer
          else (
            select count(*) from public.bes_supplemental_session_participants p where p.session_id = s.id
          )::integer
        end,
        s.present_count,
        s.absent_count,
        s.tardy_count,
        s.status,
        s.kind
      from public.bes_supplemental_sessions s
      where v_can_supplemental and s.attendance_date between p_from and p_to
    )
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'source', a.source,
      'activityType', a.activity_type,
      'title', a.title,
      'subject', a.subject,
      'teacherName', a.teacher_name,
      'date', a.attendance_date,
      'timeRange', a.time_range,
      'room', a.room,
      'participantCount', a.participant_count,
      'totalStudents', a.participant_count,
      'presentCount', coalesce(a.present_count, 0),
      'absentCount', coalesce(a.absent_count, 0),
      'tardyCount', coalesce(a.tardy_count, 0),
      'status', a.status,
      'supplementalKind', a.supplemental_kind
    ) order by a.attendance_date, a.time_range, a.title)
    from activities a
    where v_type = 'all' or a.activity_type = v_type
  ), '[]'::jsonb);
end;
$$;

-- New RPCs are callable only by signed-in clients; every body still enforces the
-- strict server-side manager guard above.
revoke all on function public.bes_list_supplemental_classes(boolean) from public, anon;
revoke all on function public.bes_upsert_supplemental_class(text,text,text,date,date,smallint[],time without time zone,time without time zone,uuid,text,text,boolean,jsonb) from public, anon;
revoke all on function public.bes_archive_supplemental_class(uuid,text) from public, anon;
revoke all on function public.bes_upsert_supplemental_class_member(uuid,text,uuid,text,text,date) from public, anon;
revoke all on function public.bes_set_supplemental_class_member_status(uuid,uuid,boolean,date,text) from public, anon;
revoke all on function public.bes_set_supplemental_class_teachers(uuid,jsonb) from public, anon;
grant execute on function public.bes_list_supplemental_classes(boolean) to authenticated;
grant execute on function public.bes_upsert_supplemental_class(text,text,text,date,date,smallint[],time without time zone,time without time zone,uuid,text,text,boolean,jsonb) to authenticated;
grant execute on function public.bes_archive_supplemental_class(uuid,text) to authenticated;
grant execute on function public.bes_upsert_supplemental_class_member(uuid,text,uuid,text,text,date) to authenticated;
grant execute on function public.bes_set_supplemental_class_member_status(uuid,uuid,boolean,date,text) to authenticated;
grant execute on function public.bes_set_supplemental_class_teachers(uuid,jsonb) to authenticated;

-- Legacy supplemental RPCs retain their signatures but now inherit the strict
-- manager helpers above. Keep authenticated execution for compatibility.
revoke all on function public.bes_can_upload_supplemental_proof(text) from anon;
revoke all on function public.bes_can_view_supplemental_proof(text) from anon;
