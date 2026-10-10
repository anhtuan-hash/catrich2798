-- Fun for Assessment: end-to-end classroom assessment sessions.
-- Teachers use assigned class rosters, select/randomize participants, run an activity,
-- record flexible raw results + normalized /10 scores, and report progress over time.

create table if not exists public.lesson_check_assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  class_name text not null,
  grade smallint,
  activity_id uuid references public.lesson_check_activities(id) on delete set null,
  activity_title text not null default '',
  focus_area text not null default 'unclassified',
  unit_no smallint,
  unit_title text not null default '',
  lesson_title text not null default '',
  purpose text not null default 'formative',
  participation_mode text not null default 'individual',
  scoring_mode text not null default 'manual',
  scoring_config jsonb not null default '{}'::jsonb,
  group_config jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  teaching_adjustment text not null default '',
  notes text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_check_assessment_purpose_check check (
    purpose in ('warm_up','prior_knowledge','formative','reinforcement','exit_ticket','unit_review','other')
  ),
  constraint lesson_check_assessment_participation_check check (
    participation_mode in ('individual','group')
  ),
  constraint lesson_check_assessment_scoring_check check (
    scoring_mode in ('manual','points','correct_answers','rubric','completion','ranking','other')
  ),
  constraint lesson_check_assessment_status_check check (
    status in ('draft','completed')
  ),
  constraint lesson_check_assessment_focus_check check (
    focus_area in ('vocabulary','grammar','reading','listening','speaking','mixed','unclassified')
  )
);

create table if not exists public.lesson_check_assessment_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_check_assessment_sessions(id) on delete cascade,
  student_ref text not null,
  student_code text not null default '',
  student_name text not null,
  group_label text not null default '',
  raw_result text not null default '',
  score_value numeric,
  score_max numeric,
  grade_10 numeric,
  achievement text not null default '',
  result_payload jsonb not null default '{}'::jsonb,
  note text not null default '',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, student_ref),
  constraint lesson_check_assessment_grade10_check check (
    grade_10 is null or (grade_10 >= 0 and grade_10 <= 10)
  )
);

create index if not exists lesson_check_assessment_sessions_teacher_idx
  on public.lesson_check_assessment_sessions(teacher_id, completed_at desc nulls last, created_at desc);

create index if not exists lesson_check_assessment_sessions_class_idx
  on public.lesson_check_assessment_sessions(class_name, completed_at desc nulls last);

create index if not exists lesson_check_assessment_results_session_idx
  on public.lesson_check_assessment_results(session_id);

create index if not exists lesson_check_assessment_results_student_idx
  on public.lesson_check_assessment_results(student_ref);

alter table public.lesson_check_assessment_sessions enable row level security;
alter table public.lesson_check_assessment_results enable row level security;

drop policy if exists "Assessment session owners can read" on public.lesson_check_assessment_sessions;
create policy "Assessment session owners can read"
  on public.lesson_check_assessment_sessions
  for select to authenticated
  using (teacher_id = auth.uid() or public.lesson_check_is_leader());

drop policy if exists "Assessment session owners can insert" on public.lesson_check_assessment_sessions;
create policy "Assessment session owners can insert"
  on public.lesson_check_assessment_sessions
  for insert to authenticated
  with check (teacher_id = auth.uid() and public.lesson_check_is_approved_user());

drop policy if exists "Assessment session owners can update" on public.lesson_check_assessment_sessions;
create policy "Assessment session owners can update"
  on public.lesson_check_assessment_sessions
  for update to authenticated
  using (teacher_id = auth.uid() or public.lesson_check_is_leader())
  with check (teacher_id = auth.uid() or public.lesson_check_is_leader());

drop policy if exists "Assessment session owners can delete" on public.lesson_check_assessment_sessions;
create policy "Assessment session owners can delete"
  on public.lesson_check_assessment_sessions
  for delete to authenticated
  using (teacher_id = auth.uid() or public.lesson_check_is_leader());

drop policy if exists "Assessment result viewers can read" on public.lesson_check_assessment_results;
create policy "Assessment result viewers can read"
  on public.lesson_check_assessment_results
  for select to authenticated
  using (exists (
    select 1 from public.lesson_check_assessment_sessions s
    where s.id = session_id
      and (s.teacher_id = auth.uid() or public.lesson_check_is_leader())
  ));

drop policy if exists "Assessment result owners can insert" on public.lesson_check_assessment_results;
create policy "Assessment result owners can insert"
  on public.lesson_check_assessment_results
  for insert to authenticated
  with check (exists (
    select 1 from public.lesson_check_assessment_sessions s
    where s.id = session_id
      and (s.teacher_id = auth.uid() or public.lesson_check_is_leader())
  ));

