#!/usr/bin/env bash
# Disposable PostgreSQL only; never use this test against production data.
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres
p(){ psql -X -v ON_ERROR_STOP=1 -q "$@"; }
bash scripts/museum-evidence-postgres-qa.sh >/tmp/museum-evidence-base-admin.log 2>&1 || { tail -90 /tmp/museum-evidence-base-admin.log; exit 1; }
p -f supabase/migrations/20261113010000_museum_admin_direct_review_archive.sql
p <<'SQL'
do $admin_test$
declare owner uuid:='11111111-1111-4111-8111-111111111111';
 stranger uuid:='44444444-4444-4444-8444-444444444444';
 issued jsonb; a uuid; g uuid; r uuid; gone text; denied boolean; published uuid;
begin
 -- No reviewer grant needed; the Admin directly issues to their own account.
 issued:=public.gcp_staff_issue_assignment(owner,owner,'SCHOOL-A','11.4',
  'Our Climate Action Museum','Real student work follows the English project plan',
  now()+interval '3 days',
  '[{"handle":"admin-single-lesson-001","secret_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);
 a:=(issued->'assignment'->>'id')::uuid;
 g:=(issued->'groups'->0->>'groupId')::uuid;
 if (select reviewer_id from public.gcp_assignments where id=a)<>owner
 then raise exception 'Admin not reviewer';end if;
 denied:=false;
 begin perform public.gcp_admin_decide(gen_random_uuid(),stranger,'approve','');
 exception when others then denied:=true;end;
 if not denied then raise exception 'Cross-school forged review accepted';end if;
 perform public.gcp_guest_save(g,0,
 '{"title":"Group project","summary":"Climate actions","rooms":[{"title":"Hall","template_key":"classic","exhibits":[{"title":"Our Problem","kind":"text","description":"The problem is avoidable energy waste."}]}]}'::jsonb);
 r:=public.gcp_guest_submit(g,1);
 if r is null then raise exception 'No review submitted';end if;
 denied:=false;
 begin perform public.gcp_admin_decide(r,stranger,'approve','');
 exception when others then denied:=true;end;
 if not denied then raise exception 'Other-school user approved a review';end if;
 if public.gcp_admin_decide(r,owner,'approve','Evidence checked')<>'approved_locked'
 then raise exception 'Admin direct approval failed';end if;
 if (select approved_by from public.gcp_reviews where id=r)<>owner
 then raise exception 'Approved actor not Admin';end if;
 denied:=false;
 begin perform public.gcp_admin_archive_review(r,owner);
 exception when others then denied:=true;end;
 if not denied then raise exception 'Approved review was archived';end if;
 -- This proves a single Admin can publish their own directly approved exhibit.
 published:=public.gcp_admin_publish(r,owner);
 if published is null then raise exception 'Direct Admin publish failed';end if;
 denied:=false;
 begin perform public.gcp_admin_archive_assignment(a,owner);
 exception when others then denied:=true;end;
 if not denied then raise exception 'Published lesson was archived';end if;
end $admin_test$;
do $archive_test$
declare owner uuid:='11111111-1111-4111-8111-111111111111';
 issued jsonb;a uuid;g uuid;r uuid;denied boolean;
begin
 issued:=public.gcp_staff_issue_assignment(owner,owner,'SCHOOL-A','11.5',
  'A removable lesson','Unpublished materials',now()+interval '3 days',
  '[{"handle":"admin-archive-lesson-001","secret_hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}]'::jsonb);
 a:=(issued->'assignment'->>'id')::uuid;
 g:=(issued->'groups'->0->>'groupId')::uuid;
 perform public.gcp_guest_save(g,0,
 '{"title":"Draft","rooms":[{"title":"Hall","template_key":"classic","exhibits":[{"title":"Problem","description":"A source-based English paragraph","kind":"text"}]}]}'::jsonb);
 r:=public.gcp_guest_submit(g,1);
 perform public.gcp_admin_archive_review(r,owner);
 if (select archived_at from public.gcp_reviews where id=r) is null
 then raise exception 'Review archive not set';end if;
 if (select state from public.gcp_groups where id=g)<>'changes_requested'
 then raise exception 'Group cannot revise after Admin archive';end if;
 if not exists(select 1 from public.gcp_review_events
  where review_id=r and actor_type='admin' and action='admin_archive_review')
 then raise exception 'Missing archive audit';end if;
 -- Admin must never be able to archive a class from a different school.
 denied:=false;begin
  perform public.gcp_admin_archive_assignment(a,'44444444-4444-4444-8444-444444444444');
 exception when others then denied:=true;end;
 if not denied then raise exception 'Cross-school lesson archived';end if;
 if public.gcp_admin_archive_assignment(a,owner)<>'archived'
 then raise exception 'Lesson archive failed';end if;
 if not exists(select 1 from public.gcp_assignments where id=a and archived_at is not null and status='closed')
 then raise exception 'Assignment history missing';end if;
 if not exists(select 1 from public.gcp_invites where group_id=g and revoked_at is not null)
 then raise exception 'Group invite remained active after archive';end if;
end $archive_test$;
do $privilege_test$
begin
 if has_function_privilege('anon','public.gcp_admin_decide(uuid,uuid,text,text)','EXECUTE')
  or has_function_privilege('authenticated','public.gcp_admin_archive_review(uuid,uuid)','EXECUTE')
  or has_function_privilege('anon','public.gcp_admin_archive_assignment(uuid,uuid)','EXECUTE')
 then raise exception 'Admin-only function leaked to client roles';end if;
end $privilege_test$;
SQL
echo "[museum-admin] PASS: one Admin issues, reviews, publishes and safely archives; school scope, audit, publication and privilege safeguards pass."
