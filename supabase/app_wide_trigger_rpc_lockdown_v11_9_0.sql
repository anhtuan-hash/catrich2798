-- Brian app-wide hardening v11.9.0 · Sprint D1
-- Trigger functions must never be callable as public RPC endpoints.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and p.prorettype='pg_catalog.trigger'::regtype
  loop
    execute format('revoke execute on function %s from public',r.fn);
    execute format('revoke execute on function %s from anon',r.fn);
    execute format('revoke execute on function %s from authenticated',r.fn);
    execute format('grant execute on function %s to service_role',r.fn);
  end loop;
end $$;
