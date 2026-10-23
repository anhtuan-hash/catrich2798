-- All approved Admin/TTCM accounts are default recipients for published
-- announcements. Ordinary teachers remain explicitly targeted by Admin.
-- Keep publish atomic and invoker-authenticated so existing RLS remains effective.
create or replace function public.bes_publish_event(p_event_id uuid,p_recipients uuid[])
 returns public.bes_events
 language plpgsql
 security invoker
 set search_path = public, pg_temp
as $fn$
declare v_event public.bes_events;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required';
  end if;
  select * into v_event from public.bes_events
   where id=p_event_id for update;
  if not found then raise exception 'Event does not exist'; end if;
  if v_event.status not in ('draft','published') then
    raise exception 'Cannot publish cancelled/archived event';
  end if;

  -- Retain managers even when the editor only submits ordinary teachers.
  delete from public.bes_event_recipients r
  where r.event_id=p_event_id
    and not (r.user_id = any(coalesce(p_recipients,array[]::uuid[])))
    and not exists (
      select 1 from public.profiles p
      where p.id=r.user_id and p.approved=true
        and p.role in ('admin','department_head')
    );

  insert into public.bes_event_recipients(event_id,user_id)
  select p_event_id,p.id
  from public.profiles p
  where p.approved=true
    and p.role in ('admin','department_head','teacher')
    and (
      p.id = any(coalesce(p_recipients,array[]::uuid[]))
      or p.role in ('admin','department_head')
    )
  on conflict (event_id,user_id) do nothing;

  if not exists (
    select 1 from public.bes_event_recipients where event_id=p_event_id
  ) then
    raise exception 'At least one approved recipient required';
  end if;

  update public.bes_events
    set status='published',published_at=coalesce(published_at,now()),
        updated_at=now(),updated_by=auth.uid()
    where id=p_event_id
    returning * into v_event;
  return v_event;
end
$fn$;
revoke all on function public.bes_publish_event(uuid,uuid[]) from public,anon;
grant execute on function public.bes_publish_event(uuid,uuid[]) to authenticated;

-- Backfill managers for already-active announcements without altering teachers,
-- event versions, read receipts or displayed popup preferences.
insert into public.bes_event_recipients (event_id,user_id)
select e.id, p.id
from public.bes_events e
cross join public.profiles p
where e.status='published'
  and e.display_end_at > now()
  and p.approved=true
  and p.role in ('admin','department_head')
on conflict (event_id,user_id) do nothing;
