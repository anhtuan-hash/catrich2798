-- 2026-09-12: make the visible “Xóa lớp” action a true permanent delete.
-- Also harden legacy archive and daily readers so archived/in-progress classes never
-- remain on the live attendance schedule.

-- -----------------------------------------------------------------------------
-- 1. Permanent class deletion.
-- -----------------------------------------------------------------------------
create or replace function public.bes_delete_supplemental_class(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_group public.bes_supplemental_groups%rowtype;
  v_proof_paths jsonb := '[]'::jsonb;
  v_session_count integer := 0;
  v_member_count integer := 0;
  v_teacher_count integer := 0;
begin
  select * into v_group
  from public.bes_supplemental_groups g
  where g.id = p_group_id
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp Học bổ sung.' using errcode = 'P0002';
  end if;

  select count(*)::integer,
         coalesce(
           jsonb_agg(distinct s.proof_path) filter (where nullif(btrim(coalesce(s.proof_path, '')), '') is not null),
           '[]'::jsonb
         )
  into v_session_count, v_proof_paths
  from public.bes_supplemental_sessions s
  where s.group_id = p_group_id;

  select count(*)::integer into v_member_count
  from public.bes_supplemental_group_memberships m
  where m.group_id = p_group_id;

  select count(*)::integer into v_teacher_count
  from public.bes_supplemental_group_teachers t
  where t.group_id = p_group_id;

  -- Sessions must be deleted explicitly before the group. The historical FK on
  -- bes_supplemental_sessions.group_id uses ON DELETE SET NULL for legacy adhoc
  -- compatibility; relying on the FK would otherwise leave orphan schedule rows.
  delete from public.bes_supplemental_sessions
  where group_id = p_group_id;

  -- Memberships and normalized teacher assignments cascade from the group row.
  delete from public.bes_supplemental_groups
  where id = p_group_id;

  if not found then
    raise exception 'Không thể xóa lớp Học bổ sung.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'groupId', p_group_id,
    'groupName', v_group.group_name,
    'deletedSessions', v_session_count,
    'deletedMemberships', v_member_count,
    'deletedTeachers', v_teacher_count,
    'proofPaths', v_proof_paths,
    'deletedBy', v_uid
  );
end;
$$;

revoke all on function public.bes_delete_supplemental_class(uuid) from public, anon;
grant execute on function public.bes_delete_supplemental_class(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Legacy archive semantics: an in-progress future/current session must not be
-- left behind merely because attendance was opened before the class was archived.
-- Confirmed history remains preserved when the explicit archive RPC is used.
-- -----------------------------------------------------------------------------
create or replace function public.bes_archive_supplemental_class(
  p_group_id uuid,
  p_reason text default 'Lớp đã được lưu trữ'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.bes_require_supplemental_manager();
  v_group public.bes_supplemental_groups%rowtype;
  v_reason text := coalesce(nullif(btrim(p_reason), ''), 'Lớp đã được lưu trữ');
begin
  select * into v_group
  from public.bes_supplemental_groups g
  where g.id = p_group_id
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp Học bổ sung.' using errcode = 'P0002';
  end if;

  if v_group.archived_at is null then
    update public.bes_supplemental_groups g
    set active = false,
        archived_at = clock_timestamp(),
        archived_by = v_uid,
        updated_by = v_uid,
        updated_at = clock_timestamp()
    where g.id = p_group_id
    returning * into v_group;

    update public.bes_supplemental_sessions s
    set status = 'cancelled',
        cancellation_reason = v_reason,
        updated_by = v_uid,
        updated_at = clock_timestamp()
    where s.group_id = p_group_id
      and s.kind = 'recurring'
      and s.status in ('scheduled', 'in_progress')
      and s.attendance_date >= current_date;
  end if;

  return to_jsonb(v_group);
end;
$$;

revoke all on function public.bes_archive_supplemental_class(uuid,text) from public, anon;
grant execute on function public.bes_archive_supplemental_class(uuid,text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Defensive live-reader filter. Archived/inactive recurring classes should not
-- appear in Lịch điểm danh even if an old session row survived a historical path.
-- Legacy adhoc sessions (group_id is null) remain readable.
-- -----------------------------------------------------------------------------
create or replace function public.bes_list_supplemental_attendance(
  p_from date default current_date,
  p_to date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.bes_require_supplemental_reader(array['attendance:calendar','attendance:quick','attendance:history','attendance:report']);
  if p_to < p_from then
    raise exception 'Khoảng ngày không hợp lệ.' using errcode = '22023';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'groupId', s.group_id,
        'kind', s.kind,
        'title', s.title,
        'groupName', g.group_name,
        'attendanceDate', s.attendance_date,
        'subject', s.subject,
        'teacherId', s.teacher_id,
        'teacherName', s.teacher_name,
        'teacherEmail', s.teacher_email,
        'room', s.room,
        'startTime', to_char(s.start_time, 'HH24:MI'),
        'endTime', to_char(s.end_time, 'HH24:MI'),
        'timeRange', to_char(s.start_time, 'HH24:MI') || '–' || to_char(s.end_time, 'HH24:MI'),
        'status', s.status,
        'participantCount', case
          when s.kind = 'recurring' and s.status in ('scheduled', 'in_progress') then (
            select count(distinct private.bes_supplemental_canonical_key(m.student_id))
            from public.bes_supplemental_group_memberships m
            join public.bes_supplemental_students st on st.id = m.student_id and st.active = true
            where m.group_id = s.group_id
              and m.effective_from <= s.attendance_date
              and (m.effective_until is null or m.effective_until >= s.attendance_date)
          )
          else (
            select count(*)
            from public.bes_supplemental_session_participants p
            where p.session_id = s.id
          )
        end,
        'rosterFrozenAt', s.roster_frozen_at,
        'sessionNote', s.session_note,
        'proofPath', s.proof_path
      ) order by s.attendance_date, s.start_time, s.title
    )
    from public.bes_supplemental_sessions s
    left join public.bes_supplemental_groups g on g.id = s.group_id
    where s.attendance_date between p_from and p_to
      and (
        s.group_id is null
        or (g.id is not null and g.active = true and g.archived_at is null)
      )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.bes_list_supplemental_attendance(date,date) from public, anon;
grant execute on function public.bes_list_supplemental_attendance(date,date) to authenticated;

comment on function public.bes_delete_supplemental_class(uuid) is
  'Permanently deletes one Học bổ sung class and all linked sessions/attendance snapshots; returns proof paths for storage cleanup.';
