-- 2026-09-08: enforce the new attendance confirmation contract.
-- Old RPC overloads could bypass mandatory lesson-period selection.

drop function if exists public.bes_confirm_extra_class_attendance(uuid, date, text, text[], text);
drop function if exists public.bes_confirm_extra_class_attendance(uuid, text[], text);

-- Only the Material 3 signature remains:
-- bes_confirm_extra_class_attendance(uuid, date, text, numeric, text[], text)
