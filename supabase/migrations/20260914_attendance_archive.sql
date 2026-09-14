-- Attendance archive: soft-delete first, restore safely, and require Admin approval
-- before permanent deletion. Archived sessions are removed from active attendance
-- tables so they no longer appear in History/Reports, while their full snapshots
-- and proof object path remain recoverable.

create table if not exists public.bes_attendance_archive (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('extra', 'supplemental')),
  source_session_id uuid not null,
  class_name text not null default '',
  subject text not null default '',
  teacher_name text not null default '',
  attendance_date date not null,
  checked_at timestamptz,
  session_status text not null default '',
  proof_path text not null default '',
  session_snapshot jsonb not null,
  records_snapshot jsonb not null default '[]'::jsonb,
  archived_by uuid not null,
  archived_by_name text not null default '',
  archived_at timestamptz not null default clock_timestamp(),
  delete_request_status text not null default 'none'
    check (delete_request_status in ('none', 'pending', 'approved', 'rejected')),
  delete_requested_by uuid,
  delete_requested_at timestamptz,
  delete_request_reason text not null default '',
  delete_reviewed_by uuid,
  delete_reviewed_at timestamptz,
  delete_review_note text not null default '',
  unique (source_type, source_session_id)
);

create index if not exists bes_attendance_archive_date_idx
  on public.bes_attendance_archive (attendance_date desc, archived_at desc);
create index if not exists bes_attendance_archive_request_idx
  on public.bes_attendance_archive (delete_request_status, archived_at desc);

alter table public.bes_attendance_archive enable row level security;
revoke all on table public.bes_attendance_archive from public, anon, authenticated;

