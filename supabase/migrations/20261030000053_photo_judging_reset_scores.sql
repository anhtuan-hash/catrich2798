-- Atomic, service-only reset for one judge in an OPEN BRIAN Photo Story session.
-- A reset removes only this judge's scores and permits resubmission using the existing link.
create or replace function public.bes_judging_reset_scores(
  p_session_id uuid, p_invite_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_invite uuid;
  v_deleted integer;
begin
  -- Serialize with session-closing updates; never reopen finalized results.
  select s.status into v_status
  from public.bes_judging_sessions s
  where s.id = p_session_id
  for update;
  if v_status is distinct from 'open' then
    raise exception 'Chỉ có thể chấm lại khi phiên chấm đang mở.';
  end if;

  select j.id into v_invite
  from public.bes_judging_invites j
  where j.id = p_invite_id
    and j.session_id = p_session_id
    and j.revoked_at is null
  for update;
  if v_invite is null then
    raise exception 'Giám khảo không tồn tại trong phiên chấm hoặc đã bị thu hồi.';
  end if;

  delete from public.bes_judging_scores
  where invite_id = v_invite;
  get diagnostics v_deleted = row_count;

  update public.bes_judging_invites
  set submitted_at = null
  where id = v_invite;

  return v_deleted;
end;
$$;
-- The Edge Function authenticates Admins; browsers and anonymous users cannot call this RPC.
revoke all on function public.bes_judging_reset_scores(uuid,uuid) from public, anon, authenticated;
grant execute on function public.bes_judging_reset_scores(uuid,uuid) to service_role;
comment on function public.bes_judging_reset_scores(uuid,uuid) is
  'Server-only atomic score deletion + rejudging for one invite while session is open.';
