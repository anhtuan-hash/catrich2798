-- English Hub: Admin-managed background music shared with approved teachers
-- Drive-first version: Supabase stores only the lightweight metadata row.
-- Run once in the Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.shared_music_settings (
  workspace_key text primary key default 'english-hub',
  -- Google Drive file ID for all new uploads. Historical rows may still contain
  -- a Supabase Storage object path until the Admin opens the music panel once.
  track_path text not null,
  track_title text not null,
  track_name text,
  track_mime text,
  track_size bigint not null default 0 check (track_size >= 0 and track_size <= 41943040),
  shared boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shared_music_settings is
  'Metadata for one Admin-managed background track. New audio files are stored on Google Drive, not Supabase Storage.';
comment on column public.shared_music_settings.track_path is
  'Google Drive file ID for new tracks; historical Supabase Storage paths are migrated automatically.';

alter table public.shared_music_settings enable row level security;

drop policy if exists "Approved users can read shared music settings" on public.shared_music_settings;
create policy "Approved users can read shared music settings"
  on public.shared_music_settings
  for select
  to authenticated
  using (public.is_approved_profile() or public.is_admin());

drop policy if exists "Admins can insert shared music settings" on public.shared_music_settings;
create policy "Admins can insert shared music settings"
  on public.shared_music_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update shared music settings" on public.shared_music_settings;
create policy "Admins can update shared music settings"
  on public.shared_music_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete shared music settings" on public.shared_music_settings;
create policy "Admins can delete shared music settings"
  on public.shared_music_settings
  for delete
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.shared_music_settings to authenticated;

-- The old bucket is legacy-only. New installs do not need it. For existing
-- projects, block all direct reads/uploads/updates so audio egress cannot return.
drop policy if exists "Approved users can listen to shared music" on storage.objects;
drop policy if exists "Admins can upload shared music" on storage.objects;
drop policy if exists "Admins can update shared music" on storage.objects;

-- Keep delete permission temporarily so the migration endpoint can remove the
-- historical object after the Drive upload and metadata update both succeed.
drop policy if exists "Admins can delete shared music" on storage.objects;
create policy "Admins can delete shared music"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'shared-music' and public.is_admin());

-- Enable Realtime without failing if the table is already published.
do $$
begin
  alter publication supabase_realtime add table public.shared_music_settings;
exception
  when duplicate_object then null;
end $$;
