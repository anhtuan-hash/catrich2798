-- Smart assignment identity foundation. Zero data backfills: historical
-- instructor names are matched safely at preview time; TTCM validates exceptions.
create table if not exists public.bes_teacher_attendance_identity_links (
  id uuid primary key default gen_random_uuid(),
  head_id uuid not null references public.profiles(id) on delete cascade,
  department_id text not null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  attendance_teacher_name text not null,
  normalized_name text generated always as
    (lower(regexp_replace(btrim(attendance_teacher_name), '\s+', ' ', 'g'))) stored,
  verification_status text not null default 'verified'
    check (verification_status in ('verified','rejected')),
  verified_by uuid not null references public.profiles(id),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(head_id,department_id,normalized_name)
);
alter table public.bes_teacher_attendance_identity_links enable row level security;
create policy "identity_links_manager_read"
on public.bes_teacher_attendance_identity_links for select to authenticated
using (head_id=(select auth.uid()) or (select public.is_admin()));
grant select on public.bes_teacher_attendance_identity_links to authenticated;
create unique index if not exists bes_learning_report_one_per_teacher_kind_month
on public.bes_learning_report_tasks
(head_id,department_id,teacher_id,report_kind,period);

create or replace function public.bes_smart_learning_candidates(
  p_department_id text,p_period date,
  p_kinds text[] default array['gifted','remedial']::text[],
  p_teacher_ids uuid[] default null
)
returns table (
  session_id uuid,class_id uuid,class_name text,report_kind text,
  source_teacher_name text,session_date date,teacher_id uuid,resolution text
) language plpgsql stable security definer set search_path=''
as $fn$
declare v_head uuid:=(select auth.uid()); v_dept jsonb; v_subject text;
begin
  if v_head is null or not (select public.can_manage_brian_team()) then
    raise exception 'TTCM authorization required'; end if;
  if p_department_id is null or p_period is null
    or p_period<>date_trunc('month',p_period)::date
    or p_kinds is null or cardinality(p_kinds)<1
    or exists(select 1 from unnest(p_kinds) kind where kind not in ('gifted','remedial'))
  then raise exception 'Invalid department, period or report types'; end if;
  select d.value into v_dept
  from public.department_team_workspaces w
  cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
  where w.owner_id=v_head and d.value->>'id'=p_department_id limit 1;
  if v_dept is null then raise exception 'Department not owned by TTCM'; end if;
  v_subject:=nullif(btrim(v_dept->>'subject'),'');
  if v_subject is null then raise exception 'Missing department subject'; end if;
  if p_teacher_ids is not null and exists (
    select 1 from unnest(p_teacher_ids) i
    where not exists(select 1 from jsonb_array_elements(coalesce(v_dept->'members','[]'::jsonb)) m
      join public.profiles p on p.id=i and p.approved
      where m->>'teacherAccountId'=i::text
        and coalesce(m->>'status','active')='active')
  ) then raise exception 'Some selected teachers are not active department members'; end if;

  return query
  with members as (
    select distinct p.id,p.full_name,p.email,p.contact_email
    from jsonb_array_elements(coalesce(v_dept->'members','[]'::jsonb)) m
    join public.profiles p on p.id::text=m->>'teacherAccountId' and p.approved
    where coalesce(m->>'status','active')='active'
  ),
  sources as (
    select s.id,s.class_id,c.class_name,s.class_type,s.teacher_name,
      s.teacher_id as source_id,s.teacher_email,s.attendance_date
    from public.bes_extra_attendance_sessions s
    join public.bes_extra_classes c on c.id=s.class_id
      and c.class_type=s.class_type and lower(btrim(c.subject))=lower(v_subject)
    where s.session_status='completed'
      and s.class_type=any(p_kinds)
      and s.attendance_date>=p_period
      and s.attendance_date<(p_period+interval '1 month')::date
      and lower(btrim(s.subject))=lower(v_subject)
  )
  select s.id,s.class_id,s.class_name,s.class_type,s.teacher_name,s.attendance_date,
    case when ids.n=1 then ids.one_id else null::uuid end,
    case when ids.n=1 then 'verified'
      when ids.n>1 then 'ambiguous' else 'unmatched' end
  from sources s
  cross join lateral (
    select count(distinct v.id) as n,min(v.id) one_id
    from (
      -- Direct identity stored in a confirmed attendance session.
      select m.id from members m where m.id=s.source_id
      union
      -- Attested name from the persisted TTCM verification directory.
      select m.id from members m
        join public.bes_teacher_attendance_identity_links link on link.teacher_id=m.id
          and link.head_id=v_head and link.department_id=p_department_id
          and link.verification_status='verified'
        where link.normalized_name=lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))
      union
      -- Existing verified class/instructor binding, reused across months.
      select m.id from members m
        join public.bes_learning_report_class_bindings b on b.teacher_id=m.id
        where b.head_id=v_head and b.class_id=s.class_id
          and b.report_kind=s.class_type
          and lower(regexp_replace(btrim(b.attendance_teacher_name),'\s+',' ','g'))
            =lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))
      union
      -- The attendance class teacher roster owns the source instructor name.
      select m.id from members m
        join public.bes_extra_class_teachers tc on tc.teacher_id=m.id and tc.class_id=s.class_id
        where lower(regexp_replace(btrim(tc.teacher_name),'\s+',' ','g'))
          =lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))
      union
      -- Exact source/roster email, never arbitrary name guessing.
      select m.id from members m
        join public.bes_extra_class_teachers tc on tc.class_id=s.class_id
          and lower(regexp_replace(btrim(tc.teacher_name),'\s+',' ','g'))
            =lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))
        where (
          (nullif(btrim(tc.teacher_email),'') is not null
            and lower(btrim(tc.teacher_email)) in (lower(coalesce(m.email,'')),lower(coalesce(m.contact_email,''))))
          or (nullif(btrim(s.teacher_email),'') is not null
            and lower(btrim(s.teacher_email)) in (lower(coalesce(m.email,'')),lower(coalesce(m.contact_email,''))))
        )
      union
      -- Unique *exact* full name, with evidence from this class's roster.
      -- Two approved members sharing a name yield ambiguous, never auto-assigned.
      select m.id from members m
        where lower(regexp_replace(btrim(m.full_name),'\s+',' ','g'))
           =lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))
          and exists(select 1 from public.bes_extra_class_teachers tc
            where tc.class_id=s.class_id and
              lower(regexp_replace(btrim(tc.teacher_name),'\s+',' ','g'))
              =lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g')))
    ) v
  ) ids
  where p_teacher_ids is null or (ids.n=1 and ids.one_id=any(p_teacher_ids))
    or ids.n<>1;
