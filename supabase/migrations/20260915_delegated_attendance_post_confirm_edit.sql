-- 2026-09-15: restore the 30-minute post-confirm correction window for every
-- account that Admin has delegated attendance write permission to.
--
-- attendance:quick / can_take_extra_class_attendance() is the ordinary write
-- authority for extra-class attendance. The identity that originally confirmed
-- the session is audit data, not an additional authorization boundary.
-- Read-only attendance viewers remain blocked server-side.

create or replace function private.bes_extra_attendance_edit_decision(
  p_session_id uuid,
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
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_now timestamptz := coalesce(p_now, clock_timestamp());
  v_expires_at timestamptz;
  v_is_admin boolean := false;
  v_has_report boolean := false;
  v_remaining_seconds integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_uid
    and p.approved = true;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'profile_not_approved');
  end if;

  select * into v_session
  from public.bes_extra_attendance_sessions s
  where s.id = p_session_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'session_not_found');
  end if;

  if v_session.session_status <> 'completed' then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'not_completed',
      'session_id', v_session.id,
      'server_now', v_now
    );
  end if;

  if v_session.checked_at is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_checked_at',
      'session_id', v_session.id,
      'server_now', v_now
    );
  end if;

  v_expires_at := v_session.checked_at + interval '30 minutes';
  v_remaining_seconds := greatest(0, floor(extract(epoch from (v_expires_at - v_now)))::integer);
  v_is_admin := lower(coalesce(v_profile.role, '')) in ('admin', 'administrator');
  v_has_report := coalesce(v_profile.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:report';

  if v_is_admin then
    return jsonb_build_object(
      'allowed', true,
      'reason', 'admin_bypass',
      'bypass', true,
      'session_id', v_session.id,
      'checked_at', v_session.checked_at,
      'expires_at', v_expires_at,
      'remaining_seconds', v_remaining_seconds,
      'server_now', v_now
    );
  end if;

  if v_has_report then
    return jsonb_build_object(
      'allowed', true,
      'reason', 'report_bypass',
      'bypass', true,
      'session_id', v_session.id,
      'checked_at', v_session.checked_at,
      'expires_at', v_expires_at,
      'remaining_seconds', v_remaining_seconds,
      'server_now', v_now
    );
  end if;

  if not public.can_take_extra_class_attendance() then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'missing_permission',
      'session_id', v_session.id,
      'expires_at', v_expires_at,
      'remaining_seconds', v_remaining_seconds,
      'server_now', v_now
    );
  end if;

  if v_now > v_expires_at then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'edit_window_expired',
      'session_id', v_session.id,
      'checked_at', v_session.checked_at,
      'expires_at', v_expires_at,
      'remaining_seconds', 0,
      'server_now', v_now
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'within_edit_window',
    'bypass', false,
    'session_id', v_session.id,
    'checked_at', v_session.checked_at,
    'expires_at', v_expires_at,
    'remaining_seconds', v_remaining_seconds,
    'server_now', v_now
  );
end;
$$;

revoke all on function private.bes_extra_attendance_edit_decision(uuid,timestamptz) from public;
revoke all on function private.bes_extra_attendance_edit_decision(uuid,timestamptz) from anon;
grant execute on function private.bes_extra_attendance_edit_decision(uuid,timestamptz) to authenticated;

comment on function private.bes_extra_attendance_edit_decision(uuid,timestamptz) is
  'Post-confirm attendance edit decision: Admin/report bypass; delegated attendance operators may edit any completed session for checked_at + 30 minutes.';
