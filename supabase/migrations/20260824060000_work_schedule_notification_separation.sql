-- Work Schedule notification separation
-- Work items keep their existing notification behavior.
-- Work Schedule rows remain in Work Hub/Schedule but must never create bell notifications.

begin;

create or replace function public.bes_v1133_notify_work_users(
  target_item uuid,
  target_users uuid[],
  target_type text,
  target_title text,
  target_body text,
  actor uuid default auth.uid()
) returns void
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  recipient uuid;
  suppress_notification boolean := false;
begin
  select (
    lower(coalesce(item.item_type, '')) = 'schedule'
    or lower(coalesce(item.source_module, '')) like 'work-schedule%'
    or lower(coalesce(item.metadata->>'schedule_event', 'false')) = 'true'
    or lower(coalesce(item.metadata->>'schedule_only', 'false')) = 'true'
  )
  into suppress_notification
  from public.work_hub_items item
  where item.id = target_item;

  if coalesce(suppress_notification, false) then
    return;
  end if;

  foreach recipient in array coalesce(target_users, '{}'::uuid[]) loop
    if recipient is not null and recipient is distinct from actor then
      insert into public.work_hub_notifications(
        user_id,
        item_id,
        notification_type,
        title,
        body
      ) values (
        recipient,
        target_item,
        target_type,
        left(target_title, 240),
        left(coalesce(target_body, ''), 1000)
      );
    end if;
  end loop;
end $$;

-- Persist the non-notifying intent on all existing schedule rows without changing
-- their title, dates, assignees, visibility, or any Schedule-tab functionality.
update public.work_hub_items item
set metadata = jsonb_set(
  jsonb_set(coalesce(item.metadata, '{}'::jsonb), '{schedule_notify_all}', 'false'::jsonb, true),
  '{notify_assignee}',
  'false'::jsonb,
  true
)
where lower(coalesce(item.item_type, '')) = 'schedule'
   or lower(coalesce(item.source_module, '')) like 'work-schedule%'
   or lower(coalesce(item.metadata->>'schedule_event', 'false')) = 'true'
   or lower(coalesce(item.metadata->>'schedule_only', 'false')) = 'true';

-- Remove only legacy notification records that belong to Work Schedule items.
-- The Work Schedule items themselves remain untouched.
delete from public.work_hub_notifications notification
using public.work_hub_items item
where notification.item_id = item.id
  and (
    lower(coalesce(item.item_type, '')) = 'schedule'
    or lower(coalesce(item.source_module, '')) like 'work-schedule%'
    or lower(coalesce(item.metadata->>'schedule_event', 'false')) = 'true'
    or lower(coalesce(item.metadata->>'schedule_only', 'false')) = 'true'
  );

commit;
