-- Archive-first governance for Phu dao / Boi duong classes.
-- Whole classes are snapshotted atomically before active rows are removed.
-- Permanent deletion requires Admin approval and proof cleanup by the client.

create table if not exists public.bes_extra_class_archive (
  id uuid primary key default gen_random_uuid(),
  source_class_id uuid not null,
  class_type text not null check (class_type in ('remedial', 'gifted')),
  class_name text not null,
  subject text not null default '',
  grade_level text not null default '',
  school_year text not null default '',
  class_snapshot jsonb not null,
  members_snapshot jsonb not null default '[]'::jsonb,
  teachers_snapshot jsonb not null default '[]'::jsonb,
  sessions_snapshot jsonb not null default '[]'::jsonb,
  records_snapshot jsonb not null default '[]'::jsonb,
  changes_snapshot jsonb not null default '[]'::jsonb,
  proof_paths jsonb not null default '[]'::jsonb,
  member_count integer not null default 0 check (member_count >= 0),
  teacher_count integer not null default 0 check (teacher_count >= 0),
  session_count integer not null default 0 check (session_count >= 0),
  record_count integer not null default 0 check (record_count >= 0),
  change_count integer not null default 0 check (change_count >= 0),
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
  delete_review_note text not null default ''
);

create unique index if not exists bes_extra_class_archive_source_uidx
  on public.bes_extra_class_archive (source_class_id);
create index if not exists bes_extra_class_archive_status_idx
  on public.bes_extra_class_archive (delete_request_status, archived_at desc);
create index if not exists bes_extra_class_archive_time_idx
  on public.bes_extra_class_archive (archived_at desc);

alter table public.bes_extra_class_archive enable row level security;
revoke all on table public.bes_extra_class_archive from public, anon, authenticated;

create or replace function public.bes_extra_class_archive_governance_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_requester_name text := '';
  v_action text := '';
