-- Brian English Studio V10.83.1
-- Global launcher configuration managed by approved Admin accounts.
-- Safe to run after the main schema.sql migration.

create table if not exists public.bes_launcher_settings (
  id text primary key default 'default',
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.bes_launcher_settings enable row level security;

drop policy if exists "Authenticated users can read launcher settings" on public.bes_launcher_settings;
create policy "Authenticated users can read launcher settings"
  on public.bes_launcher_settings
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "Admins can insert launcher settings" on public.bes_launcher_settings;
create policy "Admins can insert launcher settings"
  on public.bes_launcher_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update launcher settings" on public.bes_launcher_settings;
create policy "Admins can update launcher settings"
  on public.bes_launcher_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete launcher settings" on public.bes_launcher_settings;
create policy "Admins can delete launcher settings"
  on public.bes_launcher_settings
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.bes_touch_launcher_settings()
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

drop trigger if exists bes_touch_launcher_settings_trigger on public.bes_launcher_settings;
create trigger bes_touch_launcher_settings_trigger
  before insert or update on public.bes_launcher_settings
  for each row execute procedure public.bes_touch_launcher_settings();

grant select, insert, update, delete on public.bes_launcher_settings to authenticated;

-- Enable realtime updates when the standard Supabase publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'bes_launcher_settings'
     ) then
    execute 'alter publication supabase_realtime add table public.bes_launcher_settings';
  end if;
end $$;
