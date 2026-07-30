-- Brian English Studio — Supabase egress hardening v2
-- Returns compact weekly-practice analytics instead of transferring raw metadata
-- and every repeated open event to the browser.

create or replace function public.bes_weekly_practice_statistics_v2(
  p_practice_id uuid,
  p_result_limit integer default 5000
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with compact_events as (
    select
      event_type,
      coalesce(device_id, '') as device_id,
      date_trunc('day', created_at) as created_at,
      count(*)::integer as event_count
    from public.weekly_practice_events
    where practice_id = p_practice_id
    group by event_type, coalesce(device_id, ''), date_trunc('day', created_at)
  ),
  limited_results as (
    select
      id,
      practice_id,
      device_id,
      student_name,
      class_code,
      student_code,
      score,
      max_score,
      correct_count,
      question_count,
      duration_seconds,
      proof_path,
      created_at
    from public.weekly_practice_results
    where practice_id = p_practice_id
    order by created_at desc
    limit greatest(1, least(coalesce(p_result_limit, 5000), 5000))
  ),
  result_count as (
    select count(*)::bigint as total
    from public.weekly_practice_results
    where practice_id = p_practice_id
  )
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(to_jsonb(compact_events) order by created_at desc) from compact_events), '[]'::jsonb),
    'results', coalesce((select jsonb_agg(to_jsonb(limited_results) order by created_at desc) from limited_results), '[]'::jsonb),
    'truncated', (select total > greatest(1, least(coalesce(p_result_limit, 5000), 5000)) from result_count)
  );
$$;

grant execute on function public.bes_weekly_practice_statistics_v2(uuid, integer) to authenticated;

comment on function public.bes_weekly_practice_statistics_v2(uuid, integer) is
  'Compact weekly-practice analytics. RLS remains active because the function uses security invoker.';
