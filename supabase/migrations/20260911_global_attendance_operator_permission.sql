-- 2026-09-11: make the Admin-granted attendance permission global.
--
-- `attendance:quick` / can_take_extra_class_attendance() is the only ordinary
-- attendance write assignment. A granted account can operate every active
-- extra class. Teaching/class assignment no longer participates in access
-- control. The global Admin-configured time window remains enforced.

create or replace function private.bes_attendance_access_decision(
  p_class_id uuid,
  p_teacher_name text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_enforced boolean := false;
  v_start time without time zone := time '16:40';
  v_end time without time zone := time '17:15';
  v_local_time time without time zone := (coalesce(p_now, clock_timestamp()) at time zone 'Asia/Ho_Chi_Minh')::time;
  v_is_admin boolean := false;
  v_has_report boolean := false;
  v_in_window boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_uid
    and p.approved = true;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'profile_not_approved');
  end if;

  v_is_admin := lower(coalesce(v_profile.role, '')) in ('admin', 'administrator');
  v_has_report := coalesce(v_profile.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:report';

  if v_is_admin then
    return jsonb_build_object('allowed', true, 'reason', 'admin_bypass', 'bypass', true);
  end if;

  if v_has_report then
    return jsonb_build_object('allowed', true, 'reason', 'report_bypass', 'bypass', true);
  end if;

  -- This is the Admin-managed global attendance assignment. It is deliberately
  -- checked before class/time logic so a teaching assignment cannot grant write
  -- access by itself.
  if not public.can_take_extra_class_attendance() then
    return jsonb_build_object('allowed', false, 'reason', 'missing_permission');
  end if;

  select
    coalesce(s.enforce_teacher_time_window, false),
    s.teacher_start_time,
    s.teacher_end_time
  into v_enforced, v_start, v_end
  from public.bes_attendance_access_settings s
  where s.id = 1;

  v_enforced := coalesce(v_enforced, false);
  v_start := coalesce(v_start, time '16:40');
  v_end := coalesce(v_end, time '17:15');

  -- Keep the existing RPC signature because attendance write functions already
  -- call this helper with class/teacher parameters. Teacher identity is now
  -- informational only and must not affect authorization.
  perform p_teacher_name;

  if not exists (
    select 1
    from public.bes_extra_classes c
    where c.id = p_class_id
      and c.active = true
  ) then
    return jsonb_build_object('allowed', false, 'reason', 'class_not_found');
  end if;

  if not v_enforced then
    return jsonb_build_object(
      'allowed', true,
      'reason', 'restriction_disabled',
      'bypass', false,
      'class_id', p_class_id,
      'window_start', to_char(v_start, 'HH24:MI'),
      'window_end', to_char(v_end, 'HH24:MI')
    );
  end if;

  if v_start = v_end then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_time',
      'class_id', p_class_id
    );
  end if;

  if v_end > v_start then
    v_in_window := v_local_time >= v_start and v_local_time <= v_end;
  else
    -- Overnight window, e.g. 22:00 -> 01:30.
    v_in_window := v_local_time >= v_start or v_local_time <= v_end;
  end if;

  if not v_in_window then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'outside_time',
      'class_id', p_class_id,
      'window_start', to_char(v_start, 'HH24:MI'),
      'window_end', to_char(v_end, 'HH24:MI')
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'within_window',
    'bypass', false,
    'class_id', p_class_id,
    'window_start', to_char(v_start, 'HH24:MI'),
    'window_end', to_char(v_end, 'HH24:MI')
  );
end;
$$;

revoke all on function private.bes_attendance_access_decision(uuid,text,timestamptz) from public;
grant execute on function private.bes_attendance_access_decision(uuid,text,timestamptz) to authenticated;
