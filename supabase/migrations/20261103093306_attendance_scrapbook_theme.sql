-- Independent Attendance skin; OFF restores existing Attendance presentation.
-- Uses the existing public-read singleton, without expanding write grants.
alter table public.bes_navigation_theme_settings
  add column if not exists attendance_scrapbook_enabled boolean not null default false;

comment on column public.bes_navigation_theme_settings.attendance_scrapbook_enabled
  is 'Attendance-only paper scrapbook presentation. Admin controlled; does not change Home, Dashboard, attendance records or permissions.';

create or replace function public.bes_set_attendance_scrapbook_enabled(p_enabled boolean)
returns table(attendance_scrapbook_enabled boolean, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if p_enabled is null then
    raise exception 'A true/false value is required.' using errcode='22023';
  end if;
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p where p.id=(select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','administrator')
      and coalesce(p.approved,false)=true
  ) then
    raise exception 'Only an approved administrator can change the Attendance theme.' using errcode='42501';
  end if;
  return query update public.bes_navigation_theme_settings t
    set attendance_scrapbook_enabled=p_enabled,
        updated_by=(select auth.uid()), updated_at=clock_timestamp()
    where t.id=true
    returning t.attendance_scrapbook_enabled,t.updated_at;
end;
$$;
revoke all on function public.bes_set_attendance_scrapbook_enabled(boolean) from public, anon;
grant execute on function public.bes_set_attendance_scrapbook_enabled(boolean) to authenticated, service_role;
