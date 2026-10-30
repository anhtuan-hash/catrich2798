-- Additive seasonal skin. Existing content and CMS configuration stay untouched.
alter table public.bes_navigation_theme_settings
  add column if not exists november_home_enabled boolean not null default false,
  add column if not exists november_avatar_url text not null default '';

-- Old Halloween clients continue to work, and can never stack the two themes.
create or replace function public.bes_exclusive_home_themes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.halloween_home_enabled and not old.halloween_home_enabled then
    new.november_home_enabled := false;
  elsif new.november_home_enabled and not old.november_home_enabled then
    new.halloween_home_enabled := false;
    new.halloween_enabled := false;
    new.halloween_footer_enabled := false;
  end if;
  return new;
end;
$$;
revoke all on function public.bes_exclusive_home_themes() from public, anon, authenticated;
drop trigger if exists bes_exclusive_home_themes on public.bes_navigation_theme_settings;
create trigger bes_exclusive_home_themes before update on public.bes_navigation_theme_settings
for each row execute function public.bes_exclusive_home_themes();

create or replace function public.bes_set_november_home_enabled(p_enabled boolean)
returns table(november_home_enabled boolean, november_avatar_url text, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if p_enabled is null then raise exception 'A true/false value is required.' using errcode='22023'; end if;
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p where p.id=(select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','administrator') and coalesce(p.approved,false)
  ) then raise exception 'Only an approved administrator can change the theme.' using errcode='42501'; end if;
  return query update public.bes_navigation_theme_settings t
    set november_home_enabled=p_enabled, halloween_home_enabled=false,
        halloween_enabled=false,halloween_footer_enabled=false,
        updated_by=(select auth.uid()),updated_at=clock_timestamp()
    where t.id=true returning t.november_home_enabled,t.november_avatar_url,t.updated_at;
end;
$$;
revoke all on function public.bes_set_november_home_enabled(boolean) from public,anon;
grant execute on function public.bes_set_november_home_enabled(boolean) to authenticated,service_role;

create or replace function public.bes_set_november_avatar(p_url text)
returns table(november_home_enabled boolean,november_avatar_url text,updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p where p.id=(select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','administrator') and coalesce(p.approved,false)
  ) then raise exception 'Only an approved administrator can change the portrait.' using errcode='42501'; end if;
  if p_url is null or length(p_url)>2048 or (p_url<>'' and p_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/homepage-hero-media/') then
    raise exception 'An uploaded portrait URL is required.' using errcode='22023';
  end if;
  return query update public.bes_navigation_theme_settings t
    set november_avatar_url=p_url,updated_by=(select auth.uid()),updated_at=clock_timestamp()
    where t.id=true returning t.november_home_enabled,t.november_avatar_url,t.updated_at;
end;
$$;
revoke all on function public.bes_set_november_avatar(text) from public,anon;
grant execute on function public.bes_set_november_avatar(text) to authenticated,service_role;
