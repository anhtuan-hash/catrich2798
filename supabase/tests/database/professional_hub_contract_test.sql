-- Phase 2.2B
-- Runtime catalog-driven contract test.
-- PostgreSQL catalog is authoritative after every migration is applied.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

create temporary view professional_hub_contract_tables as
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.oid as relation_oid,
  c.relrowsecurity as rls_enabled,
  pg_get_userbyid(c.relowner) as owner_name
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n
  on n.oid = c.relnamespace
where c.relkind in ('r', 'p')
  and (
    n.nspname = 'professional_hub'
    or (
      n.nspname = 'public'
      and c.relname like 'professional_hub%'
    )
  );

create temporary view professional_hub_contract_functions as
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.oid as function_oid,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as owner_name
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n
  on n.oid = p.pronamespace
where
  n.nspname = 'professional_hub'
  or (
    n.nspname = 'public'
    and p.proname like 'professional_hub%'
  );

select plan(10);

select diag(
  'Hub tables discovered at runtime ('
  || (select count(*)::text from professional_hub_contract_tables)
  || '): '
  || coalesce(
    (
      select string_agg(
        format('%I.%I', schema_name, table_name),
        ', '
        order by schema_name, table_name
      )
      from professional_hub_contract_tables
    ),
    'none'
  )
);

select diag(
  'Direct API-role DML grants (RLS remains authoritative): '
  || coalesce(
    (
      select string_agg(
        distinct format(
          '%s:%s on %I.%I',
          lower(g.grantee),
          g.privilege_type,
          g.table_schema,
          g.table_name
        ),
        ', '
        order by format(
          '%s:%s on %I.%I',
          lower(g.grantee),
          g.privilege_type,
          g.table_schema,
          g.table_name
        )
      )
      from information_schema.role_table_grants g
      join professional_hub_contract_tables t
        on t.schema_name = g.table_schema
       and t.table_name = g.table_name
      where lower(g.grantee) in ('anon', 'authenticated', 'public')
        and g.privilege_type in (
          'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'
        )
    ),
    'none'
  )
);

select diag(
  'SECURITY DEFINER functions discovered: '
  || coalesce(
    (
      select string_agg(
        format('%I.%I', schema_name, function_name),
        ', '
        order by schema_name, function_name
      )
      from professional_hub_contract_functions
      where security_definer
    ),
    'none'
  )
);

select ok(
  (select count(*) from professional_hub_contract_tables)
    >= 9,
  'Runtime catalog contains at least the verifier baseline of '
    || 9::text
    || ' Hub tables'
);

select ok(
  (select count(*) from professional_hub_contract_tables where rls_enabled)
    >= 9,
  'Runtime catalog contains at least the verifier baseline of '
    || 9::text
    || ' RLS-enabled Hub tables'
);

select ok(
  not exists (
    select 1
    from professional_hub_contract_tables
    where not rls_enabled
  ),
  'Every runtime Hub table has RLS enabled'
);

select ok(
  not exists (
    select 1
    from professional_hub_contract_tables t
    where not exists (
      select 1
      from pg_catalog.pg_policies p
      where p.schemaname = t.schema_name
        and p.tablename = t.table_name
    )
  ),
  'Every runtime Hub table has at least one RLS policy'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_roles r
    where r.rolname in ('anon', 'authenticated')
      and (r.rolsuper or r.rolbypassrls)
  ),
  'Supabase API roles cannot bypass RLS'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_policies p
    join professional_hub_contract_tables t
      on t.schema_name = p.schemaname
     and t.table_name = p.tablename
    where
      coalesce(p.qual, '') ~* '(^|[^a-z])true([^a-z]|$)'
      or coalesce(p.with_check, '') ~* '(^|[^a-z])true([^a-z]|$)'
  ),
  'No Hub policy opens access with a bare TRUE expression'
);

select ok(
  exists (
    select 1
    from professional_hub_contract_tables
    where
      table_name = 'audit_log'
      or table_name like '%audit_log%'
  ),
  'Professional Hub has an audit-log table'
);

select ok(
  (select count(*) > 0 from professional_hub_contract_functions),
  'PostgreSQL discovers Professional Hub functions'
);

select ok(
  not exists (
    select 1
    from information_schema.routine_privileges g
    join professional_hub_contract_functions f
      on f.schema_name = g.routine_schema
     and f.function_name = g.routine_name
    where f.security_definer
      and lower(g.grantee) in ('anon', 'public')
      and g.privilege_type = 'EXECUTE'
  ),
  'Anon and PUBLIC cannot execute SECURITY DEFINER Hub functions'
);

select ok(
  not exists (
    select 1
    from professional_hub_contract_functions f
    join pg_catalog.pg_proc p
      on p.oid = f.function_oid
    where p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  ),
  'Every SECURITY DEFINER Hub function locks search_path'
);

select * from finish();
rollback;
