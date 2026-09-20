-- Brian app-wide hardening v11.9.0 · Sprint C
-- Add covering indexes for every currently unindexed foreign key in public.

do $$
declare
  r record;
  v_index_name text;
  v_columns text;
begin
  for r in
    with fk as (
      select
        c.oid,
        c.conname,
        n.nspname,
        t.relname as table_name,
        c.conrelid,
        c.conkey,
        array_agg(a.attname order by u.ord) as columns
      from pg_constraint c
      join pg_class t on t.oid=c.conrelid
      join pg_namespace n on n.oid=t.relnamespace
      join unnest(c.conkey) with ordinality u(attnum,ord) on true
      join pg_attribute a on a.attrelid=c.conrelid and a.attnum=u.attnum
      where c.contype='f' and n.nspname='public'
      group by c.oid,c.conname,n.nspname,t.relname,c.conrelid,c.conkey
    )
    select fk.*
    from fk
    where not exists (
      select 1
      from pg_index i
      where i.indrelid=fk.conrelid
        and i.indisvalid
        and i.indisready
        and i.indpred is null
        and (i.indkey::smallint[])[0:cardinality(fk.conkey)-1] = fk.conkey
    )
    order by table_name,conname
  loop
    v_index_name := left('fk_' || r.table_name || '_' || substr(md5(r.conname),1,8), 63);
    select string_agg(format('%I',c),', ') into v_columns
    from unnest(r.columns) c;

    execute format(
      'create index if not exists %I on %I.%I (%s)',
      v_index_name,
      r.nspname,
      r.table_name,
      v_columns
    );
  end loop;
end $$;
