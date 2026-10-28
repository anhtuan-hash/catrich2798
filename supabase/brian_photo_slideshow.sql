-- BRIAN PHOTO SLIDESHOW · public read, authenticated TTCM/Admin writes
-- Public image assets are intentional; never place confidential student records here.
create or replace function public.bes_slideshow_is_editor()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.approved is true
      and p.role in ('admin', 'department_head', 'ttcm')
  );
$$;
revoke all on function public.bes_slideshow_is_editor() from public;
grant execute on function public.bes_slideshow_is_editor() to authenticated;

create table if not exists public.bes_slideshow_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  is_published boolean not null default false,
  slide_interval integer not null default 6 check (slide_interval between 2 and 30),
  transition text not null default 'fade' check (transition in ('fade', 'slide', 'zoom')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bes_slideshow_albums_published_idx
  on public.bes_slideshow_albums(is_published, updated_at desc);
alter table public.bes_slideshow_albums enable row level security;

create table if not exists public.bes_slideshow_slides (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.bes_slideshow_albums(id) on delete cascade,
  image_path text not null unique check (char_length(image_path) <= 350),
  caption text not null default '' check (char_length(caption) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists bes_slideshow_slides_order_idx
  on public.bes_slideshow_slides(album_id, sort_order, created_at);
alter table public.bes_slideshow_slides enable row level security;

drop policy if exists bss_published_albums_read on public.bes_slideshow_albums;
create policy bss_published_albums_read on public.bes_slideshow_albums
  for select to anon, authenticated using (is_published = true);
drop policy if exists bss_editor_albums_read on public.bes_slideshow_albums;
create policy bss_editor_albums_read on public.bes_slideshow_albums
  for select to authenticated using (public.bes_slideshow_is_editor());
drop policy if exists bss_editor_albums_insert on public.bes_slideshow_albums;
create policy bss_editor_albums_insert on public.bes_slideshow_albums
  for insert to authenticated with check (
    public.bes_slideshow_is_editor() and created_by = (select auth.uid())
  );
drop policy if exists bss_editor_albums_update on public.bes_slideshow_albums;
create policy bss_editor_albums_update on public.bes_slideshow_albums
  for update to authenticated using (public.bes_slideshow_is_editor())
  with check (public.bes_slideshow_is_editor());
drop policy if exists bss_editor_albums_delete on public.bes_slideshow_albums;
create policy bss_editor_albums_delete on public.bes_slideshow_albums
  for delete to authenticated using (public.bes_slideshow_is_editor());

drop policy if exists bss_published_slides_read on public.bes_slideshow_slides;
create policy bss_published_slides_read on public.bes_slideshow_slides
  for select to anon, authenticated
  using (exists (
    select 1 from public.bes_slideshow_albums a
    where a.id = album_id and a.is_published = true
  ));
drop policy if exists bss_editor_slides_read on public.bes_slideshow_slides;
create policy bss_editor_slides_read on public.bes_slideshow_slides
  for select to authenticated using (public.bes_slideshow_is_editor());
drop policy if exists bss_editor_slides_insert on public.bes_slideshow_slides;
create policy bss_editor_slides_insert on public.bes_slideshow_slides
  for insert to authenticated with check (
    public.bes_slideshow_is_editor() and
    split_part(image_path, '/', 1) = album_id::text and
    image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|gif|avif)$'
  );
drop policy if exists bss_editor_slides_update on public.bes_slideshow_slides;
create policy bss_editor_slides_update on public.bes_slideshow_slides
  for update to authenticated using (public.bes_slideshow_is_editor())
  with check (
    public.bes_slideshow_is_editor() and
    split_part(image_path, '/', 1) = album_id::text
  );
drop policy if exists bss_editor_slides_delete on public.bes_slideshow_slides;
create policy bss_editor_slides_delete on public.bes_slideshow_slides
  for delete to authenticated using (public.bes_slideshow_is_editor());

grant select on public.bes_slideshow_albums, public.bes_slideshow_slides to anon;
grant select, insert, update, delete on public.bes_slideshow_albums, public.bes_slideshow_slides to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brian-slideshows', 'brian-slideshows', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update set
  public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists bss_storage_editor_select on storage.objects;
create policy bss_storage_editor_select on storage.objects
  for select to authenticated
  using (bucket_id = 'brian-slideshows' and public.bes_slideshow_is_editor());
drop policy if exists bss_storage_editor_insert on storage.objects;
create policy bss_storage_editor_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brian-slideshows' and public.bes_slideshow_is_editor()
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif','avif'));
drop policy if exists bss_storage_editor_delete on storage.objects;
create policy bss_storage_editor_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'brian-slideshows' and public.bes_slideshow_is_editor());
