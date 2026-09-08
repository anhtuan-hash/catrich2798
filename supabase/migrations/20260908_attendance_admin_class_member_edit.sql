-- 2026-09-08: Admin-only editing for current extra-class metadata and roster details.
-- Historical attendance sessions/records are immutable snapshots and are intentionally untouched.
-- Existing bes_extra_classes.weekdays storage is preserved as school-day text:
-- 2=Thứ 2/Monday ... 7=Thứ 7/Saturday, CN=Sunday.

create or replace function public.bes_extra_member_key(
  p_student_code text,
  p_student_full_name text,
  p_school_class_name text
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_code text := trim(coalesce(p_student_code, ''));
  v_identity text;
  v_key text;
begin
  if v_code ~ '^[0-9]+([.]0+)?$' then
    v_code := regexp_replace(v_code, '[.]0+$', '');
  end if;

  if v_code <> '' then
    v_key := trim(both '-' from regexp_replace(lower(v_code), '[^a-z0-9_-]+', '-', 'g'));
    if v_key <> '' then return 'code:' || v_key; end if;
  end if;

  v_identity := lower(trim(coalesce(p_student_full_name, '')) || '-' || trim(coalesce(p_school_class_name, '')));
  v_identity := translate(
    v_identity,
    'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
  );
  v_identity := regexp_replace(v_identity, '[^a-z0-9]+', '-', 'g');
  v_identity := trim(both '-' from v_identity);
  if v_identity = '' then return ''; end if;
  return 'identity:' || v_identity;
end;
$$;

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
set search_path = public
as $$
declare
  v_row public.bes_extra_classes%rowtype;
  v_weekdays_text text;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'administrator')
  ) then
    raise exception 'Chỉ Admin được sửa thông tin lớp.' using errcode = '42501';
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

create or replace function public.bes_admin_update_extra_class_member(
  p_class_id uuid,
  p_member_id uuid,
  p_student_code text,
  p_student_full_name text,
  p_school_class_name text
)
returns public.bes_extra_class_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.bes_extra_class_members%rowtype;
  v_member_key text;
  v_student_code text := trim(coalesce(p_student_code, ''));
  v_student_full_name text := trim(coalesce(p_student_full_name, ''));
  v_school_class_name text := trim(coalesce(p_school_class_name, ''));
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'administrator')
  ) then
    raise exception 'Chỉ Admin được sửa thông tin học sinh.' using errcode = '42501';
  end if;

  if p_class_id is null or p_member_id is null then
    raise exception 'Không xác định được học sinh cần sửa.' using errcode = '22004';
  end if;
  if v_student_full_name = '' then
    raise exception 'Họ và tên không được để trống.' using errcode = '22023';
  end if;
  if v_school_class_name = '' then
    raise exception 'Lớp chính khóa không được để trống.' using errcode = '22023';
  end if;

  select * into v_member
  from public.bes_extra_class_members m
  where m.id = p_member_id
    and m.class_id = p_class_id
    and m.active = true
  for update;

  if not found then
    raise exception 'Không tìm thấy học sinh đang học trong lớp này.' using errcode = 'P0002';
  end if;

  v_member_key := public.bes_extra_member_key(v_student_code, v_student_full_name, v_school_class_name);
  if v_member_key = '' then
    raise exception 'Không tạo được mã nhận diện học sinh.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.bes_extra_class_members duplicate
    where duplicate.class_id = p_class_id
      and duplicate.active = true
      and duplicate.id <> p_member_id
      and duplicate.member_key = v_member_key
  ) then
    raise exception 'Thông tin sau khi sửa bị trùng với một học sinh đang có trong lớp.' using errcode = '23505';
  end if;

  update public.bes_extra_class_members
  set student_code = v_student_code,
      student_full_name = v_student_full_name,
      school_class_name = v_school_class_name,
      member_key = v_member_key,
      updated_by = auth.uid(),
      updated_at = clock_timestamp()
  where id = p_member_id
    and class_id = p_class_id
    and active = true
  returning * into v_member;

  return v_member;
end;
$$;

-- Compatibility backfill: fill only values that are currently empty.
-- Do not overwrite any Admin-maintained value.
update public.bes_extra_classes
set room = case when trim(coalesce(room, '')) = '' then 'A201' else room end,
    weekdays = case when trim(coalesce(weekdays, '')) = '' then '2,3' else weekdays end,
    time_range = case when trim(coalesce(time_range, '')) = '' then '16h45 đến 18h15' else time_range end,
    updated_at = clock_timestamp()
where source_key = 'hsg-2026-tieng-anh-10'
  and (
    trim(coalesce(room, '')) = ''
    or trim(coalesce(weekdays, '')) = ''
    or trim(coalesce(time_range, '')) = ''
  );

update public.bes_extra_classes
set room = case
      when trim(coalesce(room, '')) <> '' then room
      when source_key in ('remedial-2026-tieng-anh-10', 'remedial-2026-toan-10') then 'A103'
      when source_key = 'remedial-2026-toan-11' then 'A301'
      else room
    end,
    weekdays = case
      when trim(coalesce(weekdays, '')) <> '' then weekdays
      when source_key = 'remedial-2026-tieng-anh-10' then '3,5'
      when source_key = 'remedial-2026-toan-10' then '2,6'
      when source_key = 'remedial-2026-toan-11' then '2,5'
      else weekdays
    end,
    updated_at = clock_timestamp()
where source_key in (
  'remedial-2026-tieng-anh-10',
  'remedial-2026-toan-10',
  'remedial-2026-toan-11'
)
  and (trim(coalesce(room, '')) = '' or trim(coalesce(weekdays, '')) = '');

revoke all on function public.bes_extra_member_key(text,text,text) from public;
revoke all on function public.bes_admin_update_extra_class(uuid,text,text,integer,text,text,integer[]) from public;
revoke all on function public.bes_admin_update_extra_class_member(uuid,uuid,text,text,text) from public;
grant execute on function public.bes_admin_update_extra_class(uuid,text,text,integer,text,text,integer[]) to authenticated;
grant execute on function public.bes_admin_update_extra_class_member(uuid,uuid,text,text,text) to authenticated;
