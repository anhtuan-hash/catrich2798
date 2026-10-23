-- Independent Gradebook Hero CMS. No change to Dashboard or Homepage settings.
create table if not exists public.gradebook_hero_public (
  id text primary key default 'gradebook' check (id='gradebook'),
  published_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.gradebook_hero_drafts (
  id text primary key default 'gradebook' check (id='gradebook'),
  draft_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.gradebook_hero_public enable row level security;
alter table public.gradebook_hero_drafts enable row level security;
create policy "Approved users read published Gradebook hero" on public.gradebook_hero_public
 for select to authenticated
 using (exists(select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.approved=true));
create policy "Managers publish Gradebook hero" on public.gradebook_hero_public
 for all to authenticated
 using (exists(select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.approved=true
      and p.role in ('admin','department_head','ttcm')))
 with check (exists(select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.approved=true
      and p.role in ('admin','department_head','ttcm')));
create policy "Managers edit Gradebook hero drafts" on public.gradebook_hero_drafts
 for all to authenticated
 using (exists(select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.approved=true
      and p.role in ('admin','department_head','ttcm')))
 with check (exists(select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.approved=true
      and p.role in ('admin','department_head','ttcm')));
grant select,insert,update on public.gradebook_hero_public to authenticated;
grant select,insert,update on public.gradebook_hero_drafts to authenticated;
