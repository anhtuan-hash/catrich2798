#!/usr/bin/env bash
# Only disposable PostgreSQL test fixtures. This script NEVER touches live classes.
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres
p(){ psql -X -q -v ON_ERROR_STOP=1 "$@"; }
bash scripts/museum-v31-postgres-qa.sh >/tmp/museum-competition-base.log 2>&1 ||
 { tail -100 /tmp/museum-competition-base.log; exit 1; }
p -f supabase/migrations/20261113033000_museum_live_competition_lab_v42.sql
p <<'SQL'
DO $test$
declare sid uuid;gid uuid:='cccccccc-1111-4111-8111-111111111111';dupe boolean:=false;
begin
 if not(select relrowsecurity from pg_class where oid='public.museum_live_micro_responses'::regclass)
 then raise exception 'Micro response table leaked without RLS';end if;
 if has_table_privilege('anon','public.museum_live_micro_responses','SELECT')
    or has_table_privilege('authenticated','public.museum_live_micro_responses','INSERT')
 then raise exception 'Student micro responses exposed to direct Data API';end if;
 insert into public.museum_live_sessions(assignment_id,owner_id,school_scope,status,stage_index,stage_open)
 values('aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',
 'SCHOOL-A','active',3,true)
 on conflict(assignment_id) do update set stage_index=3,stage_open=true
 returning id into sid;
 update public.museum_live_sessions set media_board='{
  "3":{"query":"NASA school climate actions","instruction":"Find one checkable fact",
    "videos":[{"id":"jNQXAC9IVRw","title":"Chosen by teacher","channel":"Original source"}]}
 }'::jsonb where id=sid;
 if (select media_board->'3'->>'query' from public.museum_live_sessions where id=sid)<>'NASA school climate actions'
 then raise exception 'Media board did not persist';end if;
 insert into public.museum_live_micro_responses(session_id,group_id,stage_index,choice,reason)
 values(sid,gid,3,0,'A named and dated observation can be checked against its source.');
 if (select count(*) from public.museum_live_micro_responses where session_id=sid and group_id=gid)<>1
 then raise exception 'Micro evidence was not saved';end if;
 begin
  insert into public.museum_live_micro_responses(session_id,group_id,stage_index,choice,reason)
  values(sid,gid,3,0,'This duplicate must be rejected and must never overwrite the first evidence.');
 exception when unique_violation then dupe:=true;end;
 if not dupe then raise exception 'Duplicate same-stage group evidence accepted';end if;
 if (select reason from public.museum_live_micro_responses where session_id=sid and group_id=gid)
    <>'A named and dated observation can be checked against its source.'
 then raise exception 'Original group evidence was changed';end if;
end $test$;
SQL
echo '[museum-competition] PASS: RLS, persistence, scoped media and immutable one-per-group stage responses'
