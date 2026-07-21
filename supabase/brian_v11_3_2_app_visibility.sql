-- Brian English Studio V11.3.2 — Admin Hidden Apps Vault
-- Safe to rerun. No teaching content or existing application data is deleted.
begin;
create extension if not exists pgcrypto;

create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.bes_v1132_is_admin(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare role_value text; jwt_role text;
begin
  if target_user is null then return false; end if;
  if to_regprocedure('public.bes_v1099_current_role(uuid)') is not null then
    execute 'select public.bes_v1099_current_role($1)' into role_value using target_user;
    if lower(coalesce(role_value,''))='admin' then return true; end if;
  end if;
  if to_regclass('public.system_roles') is not null then
    select role into role_value from public.system_roles
    where user_id=target_user and active=true order by assigned_at desc limit 1;
    if lower(coalesce(role_value,''))='admin' then return true; end if;
  end if;
  jwt_role := lower(coalesce(
    auth.jwt()->'app_metadata'->>'role',
    auth.jwt()->'user_metadata'->>'role',
    auth.jwt()->>'role',
    ''
  ));
  return jwt_role in ('admin','administrator');
exception when others then return false;
end $$;
grant execute on function public.bes_v1132_is_admin(uuid) to authenticated;

create table if not exists public.app_visibility_settings (
  app_id text primary key,
  app_kind text not null default 'tool' check(app_kind in ('tool','route','apps','games','tools','routes')),
  slug text,
  route text,
  title text,
  title_vi text,
  is_hidden boolean not null default false,
  hidden_roles text[] not null default array['department_head','teacher','student']::text[],
  reason text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.app_visibility_settings add column if not exists app_kind text not null default 'tool';
alter table public.app_visibility_settings add column if not exists slug text;
alter table public.app_visibility_settings add column if not exists route text;
alter table public.app_visibility_settings add column if not exists title text;
alter table public.app_visibility_settings add column if not exists title_vi text;
alter table public.app_visibility_settings add column if not exists is_hidden boolean not null default false;
alter table public.app_visibility_settings add column if not exists hidden_roles text[] not null default array['department_head','teacher','student']::text[];
alter table public.app_visibility_settings add column if not exists reason text;
alter table public.app_visibility_settings add column if not exists updated_by uuid;
alter table public.app_visibility_settings add column if not exists updated_at timestamptz not null default now();
alter table public.app_visibility_settings add column if not exists created_at timestamptz not null default now();

create index if not exists app_visibility_settings_hidden_idx on public.app_visibility_settings(is_hidden,updated_at desc);
create index if not exists app_visibility_settings_slug_idx on public.app_visibility_settings(slug);

alter table public.app_visibility_settings enable row level security;
do $do$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='app_visibility_settings'
  loop execute format('drop policy if exists %I on public.app_visibility_settings',p.policyname); end loop;
end $do$;

-- Every signed-in account may read the visibility list so hidden apps can be removed before rendering.
create policy app_visibility_read_v1132 on public.app_visibility_settings
for select to authenticated using (true);

-- Only a canonical Admin account may hide, restore or delete visibility records.
create policy app_visibility_insert_v1132 on public.app_visibility_settings
for insert to authenticated with check (public.bes_v1132_is_admin(auth.uid()));
create policy app_visibility_update_v1132 on public.app_visibility_settings
for update to authenticated using (public.bes_v1132_is_admin(auth.uid())) with check (public.bes_v1132_is_admin(auth.uid()));
create policy app_visibility_delete_v1132 on public.app_visibility_settings
for delete to authenticated using (public.bes_v1132_is_admin(auth.uid()));

grant select,insert,update,delete on public.app_visibility_settings to authenticated;

-- Realtime makes an open teacher session remove/restore an app immediately after Admin changes it.
do $do$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    begin alter publication supabase_realtime add table public.app_visibility_settings;
    exception when duplicate_object then null; end;
  end if;
end $do$;

insert into public.bes_schema_registry(component,version,installed_at,metadata) values
('application','11.3.2',now(),jsonb_build_object('release','Admin Hidden Apps Vault')),
('runtime_core','2.3.2',now(),jsonb_build_object('app_visibility',true)),
('app_visibility','11.3.2',now(),jsonb_build_object('admin_only',true,'realtime',true,'hidden_roles',array['department_head','teacher','student']))
on conflict(component) do update set version=excluded.version,installed_at=excluded.installed_at,metadata=excluded.metadata;

commit;

select app_id,is_hidden,hidden_roles,reason,updated_at
from public.app_visibility_settings
order by is_hidden desc,updated_at desc;
