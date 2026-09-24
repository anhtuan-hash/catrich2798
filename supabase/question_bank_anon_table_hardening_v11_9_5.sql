-- Brian Question Bank · direct anon table privilege hardening
-- Public Practice is exposed only through token-gated SECURITY DEFINER RPCs.

do $$
declare r record;
begin
  for r in
    select quote_ident(n.nspname) schema_name, quote_ident(c.relname) table_name
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind in ('r','p')
      and c.relname like 'assessment_%'
  loop
    execute format('revoke all privileges on table %s.%s from anon', r.schema_name, r.table_name);
  end loop;
end $$;

-- Public student practice remains mediated by these token-validated RPCs.
revoke execute on function public.qb_public_practice_get(text) from public;
grant execute on function public.qb_public_practice_get(text) to anon,authenticated;

revoke execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) from public;
grant execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) to anon,authenticated;
