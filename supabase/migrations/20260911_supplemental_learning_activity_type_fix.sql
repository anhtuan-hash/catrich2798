-- Production legacy attendance stores Bồi dưỡng as class_type='gifted'.
-- Keep the public unified vocabulary stable as remedial/enrichment/supplemental.
create or replace function public.bes_list_attendance_activities(
  p_from date default current_date,
  p_to date default current_date,
  p_activity_type text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_type text := lower(btrim(coalesce(p_activity_type,'all')));
begin
  perform private.bes_require_supplemental_reader(array['attendance:calendar','attendance:history','attendance:report']);
  if v_type not in ('all','remedial','enrichment','supplemental') then
    raise exception 'Loại hoạt động không hợp lệ.';
  end if;
  return coalesce((
    with activities as (
      select
        x.id::text as id,
        'extra'::text as source,
        case when lower(coalesce(x.class_type,'')) in ('gifted','enrichment') then 'enrichment' else 'remedial' end as activity_type,
        x.class_name as title,
        x.subject,
        x.teacher_name,
        x.attendance_date,
        x.teaching_time_range as time_range,
        x.teaching_room as room,
        x.total_students as participant_count,
        x.session_status as status,
        null::text as supplemental_kind
      from public.bes_extra_attendance_sessions x
      where x.attendance_date between p_from and p_to
      union all
      select
        s.id::text,
        'supplemental',
        'supplemental',
        s.title,
        s.subject,
        s.teacher_name,
        s.attendance_date,
        to_char(s.start_time,'HH24:MI')||'–'||to_char(s.end_time,'HH24:MI'),
        s.room,
        (select count(*) from public.bes_supplemental_session_participants p where p.session_id=s.id)::integer,
        s.status,
        s.kind
      from public.bes_supplemental_sessions s
      where s.attendance_date between p_from and p_to
    )
    select jsonb_agg(jsonb_build_object(
      'id',a.id,
      'source',a.source,
      'activityType',a.activity_type,
      'title',a.title,
      'subject',a.subject,
      'teacherName',a.teacher_name,
      'date',a.attendance_date,
      'timeRange',a.time_range,
      'room',a.room,
      'participantCount',a.participant_count,
      'status',a.status,
      'supplementalKind',a.supplemental_kind
    ) order by a.attendance_date,a.time_range,a.title)
    from activities a
    where v_type='all' or a.activity_type=v_type
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.bes_list_attendance_activities(date,date,text) from public,anon;
grant execute on function public.bes_list_attendance_activities(date,date,text) to authenticated;
