-- 2026-09-08: allow approved users with the explicit route:attendance grant to manage extra-class attendance.
-- Admins retain unconditional access. The broad teacher permission mode does not grant attendance.

create or replace function public.can_manage_extra_class_attendance()
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
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'
      )
  );
$$;

revoke all on function public.can_manage_extra_class_attendance() from public;
grant execute on function public.can_manage_extra_class_attendance() to authenticated;
