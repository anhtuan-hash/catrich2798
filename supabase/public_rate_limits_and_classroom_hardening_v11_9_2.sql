-- Brian public surface hardening v11.9.2 · Rate limits + Classroom

create table if not exists public.app_public_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  last_seen_at timestamptz not null default now(),
  primary key(scope,key_hash)
);

create index if not exists app_public_rate_limits_last_seen_idx
  on public.app_public_rate_limits(last_seen_at);

alter table public.app_public_rate_limits enable row level security;

revoke all on table public.app_public_rate_limits from public;
revoke all on table public.app_public_rate_limits from anon;
revoke all on table public.app_public_rate_limits from authenticated;
grant all on table public.app_public_rate_limits to service_role;

drop policy if exists app_public_rate_limits_deny_direct_v1192 on public.app_public_rate_limits;
create policy app_public_rate_limits_deny_direct_v1192
on public.app_public_rate_limits
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.app_public_rate_limit_allow(
  p_scope text,
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  v_scope text := left(lower(trim(coalesce(p_scope,''))),120);
  v_hash text := encode(extensions.digest(coalesce(p_key,''),'sha256'),'hex');
  v_limit integer := greatest(1,least(coalesce(p_limit,1),100000));
  v_window integer := greatest(1,least(coalesce(p_window_seconds,60),86400));
  v_count integer;
begin
  if v_scope='' then return false; end if;

  insert into public.app_public_rate_limits(scope,key_hash,window_started,request_count,last_seen_at)
  values(v_scope,v_hash,now(),1,now())
  on conflict(scope,key_hash) do update set
    request_count = case
      when public.app_public_rate_limits.window_started <= now()-(v_window*interval '1 second') then 1
      else public.app_public_rate_limits.request_count+1
    end,
    window_started = case
      when public.app_public_rate_limits.window_started <= now()-(v_window*interval '1 second') then now()
      else public.app_public_rate_limits.window_started
    end,
    last_seen_at=now()
  returning request_count into v_count;

  return v_count<=v_limit;
end;
$function$;

revoke execute on function public.app_public_rate_limit_allow(text,text,integer,integer) from public;
revoke execute on function public.app_public_rate_limit_allow(text,text,integer,integer) from anon;
revoke execute on function public.app_public_rate_limit_allow(text,text,integer,integer) from authenticated;
grant execute on function public.app_public_rate_limit_allow(text,text,integer,integer) to service_role;

create or replace function public.classroom_join_session(p_join_code text,p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $function$
declare
  s public.classroom_sessions%rowtype;
  participant_row public.classroom_participants%rowtype;
  selected_team text;
  clean_code text := upper(regexp_replace(coalesce(p_join_code,''),'[^A-Za-z0-9]','','g'));
  clean_name text := left(trim(regexp_replace(coalesce(p_display_name,''),'[[:cntrl:]]','','g')),80);
  rate_key text;
begin
  if length(clean_code) not between 4 and 16 then raise exception 'Classroom session not found'; end if;
  if length(clean_name)<2 then raise exception 'Display name is required'; end if;

  rate_key := clean_code||':'||coalesce(inet_client_addr()::text,'unknown');
  if not public.app_public_rate_limit_allow('classroom_join',rate_key,180,60) then
    raise exception 'Too many join attempts. Please wait a moment.' using errcode='P0001';
  end if;

  select * into s from public.classroom_sessions
  where upper(join_code)=clean_code limit 1 for update;

  if s.id is null then raise exception 'Classroom session not found'; end if;
  if s.status not in ('open','live','paused') then raise exception 'Classroom is not open'; end if;
  if s.status in ('live','paused') and coalesce((s.settings->>'allowLateJoin')::boolean,true)=false then
    raise exception 'Late join is disabled';
  end if;
  if (select count(*) from public.classroom_participants p where p.session_id=s.id)>=500 then
    raise exception 'Classroom is full';
  end if;

  select t.id into selected_team
  from public.classroom_teams t
  left join public.classroom_participants p on p.team_id=t.id and p.session_id=s.id
  where t.session_id=s.id
  group by t.id,t.position
  order by count(p.id),t.position
  limit 1;

  insert into public.classroom_participants(session_id,display_name,team_id)
  values(s.id,clean_name,selected_team)
  returning * into participant_row;

  return jsonb_build_object(
    'participantToken',participant_row.participant_token,
    'state',public.classroom_get_public_state(s.join_code,participant_row.participant_token)
  );
end;
$function$;

create or replace function public.classroom_get_public_state(p_join_code text,p_participant_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $function$
declare
  s public.classroom_sessions%rowtype;
  p public.classroom_participants%rowtype;
  item jsonb;
  item_override jsonb;
  item_count integer;
  response_row jsonb;
  teams_json jsonb;
  clean_code text := upper(regexp_replace(coalesce(p_join_code,''),'[^A-Za-z0-9]','','g'));
begin
  if p_participant_token is null
     or length(clean_code) not between 4 and 16
     or not public.app_public_rate_limit_allow('classroom_state',clean_code||':'||p_participant_token::text,360,60)
  then
    raise exception 'Participant session is invalid';
  end if;

  select * into s from public.classroom_sessions where upper(join_code)=clean_code limit 1;
  if s.id is null then raise exception 'Classroom session not found'; end if;

  select * into p from public.classroom_participants
  where session_id=s.id and participant_token=p_participant_token limit 1;
  if p.id is null then raise exception 'Participant session is invalid'; end if;

  item_count:=coalesce(jsonb_array_length(coalesce(s.pack_snapshot->'items','[]'::jsonb)),0);
  if item_count>0 and s.current_item_index>=0 and s.current_item_index<item_count then
    item:=s.pack_snapshot->'items'->s.current_item_index;
  else item:=null; end if;

  if item is not null then
    item:=item-'answer'-'correctAnswer'-'correct_answer'-'expectedAnswer'-'expected_answer'
      -'explanation'-'solution'-'teacherNotes'-'teacher_notes';
    item_override:=coalesce(s.settings->'itemOverrides'->(item->>'id'),'{}'::jsonb)
      -'answer'-'correctAnswer'-'correct_answer'-'expectedAnswer'-'expected_answer'
      -'explanation'-'solution'-'teacherNotes'-'teacher_notes';
  end if;

  select to_jsonb(r) into response_row
  from public.classroom_responses r
  where r.session_id=s.id and r.participant_id=p.id and r.item_id=coalesce(item->>'id','')
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.id,'name',t.name,'score',t.score,'position',t.position
  ) order by t.position),'[]'::jsonb)
  into teams_json
  from public.classroom_teams t
  where t.session_id=s.id;

  return jsonb_build_object(
    'session',jsonb_build_object(
      'id',s.id,'title',s.title,'status',s.status,'joinCode',s.join_code,
      'currentItemIndex',s.current_item_index,'currentItemStartedAt',s.current_item_started_at,
      'currentItemDurationSeconds',s.current_item_duration_seconds,
      'settings',coalesce(s.settings,'{}'::jsonb)-'itemOverrides'-'answerKey'-'answers'-'solutions'-'teacherNotes'-'teacher_notes'
    ),
    'participant',jsonb_build_object('id',p.id,'displayName',p.display_name,'teamId',p.team_id,'status',p.status),
    'teams',teams_json,
    'currentItem',case when item is null then null else item||jsonb_build_object('override',coalesce(item_override,'{}'::jsonb)) end,
    'currentResponse',response_row,
    'itemIndex',s.current_item_index,
    'itemCount',item_count,
    'serverTime',now()
  );
