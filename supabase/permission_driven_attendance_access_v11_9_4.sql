
-- Brian v11.9.4 · Permission-driven attendance access hardening
-- Remove identity-specific privilege exceptions and make Supplemental Learning
-- authorization depend on explicit permissions/roles.

create or replace function private.bes_is_supplemental_manager()
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:manage'
      )
  );
$function$;

create or replace function public.can_delete_extra_attendance_history()
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and (
        lower(trim(coalesce(p.role, ''))) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:delete'
      )
  );
$function$;

-- Internal authorization helpers are not client RPCs.
revoke execute on function private.bes_is_supplemental_manager() from public;
revoke execute on function private.bes_is_supplemental_manager() from anon;
revoke execute on function private.bes_is_supplemental_manager() from authenticated;
grant execute on function private.bes_is_supplemental_manager() to service_role;

revoke execute on function private.bes_require_supplemental_manager() from public;
revoke execute on function private.bes_require_supplemental_manager() from anon;
revoke execute on function private.bes_require_supplemental_manager() from authenticated;
grant execute on function private.bes_require_supplemental_manager() to service_role;

revoke execute on function private.bes_require_supplemental_admin() from public;
revoke execute on function private.bes_require_supplemental_admin() from anon;
revoke execute on function private.bes_require_supplemental_admin() from authenticated;
grant execute on function private.bes_require_supplemental_admin() to service_role;

revoke execute on function public.can_delete_extra_attendance_history() from public;
revoke execute on function public.can_delete_extra_attendance_history() from anon;
grant execute on function public.can_delete_extra_attendance_history() to authenticated;
grant execute on function public.can_delete_extra_attendance_history() to service_role;
