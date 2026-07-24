-- Brian English Studio
-- Non-destructive audit for tables that appear unused by the current runtime.
-- Run this file in Supabase SQL Editor. It DOES NOT modify or delete data.
--
-- Important:
-- 1. Repository references alone cannot prove that a live table is safe to drop.
-- 2. Confirm row counts, recent statistics, foreign keys and function dependencies first.
-- 3. PostgreSQL statistics may have been reset, so zero scans are supporting evidence only.

with candidates(table_name, confidence, reason) as (
  values
    ('ai_workspace_projects', 'high', 'Brian AI Workspace route and runtime were removed'),
    ('ai_workspace_messages', 'high', 'Child table of the removed Brian AI Workspace'),
    ('content_factory_projects', 'high', 'Content Factory runtime was removed'),
    ('lesson_packs', 'high', 'Legacy connected-teaching module has no current runtime reference'),
    ('lesson_pack_items', 'high', 'Child table of legacy lesson_packs'),
    ('teacher_os_projects', 'high', 'Teacher OS project module has no current runtime reference'),
    ('department_workspace_snapshots', 'high', 'Legacy Department snapshot model replaced by Work Hub and current department modules'),
    ('department_submission_requests', 'high', 'Legacy Department submission workflow replaced by Work Hub assignment delivery'),
    ('department_submissions', 'high', 'Legacy Department submission workflow replaced by Work Hub assignment delivery'),
    ('content_ecosystem_runs', 'high', 'Current Content Ecosystem reads assets and kits only'),
    ('resource_categories', 'high', 'Current resource categories are supplied by application configuration'),
    ('resource_comments', 'high', 'Current Knowledge Hub does not read or write this table'),
    ('resource_favorites', 'high', 'Favorites are stored in resource_user_state'),
    ('resource_saved_searches', 'high', 'No current Knowledge Hub runtime reference'),
    ('resource_index_jobs', 'high', 'No current index worker or runtime reference'),
    ('ai_runtime_settings', 'high', 'AI features and OpenRouter runtime were removed from Brian'),
    ('ai_usage_daily', 'high', 'Quota table for the removed OpenRouter runtime'),

    ('bes_homeroom_students', 'review', 'Normalized Phase 3 table; current app still stores workspace data in bes_homeroom_workspaces JSON'),
    ('bes_homeroom_attendance', 'review', 'Normalized Phase 3 table with no direct current runtime reference'),
    ('bes_homeroom_learning_records', 'review', 'Normalized Phase 3 table with no direct current runtime reference'),
    ('bes_homeroom_incidents', 'review', 'Normalized Phase 3 table with no direct current runtime reference'),
    ('bes_homeroom_parent_contacts', 'review', 'Normalized Phase 3 table with no direct current runtime reference'),
    ('bes_homeroom_announcements', 'review', 'Normalized Phase 3 table with no direct current runtime reference'),
    ('bes_homeroom_documents', 'review', 'Normalized Phase 3 table with no direct current runtime reference'),
    ('bes_homeroom_audit_logs', 'review', 'Defined for Phase 3 auditing but not currently called by the app'),
    ('bes_homeroom_backups', 'review', 'Defined for normalized backups but current workspace backup remains JSON-based')
),
relations as (
  select
    c.table_name,
    c.confidence,
    c.reason,
    cls.oid as relation_oid,
    cls.relrowsecurity as rls_enabled,
    st.n_live_tup,
    st.n_dead_tup,
    st.seq_scan,
    st.idx_scan,
    st.n_tup_ins,
    st.n_tup_upd,
    st.n_tup_del,
    st.last_vacuum,
    st.last_autovacuum,
    st.last_analyze,
    st.last_autoanalyze
  from candidates c
  left join pg_namespace ns on ns.nspname = 'public'
  left join pg_class cls on cls.relnamespace = ns.oid and cls.relname = c.table_name and cls.relkind in ('r','p')
  left join pg_stat_user_tables st on st.schemaname = 'public' and st.relname = c.table_name
)
select
  r.table_name,
  r.confidence,
  case when r.relation_oid is null then 'not_present' else 'present' end as live_status,
  coalesce(r.n_live_tup, 0) as estimated_live_rows,
  coalesce(r.n_dead_tup, 0) as estimated_dead_rows,
  case when r.relation_oid is null then 0 else pg_total_relation_size(r.relation_oid) end as total_bytes,
  case when r.relation_oid is null then '0 bytes' else pg_size_pretty(pg_total_relation_size(r.relation_oid)) end as total_size,
  coalesce(r.seq_scan, 0) as seq_scans_since_stats_reset,
  coalesce(r.idx_scan, 0) as index_scans_since_stats_reset,
  coalesce(r.n_tup_ins, 0) as inserts_since_stats_reset,
  coalesce(r.n_tup_upd, 0) as updates_since_stats_reset,
  coalesce(r.n_tup_del, 0) as deletes_since_stats_reset,
  r.rls_enabled,
  (
    select count(*)
    from pg_policies p
    where p.schemaname = 'public' and p.tablename = r.table_name
  ) as policy_count,
  exists (
    select 1
    from pg_publication_tables pt
    where pt.schemaname = 'public' and pt.tablename = r.table_name
  ) as in_realtime_publication,
  (
    select count(*)
    from pg_constraint fk
    where fk.contype = 'f' and fk.conrelid = r.relation_oid
  ) as outbound_foreign_keys,
  (
    select count(*)
    from pg_constraint fk
    where fk.contype = 'f' and fk.confrelid = r.relation_oid
  ) as inbound_foreign_keys,
  (
    select count(*)
    from information_schema.view_table_usage v
    where v.table_schema = 'public' and v.table_name = r.table_name
  ) as dependent_views,
  (
    select count(*)
    from pg_proc p
    join pg_namespace pn on pn.oid = p.pronamespace
    where pn.nspname = 'public'
      and pg_get_functiondef(p.oid) ilike '%' || r.table_name || '%'
  ) as routines_mentioning_table,
  r.last_vacuum,
  r.last_autovacuum,
  r.last_analyze,
  r.last_autoanalyze,
  r.reason
from relations r
order by
  case r.confidence when 'high' then 1 else 2 end,
  r.table_name;

-- Complete public-table inventory. Use this second result to catch tables that
-- exist in the live project but were never committed to the repository.
select
  st.relname as table_name,
  st.n_live_tup as estimated_live_rows,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', st.schemaname, st.relname)::regclass)) as total_size,
  st.seq_scan,
  st.idx_scan,
  st.n_tup_ins,
  st.n_tup_upd,
  st.n_tup_del,
  exists (
    select 1 from pg_publication_tables pt
    where pt.schemaname = st.schemaname and pt.tablename = st.relname
  ) as in_realtime_publication
from pg_stat_user_tables st
where st.schemaname = 'public'
order by pg_total_relation_size(format('%I.%I', st.schemaname, st.relname)::regclass) desc;

-- Do not drop these indirect dependencies even when there is no direct .from()
-- call in the frontend:
--   api_rate_limits             used by bes_v1099_consume_ai_quota RPC
--   bes_homeroom_portal_attempts used by get_homeroom_portal RPC
--   bes_schema_registry         used by migration and verification scripts
