begin;

create table public.museum_lab_display_settings (
  id boolean primary key default true check (id),
  wallpaper_opacity smallint not null default 14 check (wallpaper_opacity between 0 and 40),
  high_contrast boolean not null default true
);

insert into public.museum_lab_display_settings (id) values (true);

alter table public.museum_lab_display_settings enable row level security;

revoke all on table public.museum_lab_display_settings from public, anon, authenticated, service_role;
grant select on table public.museum_lab_display_settings to service_role;
grant update (wallpaper_opacity, high_contrast) on table public.museum_lab_display_settings to service_role;

commit;
