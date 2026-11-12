#!/usr/bin/env bash
# Disposable database only. All records are synthetic QA fixtures.
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres
p(){ psql -X -v ON_ERROR_STOP=1 -q "$@"; }
bash scripts/museum-v31-postgres-qa.sh >/tmp/museum-v31-base.log 2>&1 || { tail -80 /tmp/museum-v31-base.log; exit 1; }
p -f supabase/migrations/20261112230000_museum_learning_evidence_v33.sql
# Reproduce Supabase default ALL grants before validating the corrective migration.
p -c 'grant all on public.museum_survey_snapshots,public.museum_checkpoints,public.museum_peer_pairs,public.museum_peer_reviews to service_role;'
p -f supabase/migrations/20261112231000_museum_evidence_explicit_service_privileges.sql
p <<'SQL'
do $$
declare s uuid; frozen jsonb; n integer; denied boolean; first_doc jsonb;
begin
 insert into public.gcp_groups(id,assignment_id,label) values
 ('eeeeeeee-1111-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-111111111111','QA peer B'),
 ('ffffffff-1111-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-111111111111','QA peer C');
 insert into public.gcp_drafts(group_id,doc) values
 ('eeeeeeee-1111-4111-8111-111111111111','{"learning":{"issue":"Before"}}'),
 ('ffffffff-1111-4111-8111-111111111111','{"learning":{"issue":"Other"}}');
 insert into public.museum_live_sessions(assignment_id,owner_id,school_scope,stage_index,status,stage_open)
 values('aaaaaaaa-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','SCHOOL-A',2,'active',true) returning id into s;
 insert into public.museum_live_responses(session_id,group_id,stage_index,value) values(s,'eeeeeeee-1111-4111-8111-111111111111',2,'1');
 denied:=false;begin perform public.museum_freeze_survey(s,0,array[1,0,0,0],'paper');exception when others then denied:=true;end;
 if not denied then raise exception 'mixed paper/online accepted';end if;
 select version into n from public.museum_live_sessions where id=s;
 frozen:=public.museum_freeze_survey(s,n);
 if frozen->'counts'<>'[0,1,0,0]'::jsonb then raise exception 'wrong counts %',frozen;end if;
 if public.museum_freeze_survey(s,n)<>frozen then raise exception 'snapshot not idempotent';end if;
 denied:=false;begin insert into public.museum_live_responses(session_id,group_id,stage_index,value) values(s,'ffffffff-1111-4111-8111-111111111111',2,'2');exception when others then denied:=true;end;
 if not denied then raise exception 'vote accepted after freeze';end if;
 update public.museum_live_sessions set stage_index=6,stage_open=true where id=s;
 update public.museum_live_sessions set stage_index=7,stage_open=false where id=s;
 select count(*) into n from public.museum_peer_pairs where session_id=s;
 if n<2 then raise exception 'no peer pairs';end if;
 if exists(select 1 from public.museum_peer_pairs where from_group=to_group) then raise exception 'self review';end if;
 if exists(select 1 from public.museum_peer_pairs where session_id=s group by to_group having count(*)<>1) then raise exception 'unbalanced reviews';end if;
 select doc into first_doc from public.museum_checkpoints where session_id=s and group_id='eeeeeeee-1111-4111-8111-111111111111' and kind='before';
 denied:=false;begin update public.gcp_drafts set doc='{"learning":{"issue":"Rejected"}}' where group_id='eeeeeeee-1111-4111-8111-111111111111';exception when others then denied:=true;end;
 if not denied then raise exception 'closed draft save accepted';end if;
 update public.museum_live_sessions set stage_open=true where id=s;
 insert into public.museum_peer_reviews(session_id,from_group,learned,clarify,rating) select s,from_group,'I learned about the problem.','Please explain the source more clearly.',3 from public.museum_peer_pairs where session_id=s limit 1;
 update public.museum_live_sessions set stage_index=8 where id=s;
 update public.gcp_drafts set doc='{"learning":{"issue":"Improved"}}',version=version+1 where group_id='eeeeeeee-1111-4111-8111-111111111111';
 update public.museum_live_sessions set stage_index=9,stage_open=false where id=s;
 if (select doc from public.museum_checkpoints where session_id=s and group_id='eeeeeeee-1111-4111-8111-111111111111' and kind='before')<>first_doc then raise exception 'before changed';end if;
 if not exists(select 1 from public.museum_checkpoints where session_id=s and kind='after' and doc->'learning'->>'issue'='Improved') then raise exception 'missing after';end if;
end $$;
do $$ declare t text;begin
 foreach t in array array['museum_survey_snapshots','museum_checkpoints','museum_peer_pairs','museum_peer_reviews'] loop
 if has_table_privilege('anon','public.'||t,'SELECT') or has_table_privilege('authenticated','public.'||t,'SELECT') or has_table_privilege('service_role','public.'||t,'UPDATE') then raise exception 'unsafe privileges on %',t;end if;
 end loop;
end $$;
SQL
echo '[museum-evidence] PASS: freeze, late vote rejection, exact counts, immutable checkpoints, balanced peer pairing, closed-edit guard, private privileges'
