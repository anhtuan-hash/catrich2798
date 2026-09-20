
-- Brian app-wide hardening v11.9.0 · Sprint F1
-- Retarget legacy PUBLIC RLS policies that are authentication-dependent to
-- authenticated only. Anonymous public features use dedicated token/code RPCs.

do $$
declare
  r record;
  v_using text;
  v_check text;
begin
  for r in
    select *
    from pg_policies
    where schemaname='public'
      and roles=array['public']::name[]
      and tablename = any(array[
        'assessment_bank_snapshots',
        'assessment_blueprints',
        'assessment_bundle_versions',
        'assessment_bundles',
        'assessment_exam_batches',
        'assessment_item_versions',
        'assessment_items',
        'assessment_practice_attempts',
        'assessment_practice_items',
        'assessment_practice_responses',
        'assessment_practice_sets',
        'assessment_practice_share_tokens',
        'assessment_taxonomy_terms',
        'assessment_tests',
        'bes_extra_class_members',
        'bes_extra_classes',
        'department_monthly_report_settings',
        'department_monthly_reports',
        'department_teacher_sync',
        'department_team_workspaces',
        'library_items',
        'permission_requests',
        'profiles',
        'teacher_os_projects'
      ])
    order by tablename,policyname
  loop
    v_using := coalesce(r.qual,'true');
    v_check := coalesce(r.with_check,r.qual,'true');

    execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);

    if r.cmd='SELECT' then
      execute format(
        'create policy %I on %I.%I as %s for select to authenticated using (%s)',
        r.policyname,r.schemaname,r.tablename,r.permissive,v_using
      );
    elsif r.cmd='INSERT' then
      execute format(
        'create policy %I on %I.%I as %s for insert to authenticated with check (%s)',
        r.policyname,r.schemaname,r.tablename,r.permissive,v_check
      );
    elsif r.cmd='UPDATE' then
      execute format(
        'create policy %I on %I.%I as %s for update to authenticated using (%s) with check (%s)',
        r.policyname,r.schemaname,r.tablename,r.permissive,v_using,v_check
      );
    elsif r.cmd='DELETE' then
      execute format(
        'create policy %I on %I.%I as %s for delete to authenticated using (%s)',
        r.policyname,r.schemaname,r.tablename,r.permissive,v_using
      );
    elsif r.cmd='ALL' then
      execute format(
        'create policy %I on %I.%I as %s for all to authenticated using (%s) with check (%s)',
        r.policyname,r.schemaname,r.tablename,r.permissive,v_using,v_check
      );
    end if;
  end loop;
end $$;
