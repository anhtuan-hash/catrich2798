-- Brian app-wide hardening v11.9.0 · Sprint B
-- Normalize RLS auth.uid() calls into initplans so PostgreSQL evaluates the
-- current user once per statement instead of once per row.

do $$
declare
  r record;
  v_qual text;
  v_check text;
  v_sql text;
begin
  for r in
    select schemaname,tablename,policyname,qual,with_check
    from pg_policies
    where schemaname='public'
      and (
        coalesce(qual,'') like '%auth.uid()%'
        or coalesce(with_check,'') like '%auth.uid()%'
      )
  loop
    v_qual := r.qual;
    v_check := r.with_check;

    if v_qual is not null then
      v_qual := regexp_replace(v_qual,'\([[:space:]]*SELECT[[:space:]]+auth\.uid\(\)[[:space:]]+AS[[:space:]]+uid[[:space:]]*\)','__AUTH_UID__','gi');
      v_qual := regexp_replace(v_qual,'\([[:space:]]*SELECT[[:space:]]+auth\.uid\(\)[[:space:]]*\)','__AUTH_UID__','gi');
      v_qual := replace(v_qual,'auth.uid()','(select auth.uid())');
      v_qual := replace(v_qual,'__AUTH_UID__','(select auth.uid())');
    end if;

    if v_check is not null then
      v_check := regexp_replace(v_check,'\([[:space:]]*SELECT[[:space:]]+auth\.uid\(\)[[:space:]]+AS[[:space:]]+uid[[:space:]]*\)','__AUTH_UID__','gi');
      v_check := regexp_replace(v_check,'\([[:space:]]*SELECT[[:space:]]+auth\.uid\(\)[[:space:]]*\)','__AUTH_UID__','gi');
      v_check := replace(v_check,'auth.uid()','(select auth.uid())');
      v_check := replace(v_check,'__AUTH_UID__','(select auth.uid())');
    end if;

    v_sql := format('alter policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
    if v_qual is not null then v_sql := v_sql || format(' using (%s)',v_qual); end if;
    if v_check is not null then v_sql := v_sql || format(' with check (%s)',v_check); end if;
    execute v_sql;
  end loop;
end $$;
