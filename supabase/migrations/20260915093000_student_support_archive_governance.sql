begin;

create or replace function public.bes_archive_student_support_case(p_case_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_case public.student_support_cases%rowtype;
  v_deleted_id uuid;
  v_action_ids jsonb := '[]'::jsonb;
  v_note_ids jsonb := '[]'::jsonb;
  v_contact_ids jsonb := '[]'::jsonb;
  v_event_ids jsonb := '[]'::jsonb;
  v_alert_ids jsonb := '[]'::jsonb;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select * into v_case
  from public.student_support_cases
  where id = p_case_id
  for update;

  if not found then
    raise exception 'Student Support case not found';
  end if;

  if not (
    public.is_admin()
    or private.student_support_can_manage_workspace(v_case.homeroom_workspace_id)
  ) then
    raise exception 'Not authorized to archive this Student Support case';
  end if;

  if v_case.archived_at is not null then
    select id into v_deleted_id
    from public.deleted_items
    where entity_type = 'student_support_case'
      and entity_id = p_case_id::text
      and status = 'deleted'
    order by created_at desc
    limit 1;
    return v_deleted_id;
  end if;

  select coalesce(jsonb_agg(id order by created_at), '[]'::jsonb)
    into v_action_ids
  from public.student_support_actions where case_id = p_case_id;

  select coalesce(jsonb_agg(id order by created_at), '[]'::jsonb)
    into v_note_ids
  from public.student_support_notes where case_id = p_case_id;

  select coalesce(jsonb_agg(id order by created_at), '[]'::jsonb)
    into v_contact_ids
  from public.student_support_family_contacts where case_id = p_case_id;

  select coalesce(jsonb_agg(id order by created_at), '[]'::jsonb)
    into v_event_ids
  from public.student_support_case_events where case_id = p_case_id;

  select coalesce(jsonb_agg(id order by created_at), '[]'::jsonb)
    into v_alert_ids
  from public.student_support_alerts where linked_case_id = p_case_id;

  update public.student_support_cases
  set archived_at = now()
  where id = p_case_id;

  insert into public.student_support_case_events (
    case_id, student_ref, homeroom_workspace_id, actor_id,
    event_type, from_status, to_status, metadata
  ) values (
    p_case_id, v_case.student_ref, v_case.homeroom_workspace_id, v_actor,
    'CASE_ARCHIVED', v_case.status, v_case.status,
    jsonb_build_object('archived_at', now())
  );

  insert into public.deleted_items (
    entity_type, entity_id, title, source_module, deleted_by,
    payload, restore_payload, status, expires_at
  ) values (
    'student_support_case',
    p_case_id::text,
    v_case.title,
    'student-support',
    v_actor,
    jsonb_build_object(
      'id', v_case.id,
      'student_ref', v_case.student_ref,
      'homeroom_workspace_id', v_case.homeroom_workspace_id,
      'source_class_name', v_case.source_class_name,
      'school_year', v_case.school_year,
      'category', v_case.category,
      'status', v_case.status,
      'owner_id', v_case.owner_id,
      'created_by', v_case.created_by,
      'created_at', v_case.created_at,
      'updated_at', v_case.updated_at,
      'action_ids', v_action_ids,
      'note_ids', v_note_ids,
      'family_contact_ids', v_contact_ids,
      'event_ids', v_event_ids,
      'linked_alert_ids', v_alert_ids
    ),
    jsonb_build_object(
      'table', 'student_support_cases',
      'row', to_jsonb(v_case) || jsonb_build_object('archived_at', null)
    ),
    'deleted',
    now() + interval '30 days'
  ) returning id into v_deleted_id;

  insert into public.audit_events (
    actor_id, actor_email, actor_role, action, entity_type, entity_id,
    source_module, before_data, after_data, metadata
  ) values (
    v_actor,
    '',
    '',
    'student_support.case_archived',
    'student_support_case',
    p_case_id::text,
    'student-support',
    jsonb_build_object('status', v_case.status, 'archived_at', v_case.archived_at),
    jsonb_build_object('status', v_case.status, 'archived_at', now()),
    jsonb_build_object('deleted_item_id', v_deleted_id)
  );

  return v_deleted_id;
end;
$$;

revoke all on function public.bes_archive_student_support_case(uuid) from public;
revoke all on function public.bes_archive_student_support_case(uuid) from anon;
grant execute on function public.bes_archive_student_support_case(uuid) to authenticated;

create or replace function private.student_support_deleted_item_status_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case public.student_support_cases%rowtype;
  v_actor uuid := auth.uid();
begin
  if new.entity_type <> 'student_support_case'
     or old.status is not distinct from new.status then
    return new;
  end if;

  select * into v_case
  from public.student_support_cases
  where id::text = new.entity_id;

  if new.status = 'restored' then
    if v_actor is null then
      raise exception 'Authentication required';
    end if;
    if found and not (
      public.is_admin()
      or private.student_support_can_manage_workspace(v_case.homeroom_workspace_id)
    ) then
      raise exception 'Not authorized to restore this Student Support case';
    end if;

    if found then
      update public.student_support_cases
      set archived_at = null
      where id = v_case.id;

      insert into public.student_support_case_events (
        case_id, student_ref, homeroom_workspace_id, actor_id,
        event_type, from_status, to_status, metadata
      ) values (
        v_case.id, v_case.student_ref, v_case.homeroom_workspace_id, v_actor,
        'CASE_RESTORED', v_case.status, v_case.status,
        jsonb_build_object('deleted_item_id', new.id)
      );
    end if;
  elsif new.status = 'purged' then
    if not public.is_admin() then
      raise exception 'Only Admin can permanently purge a Student Support case';
    end if;
    if found then
      delete from public.student_support_cases where id = v_case.id;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.student_support_deleted_item_status_sync() from public;
revoke all on function private.student_support_deleted_item_status_sync() from anon;
revoke all on function private.student_support_deleted_item_status_sync() from authenticated;

create trigger student_support_deleted_item_status_sync
before update of status on public.deleted_items
for each row
execute function private.student_support_deleted_item_status_sync();

commit;
