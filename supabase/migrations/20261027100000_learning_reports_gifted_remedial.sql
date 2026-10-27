-- Gifted / remedial reporting for Brian Reports. Additive; does not alter existing monthly reports.
create table if not exists public.bes_learning_report_tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  head_id uuid not null references public.profiles(id),
  department_id text not null,
  teacher_id uuid not null references public.profiles(id),
  report_kind text not null check (report_kind in ('gifted','remedial')),
  period date not null,
  due_at timestamptz not null,
  event_id uuid references public.bes_events(id) on delete set null,
  notify_enabled boolean not null default true,
  notified_read_at timestamptz,
  status text not null default 'draft' check (status in ('draft','submitted','revision','approved')),
  payload jsonb not null default '{}'::jsonb,
  reviewer_comment text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, teacher_id)
);
create index if not exists bes_learning_report_tasks_teacher_idx
  on public.bes_learning_report_tasks(teacher_id, due_at desc);
create index if not exists bes_learning_report_tasks_head_idx
  on public.bes_learning_report_tasks(head_id, period desc, report_kind);
alter table public.bes_learning_report_tasks enable row level security;
create policy "learning_reports_select" on public.bes_learning_report_tasks
  for select to authenticated
  using (teacher_id = (select auth.uid()) or head_id = (select auth.uid()) or (select public.is_admin()));
create policy "learning_reports_update" on public.bes_learning_report_tasks
  for update to authenticated
  using (teacher_id = (select auth.uid()) or head_id = (select auth.uid()) or (select public.is_admin()))
  with check (teacher_id = (select auth.uid()) or head_id = (select auth.uid()) or (select public.is_admin()));
grant select, update on public.bes_learning_report_tasks to authenticated;

