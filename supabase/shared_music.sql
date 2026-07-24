-- English Hub: Admin-managed background music shared with approved teachers
-- Run once in the Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.shared_music_settings (
  workspace_key text primary key default 'english-hub',
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
  'One Admin-managed background-music track shared with approved English Hub teachers.';

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shared-music',
  'shared-music',
  false,
  41943040,
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/flac',
    'audio/webm',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Approved users can listen to shared music" on storage.objects;
create policy "Approved users can listen to shared music"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'shared-music'
    and (public.is_approved_profile() or public.is_admin())
  );

drop policy if exists "Admins can upload shared music" on storage.objects;
create policy "Admins can upload shared music"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'shared-music'
    and public.is_admin()
  );

drop policy if exists "Admins can update shared music" on storage.objects;
create policy "Admins can update shared music"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'shared-music'
    and public.is_admin()
  )
  with check (
    bucket_id = 'shared-music'
    and public.is_admin()
  );

drop policy if exists "Admins can delete shared music" on storage.objects;
create policy "Admins can delete shared music"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'shared-music'
    and public.is_admin()
  );

-- Enable Realtime without failing if the table is already published.
do $$
begin
  alter publication supabase_realtime add table public.shared_music_settings;
exception
  when duplicate_object then null;
end $$;
