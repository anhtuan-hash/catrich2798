-- Brian Reports | two independent manager dashboards (gifted / remedial).
-- No student PII, no AI, and zero changes to the source attendance rows.
create table if not exists public.bes_learning_report_deadlines(
  head_id uuid not null references public.profiles(id),
  department_id text not null,
  report_kind text not null check(report_kind in('gifted','remedial')),
  period date not null,
  due_at timestamptz,
  cleared boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(head_id,department_id,report_kind,period),
  constraint learning_deadline_consistency check (not cleared or due_at is null)
);
alter table public.bes_learning_report_deadlines enable row level security;
create policy "learning_deadlines_scoped_read" on public.bes_learning_report_deadlines
for select to authenticated using(
  head_id=(select auth.uid()) or (select public.is_admin())
  or exists(select 1 from public.bes_learning_report_tasks t
    where t.head_id=head_id and t.department_id=department_id
      and t.report_kind=report_kind and t.period=period
      and t.teacher_id=(select auth.uid()))
);
grant select on public.bes_learning_report_deadlines to authenticated;

create or replace function public.bes_set_learning_report_deadline(
  p_department_id text,p_kind text,p_period date,p_due_at timestamptz,p_clear boolean default false
) returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare v_actor uuid:=(select auth.uid());
declare v_exists boolean;
declare v_event_ids uuid[];
begin
  if v_actor is null or not (select public.can_manage_brian_team()) then
    raise exception 'TTCM authorization required'; end if;
  select exists(select 1 from public.department_team_workspaces w
    cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
    where w.owner_id=v_actor and d.value->>'id'=p_department_id)
  into v_exists;
  if not v_exists then raise exception 'Department not owned by TTCM'; end if;
  if p_kind not in ('gifted','remedial') or p_period is null
    or p_period<>date_trunc('month',p_period)::date
  then raise exception 'Invalid reporting month or programme'; end if;
  if not p_clear and (p_due_at is null or p_due_at<=now() or p_due_at>now()+interval '450 days')
  then raise exception 'Select a valid future deadline'; end if;
  insert into public.bes_learning_report_deadlines
    (head_id,department_id,report_kind,period,due_at,cleared,updated_at)
  values(v_actor,p_department_id,p_kind,p_period,
    case when p_clear then null else p_due_at end,p_clear,now())
  on conflict(head_id,department_id,report_kind,period)
  do update set due_at=excluded.due_at,cleared=excluded.cleared,updated_at=now();

  -- Re-notify unfinished recipients that a deadline has changed. The immutable
  -- assignment due_at is preserved; the override is the authoritative effective date.
  update public.bes_learning_report_tasks t
    set notified_read_at=null
    where t.head_id=v_actor and t.department_id=p_department_id
      and t.report_kind=p_kind and t.period=p_period
      and t.status in ('draft','revision') and t.notify_enabled;

  -- Events created by the dispatch are exclusively tied to this reporting cohort.
  -- Cancel on clear and re-publish on a new due date to avoid stale event deadlines.
  select array_agg(distinct t.event_id) into v_event_ids
  from public.bes_learning_report_tasks t
  where t.head_id=v_actor and t.department_id=p_department_id
    and t.report_kind=p_kind and t.period=p_period and t.event_id is not null;
  if coalesce(array_length(v_event_ids,1),0)>0 then
    if p_clear then
      update public.bes_events e set status='cancelled',updated_by=v_actor
        where e.id=any(v_event_ids) and e.created_by=v_actor and e.status<>'archived';
    else
      update public.bes_events e set
        status='published',updated_by=v_actor,
        event_start_at=greatest(now(),p_due_at-interval '15 minutes'),
        event_end_at=greatest(now()+interval '5 minutes',p_due_at+interval '5 minutes'),
        display_end_at=p_due_at+interval '1 day'
      where e.id=any(v_event_ids) and e.created_by=v_actor and e.status<>'archived';
    end if;
  end if;
  return jsonb_build_object('period',to_char(p_period,'YYYY-MM'),
    'kind',p_kind,'cleared',p_clear,'dueAt',
    case when p_clear then null else p_due_at end);
end $fn$;
revoke all on function public.bes_set_learning_report_deadline(text,text,date,timestamptz,boolean) from public,anon;
grant execute on function public.bes_set_learning_report_deadline(text,text,date,timestamptz,boolean) to authenticated;

