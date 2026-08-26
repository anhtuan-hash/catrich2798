-- Brian English: global motion preset shared across all authenticated users.
-- Run once in Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.brian_global_motion_settings (
  id boolean primary key default true check (id),
  preset text not null default 'balanced'
    check (preset in ('off', 'subtle', 'balanced', 'expressive')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brian_global_motion_settings is
  'Singleton configuration for the Brian site-wide motion system selected by Admin.';

alter table public.brian_global_motion_settings enable row level security;

drop policy if exists "Authenticated users can read global motion settings" on public.brian_global_motion_settings;
create policy "Authenticated users can read global motion settings"
  on public.brian_global_motion_settings
  for select
  to authenticated
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

grant select, insert, update on public.brian_global_motion_settings to authenticated;

insert into public.brian_global_motion_settings (id, preset, updated_by)
values (true, 'balanced', 'system-default')
on conflict (id) do nothing;

-- Enable realtime so every open Brian session receives the Admin change immediately.
do $$
begin
  alter publication supabase_realtime add table public.brian_global_motion_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
