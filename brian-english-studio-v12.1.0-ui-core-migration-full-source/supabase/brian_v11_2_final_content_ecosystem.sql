-- Brian English Studio V11.2.0 — Final Content Ecosystem
-- Safe to rerun. Existing teaching content is preserved.
begin;
create extension if not exists pgcrypto;

create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.bes_v1120_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare result_value boolean;
begin
  if target_user is null then return false; end if;
  if to_regprocedure('public.bes_v1110_is_leader(uuid)') is not null then
    execute 'select public.bes_v1110_is_leader($1)' into result_value using target_user;
    return coalesce(result_value,false);
  end if;
  if to_regclass('public.system_roles') is not null then
    return exists(select 1 from public.system_roles where user_id=target_user and active=true and role in ('admin','department_head'));
  end if;
  return false;
exception when others then return false;
end $$;
grant execute on function public.bes_v1120_is_leader(uuid) to authenticated;

create table if not exists public.content_ecosystem_assets (
  id text primary key,
  owner_id uuid not null default auth.uid(),
  title text not null default 'Untitled content',
  asset_type text not null default 'source' check(asset_type in ('source','reading','vocabulary','worksheet','activity','assessment','speaking','lesson-plan','homework')),
  source_app text not null default 'content-ecosystem',
  content_text text not null default '',
  content_json jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  status text not null default 'draft' check(status in ('draft','ready','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_ecosystem_assets_owner_updated_idx on public.content_ecosystem_assets(owner_id,updated_at desc);
create index if not exists content_ecosystem_assets_type_idx on public.content_ecosystem_assets(asset_type,status);
create index if not exists content_ecosystem_assets_tags_idx on public.content_ecosystem_assets using gin(tags);

create table if not exists public.content_ecosystem_kits (
  id text primary key,
  owner_id uuid not null default auth.uid(),
  title text not null default 'Content kit',
  description text not null default '',
  asset_ids text[] not null default '{}',
  status text not null default 'draft' check(status in ('draft','ready','published','archived')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_ecosystem_kits_owner_updated_idx on public.content_ecosystem_kits(owner_id,updated_at desc);

create table if not exists public.content_ecosystem_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  source_asset_id text references public.content_ecosystem_assets(id) on delete set null,
  recipe_id text not null,
  targets text[] not null default '{}',
  status text not null default 'queued' check(status in ('queued','dispatched','completed','failed')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_ecosystem_runs_owner_created_idx on public.content_ecosystem_runs(owner_id,created_at desc);

alter table public.content_ecosystem_assets enable row level security;
alter table public.content_ecosystem_kits enable row level security;
alter table public.content_ecosystem_runs enable row level security;

do $$ declare p record; begin
  for p in select policyname,tablename from pg_policies where schemaname='public' and tablename in ('content_ecosystem_assets','content_ecosystem_kits','content_ecosystem_runs')
  loop execute format('drop policy if exists %I on public.%I',p.policyname,p.tablename); end loop;
end $$;

create policy content_ecosystem_assets_owner_all_v1120 on public.content_ecosystem_assets for all to authenticated
using(owner_id=auth.uid() or public.bes_v1120_is_leader(auth.uid()))
with check(owner_id=auth.uid() or public.bes_v1120_is_leader(auth.uid()));
create policy content_ecosystem_kits_owner_all_v1120 on public.content_ecosystem_kits for all to authenticated
using(owner_id=auth.uid() or public.bes_v1120_is_leader(auth.uid()))
with check(owner_id=auth.uid() or public.bes_v1120_is_leader(auth.uid()));
create policy content_ecosystem_runs_owner_all_v1120 on public.content_ecosystem_runs for all to authenticated
using(owner_id=auth.uid() or public.bes_v1120_is_leader(auth.uid()))
with check(owner_id=auth.uid() or public.bes_v1120_is_leader(auth.uid()));

grant select,insert,update,delete on public.content_ecosystem_assets to authenticated;
grant select,insert,update,delete on public.content_ecosystem_kits to authenticated;
grant select,insert,update,delete on public.content_ecosystem_runs to authenticated;

do $do$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    begin alter publication supabase_realtime add table public.content_ecosystem_assets; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.content_ecosystem_kits; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.content_ecosystem_runs; exception when duplicate_object then null; end;
  end if;
end $do$;

insert into public.bes_schema_registry(component,version,installed_at,metadata)
values
  ('application','11.2.0',now(),'{"release":"Final Content Ecosystem"}'::jsonb),
  ('runtime_core','2.2.0',now(),'{"content_assets":true,"structured_canvas":true,"production_recipes":true}'::jsonb),
  ('connected_teaching_suite','11.2.0',now(),'{"lesson_pack":true,"classroom_delivery":true,"content_ecosystem":true}'::jsonb),
  ('content_ecosystem','11.2.0',now(),'{"assets":true,"canvas":true,"recipes":true,"kits":true,"multi_app_transfer":true}'::jsonb)
on conflict(component) do update set version=excluded.version,installed_at=excluded.installed_at,metadata=excluded.metadata;

commit;

select 'content_ecosystem_assets' as object,count(*) as rows from public.content_ecosystem_assets
union all select 'content_ecosystem_kits',count(*) from public.content_ecosystem_kits
union all select 'content_ecosystem_runs',count(*) from public.content_ecosystem_runs;