end $fn$;
revoke all on function public.bes_smart_learning_candidates(text,date,text[],uuid[]) from public,anon;
grant execute on function public.bes_smart_learning_candidates(text,date,text[],uuid[]) to authenticated;

create or replace function public.bes_preview_auto_learning_assignments(
 p_department_id text,p_period date,
 p_kinds text[] default array['gifted','remedial']::text[],
 p_teacher_ids uuid[] default null
) returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare v_groups jsonb;v_exceptions jsonb;v_fingerprint text;
begin
  with source as (select * from public.bes_smart_learning_candidates(
    p_department_id,p_period,p_kinds,p_teacher_ids)),
  grouped as (
    select teacher_id,report_kind,count(distinct session_id)::int session_count,
      count(distinct class_id)::int class_count,
      coalesce(jsonb_agg(distinct jsonb_build_object(
        'classId',class_id,'className',class_name,'instructorName',source_teacher_name)),'[]'::jsonb) class_links
    from source where teacher_id is not null group by teacher_id,report_kind
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'teacherId',g.teacher_id,'teacherName',p.full_name,
    'kind',g.report_kind,'sessions',g.session_count,'classes',g.class_count,
    'classLinks',g.class_links,
    'existingTaskId',(select t.id from public.bes_learning_report_tasks t
      where t.head_id=auth.uid() and t.department_id=p_department_id
        and t.teacher_id=g.teacher_id and t.report_kind=g.report_kind
        and t.period=p_period limit 1)
  ) order by p.full_name,g.report_kind),'[]'::jsonb)
  into v_groups from grouped g join public.profiles p on p.id=g.teacher_id;

  with unresolved as (
    select class_id,class_name,report_kind,source_teacher_name,resolution,
      count(distinct session_id)::int count_sessions
    from public.bes_smart_learning_candidates(p_department_id,p_period,p_kinds,p_teacher_ids)
    where teacher_id is null
    group by class_id,class_name,report_kind,source_teacher_name,resolution
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'classId',class_id,'className',class_name,
    'kind',report_kind,'instructorName',source_teacher_name,
    'reason',resolution,'sessions',count_sessions
  ) order by class_name,source_teacher_name),'[]'::jsonb)
  into v_exceptions from unresolved;

  select md5(coalesce(string_agg(
    session_id::text||'|'||class_id::text||'|'||coalesce(teacher_id::text,'?')||
    '|'||report_kind||'|'||source_teacher_name,';' order by session_id),''))
  into v_fingerprint
  from public.bes_smart_learning_candidates(p_department_id,p_period,p_kinds,p_teacher_ids);
  return jsonb_build_object(
    'period',to_char(p_period,'YYYY-MM'),'departmentId',p_department_id,
    'groups',v_groups,'exceptions',v_exceptions,'fingerprint',v_fingerprint,
    'totalNew',(select count(*) from jsonb_array_elements(v_groups) g
      where g->>'existingTaskId' is null),
    'totalExisting',(select count(*) from jsonb_array_elements(v_groups) g
      where g->>'existingTaskId' is not null),
    'needsReview',jsonb_array_length(v_exceptions));
