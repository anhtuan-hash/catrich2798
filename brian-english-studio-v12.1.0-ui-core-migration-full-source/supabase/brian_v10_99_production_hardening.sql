-- Brian English Studio V10.99.0 — Production Hardening & Core Cleanup
-- Safe to rerun. Existing teaching data is not deleted.
begin;
create extension if not exists pgcrypto;

create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.system_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null check (role in ('admin','department_head','teacher','student')),
  scope text not null default 'system',
  active boolean not null default true,
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, scope)
);
create index if not exists system_roles_user_active_idx on public.system_roles(user_id,active);

create or replace function public.bes_v1099_try_uuid(value text)
returns uuid language plpgsql immutable as $$
begin
  if value is null or value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return null; end if;
  return value::uuid;
exception when others then return null;
end $$;

create or replace function public.bes_v1099_normalize_role(value text)
returns text language sql immutable as $$
select case lower(trim(coalesce(value,'')))
  when 'admin' then 'admin' when 'administrator' then 'admin'
  when 'ttcm' then 'department_head' when 'leader' then 'department_head'
  when 'head' then 'department_head' when 'manager' then 'department_head'
  when 'department_head' then 'department_head' when 'department-head' then 'department_head'
  when 'department_leader' then 'department_head' when 'to_truong' then 'department_head'
  when 'tổ trưởng' then 'department_head'
  when 'student' then 'student' when 'learner' then 'student'
  else 'teacher' end $$;

-- Bootstrap canonical roles from any compatible profiles schema.
do $do$
declare r record; j jsonb; uid uuid; normalized text;
begin
  if to_regclass('public.profiles') is null then return; end if;
  for r in execute 'select to_jsonb(p) as row from public.profiles p' loop
    j := r.row;
    uid := coalesce(public.bes_v1099_try_uuid(j->>'id'), public.bes_v1099_try_uuid(j->>'user_id'), public.bes_v1099_try_uuid(j->>'profile_id'));
    if uid is null then continue; end if;
    normalized := public.bes_v1099_normalize_role(j->>'role');
    insert into public.system_roles(user_id,role,scope,active,metadata)
    values(
      uid,
      normalized,
      'system',
      case lower(trim(coalesce(j->>'approved',j->>'is_approved','true')))
        when 'false' then false when '0' then false when 'no' then false when 'disabled' then false
        else true end,
      jsonb_build_object('migrated_from','profiles')
    )
    on conflict(user_id,scope) do update set role=excluded.role, active=excluded.active;
  end loop;
end $do$;

create or replace function public.bes_v1099_current_role(target_user uuid default auth.uid())
returns text language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare result text; profile_role text;
begin
  if target_user is null then return 'guest'; end if;
  select role into result from public.system_roles where user_id=target_user and active=true order by assigned_at desc limit 1;
  if result is not null then return public.bes_v1099_normalize_role(result); end if;
  if to_regclass('public.profiles') is not null then
    begin
      execute 'select role::text from public.profiles where id=$1 limit 1' into profile_role using target_user;
    exception when undefined_column then
      begin
        execute 'select role::text from public.profiles where user_id=$1 limit 1' into profile_role using target_user;
      exception when undefined_column then
        begin execute 'select role::text from public.profiles where profile_id=$1 limit 1' into profile_role using target_user;
        exception when undefined_column then null; end;
      end;
    end;
  end if;
  return public.bes_v1099_normalize_role(profile_role);
end $$;

