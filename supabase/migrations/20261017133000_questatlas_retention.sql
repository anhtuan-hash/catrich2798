-- QuestAtlas operator-only cleanup. Staged: NO scheduled invocation, NO automatic deletion.
-- Default dry_run = true. Never touches student records outside qatl_* tables
-- or the append-only TTCM review ledger.
create function public.qatl_maintenance_cleanup(
  p_retention_days integer default 180,
  p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $qa_cleanup$
declare
  v_sessions integer;
  v_guest_budget integer;
  v_ip_budget integer;
  v_deleted_sessions integer := 0;
  v_deleted_guest_budget integer := 0;
  v_deleted_ip_budget integer := 0;
begin
  if p_retention_days not between 90 and 730 then
    raise exception 'Retention must be between 90 and 730 days';
  end if;
  select count(*) into v_sessions from public.qatl_live_sessions
    where expires_at < now()-make_interval(days=>p_retention_days);
  select count(*) into v_guest_budget from public.qatl_live_guest_budget
    where minute_bucket < now()-interval '3 days';
  select count(*) into v_ip_budget from public.qatl_gateway_ip_budget
    where minute_bucket < now()-interval '3 days';
  if not p_dry_run then
    delete from public.qatl_live_sessions
      where expires_at < now()-make_interval(days=>p_retention_days);
    get diagnostics v_deleted_sessions = row_count;
    delete from public.qatl_live_guest_budget
      where minute_bucket < now()-interval '3 days';
    get diagnostics v_deleted_guest_budget = row_count;
    delete from public.qatl_gateway_ip_budget
      where minute_bucket < now()-interval '3 days';
    get diagnostics v_deleted_ip_budget = row_count;
  end if;
  return jsonb_build_object(
    'dry_run',p_dry_run,'retention_days',p_retention_days,
    'eligible_sessions',v_sessions,'eligible_guest_buckets',v_guest_budget,
    'eligible_ip_buckets',v_ip_budget,
    'deleted_sessions',v_deleted_sessions,
    'deleted_guest_buckets',v_deleted_guest_budget,
    'deleted_ip_buckets',v_deleted_ip_budget);
end $qa_cleanup$;
revoke all on function public.qatl_maintenance_cleanup(integer,boolean)
  from public,anon,authenticated,service_role;
grant execute on function public.qatl_maintenance_cleanup(integer,boolean) to service_role;
