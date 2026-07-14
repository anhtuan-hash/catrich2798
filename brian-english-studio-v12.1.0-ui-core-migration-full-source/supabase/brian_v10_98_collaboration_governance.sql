-- Brian English Studio V10.98.0
-- Collaboration & Data Governance
-- Spaces, members, threads, comments, content versions, audit logs,
-- permission overrides, backup snapshots and 30-day soft deletion.
-- Safe to rerun. Existing data is preserved.

begin;
create extension if not exists pgcrypto;

create or replace function public.bes_v1098_try_uuid(value text)
returns uuid language plpgsql immutable security invoker set search_path=public,pg_temp as $$
begin
  if value is not null and value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return value::uuid; end if;
  return null;
end; $$;

create or replace function public.bes_v1098_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare jwt jsonb:=coalesce(auth.jwt(),'{}'::jsonb); role_text text:=lower(coalesce(jwt->'app_metadata'->>'role',jwt->'user_metadata'->>'role',jwt->>'role','')); email_text text:=lower(coalesce(jwt->>'email','')); matched boolean:=false;
begin
  if target_user is null then return false; end if;
  if target_user=auth.uid() and (role_text in('admin','ttcm','leader','department_head','department-head','head') or email_text='anhtuan@pek.edu.vn') then return true; end if;
  if to_regclass('public.profiles') is null then return false; end if;
  select exists(select 1 from public.profiles p cross join lateral(select to_jsonb(p) j)x
    where coalesce(public.bes_v1098_try_uuid(x.j->>'id'),public.bes_v1098_try_uuid(x.j->>'user_id'),public.bes_v1098_try_uuid(x.j->>'profile_id'))=target_user
      and (lower(coalesce(x.j->>'role','')) in('admin','ttcm','leader','department_head','department-head','head') or lower(coalesce(x.j->>'email',''))='anhtuan@pek.edu.vn')) into matched;
  return coalesce(matched,false);
exception when others then return false;
end; $$;

create or replace function public.bes_v1098_set_updated_at()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$ begin new.updated_at=now(); return new; end; $$;

create table if not exists public.collaboration_spaces(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  description text not null default '',
  space_type text not null default 'project',
  visibility text not null default 'restricted',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint collaboration_spaces_visibility_check check(visibility in('private','restricted','department')),
  constraint collaboration_spaces_status_check check(status in('active','paused','completed','archived')),
  constraint collaboration_spaces_metadata_object check(jsonb_typeof(metadata)='object')
);
create index if not exists collaboration_spaces_owner_idx on public.collaboration_spaces(owner_id,updated_at desc);
create index if not exists collaboration_spaces_status_idx on public.collaboration_spaces(status,updated_at desc);
drop trigger if exists collaboration_spaces_updated_trg on public.collaboration_spaces;
create trigger collaboration_spaces_updated_trg before update on public.collaboration_spaces for each row execute function public.bes_v1098_set_updated_at();

create table if not exists public.collaboration_members(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.collaboration_spaces(id) on delete cascade,
  user_id uuid not null,
  member_role text not null default 'member',
  display_name text not null default '',
  email text not null default '',
  status text not null default 'active',
  invited_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_members_role_check check(member_role in('owner','manager','editor','member','viewer')),
  constraint collaboration_members_status_check check(status in('invited','active','removed')),
  constraint collaboration_members_unique unique(space_id,user_id)
);
create index if not exists collaboration_members_user_idx on public.collaboration_members(user_id,status);
drop trigger if exists collaboration_members_updated_trg on public.collaboration_members;
create trigger collaboration_members_updated_trg before update on public.collaboration_members for each row execute function public.bes_v1098_set_updated_at();

create table if not exists public.collaboration_threads(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.collaboration_spaces(id) on delete cascade,
  created_by uuid not null,
  title text not null,
  thread_type text not null default 'discussion',
  status text not null default 'open',
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_threads_type_check check(thread_type in('discussion','decision','review','question','announcement')),
  constraint collaboration_threads_status_check check(status in('open','resolved','archived')),
  constraint collaboration_threads_metadata_object check(jsonb_typeof(metadata)='object')
);
create index if not exists collaboration_threads_space_idx on public.collaboration_threads(space_id,updated_at desc);
drop trigger if exists collaboration_threads_updated_trg on public.collaboration_threads;
create trigger collaboration_threads_updated_trg before update on public.collaboration_threads for each row execute function public.bes_v1098_set_updated_at();

