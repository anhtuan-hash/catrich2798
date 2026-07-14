-- Brian English Studio V11.0.0 — Connected Teaching Suite
-- Safe to rerun. Existing lesson packs and teaching data are preserved.
begin;
create extension if not exists pgcrypto;

create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.bes_v1100_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare role_value text;
begin
  if target_user is null then return false; end if;
  if to_regprocedure('public.bes_v1099_is_leader(uuid)') is not null then
    execute 'select public.bes_v1099_is_leader($1)' into role_value using target_user;
    return role_value::boolean;
  end if;
  if to_regclass('public.system_roles') is not null then
    select role into role_value from public.system_roles where user_id=target_user and active=true order by assigned_at desc limit 1;
    return role_value in ('admin','department_head');
  end if;
  return false;
exception when others then return false;
end $$;

grant execute on function public.bes_v1100_is_leader(uuid) to authenticated;

create table if not exists public.lesson_packs (
  id text primary key,
  owner_id uuid not null default auth.uid(),
  title text not null default 'Untitled Lesson Pack',
  subject text not null default 'English',
  class_name text not null default '',
  unit text not null default '',
  level text not null default 'B1-B2',
  duration_minutes integer not null default 45 check (duration_minutes between 5 and 600),
  objectives text not null default '',
  teacher_notes text not null default '',
  status text not null default 'draft' check (status in ('draft','ready','published','archived')),
  variant text not null default 'standard' check (variant in ('support','standard','advanced')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists lesson_packs_owner_updated_idx on public.lesson_packs(owner_id,updated_at desc);
create index if not exists lesson_packs_status_idx on public.lesson_packs(status) where deleted_at is null;

create table if not exists public.lesson_pack_items (
  id text primary key,
  pack_id text not null references public.lesson_packs(id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  position integer not null default 0,
  item_type text not null default 'other',
  title text not null default 'Activity',
  source_app text not null default 'manual',
  source_title text not null default 'Brian English Studio',
  content text not null default '',
  minutes integer not null default 10 check (minutes between 1 and 180),
  delivery_mode text not null default 'individual',
  level text not null default '',
  skill text not null default '',
  objective text not null default '',
  materials text not null default '',
  support_content text not null default '',
  extension_content text not null default '',
  answer_key text not null default '',
  route text not null default '',
  status text not null default 'draft' check (status in ('draft','ready','used')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lesson_pack_items_pack_position_idx on public.lesson_pack_items(pack_id,position);
create index if not exists lesson_pack_items_owner_idx on public.lesson_pack_items(owner_id,updated_at desc);

alter table public.lesson_packs enable row level security;
alter table public.lesson_pack_items enable row level security;

drop policy if exists lesson_packs_read_v1100 on public.lesson_packs;
create policy lesson_packs_read_v1100 on public.lesson_packs for select to authenticated
using (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()));
drop policy if exists lesson_packs_insert_v1100 on public.lesson_packs;
create policy lesson_packs_insert_v1100 on public.lesson_packs for insert to authenticated
with check (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()));
drop policy if exists lesson_packs_update_v1100 on public.lesson_packs;
create policy lesson_packs_update_v1100 on public.lesson_packs for update to authenticated
using (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()))
with check (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()));
drop policy if exists lesson_packs_delete_v1100 on public.lesson_packs;
create policy lesson_packs_delete_v1100 on public.lesson_packs for delete to authenticated
using (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()));

drop policy if exists lesson_pack_items_read_v1100 on public.lesson_pack_items;
create policy lesson_pack_items_read_v1100 on public.lesson_pack_items for select to authenticated
using (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()) or exists(select 1 from public.lesson_packs p where p.id=pack_id and (p.owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()))));
drop policy if exists lesson_pack_items_insert_v1100 on public.lesson_pack_items;
create policy lesson_pack_items_insert_v1100 on public.lesson_pack_items for insert to authenticated
with check (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()));
drop policy if exists lesson_pack_items_update_v1100 on public.lesson_pack_items;
create policy lesson_pack_items_update_v1100 on public.lesson_pack_items for update to authenticated
using (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()))
with check (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()));
drop policy if exists lesson_pack_items_delete_v1100 on public.lesson_pack_items;
create policy lesson_pack_items_delete_v1100 on public.lesson_pack_items for delete to authenticated
using (owner_id=auth.uid() or public.bes_v1100_is_leader(auth.uid()));

grant select,insert,update,delete on public.lesson_packs to authenticated;
grant select,insert,update,delete on public.lesson_pack_items to authenticated;

do $do$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    begin alter publication supabase_realtime add table public.lesson_packs; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.lesson_pack_items; exception when duplicate_object then null; end;
  end if;
end $do$;

insert into public.bes_schema_registry(component,version,installed_at,metadata)
values
  ('application','11.0.0',now(),'{"release":"Connected Teaching Suite"}'::jsonb),
  ('runtime_core','2.0.0',now(),'{"lesson_pack":true,"cross_app_transfer":true}'::jsonb),
  ('connected_teaching_suite','11.0.0',now(),'{"lesson_pack":true,"live_mode":true,"variants":3}'::jsonb)
on conflict(component) do update set version=excluded.version,installed_at=excluded.installed_at,metadata=excluded.metadata;
commit;
