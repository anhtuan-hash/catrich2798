-- Brian English: global font preset shared across all authenticated users.
-- Run once in Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.brian_global_font_settings (
  id boolean primary key default true check (id),
  font_preset text not null default 'roboto'
    check (font_preset in ('roboto', 'be-vietnam-pro', 'inter', 'noto-sans', 'arial', 'system')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brian_global_font_settings is
  'Singleton configuration for the Brian site-wide font selected by Admin.';

alter table public.brian_global_font_settings enable row level security;

drop policy if exists "Authenticated users can read global font settings" on public.brian_global_font_settings;
create policy "Authenticated users can read global font settings"
  on public.brian_global_font_settings
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert global font settings" on public.brian_global_font_settings;
create policy "Admins can insert global font settings"
  on public.brian_global_font_settings
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

drop policy if exists "Admins can update global font settings" on public.brian_global_font_settings;
create policy "Admins can update global font settings"
  on public.brian_global_font_settings
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

grant select, insert, update on public.brian_global_font_settings to authenticated;

insert into public.brian_global_font_settings (id, font_preset, updated_by)
values (true, 'roboto', 'system-default')
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.brian_global_font_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
