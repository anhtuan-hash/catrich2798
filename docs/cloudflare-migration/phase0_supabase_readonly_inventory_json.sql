-- Brian English Studio — Cloudflare migration phase 0
-- ONE-CLICK READ-ONLY INVENTORY.
-- This query only reads metadata. It does not create, update, or delete anything.

with
public_objects as (
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
),
storage_inventory as (
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
),
realtime_inventory as (
  select
    pubname as publication_name,
    schemaname as schema_name,
    tablename as table_name
  from pg_publication_tables
  where schemaname = 'public'
),
function_inventory as (
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
),
trigger_inventory as (
  select
    event_object_schema as schema_name,
    event_object_table as table_name,
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
  from information_schema.triggers
  where event_object_schema = 'public'
),
policy_inventory as (
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
),
extension_inventory as (
  select
    extname as extension_name,
    extversion as version
  from pg_extension
)
select jsonb_pretty(jsonb_build_object(
  'generated_at', now(),
  'project_database', current_database(),
  'auth_user_count', (select count(*) from auth.users),
  'public_objects', coalesce((
    select jsonb_agg(to_jsonb(row_value) order by row_value.total_bytes desc, row_value.object_name)
    from public_objects row_value
  ), '[]'::jsonb),
  'storage_buckets', coalesce((
    select jsonb_agg(to_jsonb(row_value) order by row_value.stored_bytes desc, row_value.bucket_name)
    from storage_inventory row_value
  ), '[]'::jsonb),
  'realtime_tables', coalesce((
    select jsonb_agg(to_jsonb(row_value) order by row_value.publication_name, row_value.table_name)
    from realtime_inventory row_value
  ), '[]'::jsonb),
  'database_functions', coalesce((
    select jsonb_agg(to_jsonb(row_value) order by row_value.function_name, row_value.arguments)
    from function_inventory row_value
  ), '[]'::jsonb),
  'database_triggers', coalesce((
    select jsonb_agg(to_jsonb(row_value) order by row_value.table_name, row_value.trigger_name)
    from trigger_inventory row_value
  ), '[]'::jsonb),
  'rls_policies', coalesce((
    select jsonb_agg(to_jsonb(row_value) order by row_value.schema_name, row_value.table_name, row_value.policy_name)
    from policy_inventory row_value
  ), '[]'::jsonb),
  'extensions', coalesce((
    select jsonb_agg(to_jsonb(row_value) order by row_value.extension_name)
    from extension_inventory row_value
  ), '[]'::jsonb),
  'cron_job_table_visible', to_regclass('cron.job') is not null
)) as brian_phase0_inventory;
