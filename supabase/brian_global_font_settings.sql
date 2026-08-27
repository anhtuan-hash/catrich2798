-- Brian English: site-wide base font + regional typography + Admin-uploaded custom font storage.
-- Run once in Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.brian_global_font_settings (
  id boolean primary key default true check (id),
  font_preset text not null default 'system',
  region_fonts jsonb not null default '{}'::jsonb,
  custom_font_name text,
  custom_font_url text,
  custom_font_path text,
  custom_font_format text,
  custom_font_size bigint,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installations receive every new typography field without data loss.
alter table public.brian_global_font_settings
  add column if not exists region_fonts jsonb not null default '{}'::jsonb,
  add column if not exists custom_font_name text,
  add column if not exists custom_font_url text,
  add column if not exists custom_font_path text,
  add column if not exists custom_font_format text,
  add column if not exists custom_font_size bigint;

-- Keep the database constraint aligned with the complete font catalogue exposed
-- by globalFontSystem.js. Region overrides use the same built-in preset ids.
alter table public.brian_global_font_settings
  drop constraint if exists brian_global_font_settings_font_preset_check;

alter table public.brian_global_font_settings
  add constraint brian_global_font_settings_font_preset_check
  check (font_preset in (
    'system','roboto','be-vietnam-pro','inter','noto-sans','open-sans','lato',
    'montserrat','nunito-sans','source-sans-3','ibm-plex-sans','fira-sans',
    'barlow','poppins','noto-serif','merriweather','playfair-display',
    'source-serif-4','arial','custom'
  ));

-- Region JSON is intentionally schemaless at the database layer so new Brian
-- regions can be introduced without another destructive migration. The client
-- runtime normalizes keys and allowed preset ids before applying them.
comment on column public.brian_global_font_settings.region_fonts is
  'JSON object mapping Brian typography regions to built-in font preset ids. Missing keys inherit the global font.';

comment on table public.brian_global_font_settings is
  'Singleton typography configuration for Brian: global base font, regional overrides and optional uploaded custom font.';

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

insert into public.brian_global_font_settings (id, font_preset, region_fonts, updated_by)
values (true, 'system', '{}'::jsonb, 'system-default')
on conflict (id) do nothing;

-- Public font bucket. Public read is intentional because CSS @font-face must load
-- for authenticated Brian sessions without signed-URL refresh churn.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'brian-global-fonts',
  'brian-global-fonts',
  true,
  8388608,
  array['font/woff2','font/woff','font/ttf','font/otf','application/font-woff','application/octet-stream']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage write access is Admin-only. The bucket itself is public for font reads.
drop policy if exists "Admins can upload Brian global fonts" on storage.objects;
create policy "Admins can upload Brian global fonts"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'brian-global-fonts'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

drop policy if exists "Admins can update Brian global fonts" on storage.objects;
create policy "Admins can update Brian global fonts"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'brian-global-fonts'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  )
  with check (
    bucket_id = 'brian-global-fonts'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

drop policy if exists "Admins can delete Brian global fonts" on storage.objects;
create policy "Admins can delete Brian global fonts"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'brian-global-fonts'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.brian_global_font_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
