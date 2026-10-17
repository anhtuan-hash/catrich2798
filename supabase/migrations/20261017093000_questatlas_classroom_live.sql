-- QuestAtlas Classroom Live (staged, do NOT apply to production without isolated RLS/RPC tests).
-- Depends on 20261017091000_questatlas_foundation.sql.
-- Design: one device per team, up to eight teams, short-lived room, one scored answer per team per stage.
-- Public clients have NO table grants. Only three purpose-limited SEC DEFINER RPCs accept guests.
create table public.qatl_live_sessions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.qatl_quests(id) on delete restrict,
  host_id uuid not null references auth.users(id),
  join_code text not null unique check (join_code ~ '^[A-F0-9]{12}$'),
  status text not null default 'waiting' check (status in ('waiting','active','paused','finished')),
  team_limit integer not null check (team_limit between 2 and 8),
  current_position integer not null default 0 check (current_position between 0 and 100),
  puzzle_snapshot jsonb not null check (jsonb_typeof(puzzle_snapshot)='array' and jsonb_array_length(puzzle_snapshot) between 1 and 100),
  expires_at timestamptz not null default (now() + interval '4 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.qatl_live_teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.qatl_live_sessions(id) on delete cascade,
  team_no integer not null check(team_no between 1 and 8),
  display_name text not null check (length(display_name) between 2 and 50),
  token_hash text not null check (length(token_hash)=64),
  created_at timestamptz not null default now(),
  unique(session_id,team_no),
  unique(session_id,token_hash)
);
create table public.qatl_live_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.qatl_live_sessions(id) on delete cascade,
  team_id uuid not null references public.qatl_live_teams(id) on delete cascade,
  puzzle_position integer not null check (puzzle_position between 1 and 100),
  is_correct boolean not null,
  points integer not null check(points between 0 and 100),
  created_at timestamptz not null default now(),
  unique(session_id,team_id,puzzle_position)
);
create index qatl_live_sessions_host_idx on public.qatl_live_sessions(host_id,created_at desc);
create index qatl_live_teams_session_idx on public.qatl_live_teams(session_id);
create index qatl_live_attempts_session_idx on public.qatl_live_attempts(session_id);
alter table public.qatl_live_sessions enable row level security;
alter table public.qatl_live_teams enable row level security;
alter table public.qatl_live_attempts enable row level security;
revoke all on public.qatl_live_sessions,public.qatl_live_teams,public.qatl_live_attempts from public,anon,authenticated;
grant select,insert,update on public.qatl_live_sessions to authenticated;
grant select on public.qatl_live_teams,public.qatl_live_attempts to authenticated;
create policy qatl_live_session_host_read on public.qatl_live_sessions
  for select to authenticated using (host_id=(select auth.uid()));
create policy qatl_live_session_host_create on public.qatl_live_sessions
  for insert to authenticated with check (host_id=(select auth.uid())
    and exists(select 1 from public.qatl_quests q where q.id=quest_id
      and q.owner_id=(select auth.uid()) and q.status='published')
    and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.approved=true));
create policy qatl_live_session_host_update on public.qatl_live_sessions
  for update to authenticated using (host_id=(select auth.uid()))
  with check (host_id=(select auth.uid()));
create policy qatl_live_team_host_read on public.qatl_live_teams
  for select to authenticated using (exists(
    select 1 from public.qatl_live_sessions s where s.id=session_id and s.host_id=(select auth.uid())));
create policy qatl_live_attempt_host_read on public.qatl_live_attempts
  for select to authenticated using (exists(
    select 1 from public.qatl_live_sessions s where s.id=session_id and s.host_id=(select auth.uid())));

-- Host creates an immutable question snapshot. No public client can query this table.
create function public.qatl_live_create(p_quest_id uuid,p_team_limit integer default 4)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_quest public.qatl_quests%rowtype; v_snapshot jsonb; v_session public.qatl_live_sessions%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if p_team_limit not between 2 and 8 then raise exception 'Teams must be between 2 and 8'; end if;
  -- Avoid unlimited room creation by the same authenticated teacher.
  if (select count(*) from public.qatl_live_sessions where host_id=(select auth.uid())
      and created_at>now()-interval '1 hour')>=5 then
    raise exception 'Maximum five new rooms per hour';
  end if;
  select * into v_quest from public.qatl_quests
    where id=p_quest_id and owner_id=(select auth.uid()) and status='published';
  if not found then raise exception 'Published Quest not available'; end if;
  select jsonb_agg(jsonb_build_object(
    'id',p.id,'position',p.position,'kind',p.kind,'stem',p.stem,
    'options',p.options,'correct_answer',p.correct_answer,'clue',p.clue,'points',p.points
    ) order by p.position,p.id) into v_snapshot
  from public.qatl_puzzles p where p.quest_id=p_quest_id and p.owner_id=(select auth.uid());
  if v_snapshot is null or jsonb_array_length(v_snapshot)<1 then raise exception 'Quest has no puzzles'; end if;
  if exists(select 1 from jsonb_array_elements(v_snapshot) p
    where length(btrim(p->>'correct_answer'))<1) then raise exception 'Invalid puzzle answer'; end if;
  insert into public.qatl_live_sessions (quest_id,host_id,join_code,team_limit,puzzle_snapshot)
    values (p_quest_id,(select auth.uid()),upper(encode(extensions.gen_random_bytes(6),'hex')),p_team_limit,v_snapshot)
    returning * into v_session;
  return jsonb_build_object('id',v_session.id,'join_code',v_session.join_code,'status',v_session.status,'team_limit',v_session.team_limit);
