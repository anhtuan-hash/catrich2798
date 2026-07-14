-- Brian English Studio V11.1.0 — Classroom Delivery
-- Safe to rerun. Existing Lesson Pack and classroom data are preserved.
begin;
create extension if not exists pgcrypto;

create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.bes_v1110_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare result_value boolean;
begin
  if target_user is null then return false; end if;
  if to_regprocedure('public.bes_v1100_is_leader(uuid)') is not null then
    execute 'select public.bes_v1100_is_leader($1)' into result_value using target_user;
    return coalesce(result_value,false);
  end if;
  if to_regclass('public.system_roles') is not null then
    return exists(select 1 from public.system_roles where user_id=target_user and active=true and role in ('admin','department_head'));
  end if;
  return false;
exception when others then return false;
end $$;
grant execute on function public.bes_v1110_is_leader(uuid) to authenticated;

create table if not exists public.classroom_sessions (
  id text primary key,
  host_id uuid not null default auth.uid(),
  lesson_pack_id text,
  title text not null default 'Classroom Session',
  join_code text not null unique,
  status text not null default 'draft' check(status in ('draft','open','live','paused','ended')),
  current_item_index integer not null default 0 check(current_item_index>=0),
  current_item_started_at timestamptz,
  current_item_duration_seconds integer not null default 0 check(current_item_duration_seconds>=0 and current_item_duration_seconds<=86400),
  pack_snapshot jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists classroom_sessions_join_code_upper_idx on public.classroom_sessions(upper(join_code));
create index if not exists classroom_sessions_host_updated_idx on public.classroom_sessions(host_id,updated_at desc);

create table if not exists public.classroom_teams (
  id text primary key,
  session_id text not null references public.classroom_sessions(id) on delete cascade,
  host_id uuid not null,
  name text not null default 'Team',
  score numeric not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists classroom_teams_session_position_idx on public.classroom_teams(session_id,position);

create table if not exists public.classroom_participants (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.classroom_sessions(id) on delete cascade,
  participant_token uuid not null default gen_random_uuid() unique,
  display_name text not null,
  team_id text references public.classroom_teams(id) on delete set null,
  status text not null default 'online' check(status in ('online','away','left')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists classroom_participants_session_idx on public.classroom_participants(session_id,joined_at);
create index if not exists classroom_participants_team_idx on public.classroom_participants(team_id);

create table if not exists public.classroom_responses (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.classroom_sessions(id) on delete cascade,
  participant_id uuid not null references public.classroom_participants(id) on delete cascade,
  item_id text not null,
  response jsonb not null default '{}'::jsonb,
  score numeric not null default 0,
  is_correct boolean,
  elapsed_ms integer not null default 0 check(elapsed_ms>=0),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(session_id,participant_id,item_id)
);
create index if not exists classroom_responses_session_item_idx on public.classroom_responses(session_id,item_id,submitted_at desc);

alter table public.classroom_sessions enable row level security;
alter table public.classroom_teams enable row level security;
alter table public.classroom_participants enable row level security;
alter table public.classroom_responses enable row level security;

do $$ declare p record; begin
  for p in select policyname,tablename from pg_policies where schemaname='public' and tablename in ('classroom_sessions','classroom_teams','classroom_participants','classroom_responses')
  loop execute format('drop policy if exists %I on public.%I',p.policyname,p.tablename); end loop;
end $$;

create policy classroom_sessions_host_all_v1110 on public.classroom_sessions for all to authenticated
using(host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()))
with check(host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()));
create policy classroom_teams_host_all_v1110 on public.classroom_teams for all to authenticated
using(host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()))
with check(host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()));
create policy classroom_participants_host_read_v1110 on public.classroom_participants for select to authenticated
using(exists(select 1 from public.classroom_sessions s where s.id=session_id and (s.host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()))));
create policy classroom_participants_host_update_v1110 on public.classroom_participants for update to authenticated
using(exists(select 1 from public.classroom_sessions s where s.id=session_id and (s.host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()))))
with check(exists(select 1 from public.classroom_sessions s where s.id=session_id and (s.host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()))));
create policy classroom_responses_host_read_v1110 on public.classroom_responses for select to authenticated
using(exists(select 1 from public.classroom_sessions s where s.id=session_id and (s.host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()))));
create policy classroom_responses_host_update_v1110 on public.classroom_responses for update to authenticated
using(exists(select 1 from public.classroom_sessions s where s.id=session_id and (s.host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()))))
with check(exists(select 1 from public.classroom_sessions s where s.id=session_id and (s.host_id=auth.uid() or public.bes_v1110_is_leader(auth.uid()))));

grant select,insert,update,delete on public.classroom_sessions to authenticated;
grant select,insert,update,delete on public.classroom_teams to authenticated;
grant select,update on public.classroom_participants to authenticated;
grant select,update on public.classroom_responses to authenticated;

