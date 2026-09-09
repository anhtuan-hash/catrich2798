-- Keep the report override scoped to taking/cancelling attendance.
-- Deleting historical sessions remains a quick-attendance destructive action.
-- When the Admin time window is enabled, quick-only users must also satisfy
-- the assignment/time gate; Admin remains unrestricted.

do $attendance_delete_scope_fix$
declare
  v_definition text;
  v_old_gate text := 'public.bes_can_operate_extra_attendance_session(p_session_id, clock_timestamp())';
  v_new_gate text := '(public.can_take_extra_class_attendance() and public.bes_can_operate_extra_attendance_session(p_session_id, clock_timestamp()))';
begin
  select pg_get_functiondef('public.bes_delete_extra_attendance_session(uuid)'::regprocedure)
  into v_definition;

  if position(v_new_gate in v_definition) > 0 then
    return;
  end if;

  if position(v_old_gate in v_definition) = 0 then
    raise exception 'Unexpected delete attendance authorization gate';
  end if;

  execute replace(v_definition, v_old_gate, v_new_gate);
end
$attendance_delete_scope_fix$;

revoke all on function public.bes_delete_extra_attendance_session(uuid) from public;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from anon;
grant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;
