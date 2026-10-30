-- BRIAN PHOTO STORY: persistent interactive HTML library (2026-10-30)
-- Private storage and public read for PUBLISHED albums only.
-- Direct storage objects use text/plain; execution is confined to sandboxed iframe srcDoc.
create table if not exists public.bes_slideshow_html_files (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.bes_slideshow_albums(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]html$'),
  file_size integer not null check (file_size between 1 and 8388608),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint bss_html_album_path check (split_part(storage_path, '/', 1) = album_id::text)
);
create index if not exists bes_slideshow_html_files_album_idx
  on public.bes_slideshow_html_files(album_id, created_at, id);
alter table public.bes_slideshow_html_files enable row level security;

drop policy if exists bss_html_published_read on public.bes_slideshow_html_files;
create policy bss_html_published_read on public.bes_slideshow_html_files
  for select to anon, authenticated using (
  exists (select 1 from public.bes_slideshow_albums a
          where a.id = album_id and a.is_published = true)
);
drop policy if exists bss_html_editor_read on public.bes_slideshow_html_files;
create policy bss_html_editor_read on public.bes_slideshow_html_files
  for select to authenticated using (public.bes_slideshow_is_editor());
drop policy if exists bss_html_editor_insert on public.bes_slideshow_html_files;
create policy bss_html_editor_insert on public.bes_slideshow_html_files
  for insert to authenticated with check (
    public.bes_slideshow_is_editor() and created_by = (select auth.uid())
  );
drop policy if exists bss_html_editor_delete on public.bes_slideshow_html_files;
create policy bss_html_editor_delete on public.bes_slideshow_html_files
  for delete to authenticated using (public.bes_slideshow_is_editor());

revoke all on public.bes_slideshow_html_files from public, anon, authenticated;
grant select on public.bes_slideshow_html_files to anon;
grant select, insert, delete on public.bes_slideshow_html_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brian-slideshow-html', 'brian-slideshow-html', false, 8388608,
        array['text/plain'])
on conflict (id) do update set
  public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists bss_html_storage_editor_read on storage.objects;
create policy bss_html_storage_editor_read on storage.objects
  for select to authenticated using (
    bucket_id = 'brian-slideshow-html' and public.bes_slideshow_is_editor()
  );
drop policy if exists bss_html_storage_published_read on storage.objects;
create policy bss_html_storage_published_read on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'brian-slideshow-html' and
    exists (select 1 from public.bes_slideshow_html_files f
      join public.bes_slideshow_albums a on a.id = f.album_id
      where f.storage_path = storage.objects.name and a.is_published = true)
  );
drop policy if exists bss_html_storage_editor_insert on storage.objects;
create policy bss_html_storage_editor_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'brian-slideshow-html' and public.bes_slideshow_is_editor()
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]html$'
  );
drop policy if exists bss_html_storage_editor_delete on storage.objects;
create policy bss_html_storage_editor_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'brian-slideshow-html' and public.bes_slideshow_is_editor()
  );