create or replace function public.bes_v1099_is_leader(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
select public.bes_v1099_current_role(target_user) in ('admin','department_head') $$;

grant execute on function public.bes_v1099_current_role(uuid) to authenticated;
grant execute on function public.bes_v1099_is_leader(uuid) to authenticated;

alter table public.system_roles enable row level security;
drop policy if exists system_roles_read_v1099 on public.system_roles;
create policy system_roles_read_v1099 on public.system_roles for select to authenticated
using (user_id=auth.uid() or public.bes_v1099_is_leader(auth.uid()));
drop policy if exists system_roles_manage_v1099 on public.system_roles;
create policy system_roles_manage_v1099 on public.system_roles for all to authenticated
using (public.bes_v1099_is_leader(auth.uid())) with check (public.bes_v1099_is_leader(auth.uid()));
grant select on public.system_roles to authenticated;
grant insert,update,delete on public.system_roles to authenticated;

create table if not exists public.api_security_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  endpoint text not null,
  action text not null,
  status text not null,
  request_id text,
  ip_hash text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists api_security_events_actor_idx on public.api_security_events(actor_id,created_at desc);
create index if not exists api_security_events_endpoint_idx on public.api_security_events(endpoint,created_at desc);
alter table public.api_security_events enable row level security;
drop policy if exists api_security_events_read_v1099 on public.api_security_events;
create policy api_security_events_read_v1099 on public.api_security_events for select to authenticated
using (actor_id=auth.uid() or public.bes_v1099_is_leader(auth.uid()));
-- Browser clients cannot insert arbitrary server audit entries. Service role bypasses RLS.
grant select on public.api_security_events to authenticated;

create table if not exists public.api_rate_limits (
  user_id uuid not null,
  feature text not null,
  minute_start timestamptz not null default date_trunc('minute',now()),
  minute_count integer not null default 0,
  day_start date not null default current_date,
  day_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id,feature)
);
alter table public.api_rate_limits enable row level security;
drop policy if exists api_rate_limits_read_v1099 on public.api_rate_limits;
create policy api_rate_limits_read_v1099 on public.api_rate_limits for select to authenticated
using (user_id=auth.uid() or public.bes_v1099_is_leader(auth.uid()));
grant select on public.api_rate_limits to authenticated;

create or replace function public.bes_v1099_consume_ai_quota(
  p_user_id uuid,
  p_feature text,
  p_ip_hash text default '',
  p_per_minute integer default 12,
  p_per_day integer default 160
) returns boolean language plpgsql volatile security definer set search_path=public,auth,pg_temp as $$
declare row_data public.api_rate_limits;
begin
  if p_user_id is null or p_user_id <> auth.uid() then return false; end if;
  insert into public.api_rate_limits(user_id,feature,minute_start,minute_count,day_start,day_count,updated_at)
  values(p_user_id,left(coalesce(p_feature,'ai'),80),date_trunc('minute',now()),1,current_date,1,now())
  on conflict(user_id,feature) do update set
    minute_count=case when api_rate_limits.minute_start < date_trunc('minute',now()) then 1 else api_rate_limits.minute_count+1 end,
    minute_start=case when api_rate_limits.minute_start < date_trunc('minute',now()) then date_trunc('minute',now()) else api_rate_limits.minute_start end,
    day_count=case when api_rate_limits.day_start < current_date then 1 else api_rate_limits.day_count+1 end,
    day_start=case when api_rate_limits.day_start < current_date then current_date else api_rate_limits.day_start end,
    updated_at=now()
  returning * into row_data;
  return row_data.minute_count <= greatest(1,p_per_minute) and row_data.day_count <= greatest(1,p_per_day);
end $$;
grant execute on function public.bes_v1099_consume_ai_quota(uuid,text,text,integer,integer) to authenticated;

-- Upgrade snapshot schema for server-side integrity.
do $do$ begin
  if to_regclass('public.backup_snapshots') is not null then
    alter table public.backup_snapshots add column if not exists checksum text;
    alter table public.backup_snapshots add column if not exists closed_at timestamptz;
    alter table public.backup_snapshots add column if not exists restore_count integer not null default 0;
    alter table public.backup_snapshots add column if not exists last_restored_at timestamptz;
  end if;
end $do$;

create or replace function public.bes_v1099_snapshot_tables(p_scope text)
returns text[] language sql immutable as $$
select case p_scope
  when 'work' then array['work_hub_items','work_hub_comments']
  when 'knowledge' then array['resource_items','resource_smart_metadata','resource_collections','resource_collection_items']
  when 'assessment' then array['assessment_items','assessment_blueprints','assessment_tests','assessment_test_items']
  when 'automation' then array['automation_rules','automation_runs','automation_events','automation_cloud_jobs']
  else array['collaboration_spaces','collaboration_members','collaboration_threads','collaboration_comments','content_versions','permission_overrides'] end $$;

