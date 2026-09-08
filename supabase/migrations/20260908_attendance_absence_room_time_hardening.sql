-- 2026-09-08: remove attendance write signatures that cannot carry room/time and absence reasons.
-- Apply only after the rich frontend is confirmed live on Vercel.

drop function if exists public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, text[], text);
drop function if exists public.bes_cancel_extra_class_session(uuid, date, text);

revoke all on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, jsonb, text, text, text) from public;
revoke all on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, jsonb, text, text, text) from anon;
grant execute on function public.bes_confirm_extra_class_attendance(uuid, date, text, numeric, jsonb, text, text, text) to authenticated;

revoke all on function public.bes_cancel_extra_class_session(uuid, date, text, text, text) from public;
revoke all on function public.bes_cancel_extra_class_session(uuid, date, text, text, text) from anon;
grant execute on function public.bes_cancel_extra_class_session(uuid, date, text, text, text) to authenticated;
