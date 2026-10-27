-- TTCM cannot silently reassign an existing verified attendance identity to a different account.
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

  if exists (
    select 1 from public.bes_teacher_attendance_identity_links link
    where link.head_id=v_actor and link.department_id=p_department_id
      and link.normalized_name=v_match and link.teacher_id<>p_teacher_id
  ) or exists(
    select 1 from public.bes_learning_report_class_bindings b
    join public.bes_extra_classes c on c.id=b.class_id
    where b.head_id=v_actor and b.teacher_id<>p_teacher_id
      and lower(btrim(c.subject))=lower(btrim(v_dept->>'subject'))
      and lower(regexp_replace(btrim(b.attendance_teacher_name),'\s+',' ','g'))=v_match
  ) or exists(
    select 1 from public.bes_extra_attendance_sessions s
    join public.bes_extra_classes c on c.id=s.class_id
    where s.session_status='completed' and s.teacher_id is not null
      and s.teacher_id<>p_teacher_id
      and lower(btrim(c.subject))=lower(btrim(v_dept->>'subject'))
      and lower(regexp_replace(btrim(s.teacher_name),'\s+',' ','g'))=v_match
  ) then
    raise exception 'Source instructor already belongs to another verified teacher; manual data correction required';
  end if;
  insert into public.bes_teacher_attendance_identity_links(
    head_id,department_id,teacher_id,attendance_teacher_name,verified_by
  ) values(v_actor,p_department_id,p_teacher_id,p_source_name,v_actor)
  on conflict(head_id,department_id,normalized_name)
    do update set attendance_teacher_name=excluded.attendance_teacher_name,
      verification_status='verified',verified_by=v_actor,verified_at=now();
  return jsonb_build_object('teacherId',p_teacher_id,'sourceName',p_source_name,'verified',true);
end $fn$;