end $fn$;
revoke all on function public.bes_preview_auto_learning_assignments(text,date,text[],uuid[]) from public,anon;
grant execute on function public.bes_preview_auto_learning_assignments(text,date,text[],uuid[]) to authenticated;

create or replace function public.bes_verify_attendance_teacher_identity(
 p_department_id text,p_source_name text,p_teacher_id uuid
) returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare v_actor uuid:=(select auth.uid());v_dept jsonb;v_match text;
begin
  if v_actor is null or not (select public.can_manage_brian_team())
    then raise exception 'TTCM authorization required'; end if;
  if nullif(btrim(p_source_name),'') is null or length(p_source_name)>200
    then raise exception 'Invalid source instructor name'; end if;
  select d.value into v_dept from public.department_team_workspaces w
    cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
    where w.owner_id=v_actor and d.value->>'id'=p_department_id limit 1;
  if v_dept is null then raise exception 'Department not owned by TTCM'; end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(v_dept->'members','[]'::jsonb)) m
    join public.profiles p on p.id=p_teacher_id and p.approved
    where m->>'teacherAccountId'=p_teacher_id::text
      and coalesce(m->>'status','active')='active')
    then raise exception 'Teacher is not an active department member'; end if;
  v_match:=lower(regexp_replace(btrim(p_source_name),'\s+',' ','g'));
  if not exists (
    select 1 from public.bes_extra_attendance_sessions s
    join public.bes_extra_classes c on c.id=s.class_id
    where s.session_status='completed'
      and lower(btrim(c.subject))=lower(btrim(v_dept->>'subject'))
      and lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))=v_match
  ) then raise exception 'Name not found in confirmed attendance for department subject';end if;

  insert into public.bes_teacher_attendance_identity_links(
    head_id,department_id,teacher_id,attendance_teacher_name,verified_by
  ) values(v_actor,p_department_id,p_teacher_id,p_source_name,v_actor)
  on conflict(head_id,department_id,normalized_name)
    do update set teacher_id=excluded.teacher_id,
      attendance_teacher_name=excluded.attendance_teacher_name,
      verification_status='verified',verified_by=v_actor,verified_at=now();
  return jsonb_build_object('teacherId',p_teacher_id,'sourceName',p_source_name,'verified',true);
end $fn$;
revoke all on function public.bes_verify_attendance_teacher_identity(text,text,uuid) from public,anon;
grant execute on function public.bes_verify_attendance_teacher_identity(text,text,uuid) to authenticated;
