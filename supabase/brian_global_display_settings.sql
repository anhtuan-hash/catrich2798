-- Brian English: site-wide display density settings shared by all authenticated users.
-- Run once in Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.brian_global_display_settings (
  id boolean primary key default true check (id),
  show_subtitles boolean not null default true,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brian_global_display_settings is
  'Singleton site-wide display settings controlled by Brian administrators.';

alter table public.brian_global_display_settings enable row level security;

drop policy if exists "Authenticated users can read global display settings" on public.brian_global_display_settings;
create policy "Authenticated users can read global display settings"
  on public.brian_global_display_settings
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert global display settings" on public.brian_global_display_settings;
create policy "Admins can insert global display settings"
  on public.brian_global_display_settings
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

drop policy if exists "Admins can update global display settings" on public.brian_global_display_settings;
create policy "Admins can update global display settings"
  on public.brian_global_display_settings
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

grant select, insert, update on public.brian_global_display_settings to authenticated;

insert into public.brian_global_display_settings (id, show_subtitles, updated_by)
values (true, true, 'system-default')
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.brian_global_display_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
