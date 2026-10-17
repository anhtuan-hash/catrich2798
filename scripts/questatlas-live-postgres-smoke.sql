\set ON_ERROR_STOP on
\echo '[QuestAtlas] Starting disposable PostgreSQL 17 integration smoke tests'
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
-- Supabase grants USAGE on the extensions schema to API roles by default.
grant usage on schema extensions to authenticated,anon;
create table auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid
  language sql stable set search_path='' as $func$
    select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
  $func$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.profiles(id uuid primary key references auth.users(id), approved boolean not null);
grant select on public.profiles to authenticated;
\i supabase/migrations/20261017091000_questatlas_foundation.sql
\i supabase/migrations/20261017093000_questatlas_classroom_live.sql
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111');
insert into public.profiles(id,approved) values ('11111111-1111-4111-8111-111111111111',true);
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.qatl_quests (id,title,world,status)
 values('22222222-2222-4222-8222-222222222222','Live English Challenge','temple','published');
insert into public.qatl_puzzles (quest_id,position,kind,stem,options,correct_answer,points)
 values('22222222-2222-4222-8222-222222222222',1,'choice','The teacher _____ helped us win an award.','["who","where","when","whose"]'::jsonb,'who',10);
select r->>'id' as room_id, r->>'join_code' as join_code
 from (select public.qatl_live_create('22222222-2222-4222-8222-222222222222',4) as r) s \gset
\echo '[QuestAtlas] Host room created'
SELECT (NOT has_table_privilege('authenticated','public.qatl_live_sessions','INSERT'))
  AS cannot_directly_create \gset
SELECT (NOT has_column_privilege('authenticated','public.qatl_live_sessions','puzzle_snapshot','UPDATE'))
  AS cannot_tamper_snapshot \gset
\if :cannot_directly_create
  \echo '[QuestAtlas] Host cannot bypass room-creation quota via direct table insert'
\else
  select 1/0;
\endif
\if :cannot_tamper_snapshot
  \echo '[QuestAtlas] Host cannot update published room answer snapshot via Data API'
\else
  select 1/0;
\endif
SELECT (NOT has_function_privilege('anon','public.qatl_live_create(uuid,integer)','EXECUTE')) AS no_guest_create \gset
\if :no_guest_create
  \echo '[QuestAtlas] Anonymous users cannot call teacher room-creation RPC'
\else
  select 1/0;
\endif

reset role;
set role anon;
select has_table_privilege('anon','public.qatl_live_sessions','SELECT') as may_read \gset
\if :may_read
  \echo 'FAIL guest has direct access to live_sessions'
  select 1/0;
\endif
select r->>'token' as team_token from
 (select public.qatl_live_join(:'join_code',1,'Galaxy Team') as r) s \gset
\echo '[QuestAtlas] Guest joined with secret token'
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.qatl_live_control(:'room_id'::uuid,'start');
reset role;
set role anon;
select not ((public.qatl_live_view(:'join_code',:'team_token')->'puzzle') ? 'correct_answer')
  as key_hidden \gset
\if :key_hidden
  \echo '[QuestAtlas] Guest puzzle excludes correct_answer'
\else
  \echo 'FAIL guest response leaked answer'
  select 1/0;
\endif
select (public.qatl_live_submit(:'join_code',:'team_token','WHO')->>'accepted')::boolean
  as accepted \gset
\if :accepted
  \echo '[QuestAtlas] Server accepted one correct answer'
\else
  \echo 'FAIL legitimate answer was not accepted'
  select 1/0;
\endif
select (public.qatl_live_submit(:'join_code',:'team_token','who')->>'accepted')::boolean
  as duplicate \gset
\if :duplicate
  \echo 'FAIL duplicate submission was accepted'
  select 1/0;
\endif
select (public.qatl_live_view(:'join_code',:'team_token')->'scoreboard'->0->>'score')::integer=10
 as score_correct \gset
\if :score_correct
  \echo '[QuestAtlas] Score is exactly 10 and duplicate did not add points'
\else
  \echo 'FAIL score is incorrect'
  select 1/0;
\endif
-- Host-only team recovery invalidates previous bearer token and score.
select not has_function_privilege('anon','public.qatl_live_reset_team(uuid,integer)','EXECUTE') as guest_cannot_reset \gset
\if :guest_cannot_reset
  \echo '[QuestAtlas] Anonymous guests cannot call team reset'
\else
  \echo 'FAIL anonymous team reset capability'
  select 1/0;
\endif
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select (public.qatl_live_reset_team(:'room_id'::uuid,1)->>'reset')::boolean as reset_success \gset
\if :reset_success
  \echo '[QuestAtlas] Host reset the occupied team slot'
\else
  select 1/0;
\endif
select (count(*)=0) as score_removed from public.qatl_live_attempts where session_id=:'room_id'::uuid \gset
\if :score_removed
  \echo '[QuestAtlas] Team reset removed the prior score and attempts'
\else
  select 1/0;
\endif
reset role;
set role anon;
select (public.qatl_live_join(:'join_code',1,'Restored Galaxy') ->> 'token') as replacement_token \gset
select (:'replacement_token' <> :'team_token') as secret_rotated \gset
\if :secret_rotated
  \echo '[QuestAtlas] Replacement device received a rotated token'
\else
  select 1/0;
