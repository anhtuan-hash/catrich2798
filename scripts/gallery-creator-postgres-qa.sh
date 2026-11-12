#!/usr/bin/env bash
# Disposable PostgreSQL 16 proof: accountless guests do not need auth.users.
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres
p(){ psql -X -v ON_ERROR_STOP=1 -q "$@"; }
echo "[gcp] First verify existing Gallery R1 on a disposable PostgreSQL instance"
bash scripts/gallery-local-postgres-qa.sh >/tmp/gcp-base-gallery.log 2>&1 || { tail -80 /tmp/gcp-base-gallery.log; exit 1; }
p <<'SQL'
create role service_role nologin;
grant usage on schema public,auth to service_role;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
SQL
echo "[gcp] Applying new migration on disposable database"
p -f supabase/migrations/20261112171000_gallery_creator_pass_v21.sql
p <<'SQL'
do $$
declare t record;
begin
 for t in select tablename from pg_tables where schemaname='public' and tablename like 'gcp_%'
 loop
  if not (select relrowsecurity from pg_class where oid=('public.'||quote_ident(t.tablename))::regclass)
   then raise exception 'RLS disabled on %',t.tablename; end if;
  if has_table_privilege('anon','public.'||quote_ident(t.tablename),'SELECT')
   or has_table_privilege('authenticated','public.'||quote_ident(t.tablename),'SELECT')
   or has_table_privilege('authenticated','public.'||quote_ident(t.tablename),'TRUNCATE')
   then raise exception 'Leaked role grant on %',t.tablename;end if;
 end loop;
 if (select enabled from public.gcp_settings where id=true) then raise exception 'Creator Pass was not OFF by default';end if;
end $$;
insert into public.gcp_reviewer_grants(reviewer_id,school_scope,can_publish,granted_by)
values('33333333-3333-4333-8333-333333333333','SCHOOL-A',true,'11111111-1111-4111-8111-111111111111');
insert into public.gcp_assignments(id,created_by,reviewer_id,school_scope,class_scope,title,deadline_at)
values('aaaaaaaa-1111-4111-8111-111111111111',
'22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',
'SCHOOL-A','11.2','Synthetic climate',now()+interval '7 days');
insert into public.gcp_groups(id,assignment_id,label)
values('bbbbbbbb-1111-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-111111111111','Nhóm 01');
insert into public.gcp_drafts(group_id)values('bbbbbbbb-1111-4111-8111-111111111111');
insert into public.gcp_invites(group_id,handle,secret_hash,expires_at)
values('bbbbbbbb-1111-4111-8111-111111111111','test-handle-abcd1234',repeat('a',64),now()+interval '7 days');
update public.gcp_settings set enabled=true where id=true;
SQL
echo "[gcp] Testing backend-only service_role RPC and optimistic version gate"
p <<'SQL'
set role service_role;
select public.gcp_guest_save('bbbbbbbb-1111-4111-8111-111111111111',0,
 '{"title":"Our Planet","summary":"An original climate exhibit","rooms":[{"title":"Classic","template_key":"classic","exhibits":[{"title":"Solar","description":"Solar energy changes cities.","kind":"text","transform":{"position":[0,2,-7],"rotation":[0,0,0],"scale":[1,1,1]}}]}]}'::jsonb);
do $$
begin
 begin
  perform public.gcp_guest_save('bbbbbbbb-1111-4111-8111-111111111111',0,'{"title":"stale","rooms":[]}'::jsonb);
  raise exception 'OUTCOME: Stale version was incorrectly accepted';
 exception when others then
  if sqlerrm like 'OUTCOME:%' then raise; end if;
 end;
end $$;
select public.gcp_guest_submit('bbbbbbbb-1111-4111-8111-111111111111',1);
-- A repeated request must return the existing review without extra rows.
do $
declare r1 uuid; r2 uuid;
begin
 select id into r1 from public.gcp_reviews where group_id='bbbbbbbb-1111-4111-8111-111111111111';
 r2:=public.gcp_guest_submit('bbbbbbbb-1111-4111-8111-111111111111',1);
 if r1 is distinct from r2 or (select count(*) from public.gcp_reviews where group_id='bbbbbbbb-1111-4111-8111-111111111111')<>1
 then raise exception 'Repeated submission created a duplicate';end if;
