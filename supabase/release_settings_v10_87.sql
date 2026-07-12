-- Brian English Studio V10.87.0
-- Global release controls and feature flags.
-- Run once in Supabase SQL Editor after the main schema.sql migration.

create table if not exists public.bes_release_settings (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.bes_release_settings enable row level security;

drop policy if exists "Authenticated users can read release settings" on public.bes_release_settings;
create policy "Authenticated users can read release settings"
  on public.bes_release_settings
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "Admins can insert release settings" on public.bes_release_settings;
create policy "Admins can insert release settings"
  on public.bes_release_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update release settings" on public.bes_release_settings;
create policy "Admins can update release settings"
  on public.bes_release_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete release settings" on public.bes_release_settings;
create policy "Admins can delete release settings"
  on public.bes_release_settings
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.bes_touch_release_settings()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists bes_touch_release_settings_trigger on public.bes_release_settings;
create trigger bes_touch_release_settings_trigger
  before insert or update on public.bes_release_settings
  for each row execute procedure public.bes_touch_release_settings();

grant select, insert, update, delete on public.bes_release_settings to authenticated;

insert into public.bes_release_settings (id, config)
values (
  'feature-flags',
  '{
    "schemaVersion": 1,
    "releaseVersion": "10.87.0",
    "updatedAt": "2026-07-12T00:00:00.000Z",
    "flags": {
      "customLauncher": "all",
      "workspaceTabs": "all",
      "contentTransfer": "all",
      "aiBubble": "all",
      "aiActions": "all",
      "voiceMode": "all",
      "newsroomReader": "all",
      "uploadSecurity": "all"
    }
  }'::jsonb
)
on conflict (id) do nothing;

-- Enable realtime propagation when the default Supabase publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'bes_release_settings'
     ) then
    execute 'alter publication supabase_realtime add table public.bes_release_settings';
  end if;
end $$;
