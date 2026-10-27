-- Prevent cross-department/cross-subject attendance mapping. Subjects are derived
-- from the TTCM-owned Brian Team department, never supplied by a browser.
create or replace function public.bes_learning_report_class_options(p_task_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
declare v_task public.bes_learning_report_tasks%rowtype;
declare v_subject text;
begin
  select * into v_task from public.bes_learning_report_tasks where id=p_task_id;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;
  if (select auth.uid()) is distinct from v_task.head_id
    or not (select public.can_manage_brian_team())
  then raise exception 'Chỉ TTCM phụ trách được liên kết lớp'; end if;
  select d.value->>'subject' into v_subject
  from public.department_team_workspaces w
  cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
  where w.owner_id=v_task.head_id and d.value->>'id'=v_task.department_id limit 1;
  if nullif(btrim(coalesce(v_subject,'')),'') is null then
    raise exception 'Tổ chuyên môn chưa được xác định môn học'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',c.id,'name',c.class_name,'subject',c.subject,'grade',c.grade_level,
      'schoolYear',c.school_year,'active',c.active,
      'linked',exists(select 1 from public.bes_learning_report_class_bindings b
        where b.head_id=v_task.head_id and b.teacher_id=v_task.teacher_id
          and b.report_kind=v_task.report_kind and b.class_id=c.id),
      'completedSessions',(select count(*) from public.bes_extra_attendance_sessions s
        where s.class_id=c.id and s.session_status='completed'
          and s.attendance_date>=v_task.period
          and s.attendance_date<(v_task.period+interval '1 month')::date)
    ) order by c.class_name)
    from public.bes_extra_classes c where c.class_type=v_task.report_kind and lower(btrim(c.subject))=lower(btrim(v_subject))
  ),'[]'::jsonb);
end $fn$;
revoke all on function public.bes_learning_report_class_options(uuid) from public,anon;
grant execute on function public.bes_learning_report_class_options(uuid) to authenticated;

create or replace function public.bes_learning_report_bind_classes(p_task_id uuid,p_class_ids uuid[])
returns integer
language plpgsql volatile security definer set search_path = ''
as $fn$
declare v_task public.bes_learning_report_tasks%rowtype;
declare v_subject text;
declare v_ids uuid[];
declare v_n integer;
begin
  select * into v_task from public.bes_learning_report_tasks where id=p_task_id for share;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;
  if (select auth.uid()) is distinct from v_task.head_id
    or not (select public.can_manage_brian_team())
  then raise exception 'Chỉ TTCM phụ trách được liên kết lớp'; end if;
  select d.value->>'subject' into v_subject
  from public.department_team_workspaces w
  cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
  where w.owner_id=v_task.head_id and d.value->>'id'=v_task.department_id limit 1;
  if nullif(btrim(coalesce(v_subject,'')),'') is null then
    raise exception 'Tổ chuyên môn chưa được xác định môn học'; end if;
  select coalesce(array_agg(distinct x),'{}'::uuid[]) into v_ids
    from unnest(coalesce(p_class_ids,'{}'::uuid[])) x where x is not null;
  v_n:=coalesce(cardinality(v_ids),0);
  if v_n>100 then raise exception 'Tối đa 100 lớp'; end if;
  if exists(
    select 1 from unnest(v_ids) x left join public.bes_extra_classes c
      on c.id=x and c.class_type=v_task.report_kind and lower(btrim(c.subject))=lower(btrim(v_subject))
    where c.id is null
  ) then raise exception 'Lớp không hợp lệ hoặc không đúng loại báo cáo'; end if;
  delete from public.bes_learning_report_class_bindings b
    where b.head_id=v_task.head_id and b.teacher_id=v_task.teacher_id
      and b.report_kind=v_task.report_kind and not (b.class_id=any(v_ids));
  insert into public.bes_learning_report_class_bindings
    (head_id,teacher_id,report_kind,class_id)
  select v_task.head_id,v_task.teacher_id,v_task.report_kind,id
    from unnest(v_ids) id
  on conflict do nothing;
  return v_n;
end $fn$;
revoke all on function public.bes_learning_report_bind_classes(uuid,uuid[]) from public,anon;
grant execute on function public.bes_learning_report_bind_classes(uuid,uuid[]) to authenticated;