create or replace function public.bes_archive_attendance_history(
  p_source_type text,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_name text := '';
  v_source text := lower(trim(coalesce(p_source_type, '')));
  v_extra public.bes_extra_attendance_sessions%rowtype;
  v_supp public.bes_supplemental_sessions%rowtype;
  v_records jsonb := '[]'::jsonb;
  v_archive_id uuid;
begin
  if not public.can_delete_extra_attendance_history() then
    raise exception 'Bạn không có quyền lưu trữ lịch sử điểm danh.' using errcode = '42501';
  end if;

  if v_source not in ('extra', 'supplemental') then
    raise exception 'Nguồn dữ liệu điểm danh không hợp lệ.' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(p.full_name), ''), p.email, '')
  into v_actor_name
  from public.profiles p
  where p.id = v_uid;

  if v_source = 'extra' then
    select * into v_extra
    from public.bes_extra_attendance_sessions s
    where s.id = p_session_id
    for update;

    if not found then
      if exists (
        select 1 from public.bes_attendance_archive a
        where a.source_type = 'extra' and a.source_session_id = p_session_id
      ) then
        select a.id into v_archive_id
        from public.bes_attendance_archive a
        where a.source_type = 'extra' and a.source_session_id = p_session_id;
        return jsonb_build_object('archive_id', v_archive_id, 'source_type', 'extra', 'already_archived', true);
      end if;
      raise exception 'Không tìm thấy buổi điểm danh cần lưu trữ.' using errcode = 'P0002';
    end if;

    select coalesce(jsonb_agg(to_jsonb(r) order by r.student_full_name, r.id), '[]'::jsonb)
    into v_records
    from public.bes_extra_attendance_records r
    where r.session_id = p_session_id;

    insert into public.bes_attendance_archive (
      source_type, source_session_id, class_name, subject, teacher_name,
      attendance_date, checked_at, session_status, proof_path,
      session_snapshot, records_snapshot, archived_by, archived_by_name
    ) values (
      'extra', v_extra.id, v_extra.class_name, v_extra.subject, v_extra.teacher_name,
      v_extra.attendance_date, v_extra.checked_at, v_extra.session_status,
      coalesce(v_extra.proof_path, ''), to_jsonb(v_extra), v_records, v_uid, coalesce(v_actor_name, '')
    )
    on conflict (source_type, source_session_id) do update
      set archived_at = excluded.archived_at
    returning id into v_archive_id;

    -- Records cascade from the session. The proof object is intentionally retained.
    delete from public.bes_extra_attendance_sessions s where s.id = p_session_id;
  else
    select * into v_supp
    from public.bes_supplemental_sessions s
    where s.id = p_session_id
    for update;

    if not found then
      raise exception 'Không tìm thấy buổi Học bổ sung cần lưu trữ.' using errcode = 'P0002';
    end if;
    if v_supp.status not in ('confirmed', 'cancelled') then
      raise exception 'Buổi Học bổ sung này chưa có lịch sử đã chốt để lưu trữ.' using errcode = '22023';
    end if;

    select coalesce(jsonb_agg(to_jsonb(p) order by p.full_name_snapshot, p.id), '[]'::jsonb)
    into v_records
    from public.bes_supplemental_session_participants p
    where p.session_id = p_session_id;

    insert into public.bes_attendance_archive (
      source_type, source_session_id, class_name, subject, teacher_name,
      attendance_date, checked_at, session_status, proof_path,
      session_snapshot, records_snapshot, archived_by, archived_by_name
    ) values (
      'supplemental', v_supp.id, coalesce(nullif(v_supp.title, ''), 'Học bổ sung'),
      v_supp.subject, v_supp.teacher_name, v_supp.attendance_date,
      v_supp.attendance_confirmed_at, v_supp.status, coalesce(v_supp.proof_path, ''),
      to_jsonb(v_supp), v_records, v_uid, coalesce(v_actor_name, '')
    )
    on conflict (source_type, source_session_id) do update
      set archived_at = excluded.archived_at
    returning id into v_archive_id;

    -- Preserve the scheduled session itself so recurring planning stays intact,
    -- but remove its confirmed/cancelled history state. Keep proof only in archive.
    if v_supp.kind = 'recurring' then
      delete from public.bes_supplemental_session_participants p
      where p.session_id = p_session_id;
    else
      update public.bes_supplemental_session_participants p
      set attendance_status = null,
          absence_reason_code = '',
          absence_note = '',
          recorded_at = null,
          updated_at = clock_timestamp()
      where p.session_id = p_session_id;
    end if;

    update public.bes_supplemental_sessions s
    set status = 'scheduled',
        cancellation_reason = '',
        roster_frozen_at = null,
        attendance_confirmed_at = null,
        checked_by = null,
        checked_by_name = '',
        session_note = '',
        proof_path = '',
        total_students = 0,
        present_count = 0,
        absent_count = 0,
        tardy_count = 0,
        lesson_periods = 1,
        updated_by = v_uid,
        updated_at = clock_timestamp()
    where s.id = p_session_id;
  end if;

  return jsonb_build_object(
    'archive_id', v_archive_id,
    'source_type', v_source,
    'source_session_id', p_session_id,
    'archived', true
  );
end;
$$;

