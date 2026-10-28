-- BRIAN seasonal navbar skin. Independent singleton so anonymous visitors can read
-- only this public presentation preference, never account or subtitle data.
create table if not exists public.bes_navigation_theme_settings (
  id boolean primary key default true check (id),
  halloween_enabled boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
comment on table public.bes_navigation_theme_settings is
  'Publicly readable global navbar seasonal theme; only approved admins can edit.';
alter table public.bes_navigation_theme_settings enable row level security;

drop policy if exists "Anyone reads navigation theme" on public.bes_navigation_theme_settings;
create policy "Anyone reads navigation theme"
  on public.bes_navigation_theme_settings for select
  to anon, authenticated using (id = true);

-- Direct mutations denied by both grants and RLS; only the RPC below can write.
revoke all on table public.bes_navigation_theme_settings from public, anon, authenticated;
grant select on table public.bes_navigation_theme_settings to anon, authenticated, service_role;

insert into public.bes_navigation_theme_settings(id,halloween_enabled)
values (true,true) on conflict(id) do nothing;

create or replace function public.bes_set_halloween_navbar_enabled(p_enabled boolean)
returns table(halloween_enabled boolean, updated_at timestamptz)
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
    raise exception 'Only an approved Brian administrator can change the navbar theme.'
      using errcode='42501';
  end if;
  return query
    insert into public.bes_navigation_theme_settings as t
      (id,halloween_enabled,updated_by,updated_at)
    values (true,p_enabled,(select auth.uid()),now())
    on conflict(id) do update set
      halloween_enabled=excluded.halloween_enabled,
      updated_by=excluded.updated_by,
      updated_at=excluded.updated_at
    returning t.halloween_enabled,t.updated_at;
end;
$function$;

revoke all on function public.bes_set_halloween_navbar_enabled(boolean) from public, anon;
grant execute on function public.bes_set_halloween_navbar_enabled(boolean) to authenticated, service_role;

do $publication$
begin
  alter publication supabase_realtime add table public.bes_navigation_theme_settings;
exception when duplicate_object then null;
  when undefined_object then null;
end
$publication$;
