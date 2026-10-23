begin;

-- Dashboard customization is independent from the Homepage Hero, and from
-- users' own names, live calendars, weather, and daily schedule widgets.
create table if not exists public.dashboard_hero_public (
  id text primary key default 'dashboard' check (id = 'dashboard'),
  published_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.dashboard_hero_drafts (
  id text primary key default 'dashboard' check (id = 'dashboard'),
  draft_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.dashboard_hero_public enable row level security;
alter table public.dashboard_hero_drafts enable row level security;

grant select on public.dashboard_hero_public to authenticated;
grant select, insert, update on public.dashboard_hero_drafts to authenticated;
grant insert, update on public.dashboard_hero_public to authenticated;
revoke all on public.dashboard_hero_drafts from anon;
revoke all on public.dashboard_hero_public from anon;

drop policy if exists "Authenticated read dashboard Hero" on public.dashboard_hero_public;
create policy "Authenticated read dashboard Hero" on public.dashboard_hero_public
 for select to authenticated using (true);

drop policy if exists "Managers publish dashboard Hero" on public.dashboard_hero_public;
create policy "Managers publish dashboard Hero" on public.dashboard_hero_public
 for all to authenticated
 using (exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.approved = true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')))
 with check (exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.approved = true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')));

drop policy if exists "Managers manage dashboard Hero drafts" on public.dashboard_hero_drafts;
create policy "Managers manage dashboard Hero drafts" on public.dashboard_hero_drafts
 for all to authenticated
 using (exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.approved = true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')))
 with check (exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.approved = true and lower(coalesce(p.role,'')) in ('admin','department_head','ttcm')));

insert into public.dashboard_hero_public(id, published_config) values ('dashboard','{}'::jsonb) on conflict(id) do nothing;
commit;