create table if not exists public.collaboration_comments(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.collaboration_spaces(id) on delete cascade,
  thread_id uuid not null references public.collaboration_threads(id) on delete cascade,
  author_id uuid not null,
  author_name text not null default '',
  body text not null,
  parent_id uuid references public.collaboration_comments(id) on delete set null,
  mentions uuid[] not null default '{}'::uuid[],
  attachments jsonb not null default '[]'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_comments_attachments_array check(jsonb_typeof(attachments)='array')
);
create index if not exists collaboration_comments_thread_idx on public.collaboration_comments(thread_id,created_at);
create index if not exists collaboration_comments_mentions_idx on public.collaboration_comments using gin(mentions);
drop trigger if exists collaboration_comments_updated_trg on public.collaboration_comments;
create trigger collaboration_comments_updated_trg before update on public.collaboration_comments for each row execute function public.bes_v1098_set_updated_at();

create table if not exists public.content_versions(
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.collaboration_spaces(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  version_no integer not null default 1,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  status text not null default 'draft',
  restore_of uuid references public.content_versions(id) on delete set null,
  checksum text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint content_versions_status_check check(status in('draft','review','official','superseded','archived')),
  constraint content_versions_content_object check(jsonb_typeof(content)='object'),
  constraint content_versions_unique unique(entity_type,entity_id,version_no)
);
create index if not exists content_versions_entity_idx on public.content_versions(entity_type,entity_id,version_no desc);
create index if not exists content_versions_space_idx on public.content_versions(space_id,created_at desc);

create table if not exists public.permission_overrides(
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id text not null,
  principal_type text not null default 'user',
  principal_id text not null,
  permission_level text not null default 'viewer',
  granted_by uuid not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint permission_overrides_principal_check check(principal_type in('user','role','department')),
  constraint permission_overrides_level_check check(permission_level in('viewer','commenter','editor','manager')),
  constraint permission_overrides_unique unique(resource_type,resource_id,principal_type,principal_id),
  constraint permission_overrides_metadata_object check(jsonb_typeof(metadata)='object')
);
drop trigger if exists permission_overrides_updated_trg on public.permission_overrides;
create trigger permission_overrides_updated_trg before update on public.permission_overrides for each row execute function public.bes_v1098_set_updated_at();

create table if not exists public.audit_events(
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text not null default '',
  actor_role text not null default '',
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  source_module text not null default 'system',
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_before_object check(jsonb_typeof(before_data)='object'),
  constraint audit_after_object check(jsonb_typeof(after_data)='object'),
  constraint audit_metadata_object check(jsonb_typeof(metadata)='object')
);
create index if not exists audit_events_actor_idx on public.audit_events(actor_id,created_at desc);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type,entity_id,created_at desc);
create index if not exists audit_events_action_idx on public.audit_events(action,created_at desc);

create table if not exists public.backup_snapshots(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  label text not null,
  scope text not null default 'collaboration',
  status text not null default 'ready',
  item_count integer not null default 0,
  snapshot_data jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint backup_snapshots_scope_check check(scope in('collaboration','work','knowledge','assessment','automation','custom')),
  constraint backup_snapshots_status_check check(status in('creating','ready','restored','expired','failed')),
  constraint backup_snapshots_data_object check(jsonb_typeof(snapshot_data)='object')
);
create index if not exists backup_snapshots_owner_idx on public.backup_snapshots(owner_id,created_at desc);
drop trigger if exists backup_snapshots_updated_trg on public.backup_snapshots;
create trigger backup_snapshots_updated_trg before update on public.backup_snapshots for each row execute function public.bes_v1098_set_updated_at();

create table if not exists public.backup_items(
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.backup_snapshots(id) on delete cascade,
  entity_type text not null,
  entity_id text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint backup_items_payload_object check(jsonb_typeof(payload)='object')
);
create index if not exists backup_items_snapshot_idx on public.backup_items(snapshot_id,entity_type);

