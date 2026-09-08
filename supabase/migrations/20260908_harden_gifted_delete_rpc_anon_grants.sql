-- 2026-09-08: explicitly remove anonymous execution from destructive extra-class RPCs.
-- PostgreSQL functions can retain direct role grants independently of PUBLIC grants,
-- so fresh installs and upgraded projects must revoke both.

revoke all on function public.bes_delete_extra_attendance_session(uuid) from anon;
revoke all on function public.bes_delete_extra_class(uuid) from anon;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from public;
revoke all on function public.bes_delete_extra_class(uuid) from public;

grant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;
grant execute on function public.bes_delete_extra_class(uuid) to authenticated;