create or replace function public.bes_learning_report_team_dashboard(
 p_department_id text,p_kind text,p_from date,p_to date
) returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare v_actor uuid:=(select auth.uid());
declare v_exists boolean;
declare v_reports jsonb;
declare v_sessions jsonb;
declare v_deadlines jsonb;
begin
  if v_actor is null or not (select public.can_manage_brian_team()) then
    raise exception 'TTCM authorization required'; end if;
  select exists(select 1 from public.department_team_workspaces w
    cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
    where w.owner_id=v_actor and d.value->>'id'=p_department_id)
  into v_exists;
  if not v_exists then raise exception 'Department not owned by TTCM'; end if;
  if p_kind not in ('gifted','remedial') or p_from is null or p_to is null
    or p_to<=p_from or p_to>p_from+interval '370 days'
  then raise exception 'Invalid programme or reporting range'; end if;

  with relevant as (
    select t.* from public.bes_learning_report_tasks t
    where t.head_id=v_actor and t.department_id=p_department_id
      and t.report_kind=p_kind and t.period>=p_from and t.period<p_to
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.id,'teacherId',t.teacher_id,'period',to_char(t.period,'YYYY-MM'),
    'status',t.status,'dueAt',t.due_at,'submittedAt',t.submitted_at,
    'reviewedAt',t.reviewed_at,
    'hasRecommendation',coalesce(btrim(t.payload->>'recommendations'),'')<>'',
    'hasDifficulty',coalesce(btrim(t.payload->>'difficulties'),'')<>'',
    'assessmentCount',case when (t.payload->>'assessmentCount') ~ '^[0-9]{1,7}$'
      then (t.payload->>'assessmentCount')::integer else null end,
    'improvedCount',case when (t.payload->>'improvedCount') ~ '^[0-9]{1,7}$'
      then (t.payload->>'improvedCount')::integer else null end,
    'goalMetCount',case when (t.payload->>'goalMetCount') ~ '^[0-9]{1,7}$'
      then (t.payload->>'goalMetCount')::integer else null end,
    'hasAchievement',coalesce(btrim(t.payload->>'achievements'),'')<>''
  ) order by t.period,t.teacher_id),'[]'::jsonb)
  into v_reports from relevant t;

  -- One row per real source session ID. The teacher constraint is enforced by
  -- instructor-scoped class binding, never by class name or report owner alone.
  -- Once approved, use frozen snapshot instead of reading mutable live attendance.
  with relevant as (
    select t.* from public.bes_learning_report_tasks t
    where t.head_id=v_actor and t.department_id=p_department_id
      and t.report_kind=p_kind and t.period>=p_from and t.period<p_to
  ),
  live as (
    select s.id,s.class_id,s.attendance_date,s.teacher_name,
      s.class_name,s.lesson_periods::numeric periods,
      s.total_students expected,s.present_count present,s.absent_count absent,
      coalesce((select count(*)::integer from public.bes_extra_attendance_records r
        where r.session_id=s.id and r.status='late'),0) late,
      t.teacher_id report_teacher
    from relevant t
    join public.bes_learning_report_class_bindings b
      on b.head_id=t.head_id and b.teacher_id=t.teacher_id
      and b.report_kind=t.report_kind
      and nullif(btrim(b.attendance_teacher_name),'') is not null
    join public.bes_extra_attendance_sessions s on s.class_id=b.class_id
      and s.class_type=t.report_kind and s.session_status='completed'
      and lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))
        =lower(regexp_replace(btrim(b.attendance_teacher_name),'\s+',' ','g'))
      and s.attendance_date>=t.period
      and s.attendance_date<(t.period+interval '1 month')::date
    where t.status<>'approved' or t.attendance_snapshot is null
  ),
  frozen as (
    select (x->>'id')::uuid id,(x->>'classId')::uuid class_id,
      (x->>'date')::date attendance_date,x->>'instructorName' teacher_name,
      x->>'className' class_name,
      coalesce((x->>'periods')::numeric,0) periods,
      coalesce((x->>'expected')::integer,0) expected,
      coalesce((x->>'present')::integer,0) present,
      coalesce((x->>'absent')::integer,0) absent,
      coalesce((x->>'late')::integer,0) late,t.teacher_id report_teacher
    from relevant t
    cross join lateral jsonb_array_elements(coalesce(t.attendance_snapshot->'sessions','[]'::jsonb)) x
    where t.status='approved' and t.attendance_snapshot is not null
  ),
  unioned as (select * from live union all select * from frozen),
  unique_sessions as (select distinct on (id) * from unioned order by id,report_teacher)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'teacherId',s.report_teacher,'classId',s.class_id,
    'className',s.class_name,'instructorName',s.teacher_name,
    'period',to_char(s.attendance_date,'YYYY-MM'),
    'date',s.attendance_date,'periods',s.periods,'expected',s.expected,
    'present',s.present,'absent',s.absent,'late',s.late
  ) order by s.attendance_date,s.id),'[]'::jsonb)
  into v_sessions from unique_sessions s;

  select coalesce(jsonb_agg(jsonb_build_object(
    'period',to_char(d.period,'YYYY-MM'),'dueAt',d.due_at,'cleared',d.cleared
  ) order by d.period),'[]'::jsonb) into v_deadlines
  from public.bes_learning_report_deadlines d
  where d.head_id=v_actor and d.department_id=p_department_id
    and d.report_kind=p_kind and d.period>=p_from and d.period<p_to;

  return jsonb_build_object('departmentId',p_department_id,'kind',p_kind,
    'from',p_from,'to',p_to,'reports',v_reports,'sessions',v_sessions,
    'deadlines',v_deadlines,'syncedAt',now());
end $fn$;
revoke all on function public.bes_learning_report_team_dashboard(text,text,date,date) from public,anon;
grant execute on function public.bes_learning_report_team_dashboard(text,text,date,date) to authenticated;