create table if not exists public.deleted_items(
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  title text not null default '',
  source_module text not null default 'system',
  deleted_by uuid not null,
  payload jsonb not null default '{}'::jsonb,
  restore_payload jsonb not null default '{}'::jsonb,
  status text not null default 'deleted',
  expires_at timestamptz not null default (now()+interval '30 days'),
  restored_at timestamptz,
  restored_by uuid,
  permanently_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deleted_items_status_check check(status in('deleted','restored','purged')),
  constraint deleted_items_payload_object check(jsonb_typeof(payload)='object'),
  constraint deleted_items_restore_object check(jsonb_typeof(restore_payload)='object')
);
create index if not exists deleted_items_status_idx on public.deleted_items(status,expires_at,created_at desc);
create index if not exists deleted_items_actor_idx on public.deleted_items(deleted_by,created_at desc);
drop trigger if exists deleted_items_updated_trg on public.deleted_items;
create trigger deleted_items_updated_trg before update on public.deleted_items for each row execute function public.bes_v1098_set_updated_at();

-- Compatibility columns for resource-library soft deletion.
do $$ begin
  if to_regclass('public.resource_items') is not null then
    alter table public.resource_items add column if not exists deleted_at timestamptz;
    alter table public.resource_items add column if not exists deleted_by uuid;
    create index if not exists resource_items_deleted_idx on public.resource_items(deleted_at,status);
  end if;
end $$;

