
-- Brian app-wide hardening v11.9.0 · Sprint E2
-- Consolidate same-role permissive policies by OR-ing their predicates.
-- This is semantics-preserving: PostgreSQL already ORs permissive policies.

do $$
declare
  r record;
  p_name text;
  v_roles text;
  v_using text;
  v_check text;
  v_new_name text;
begin
  for r in
    select
      schemaname,
      tablename,
      cmd,
      roles,
      array_agg(policyname order by policyname) as policy_names,
      count(*) as policy_count
    from pg_policies
    where schemaname='public'
      and permissive='PERMISSIVE'
      and tablename = any(array[
        'bes_lesson_integration_projects',
        'custom_app_links',
        'custom_game_platforms',
        'independent_chatbot_settings',
        'library_items',
        'permission_requests',
        'profiles',
        'work_hub_activity',
        'work_hub_comments',
        'work_hub_items',
        'work_hub_notifications'
      ])
    group by schemaname,tablename,cmd,roles
    having count(*) > 1
    order by tablename,cmd
  loop
    select string_agg(format('%I',role_name),', ')
      into v_roles
    from unnest(r.roles) role_name;

    select string_agg('(' || coalesce(p.qual,'true') || ')',' OR ' order by p.policyname)
      into v_using
    from pg_policies p
    where p.schemaname=r.schemaname
      and p.tablename=r.tablename
      and p.cmd=r.cmd
      and p.roles=r.roles
      and p.permissive='PERMISSIVE';

    select string_agg(
      '(' || coalesce(p.with_check,p.qual,'true') || ')',
      ' OR ' order by p.policyname
    )
      into v_check
    from pg_policies p
    where p.schemaname=r.schemaname
      and p.tablename=r.tablename
      and p.cmd=r.cmd
      and p.roles=r.roles
      and p.permissive='PERMISSIVE';

    v_new_name := left('consolidated_' || r.tablename || '_' || lower(r.cmd),48)
      || '_' || substr(md5(r.tablename || ':' || r.cmd || ':' || r.roles::text),1,8)
      || '_v1190';

    execute format('drop policy if exists %I on %I.%I',v_new_name,r.schemaname,r.tablename);

    if r.cmd='SELECT' then
      execute format(
        'create policy %I on %I.%I as permissive for select to %s using (%s)',
        v_new_name,r.schemaname,r.tablename,v_roles,v_using
      );
    elsif r.cmd='INSERT' then
      execute format(
        'create policy %I on %I.%I as permissive for insert to %s with check (%s)',
        v_new_name,r.schemaname,r.tablename,v_roles,v_check
      );
    elsif r.cmd='UPDATE' then
      execute format(
        'create policy %I on %I.%I as permissive for update to %s using (%s) with check (%s)',
        v_new_name,r.schemaname,r.tablename,v_roles,v_using,v_check
      );
    elsif r.cmd='DELETE' then
      execute format(
        'create policy %I on %I.%I as permissive for delete to %s using (%s)',
        v_new_name,r.schemaname,r.tablename,v_roles,v_using
      );
    else
      continue;
    end if;

    foreach p_name in array r.policy_names loop
      execute format('drop policy %I on %I.%I',p_name,r.schemaname,r.tablename);
    end loop;
  end loop;
end $$;
