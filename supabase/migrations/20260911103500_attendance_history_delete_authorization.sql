-- 2026-09-11: restrict destructive attendance-history deletion.
-- Only approved Admin/Administrator accounts and Nguyễn Thị Hồng Thắm's
-- approved account may delete a finalized attendance session.
-- This authorization is deliberately independent from attendance:quick,
-- attendance:history, attendance:report, and the teacher time window.

create or replace function public.can_delete_extra_attendance_history()
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
        or lower(trim(coalesce(p.email, ''))) = 'hongtham@accounts.brianenglish.studio'
      )
  );
$$;

revoke all on function public.can_delete_extra_attendance_history() from public;
revoke all on function public.can_delete_extra_attendance_history() from anon;
grant execute on function public.can_delete_extra_attendance_history() to authenticated;

create or replace function public.bes_delete_extra_attendance_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_record_count integer := 0;
begin
  if not public.can_delete_extra_attendance_history() then
    raise exception 'Bạn không có quyền xóa lịch sử điểm danh.' using errcode = '42501';
  end if;

  select * into v_session
  from public.bes_extra_attendance_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Không tìm thấy buổi điểm danh cần xóa.' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_record_count
  from public.bes_extra_attendance_records
  where session_id = p_session_id;

  delete from public.bes_extra_attendance_sessions where id = p_session_id;

  return jsonb_build_object(
    'session_id', v_session.id,
    'class_id', v_session.class_id,
    'class_name', v_session.class_name,
    'checked_at', v_session.checked_at,
    'deleted_records', v_record_count
  );
end;
$$;

revoke all on function public.bes_delete_extra_attendance_session(uuid) from public;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from anon;
grant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;
