-- Brian Quick Access Rail · per-account shortcut preferences · v11.9.6
-- One row per authenticated account. RLS prevents users from reading or
-- changing another account's quick-access configuration.

create table if not exists public.bes_quick_access_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb not null default '{"version":1,"items":[],"pinned":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bes_quick_access_settings_config_object
    check (jsonb_typeof(config) = 'object')
);

alter table public.bes_quick_access_settings enable row level security;

drop policy if exists "quick_access_select_own" on public.bes_quick_access_settings;
create policy "quick_access_select_own"
  on public.bes_quick_access_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "quick_access_insert_own" on public.bes_quick_access_settings;
create policy "quick_access_insert_own"
  on public.bes_quick_access_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "quick_access_update_own" on public.bes_quick_access_settings;
create policy "quick_access_update_own"
  on public.bes_quick_access_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "quick_access_delete_own" on public.bes_quick_access_settings;
create policy "quick_access_delete_own"
  on public.bes_quick_access_settings
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.bes_quick_access_settings to authenticated;

create or replace function public.touch_bes_quick_access_settings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bes_quick_access_settings_touch_updated_at
  on public.bes_quick_access_settings;
create trigger bes_quick_access_settings_touch_updated_at
before update on public.bes_quick_access_settings
for each row execute function public.touch_bes_quick_access_settings_updated_at();

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bes_quick_access_settings'
  ) then
    alter publication supabase_realtime add table public.bes_quick_access_settings;
  end if;
end
$$;
