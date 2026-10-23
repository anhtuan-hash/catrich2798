-- Independent seasonal theme selector. Vietnam settings and image assets are not modified.
-- Default stays Vietnam until an authorized Admin explicitly applies Halloween.
create table if not exists public.global_atmosphere_theme (
  workspace_key text primary key default 'english-hub',
  active_theme text not null default 'vietnam'
    check (active_theme in ('vietnam', 'halloween')),
  halloween_enabled boolean not null default true,
  halloween_show_built_ins boolean not null default true,
  halloween_opacity numeric(4,3) not null default 0.180
    check (halloween_opacity between 0.030 and 0.280),
  halloween_speed numeric(4,2) not null default 1.00
    check (halloween_speed between 0.40 and 2.50),
  halloween_density integer not null default 10
    check (halloween_density between 3 and 18),
  updated_at timestamptz not null default now()
);

alter table public.global_atmosphere_theme enable row level security;
drop policy if exists "Anyone can read the global atmosphere theme" on public.global_atmosphere_theme;
create policy "Anyone can read the global atmosphere theme"
  on public.global_atmosphere_theme for select to anon, authenticated using (true);
drop policy if exists "Only Admin can insert global atmosphere theme" on public.global_atmosphere_theme;
create policy "Only Admin can insert global atmosphere theme"
  on public.global_atmosphere_theme for insert to authenticated
  with check ((select public.is_admin()));
drop policy if exists "Only Admin can update global atmosphere theme" on public.global_atmosphere_theme;
create policy "Only Admin can update global atmosphere theme"
  on public.global_atmosphere_theme for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.global_atmosphere_theme from anon, authenticated;
grant select on public.global_atmosphere_theme to anon;
grant select, insert, update on public.global_atmosphere_theme to authenticated;

insert into public.global_atmosphere_theme (workspace_key, active_theme)
values ('english-hub', 'vietnam')
on conflict (workspace_key) do nothing;

-- Add to Realtime only if it is not already present.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'global_atmosphere_theme'
  ) then
    alter publication supabase_realtime add table public.global_atmosphere_theme;
  end if;
end $$;
