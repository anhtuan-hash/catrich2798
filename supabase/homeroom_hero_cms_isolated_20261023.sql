-- Homeroom Hero CMS - independent from Dashboard. Applied to Supabase on 2026-10-23.
create table if not exists public.homeroom_hero_public (
  id text primary key default 'homeroom' check (id='homeroom'),
  published_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.homeroom_hero_drafts (
  id text primary key default 'homeroom' check (id='homeroom'),
  draft_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.homeroom_hero_public enable row level security;
alter table public.homeroom_hero_drafts enable row level security;
grant select,insert,update,delete on public.homeroom_hero_public,public.homeroom_hero_drafts to authenticated;
create policy "Signed-in teachers read Homeroom Hero" on public.homeroom_hero_public
  for select to authenticated using (true);
create policy "Managers publish Homeroom Hero" on public.homeroom_hero_public
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.approved=true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')))
  with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.approved=true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')));
create policy "Managers manage Homeroom Hero drafts" on public.homeroom_hero_drafts
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.approved=true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')))
  with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.approved=true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')));
