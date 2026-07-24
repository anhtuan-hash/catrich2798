-- Brian English Studio — Cloudflare migration phase 0
-- READ-ONLY INVENTORY. This script does not create, update, or delete anything.
-- Run the whole file in Supabase Dashboard > SQL Editor.

-- 1. Public tables and views, estimated rows and disk size
select
  n.nspname as schema_name,
  c.relname as object_name,
  case c.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned table'
    when 'v' then 'view'
    when 'm' then 'materialized view'
    else c.relkind::text
  end as object_type,
  greatest(c.reltuples::bigint, 0) as estimated_rows,
  pg_total_relation_size(c.oid) as total_bytes,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v', 'm')
order by pg_total_relation_size(c.oid) desc, c.relname;

-- 2. Storage buckets, file count and approximate stored bytes
select
  b.id as bucket_id,
  b.name as bucket_name,
  b.public,
  count(o.id) as file_count,
  coalesce(sum(
    case
      when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (o.metadata ->> 'size')::bigint
      else 0
    end
  ), 0) as stored_bytes,
  pg_size_pretty(coalesce(sum(
    case
      when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
        then (o.metadata ->> 'size')::bigint
      else 0
    end
  ), 0)) as stored_size,
  b.file_size_limit,
  b.allowed_mime_types
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
 group by b.id, b.name, b.public, b.file_size_limit, b.allowed_mime_types
order by stored_bytes desc, b.name;

-- 3. Tables currently included in Supabase Realtime publications
select
  pubname as publication_name,
  schemaname as schema_name,
  tablename as table_name
from pg_publication_tables
where schemaname = 'public'
order by pubname, tablename;

-- 4. Database functions in the public schema
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  case p.provolatile
    when 'i' then 'immutable'
    when 's' then 'stable'
    else 'volatile'
  end as volatility,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;

-- 5. Non-internal triggers on public tables
select
  event_object_schema as schema_name,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;

-- 6. Row Level Security policies
select
  schemaname as schema_name,
  tablename as table_name,
  policyname as policy_name,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as check_expression
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 7. Installed PostgreSQL extensions
select
  extname as extension_name,
  extversion as version
from pg_extension
order by extname;

-- 8. Scheduled cron jobs, when pg_cron is installed and accessible
-- This block safely returns an empty result when the cron schema is unavailable.
do $$
begin
  if to_regclass('cron.job') is null then
    raise notice 'pg_cron/cron.job is not installed or is not visible.';
  end if;
end $$;

select
  jobid,
  schedule,
  command,
  nodename,
  database,
  username,
  active,
  jobname
from cron.job
where to_regclass('cron.job') is not null
order by jobid;
