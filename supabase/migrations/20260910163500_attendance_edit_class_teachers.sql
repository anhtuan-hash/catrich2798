-- 2026-09-10: allow Admin / attendance:manage users to edit class metadata and
-- the complete teacher assignment list in one transaction.
-- Attendance sessions remain immutable historical snapshots and are not touched here.

create or replace function public.bes_admin_update_extra_class(
  p_class_id uuid,
  p_class_name text,
  p_subject text,
  p_grade_level integer,
  p_room text,
  p_time_range text,
  p_weekdays integer[],
  p_teacher_names text[]
)
returns public.bes_extra_classes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.bes_extra_classes%rowtype;
  v_weekdays_text text;
  v_teacher_names text[] := '{}'::text[];
  v_teacher_name text;
  v_position integer := 0;
begin
  if not public.can_manage_extra_class_roster() then
    raise exception 'Bạn không có quyền Quản lý lớp.' using errcode = '42501';
  end if;

  if p_class_id is null then
    raise exception 'Không xác định được lớp cần sửa.' using errcode = '22004';
  end if;
  if trim(coalesce(p_class_name, '')) = '' then
    raise exception 'Tên lớp không được để trống.' using errcode = '22023';
  end if;
  if p_grade_level is null or p_grade_level not in (10, 11, 12) then
    raise exception 'Khối lớp phải là 10, 11 hoặc 12.' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_weekdays), 0) = 0 then
    raise exception 'Vui lòng chọn ít nhất một ngày học trong tuần.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_weekdays, '{}'::integer[])) as d(value)
    where d.value < 0 or d.value > 6
  ) then
    raise exception 'Thứ học không hợp lệ.' using errcode = '22023';
  end if;

  foreach v_teacher_name in array coalesce(p_teacher_names, '{}'::text[])
  loop
    v_teacher_name := trim(coalesce(v_teacher_name, ''));
    if v_teacher_name <> '' and not exists (
      select 1
      from unnest(v_teacher_names) as existing(name)
      where lower(trim(existing.name)) = lower(v_teacher_name)
    ) then
      v_teacher_names := array_append(v_teacher_names, v_teacher_name);
    end if;
  end loop;

  if coalesce(cardinality(v_teacher_names), 0) = 0 then
    raise exception 'Lớp phải có ít nhất một giáo viên.' using errcode = '22023';
  end if;

  select * into v_row
  from public.bes_extra_classes c
  where c.id = p_class_id
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp cần sửa.' using errcode = 'P0002';
  end if;

  select string_agg(
    case when d.value = 0 then 'CN' else (d.value + 1)::text end,
    ',' order by case when d.value = 0 then 7 else d.value end
  )
  into v_weekdays_text
  from (
    select distinct value
    from unnest(p_weekdays) as weekdays(value)
  ) d;

  -- Remove assignments no longer selected. Matching is case-insensitive so a
  -- capitalization-only correction keeps the same normalized assignment row.
  delete from public.bes_extra_class_teachers t
  where t.class_id = p_class_id
    and not exists (
      select 1
      from unnest(v_teacher_names) as desired(name)
      where lower(trim(desired.name)) = lower(trim(t.teacher_name))
    );

  foreach v_teacher_name in array v_teacher_names
  loop
    v_position := v_position + 1;

    update public.bes_extra_class_teachers t
    set teacher_name = v_teacher_name,
        position = v_position,
        updated_by = auth.uid(),
        updated_at = clock_timestamp()
    where t.class_id = p_class_id
      and lower(trim(t.teacher_name)) = lower(v_teacher_name);

    if not found then
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
        p_class_id,
        null,
        v_teacher_name,
        '',
        v_position,
        'manual-edit:' || p_class_id::text || ':' || gen_random_uuid()::text,
        auth.uid(),
        auth.uid(),
        clock_timestamp(),
        clock_timestamp()
      );
    end if;
  end loop;

  update public.bes_extra_classes
  set class_name = trim(p_class_name),
      subject = trim(coalesce(p_subject, '')),
      grade_level = p_grade_level::text,
      room = trim(coalesce(p_room, '')),
      time_range = trim(coalesce(p_time_range, '')),
      weekdays = coalesce(v_weekdays_text, ''),
      teacher_id = null,
      teacher_name = array_to_string(v_teacher_names, ', '),
      teacher_email = '',
      updated_by = auth.uid(),
      updated_at = clock_timestamp()
  where id = p_class_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.bes_admin_update_extra_class(uuid,text,text,integer,text,text,integer[],text[]) from public;
revoke all on function public.bes_admin_update_extra_class(uuid,text,text,integer,text,text,integer[],text[]) from anon;
grant execute on function public.bes_admin_update_extra_class(uuid,text,text,integer,text,text,integer[],text[]) to authenticated;

-- Ensure PostgREST sees the new overload immediately after migration deployment.
notify pgrst, 'reload schema';
