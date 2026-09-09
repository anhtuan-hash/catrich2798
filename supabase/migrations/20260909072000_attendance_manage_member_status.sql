create or replace function public.bes_update_extra_class_member(
  p_class_id uuid,
  p_member_id uuid,
  p_student_code text,
  p_student_full_name text,
  p_school_class_name text,
  p_active boolean
)
returns public.bes_extra_class_members
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_member public.bes_extra_class_members%rowtype;
  v_member_key text;
  v_student_code text := trim(coalesce(p_student_code, ''));
  v_student_full_name text := trim(coalesce(p_student_full_name, ''));
  v_school_class_name text := trim(coalesce(p_school_class_name, ''));
  v_active boolean := coalesce(p_active, true);
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:manage'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'
      )
  ) then
    raise exception 'Bạn không có quyền Quản lý lớp trong phân hệ Điểm danh.' using errcode = '42501';
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
  for update;

  if not found then
    raise exception 'Không tìm thấy học sinh trong lớp này.' using errcode = 'P0002';
  end if;

  v_member_key := public.bes_extra_member_key(v_student_code, v_student_full_name, v_school_class_name);
  if v_member_key = '' then
    raise exception 'Không tạo được mã nhận diện học sinh.' using errcode = '22023';
  end if;

  if v_active and exists (
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
      active = v_active,
      left_at = case
        when v_active then null
        when v_member.active is distinct from false then clock_timestamp()
        else coalesce(v_member.left_at, clock_timestamp())
      end,
      removed_by = case
        when v_active then null
        when v_member.active is distinct from false then auth.uid()
        else v_member.removed_by
      end,
      removal_reason = case
        when v_active then null
        when v_member.active is distinct from false then 'Đã nghỉ'
        else coalesce(nullif(trim(v_member.removal_reason), ''), 'Đã nghỉ')
      end,
      updated_by = auth.uid(),
      updated_at = clock_timestamp()
  where id = p_member_id
    and class_id = p_class_id
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.bes_update_extra_class_member(uuid, uuid, text, text, text, boolean) from public;
revoke all on function public.bes_update_extra_class_member(uuid, uuid, text, text, text, boolean) from anon;
revoke all on function public.bes_update_extra_class_member(uuid, uuid, text, text, text, boolean) from authenticated;
grant execute on function public.bes_update_extra_class_member(uuid, uuid, text, text, text, boolean) to authenticated;
