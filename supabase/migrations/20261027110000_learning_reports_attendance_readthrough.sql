-- Brian Reports: authoritative read-only linkage with completed Brian Attendance records.
-- TTCM approves a one-time class/teacher binding, reused by future monthly reports.
create table if not exists public.bes_learning_report_class_bindings (
  head_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  report_kind text not null check(report_kind in ('gifted','remedial')),
  class_id uuid not null references public.bes_extra_classes(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key(head_id,teacher_id,report_kind,class_id)
);
create index if not exists bes_learning_bindings_teacher_idx
  on public.bes_learning_report_class_bindings(teacher_id,report_kind);
alter table public.bes_learning_report_class_bindings enable row level security;
create policy "learning_bindings_read" on public.bes_learning_report_class_bindings
  for select to authenticated
  using (teacher_id=(select auth.uid()) or head_id=(select auth.uid()) or (select public.is_admin()));
grant select on public.bes_learning_report_class_bindings to authenticated;

create or replace function public.bes_learning_report_class_options(p_task_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
declare v_task public.bes_learning_report_tasks%rowtype;
begin
  select * into v_task from public.bes_learning_report_tasks where id=p_task_id;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;
  if (select auth.uid()) is distinct from v_task.head_id
    or not (select public.can_manage_brian_team())
  then raise exception 'Chỉ TTCM phụ trách được liên kết lớp'; end if;
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
    from public.bes_extra_classes c where c.class_type=v_task.report_kind
  ),'[]'::jsonb);
end $fn$;
revoke all on function public.bes_learning_report_class_options(uuid) from public,anon;
grant execute on function public.bes_learning_report_class_options(uuid) to authenticated;

create or replace function public.bes_learning_report_bind_classes(p_task_id uuid,p_class_ids uuid[])
returns integer
language plpgsql volatile security definer set search_path = ''
as $fn$
declare v_task public.bes_learning_report_tasks%rowtype;
declare v_ids uuid[];
declare v_n integer;
begin
  select * into v_task from public.bes_learning_report_tasks where id=p_task_id for share;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;
  if (select auth.uid()) is distinct from v_task.head_id
    or not (select public.can_manage_brian_team())
  then raise exception 'Chỉ TTCM phụ trách được liên kết lớp'; end if;
  select coalesce(array_agg(distinct x),'{}'::uuid[]) into v_ids
    from unnest(coalesce(p_class_ids,'{}'::uuid[])) x where x is not null;
  v_n:=coalesce(cardinality(v_ids),0);
  if v_n>100 then raise exception 'Tối đa 100 lớp'; end if;
  if exists(
    select 1 from unnest(v_ids) x left join public.bes_extra_classes c
      on c.id=x and c.class_type=v_task.report_kind
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

-- Aggregation is performed inside the database, not from personally identifiable
-- student records in the reporting UI. No student names are returned.
create or replace function public.bes_learning_report_attendance(p_task_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
declare v_task public.bes_learning_report_tasks%rowtype;
declare v_classes jsonb;
declare v_sessions jsonb;
declare v_totals jsonb;
begin
  select * into v_task from public.bes_learning_report_tasks where id=p_task_id;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;
  if (select auth.uid()) is distinct from v_task.teacher_id
    and (select auth.uid()) is distinct from v_task.head_id
    and not (select public.is_admin())
  then raise exception 'Bạn không có quyền xem số liệu báo cáo này'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'name',c.class_name,'subject',c.subject,'grade',c.grade_level,
      'schoolYear',c.school_year,
      'registered',(select count(*) from public.bes_extra_class_members m
        where m.class_id=c.id and m.active=true)
    ) order by c.class_name),'[]'::jsonb) into v_classes
  from public.bes_learning_report_class_bindings b
  join public.bes_extra_classes c on c.id=b.class_id and c.class_type=v_task.report_kind
  where b.head_id=v_task.head_id and b.teacher_id=v_task.teacher_id
    and b.report_kind=v_task.report_kind;

  with data as (
    select s.id,s.class_id,s.attendance_date,s.class_name,s.lesson_periods,
      s.total_students,s.present_count,s.absent_count,s.note,
      coalesce((select count(*)::integer from public.bes_extra_attendance_records r
        where r.session_id=s.id and r.status='late'),0) as late_count
    from public.bes_extra_attendance_sessions s
    join public.bes_learning_report_class_bindings b
      on b.class_id=s.class_id and b.head_id=v_task.head_id
      and b.teacher_id=v_task.teacher_id and b.report_kind=v_task.report_kind
    where s.session_status='completed' and s.class_type=v_task.report_kind
      and s.attendance_date>=v_task.period
      and s.attendance_date<(v_task.period+interval '1 month')::date
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'classId',class_id,'date',attendance_date,
      'className',class_name,'periods',lesson_periods,
      'expected',total_students,'present',present_count,
      'absent',absent_count,'late',late_count,
      'onTime',greatest(0,present_count-late_count),'note',coalesce(note,'')
      ) order by attendance_date,class_name),'[]'::jsonb),
    jsonb_build_object(
      'sessions',count(*),'periods',coalesce(sum(lesson_periods),0),
      'expected',coalesce(sum(total_students),0),
      'present',coalesce(sum(present_count),0),
      'absent',coalesce(sum(absent_count),0),
      'late',coalesce(sum(late_count),0)
    )
    into v_sessions,v_totals from data;

  return jsonb_build_object(
    'period',to_char(v_task.period,'YYYY-MM'),
    'source','bes_extra_attendance_sessions',
    'classes',v_classes,'sessions',v_sessions,'totals',v_totals,
    'syncedAt',now()
  );
end $fn$;
revoke all on function public.bes_learning_report_attendance(uuid) from public,anon;
grant execute on function public.bes_learning_report_attendance(uuid) to authenticated;

-- Approvals freeze a server-generated snapshot; draft/submitted reports show live
-- confirmed attendance. Clients cannot forge an approval snapshot.
alter table public.bes_learning_report_tasks
  add column if not exists attendance_snapshot jsonb;
create or replace function public.bes_learning_report_freeze_attendance()
returns trigger language plpgsql security invoker set search_path = ''
as $fn$
begin
  if new.status='approved' and old.status is distinct from 'approved' then
    new.attendance_snapshot:=public.bes_learning_report_attendance(new.id);
  else
    new.attendance_snapshot:=old.attendance_snapshot;
  end if;
  return new;
end $fn$;
revoke all on function public.bes_learning_report_freeze_attendance() from public,anon;
drop trigger if exists bes_learning_report_snapshot_trigger on public.bes_learning_report_tasks;
create trigger bes_learning_report_snapshot_trigger
  before update on public.bes_learning_report_tasks for each row
  execute function public.bes_learning_report_freeze_attendance();

comment on table public.bes_learning_report_class_bindings is
  'TTCM-approved, teacher-scoped class mappings reused by gifted/remedial reports. Only completed attendance is summarized.';
