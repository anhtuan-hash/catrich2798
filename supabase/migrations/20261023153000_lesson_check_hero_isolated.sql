-- Lesson Check / Assessment Hero CMS, completely independent from the
-- Dashboard and Homepage Hero configuration and storage.
create table if not exists public.lesson_check_hero_public (
  id text primary key default 'lesson-check',
  published_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table if not exists public.lesson_check_hero_drafts (
  id text primary key default 'lesson-check',
  draft_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.lesson_check_hero_public enable row level security;
alter table public.lesson_check_hero_drafts enable row level security;

drop policy if exists "Teachers read lesson-check hero" on public.lesson_check_hero_public;
create policy "Teachers read lesson-check hero" on public.lesson_check_hero_public
  for select to authenticated using (true);
drop policy if exists "Leaders publish lesson-check hero" on public.lesson_check_hero_public;
create policy "Leaders publish lesson-check hero" on public.lesson_check_hero_public
  for all to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid())
    and p.approved = true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')
  ))
  with check (id = 'lesson-check' and exists (
    select 1 from public.profiles p where p.id = (select auth.uid())
    and p.approved = true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')
  ));
drop policy if exists "Leaders edit lesson-check hero drafts" on public.lesson_check_hero_drafts;
create policy "Leaders edit lesson-check hero drafts" on public.lesson_check_hero_drafts
  for all to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid())
    and p.approved = true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')
  ))
  with check (id = 'lesson-check' and exists (
    select 1 from public.profiles p where p.id = (select auth.uid())
    and p.approved = true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')
  ));
grant select,insert,update,delete on public.lesson_check_hero_public to authenticated;
grant select,insert,update,delete on public.lesson_check_hero_drafts to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'lesson-check-hero-media','lesson-check-hero-media',true,26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
)
on conflict (id) do nothing;
drop policy if exists "Public reads lesson-check hero media" on storage.objects;
create policy "Public reads lesson-check hero media" on storage.objects
  for select to public using (bucket_id='lesson-check-hero-media');
drop policy if exists "Leaders upload lesson-check hero media" on storage.objects;
create policy "Leaders upload lesson-check hero media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id='lesson-check-hero-media'
    and (storage.foldername(name))[1]=(select auth.uid())::text
    and exists(select 1 from public.profiles p where p.id=(select auth.uid())
      and p.approved=true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm'))
  );
drop policy if exists "Leaders delete lesson-check hero media" on storage.objects;
create policy "Leaders delete lesson-check hero media" on storage.objects
  for delete to authenticated
  using (
    bucket_id='lesson-check-hero-media'
    and (storage.foldername(name))[1]=(select auth.uid())::text
    and exists(select 1 from public.profiles p where p.id=(select auth.uid())
      and p.approved=true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm'))
  );
