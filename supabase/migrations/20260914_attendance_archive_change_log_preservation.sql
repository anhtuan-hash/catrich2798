-- Preserve per-record attendance edit history while a session is archived.
--
-- The first archive migration snapshots the active session and attendance rows. In
-- production, extra-class edit logs cascade when their session is removed, while
-- supplemental edit logs are cleared when a confirmed/cancelled session is reset
-- to scheduled. Keep those logs inside the archive too, remove them from the active
-- data set, and restore them only when the archived attendance session is restored.

alter table public.bes_attendance_archive
  add column if not exists changes_snapshot jsonb not null default '[]'::jsonb;

create or replace function private.bes_attendance_archive_capture_change_logs(
  p_source_type text,
  p_session_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_changes jsonb := '[]'::jsonb;
begin
  if lower(trim(coalesce(p_source_type, ''))) = 'extra' then
    select coalesce(jsonb_agg(to_jsonb(c) order by c.changed_at, c.id), '[]'::jsonb)
    into v_changes
    from public.bes_extra_attendance_record_changes c
    where c.session_id = p_session_id;
  elsif lower(trim(coalesce(p_source_type, ''))) = 'supplemental' then
    select coalesce(jsonb_agg(to_jsonb(c) order by c.changed_at, c.id), '[]'::jsonb)
    into v_changes
    from public.bes_supplemental_attendance_record_changes c
    where c.session_id = p_session_id;
  else
    raise exception 'Nguồn dữ liệu điểm danh không hợp lệ.' using errcode = '22023';
  end if;

  return coalesce(v_changes, '[]'::jsonb);
end;
$$;

create or replace function private.bes_attendance_archive_capture_change_logs_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.changes_snapshot := private.bes_attendance_archive_capture_change_logs(
    new.source_type,
    new.source_session_id
  );
  return new;
end;
$$;

create or replace function private.bes_attendance_archive_clear_change_logs(
  p_source_type text,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(trim(coalesce(p_source_type, ''))) = 'extra' then
    delete from public.bes_extra_attendance_record_changes c
    where c.session_id = p_session_id;
  elsif lower(trim(coalesce(p_source_type, ''))) = 'supplemental' then
    delete from public.bes_supplemental_attendance_record_changes c
    where c.session_id = p_session_id;
  else
    raise exception 'Nguồn dữ liệu điểm danh không hợp lệ.' using errcode = '22023';
  end if;
end;
$$;

create or replace function private.bes_attendance_archive_clear_change_logs_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.bes_attendance_archive_clear_change_logs(
    new.source_type,
    new.source_session_id
  );
  return new;
end;
$$;

create or replace function private.bes_attendance_archive_restore_change_logs(
  p_source_type text,
  p_session_id uuid,
  p_changes_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(jsonb_array_length(coalesce(p_changes_snapshot, '[]'::jsonb)), 0) = 0 then
    return;
  end if;

  if lower(trim(coalesce(p_source_type, ''))) = 'extra' then
    if exists (
      select 1 from public.bes_extra_attendance_record_changes c
      where c.session_id = p_session_id
    ) then
      raise exception 'Buổi điểm danh đã có lịch sử chỉnh sửa mới. Không thể khôi phục chồng dữ liệu.' using errcode = '23505';
    end if;

    insert into public.bes_extra_attendance_record_changes (
      id, session_id, record_id, class_id, member_key, student_full_name,
      change_kind, changed_by, changed_by_name, changed_at,
      old_status, new_status, old_absence_reason_code, new_absence_reason_code,
      old_absence_note, new_absence_note, session_note_before, session_note_after
    )
    select
      c.id,
      c.session_id,
      c.record_id,
      c.class_id,
      c.member_key,
      c.student_full_name,
      c.change_kind,
      case
        when c.changed_by is null or exists (
          select 1 from public.profiles p where p.id = c.changed_by
        ) then c.changed_by
        else null
      end,
      c.changed_by_name,
      c.changed_at,
      c.old_status,
      c.new_status,
      c.old_absence_reason_code,
      c.new_absence_reason_code,
      c.old_absence_note,
      c.new_absence_note,
      c.session_note_before,
      c.session_note_after
    from jsonb_populate_recordset(
      null::public.bes_extra_attendance_record_changes,
      coalesce(p_changes_snapshot, '[]'::jsonb)
    ) c;
  elsif lower(trim(coalesce(p_source_type, ''))) = 'supplemental' then
    if exists (
      select 1 from public.bes_supplemental_attendance_record_changes c
      where c.session_id = p_session_id
    ) then
      raise exception 'Buổi Học bổ sung đã có lịch sử chỉnh sửa mới. Không thể khôi phục chồng dữ liệu.' using errcode = '23505';
    end if;

    insert into public.bes_supplemental_attendance_record_changes (
      id, session_id, participant_id, group_id, canonical_student_key,
      student_full_name, change_kind, changed_by, changed_by_name, changed_at,
      old_status, new_status, old_absence_reason_code, new_absence_reason_code,
      old_absence_note, new_absence_note, session_note_before, session_note_after
    )
    select
      c.id,
      c.session_id,
      c.participant_id,
      c.group_id,
      c.canonical_student_key,
      c.student_full_name,
      c.change_kind,
      case
        when c.changed_by is null or exists (
          select 1 from public.profiles p where p.id = c.changed_by
        ) then c.changed_by
        else null
      end,
      c.changed_by_name,
      c.changed_at,
      c.old_status,
      c.new_status,
      c.old_absence_reason_code,
      c.new_absence_reason_code,
      c.old_absence_note,
      c.new_absence_note,
      c.session_note_before,
      c.session_note_after
    from jsonb_populate_recordset(
      null::public.bes_supplemental_attendance_record_changes,
      coalesce(p_changes_snapshot, '[]'::jsonb)
    ) c;
  else
    raise exception 'Nguồn dữ liệu điểm danh không hợp lệ.' using errcode = '22023';
  end if;
end;
$$;

create or replace function private.bes_attendance_archive_restore_change_logs_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Approved rows are deleted only by the permanent-delete finalizer. Their edit
  -- history must disappear with the archive instead of being restored.
  if old.delete_request_status = 'approved' then
    return old;
  end if;

  perform private.bes_attendance_archive_restore_change_logs(
    old.source_type,
    old.source_session_id,
    old.changes_snapshot
  );
  return old;
end;
$$;

revoke all on function private.bes_attendance_archive_capture_change_logs(text, uuid) from public, anon, authenticated;
revoke all on function private.bes_attendance_archive_capture_change_logs_trigger() from public, anon, authenticated;
revoke all on function private.bes_attendance_archive_clear_change_logs(text, uuid) from public, anon, authenticated;
revoke all on function private.bes_attendance_archive_clear_change_logs_trigger() from public, anon, authenticated;
revoke all on function private.bes_attendance_archive_restore_change_logs(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.bes_attendance_archive_restore_change_logs_trigger() from public, anon, authenticated;

drop trigger if exists bes_attendance_archive_capture_change_logs on public.bes_attendance_archive;
create trigger bes_attendance_archive_capture_change_logs
before insert on public.bes_attendance_archive
for each row execute function private.bes_attendance_archive_capture_change_logs_trigger();

drop trigger if exists bes_attendance_archive_clear_change_logs on public.bes_attendance_archive;
create trigger bes_attendance_archive_clear_change_logs
after insert on public.bes_attendance_archive
for each row execute function private.bes_attendance_archive_clear_change_logs_trigger();

drop trigger if exists bes_attendance_archive_restore_change_logs on public.bes_attendance_archive;
create trigger bes_attendance_archive_restore_change_logs
after delete on public.bes_attendance_archive
for each row execute function private.bes_attendance_archive_restore_change_logs_trigger();
