-- Brian Reports | Batched revocation for TTCM
-- Reuses bes_revoke_learning_report_assignment, preserving its validation,
-- event-recipient cleanup, audit, and protection of teacher work.
create or replace function public.bes_bulk_revoke_learning_report_assignments(
 p_task_ids uuid[]
) returns jsonb
language plpgsql volatile security definer set search_path=''
as $fn$
declare
  v_actor uuid:=(select auth.uid());
  v_id uuid;
  v_result jsonb;
  v_removed jsonb:='[]'::jsonb;
  v_skipped jsonb:='[]'::jsonb;
begin
  if v_actor is null or not (select public.can_manage_brian_team()) then
    raise exception 'Only TTCM can revoke report assignments';
  end if;
  if p_task_ids is null or cardinality(p_task_ids)<1 or cardinality(p_task_ids)>100
    or cardinality(p_task_ids)<>(select count(distinct x) from unnest(p_task_ids) x)
    or array_position(p_task_ids,null) is not null
  then raise exception 'Select 1 to 100 distinct report assignments'; end if;
  -- Reject all if any requested ID belongs to a different TTCM. Do not leak
  -- task metadata and do not permit mixed-ownership requests.
  if exists(
    select 1 from unnest(p_task_ids) i
    join public.bes_learning_report_tasks t on t.id=i
    where t.head_id<>v_actor
  ) then raise exception 'Task outside your assigned department'; end if;

  foreach v_id in array p_task_ids loop
    begin
      v_result:=public.bes_revoke_learning_report_assignment(v_id);
      v_removed:=v_removed||jsonb_build_array(v_result);
    exception when raise_exception then
      -- Protect submitted/reviewed/written reports without failing the whole
      -- batch; the caller receives the exact skipped IDs for follow-up.
      v_skipped:=v_skipped||jsonb_build_array(jsonb_build_object(
        'taskId',v_id,'reason',SQLERRM));
    end;
  end loop;
  return jsonb_build_object('removedCount',jsonb_array_length(v_removed),
    'skippedCount',jsonb_array_length(v_skipped),
    'removed',v_removed,'skipped',v_skipped);
end $fn$;
revoke all on function public.bes_bulk_revoke_learning_report_assignments(uuid[]) from public,anon;
grant execute on function public.bes_bulk_revoke_learning_report_assignments(uuid[]) to authenticated;
