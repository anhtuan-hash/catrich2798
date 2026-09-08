-- 2026-09-08: fix manually created extra classes losing authoritative teacher assignments.
-- Safe to re-run.

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

  foreach v_teacher_name in array v_teacher_names
  loop
    v_position := v_position + 1;
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
      v_position,
      v_source_key || '::teacher::' || lpad(v_position::text, 2, '0'),
      auth.uid(),
      auth.uid(),
      clock_timestamp(),
      clock_timestamp()
    );
  end loop;

  return v_class;
exception
  when unique_violation then
    raise exception 'Lớp hoặc mã phân công này đã tồn tại trên hệ thống.' using errcode = '23505';
end;
$$;

revoke all on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) from public;
revoke all on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) from anon;
grant execute on function public.bes_create_extra_class_with_teachers(text, text, text, text, text, text, text[]) to authenticated;

-- Repair the production class that was recreated before normalized teacher persistence existed.
do $repair_english_10$
declare
  v_class public.bes_extra_classes%rowtype;
  v_actor uuid;
begin
  select * into v_class
  from public.bes_extra_classes c
  where c.active = true
    and lower(trim(c.class_name)) = lower('Bồi dưỡng tiếng Anh 10')
    and lower(trim(c.subject)) = lower('Tiếng Anh')
  order by c.created_at desc, c.id
  limit 1
  for update;

  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.bes_extra_classes c
    where c.source_key = 'hsg-2026-tieng-anh-10'
      and c.id <> v_class.id
  ) then
    raise exception 'Mã hsg-2026-tieng-anh-10 đang thuộc một lớp khác; dừng repair để tránh ghi đè.';
  end if;

  v_actor := coalesce(v_class.updated_by, v_class.created_by);

  update public.bes_extra_classes
  set source_key = 'hsg-2026-tieng-anh-10',
      school_year = '2026-2027',
      grade_level = '10',
      teacher_id = null,
      teacher_name = 'Ngô Thị Mỹ Diệp, Nguyễn Thị Mỹ Duyên',
      teacher_email = '',
      updated_by = v_actor,
      updated_at = clock_timestamp()
  where id = v_class.id;

  delete from public.bes_extra_class_teachers
  where class_id = v_class.id;

  insert into public.bes_extra_class_teachers (
    class_id, teacher_id, teacher_name, teacher_email, position,
    source_key, created_by, updated_by, created_at, updated_at
  ) values
    (v_class.id, null, 'Ngô Thị Mỹ Diệp', '', 1, 'hsg-2026-tieng-anh-10::teacher::01', v_actor, v_actor, clock_timestamp(), clock_timestamp()),
    (v_class.id, null, 'Nguyễn Thị Mỹ Duyên', '', 2, 'hsg-2026-tieng-anh-10::teacher::02', v_actor, v_actor, clock_timestamp(), clock_timestamp())
  on conflict (source_key) do update set
    class_id = excluded.class_id,
    teacher_id = excluded.teacher_id,
    teacher_name = excluded.teacher_name,
    teacher_email = excluded.teacher_email,
    position = excluded.position,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
end;
$repair_english_10$;
