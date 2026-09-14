-- Brian English — allow Attendance report operators to create NEW remedial/gifted classes.
--
-- This migration deliberately separates class creation from roster management.
-- `attendance:report` may create a new class (manual or Excel import), but it
-- does not gain update/delete/member-management privileges on existing classes.

create or replace function public.can_create_extra_class_roster()
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
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:manage'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:report'
      )
  );
$$;

revoke all on function public.can_create_extra_class_roster() from public;
revoke all on function public.can_create_extra_class_roster() from anon;
grant execute on function public.can_create_extra_class_roster() to authenticated;

-- Preserve the existing transactional manual-class RPC body and change only
-- its authorization gate. Existing edit/delete RPCs continue to use
-- can_manage_extra_class_roster().
do $report_create_gate$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.bes_create_extra_class_with_teachers(text,text,text,text,text,text,text[])'::regprocedure
  ) into v_definition;

  if position('public.can_create_extra_class_roster()' in v_definition) > 0 then
    return;
  end if;

  if position('public.can_manage_extra_class_roster()' in v_definition) = 0 then
    raise exception 'Unexpected bes_create_extra_class_with_teachers authorization body';
  end if;

  execute replace(
    v_definition,
    'public.can_manage_extra_class_roster()',
    'public.can_create_extra_class_roster()'
  );
end
$report_create_gate$;

-- Transactional create-only RPC for Excel import. It creates one new class,
-- its normalized teachers and its initial members in a single transaction.
-- It never accepts a class id and therefore cannot update an existing class.
create or replace function public.bes_create_extra_class_with_members(
  p_class_type text,
  p_class_name text,
  p_subject text,
  p_source_key text,
  p_school_year text,
  p_grade_level text,
  p_teacher_names text[],
  p_members jsonb
)
returns public.bes_extra_classes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_class_name text := trim(coalesce(p_class_name, ''));
  v_subject text := trim(coalesce(p_subject, ''));
  v_source_key text := nullif(trim(coalesce(p_source_key, '')), '');
  v_school_year text := trim(coalesce(p_school_year, ''));
  v_grade_level text := trim(coalesce(p_grade_level, ''));
  v_teacher_name text;
  v_teacher_names text[] := '{}'::text[];
  v_teacher_source_base text;
  v_teacher_position integer := 0;
  v_members jsonb := coalesce(p_members, '[]'::jsonb);
  v_member jsonb;
  v_member_key text;
  v_student_code text;
  v_student_full_name text;
  v_school_class_name text;
begin
  if not public.can_create_extra_class_roster() then
    raise exception 'Bạn không có quyền tạo lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;

  if p_class_type not in ('remedial', 'gifted') then
    raise exception 'Loại lớp không hợp lệ.' using errcode = '22023';
  end if;

  if v_class_name = '' then
    raise exception 'Tên lớp không được để trống.' using errcode = '22023';
  end if;

  if v_grade_level <> '' and v_grade_level not in ('10', '11', '12') then
    raise exception 'Khối lớp phải là 10, 11 hoặc 12.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_members) <> 'array' then
    raise exception 'Danh sách học sinh import không hợp lệ.' using errcode = '22023';
  end if;

  foreach v_teacher_name in array coalesce(p_teacher_names, '{}'::text[])
  loop
    v_teacher_name := trim(coalesce(v_teacher_name, ''));
    if v_teacher_name <> '' and not (v_teacher_name = any(v_teacher_names)) then
      v_teacher_names := array_append(v_teacher_names, v_teacher_name);
    end if;
  end loop;

  if coalesce(array_length(v_teacher_names, 1), 0) = 0 then
    raise exception 'Lớp phải có ít nhất một giáo viên.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.bes_extra_classes c
    where c.active = true
      and c.class_type = p_class_type
      and lower(trim(c.class_name)) = lower(v_class_name)
      and lower(trim(c.subject)) = lower(v_subject)
  ) then
    raise exception 'Lớp này đã tồn tại trên hệ thống.' using errcode = '23505';
  end if;

  insert into public.bes_extra_classes (
    class_type,
    class_name,
    subject,
    teacher_id,
    teacher_name,
    teacher_email,
    active,
    source_key,
    school_year,
    grade_level,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    p_class_type,
    v_class_name,
    v_subject,
    null,
    array_to_string(v_teacher_names, ', '),
    '',
    true,
    v_source_key,
    v_school_year,
    v_grade_level,
    auth.uid(),
    auth.uid(),
    clock_timestamp(),
    clock_timestamp()
  )
  returning * into v_class;

  v_teacher_source_base := coalesce(v_source_key, 'attendance-create-' || v_class.id::text);

  foreach v_teacher_name in array v_teacher_names
  loop
    v_teacher_position := v_teacher_position + 1;
    insert into public.bes_extra_class_teachers (
      class_id,
      teacher_id,
      teacher_name,
      teacher_email,
      position,
      source_key,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) values (
      v_class.id,
      null,
      v_teacher_name,
      '',
      v_teacher_position,
      v_teacher_source_base || '::teacher::' || lpad(v_teacher_position::text, 2, '0'),
      auth.uid(),
      auth.uid(),
      clock_timestamp(),
      clock_timestamp()
    );
  end loop;

  for v_member in select value from jsonb_array_elements(v_members)
  loop
    v_member_key := trim(coalesce(v_member ->> 'member_key', ''));
    v_student_code := trim(coalesce(v_member ->> 'student_code', ''));
    v_student_full_name := trim(coalesce(v_member ->> 'student_full_name', ''));
    v_school_class_name := trim(coalesce(v_member ->> 'school_class_name', ''));

    if v_member_key = '' or v_student_full_name = '' then
      raise exception 'Mỗi học sinh phải có member_key và họ tên.' using errcode = '22023';
    end if;

    insert into public.bes_extra_class_members (
      class_id,
      member_key,
      student_code,
      student_full_name,
      school_class_name,
      active,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) values (
      v_class.id,
      v_member_key,
      v_student_code,
      v_student_full_name,
      v_school_class_name,
      true,
      auth.uid(),
      auth.uid(),
      clock_timestamp(),
      clock_timestamp()
    );
  end loop;

  return v_class;
exception
  when unique_violation then
    raise exception 'Lớp, phân công hoặc học sinh này đã tồn tại trên hệ thống.' using errcode = '23505';
end;
$$;

revoke all on function public.bes_create_extra_class_with_members(text, text, text, text, text, text, text[], jsonb) from public;
revoke all on function public.bes_create_extra_class_with_members(text, text, text, text, text, text, text[], jsonb) from anon;
grant execute on function public.bes_create_extra_class_with_members(text, text, text, text, text, text, text[], jsonb) to authenticated;

-- Reassert the manual RPC ACL after CREATE OR REPLACE via pg_get_functiondef.
revoke all on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) from public;
revoke all on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) from anon;
grant execute on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) to authenticated;
