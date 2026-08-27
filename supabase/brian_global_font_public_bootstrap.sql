-- Brian English · public typography bootstrap
-- Allows the unauthenticated landing/login experience to read ONLY the safe
-- typography columns required to render the Admin-selected system font before
-- the first visible frame. Admin write policies remain unchanged.
-- Safe to run repeatedly in Production Supabase SQL Editor.

alter table public.brian_global_font_settings enable row level security;

drop policy if exists "Public can read Brian typography bootstrap" on public.brian_global_font_settings;
create policy "Public can read Brian typography bootstrap"
  on public.brian_global_font_settings
  for select
  to anon
  using (id = true);

-- Do not expose updated_by or any other administrative metadata to guests.
grant select (
  id,
  font_preset,
  region_fonts,
  custom_font_name,
  custom_font_url,
  custom_font_path,
  custom_font_format,
  custom_font_size,
  updated_at
) on public.brian_global_font_settings to anon;

-- Authenticated users retain the existing full read access configured by the
-- main brian_global_font_settings migration.