create or replace function public.classroom_get_public_state(p_join_code text,p_participant_token uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare
  s public.classroom_sessions%rowtype;
  p public.classroom_participants%rowtype;
  item jsonb;
  item_override jsonb;
  item_count integer;
  response_row jsonb;
  teams_json jsonb;
begin
  select * into s from public.classroom_sessions where upper(join_code)=upper(trim(p_join_code)) limit 1;
  if s.id is null then raise exception 'Classroom session not found'; end if;
  select * into p from public.classroom_participants where session_id=s.id and participant_token=p_participant_token limit 1;
  if p.id is null then raise exception 'Participant session is invalid'; end if;
  item_count:=coalesce(jsonb_array_length(coalesce(s.pack_snapshot->'items','[]'::jsonb)),0);
  if item_count>0 and s.current_item_index<item_count then item:=s.pack_snapshot->'items'->s.current_item_index; else item:=null; end if;
  if item is not null then item_override:=coalesce(s.settings->'itemOverrides'->(item->>'id'),'{}'::jsonb); end if;
  select to_jsonb(r) into response_row from public.classroom_responses r where r.session_id=s.id and r.participant_id=p.id and r.item_id=coalesce(item->>'id','') limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'score',t.score,'position',t.position) order by t.position),'[]'::jsonb) into teams_json from public.classroom_teams t where t.session_id=s.id;
  return jsonb_build_object(
    'session',jsonb_build_object('id',s.id,'title',s.title,'status',s.status,'joinCode',s.join_code,'currentItemIndex',s.current_item_index,'currentItemStartedAt',s.current_item_started_at,'currentItemDurationSeconds',s.current_item_duration_seconds,'settings',s.settings),
    'participant',jsonb_build_object('id',p.id,'displayName',p.display_name,'teamId',p.team_id,'status',p.status),
    'teams',teams_json,
    'currentItem',case when item is null then null else item||jsonb_build_object('override',item_override) end,
    'currentResponse',response_row,
    'itemIndex',s.current_item_index,
    'itemCount',item_count,
    'serverTime',now()
  );
end $$;

create or replace function public.classroom_join_session(p_join_code text,p_display_name text)
returns jsonb language plpgsql volatile security definer set search_path=public,auth,pg_temp as $$
declare
  s public.classroom_sessions%rowtype;
  participant_row public.classroom_participants%rowtype;
  selected_team text;
  clean_name text:=left(trim(coalesce(p_display_name,'')),80);
begin
  if length(clean_name)<2 then raise exception 'Display name is required'; end if;
  select * into s from public.classroom_sessions where upper(join_code)=upper(trim(p_join_code)) limit 1 for update;
  if s.id is null then raise exception 'Classroom session not found'; end if;
  if s.status not in ('open','live','paused') then raise exception 'Classroom is not open'; end if;
  if s.status in ('live','paused') and coalesce((s.settings->>'allowLateJoin')::boolean,true)=false then raise exception 'Late join is disabled'; end if;
  select t.id into selected_team from public.classroom_teams t left join public.classroom_participants p on p.team_id=t.id and p.session_id=s.id where t.session_id=s.id group by t.id,t.position order by count(p.id),t.position limit 1;
  insert into public.classroom_participants(session_id,display_name,team_id) values(s.id,clean_name,selected_team) returning * into participant_row;
  return jsonb_build_object('participantToken',participant_row.participant_token,'state',public.classroom_get_public_state(s.join_code,participant_row.participant_token));
end $$;

create or replace function public.classroom_submit_response(p_join_code text,p_participant_token uuid,p_item_id text,p_response jsonb,p_elapsed_ms integer default 0)
returns jsonb language plpgsql volatile security definer set search_path=public,auth,pg_temp as $$
declare s public.classroom_sessions%rowtype; p public.classroom_participants%rowtype; r public.classroom_responses%rowtype;
begin
  select * into s from public.classroom_sessions where upper(join_code)=upper(trim(p_join_code)) limit 1;
  if s.id is null or s.status<>'live' then raise exception 'Classroom is not accepting responses'; end if;
  select * into p from public.classroom_participants where session_id=s.id and participant_token=p_participant_token limit 1;
  if p.id is null then raise exception 'Participant session is invalid'; end if;
  insert into public.classroom_responses(session_id,participant_id,item_id,response,elapsed_ms,submitted_at,updated_at)
  values(s.id,p.id,left(coalesce(p_item_id,''),160),coalesce(p_response,'{}'::jsonb),greatest(0,coalesce(p_elapsed_ms,0)),now(),now())
  on conflict(session_id,participant_id,item_id) do update set response=excluded.response,elapsed_ms=excluded.elapsed_ms,submitted_at=now(),updated_at=now()
  returning * into r;
  return to_jsonb(r);
end $$;

create or replace function public.classroom_ping_participant(p_join_code text,p_participant_token uuid)
returns boolean language plpgsql volatile security definer set search_path=public,auth,pg_temp as $$
declare updated_count integer;
begin
  update public.classroom_participants p set last_seen_at=now(),status='online',updated_at=now()
  from public.classroom_sessions s where p.session_id=s.id and upper(s.join_code)=upper(trim(p_join_code)) and p.participant_token=p_participant_token;
  get diagnostics updated_count=row_count;
  return updated_count>0;
end $$;

grant execute on function public.classroom_get_public_state(text,uuid) to anon,authenticated;
grant execute on function public.classroom_join_session(text,text) to anon,authenticated;
grant execute on function public.classroom_submit_response(text,uuid,text,jsonb,integer) to anon,authenticated;
grant execute on function public.classroom_ping_participant(text,uuid) to anon,authenticated;

do $do$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    begin alter publication supabase_realtime add table public.classroom_sessions; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.classroom_teams; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.classroom_participants; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.classroom_responses; exception when duplicate_object then null; end;
  end if;
end $do$;

insert into public.bes_schema_registry(component,version,installed_at,metadata)
values
  ('application','11.1.0',now(),'{"release":"Classroom Delivery"}'::jsonb),
  ('runtime_core','2.1.0',now(),'{"classroom_delivery":true,"public_join_rpc":true}'::jsonb),
  ('connected_teaching_suite','11.1.0',now(),'{"lesson_pack":true,"classroom_delivery":true}'::jsonb),
  ('classroom_delivery','11.1.0',now(),'{"join_code":true,"teams":true,"responses":true,"offline_package":true}'::jsonb)
on conflict(component) do update set version=excluded.version,installed_at=excluded.installed_at,metadata=excluded.metadata;
commit;
