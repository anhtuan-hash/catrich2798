-- Move shared background music delivery away from Supabase Storage.
-- Supabase remains the metadata source; Google Drive stores and serves audio.

comment on table public.shared_music_settings is
  'Metadata for one Admin-managed background track. New audio files are stored on Google Drive, not Supabase Storage.';
comment on column public.shared_music_settings.track_path is
  'Google Drive file ID for new tracks; historical Supabase Storage paths are migrated automatically.';

-- Stop every route that can create Storage egress or add new audio objects.
drop policy if exists "Approved users can listen to shared music" on storage.objects;
drop policy if exists "Admins can upload shared music" on storage.objects;
drop policy if exists "Admins can update shared music" on storage.objects;

-- Retain delete-only access while legacy rows are migrated. The app uploads the
-- Drive copy, updates shared_music_settings, then removes the old object.
drop policy if exists "Admins can delete shared music" on storage.objects;
create policy "Admins can delete shared music"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'shared-music' and public.is_admin());
