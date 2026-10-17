\set ON_ERROR_STOP on
\echo '[QuestAtlas Gateway] Switching disposable guest RPC to server-only mode'
create role service_role nologin;
grant usage on schema extensions to service_role;
\i supabase/migrations/20261017125000_questatlas_guest_gateway.sql
select not has_function_privilege('anon','public.qatl_live_join(text,integer,text)','EXECUTE') as no_anon_join \gset
select not has_function_privilege('authenticated','public.qatl_live_view(text,text)','EXECUTE') as no_direct_teacher_view \gset
select not has_function_privilege('anon','public.qatl_live_submit(text,text,text)','EXECUTE') as no_anon_submit \gset
select has_function_privilege('service_role','public.qatl_live_submit(text,text,text)','EXECUTE') as gateway_submit \gset
select not has_function_privilege('anon','public.qatl_live_gateway_budget(text,text)','EXECUTE') as no_anon_budget \gset
select not has_table_privilege('anon','public.qatl_gateway_ip_budget','SELECT') as budget_not_public \gset
\if :no_anon_join
\else
  \echo 'FAIL anonymous guest still can bypass gateway'
  select 1/0;
\endif
\if :no_direct_teacher_view
\else
  select 1/0;
\endif
\if :no_anon_submit
\else
  select 1/0;
\endif
\if :gateway_submit
\else
  \echo 'FAIL gateway cannot perform guest RPC'
  select 1/0;
\endif
\if :no_anon_budget
\else
  select 1/0;
\endif
\if :budget_not_public
\else
  select 1/0;
\endif
\echo '[QuestAtlas Gateway] Direct guest RPC grants are revoked'
set role service_role;
select (public.qatl_live_gateway_budget(repeat('a',64),'join')) as first_join_allowed \gset
\if :first_join_allowed
  \echo '[QuestAtlas Gateway] Server role has IP budget access'
\else
  select 1/0;
\endif
select count(*) FILTER (WHERE NOT allowed)>0 as throttled from (
  select public.qatl_live_gateway_budget(repeat('a',64),'join') as allowed
    from generate_series(1,25)
) attempts \gset
\if :throttled
  \echo '[QuestAtlas Gateway] Sixteenth-plus requests per IP are limited'
\else
  select 1/0;
\endif
select count(*)=1 as quota_private from public.qatl_gateway_ip_budget
 where ip_hash=repeat('a',64) and action='join' \gset
\if :quota_private
  \echo '[QuestAtlas Gateway] Persistent per-IP bucket counts are stored in private table'
\else
  select 1/0;
\endif
reset role;
\echo '[QuestAtlas Gateway] Disposable privilege + abuse-budget tests PASS'