\endif
-- Fill all eight seats, answer from each team and validate scoreboard.
reset role;
set role anon;
select r->>'token' as token_2 from (select public.qatl_live_join(:'join_code',2,'Galaxy 2') as r) j \gset
select r->>'token' as token_3 from (select public.qatl_live_join(:'join_code',3,'Galaxy 3') as r) j \gset
select r->>'token' as token_4 from (select public.qatl_live_join(:'join_code',4,'Galaxy 4') as r) j \gset
select r->>'token' as token_5 from (select public.qatl_live_join(:'join_code',5,'Galaxy 5') as r) j \gset
select r->>'token' as token_6 from (select public.qatl_live_join(:'join_code',6,'Galaxy 6') as r) j \gset
select r->>'token' as token_7 from (select public.qatl_live_join(:'join_code',7,'Galaxy 7') as r) j \gset
select r->>'token' as token_8 from (select public.qatl_live_join(:'join_code',8,'Galaxy 8') as r) j \gset
select (public.qatl_live_submit(:'join_code',:'token_2','who')->>'awarded')::integer=10 as team_2_scored \gset
\if :team_2_scored
  \echo '[QuestAtlas] Team 2 submitted correct answer'
\else
  select 1/0;
\endif
select (public.qatl_live_submit(:'join_code',:'token_3','who')->>'awarded')::integer=10 as team_3_scored \gset
\if :team_3_scored
  \echo '[QuestAtlas] Team 3 submitted correct answer'
\else
  select 1/0;
\endif
select (public.qatl_live_submit(:'join_code',:'token_4','who')->>'awarded')::integer=10 as team_4_scored \gset
\if :team_4_scored
  \echo '[QuestAtlas] Team 4 submitted correct answer'
\else
  select 1/0;
\endif
select (public.qatl_live_submit(:'join_code',:'token_5','who')->>'awarded')::integer=10 as team_5_scored \gset
\if :team_5_scored
  \echo '[QuestAtlas] Team 5 submitted correct answer'
\else
  select 1/0;
\endif
select (public.qatl_live_submit(:'join_code',:'token_6','who')->>'awarded')::integer=10 as team_6_scored \gset
\if :team_6_scored
  \echo '[QuestAtlas] Team 6 submitted correct answer'
\else
  select 1/0;
\endif
select (public.qatl_live_submit(:'join_code',:'token_7','who')->>'awarded')::integer=10 as team_7_scored \gset
\if :team_7_scored
  \echo '[QuestAtlas] Team 7 submitted correct answer'
\else
  select 1/0;
\endif
select (public.qatl_live_submit(:'join_code',:'token_8','who')->>'awarded')::integer=10 as team_8_scored \gset
\if :team_8_scored
  \echo '[QuestAtlas] Team 8 submitted correct answer'
\else
  select 1/0;
\endif
-- Quotas: 50 team views/min, 12 submissions/minute. Quota errors persist
-- because RPC returns an error envelope rather than rolling back its counter.
select count(*) FILTER (WHERE v->>'error'='rate_limited')>0 as view_throttled
 from (select public.qatl_live_view(:'join_code',:'replacement_token') v
       from generate_series(1,56)) q \gset
\if :view_throttled
  \echo '[QuestAtlas] Repeated viewer polling was rate limited'
\else
  \echo 'FAIL viewer throttle'
  select 1/0;
\endif
select count(*) FILTER (WHERE v->>'reason'='rate_limited')>0 as submit_throttled
 from (select public.qatl_live_submit(:'join_code',:'token_2','who') v
       from generate_series(1,17)) q \gset
\if :submit_throttled
  \echo '[QuestAtlas] Duplicate submission flood was rate limited'
\else
  \echo 'FAIL submission throttle'
  select 1/0;
\endif
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select (count(*)=8) as full_room from public.qatl_live_teams WHERE session_id=:'room_id'::uuid \gset
\if :full_room
  \echo '[QuestAtlas] Eight teams participate in one room'
\else
  select 1/0;
\endif
select (sum(points)=70) as stable_score from public.qatl_live_attempts
  WHERE session_id=:'room_id'::uuid \gset
\if :stable_score
  \echo '[QuestAtlas] Eight team scoring does not duplicate awards'
\else
  select 1/0;
\endif
select NOT has_table_privilege('anon','public.qatl_live_guest_budget','SELECT') as protected_quota \gset
\if :protected_quota
  \echo '[QuestAtlas] Guest quota counters cannot be read directly'
\else
  select 1/0;
\endif
select (public.qatl_live_control(:'room_id'::uuid,'next')->>'status')='finished' as session_finished \gset
\if :session_finished
  \echo '[QuestAtlas] Teacher advanced final stage and ended session'
\else
  \echo 'FAIL expected finished state'
  select 1/0;
\endif

-- The hourly room cap must be enforced by the server, not just the UI.
SELECT (public.qatl_live_create('22222222-2222-4222-8222-222222222222',4))->>'id'
FROM generate_series(1,4);
DO $limit$
DECLARE cap_denied boolean:=false;
BEGIN
  BEGIN
    PERFORM public.qatl_live_create('22222222-2222-4222-8222-222222222222',4);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Maximum five new rooms per hour%' THEN cap_denied:=true; END IF;
  END;
  IF NOT cap_denied THEN RAISE EXCEPTION 'Room creation cap did not block the sixth room'; END IF;
END $limit$;
\echo '[QuestAtlas] Five-rooms-per-hour server quota enforced'
\echo '[QuestAtlas] Disposable PostgreSQL integration smoke tests passed'
