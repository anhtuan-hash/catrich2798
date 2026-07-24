-- Brian English Studio: Admin-managed Vietnamese atmosphere overlay
-- Run once in the Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.vietnam_atmosphere_settings (
  workspace_key text primary key default 'english-hub',
  enabled boolean not null default true,
  show_built_ins boolean not null default true,
  opacity numeric(4,3) not null default 0.110 check (opacity >= 0.030 and opacity <= 0.280),
  speed numeric(4,2) not null default 1.00 check (speed >= 0.40 and speed <= 2.50),
  density integer not null default 10 check (density >= 3 and density <= 18),
  images jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vietnam_atmosphere_settings is
  'One public decorative-overlay configuration managed by approved Admin accounts.';

alter table public.vietnam_atmosphere_settings enable row level security;

drop policy if exists "Anyone can read Vietnam atmosphere settings" on public.vietnam_atmosphere_settings;
create policy "Anyone can read Vietnam atmosphere settings"
  on public.vietnam_atmosphere_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert Vietnam atmosphere settings" on public.vietnam_atmosphere_settings;
create policy "Admins can insert Vietnam atmosphere settings"
  on public.vietnam_atmosphere_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update Vietnam atmosphere settings" on public.vietnam_atmosphere_settings;
create policy "Admins can update Vietnam atmosphere settings"
  on public.vietnam_atmosphere_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete Vietnam atmosphere settings" on public.vietnam_atmosphere_settings;
create policy "Admins can delete Vietnam atmosphere settings"
  on public.vietnam_atmosphere_settings
  for delete
  to authenticated
  using (public.is_admin());

grant select on public.vietnam_atmosphere_settings to anon;
grant select, insert, update, delete on public.vietnam_atmosphere_settings to authenticated;

insert into public.vietnam_atmosphere_settings (
  workspace_key,
  enabled,
  show_built_ins,
  opacity,
  speed,
  density,
  images
)
values ('english-hub', true, true, 0.110, 1.00, 10, '[]'::jsonb)
on conflict (workspace_key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vietnam-atmosphere',
  'vietnam-atmosphere',
  true,
  3145728,
  array[
    'image/png',
    'image/webp',
    'image/svg+xml'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view Vietnam atmosphere images" on storage.objects;
create policy "Anyone can view Vietnam atmosphere images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'vietnam-atmosphere');

drop policy if exists "Admins can upload Vietnam atmosphere images" on storage.objects;
create policy "Admins can upload Vietnam atmosphere images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vietnam-atmosphere'
    and public.is_admin()
  );

drop policy if exists "Admins can update Vietnam atmosphere images" on storage.objects;
create policy "Admins can update Vietnam atmosphere images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'vietnam-atmosphere'
    and public.is_admin()
  )
  with check (
    bucket_id = 'vietnam-atmosphere'
    and public.is_admin()
  );

drop policy if exists "Admins can delete Vietnam atmosphere images" on storage.objects;
create policy "Admins can delete Vietnam atmosphere images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vietnam-atmosphere'
    and public.is_admin()
  );

-- Enable Realtime without failing if the table is already published.
do $$
begin
  alter publication supabase_realtime add table public.vietnam_atmosphere_settings;
exception
  when duplicate_object then null;
end $$;
