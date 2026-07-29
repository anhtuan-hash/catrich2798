begin;

create table if not exists public.homepage_hero_settings (
  id text primary key,
  draft_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint homepage_hero_settings_singleton check (id = 'home')
);

create table if not exists public.homepage_hero_public (
  id text primary key,
  published_config jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint homepage_hero_public_singleton check (id = 'home')
);

alter table public.homepage_hero_settings enable row level security;
alter table public.homepage_hero_public enable row level security;

-- Draft/editor table: only approved TTCM/Admin accounts can read or write.
drop policy if exists "Department leaders can read homepage Hero drafts" on public.homepage_hero_settings;
create policy "Department leaders can read homepage Hero drafts"
on public.homepage_hero_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
);

drop policy if exists "Department leaders can insert homepage Hero drafts" on public.homepage_hero_settings;
create policy "Department leaders can insert homepage Hero drafts"
on public.homepage_hero_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
);

drop policy if exists "Department leaders can update homepage Hero drafts" on public.homepage_hero_settings;
create policy "Department leaders can update homepage Hero drafts"
on public.homepage_hero_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
);

-- Public table: everyone reads the published version; only TTCM/Admin publish.
drop policy if exists "Everyone can read published homepage Hero" on public.homepage_hero_public;
create policy "Everyone can read published homepage Hero"
on public.homepage_hero_public
for select
using (true);

drop policy if exists "Department leaders can publish homepage Hero" on public.homepage_hero_public;
create policy "Department leaders can publish homepage Hero"
on public.homepage_hero_public
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
);

drop policy if exists "Department leaders can update published homepage Hero" on public.homepage_hero_public;
create policy "Department leaders can update published homepage Hero"
on public.homepage_hero_public
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
);

insert into public.homepage_hero_settings (id)
values ('home')
on conflict (id) do nothing;

insert into public.homepage_hero_public (id)
values ('home')
on conflict (id) do nothing;

revoke all on public.homepage_hero_settings from anon;
grant select, insert, update on public.homepage_hero_settings to authenticated;
grant select on public.homepage_hero_public to anon, authenticated;
grant insert, update on public.homepage_hero_public to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'homepage-hero-media',
  'homepage-hero-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/apng',
    'video/mp4',
    'video/webm'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view homepage Hero media" on storage.objects;
create policy "Public can view homepage Hero media"
on storage.objects
for select
using (bucket_id = 'homepage-hero-media');

drop policy if exists "Department leaders can upload homepage Hero media" on storage.objects;
create policy "Department leaders can upload homepage Hero media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'homepage-hero-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
);

drop policy if exists "Department leaders can update homepage Hero media" on storage.objects;
create policy "Department leaders can update homepage Hero media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'homepage-hero-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
)
with check (
  bucket_id = 'homepage-hero-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Department leaders can delete homepage Hero media" on storage.objects;
create policy "Department leaders can delete homepage Hero media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'homepage-hero-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'ttcm')
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'homepage_hero_public'
  ) then
    alter publication supabase_realtime add table public.homepage_hero_public;
  end if;
exception
  when undefined_object then
    null;
end $$;

commit;
