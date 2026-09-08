-- 2026-09-08: compatibility guard for older clients still calling the pre-date attendance RPC.
-- Single-teacher classes delegate safely to the new RPC; multi-teacher classes must use the new UI.

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
  v_teacher_count integer := 0;
  v_teacher_name text := '';
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền điểm danh lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;

  select * into v_class
  from public.bes_extra_classes
  where id = p_class_id
    and active = true;

  if not found then
    raise exception 'Không tìm thấy lớp phụ đạo/bồi dưỡng đang hoạt động.' using errcode = 'P0002';
  end if;

  select count(distinct lower(trim(t.teacher_name)))::integer,
         min(t.teacher_name)
    into v_teacher_count, v_teacher_name
  from public.bes_extra_class_teachers t
  where t.class_id = p_class_id
    and trim(coalesce(t.teacher_name, '')) <> '';

  if v_teacher_count = 0 then
    select count(distinct lower(trim(fallback_teacher.name)))::integer,
           min(trim(fallback_teacher.name))
      into v_teacher_count, v_teacher_name
    from regexp_split_to_table(coalesce(v_class.teacher_name, ''), '\s*,\s*') as fallback_teacher(name)
    where trim(fallback_teacher.name) <> '';
  end if;

  if v_teacher_count <> 1 then
    raise exception 'Lớp có nhiều giáo viên. Vui lòng chọn giáo viên dạy hôm nay trước khi xác nhận điểm danh.' using errcode = '22023';
  end if;

  return public.bes_confirm_extra_class_attendance(
    p_class_id => p_class_id,
    p_attendance_date => (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date,
    p_teacher_name => v_teacher_name,
    p_absent_member_keys => coalesce(p_absent_member_keys, '{}'::text[]),
    p_note => coalesce(p_note, '')
  );
end;
$$;

revoke all on function public.bes_confirm_extra_class_attendance(uuid, text[], text) from public;
revoke all on function public.bes_confirm_extra_class_attendance(uuid, text[], text) from anon;
grant execute on function public.bes_confirm_extra_class_attendance(uuid, text[], text) to authenticated;
