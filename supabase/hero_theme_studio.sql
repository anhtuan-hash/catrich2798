-- Brian English Studio: system-wide Hero Theme Studio
-- Run once in the Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.hero_theme_studio_settings (
  workspace_key text primary key default 'english-hub',
  draft jsonb not null default '{"enabled":false,"imageUrl":"","imageName":"","targetMode":"all","heroKeys":[],"overlay":0.34,"position":"center center","blur":0,"parallax":0}'::jsonb,
  published jsonb not null default '{"enabled":false,"imageUrl":"","imageName":"","targetMode":"all","heroKeys":[],"overlay":0.34,"position":"center center","blur":0,"parallax":0}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.hero_theme_studio_settings is
  'One global Hero background theme with draft, published state and rollback history, managed by Admin accounts.';

alter table public.hero_theme_studio_settings enable row level security;

drop policy if exists "Anyone can read Hero Theme Studio settings" on public.hero_theme_studio_settings;
create policy "Anyone can read Hero Theme Studio settings"
  on public.hero_theme_studio_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert Hero Theme Studio settings" on public.hero_theme_studio_settings;
create policy "Admins can insert Hero Theme Studio settings"
  on public.hero_theme_studio_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update Hero Theme Studio settings" on public.hero_theme_studio_settings;
create policy "Admins can update Hero Theme Studio settings"
  on public.hero_theme_studio_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete Hero Theme Studio settings" on public.hero_theme_studio_settings;
create policy "Admins can delete Hero Theme Studio settings"
  on public.hero_theme_studio_settings
  for delete
  to authenticated
  using (public.is_admin());

grant select on public.hero_theme_studio_settings to anon;
grant select, insert, update, delete on public.hero_theme_studio_settings to authenticated;

insert into public.hero_theme_studio_settings (workspace_key)
values ('english-hub')
on conflict (workspace_key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-theme-studio',
  'hero-theme-studio',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view Hero Theme Studio images" on storage.objects;
create policy "Anyone can view Hero Theme Studio images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'hero-theme-studio');

drop policy if exists "Admins can upload Hero Theme Studio images" on storage.objects;
create policy "Admins can upload Hero Theme Studio images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'hero-theme-studio' and public.is_admin());

drop policy if exists "Admins can update Hero Theme Studio images" on storage.objects;
create policy "Admins can update Hero Theme Studio images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'hero-theme-studio' and public.is_admin())
  with check (bucket_id = 'hero-theme-studio' and public.is_admin());

drop policy if exists "Admins can delete Hero Theme Studio images" on storage.objects;
create policy "Admins can delete Hero Theme Studio images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'hero-theme-studio' and public.is_admin());

-- Enable Realtime without failing if the table is already published.
do $$
begin
  alter publication supabase_realtime add table public.hero_theme_studio_settings;
exception
  when duplicate_object then null;
end $$;
