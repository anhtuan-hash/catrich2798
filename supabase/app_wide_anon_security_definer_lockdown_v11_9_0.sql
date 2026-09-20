-- Brian app-wide hardening v11.9.0 · Sprint D2
-- SECURITY DEFINER functions that explicitly require auth.uid() must not be
-- exposed to the anonymous API role.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as fn,pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and has_function_privilege('anon',p.oid,'EXECUTE')
      and pg_get_functiondef(p.oid) ~* 'if[[:space:]]+auth\.uid\(\)[[:space:]]+is[[:space:]]+null'
  loop
    execute format('revoke execute on function %s from public',r.fn);
    execute format('revoke execute on function %s from anon',r.fn);
    execute format('grant execute on function %s to authenticated',r.fn);
    execute format('grant execute on function %s to service_role',r.fn);
  end loop;
end $$;