end $;
reset role;
SQL
echo "[gcp] Testing teacher/TTCM separation, locked review, and publication"
p <<'SQL'
do $$
declare r uuid; published uuid;
begin
 select id into r from public.gcp_reviews where group_id='bbbbbbbb-1111-4111-8111-111111111111';
 if r is null then raise exception 'Review missing after submit'; end if;
 begin
  perform public.gcp_review_decide(r,'22222222-2222-4222-8222-222222222222','ttcm_approve','forgery');
  raise exception 'OUTCOME: teacher impersonated TTCM';
 exception when others then if sqlerrm like 'OUTCOME:%' then raise;end if;end;
 perform public.gcp_review_decide(r,'22222222-2222-4222-8222-222222222222','teacher_forward','Checked language');
 begin
  perform public.gcp_review_decide(r,'44444444-4444-4444-8444-444444444444','ttcm_approve','other school');
  raise exception 'OUTCOME: Cross-school reviewer succeeded';
 exception when others then if sqlerrm like 'OUTCOME:%' then raise;end if;end;
 perform public.gcp_review_decide(r,'33333333-3333-4333-8333-333333333333','ttcm_approve','Approved');
 begin
  perform public.gcp_admin_publish(r,'22222222-2222-4222-8222-222222222222');
  raise exception 'OUTCOME: teacher published without admin';
 exception when others then if sqlerrm like 'OUTCOME:%' then raise;end if;end;
 published:=public.gcp_admin_publish(r,'11111111-1111-4111-8111-111111111111');
 if published is distinct from public.gcp_admin_publish(r,'11111111-1111-4111-8111-111111111111')
 then raise exception 'Published version cannot be retried idempotently';end if;
 if published is null then raise exception 'Publication did not return exhibition';end if;
 if (select status from public.gallery_exhibitions where id=published)<>'published'
   then raise exception 'R1 gallery did not publish';end if;
 if (select count(*) from public.gallery_exhibits e join public.gallery_rooms r on r.id=e.room_id where r.exhibition_id=published and e.status='published')<>1
   then raise exception 'Native Gallery did not publish exactly one exhibit';end if;
 if (select count(*) from public.gcp_publication_links where group_id='bbbbbbbb-1111-4111-8111-111111111111')<>1
   then raise exception 'Publication link missing';end if;
 if (select count(*) from auth.users)<>6 then raise exception 'Guest created an auth user';end if;
end $$;
SQL
echo "[gcp] Validate atomic issuance and exact group count"
p <<'SQL'
do $
declare issued jsonb; duplicate_failed boolean:=false;
begin
 issued:=public.gcp_staff_issue_assignment(
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'SCHOOL-A','11.6','Another student exhibition','Learning English',
  now()+interval '3 days',
  '[{"handle":"test-atomic-12345678","secret_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"handle":"test-atomic-87654321","secret_hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}]'::jsonb);
 if pg_catalog.jsonb_array_length(issued->'groups')<>2
  then raise exception 'Atomic issue group count mismatch';end if;
 if (select count(*) from public.gcp_groups where assignment_id=(issued->'assignment'->>'id')::uuid)<>2
  then raise exception 'Atomic issue persisted incorrect groups';end if;
 begin
  perform public.gcp_staff_issue_assignment(
   '22222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333',
   'SCHOOL-A','11.6','Should roll back','Learning English',
   now()+interval '3 days',
   '[{"handle":"test-roll-back-12345","secret_hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},{"handle":"test-atomic-12345678","secret_hash":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}]'::jsonb);
 exception when unique_violation then duplicate_failed:=true;end;
 if not duplicate_failed then raise exception 'Duplicate invite must roll back entire issuance';end if;
 if exists(select 1 from public.gcp_assignments where title='Should roll back')
  then raise exception 'Atomic issuance left partial assignment';end if;
end $;
SQL
echo "[gcp] PASSED: no student accounts, two-stage approval, permission checks and atomic publication"
