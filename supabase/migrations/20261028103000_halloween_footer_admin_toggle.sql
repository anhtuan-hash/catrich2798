-- BRIAN Halloween footer independently toggled by approved Admin.
-- Reuse the anonymous-readable singleton without changing the navbar switch.
alter table public.bes_navigation_theme_settings
  add column if not exists halloween_footer_enabled boolean not null default true;

comment on column public.bes_navigation_theme_settings.halloween_footer_enabled
  is 'Site-wide decorative footer background, independently controlled by approved Admin.';

create or replace function public.bes_set_halloween_footer_enabled(p_enabled boolean)
returns table (halloween_footer_enabled boolean, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $function$
begin
  if p_enabled is null then
    raise exception 'A true/false value is required.' using errcode='22023';
  end if;
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','administrator')
      and coalesce(p.approved,false)=true
  ) then
    raise exception 'Only an approved Brian administrator can change the footer theme.' using errcode='42501';
  end if;
  return query
  update public.bes_navigation_theme_settings as t
    set halloween_footer_enabled=p_enabled, updated_by=(select auth.uid()), updated_at=now()
  where t.id=true
  returning t.halloween_footer_enabled,t.updated_at;
end;
$function$;

revoke all on function public.bes_set_halloween_footer_enabled(boolean) from public, anon;
grant execute on function public.bes_set_halloween_footer_enabled(boolean) to authenticated,service_role;

-- Existing table SELECT policies remain in place for anon/authenticated;
-- no direct insert/update/delete grants, no changes to the independent navbar RPC.