end;
$function$;

create or replace function public.classroom_ping_participant(p_join_code text,p_participant_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $function$
declare
  updated_count integer;
  clean_code text := upper(regexp_replace(coalesce(p_join_code,''),'[^A-Za-z0-9]','','g'));
begin
  if p_participant_token is null
     or length(clean_code) not between 4 and 16
     or not public.app_public_rate_limit_allow('classroom_ping',clean_code||':'||p_participant_token::text,180,60)
  then return false; end if;

  update public.classroom_participants p
  set last_seen_at=now(),status='online',updated_at=now()
  from public.classroom_sessions s
  where p.session_id=s.id and upper(s.join_code)=clean_code and p.participant_token=p_participant_token;

  get diagnostics updated_count=row_count;
  return updated_count>0;
end;
$function$;

create or replace function public.classroom_submit_response(
  p_join_code text,p_participant_token uuid,p_item_id text,p_response jsonb,p_elapsed_ms integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $function$
declare
  s public.classroom_sessions%rowtype;
  p public.classroom_participants%rowtype;
  r public.classroom_responses%rowtype;
  current_item jsonb;
  current_item_id text;
  clean_code text := upper(regexp_replace(coalesce(p_join_code,''),'[^A-Za-z0-9]','','g'));
begin
  if p_participant_token is null or length(clean_code) not between 4 and 16 then
    raise exception 'Participant session is invalid';
  end if;
  if not public.app_public_rate_limit_allow('classroom_submit',clean_code||':'||p_participant_token::text,120,60) then
    raise exception 'Too many responses. Please wait a moment.';
  end if;
  if p_response is not null and pg_column_size(p_response)>65536 then
    raise exception 'Response payload is too large';
  end if;

  select * into s from public.classroom_sessions where upper(join_code)=clean_code limit 1;
  if s.id is null or s.status<>'live' then raise exception 'Classroom is not accepting responses'; end if;

  select * into p from public.classroom_participants
  where session_id=s.id and participant_token=p_participant_token limit 1;
  if p.id is null then raise exception 'Participant session is invalid'; end if;

  if s.current_item_index<0
     or s.current_item_index>=coalesce(jsonb_array_length(coalesce(s.pack_snapshot->'items','[]'::jsonb)),0)
  then raise exception 'No active classroom item'; end if;

  current_item:=s.pack_snapshot->'items'->s.current_item_index;
  current_item_id:=left(coalesce(current_item->>'id',''),160);

  if current_item_id='' or current_item_id<>left(coalesce(p_item_id,''),160) then
    raise exception 'Response item is not active';
  end if;

  insert into public.classroom_responses(session_id,participant_id,item_id,response,elapsed_ms,submitted_at,updated_at)
  values(
    s.id,p.id,current_item_id,coalesce(p_response,'{}'::jsonb),
    greatest(0,least(coalesce(p_elapsed_ms,0),7200000)),now(),now()
  )
  on conflict(session_id,participant_id,item_id) do update set
    response=excluded.response,elapsed_ms=excluded.elapsed_ms,submitted_at=now(),updated_at=now()
  returning * into r;

  return to_jsonb(r);
end;
$function$;

revoke execute on function public.classroom_join_session(text,text) from public;
grant execute on function public.classroom_join_session(text,text) to anon, authenticated, service_role;
revoke execute on function public.classroom_get_public_state(text,uuid) from public;
grant execute on function public.classroom_get_public_state(text,uuid) to anon, authenticated, service_role;
revoke execute on function public.classroom_ping_participant(text,uuid) from public;
grant execute on function public.classroom_ping_participant(text,uuid) to anon, authenticated, service_role;
revoke execute on function public.classroom_submit_response(text,uuid,text,jsonb,integer) from public;
grant execute on function public.classroom_submit_response(text,uuid,text,jsonb,integer) to anon, authenticated, service_role;