create or replace function public.bes_v1098_is_space_member(target_space uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
  select target_user is not null and exists(
    select 1 from public.collaboration_spaces s
    where s.id=target_space and (
      s.owner_id=target_user or s.visibility='department' or public.bes_v1098_is_leader(target_user)
      or exists(select 1 from public.collaboration_members m where m.space_id=s.id and m.user_id=target_user and m.status='active')
    )
  );
$$;

create or replace function public.bes_v1098_can_manage_space(target_space uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
  select target_user is not null and exists(
    select 1 from public.collaboration_spaces s
    where s.id=target_space and (
      s.owner_id=target_user or public.bes_v1098_is_leader(target_user)
      or exists(select 1 from public.collaboration_members m where m.space_id=s.id and m.user_id=target_user and m.status='active' and m.member_role in('owner','manager'))
    )
  );
$$;

create or replace function public.bes_v1098_soft_delete_resource(target_resource uuid)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare resource_data jsonb; deleted_id uuid; previous_status text;
begin
  if auth.uid() is null or not public.bes_v1098_is_leader(auth.uid()) then raise exception 'Not allowed to delete resources.'; end if;
  if to_regclass('public.resource_items') is null then raise exception 'resource_items is unavailable.'; end if;
  select to_jsonb(r),coalesce(r.status,'approved') into resource_data,previous_status from public.resource_items r where r.id=target_resource;
  if resource_data is null then raise exception 'Resource not found.'; end if;
  insert into public.deleted_items(entity_type,entity_id,title,source_module,deleted_by,payload,restore_payload)
  values('resource_item',target_resource::text,coalesce(resource_data->>'title',resource_data->>'file_name','Tài liệu'),'resource-library',auth.uid(),resource_data,jsonb_build_object('resource_id',target_resource,'previous_status',previous_status))
  returning id into deleted_id;
  update public.resource_items set deleted_at=now(),deleted_by=auth.uid(),status='archived' where id=target_resource;
  insert into public.audit_events(actor_id,actor_email,actor_role,action,entity_type,entity_id,source_module,before_data,after_data)
  values(auth.uid(),coalesce(auth.jwt()->>'email',''),coalesce(auth.jwt()->'app_metadata'->>'role',auth.jwt()->'user_metadata'->>'role',''),'governance.soft_delete','resource_item',target_resource::text,'resource-library',resource_data,jsonb_build_object('deleted_item_id',deleted_id));
  return deleted_id;
end; $$;

create or replace function public.bes_v1098_purge_expired_deleted_items()
returns integer language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare affected integer;
begin
  update public.deleted_items set status='purged',permanently_deleted_at=now(),updated_at=now()
  where status='deleted' and expires_at<=now();
  get diagnostics affected=row_count;
  return affected;
end; $$;

alter table public.collaboration_spaces enable row level security;
alter table public.collaboration_members enable row level security;
alter table public.collaboration_threads enable row level security;
alter table public.collaboration_comments enable row level security;
alter table public.content_versions enable row level security;
alter table public.permission_overrides enable row level security;
alter table public.audit_events enable row level security;
alter table public.backup_snapshots enable row level security;
alter table public.backup_items enable row level security;
alter table public.deleted_items enable row level security;

do $$ declare p record; t text; begin
  foreach t in array array['collaboration_spaces','collaboration_members','collaboration_threads','collaboration_comments','content_versions','permission_overrides','audit_events','backup_snapshots','backup_items','deleted_items'] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t and policyname like '%_v1098' loop execute format('drop policy if exists %I on public.%I',p.policyname,t); end loop;
  end loop;
end $$;

create policy collaboration_spaces_read_v1098 on public.collaboration_spaces for select to authenticated using(public.bes_v1098_is_space_member(id,auth.uid()));
create policy collaboration_spaces_insert_v1098 on public.collaboration_spaces for insert to authenticated with check(owner_id=auth.uid());
create policy collaboration_spaces_update_v1098 on public.collaboration_spaces for update to authenticated using(public.bes_v1098_can_manage_space(id,auth.uid())) with check(public.bes_v1098_can_manage_space(id,auth.uid()));
create policy collaboration_spaces_delete_v1098 on public.collaboration_spaces for delete to authenticated using(owner_id=auth.uid() or public.bes_v1098_is_leader(auth.uid()));

create policy collaboration_members_read_v1098 on public.collaboration_members for select to authenticated using(public.bes_v1098_is_space_member(space_id,auth.uid()));
create policy collaboration_members_insert_v1098 on public.collaboration_members for insert to authenticated with check(public.bes_v1098_can_manage_space(space_id,auth.uid()) or (user_id=auth.uid() and member_role='owner'));
create policy collaboration_members_update_v1098 on public.collaboration_members for update to authenticated using(public.bes_v1098_can_manage_space(space_id,auth.uid())) with check(public.bes_v1098_can_manage_space(space_id,auth.uid()));
create policy collaboration_members_delete_v1098 on public.collaboration_members for delete to authenticated using(public.bes_v1098_can_manage_space(space_id,auth.uid()) or user_id=auth.uid());

create policy collaboration_threads_read_v1098 on public.collaboration_threads for select to authenticated using(public.bes_v1098_is_space_member(space_id,auth.uid()));
create policy collaboration_threads_insert_v1098 on public.collaboration_threads for insert to authenticated with check(created_by=auth.uid() and public.bes_v1098_is_space_member(space_id,auth.uid()));
create policy collaboration_threads_update_v1098 on public.collaboration_threads for update to authenticated using(created_by=auth.uid() or public.bes_v1098_can_manage_space(space_id,auth.uid())) with check(public.bes_v1098_is_space_member(space_id,auth.uid()));
create policy collaboration_threads_delete_v1098 on public.collaboration_threads for delete to authenticated using(created_by=auth.uid() or public.bes_v1098_can_manage_space(space_id,auth.uid()));

create policy collaboration_comments_read_v1098 on public.collaboration_comments for select to authenticated using(public.bes_v1098_is_space_member(space_id,auth.uid()));
create policy collaboration_comments_insert_v1098 on public.collaboration_comments for insert to authenticated with check(author_id=auth.uid() and public.bes_v1098_is_space_member(space_id,auth.uid()));
create policy collaboration_comments_update_v1098 on public.collaboration_comments for update to authenticated using(author_id=auth.uid() or public.bes_v1098_can_manage_space(space_id,auth.uid())) with check(public.bes_v1098_is_space_member(space_id,auth.uid()));
create policy collaboration_comments_delete_v1098 on public.collaboration_comments for delete to authenticated using(author_id=auth.uid() or public.bes_v1098_can_manage_space(space_id,auth.uid()));

create policy content_versions_read_v1098 on public.content_versions for select to authenticated using(space_id is null and created_by=auth.uid() or space_id is not null and public.bes_v1098_is_space_member(space_id,auth.uid()) or public.bes_v1098_is_leader(auth.uid()));
create policy content_versions_insert_v1098 on public.content_versions for insert to authenticated with check(created_by=auth.uid() and (space_id is null or public.bes_v1098_is_space_member(space_id,auth.uid())));
create policy content_versions_update_v1098 on public.content_versions for update to authenticated using(created_by=auth.uid() or (space_id is not null and public.bes_v1098_can_manage_space(space_id,auth.uid()))) with check(created_by=auth.uid() or public.bes_v1098_is_leader(auth.uid()));

create policy permission_overrides_read_v1098 on public.permission_overrides for select to authenticated using(principal_id=auth.uid()::text or granted_by=auth.uid() or public.bes_v1098_is_leader(auth.uid()));
create policy permission_overrides_all_v1098 on public.permission_overrides for all to authenticated using(public.bes_v1098_is_leader(auth.uid())) with check(public.bes_v1098_is_leader(auth.uid()));

create policy audit_events_read_v1098 on public.audit_events for select to authenticated using(actor_id=auth.uid() or public.bes_v1098_is_leader(auth.uid()));
create policy audit_events_insert_v1098 on public.audit_events for insert to authenticated with check(actor_id=auth.uid());

create policy backup_snapshots_read_v1098 on public.backup_snapshots for select to authenticated using(owner_id=auth.uid() or public.bes_v1098_is_leader(auth.uid()));
create policy backup_snapshots_insert_v1098 on public.backup_snapshots for insert to authenticated with check(owner_id=auth.uid() and created_by=auth.uid());
create policy backup_snapshots_update_v1098 on public.backup_snapshots for update to authenticated using(owner_id=auth.uid() or public.bes_v1098_is_leader(auth.uid())) with check(owner_id=auth.uid() or public.bes_v1098_is_leader(auth.uid()));
create policy backup_snapshots_delete_v1098 on public.backup_snapshots for delete to authenticated using(owner_id=auth.uid() or public.bes_v1098_is_leader(auth.uid()));
create policy backup_items_read_v1098 on public.backup_items for select to authenticated using(exists(select 1 from public.backup_snapshots s where s.id=snapshot_id and (s.owner_id=auth.uid() or public.bes_v1098_is_leader(auth.uid()))));
create policy backup_items_insert_v1098 on public.backup_items for insert to authenticated with check(exists(select 1 from public.backup_snapshots s where s.id=snapshot_id and s.owner_id=auth.uid()));

create policy deleted_items_read_v1098 on public.deleted_items for select to authenticated using(deleted_by=auth.uid() or public.bes_v1098_is_leader(auth.uid()));
create policy deleted_items_insert_v1098 on public.deleted_items for insert to authenticated with check(deleted_by=auth.uid());
create policy deleted_items_update_v1098 on public.deleted_items for update to authenticated using(deleted_by=auth.uid() or public.bes_v1098_is_leader(auth.uid())) with check(deleted_by=auth.uid() or public.bes_v1098_is_leader(auth.uid()));

revoke all on public.collaboration_spaces,public.collaboration_members,public.collaboration_threads,public.collaboration_comments,public.content_versions,public.permission_overrides,public.audit_events,public.backup_snapshots,public.backup_items,public.deleted_items from anon;
grant select,insert,update,delete on public.collaboration_spaces,public.collaboration_members,public.collaboration_threads,public.collaboration_comments to authenticated;
grant select,insert,update on public.content_versions to authenticated;
grant select,insert,update,delete on public.permission_overrides to authenticated;
grant select,insert on public.audit_events to authenticated;
grant select,insert,update,delete on public.backup_snapshots to authenticated;
grant select,insert on public.backup_items to authenticated;
grant select,insert,update on public.deleted_items to authenticated;
grant execute on function public.bes_v1098_soft_delete_resource(uuid),public.bes_v1098_purge_expired_deleted_items() to authenticated;

do $$ declare t text; begin
  foreach t in array array['collaboration_spaces','collaboration_members','collaboration_threads','collaboration_comments','content_versions','permission_overrides','audit_events','backup_snapshots','deleted_items'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
exception when undefined_object then raise notice 'supabase_realtime is unavailable.'; end $$;

insert into public.bes_schema_registry(component,version,installed_at) values
('application','10.98.0',now()),('runtime_core','1.5.0',now()),('collaboration_hub','10.98.0',now()),('data_governance','10.98.0',now())
on conflict(component) do update set version=excluded.version,installed_at=excluded.installed_at;

commit;
select 'collaboration_spaces' object,count(*) rows from public.collaboration_spaces
union all select 'collaboration_members',count(*) from public.collaboration_members
union all select 'collaboration_threads',count(*) from public.collaboration_threads
union all select 'collaboration_comments',count(*) from public.collaboration_comments
union all select 'content_versions',count(*) from public.content_versions
union all select 'permission_overrides',count(*) from public.permission_overrides
union all select 'audit_events',count(*) from public.audit_events
union all select 'backup_snapshots',count(*) from public.backup_snapshots
union all select 'deleted_items',count(*) from public.deleted_items;
