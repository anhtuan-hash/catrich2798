
-- Brian app-wide hardening v11.9.0 · Sprint E1
-- Split broad ALL policies into INSERT/UPDATE/DELETE when a dedicated SELECT
-- policy already exists. This preserves write semantics while removing duplicate
-- SELECT evaluation paths.

do $$
declare
  r record;
  v_roles text;
  v_using text;
  v_check text;
  v_base text;
  v_insert text;
  v_update text;
  v_delete text;
begin
  for r in
    select p.*
    from pg_policies p
    where p.schemaname='public'
      and p.cmd='ALL'
      and p.permissive='PERMISSIVE'
      and p.tablename = any(array[
        'ai_governance_settings',
        'assessment_blueprints',
        'assessment_bundle_versions',
        'assessment_exam_batches',
        'assessment_item_versions',
        'assessment_practice_items',
        'assessment_practice_sets',
        'assessment_taxonomy_terms',
        'assessment_test_items',
        'assessment_tests',
        'bes_schema_registry',
        'department_monthly_report_settings',
        'learning_interventions',
        'learning_mastery',
        'learning_practice_sets',
        'permission_overrides',
        'resource_categories',
        'system_roles'
      ])
      and exists (
        select 1
        from pg_policies s
        where s.schemaname=p.schemaname
          and s.tablename=p.tablename
          and s.cmd='SELECT'
      )
    order by p.tablename,p.policyname
  loop
    select string_agg(format('%I',role_name),', ')
      into v_roles
    from unnest(r.roles) role_name;

    v_using := coalesce(r.qual,'true');
    v_check := coalesce(r.with_check,r.qual,'true');
    v_base := left(r.policyname,40) || '_' || substr(md5(r.policyname),1,6);
    v_insert := v_base || '_ins_v1190';
    v_update := v_base || '_upd_v1190';
    v_delete := v_base || '_del_v1190';

    execute format('drop policy if exists %I on %I.%I',v_insert,r.schemaname,r.tablename);
    execute format('drop policy if exists %I on %I.%I',v_update,r.schemaname,r.tablename);
    execute format('drop policy if exists %I on %I.%I',v_delete,r.schemaname,r.tablename);

    execute format(
      'create policy %I on %I.%I as permissive for insert to %s with check (%s)',
      v_insert,r.schemaname,r.tablename,v_roles,v_check
    );
    execute format(
      'create policy %I on %I.%I as permissive for update to %s using (%s) with check (%s)',
      v_update,r.schemaname,r.tablename,v_roles,v_using,v_check
    );
    execute format(
      'create policy %I on %I.%I as permissive for delete to %s using (%s)',
      v_delete,r.schemaname,r.tablename,v_roles,v_using
    );

    execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;
