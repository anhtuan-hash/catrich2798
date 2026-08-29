-- Brian English · Motion Library v2
-- Safe to run repeatedly in Production Supabase SQL Editor.
-- Goal:
--   1) one public read-only motion configuration for Admin / teachers / signed-out visitors
--   2) only approved Admin accounts may publish changes
--   3) keep a version history so Admin can restore a previous mix

create table if not exists public.brian_global_motion_settings (
  id boolean primary key default true check (id),
  preset text not null default 'editorial-calm',
  config jsonb,
  version integer not null default 2,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade installations created by Motion v1.
alter table public.brian_global_motion_settings add column if not exists config jsonb;
alter table public.brian_global_motion_settings add column if not exists version integer not null default 2;

-- v1 used a restrictive preset CHECK. Motion v2 allows named presets plus custom mixes.
alter table public.brian_global_motion_settings
  drop constraint if exists brian_global_motion_settings_preset_check;

comment on table public.brian_global_motion_settings is
  'Singleton public configuration for Brian Motion Library v2. Everyone may read; only approved Admins may publish.';

-- Convert a legacy preset into a complete v2 JSON config when needed.
update public.brian_global_motion_settings
set
  preset = case lower(coalesce(preset, ''))
    when 'off' then 'no-motion'
    when 'subtle' then 'material-clean'
    when 'balanced' then 'editorial-calm'
    when 'windows8' then 'metro'
    when 'expressive' then 'fluent'
    else coalesce(nullif(preset, ''), 'editorial-calm')
  end,
  config = coalesce(config, jsonb_build_object(
    'version', 2,
    'preset', case lower(coalesce(preset, ''))
      when 'off' then 'no-motion'
      when 'subtle' then 'material-clean'
      when 'balanced' then 'editorial-calm'
      when 'windows8' then 'metro'
      when 'expressive' then 'fluent'
      else coalesce(nullif(preset, ''), 'editorial-calm')
    end,
    'speed', case lower(coalesce(preset, ''))
      when 'off' then 'fast'
      when 'subtle' then 'compact'
      else 'balanced'
    end,
    'easing', case lower(coalesce(preset, ''))
      when 'off' then 'linear'
      when 'subtle' then 'material'
      when 'windows8' then 'fluent'
      when 'expressive' then 'fluent'
      else 'editorial'
    end,
    'slots', case lower(coalesce(preset, ''))
      when 'off' then jsonb_build_object(
        'page','none','tab','none','modal','none','drawer','none','popover','none','list','none','indicator','none','loading','none','interaction','none'
      )
      when 'subtle' then jsonb_build_object(
        'page','shared-axis','tab','material-shift','modal','editorial-scale','drawer','slide-right','popover','material-menu','list','material-stagger','indicator','underline','loading','material-spinner','interaction','soft-press'
      )
      when 'windows8' then jsonb_build_object(
        'page','metro-sweep','tab','directional','modal','fade','drawer','slide-left','popover','drop','list','soft-stagger','indicator','metro-block','loading','metro-dots','interaction','border'
      )
      when 'expressive' then jsonb_build_object(
        'page','fluent-depth','tab','crossfade','modal','fluent-zoom','drawer','fluent-reveal','popover','fluent-pop','list','fade-up','indicator','sliding-pill','loading','thin-progress','interaction','lift'
      )
      else jsonb_build_object(
        'page','editorial-rise','tab','crossfade','modal','editorial-scale','drawer','slide-right','popover','soft-pop','list','editorial-cascade','indicator','editorial-ink','loading','thin-progress','interaction','soft-press'
      )
    end
  )),
  version = 2
where id = true;

insert into public.brian_global_motion_settings (id, preset, config, version, updated_by)
values (
  true,
  'editorial-calm',
  '{
    "version":2,
    "preset":"editorial-calm",
    "speed":"balanced",
    "easing":"editorial",
    "slots":{
      "page":"editorial-rise",
      "tab":"crossfade",
      "modal":"editorial-scale",
      "drawer":"slide-right",
      "popover":"soft-pop",
      "list":"editorial-cascade",
      "indicator":"editorial-ink",
      "loading":"thin-progress",
      "interaction":"soft-press"
    }
  }'::jsonb,
  2,
  'system-default'
)
on conflict (id) do nothing;

alter table public.brian_global_motion_settings alter column config set not null;
alter table public.brian_global_motion_settings alter column config set default '{
  "version":2,
  "preset":"editorial-calm",
  "speed":"balanced",
  "easing":"editorial",
  "slots":{
    "page":"editorial-rise",
    "tab":"crossfade",
    "modal":"editorial-scale",
    "drawer":"slide-right",
    "popover":"soft-pop",
    "list":"editorial-cascade",
    "indicator":"editorial-ink",
    "loading":"thin-progress",
    "interaction":"soft-press"
  }
}'::jsonb;

-- ---------------------------------------------------------------------------
-- Version history
-- ---------------------------------------------------------------------------

create table if not exists public.brian_global_motion_history (
  id bigint generated always as identity primary key,
  config jsonb not null,
  preset text,
  version integer not null default 2,
  updated_by text,
  created_at timestamptz not null default now()
);

comment on table public.brian_global_motion_history is
  'Admin-only history snapshots for restoring previously published Motion Library configurations.';

-- ---------------------------------------------------------------------------
-- RLS · CURRENT PUBLIC CONFIG
-- Anyone may read the singleton. Only approved Admins may publish.
-- ---------------------------------------------------------------------------

alter table public.brian_global_motion_settings enable row level security;

drop policy if exists "Authenticated users can read global motion settings" on public.brian_global_motion_settings;
drop policy if exists "Anyone can read global motion settings" on public.brian_global_motion_settings;
create policy "Anyone can read global motion settings"
  on public.brian_global_motion_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert global motion settings" on public.brian_global_motion_settings;
create policy "Admins can insert global motion settings"
  on public.brian_global_motion_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

drop policy if exists "Admins can update global motion settings" on public.brian_global_motion_settings;
create policy "Admins can update global motion settings"
  on public.brian_global_motion_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

grant select on public.brian_global_motion_settings to anon, authenticated;
grant insert, update on public.brian_global_motion_settings to authenticated;

-- ---------------------------------------------------------------------------
-- RLS · HISTORY
-- History contains Admin identifiers, so guests/teachers cannot read it.
-- ---------------------------------------------------------------------------

alter table public.brian_global_motion_history enable row level security;

drop policy if exists "Admins can read global motion history" on public.brian_global_motion_history;
create policy "Admins can read global motion history"
  on public.brian_global_motion_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

drop policy if exists "Admins can insert global motion history" on public.brian_global_motion_history;
create policy "Admins can insert global motion history"
  on public.brian_global_motion_history
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

grant select, insert on public.brian_global_motion_history to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.brian_global_motion_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
