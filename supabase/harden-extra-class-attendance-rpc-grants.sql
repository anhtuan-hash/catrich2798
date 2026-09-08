-- Brian English — harden RPC grants for Admin-only extra-class attendance.
-- Keeps the client-facing RPCs available to signed-in users while removing anon/public execution.

revoke execute on function public.can_manage_extra_class_attendance() from public, anon;
revoke execute on function public.bes_extra_attendance_list_teachers() from public, anon;
revoke execute on function public.bes_confirm_extra_class_attendance(uuid, text[], text) from public, anon;

grant execute on function public.can_manage_extra_class_attendance() to authenticated;
grant execute on function public.bes_extra_attendance_list_teachers() to authenticated;
grant execute on function public.bes_confirm_extra_class_attendance(uuid, text[], text) to authenticated;
