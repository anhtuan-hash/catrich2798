\set ON_ERROR_STOP on
\echo '[QuestAtlas] Starting disposable PostgreSQL 17 integration smoke tests'
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
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
reset role;
set role anon;
select has_table_privilege('anon','public.qatl_live_sessions','SELECT') as may_read \gset
\if :may_read
  \echo 'FAIL guest has direct access to live_sessions'
  \quit 3
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
  \quit 3
\endif
select (public.qatl_live_submit(:'join_code',:'team_token','WHO')->>'accepted')::boolean
  as accepted \gset
\if :accepted
  \echo '[QuestAtlas] Server accepted one correct answer'
\else
  \echo 'FAIL legitimate answer was not accepted'
  \quit 3
\endif
select (public.qatl_live_submit(:'join_code',:'team_token','who')->>'accepted')::boolean
  as duplicate \gset
\if :duplicate
  \echo 'FAIL duplicate submission was accepted'
  \quit 3
\endif
select (public.qatl_live_view(:'join_code',:'team_token')->'scoreboard'->0->>'score')::integer=10
 as score_correct \gset
\if :score_correct
  \echo '[QuestAtlas] Score is exactly 10 and duplicate did not add points'
\else
  \echo 'FAIL score is incorrect'
  \quit 3
\endif
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select (public.qatl_live_control(:'room_id'::uuid,'next')->>'status')='finished' as session_finished \gset
\if :session_finished
  \echo '[QuestAtlas] Teacher advanced final stage and ended session'
\else
  \echo 'FAIL expected finished state'
  \quit 3
\endif
\echo '[QuestAtlas] Disposable PostgreSQL integration smoke tests passed'
