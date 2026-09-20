
-- Brian app-wide hardening v11.9.0 · Sprint F3
-- Explicit anonymous SECURITY DEFINER allowlist. Everything else that is not
-- required by an anon/public RLS policy loses anonymous RPC execution.

do $$
declare
  r record;
  public_rpc_names text[] := array[
    'acknowledge_homeroom_notice',
    'classroom_get_public_state',
    'classroom_join_session',
    'classroom_ping_participant',
    'classroom_submit_response',
    'get_homeroom_portal',
    'hero_theme_public_manifest',
    'qb_public_practice_get',
    'qb_public_practice_submit',
    'submit_homeroom_portal_response',
    'submit_homeroom_subject_feedback'
  ];
begin
  for r in
    select p.oid::regprocedure as fn,p.proname
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and has_function_privilege('anon',p.oid,'EXECUTE')
      and not (p.proname=any(public_rpc_names))
      and not exists (
        select 1
        from pg_policies pol
        where pol.schemaname='public'
          and ('anon'::name=any(pol.roles) or 'public'::name=any(pol.roles))
          and (
            coalesce(pol.qual,'') ilike '%'||p.proname||'(%'
            or coalesce(pol.with_check,'') ilike '%'||p.proname||'(%'
          )
      )
  loop
    execute format('revoke execute on function %s from public',r.fn);
    execute format('revoke execute on function %s from anon',r.fn);
  end loop;
end $$;
