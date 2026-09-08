-- 2026-09-08: explicitly remove anonymous execution from private attendance proof helpers.
-- Supabase may retain role-specific EXECUTE grants even after revoking PUBLIC.

revoke execute on function public.can_view_extra_attendance_proof() from anon;
revoke execute on function public.bes_set_extra_attendance_proof(uuid,text) from anon;

grant execute on function public.can_view_extra_attendance_proof() to authenticated;
grant execute on function public.bes_set_extra_attendance_proof(uuid,text) to authenticated;