create or replace function public.bes_list_attendance_archive()
returns table (
  archive_id uuid,
  source_type text,
  source_session_id uuid,
  class_name text,
  subject text,
  teacher_name text,
  attendance_date date,
  checked_at timestamptz,
  session_status text,
  proof_path text,
  archived_by uuid,
  archived_by_name text,
  archived_at timestamptz,
  delete_request_status text,
  delete_requested_by uuid,
  delete_requested_at timestamptz,
  delete_request_reason text,
  delete_reviewed_by uuid,
  delete_reviewed_at timestamptz,
  delete_review_note text,
  can_review boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_delete_extra_attendance_history() then
    raise exception 'Bạn không có quyền xem Kho lưu trữ điểm danh.' using errcode = '42501';
  end if;

  return query
  select
    a.id, a.source_type, a.source_session_id, a.class_name, a.subject, a.teacher_name,
    a.attendance_date, a.checked_at, a.session_status, a.proof_path,
    a.archived_by, a.archived_by_name, a.archived_at,
    a.delete_request_status, a.delete_requested_by, a.delete_requested_at,
    a.delete_request_reason, a.delete_reviewed_by, a.delete_reviewed_at,
    a.delete_review_note, public.is_admin()
  from public.bes_attendance_archive a
  order by a.archived_at desc, a.attendance_date desc;
end;
$$;

create or replace function public.bes_restore_attendance_archive(p_archive_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_archive public.bes_attendance_archive%rowtype;
  v_extra public.bes_extra_attendance_sessions%rowtype;
  v_supp public.bes_supplemental_sessions%rowtype;
begin
  if not public.can_delete_extra_attendance_history() then
    raise exception 'Bạn không có quyền khôi phục lịch sử điểm danh.' using errcode = '42501';
  end if;

  select * into v_archive
  from public.bes_attendance_archive a
  where a.id = p_archive_id
  for update;
  if not found then
    raise exception 'Không tìm thấy mục lưu trữ cần khôi phục.' using errcode = 'P0002';
  end if;
  if v_archive.delete_request_status = 'approved' then
    raise exception 'Mục này đã được Admin duyệt xóa và đang chờ hoàn tất, không thể khôi phục.' using errcode = '22023';
  end if;

  if v_archive.source_type = 'extra' then
    select * into v_extra
    from jsonb_populate_record(null::public.bes_extra_attendance_sessions, v_archive.session_snapshot);

    if not exists (select 1 from public.bes_extra_classes c where c.id = v_extra.class_id) then
      raise exception 'Lớp gốc không còn tồn tại nên chưa thể khôi phục buổi điểm danh.' using errcode = '23503';
    end if;
    if exists (
      select 1 from public.bes_extra_attendance_sessions s
      where s.id = v_extra.id or (s.class_id = v_extra.class_id and s.attendance_date = v_extra.attendance_date)
    ) then
      raise exception 'Ngày này đã có một buổi điểm danh mới. Không thể khôi phục chồng dữ liệu.' using errcode = '23505';
    end if;

    insert into public.bes_extra_attendance_sessions
    select * from jsonb_populate_record(null::public.bes_extra_attendance_sessions, v_archive.session_snapshot);

    insert into public.bes_extra_attendance_records (
      id, session_id, class_id, member_id, member_key, student_code,
      student_full_name, school_class_name, status, recorded_at,
      absence_reason_code, absence_note
    )
    select
      r.id, r.session_id, r.class_id,
      case when r.member_id is null or exists (
        select 1 from public.bes_extra_class_members m where m.id = r.member_id
      ) then r.member_id else null end,
      r.member_key, r.student_code, r.student_full_name, r.school_class_name,
      r.status, r.recorded_at, r.absence_reason_code, r.absence_note
    from jsonb_populate_recordset(
      null::public.bes_extra_attendance_records,
      v_archive.records_snapshot
    ) r;
  else
    select * into v_supp
    from jsonb_populate_record(null::public.bes_supplemental_sessions, v_archive.session_snapshot);

    if exists (select 1 from public.bes_supplemental_sessions s where s.id = v_supp.id) then
      if exists (
        select 1
        from public.bes_supplemental_sessions s
        where s.id = v_supp.id
          and (
            s.status <> 'scheduled'
            or s.roster_frozen_at is not null
            or s.attendance_confirmed_at is not null
            or s.checked_by is not null
            or trim(coalesce(s.proof_path, '')) <> ''
          )
      ) then
        raise exception 'Buổi Học bổ sung này đã có dữ liệu điểm danh mới. Không thể khôi phục chồng dữ liệu.' using errcode = '23505';
      end if;

      update public.bes_supplemental_sessions s
      set group_id = v_supp.group_id,
          kind = v_supp.kind,
          title = v_supp.title,
          attendance_date = v_supp.attendance_date,
          subject = v_supp.subject,
          teacher_id = v_supp.teacher_id,
          teacher_name = v_supp.teacher_name,
          teacher_email = v_supp.teacher_email,
          room = v_supp.room,
          start_time = v_supp.start_time,
          end_time = v_supp.end_time,
          status = v_supp.status,
          cancellation_reason = v_supp.cancellation_reason,
          roster_frozen_at = v_supp.roster_frozen_at,
          attendance_confirmed_at = v_supp.attendance_confirmed_at,
          checked_by = v_supp.checked_by,
          checked_by_name = v_supp.checked_by_name,
          session_note = v_supp.session_note,
          proof_path = v_supp.proof_path,
          total_students = v_supp.total_students,
          present_count = v_supp.present_count,
          absent_count = v_supp.absent_count,
          tardy_count = v_supp.tardy_count,
          created_by = v_supp.created_by,
          updated_by = v_supp.updated_by,
          created_at = v_supp.created_at,
          updated_at = v_supp.updated_at,
          lesson_periods = v_supp.lesson_periods
      where s.id = v_supp.id;
    else
      if v_supp.group_id is not null and exists (
        select 1 from public.bes_supplemental_sessions s
        where s.group_id = v_supp.group_id and s.attendance_date = v_supp.attendance_date
      ) then
        raise exception 'Ngày này đã có một buổi Học bổ sung mới. Không thể khôi phục chồng dữ liệu.' using errcode = '23505';
      end if;
      insert into public.bes_supplemental_sessions
      select * from jsonb_populate_record(null::public.bes_supplemental_sessions, v_archive.session_snapshot);
    end if;

    delete from public.bes_supplemental_session_participants p
    where p.session_id = v_supp.id;

    insert into public.bes_supplemental_session_participants
    select * from jsonb_populate_recordset(
      null::public.bes_supplemental_session_participants,
      v_archive.records_snapshot
    );
  end if;

  delete from public.bes_attendance_archive a where a.id = p_archive_id;

  return jsonb_build_object(
    'archive_id', p_archive_id,
    'source_type', v_archive.source_type,
    'source_session_id', v_archive.source_session_id,
    'restored', true
  );
end;
$$;

create or replace function public.bes_request_attendance_archive_delete(
  p_archive_id uuid,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_archive public.bes_attendance_archive%rowtype;
begin
  if not public.can_delete_extra_attendance_history() then
    raise exception 'Bạn không có quyền gửi yêu cầu xóa vĩnh viễn.' using errcode = '42501';
  end if;

  select * into v_archive
  from public.bes_attendance_archive a
  where a.id = p_archive_id
  for update;
  if not found then
    raise exception 'Không tìm thấy mục lưu trữ.' using errcode = 'P0002';
  end if;
  if v_archive.delete_request_status = 'approved' then
    raise exception 'Mục này đã được Admin duyệt xóa và đang chờ hoàn tất.' using errcode = '22023';
  end if;

  update public.bes_attendance_archive a
  set delete_request_status = 'pending',
      delete_requested_by = v_uid,
      delete_requested_at = clock_timestamp(),
      delete_request_reason = trim(coalesce(p_reason, '')),
      delete_reviewed_by = null,
      delete_reviewed_at = null,
      delete_review_note = ''
  where a.id = p_archive_id;

  return jsonb_build_object('archive_id', p_archive_id, 'delete_request_status', 'pending');
end;
$$;

create or replace function public.bes_review_attendance_archive_delete(
  p_archive_id uuid,
  p_approve boolean,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_archive public.bes_attendance_archive%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Chỉ Admin được duyệt yêu cầu xóa vĩnh viễn.' using errcode = '42501';
  end if;

  select * into v_archive
  from public.bes_attendance_archive a
  where a.id = p_archive_id
  for update;
  if not found then
    raise exception 'Không tìm thấy mục lưu trữ.' using errcode = 'P0002';
  end if;
  if v_archive.delete_request_status not in ('pending', 'approved') then
    raise exception 'Mục này không có yêu cầu xóa đang chờ duyệt.' using errcode = '22023';
  end if;

  if coalesce(p_approve, false) then
    update public.bes_attendance_archive a
    set delete_request_status = 'approved',
        delete_reviewed_by = v_uid,
        delete_reviewed_at = clock_timestamp(),
        delete_review_note = trim(coalesce(p_note, ''))
    where a.id = p_archive_id;

    return jsonb_build_object(
      'archive_id', p_archive_id,
      'approved', true,
      'ready_for_permanent_delete', true,
      'proof_path', v_archive.proof_path,
      'reviewed_by', v_uid,
      'note', trim(coalesce(p_note, ''))
    );
  end if;

  if v_archive.delete_request_status = 'approved' then
    raise exception 'Yêu cầu này đã được duyệt xóa, không thể chuyển sang từ chối.' using errcode = '22023';
  end if;

  update public.bes_attendance_archive a
  set delete_request_status = 'rejected',
      delete_reviewed_by = v_uid,
      delete_reviewed_at = clock_timestamp(),
      delete_review_note = trim(coalesce(p_note, ''))
  where a.id = p_archive_id;

  return jsonb_build_object(
    'archive_id', p_archive_id,
    'approved', false,
    'delete_request_status', 'rejected'
  );
end;
$$;

create or replace function public.bes_finalize_attendance_archive_delete(p_archive_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_archive public.bes_attendance_archive%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Chỉ Admin được hoàn tất xóa vĩnh viễn.' using errcode = '42501';
  end if;

  select * into v_archive
  from public.bes_attendance_archive a
  where a.id = p_archive_id
  for update;
  if not found then
    raise exception 'Không tìm thấy mục lưu trữ.' using errcode = 'P0002';
  end if;
  if v_archive.delete_request_status <> 'approved' then
    raise exception 'Mục này chưa được Admin duyệt xóa.' using errcode = '22023';
  end if;

  delete from public.bes_attendance_archive a where a.id = p_archive_id;
  return jsonb_build_object(
    'archive_id', p_archive_id,
    'approved', true,
    'permanently_deleted', true,
    'finalized_by', v_uid
  );
end;
$$;

-- Backward-compatible hard-delete endpoints now route to the archive. This closes
-- the bypass where an older client could permanently delete without Admin review.
create or replace function public.bes_delete_extra_attendance_session(p_session_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.bes_archive_attendance_history('extra', p_session_id);
$$;

create or replace function public.bes_delete_supplemental_attendance_history(p_session_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.bes_archive_attendance_history('supplemental', p_session_id);
$$;

revoke all on function public.bes_archive_attendance_history(text, uuid) from public, anon;
revoke all on function public.bes_list_attendance_archive() from public, anon;
revoke all on function public.bes_restore_attendance_archive(uuid) from public, anon;
revoke all on function public.bes_request_attendance_archive_delete(uuid, text) from public, anon;
revoke all on function public.bes_review_attendance_archive_delete(uuid, boolean, text) from public, anon;
revoke all on function public.bes_finalize_attendance_archive_delete(uuid) from public, anon;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from public, anon;
revoke all on function public.bes_delete_supplemental_attendance_history(uuid) from public, anon;

grant execute on function public.bes_archive_attendance_history(text, uuid) to authenticated;
grant execute on function public.bes_list_attendance_archive() to authenticated;
grant execute on function public.bes_restore_attendance_archive(uuid) to authenticated;
grant execute on function public.bes_request_attendance_archive_delete(uuid, text) to authenticated;
grant execute on function public.bes_review_attendance_archive_delete(uuid, boolean, text) to authenticated;
grant execute on function public.bes_finalize_attendance_archive_delete(uuid) to authenticated;
grant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;
grant execute on function public.bes_delete_supplemental_attendance_history(uuid) to authenticated;
