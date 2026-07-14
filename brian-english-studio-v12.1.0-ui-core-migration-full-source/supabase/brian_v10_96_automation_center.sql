-- Brian English Studio V10.96.0 Automation Center
-- Event/schedule rules, approval gates, execution audit and operational events.
-- Safe to rerun. No existing teaching, resource, assessment or learner data is deleted.

begin;
create extension if not exists pgcrypto;

create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

insert into public.bes_schema_registry(component, version, metadata)
values
  ('application', '10.96.0', '{"release":"Automation Center & Operational Intelligence"}'::jsonb),
  ('runtime_core', '1.3.0', '{"automation_runner":true,"approval_gates":true}'::jsonb),
  ('automation_center', '10.96.0', '{"rules":true,"runs":true,"events":true,"audit":true}'::jsonb)
on conflict(component) do update
set version=excluded.version, installed_at=now(), metadata=excluded.metadata;

create or replace function public.bes_v1096_try_uuid(value text)
returns uuid language plpgsql immutable security invoker set search_path=public,pg_temp as $$
begin
  if value is not null and value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return value::uuid; end if;
  return null;
end; $$;

create or replace function public.bes_v1096_profile_uuid(profile_json jsonb)
returns uuid language sql immutable security invoker set search_path=public,pg_temp as $$
  select coalesce(
    public.bes_v1096_try_uuid(profile_json->>'id'),
    public.bes_v1096_try_uuid(profile_json->>'user_id'),
    public.bes_v1096_try_uuid(profile_json->>'profile_id')
  );
$$;

create or replace function public.bes_v1096_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare
  jwt jsonb:=coalesce(auth.jwt(),'{}'::jsonb);
  jwt_role text:=lower(coalesce(jwt->'app_metadata'->>'role',jwt->'user_metadata'->>'role',jwt->>'role',''));
  jwt_email text:=lower(coalesce(jwt->>'email',''));
  matched boolean:=false;
begin
  if target_user is null then return false; end if;
  if target_user=auth.uid() and (jwt_role in ('admin','ttcm','leader','department_head','department-head','head') or jwt_email='anhtuan@pek.edu.vn') then return true; end if;
  if to_regclass('public.profiles') is null then return false; end if;
  select exists(
    select 1 from public.profiles p
    cross join lateral (select to_jsonb(p) j) x
    where public.bes_v1096_profile_uuid(x.j)=target_user
      and (
        lower(coalesce(x.j->>'role','')) in ('admin','ttcm','leader','department_head','department-head','head')
        or lower(coalesce(x.j->>'email',''))='anhtuan@pek.edu.vn'
        or lower(coalesce(x.j->>'position','')) similar to '%(ttcm|tổ trưởng|to truong|department head|department leader)%'
      )
  ) into matched;
  return coalesce(matched,false);
exception when others then return false;
end; $$;

