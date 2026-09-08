-- 2026-09-08: allow Admin to add a teacher manually to an extra class.
-- The normalized assignment table remains the source used by attendance confirmation.

create unique index if not exists bes_extra_class_teachers_class_name_uidx
  on public.bes_extra_class_teachers (class_id, lower(trim(teacher_name)));

create or replace function public.bes_add_extra_class_teacher(
  p_class_id uuid,
  p_teacher_name text
)
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

  select * into v_class
  from public.bes_extra_classes
  where id = p_class_id
    and active = true
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp đang hoạt động.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.bes_extra_class_teachers
    where class_id = p_class_id
      and lower(trim(teacher_name)) = lower(v_teacher_name)
  ) then
    raise exception 'Giáo viên này đã có trong lớp.' using errcode = '23505';
  end if;

  select coalesce(max(position), 0) + 1
    into v_position
  from public.bes_extra_class_teachers
  where class_id = p_class_id;

  begin
    insert into public.bes_extra_class_teachers (
      id, class_id, teacher_id, teacher_name, teacher_email,
      position, source_key, created_by, updated_by, created_at, updated_at
    ) values (
      v_id, p_class_id, null, v_teacher_name, '',
      v_position, 'manual:' || p_class_id::text || ':' || v_id::text,
      auth.uid(), auth.uid(), now(), now()
    )
    returning * into v_teacher;
  exception
    when unique_violation then
      raise exception 'Giáo viên này đã có trong lớp.' using errcode = '23505';
  end;

  update public.bes_extra_classes c
  set teacher_name = coalesce((
        select string_agg(t.teacher_name, ', ' order by t.position, t.teacher_name)
        from public.bes_extra_class_teachers t
        where t.class_id = p_class_id
      ), ''),
      updated_by = auth.uid(),
      updated_at = now()
  where c.id = p_class_id;

  return v_teacher;
end;
$$;

revoke all on function public.bes_add_extra_class_teacher(uuid, text) from public;
revoke all on function public.bes_add_extra_class_teacher(uuid, text) from anon;
grant execute on function public.bes_add_extra_class_teacher(uuid, text) to authenticated;