create or replace function public.bes_v1099_create_snapshot(p_label text,p_scope text default 'collaboration',p_retention_days integer default 30)
returns uuid language plpgsql volatile security definer set search_path=public,auth,pg_temp as $$
declare sid uuid; tbl text; rows jsonb; payload jsonb='{}'::jsonb; total integer=0; uid uuid=auth.uid();
begin
  if not public.bes_v1099_is_leader(uid) then raise exception 'leader permission required'; end if;
  if to_regclass('public.backup_snapshots') is null then raise exception 'backup_snapshots is unavailable'; end if;
  insert into public.backup_snapshots(owner_id,label,scope,status,item_count,snapshot_data,created_by,expires_at,metadata)
  values(uid,left(coalesce(nullif(trim(p_label),''),p_scope||' snapshot'),240),p_scope,'building',0,'{}'::jsonb,uid,now()+make_interval(days=>greatest(1,least(365,p_retention_days))),jsonb_build_object('application_version','10.99.0','server_side',true)) returning id into sid;
  foreach tbl in array public.bes_v1099_snapshot_tables(p_scope) loop
    if to_regclass('public.'||tbl) is null then continue; end if;
    execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from (select * from public.%I) t',tbl) into rows;
    payload := payload || jsonb_build_object(tbl,coalesce(rows,'[]'::jsonb));
    total := total + jsonb_array_length(coalesce(rows,'[]'::jsonb));
    if to_regclass('public.backup_items') is not null then
      execute format('insert into public.backup_items(snapshot_id,entity_type,entity_id,payload) select $1,$2,coalesce(value->>''id'',''''),value from jsonb_array_elements($3)') using sid,tbl,coalesce(rows,'[]'::jsonb);
    end if;
  end loop;
  update public.backup_snapshots set status='ready',item_count=total,snapshot_data=payload,checksum=encode(digest(payload::text,'sha256'),'hex'),closed_at=now(),updated_at=now() where id=sid;
  return sid;
exception when others then
  if sid is not null then update public.backup_snapshots set status='failed',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('error',sqlerrm),updated_at=now() where id=sid; end if;
  raise;
end $$;

grant execute on function public.bes_v1099_create_snapshot(text,text,integer) to authenticated;

create or replace function public.bes_v1099_restore_snapshot(p_snapshot uuid,p_dry_run boolean default true)
returns jsonb language plpgsql volatile security definer set search_path=public,auth,pg_temp as $$
declare snap record; tbl text; rows jsonb; cols text; updates text; count_rows integer; result jsonb='[]'::jsonb;
begin
  if not public.bes_v1099_is_leader(auth.uid()) then raise exception 'leader permission required'; end if;
  select * into snap from public.backup_snapshots where id=p_snapshot and status='ready' for update;
  if snap.id is null then raise exception 'snapshot not found or not ready'; end if;
  if coalesce(snap.checksum,'')<>encode(digest(coalesce(snap.snapshot_data,'{}'::jsonb)::text,'sha256'),'hex') then raise exception 'snapshot checksum mismatch'; end if;
  for tbl,rows in select key,value from jsonb_each(snap.snapshot_data) loop
    count_rows:=case when jsonb_typeof(rows)='array' then jsonb_array_length(rows) else 0 end;
    result:=result||jsonb_build_array(jsonb_build_object('table',tbl,'count',count_rows,'dry_run',p_dry_run));
    if p_dry_run or count_rows=0 or not(tbl=any(public.bes_v1099_snapshot_tables(snap.scope))) or to_regclass('public.'||tbl) is null then continue; end if;
    select string_agg(format('%I',column_name),',' order by ordinal_position),
           string_agg(case when column_name='id' then null else format('%1$I=excluded.%1$I',column_name) end,',' order by ordinal_position)
      into cols,updates from information_schema.columns
      where table_schema='public' and table_name=tbl and is_generated='NEVER' and identity_generation is null;
    if cols is null then continue; end if;
    if updates is null or trim(updates)='' then
      execute format('insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I,$1) on conflict (id) do nothing',tbl,cols) using rows;
    else
      execute format('insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I,$1) on conflict (id) do update set %3$s',tbl,cols,updates) using rows;
    end if;
  end loop;
  if not p_dry_run then update public.backup_snapshots set restore_count=coalesce(restore_count,0)+1,last_restored_at=now(),updated_at=now() where id=p_snapshot; end if;
  return jsonb_build_object('snapshot_id',p_snapshot,'dry_run',p_dry_run,'tables',result);
end $$;
grant execute on function public.bes_v1099_restore_snapshot(uuid,boolean) to authenticated;

insert into public.bes_schema_registry(component,version,installed_at,metadata)
values
  ('application','10.99.0',now(),'{"release":"Production Hardening & Core Cleanup"}'::jsonb),
  ('runtime_core','1.6.0',now(),'{"roles":"canonical","legacy_dom_patches":false}'::jsonb),
  ('production_hardening','10.99.0',now(),'{"api_gateway":"authenticated","server_snapshots":true}'::jsonb)
on conflict(component) do update set version=excluded.version,installed_at=excluded.installed_at,metadata=excluded.metadata;
commit;