begin
  if tg_op = 'INSERT' then
    insert into public.audit_events (
      action, actor_id, entity_type, entity_id,
      before_data, after_data, source_module, metadata
    ) values (
      'attendance.class_archive',
      v_actor,
      'extra_class_archive',
      new.id::text,
      '{}'::jsonb,
      jsonb_build_object('delete_request_status', new.delete_request_status),
      'attendance_class_archive',
      jsonb_build_object(
        'source_class_id', new.source_class_id,
        'class_name', new.class_name,
        'class_type', new.class_type,
        'subject', new.subject,
        'grade_level', new.grade_level,
        'school_year', new.school_year,
        'member_count', new.member_count,
        'teacher_count', new.teacher_count,
        'session_count', new.session_count,
        'record_count', new.record_count,
        'change_count', new.change_count,
        'archived_by', new.archived_by,
        'archived_at', new.archived_at
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.delete_request_status is distinct from new.delete_request_status then
      if new.delete_request_status = 'pending' then
        v_action := 'attendance.class_purge_requested';

        select coalesce(nullif(trim(p.full_name), ''), p.email, 'Nguoi dung')
        into v_requester_name
        from public.profiles p
        where p.id = new.delete_requested_by;

        insert into public.work_hub_notifications (
          user_id, item_id, notification_type, title, body
        )
        select
          admin_profile.id,
          null::uuid,
          'attendance_class_purge_approval',
          'Yeu cau xoa vinh vien lop diem danh',
          concat(
            coalesce(nullif(v_requester_name, ''), 'Nguoi dung'),
            ' yeu cau xoa vinh vien lop: ',
            coalesce(nullif(new.class_name, ''), 'Lop hoc'),
            case
              when trim(coalesce(new.delete_request_reason, '')) <> ''
                then concat(' · Ly do: ', trim(new.delete_request_reason))
              else ''
            end
          )
        from public.profiles admin_profile
        where admin_profile.approved = true
          and lower(trim(coalesce(admin_profile.role, ''))) in ('admin', 'administrator');
      elsif new.delete_request_status = 'approved' then
        v_action := 'attendance.class_purge_approved';
      elsif new.delete_request_status = 'rejected' then
        v_action := 'attendance.class_purge_rejected';
      end if;

      if v_action <> '' then
        insert into public.audit_events (
          action, actor_id, entity_type, entity_id,
          before_data, after_data, source_module, metadata
        ) values (
          v_action,
          v_actor,
          'extra_class_archive',
          new.id::text,
          jsonb_build_object('delete_request_status', old.delete_request_status),
          jsonb_build_object(
            'delete_request_status', new.delete_request_status,
            'delete_requested_by', new.delete_requested_by,
            'delete_requested_at', new.delete_requested_at,
            'delete_reviewed_by', new.delete_reviewed_by,
            'delete_reviewed_at', new.delete_reviewed_at
          ),
          'attendance_class_archive',
          jsonb_build_object(
            'source_class_id', new.source_class_id,
            'class_name', new.class_name,
            'reason', new.delete_request_reason,
            'review_note', new.delete_review_note,
            'member_count', new.member_count,
            'teacher_count', new.teacher_count,
            'session_count', new.session_count,
            'record_count', new.record_count,
            'change_count', new.change_count
          )
        );
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.delete_request_status = 'pending' then
      raise exception 'Yeu cau xoa vinh vien dang cho Admin duyet.' using errcode = '22023';
    end if;

    v_action := case
      when old.delete_request_status = 'approved' then 'attendance.class_purge_finalized'
      else 'attendance.class_archive_restore'
    end;

    insert into public.audit_events (
      action, actor_id, entity_type, entity_id,
      before_data, after_data, source_module, metadata
    ) values (
      v_action,
      v_actor,
      'extra_class_archive',
      old.id::text,
      jsonb_build_object('delete_request_status', old.delete_request_status),
      '{}'::jsonb,
      'attendance_class_archive',
      jsonb_build_object(
        'source_class_id', old.source_class_id,
        'class_name', old.class_name,
        'member_count', old.member_count,
        'teacher_count', old.teacher_count,
        'session_count', old.session_count,
        'record_count', old.record_count,
        'change_count', old.change_count,
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

revoke all on function public.bes_extra_class_archive_governance_trigger() from public, anon, authenticated;

drop trigger if exists bes_extra_class_archive_governance on public.bes_extra_class_archive;
create trigger bes_extra_class_archive_governance
before insert or update or delete on public.bes_extra_class_archive
for each row execute function public.bes_extra_class_archive_governance_trigger();

create or replace function public.bes_archive_extra_class(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_name text := '';
  v_class public.bes_extra_classes%rowtype;
  v_members jsonb := '[]'::jsonb;
  v_teachers jsonb := '[]'::jsonb;
  v_sessions jsonb := '[]'::jsonb;
  v_records jsonb := '[]'::jsonb;
  v_changes jsonb := '[]'::jsonb;
  v_proof_paths jsonb := '[]'::jsonb;
  v_archive_id uuid;
  v_member_count integer := 0;
  v_teacher_count integer := 0;
  v_session_count integer := 0;
  v_record_count integer := 0;
  v_change_count integer := 0;
begin
  if not public.can_manage_extra_class_roster() then
    raise exception 'Ban khong co quyen dua lop vao Kho luu tru.' using errcode = '42501';
  end if;

  if p_class_id is null then
    raise exception 'Khong xac dinh duoc lop can luu tru.' using errcode = '22004';
  end if;

  select * into v_class
  from public.bes_extra_classes c
  where c.id = p_class_id
  for update;

  if not found then
    select a.id into v_archive_id
    from public.bes_extra_class_archive a
    where a.source_class_id = p_class_id
    limit 1;
    if found then
      return jsonb_build_object(
        'archive_id', v_archive_id,
        'class_id', p_class_id,
        'already_archived', true
      );
    end if;
    raise exception 'Khong tim thay lop can luu tru.' using errcode = 'P0002';
  end if;

  select coalesce(nullif(trim(p.full_name), ''), p.email, '')
  into v_actor_name
  from public.profiles p
  where p.id = v_uid;

  select
    coalesce(jsonb_agg(to_jsonb(m) order by m.created_at, m.id), '[]'::jsonb),
    count(*)::integer
  into v_members, v_member_count
  from public.bes_extra_class_members m
  where m.class_id = p_class_id;

  select
    coalesce(jsonb_agg(to_jsonb(t) order by t.position, t.created_at, t.id), '[]'::jsonb),
    count(*)::integer
  into v_teachers, v_teacher_count
  from public.bes_extra_class_teachers t
  where t.class_id = p_class_id;

  select
    coalesce(jsonb_agg(to_jsonb(s) order by s.attendance_date, s.checked_at, s.id), '[]'::jsonb),
    count(*)::integer
  into v_sessions, v_session_count
  from public.bes_extra_attendance_sessions s
  where s.class_id = p_class_id;

  select
    coalesce(jsonb_agg(to_jsonb(r) order by r.recorded_at, r.id), '[]'::jsonb),
    count(*)::integer
  into v_records, v_record_count
  from public.bes_extra_attendance_records r
  where r.class_id = p_class_id;

  select
    coalesce(jsonb_agg(to_jsonb(c) order by c.changed_at, c.id), '[]'::jsonb),
    count(*)::integer
  into v_changes, v_change_count
  from public.bes_extra_attendance_record_changes c
  where c.class_id = p_class_id;

  select coalesce(
    jsonb_agg(distinct trim(s.proof_path)) filter (
      where trim(coalesce(s.proof_path, '')) <> ''
    ),
    '[]'::jsonb
  )
  into v_proof_paths
  from public.bes_extra_attendance_sessions s
  where s.class_id = p_class_id;

  insert into public.bes_extra_class_archive (
    source_class_id,
    class_type,
    class_name,
    subject,
    grade_level,
    school_year,
    class_snapshot,
    members_snapshot,
    teachers_snapshot,
    sessions_snapshot,
    records_snapshot,
    changes_snapshot,
    proof_paths,
    member_count,
    teacher_count,
    session_count,
    record_count,
    change_count,
    archived_by,
    archived_by_name
  ) values (
    v_class.id,
    v_class.class_type,
    v_class.class_name,
    v_class.subject,
    v_class.grade_level,
    v_class.school_year,
    to_jsonb(v_class),
    v_members,
    v_teachers,
    v_sessions,
    v_records,
    v_changes,
    v_proof_paths,
    v_member_count,
    v_teacher_count,
    v_session_count,
    v_record_count,
    v_change_count,
    v_uid,
    coalesce(v_actor_name, '')
  )
  returning id into v_archive_id;

  -- Proof files are intentionally retained. Only operational database rows move out.
  delete from public.bes_extra_attendance_record_changes c where c.class_id = p_class_id;
  delete from public.bes_extra_attendance_records r where r.class_id = p_class_id;
  delete from public.bes_extra_attendance_sessions s where s.class_id = p_class_id;
  delete from public.bes_extra_class_teachers t where t.class_id = p_class_id;
  delete from public.bes_extra_class_members m where m.class_id = p_class_id;
  delete from public.bes_extra_classes c where c.id = p_class_id;

  return jsonb_build_object(
    'archive_id', v_archive_id,
    'class_id', v_class.id,
    'class_name', v_class.class_name,
    'member_count', v_member_count,
    'teacher_count', v_teacher_count,
    'session_count', v_session_count,
    'record_count', v_record_count,
    'change_count', v_change_count,
    'archived', true
  );
end;
$$;

create or replace function public.bes_list_extra_class_archive()
returns table (
  archive_id uuid,
  source_class_id uuid,
  class_type text,
  class_name text,
  subject text,
  grade_level text,
  school_year text,
  member_count integer,
  teacher_count integer,
  session_count integer,
  record_count integer,
  change_count integer,
  proof_paths jsonb,
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
  if not public.can_manage_extra_class_roster() then
    raise exception 'Ban khong co quyen xem Kho luu tru lop.' using errcode = '42501';
  end if;

  return query
  select
    a.id,
    a.source_class_id,
    a.class_type,
    a.class_name,
    a.subject,
    a.grade_level,
    a.school_year,
    a.member_count,
    a.teacher_count,
    a.session_count,
    a.record_count,
    a.change_count,
    a.proof_paths,
    a.archived_by,
    a.archived_by_name,
    a.archived_at,
    a.delete_request_status,
    a.delete_requested_by,
    a.delete_requested_at,
    a.delete_request_reason,
    a.delete_reviewed_by,
    a.delete_reviewed_at,
    a.delete_review_note,
    public.is_admin()
  from public.bes_extra_class_archive a
  order by a.archived_at desc, a.class_name;
end;
$$;

create or replace function public.bes_restore_extra_class_archive(p_archive_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_archive public.bes_extra_class_archive%rowtype;
  v_class public.bes_extra_classes%rowtype;
begin
  if not public.can_manage_extra_class_roster() then
    raise exception 'Ban khong co quyen khoi phuc lop.' using errcode = '42501';
  end if;

  select * into v_archive
  from public.bes_extra_class_archive a
  where a.id = p_archive_id
  for update;

  if not found then
    raise exception 'Khong tim thay lop luu tru can khoi phuc.' using errcode = 'P0002';
  end if;

  if v_archive.delete_request_status not in ('none', 'rejected') then
    raise exception 'Muc nay dang cho hoac da duoc Admin duyet xoa, khong the khoi phuc.' using errcode = '22023';
  end if;

  select * into v_class
  from jsonb_populate_record(null::public.bes_extra_classes, v_archive.class_snapshot);

  if exists (select 1 from public.bes_extra_classes c where c.id = v_archive.source_class_id) then
    raise exception 'ID lop goc da duoc su dung. Khong the khoi phuc chong du lieu.' using errcode = '23505';
  end if;

  if nullif(trim(coalesce(v_class.source_key, '')), '') is not null
     and exists (
       select 1 from public.bes_extra_classes c
       where c.source_key = v_class.source_key
     ) then
    raise exception 'Ma nguon cua lop da duoc su dung. Khong the khoi phuc chong du lieu.' using errcode = '23505';
  end if;

  insert into public.bes_extra_classes
  select r.*
  from jsonb_populate_record(null::public.bes_extra_classes, v_archive.class_snapshot) r;

  insert into public.bes_extra_class_members
  select r.*
  from jsonb_populate_recordset(null::public.bes_extra_class_members, v_archive.members_snapshot) r;

  insert into public.bes_extra_class_teachers
  select r.*
  from jsonb_populate_recordset(null::public.bes_extra_class_teachers, v_archive.teachers_snapshot) r;

  insert into public.bes_extra_attendance_sessions
  select r.*
  from jsonb_populate_recordset(null::public.bes_extra_attendance_sessions, v_archive.sessions_snapshot) r;

  insert into public.bes_extra_attendance_records
  select r.*
  from jsonb_populate_recordset(null::public.bes_extra_attendance_records, v_archive.records_snapshot) r;

  insert into public.bes_extra_attendance_record_changes
  select r.*
  from jsonb_populate_recordset(null::public.bes_extra_attendance_record_changes, v_archive.changes_snapshot) r;

  delete from public.bes_extra_class_archive a where a.id = p_archive_id;

  return jsonb_build_object(
    'archive_id', p_archive_id,
    'class_id', v_archive.source_class_id,
    'class_name', v_archive.class_name,
    'member_count', v_archive.member_count,
    'teacher_count', v_archive.teacher_count,
    'session_count', v_archive.session_count,
    'record_count', v_archive.record_count,
    'change_count', v_archive.change_count,
    'restored', true
  );
end;
$$;

create or replace function public.bes_request_extra_class_archive_delete(
  p_archive_id uuid,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_archive public.bes_extra_class_archive%rowtype;
begin
  if not public.can_manage_extra_class_roster() then
    raise exception 'Ban khong co quyen yeu cau xoa vinh vien lop.' using errcode = '42501';
  end if;

  select * into v_archive
  from public.bes_extra_class_archive a
  where a.id = p_archive_id
  for update;
  if not found then
    raise exception 'Khong tim thay lop luu tru.' using errcode = 'P0002';
  end if;

  if v_archive.delete_request_status not in ('none', 'rejected') then
    raise exception 'Muc nay khong o trang thai co the gui yeu cau xoa.' using errcode = '22023';
  end if;

  update public.bes_extra_class_archive
  set delete_request_status = 'pending',
      delete_requested_by = auth.uid(),
      delete_requested_at = clock_timestamp(),
      delete_request_reason = trim(coalesce(p_reason, '')),
      delete_reviewed_by = null,
      delete_reviewed_at = null,
      delete_review_note = ''
  where id = p_archive_id
  returning * into v_archive;

  return jsonb_build_object(
    'archive_id', v_archive.id,
    'class_name', v_archive.class_name,
    'delete_request_status', v_archive.delete_request_status,
    'requested', true
  );
end;
$$;

create or replace function public.bes_review_extra_class_archive_delete(
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
  v_archive public.bes_extra_class_archive%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Chi Admin moi duoc duyet xoa vinh vien lop.' using errcode = '42501';
  end if;

  select * into v_archive
  from public.bes_extra_class_archive a
  where a.id = p_archive_id
  for update;
  if not found then
    raise exception 'Khong tim thay lop luu tru.' using errcode = 'P0002';
  end if;

  if v_archive.delete_request_status <> 'pending' then
    raise exception 'Yeu cau nay khong o trang thai cho duyet.' using errcode = '22023';
  end if;

  update public.bes_extra_class_archive
  set delete_request_status = case when p_approve is true then 'approved' else 'rejected' end,
      delete_reviewed_by = auth.uid(),
      delete_reviewed_at = clock_timestamp(),
      delete_review_note = trim(coalesce(p_note, ''))
  where id = p_archive_id
  returning * into v_archive;

  return jsonb_build_object(
    'archive_id', v_archive.id,
    'class_name', v_archive.class_name,
    'delete_request_status', v_archive.delete_request_status,
    'proof_paths', v_archive.proof_paths,
    'approved', p_approve is true
  );
end;
$$;

create or replace function public.bes_finalize_extra_class_archive_delete(p_archive_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_archive public.bes_extra_class_archive%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Chi Admin moi duoc hoan tat xoa vinh vien lop.' using errcode = '42501';
  end if;

  select * into v_archive
  from public.bes_extra_class_archive a
  where a.id = p_archive_id
  for update;
  if not found then
    raise exception 'Khong tim thay lop luu tru.' using errcode = 'P0002';
  end if;

  if v_archive.delete_request_status <> 'approved' then
    raise exception 'Lop chua duoc Admin duyet xoa vinh vien.' using errcode = '22023';
  end if;

  delete from public.bes_extra_class_archive a where a.id = p_archive_id;

  return jsonb_build_object(
    'archive_id', p_archive_id,
    'class_id', v_archive.source_class_id,
    'class_name', v_archive.class_name,
    'finalized', true
  );
end;
$$;

-- Compatibility guard: old clients calling the historical delete RPC now archive first.
create or replace function public.bes_delete_extra_class(p_class_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.bes_archive_extra_class(p_class_id);
$$;

revoke all on function public.bes_archive_extra_class(uuid) from public, anon;
revoke all on function public.bes_list_extra_class_archive() from public, anon;
revoke all on function public.bes_restore_extra_class_archive(uuid) from public, anon;
revoke all on function public.bes_request_extra_class_archive_delete(uuid, text) from public, anon;
revoke all on function public.bes_review_extra_class_archive_delete(uuid, boolean, text) from public, anon;
revoke all on function public.bes_finalize_extra_class_archive_delete(uuid) from public, anon;
revoke all on function public.bes_delete_extra_class(uuid) from public, anon;

grant execute on function public.bes_archive_extra_class(uuid) to authenticated;
grant execute on function public.bes_list_extra_class_archive() to authenticated;
grant execute on function public.bes_restore_extra_class_archive(uuid) to authenticated;
grant execute on function public.bes_request_extra_class_archive_delete(uuid, text) to authenticated;
grant execute on function public.bes_review_extra_class_archive_delete(uuid, boolean, text) to authenticated;
grant execute on function public.bes_finalize_extra_class_archive_delete(uuid) to authenticated;
grant execute on function public.bes_delete_extra_class(uuid) to authenticated;
