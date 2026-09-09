-- 2026-09-09: align class-detail editing with the explicit attendance:manage permission.
-- Keep the historical RPC name for frontend compatibility, but authorize through
-- can_manage_extra_class_roster() so a granted teacher can manage every class.

create or replace function public.bes_admin_update_extra_class(
  p_class_id uuid,
  p_class_name text,
  p_subject text,
  p_grade_level integer,
  p_room text,
  p_time_range text,
  p_weekdays integer[]
)
returns public.bes_extra_classes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.bes_extra_classes%rowtype;
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

  select string_agg(
    case when d.value = 0 then 'CN' else (d.value + 1)::text end,
    ',' order by case when d.value = 0 then 7 else d.value end
  )
  into v_weekdays_text
  from (
    select distinct value
    from unnest(p_weekdays) as weekdays(value)
  ) d;

  update public.bes_extra_classes
  set class_name = trim(p_class_name),
      subject = trim(coalesce(p_subject, '')),
      grade_level = p_grade_level::text,
      room = trim(coalesce(p_room, '')),
      time_range = trim(coalesce(p_time_range, '')),
      weekdays = coalesce(v_weekdays_text, ''),
      updated_by = auth.uid(),
      updated_at = clock_timestamp()
  where id = p_class_id
  returning * into v_row;

  if not found then
    raise exception 'Không tìm thấy lớp cần sửa.' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.bes_admin_update_extra_class(uuid,text,text,integer,text,text,integer[]) from public;
revoke all on function public.bes_admin_update_extra_class(uuid,text,text,integer,text,text,integer[]) from anon;
grant execute on function public.bes_admin_update_extra_class(uuid,text,text,integer,text,text,integer[]) to authenticated;
