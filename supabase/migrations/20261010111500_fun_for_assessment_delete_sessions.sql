-- Fun for Assessment: allow teachers to delete their own assessment sessions.
-- Related per-student results are removed by ON DELETE CASCADE.

create or replace function public.lesson_check_delete_assessment_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if not public.lesson_check_is_approved_user() then
    raise exception 'Approved account required';
  end if;

  delete from public.lesson_check_assessment_sessions s
  where s.id = p_session_id
    and (s.teacher_id = auth.uid() or public.lesson_check_is_leader());

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'Assessment session not found or access denied';
  end if;

  return true;
end;
$$;

revoke all on function public.lesson_check_delete_assessment_session(uuid) from public;
revoke execute on function public.lesson_check_delete_assessment_session(uuid) from anon;
grant execute on function public.lesson_check_delete_assessment_session(uuid) to authenticated;
