-- Correct attendance attribution for two instructors teaching the same gifted/remedial class.
-- Existing class-only bindings must NOT grant access to sessions until TTCM confirms an instructor.
alter table public.bes_learning_report_class_bindings
  add column if not exists attendance_teacher_name text;
create unique index if not exists bes_learning_teacher_session_name_once
  on public.bes_learning_report_class_bindings
  (head_id,report_kind,class_id,lower(btrim(attendance_teacher_name)))
  where attendance_teacher_name is not null and btrim(attendance_teacher_name)<>'';

-- Prevent stale class-only bindings (or old clients) from attributing sessions to both teachers.
-- Cached clients must refresh to the new class + instructor selection workflow.
revoke execute on function public.bes_learning_report_bind_classes(uuid,uuid[]) from authenticated;
comment on column public.bes_learning_report_class_bindings.attendance_teacher_name is
  'TTCM-confirmed instructor identity from the attendance class teacher roster; null fails closed and never contributes to attendance totals.';

create or replace function public.bes_learning_report_class_options(p_task_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
declare
  v_task public.bes_learning_report_tasks%rowtype;
  v_subject text;
begin
  select * into v_task from public.bes_learning_report_tasks where id=p_task_id;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;
  if (select auth.uid()) is distinct from v_task.head_id
    or not (select public.can_manage_brian_team())
  then raise exception 'Chỉ TTCM phụ trách được liên kết lớp và giáo viên'; end if;

  select d.value->>'subject' into v_subject
    from public.department_team_workspaces w
    cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
    where w.owner_id=v_task.head_id and d.value->>'id'=v_task.department_id limit 1;
  if nullif(btrim(coalesce(v_subject,'')),'') is null
    then raise exception 'Tổ chuyên môn chưa có môn học hợp lệ'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',c.id,'name',c.class_name,'subject',c.subject,'grade',c.grade_level,
      'schoolYear',c.school_year,'active',c.active,
      'linked',exists(select 1 from public.bes_learning_report_class_bindings b
        where b.head_id=v_task.head_id and b.teacher_id=v_task.teacher_id
          and b.report_kind=v_task.report_kind and b.class_id=c.id
          and nullif(btrim(b.attendance_teacher_name),'') is not null),
      'linkedInstructor',(select b.attendance_teacher_name
        from public.bes_learning_report_class_bindings b
        where b.head_id=v_task.head_id and b.teacher_id=v_task.teacher_id
          and b.report_kind=v_task.report_kind and b.class_id=c.id limit 1),
      'instructors',coalesce((
        select jsonb_agg(jsonb_build_object(
          'name',t.teacher_name,
          'confirmedSessions',(select count(*) from public.bes_extra_attendance_sessions s
            where s.class_id=c.id and s.class_type=v_task.report_kind
              and s.session_status='completed'
              and lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))
                =lower(regexp_replace(btrim(t.teacher_name),'\s+',' ','g'))
              and s.attendance_date>=v_task.period
              and s.attendance_date<(v_task.period+interval '1 month')::date
          ),
          'linkedToThisTeacher',exists(select 1 from public.bes_learning_report_class_bindings b
            where b.class_id=c.id and b.head_id=v_task.head_id
              and b.report_kind=v_task.report_kind and b.teacher_id=v_task.teacher_id
              and lower(btrim(b.attendance_teacher_name))=lower(btrim(t.teacher_name))),
          'assignedToOther',exists(select 1 from public.bes_learning_report_class_bindings b
            where b.class_id=c.id and b.head_id=v_task.head_id
              and b.report_kind=v_task.report_kind and b.teacher_id<>v_task.teacher_id
              and lower(btrim(b.attendance_teacher_name))=lower(btrim(t.teacher_name)))
        ) order by t.teacher_name)
        from (
          select distinct on (lower(regexp_replace(btrim(tc.teacher_name),'\s+',' ','g')))
            tc.teacher_name
          from public.bes_extra_class_teachers tc
          where tc.class_id=c.id and btrim(coalesce(tc.teacher_name,''))<>''
          order by lower(regexp_replace(btrim(tc.teacher_name),'\s+',' ','g')),tc.teacher_name
        ) t
      ),'[]'::jsonb)
    ) order by c.class_name)
    from public.bes_extra_classes c
    where c.class_type=v_task.report_kind
      and lower(btrim(c.subject))=lower(btrim(v_subject))
  ),'[]'::jsonb);
