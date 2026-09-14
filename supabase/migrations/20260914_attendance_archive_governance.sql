-- Attendance archive governance hardening.
-- 1) Grant archive/delete capability through the explicit attendance:delete permission.
-- 2) Preserve the legacy approved Hồng Thắm exception during migration.
-- 3) Audit every archive lifecycle transition.
-- 4) Notify all approved Admins when permanent deletion is requested.
-- 5) Prevent restoring an item while a permanent-delete request is pending/approved.

create or replace function public.can_delete_extra_attendance_history()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and (
        lower(trim(coalesce(p.role, ''))) in ('admin', 'administrator')
        or lower(trim(coalesce(p.email, ''))) = 'hongtham@accounts.brianenglish.studio'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:delete'
      )
  );
$$;

revoke all on function public.can_delete_extra_attendance_history() from public, anon;
grant execute on function public.can_delete_extra_attendance_history() to authenticated;

create or replace function public.bes_attendance_archive_governance_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_requester_name text := '';
  v_action text := '';
  v_entity_id text := '';
  v_metadata jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'attendance.archive';
    v_entity_id := new.id::text;
    v_metadata := jsonb_build_object(
      'source_type', new.source_type,
      'source_session_id', new.source_session_id,
      'class_name', new.class_name,
      'attendance_date', new.attendance_date,
      'archived_by', new.archived_by
    );

    insert into public.audit_events (
      action, actor_id, entity_type, entity_id,
      before_data, after_data, source_module, metadata
    ) values (
      v_action, v_actor, 'attendance_archive', v_entity_id,
      '{}'::jsonb,
      jsonb_build_object('delete_request_status', new.delete_request_status),
      'attendance_archive', v_metadata
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.delete_request_status is distinct from new.delete_request_status then
      if new.delete_request_status = 'pending' then
        v_action := 'attendance.purge_requested';

        select coalesce(nullif(trim(p.full_name), ''), p.email, 'Người dùng')
        into v_requester_name
        from public.profiles p
        where p.id = new.delete_requested_by;

        -- item_id is intentionally NULL: work_hub_notifications.item_id points to
        -- work_hub_items, while this notification refers to an attendance archive.
        -- Each transition into pending creates a fresh Admin notification, including
        -- a resubmission after a previous rejection.
        insert into public.work_hub_notifications (
          user_id, item_id, notification_type, title, body
        )
        select
          admin_profile.id,
          null::uuid,
          'attendance_purge_approval',
          'Yêu cầu xóa vĩnh viễn dữ liệu điểm danh',
          concat(
            coalesce(nullif(v_requester_name, ''), 'Người dùng'),
            ' yêu cầu xóa vĩnh viễn: ',
            coalesce(nullif(new.class_name, ''), 'Buổi điểm danh'),
            ' · ', new.attendance_date::text,
            case
              when trim(coalesce(new.delete_request_reason, '')) <> ''
                then concat(' · Lý do: ', trim(new.delete_request_reason))
              else ''
            end
          )
        from public.profiles admin_profile
        where admin_profile.approved = true
          and lower(trim(coalesce(admin_profile.role, ''))) in ('admin', 'administrator');
      elsif new.delete_request_status = 'approved' then
        v_action := 'attendance.purge_approved';
      elsif new.delete_request_status = 'rejected' then
        v_action := 'attendance.purge_rejected';
      end if;

      if v_action <> '' then
        insert into public.audit_events (
          action, actor_id, entity_type, entity_id,
          before_data, after_data, source_module, metadata
        ) values (
          v_action,
          v_actor,
          'attendance_archive',
          new.id::text,
          jsonb_build_object('delete_request_status', old.delete_request_status),
          jsonb_build_object(
            'delete_request_status', new.delete_request_status,
            'delete_requested_by', new.delete_requested_by,
            'delete_requested_at', new.delete_requested_at,
            'delete_reviewed_by', new.delete_reviewed_by,
            'delete_reviewed_at', new.delete_reviewed_at
          ),
          'attendance_archive',
          jsonb_build_object(
            'source_type', new.source_type,
            'source_session_id', new.source_session_id,
            'class_name', new.class_name,
            'attendance_date', new.attendance_date,
            'reason', new.delete_request_reason,
            'review_note', new.delete_review_note
          )
        );
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.delete_request_status = 'pending' then
      raise exception 'Yêu cầu xóa vĩnh viễn đang chờ Admin duyệt. Hãy từ chối yêu cầu trước khi khôi phục.' using errcode = '22023';
    end if;

    if old.delete_request_status = 'approved' then
      v_action := 'attendance.purge_finalized';
    else
      v_action := 'attendance.restore';
    end if;

    insert into public.audit_events (
      action, actor_id, entity_type, entity_id,
      before_data, after_data, source_module, metadata
    ) values (
      v_action,
      v_actor,
      'attendance_archive',
      old.id::text,
      jsonb_build_object('delete_request_status', old.delete_request_status),
      '{}'::jsonb,
      'attendance_archive',
      jsonb_build_object(
        'source_type', old.source_type,
        'source_session_id', old.source_session_id,
        'class_name', old.class_name,
        'attendance_date', old.attendance_date,
        'archived_by', old.archived_by,
        'archived_at', old.archived_at,
        'delete_requested_by', old.delete_requested_by,
        'delete_reviewed_by', old.delete_reviewed_by
      )
    );
    return old;
  end if;

  return null;
end;
$$;

revoke all on function public.bes_attendance_archive_governance_trigger() from public, anon, authenticated;

drop trigger if exists bes_attendance_archive_governance on public.bes_attendance_archive;
create trigger bes_attendance_archive_governance
before insert or update or delete on public.bes_attendance_archive
for each row execute function public.bes_attendance_archive_governance_trigger();
