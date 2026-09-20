-- Brian app-wide hardening v11.9.0 · Sprint D3
-- Remove anonymous access from authenticated-only RPCs and lock internal worker
-- helpers to service_role. Also bind department sync to the signed-in actor.

do $$
declare
  f regprocedure;
  funcs regprocedure[] := array[
    'public.bes_ai_reserve_quota_v1167(uuid,integer,integer,bigint,bigint,bigint)'::regprocedure,
    'public.bes_ai_settle_quota_v1167(uuid,bigint,bigint,boolean)'::regprocedure,
    'public.bes_department_list_teacher_accounts()'::regprocedure,
    'public.bes_gradebook_health()'::regprocedure,
    'public.bes_monthly_report_context()'::regprocedure,
    'public.bes_monthly_report_membership(uuid,text,uuid)'::regprocedure,
    'public.bes_my_brian_assignments()'::regprocedure,
    'public.bes_update_own_profile(jsonb)'::regprocedure,
    'public.bes_v1093_is_approved_user(uuid)'::regprocedure,
    'public.bes_v1097_cloud_status()'::regprocedure,
    'public.bes_v1097_worker_tick(integer)'::regprocedure,
    'public.bes_v1099_consume_ai_quota(uuid,text,text,integer,integer)'::regprocedure,
    'public.bes_v1099_create_snapshot(text,text,integer)'::regprocedure,
    'public.bes_v1099_current_role(uuid)'::regprocedure,
    'public.bes_v1099_restore_snapshot(uuid,boolean)'::regprocedure,
    'public.bes_v1133_submit_work_response(uuid,text,jsonb)'::regprocedure,
    'public.bes_v1237_get_ai_governance_settings()'::regprocedure,
    'public.bes_v1237_ingest_ai_events(jsonb)'::regprocedure,
    'public.can_take_extra_class_attendance()'::regprocedure,
    'public.department_role(uuid)'::regprocedure,
    'public.get_my_assigned_school_classes()'::regprocedure,
    'public.hero_theme_publish_draft(uuid)'::regprocedure,
    'public.hero_theme_restore_revision(uuid)'::regprocedure,
    'public.learning_rebuild_mastery(uuid)'::regprocedure,
    'public.work_hub_my_context()'::regprocedure,
    'public.work_hub_transition_item(uuid,text,text)'::regprocedure
  ];
begin
  foreach f in array funcs loop
    execute format('revoke execute on function %s from public',f);
    execute format('revoke execute on function %s from anon',f);
    execute format('grant execute on function %s to authenticated',f);
    execute format('grant execute on function %s to service_role',f);
  end loop;
end $$;

do $$
declare
  f regprocedure;
  funcs regprocedure[] := array[
    'public.bes_v1097_create_delivery(uuid,uuid,text,text,text,text,jsonb)'::regprocedure,
    'public.bes_v1097_enqueue_due_rules()'::regprocedure,
    'public.bes_v1097_execute_job(uuid,boolean)'::regprocedure,
    'public.bes_v1097_generate_digests()'::regprocedure,
    'public.bes_v1098_purge_expired_deleted_items()'::regprocedure,
    'public.bes_v1133_notify_work_users(uuid,uuid[],text,text,text,uuid)'::regprocedure,
    'public.work_hub_notify_users(uuid,uuid[],text,text,text,uuid)'::regprocedure
  ];
begin
  foreach f in array funcs loop
    execute format('revoke execute on function %s from public',f);
    execute format('revoke execute on function %s from anon',f);
    execute format('revoke execute on function %s from authenticated',f);
    execute format('grant execute on function %s to service_role',f);
  end loop;
end $$;

create or replace function public.bes_sync_department_teacher_rows(
  p_owner_id uuid,
  p_payload jsonb,
  p_source_updated_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication is required.' using errcode='42501';
  end if;

  if p_owner_id is null then
    raise exception 'Owner is required.' using errcode='22004';
  end if;

  if p_owner_id <> v_actor and not public.is_admin() then
    raise exception 'Cannot sync another user department workspace.' using errcode='42501';
  end if;

  if p_owner_id = v_actor
     and not (public.can_manage_brian_team() or public.is_admin()) then
    raise exception 'Department management permission is required.' using errcode='42501';
  end if;

  delete from public.department_teacher_sync
  where department_head_id = p_owner_id;

  insert into public.department_teacher_sync (
    department_head_id,department_id,teacher_id,department_name,department_short_name,
    member,assignments,document_requirements,absences,evaluations,source_updated_at,synced_at
  )
  select
    p_owner_id,
    d ->> 'id',
    p.id,
    coalesce(nullif(d ->> 'name', ''), 'Tổ chuyên môn'),
    coalesce(nullif(d ->> 'shortName', ''), nullif(d ->> 'name', ''), 'Tổ'),
    m,
    coalesce((
      select jsonb_agg(a order by coalesce(a ->> 'dueDate', ''), coalesce(a ->> 'title', ''))
      from jsonb_array_elements(coalesce(d -> 'assignments', '[]'::jsonb)) a
      where exists (
        select 1
        from jsonb_array_elements_text(coalesce(a -> 'assigneeIds', '[]'::jsonb)) assignee_id
        where assignee_id = m ->> 'id'
      )
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(doc order by coalesce(doc ->> 'dueDate', ''), coalesce(doc ->> 'title', ''))
      from jsonb_array_elements(coalesce(d -> 'documentRequirements', '[]'::jsonb)) doc
      where doc ->> 'memberId' = m ->> 'id'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(entry order by coalesce(entry ->> 'date', ''))
      from jsonb_array_elements(coalesce(d -> 'absences', '[]'::jsonb)) entry
      where entry ->> 'memberId' = m ->> 'id'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(entry order by coalesce(entry ->> 'date', ''))
      from jsonb_array_elements(coalesce(d -> 'evaluations', '[]'::jsonb)) entry
      where entry ->> 'memberId' = m ->> 'id'
    ), '[]'::jsonb),
    p_source_updated_at,
    now()
  from jsonb_array_elements(coalesce(p_payload -> 'departments', '[]'::jsonb)) d
  cross join lateral jsonb_array_elements(coalesce(d -> 'members', '[]'::jsonb)) m
  join public.profiles p on p.id::text = m ->> 'teacherAccountId'
  where coalesce(d ->> 'id', '') <> ''
  on conflict (department_head_id, department_id, teacher_id)
  do update set
    department_name = excluded.department_name,
    department_short_name = excluded.department_short_name,
    member = excluded.member,
    assignments = excluded.assignments,
    document_requirements = excluded.document_requirements,
    absences = excluded.absences,
    evaluations = excluded.evaluations,
    source_updated_at = excluded.source_updated_at,
    synced_at = now();
end;
$function$;

revoke execute on function public.bes_sync_department_teacher_rows(uuid,jsonb,timestamptz) from public;
revoke execute on function public.bes_sync_department_teacher_rows(uuid,jsonb,timestamptz) from anon;
grant execute on function public.bes_sync_department_teacher_rows(uuid,jsonb,timestamptz) to authenticated;
grant execute on function public.bes_sync_department_teacher_rows(uuid,jsonb,timestamptz) to service_role;
