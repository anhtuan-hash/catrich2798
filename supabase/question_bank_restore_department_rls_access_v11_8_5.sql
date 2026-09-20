-- Brian Question Bank v11.8.5
-- Restore authenticated RLS access without reopening arbitrary department lookup.

create or replace function public.qb_current_department_id(p_user_id uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select dm.department_id
  from public.department_members dm
  where dm.user_id = case
    when auth.uid() is not null then auth.uid()
    else p_user_id
  end
    and dm.active=true
  order by case when dm.role in ('leader','head','ttcm') then 0 else 1 end, dm.created_at
  limit 1
$function$;

revoke execute on function public.qb_current_department_id(uuid) from public;
revoke execute on function public.qb_current_department_id(uuid) from anon;
grant execute on function public.qb_current_department_id(uuid) to authenticated;
grant execute on function public.qb_current_department_id(uuid) to service_role;

comment on function public.qb_current_department_id(uuid) is
'Returns the signed-in user department for RLS. Authenticated callers cannot use p_user_id to inspect another user.';