drop policy if exists "Assessment result owners can update" on public.lesson_check_assessment_results;
create policy "Assessment result owners can update"
  on public.lesson_check_assessment_results
  for update to authenticated
  using (exists (
    select 1 from public.lesson_check_assessment_sessions s
    where s.id = session_id
      and (s.teacher_id = auth.uid() or public.lesson_check_is_leader())
  ))
  with check (exists (
    select 1 from public.lesson_check_assessment_sessions s
    where s.id = session_id
      and (s.teacher_id = auth.uid() or public.lesson_check_is_leader())
  ));

drop policy if exists "Assessment result owners can delete" on public.lesson_check_assessment_results;
create policy "Assessment result owners can delete"
  on public.lesson_check_assessment_results
  for delete to authenticated
  using (exists (
    select 1 from public.lesson_check_assessment_sessions s
    where s.id = session_id
      and (s.teacher_id = auth.uid() or public.lesson_check_is_leader())
  ));

create or replace function public.lesson_check_save_assessment_session(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_activity uuid;
  v_status text;
  v_result jsonb;
begin
  if not public.lesson_check_is_approved_user() then
    raise exception 'Approved account required';
  end if;

  begin
    v_id := nullif(trim(coalesce(p_payload->>'id','')), '')::uuid;
  exception when invalid_text_representation then
    v_id := null;
  end;

  begin
    v_activity := nullif(trim(coalesce(p_payload->>'activityId','')), '')::uuid;
  exception when invalid_text_representation then
    v_activity := null;
  end;

  v_status := case when p_payload->>'status' = 'completed' then 'completed' else 'draft' end;

  if v_id is null then
    insert into public.lesson_check_assessment_sessions (
      teacher_id, class_name, grade, activity_id, activity_title, focus_area,
      unit_no, unit_title, lesson_title, purpose, participation_mode,
      scoring_mode, scoring_config, group_config, status,
      teaching_adjustment, notes, started_at, completed_at
    ) values (
      v_user,
      trim(coalesce(p_payload->>'className','')),
      nullif(p_payload->>'grade','')::smallint,
      v_activity,
      coalesce(p_payload->>'activityTitle',''),
      coalesce(nullif(p_payload->>'focusArea',''),'unclassified'),
      nullif(p_payload->>'unitNo','')::smallint,
      coalesce(p_payload->>'unitTitle',''),
      coalesce(p_payload->>'lessonTitle',''),
      coalesce(nullif(p_payload->>'purpose',''),'formative'),
      coalesce(nullif(p_payload->>'participationMode',''),'individual'),
      coalesce(nullif(p_payload->>'scoringMode',''),'manual'),
      coalesce(p_payload->'scoringConfig','{}'::jsonb),
      coalesce(p_payload->'groupConfig','{}'::jsonb),
      v_status,
      coalesce(p_payload->>'teachingAdjustment',''),
      coalesce(p_payload->>'notes',''),
      coalesce(nullif(p_payload->>'startedAt','')::timestamptz, now()),
      case when v_status='completed' then coalesce(nullif(p_payload->>'completedAt','')::timestamptz, now()) else null end
    )
    returning id into v_id;
  else
    if not exists (
      select 1 from public.lesson_check_assessment_sessions s
      where s.id=v_id and (s.teacher_id=v_user or public.lesson_check_is_leader())
    ) then
      raise exception 'Assessment session not found or access denied';
    end if;

    update public.lesson_check_assessment_sessions
    set
      class_name = trim(coalesce(p_payload->>'className',class_name)),
      grade = coalesce(nullif(p_payload->>'grade','')::smallint, grade),
      activity_id = coalesce(v_activity, activity_id),
      activity_title = coalesce(p_payload->>'activityTitle', activity_title),
      focus_area = coalesce(nullif(p_payload->>'focusArea',''), focus_area),
      unit_no = coalesce(nullif(p_payload->>'unitNo','')::smallint, unit_no),
      unit_title = coalesce(p_payload->>'unitTitle', unit_title),
      lesson_title = coalesce(p_payload->>'lessonTitle', lesson_title),
      purpose = coalesce(nullif(p_payload->>'purpose',''), purpose),
      participation_mode = coalesce(nullif(p_payload->>'participationMode',''), participation_mode),
      scoring_mode = coalesce(nullif(p_payload->>'scoringMode',''), scoring_mode),
      scoring_config = coalesce(p_payload->'scoringConfig', scoring_config),
      group_config = coalesce(p_payload->'groupConfig', group_config),
      status = v_status,
      teaching_adjustment = coalesce(p_payload->>'teachingAdjustment', teaching_adjustment),
      notes = coalesce(p_payload->>'notes', notes),
      started_at = coalesce(nullif(p_payload->>'startedAt','')::timestamptz, started_at),
      completed_at = case when v_status='completed' then coalesce(nullif(p_payload->>'completedAt','')::timestamptz, completed_at, now()) else null end,
      updated_at = now()
    where id=v_id;
  end if;

  if jsonb_typeof(p_payload->'results') = 'array' then
    delete from public.lesson_check_assessment_results where session_id=v_id;

    for v_result in select value from jsonb_array_elements(p_payload->'results')
    loop
      if trim(coalesce(v_result->>'studentRef','')) = '' then
        continue;
      end if;
      insert into public.lesson_check_assessment_results (
        session_id, student_ref, student_code, student_name, group_label,
        raw_result, score_value, score_max, grade_10, achievement,
        result_payload, note
      ) values (
        v_id,
        trim(v_result->>'studentRef'),
        coalesce(v_result->>'studentCode',''),
        coalesce(nullif(v_result->>'studentName',''),'Học sinh'),
        coalesce(v_result->>'groupLabel',''),
        coalesce(v_result->>'rawResult',''),
        nullif(v_result->>'scoreValue','')::numeric,
        nullif(v_result->>'scoreMax','')::numeric,
        nullif(v_result->>'grade10','')::numeric,
        coalesce(v_result->>'achievement',''),
        coalesce(v_result->'payload','{}'::jsonb),
        coalesce(v_result->>'note','')
      );
    end loop;
  end if;

  return v_id;
end;
$$;

revoke all on function public.lesson_check_save_assessment_session(jsonb) from public;
revoke execute on function public.lesson_check_save_assessment_session(jsonb) from anon;
grant execute on function public.lesson_check_save_assessment_session(jsonb) to authenticated;

create or replace function public.lesson_check_list_assessment_sessions(
  p_class_name text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  teacher_id uuid,
  teacher_name text,
  class_name text,
  grade smallint,
  activity_id uuid,
  activity_title text,
  focus_area text,
  unit_no smallint,
  unit_title text,
  lesson_title text,
  purpose text,
  participation_mode text,
  scoring_mode text,
  status text,
  teaching_adjustment text,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  result_count bigint,
  student_count bigint,
  average_grade_10 numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.teacher_id,
    coalesce(p.full_name,p.email,'Giáo viên') as teacher_name,
    s.class_name,
    s.grade,
    s.activity_id,
    s.activity_title,
    s.focus_area,
    s.unit_no,
    s.unit_title,
    s.lesson_title,
    s.purpose,
    s.participation_mode,
    s.scoring_mode,
    s.status,
    s.teaching_adjustment,
    s.notes,
    s.started_at,
    s.completed_at,
    count(r.id) as result_count,
    count(distinct r.student_ref) as student_count,
    round(avg(r.grade_10),2) as average_grade_10
  from public.lesson_check_assessment_sessions s
  left join public.profiles p on p.id=s.teacher_id
  left join public.lesson_check_assessment_results r on r.session_id=s.id
  where public.lesson_check_is_approved_user()
    and (s.teacher_id=auth.uid() or public.lesson_check_is_leader())
    and (p_class_name is null or trim(p_class_name)='' or s.class_name=p_class_name)
  group by s.id,p.full_name,p.email
  order by coalesce(s.completed_at,s.started_at) desc
  limit greatest(1,least(coalesce(p_limit,100),500));
$$;

revoke all on function public.lesson_check_list_assessment_sessions(text,integer) from public;
revoke execute on function public.lesson_check_list_assessment_sessions(text,integer) from anon;
grant execute on function public.lesson_check_list_assessment_sessions(text,integer) to authenticated;

create or replace function public.lesson_check_list_assessment_results(
  p_class_name text default null
)
returns table (
  session_id uuid,
  teacher_name text,
  class_name text,
  activity_title text,
  focus_area text,
  unit_no smallint,
  lesson_title text,
  purpose text,
  participation_mode text,
  scoring_mode text,
  completed_at timestamptz,
  student_ref text,
  student_code text,
  student_name text,
  group_label text,
  raw_result text,
  score_value numeric,
  score_max numeric,
  grade_10 numeric,
  achievement text,
  note text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    coalesce(p.full_name,p.email,'Giáo viên') as teacher_name,
    s.class_name,
    s.activity_title,
    s.focus_area,
    s.unit_no,
    s.lesson_title,
    s.purpose,
    s.participation_mode,
    s.scoring_mode,
    s.completed_at,
    r.student_ref,
    r.student_code,
    r.student_name,
    r.group_label,
    r.raw_result,
    r.score_value,
    r.score_max,
    r.grade_10,
    r.achievement,
    r.note
  from public.lesson_check_assessment_sessions s
  join public.lesson_check_assessment_results r on r.session_id=s.id
  left join public.profiles p on p.id=s.teacher_id
  where public.lesson_check_is_approved_user()
    and s.status='completed'
    and (s.teacher_id=auth.uid() or public.lesson_check_is_leader())
    and (p_class_name is null or trim(p_class_name)='' or s.class_name=p_class_name)
  order by s.completed_at desc nulls last, r.student_name;
$$;

revoke all on function public.lesson_check_list_assessment_results(text) from public;
revoke execute on function public.lesson_check_list_assessment_results(text) from anon;
grant execute on function public.lesson_check_list_assessment_results(text) to authenticated;
