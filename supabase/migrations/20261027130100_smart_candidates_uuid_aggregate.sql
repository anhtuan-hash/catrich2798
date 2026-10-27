-- PostgreSQL uuid has no min(uuid); select first unique id by array aggregate.
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
    select count(distinct v.id) as n,(array_agg(distinct v.id))[1] one_id
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