end $fn$;
revoke all on function public.bes_learning_report_class_options(uuid) from public,anon;
grant execute on function public.bes_learning_report_class_options(uuid) to authenticated;

-- Only TTCM assigns the exact instructor identity already recorded in Attendance's
-- teacher roster. No free-text identities accepted from the browser.
create or replace function public.bes_learning_report_bind_instructors(
  p_task_id uuid,p_links jsonb
) returns integer
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  v_task public.bes_learning_report_tasks%rowtype;
  v_subject text;
  v_count integer;
begin
  if jsonb_typeof(p_links) is distinct from 'array'
    then raise exception 'Danh sách liên kết phải là một mảng'; end if;
  select * into v_task from public.bes_learning_report_tasks
    where id=p_task_id for share;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;
  if (select auth.uid()) is distinct from v_task.head_id
    or not (select public.can_manage_brian_team())
  then raise exception 'Chỉ TTCM phụ trách được liên kết giáo viên'; end if;

  -- A published approval represents a historical frozen data set.
  if exists(select 1 from public.bes_learning_report_tasks t
    where t.head_id=v_task.head_id and t.teacher_id=v_task.teacher_id
      and t.report_kind=v_task.report_kind and t.status='approved')
  then raise exception 'Có báo cáo đã duyệt: không được thay đổi liên kết lịch sử'; end if;

  select d.value->>'subject' into v_subject
    from public.department_team_workspaces w
    cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
    where w.owner_id=v_task.head_id and d.value->>'id'=v_task.department_id limit 1;
  if nullif(btrim(coalesce(v_subject,'')),'') is null
    then raise exception 'Tổ chuyên môn chưa có môn học hợp lệ'; end if;

  v_count:=jsonb_array_length(p_links);
  if v_count>100 then raise exception 'Chỉ được liên kết tối đa 100 lớp'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_links) x
    where nullif(btrim(x->>'classId'),'') is null
       or nullif(btrim(x->>'instructorName'),'') is null
       or (x->>'classId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or length(btrim(x->>'instructorName'))>200
  ) then raise exception 'Thiếu lớp hoặc tên giáo viên điểm danh hợp lệ'; end if;

  if (select count(distinct (x->>'classId')::uuid) from jsonb_array_elements(p_links) x)<>v_count
  then raise exception 'Mỗi lớp chỉ được chọn một giáo viên cho báo cáo'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_links) x
    left join public.bes_extra_classes c
      on c.id=(x->>'classId')::uuid and c.class_type=v_task.report_kind
      and lower(btrim(c.subject))=lower(btrim(v_subject))
    where c.id is null or not exists(
      select 1 from public.bes_extra_class_teachers ct
        where ct.class_id=c.id
          and lower(regexp_replace(btrim(ct.teacher_name),'\s+',' ','g'))
            =lower(regexp_replace(btrim(x->>'instructorName'),'\s+',' ','g'))
          and (ct.teacher_id is null or ct.teacher_id=v_task.teacher_id)
    )
  ) then raise exception 'Lớp hoặc giáo viên giảng dạy không thuộc phân công điểm danh'; end if;

  -- Prevent two report recipients from claiming the same class + named instructor.
  if exists (
    select 1 from jsonb_array_elements(p_links) x
    join public.bes_learning_report_class_bindings b
      on b.class_id=(x->>'classId')::uuid
      and b.report_kind=v_task.report_kind and b.head_id=v_task.head_id
      and b.teacher_id<>v_task.teacher_id
      and lower(regexp_replace(btrim(b.attendance_teacher_name),'\s+',' ','g'))
        =lower(regexp_replace(btrim(x->>'instructorName'),'\s+',' ','g'))
  ) then raise exception 'Giáo viên này đã được liên kết cho người khác trong cùng lớp'; end if;

  delete from public.bes_learning_report_class_bindings b
    where b.head_id=v_task.head_id and b.teacher_id=v_task.teacher_id
      and b.report_kind=v_task.report_kind
      and not exists(select 1 from jsonb_array_elements(p_links) x where (x->>'classId')::uuid=b.class_id);

  insert into public.bes_learning_report_class_bindings
    (head_id,teacher_id,report_kind,class_id,attendance_teacher_name)
  select v_task.head_id,v_task.teacher_id,v_task.report_kind,
    (x->>'classId')::uuid, btrim(x->>'instructorName')
  from jsonb_array_elements(p_links) x
  on conflict(head_id,teacher_id,report_kind,class_id)
    do update set attendance_teacher_name=excluded.attendance_teacher_name;
  return v_count;
