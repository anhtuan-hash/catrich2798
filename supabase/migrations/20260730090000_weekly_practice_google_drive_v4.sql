-- Brian English Studio: weekly practice Google Drive migration
-- New weekly-practice HTML files are stored in Google Drive.
-- Supabase keeps metadata, student results and proof images only.

alter table public.weekly_practice_items
  alter column storage_bucket set default 'google-drive';

comment on column public.weekly_practice_items.storage_bucket is
  'google-drive for current weekly-practice HTML; weekly-practice only for temporary legacy rows awaiting migration.';
comment on column public.weekly_practice_items.storage_path is
  'Google Drive file ID for current rows; historical Supabase Storage object path for temporary legacy rows.';

-- The website now serves HTML through /api/weekly-practice-file with CDN and browser caching.
-- Remove direct public reads so clients cannot bypass the caching gateway.
drop policy if exists "Public can download published weekly practice HTML" on storage.objects;

-- Prevent new HTML uploads or replacements in the legacy bucket.
drop policy if exists "Publishers can upload weekly practice HTML" on storage.objects;
drop policy if exists "Publishers can update weekly practice HTML" on storage.objects;

-- Keep publisher deletion during the transition so migrated legacy objects can be cleaned up.
drop policy if exists "Publishers can delete weekly practice HTML" on storage.objects;
create policy "Publishers can delete weekly practice HTML"
on storage.objects
for delete
to authenticated
using (bucket_id = 'weekly-practice' and public.can_publish_department());

comment on table public.weekly_practice_items is
  'Weekly interactive HTML metadata. HTML binaries live on Google Drive; Supabase Storage is legacy-only.';
