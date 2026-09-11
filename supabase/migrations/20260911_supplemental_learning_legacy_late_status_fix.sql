-- Production legacy attendance records use status='late'. Keep the unified
-- activity API vocabulary as tardyCount while accepting both historical and
-- forward-compatible status spellings.
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
        x.present_count as present_count,
        x.absent_count as absent_count,
        (
          select count(*)
          from public.bes_extra_attendance_records r
          where r.session_id=x.id
            and lower(coalesce(r.status,'')) in ('late','tardy')
        )::integer as tardy_count,
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
        case
          when s.kind='recurring' and s.roster_frozen_at is null then (
            select count(distinct private.bes_supplemental_canonical_key(m.student_id))
            from public.bes_supplemental_group_memberships m
            join public.bes_supplemental_students st on st.id=m.student_id and st.active=true
            where m.group_id=s.group_id
              and m.effective_from<=s.attendance_date
              and (m.effective_until is null or m.effective_until>=s.attendance_date)
          )::integer
          else (
            select count(*)
            from public.bes_supplemental_session_participants p
            where p.session_id=s.id
          )::integer
        end,
        s.present_count,
        s.absent_count,
        s.tardy_count,
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
      'totalStudents',a.participant_count,
      'presentCount',coalesce(a.present_count,0),
      'absentCount',coalesce(a.absent_count,0),
      'tardyCount',coalesce(a.tardy_count,0),
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