create or replace function public.bes_v1096_set_updated_at()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin new.updated_at=now(); return new; end; $$;

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  description text not null default '',
  enabled boolean not null default true,
  scope text not null default 'personal',
  trigger_type text not null default 'manual',
  trigger_config jsonb not null default '{}'::jsonb,
  action_type text not null default 'notification',
  action_config jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer not null default 0,
  success_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_rules_name_check check(length(btrim(name))>0),
  constraint automation_rules_scope_check check(scope in('personal','department')),
  constraint automation_rules_trigger_check check(trigger_type in('manual','schedule','event')),
  constraint automation_rules_action_check check(action_type in('notification','work_draft','practice_draft','open_route','snapshot')),
  constraint automation_rules_trigger_object check(jsonb_typeof(trigger_config)='object'),
  constraint automation_rules_action_object check(jsonb_typeof(action_config)='object'),
  constraint automation_rules_counts_check check(run_count>=0 and success_count>=0 and success_count<=run_count)
);
create index if not exists automation_rules_owner_idx on public.automation_rules(owner_id,enabled,updated_at desc);
create index if not exists automation_rules_trigger_idx on public.automation_rules(trigger_type,enabled,next_run_at);
drop trigger if exists automation_rules_updated_trg on public.automation_rules;
create trigger automation_rules_updated_trg before update on public.automation_rules for each row execute function public.bes_v1096_set_updated_at();

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.automation_rules(id) on delete set null,
  owner_id uuid not null default auth.uid(),
  rule_name text not null default 'Automation',
  status text not null default 'running',
  trigger_type text not null default 'manual',
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  approval_required boolean not null default false,
  approved_at timestamptz,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint automation_runs_status_check check(status in('pending_approval','approved','running','success','failed','skipped')),
  constraint automation_runs_trigger_check check(trigger_type in('manual','schedule','event')),
  constraint automation_runs_input_object check(jsonb_typeof(input_json)='object'),
  constraint automation_runs_output_object check(jsonb_typeof(output_json)='object')
);
create index if not exists automation_runs_owner_idx on public.automation_runs(owner_id,created_at desc);
create index if not exists automation_runs_rule_idx on public.automation_runs(rule_id,created_at desc);
create index if not exists automation_runs_pending_idx on public.automation_runs(status,created_at) where status='pending_approval';

create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  event_type text not null,
  source text not null default 'application',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint automation_events_type_check check(length(btrim(event_type))>0),
  constraint automation_events_payload_object check(jsonb_typeof(payload)='object')
);
create index if not exists automation_events_owner_idx on public.automation_events(owner_id,created_at desc);
create index if not exists automation_events_type_idx on public.automation_events(event_type,created_at desc);

alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_events enable row level security;

do $$ declare p record; t text; begin
  foreach t in array array['automation_rules','automation_runs','automation_events'] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t and policyname like '%_v1096' loop
      execute format('drop policy if exists %I on public.%I',p.policyname,t);
    end loop;
  end loop;
end $$;

create policy automation_rules_read_v1096 on public.automation_rules for select to authenticated
using(owner_id=auth.uid() or scope='department' or public.bes_v1096_is_leader(auth.uid()));
create policy automation_rules_insert_v1096 on public.automation_rules for insert to authenticated
with check(owner_id=auth.uid() and (scope='personal' or public.bes_v1096_is_leader(auth.uid())));
create policy automation_rules_update_v1096 on public.automation_rules for update to authenticated
using(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()))
with check((owner_id=auth.uid() and scope='personal') or public.bes_v1096_is_leader(auth.uid()));
create policy automation_rules_delete_v1096 on public.automation_rules for delete to authenticated
using(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()));

create policy automation_runs_read_v1096 on public.automation_runs for select to authenticated
using(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()));
create policy automation_runs_insert_v1096 on public.automation_runs for insert to authenticated
with check(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()));
create policy automation_runs_update_v1096 on public.automation_runs for update to authenticated
using(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()))
with check(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()));
create policy automation_runs_delete_v1096 on public.automation_runs for delete to authenticated
using(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()));

create policy automation_events_read_v1096 on public.automation_events for select to authenticated
using(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()));
create policy automation_events_insert_v1096 on public.automation_events for insert to authenticated
with check(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()));
create policy automation_events_delete_v1096 on public.automation_events for delete to authenticated
using(owner_id=auth.uid() or public.bes_v1096_is_leader(auth.uid()));

revoke all on public.automation_rules,public.automation_runs,public.automation_events from anon;
grant select,insert,update,delete on public.automation_rules,public.automation_runs,public.automation_events to authenticated;
grant execute on function public.bes_v1096_try_uuid(text),public.bes_v1096_is_leader(uuid) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['automation_rules','automation_runs','automation_events'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
exception when undefined_object then
  raise notice 'supabase_realtime publication is unavailable; local refresh remains active.';
end $$;

commit;

select 'automation_rules' object,count(*) rows from public.automation_rules
union all select 'automation_runs',count(*) from public.automation_runs
union all select 'automation_events',count(*) from public.automation_events;