end $fn$;
revoke all on function public.bes_learning_report_bind_instructors(uuid,jsonb)
  from public,anon;
grant execute on function public.bes_learning_report_bind_instructors(uuid,jsonb) to authenticated;

-- Read-through now filters each source session using the verified instructor's
-- actual attendance teacher name, not merely the class the instructor shares.
create or replace function public.bes_learning_report_attendance(p_task_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
declare
  v_task public.bes_learning_report_tasks%rowtype;
  v_classes jsonb;
  v_sessions jsonb;
  v_totals jsonb;
begin
  select * into v_task from public.bes_learning_report_tasks where id=p_task_id;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;
  if (select auth.uid()) is distinct from v_task.teacher_id
    and (select auth.uid()) is distinct from v_task.head_id
    and not (select public.is_admin())
  then raise exception 'Bạn không có quyền xem báo cáo này'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'name',c.class_name,'subject',c.subject,'grade',c.grade_level,
    'schoolYear',c.school_year,'instructorName',b.attendance_teacher_name,
    'registered',(select count(*) from public.bes_extra_class_members m
      where m.class_id=c.id and m.active=true)
  ) order by c.class_name),'[]'::jsonb) into v_classes
  from public.bes_learning_report_class_bindings b
  join public.bes_extra_classes c on c.id=b.class_id and c.class_type=v_task.report_kind
  where b.head_id=v_task.head_id and b.teacher_id=v_task.teacher_id
    and b.report_kind=v_task.report_kind
    and nullif(btrim(b.attendance_teacher_name),'') is not null
    and exists(select 1 from public.bes_extra_class_teachers t
      where t.class_id=c.id
        and lower(regexp_replace(btrim(t.teacher_name),'\s+',' ','g'))
          =lower(regexp_replace(btrim(b.attendance_teacher_name),'\s+',' ','g')));

  with data as (
    select s.id,s.class_id,s.attendance_date,s.class_name,s.teacher_name,s.lesson_periods,
      s.total_students,s.present_count,s.absent_count,s.note,
      coalesce((select count(*)::integer from public.bes_extra_attendance_records r
        where r.session_id=s.id and r.status='late'),0) as late_count
    from public.bes_extra_attendance_sessions s
    join public.bes_learning_report_class_bindings b
      on b.class_id=s.class_id and b.head_id=v_task.head_id
      and b.teacher_id=v_task.teacher_id and b.report_kind=v_task.report_kind
      and nullif(btrim(b.attendance_teacher_name),'') is not null
      and lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))
        =lower(regexp_replace(btrim(b.attendance_teacher_name),'\s+',' ','g'))
    where s.session_status='completed' and s.class_type=v_task.report_kind
      and s.attendance_date>=v_task.period
      and s.attendance_date<(v_task.period+interval '1 month')::date
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'classId',class_id,'date',attendance_date,
      'className',class_name,'instructorName',teacher_name,
      'periods',lesson_periods,'expected',total_students,'present',present_count,
      'absent',absent_count,'late',late_count,
      'onTime',greatest(0,present_count-late_count),'note',coalesce(note,'')
    ) order by attendance_date,class_name,id),'[]'::jsonb),
    jsonb_build_object(
      'sessions',count(*),'periods',coalesce(sum(lesson_periods),0),
      'expected',coalesce(sum(total_students),0),
      'present',coalesce(sum(present_count),0),
      'absent',coalesce(sum(absent_count),0),
      'late',coalesce(sum(late_count),0)
    ) into v_sessions,v_totals from data;

  return jsonb_build_object(
    'period',to_char(v_task.period,'YYYY-MM'),
    'source','bes_extra_attendance_sessions',
    'teacherId',v_task.teacher_id,
    'classes',v_classes,'sessions',v_sessions,'totals',v_totals,'syncedAt',now()
  );
end $fn$;
revoke all on function public.bes_learning_report_attendance(uuid) from public,anon;
grant execute on function public.bes_learning_report_attendance(uuid) to authenticated;
