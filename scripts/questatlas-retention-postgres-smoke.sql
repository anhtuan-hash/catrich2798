\set ON_ERROR_STOP on
\echo '[QuestAtlas Operations] Testing safe retention in disposable PostgreSQL'
\i supabase/migrations/20261017133000_questatlas_retention.sql
select NOT has_function_privilege('anon','public.qatl_maintenance_cleanup(integer,boolean)','EXECUTE') AS anon_blocked \gset
select NOT has_function_privilege('authenticated','public.qatl_maintenance_cleanup(integer,boolean)','EXECUTE') AS teacher_blocked \gset
\if :anon_blocked
\else
  select 1/0;
\endif
\if :teacher_blocked
\else
  select 1/0;
\endif
insert into public.qatl_live_sessions (
  quest_id,host_id,join_code,team_limit,current_position,status,puzzle_snapshot,expires_at
) values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'AAAABBBBCCCC',8,1,'finished','[{"position":1}]'::jsonb,
  now()-interval '210 days'
);
insert into public.qatl_live_guest_budget(
  session_id,action,client_key,minute_bucket
) select id,'view',repeat('f',64),now()-interval '4 days'
  from public.qatl_live_sessions where join_code='AAAABBBBCCCC';
insert into public.qatl_gateway_ip_budget(ip_hash,action,minute_bucket)
values (repeat('f',64),'join',now()-interval '4 days');
set role service_role;
select (public.qatl_maintenance_cleanup()->>'eligible_sessions')::integer>=1 as has_expired \gset
\if :has_expired
  \echo '[QuestAtlas Operations] Dry-run enumerates old sessions'
\else
  select 1/0;
\endif
select (public.qatl_maintenance_cleanup()->>'dry_run')::boolean as default_is_dry \gset
\if :default_is_dry
  \echo '[QuestAtlas Operations] Cleanup defaults to dry-run'
\else
  select 1/0;
\endif
reset role;
select count(*)=1 as still_present from public.qatl_live_sessions where join_code='AAAABBBBCCCC' \gset
\if :still_present
  \echo '[QuestAtlas Operations] Dry run did not delete old session'
\else
  select 1/0;
\endif
set role service_role;
select (public.qatl_maintenance_cleanup(180,false)->>'deleted_sessions')::integer>=1 as actually_deleted \gset
\if :actually_deleted
  \echo '[QuestAtlas Operations] Explicit cleanup removed expired session'
\else
  select 1/0;
\endif
reset role;
select count(*)=0 as session_gone from public.qatl_live_sessions where join_code='AAAABBBBCCCC' \gset
select count(*)=0 as ip_gone from public.qatl_gateway_ip_budget where ip_hash=repeat('f',64) \gset
select count(*)>=2 as audit_untouched from public.qatl_department_audit \gset
\if :session_gone
\else
  select 1/0;
\endif
\if :ip_gone
\else
  select 1/0;
\endif
\if :audit_untouched
  \echo '[QuestAtlas Operations] Department approval audit untouched'
\else
  select 1/0;
\endif
\echo '[QuestAtlas Operations] Service-only dry-run retention verification PASS'
