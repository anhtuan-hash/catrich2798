-- Brian English Studio — Dashboard compact Work Hub egress v5
-- The Dashboard keeps every current card, status, shared schedule and 14-day action,
-- but receives one compact JSON response instead of two large PostgREST row sets.

create or replace function public.bes_try_timestamptz_v1(p_value text)
returns timestamptz
language plpgsql
immutable
strict
set search_path = pg_catalog, public
as $$
begin
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.bes_dashboard_work_hub_v2(
  p_range_start timestamptz,
  p_range_end timestamptz,
  p_recent_limit integer default 500,
  p_upcoming_limit integer default 500
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with source_rows as (
    select
      item.id,
      item.updated_at,
      coalesce(
        public.bes_try_timestamptz_v1(coalesce(item.metadata, '{}'::jsonb) ->> 'schedule_start_at'),
        item.due_at
      ) as effective_at,
      jsonb_strip_nulls(jsonb_build_object(
        'id', item.id,
        'title', item.title,
        'description', item.description,
        'item_type', item.item_type,
        'status', item.status,
        'priority', item.priority,
        'visibility', item.visibility,
        'owner_id', item.owner_id,
        'created_by', item.created_by,
        'assignee_ids', item.assignee_ids,
        'watcher_ids', item.watcher_ids,
        'due_at', item.due_at,
        'source_module', item.source_module,
        'metadata', jsonb_strip_nulls(jsonb_build_object(
          'hidden_from_work_hub', coalesce(item.metadata, '{}'::jsonb) -> 'hidden_from_work_hub',
          'schedule_event', coalesce(item.metadata, '{}'::jsonb) -> 'schedule_event',
          'schedule_notify_all', coalesce(item.metadata, '{}'::jsonb) -> 'schedule_notify_all',
          'assignment_scope', coalesce(item.metadata, '{}'::jsonb) -> 'assignment_scope',
          'schedule_fingerprint', coalesce(item.metadata, '{}'::jsonb) -> 'schedule_fingerprint',
          'schedule_note', coalesce(item.metadata, '{}'::jsonb) -> 'schedule_note',
          'schedule_start_at', coalesce(item.metadata, '{}'::jsonb) -> 'schedule_start_at',
          'schedule_owner_text', coalesce(item.metadata, '{}'::jsonb) -> 'schedule_owner_text'
        )),
        'created_at', item.created_at,
        'updated_at', item.updated_at
      )) as payload
    from public.work_hub_items as item
    where item.source_module is distinct from 'english-hub-ai-websites'
      and lower(coalesce(coalesce(item.metadata, '{}'::jsonb) ->> 'hidden_from_work_hub', 'false')) <> 'true'
  ),
  recent_rows as (
    select id, updated_at, effective_at, payload, 2 as source_rank
    from source_rows
    order by updated_at desc nulls last
    limit greatest(1, least(coalesce(p_recent_limit, 500), 500))
  ),
  upcoming_rows as (
    select id, updated_at, effective_at, payload, 1 as source_rank
    from source_rows
    where effective_at >= p_range_start
      and effective_at < p_range_end
    order by effective_at asc nulls last, updated_at desc nulls last
    limit greatest(1, least(coalesce(p_upcoming_limit, 500), 500))
  ),
  picked as (
    select distinct on (id)
      id,
      payload,
      updated_at
    from (
      select * from upcoming_rows
      union all
      select * from recent_rows
    ) as combined
    order by id, source_rank, updated_at desc nulls last
  ),
  ordered as (
    select payload
    from picked
    order by updated_at desc nulls last
  )
  select coalesce(jsonb_agg(payload), '[]'::jsonb)
  from ordered;
$$;

revoke all on function public.bes_dashboard_work_hub_v2(timestamptz, timestamptz, integer, integer) from public;
grant execute on function public.bes_dashboard_work_hub_v2(timestamptz, timestamptz, integer, integer) to authenticated;

comment on function public.bes_dashboard_work_hub_v2(timestamptz, timestamptz, integer, integer) is
  'Compact Work Hub payload for Dashboard. Preserves recent work, shared schedules and the complete 14-day range while RLS remains active.';
