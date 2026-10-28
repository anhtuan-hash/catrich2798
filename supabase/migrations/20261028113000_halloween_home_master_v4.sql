-- Full-home Halloween master. OFF by default until QA/release approval.
-- An existing public SELECT RLS policy on this singleton already allows guests
-- to read only the selected boolean; no table UPDATE grants are added.
alter table public.bes_navigation_theme_settings
  add column if not exists halloween_home_enabled boolean not null default false;

comment on column public.bes_navigation_theme_settings.halloween_home_enabled
  is 'Global Halloween presentation master switch. OFF restores source theme; public read, approved-Admin write only.';

create or replace function public.bes_set_halloween_home_enabled(p_enabled boolean)
returns table(halloween_home_enabled boolean, halloween_enabled boolean,
              halloween_footer_enabled boolean, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $function$
begin
  if p_enabled is null then
    raise exception 'A true/false value is required.' using errcode='22023';
  end if;
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','administrator')
      and coalesce(p.approved,false)=true
  ) then
    raise exception 'Only an approved Brian administrator can change the site-wide Halloween theme.'
      using errcode='42501';
  end if;
  return query
  update public.bes_navigation_theme_settings t
    set halloween_home_enabled=p_enabled,
        halloween_enabled=p_enabled,
        halloween_footer_enabled=p_enabled,
        updated_by=(select auth.uid()),
        updated_at=now()
  where t.id=true
  returning t.halloween_home_enabled,t.halloween_enabled,
            t.halloween_footer_enabled,t.updated_at;
end;
$function$;

revoke all on function public.bes_set_halloween_home_enabled(boolean) from public, anon;
grant execute on function public.bes_set_halloween_home_enabled(boolean) to authenticated,service_role;