create table if not exists public.bes_learning_report_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.bes_learning_report_tasks(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  session_date date not null,
  class_label text not null default '',
  topic text not null check (char_length(btrim(topic)) between 2 and 500),
  periods integer not null default 1 check (periods between 1 and 12),
  expected_count integer not null default 0 check (expected_count between 0 and 300),
  present_count integer not null default 0 check (present_count between 0 and 300 and present_count <= expected_count),
  observation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bes_learning_report_sessions_task_idx
  on public.bes_learning_report_sessions(task_id,session_date desc);
alter table public.bes_learning_report_sessions enable row level security;
create policy "learning_sessions_select" on public.bes_learning_report_sessions
  for select to authenticated using (
    teacher_id = (select auth.uid()) or (select public.is_admin())
    or exists(select 1 from public.bes_learning_report_tasks t
              where t.id=task_id and t.head_id=(select auth.uid()))
  );
create policy "learning_sessions_insert" on public.bes_learning_report_sessions
  for insert to authenticated with check (
    teacher_id=(select auth.uid()) and exists (
      select 1 from public.bes_learning_report_tasks t
      where t.id=task_id and t.teacher_id=(select auth.uid()) and t.status in ('draft','revision')
    )
  );
create policy "learning_sessions_update" on public.bes_learning_report_sessions
  for update to authenticated
  using (teacher_id=(select auth.uid()) and exists(
    select 1 from public.bes_learning_report_tasks t
    where t.id=task_id and t.teacher_id=(select auth.uid()) and t.status in ('draft','revision')
  ))
  with check (teacher_id=(select auth.uid()) and exists(
    select 1 from public.bes_learning_report_tasks t
    where t.id=task_id and t.teacher_id=(select auth.uid()) and t.status in ('draft','revision')
  ));
create policy "learning_sessions_delete" on public.bes_learning_report_sessions
  for delete to authenticated using (
    teacher_id=(select auth.uid()) and exists (
      select 1 from public.bes_learning_report_tasks t
      where t.id=task_id and t.teacher_id=(select auth.uid()) and t.status in ('draft','revision')
    )
  );
grant select,insert,update,delete on public.bes_learning_report_sessions to authenticated;

-- Prevent privilege escalation through client-side updates (RLS alone is not column-level security).
create or replace function public.bes_learning_report_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id
    or new.campaign_id is distinct from old.campaign_id
    or new.head_id is distinct from old.head_id
    or new.teacher_id is distinct from old.teacher_id
    or new.department_id is distinct from old.department_id
    or new.report_kind is distinct from old.report_kind
    or new.period is distinct from old.period
    or new.due_at is distinct from old.due_at
    or new.event_id is distinct from old.event_id
    or new.notify_enabled is distinct from old.notify_enabled
    or new.created_at is distinct from old.created_at
  then raise exception 'Immutable report identity'; end if;
  -- Marking a notification read never unlocks or rewrites a submitted report.
  if (select auth.uid())=old.teacher_id
    and new.status is not distinct from old.status
    and new.payload is not distinct from old.payload
    and new.reviewer_comment is not distinct from old.reviewer_comment
    and new.submitted_at is not distinct from old.submitted_at
    and new.reviewed_at is not distinct from old.reviewed_at
    and old.notified_read_at is null and new.notified_read_at is not null
  then
    new.updated_at=now();
    return new;
  end if;
  if (select auth.uid())=old.teacher_id and old.status in ('draft','revision')
    and new.status in ('draft','submitted') then
    if old.status not in ('draft','revision') or new.status not in ('draft','submitted')
      or new.reviewer_comment is distinct from old.reviewer_comment
      or new.reviewed_at is distinct from old.reviewed_at
    then raise exception 'Report is locked for teacher edits'; end if;
    if new.status='submitted' and old.status<>'submitted' then new.submitted_at=now(); end if;
  elsif (select auth.uid())=old.head_id or (select public.is_admin()) then
    if new.payload is distinct from old.payload
      or new.teacher_id is distinct from old.teacher_id
      or new.submitted_at is distinct from old.submitted_at
    then raise exception 'Reviewer cannot edit teacher submission'; end if;
    if new.status not in ('revision','approved',old.status) then
      raise exception 'Invalid reviewer transition'; end if;
    if new.status='revision' and btrim(new.reviewer_comment)='' then
      raise exception 'Revision comment required'; end if;
    if new.status in ('revision','approved') then new.reviewed_at=now(); end if;
  else
    raise exception 'Not authorized to modify report';
  end if;
  new.updated_at=now();
  return new;
end $$;
revoke all on function public.bes_learning_report_guard() from public,anon;
drop trigger if exists bes_learning_report_guard_trigger on public.bes_learning_report_tasks;
create trigger bes_learning_report_guard_trigger before update
on public.bes_learning_report_tasks for each row execute function public.bes_learning_report_guard();

create or replace function public.bes_learning_session_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='UPDATE' and (new.id is distinct from old.id or new.task_id is distinct from old.task_id
      or new.teacher_id is distinct from old.teacher_id or new.created_at is distinct from old.created_at)
  then raise exception 'Immutable session identity'; end if;
  new.updated_at=now();
  return new;
end $$;
revoke all on function public.bes_learning_session_guard() from public,anon;
drop trigger if exists bes_learning_session_guard_trigger on public.bes_learning_report_sessions;
create trigger bes_learning_session_guard_trigger before update
on public.bes_learning_report_sessions for each row execute function public.bes_learning_session_guard();

-- Atomic TTCM dispatch: validates every recipient against the TTCM-owned department,
-- creates one event for the cohort, and saves individually scoped report assignments.
-- Elevated privileges are limited by explicit approved-role, owner and roster checks.
create or replace function public.bes_issue_learning_reports(
  p_department_id text, p_kind text, p_period date, p_due_at timestamptz,
  p_teacher_ids uuid[], p_send_notification boolean default true,
  p_create_event boolean default true
)
returns table(campaign_id uuid, assigned_count integer, created_event_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_campaign uuid := gen_random_uuid();
  v_event uuid;
  v_department jsonb;
  v_teachers uuid[];
  v_count integer;
  v_label text;
  v_organizer text;
begin
  if v_actor is null or not exists(
    select 1 from public.profiles p
    where p.id=v_actor and p.approved=true
      and lower(p.role) in ('admin','department_head','department-head','ttcm','to_truong','tổ trưởng',
        'department_leader','department leader','subject_leader','subject leader','leader')
  ) then raise exception 'TTCM authorization required'; end if;
  if p_kind not in ('gifted','remedial') or p_period is null
    or p_due_at is null or p_due_at<=now() or p_due_at>now()+interval '370 days'
  then raise exception 'Invalid type, month or future deadline'; end if;
  select d.value into v_department
  from public.department_team_workspaces w
  cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
  where w.owner_id=v_actor and d.value->>'id'=p_department_id limit 1;
  if v_department is null then raise exception 'Department is not owned by TTCM'; end if;
  select array_agg(distinct i) into v_teachers
  from unnest(coalesce(p_teacher_ids,array[]::uuid[])) i;
  v_count:=coalesce(array_length(v_teachers,1),0);
  if v_count<1 or v_count>100 then raise exception 'Select 1 to 100 teachers'; end if;
  if exists (
    select 1 from unnest(v_teachers) i
    left join public.profiles p on p.id=i and p.approved=true
    where p.id is null or not exists (
      select 1 from jsonb_array_elements(coalesce(v_department->'members','[]'::jsonb)) m
      where m->>'teacherAccountId'=i::text and coalesce(m->>'status','active')='active'
    )
  ) then raise exception 'One or more teachers are not active department members'; end if;
  v_label := case when p_kind='gifted' then 'Bồi dưỡng học sinh giỏi' else 'Phụ đạo học sinh' end;
  v_organizer:=coalesce(nullif(v_department->>'name',''),'Tổ chuyên môn');
  if p_create_event then
    insert into public.bes_events(
      title,category,summary,description,organizer,school_year,
      event_start_at,event_end_at,display_start_at,display_end_at,
      venue_type,venue_name,priority,frequency,status,created_by,updated_by,published_at
    ) values(
      'Hạn nộp báo cáo '||v_label,
      'Thông báo chung',
      'Yêu cầu nộp báo cáo '||v_label||' kỳ '||to_char(p_period,'MM/YYYY'),
      'Mở Brian Reports → Bồi dưỡng & Phụ đạo để thực hiện báo cáo. Yêu cầu dành riêng cho giáo viên được phân công.',
      v_organizer,
      case when extract(month from p_period)>=8 then extract(year from p_period)::int::text||'-'||(extract(year from p_period)::int+1)::text
        else (extract(year from p_period)::int-1)::text||'-'||extract(year from p_period)::int::text end,
      greatest(now(),p_due_at - interval '15 minutes'), p_due_at + interval '5 minutes',
      now()-interval '1 minute',p_due_at + interval '1 day',
      'online','Brian Reports', 'important','once','published',v_actor,v_actor,now()
    ) returning id into v_event;
    insert into public.bes_event_recipients(event_id,user_id)
      select v_event,id from unnest(v_teachers) id;
  end if;
  insert into public.bes_learning_report_tasks(
    campaign_id,head_id,department_id,teacher_id,report_kind,period,due_at,event_id,notify_enabled
  ) select v_campaign,v_actor,p_department_id,id,p_kind,p_period,p_due_at,v_event,p_send_notification
    from unnest(v_teachers) id;
  return query select v_campaign,v_count,v_event;
end $$;
revoke all on function public.bes_issue_learning_reports(text,text,date,timestamptz,uuid[],boolean,boolean)
  from public,anon;
grant execute on function public.bes_issue_learning_reports(text,text,date,timestamptz,uuid[],boolean,boolean)
  to authenticated;
comment on table public.bes_learning_report_tasks is 'Teacher-scoped gifted/remedial reports, one row per recipient and dispatch.';
