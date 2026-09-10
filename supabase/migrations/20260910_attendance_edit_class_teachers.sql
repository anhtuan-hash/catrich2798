-- 2026-09-10: allow attendance:manage users to replace the current teacher list
-- while editing class metadata. Confirmed attendance sessions/records remain snapshots.

create or replace function public.bes_update_extra_class_with_teachers(
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
  v_teacher_name text;
  v_teacher_names text[] := '{}'::text[];
  v_position integer := 0;
  v_weekdays_text text;
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
    v_teacher_name := regexp_replace(trim(coalesce(v_teacher_name, '')), '\s+', ' ', 'g');
    if v_teacher_name <> '' and not exists (
      select 1
      from unnest(v_teacher_names) as existing(name)
      where lower(existing.name) = lower(v_teacher_name)
    ) then
      v_teacher_names := array_append(v_teacher_names, v_teacher_name);
    end if;
  end loop;

  if coalesce(array_length(v_teacher_names, 1), 0) = 0 then
    raise exception 'Lớp phải có ít nhất một giáo viên.' using errcode = '22023';
  end if;

  select * into v_row
  from public.bes_extra_classes
  where id = p_class_id
    and active = true
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp đang hoạt động cần sửa.' using errcode = 'P0002';
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

  delete from public.bes_extra_class_teachers
  where class_id = p_class_id;

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
      p_class_id,
      null,
      v_teacher_name,
      '',
      v_position,
      'manual-edit:' || p_class_id::text || ':teacher:' || lpad(v_position::text, 2, '0'),
      auth.uid(),
      auth.uid(),
      clock_timestamp(),
      clock_timestamp()
    );
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

revoke all on function public.bes_update_extra_class_with_teachers(uuid,text,text,integer,text,text,integer[],text[]) from public;
revoke all on function public.bes_update_extra_class_with_teachers(uuid,text,text,integer,text,text,integer[],text[]) from anon;
grant execute on function public.bes_update_extra_class_with_teachers(uuid,text,text,integer,text,text,integer[],text[]) to authenticated;
