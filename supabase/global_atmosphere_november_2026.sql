-- Add a standalone November / Vietnamese Teachers' Day visual preset.
-- Never change active_theme, Halloween values, or Vietnam's settings/images.
alter table public.global_atmosphere_theme
  add column if not exists november_enabled boolean not null default true,
  add column if not exists november_show_built_ins boolean not null default true,
  add column if not exists november_opacity numeric(4,3) not null default 0.150,
  add column if not exists november_speed numeric(4,2) not null default 1.00,
  add column if not exists november_density integer not null default 10;

alter table public.global_atmosphere_theme
  drop constraint if exists global_atmosphere_theme_active_theme_check;
alter table public.global_atmosphere_theme
  add constraint global_atmosphere_theme_active_theme_check
  check (active_theme in ('vietnam', 'halloween', 'november'));

alter table public.global_atmosphere_theme
  drop constraint if exists global_atmosphere_theme_november_opacity_check;
alter table public.global_atmosphere_theme
  add constraint global_atmosphere_theme_november_opacity_check
  check (november_opacity between 0.030 and 0.280);
alter table public.global_atmosphere_theme
  drop constraint if exists global_atmosphere_theme_november_speed_check;
alter table public.global_atmosphere_theme
  add constraint global_atmosphere_theme_november_speed_check
  check (november_speed between 0.40 and 2.50);
alter table public.global_atmosphere_theme
  drop constraint if exists global_atmosphere_theme_november_density_check;
alter table public.global_atmosphere_theme
  add constraint global_atmosphere_theme_november_density_check
  check (november_density between 3 and 18);