end $$;
revoke all on function public.qatl_live_create(uuid,integer) from public,anon;
grant execute on function public.qatl_live_create(uuid,integer) to authenticated;

create function public.qatl_live_control(p_session_id uuid,p_action text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.qatl_live_sessions%rowtype; v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into s from public.qatl_live_sessions
    where id=p_session_id and host_id=(select auth.uid()) for update;
  if not found then raise exception 'Session not found'; end if;
  if s.expires_at<=now() then raise exception 'Session expired'; end if;
  v_count=jsonb_array_length(s.puzzle_snapshot);
  if p_action='start' and s.status='waiting' then s.status='active';s.current_position=1;
  elsif p_action='pause' and s.status='active' then s.status='paused';
  elsif p_action='resume' and s.status='paused' then s.status='active';
  elsif p_action='next' and s.status='active' then
    if s.current_position>=v_count then s.status='finished';
    else s.current_position=s.current_position+1; end if;
  elsif p_action='finish' and s.status<>'finished' then s.status='finished';
  else raise exception 'Invalid transition'; end if;
  update public.qatl_live_sessions set status=s.status,current_position=s.current_position,updated_at=now()
    where id=s.id;
  return jsonb_build_object('status',s.status,'position',s.current_position,'total',v_count);
end $$;
revoke all on function public.qatl_live_control(uuid,text) from public,anon;
grant execute on function public.qatl_live_control(uuid,text) to authenticated;

-- Deliberately limited public operations; no SQL objects exposed directly to anon.
create function public.qatl_live_join(p_code text,p_team_no integer,p_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.qatl_live_sessions%rowtype; t public.qatl_live_teams%rowtype; v_token text;
begin
  if p_code !~ '^[A-F0-9]{12}$' or p_team_no not between 1 and 8
     or length(btrim(coalesce(p_name,''))) not between 2 and 50 then raise exception 'Invalid join details'; end if;
  select * into s from public.qatl_live_sessions where join_code=p_code for update;
  if not found or s.expires_at<now() or s.status not in ('waiting','active','paused')
     or p_team_no>s.team_limit then raise exception 'Room unavailable'; end if;
  if exists(select 1 from public.qatl_live_teams where session_id=s.id and team_no=p_team_no)
    then raise exception 'Team already joined. Reconnect from the original device.'; end if;
  v_token=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.qatl_live_teams(session_id,team_no,display_name,token_hash)
    values(s.id,p_team_no,btrim(p_name),encode(extensions.digest(v_token,'sha256'),'hex'))
    returning * into t;
  return jsonb_build_object('token',v_token,'team_no',t.team_no,'display_name',t.display_name);
end $$;
revoke all on function public.qatl_live_join(text,integer,text) from public,anon,authenticated;
grant execute on function public.qatl_live_join(text,integer,text) to anon,authenticated;

create function public.qatl_live_view(p_code text,p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.qatl_live_sessions%rowtype; t public.qatl_live_teams%rowtype; v_puzzle jsonb;
        v_scores jsonb; v_submitted boolean;
begin
  if p_code !~ '^[A-F0-9]{12}$' or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Invalid credentials'; end if;
  select * into s from public.qatl_live_sessions where join_code=p_code and expires_at>now();
  if not found then raise exception 'Room unavailable'; end if;
  select * into t from public.qatl_live_teams where session_id=s.id
    and token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  if not found then raise exception 'Team session not found'; end if;
  v_puzzle=case when s.status='active'
    then s.puzzle_snapshot->(s.current_position-1) else null end;
  select exists (select 1 from public.qatl_live_attempts a
    where a.session_id=s.id and a.team_id=t.id and a.puzzle_position=s.current_position)
    into v_submitted;
  select coalesce(jsonb_agg(jsonb_build_object(
    'team_no',board.team_no,'display_name',board.display_name,'score',board.score)
    order by board.team_no),'[]'::jsonb) into v_scores
  from (select tm.id,tm.team_no,tm.display_name,coalesce(sum(a.points),0)::integer as score
    from public.qatl_live_teams tm left join public.qatl_live_attempts a on a.team_id=tm.id
    where tm.session_id=s.id group by tm.id) board;
  return jsonb_build_object(
    'title',(select q.title from public.qatl_quests q where q.id=s.quest_id),
    'status',s.status,'team_no',t.team_no,'display_name',t.display_name,
    'position',s.current_position,'total',jsonb_array_length(s.puzzle_snapshot),
    'submitted',v_submitted,'scoreboard',v_scores,
    'puzzle',case when v_puzzle is null then null else jsonb_build_object(
      'position',v_puzzle->'position','kind',v_puzzle->'kind',
      'stem',v_puzzle->'stem','options',v_puzzle->'options',
      'points',v_puzzle->'points') end
  );
end $$;
revoke all on function public.qatl_live_view(text,text) from public,anon,authenticated;
grant execute on function public.qatl_live_view(text,text) to anon,authenticated;

create function public.qatl_live_submit(p_code text,p_token text,p_answer text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.qatl_live_sessions%rowtype; t public.qatl_live_teams%rowtype;
        v_puzzle jsonb; v_correct boolean; v_points integer; v_id uuid;
begin
  if p_code !~ '^[A-F0-9]{12}$' or p_token !~ '^[0-9a-f]{64}$'
     or length(btrim(coalesce(p_answer,''))) not between 1 and 180 then raise exception 'Invalid answer request'; end if;
  select * into s from public.qatl_live_sessions where join_code=p_code for update;
  if not found or s.expires_at<=now() or s.status<>'active' then raise exception 'Room not accepting answers'; end if;
  select * into t from public.qatl_live_teams where session_id=s.id
    and token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  if not found then raise exception 'Team session not found'; end if;
  if exists(select 1 from public.qatl_live_attempts a
      where a.session_id=s.id and a.team_id=t.id and a.puzzle_position=s.current_position)
    then return jsonb_build_object('accepted',false,'reason','already_submitted'); end if;
  v_puzzle=s.puzzle_snapshot->(s.current_position-1);
  v_correct=lower(btrim(p_answer))=lower(btrim(v_puzzle->>'correct_answer'));
  v_points=case when v_correct then (v_puzzle->>'points')::integer else 0 end;
  insert into public.qatl_live_attempts(session_id,team_id,puzzle_position,is_correct,points)
    values(s.id,t.id,s.current_position,v_correct,v_points) returning id into v_id;
  return jsonb_build_object('accepted',true,'correct',v_correct,'awarded',v_points);
end $$;
revoke all on function public.qatl_live_submit(text,text,text) from public,anon,authenticated;
grant execute on function public.qatl_live_submit(text,text,text) to anon,authenticated;

-- Security review required: execute privileges on exposed SECURITY DEFINER functions are
-- intentional only for qatl_live_join/view/submit. Never return puzzle_snapshot to guests.


-- Only the authenticated host may release a taken team slot. All old tokens and
-- that team's attempts are invalidated. No anonymous EXECUTE grant.
CREATE FUNCTION public.qatl_live_reset_team(p_session_id uuid,p_team_no integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $qatl_reset$
DECLARE s public.qatl_live_sessions%ROWTYPE; v_team_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_team_no NOT BETWEEN 1 AND 8
    THEN RAISE EXCEPTION 'Invalid host or team'; END IF;
  SELECT * INTO s FROM public.qatl_live_sessions
    WHERE id=p_session_id AND host_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR s.expires_at<=now() OR s.status='finished'
    THEN RAISE EXCEPTION 'Room unavailable to reset'; END IF;
  IF p_team_no>s.team_limit THEN RAISE EXCEPTION 'Team outside this room'; END IF;
  DELETE FROM public.qatl_live_teams
    WHERE session_id=s.id AND team_no=p_team_no
    RETURNING id INTO v_team_id;
  IF v_team_id IS NULL THEN RAISE EXCEPTION 'No team occupies this slot'; END IF;
  -- qatl_live_attempts cascades automatically, removing the old team's score.
  RETURN jsonb_build_object('reset',true,'team_no',p_team_no);
END $qatl_reset$;
REVOKE ALL ON FUNCTION public.qatl_live_reset_team(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qatl_live_reset_team(uuid,integer) TO authenticated;
