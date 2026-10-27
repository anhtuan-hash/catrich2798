-- Withdraw an unstarted assignment without touching Brian Attendance or teacher work.
-- Executable only by the TTCM who owns the original report and department.
create table if not exists public.bes_learning_report_revocations (
  id uuid primary key default gen_random_uuid(),
  original_task_id uuid not null unique,
  head_id uuid not null references public.profiles(id),
  department_id text not null,
  teacher_id uuid not null references public.profiles(id),
  report_kind text not null check (report_kind in ('gifted','remedial')),
  period date not null,
  event_id uuid,
  revoked_by uuid not null references public.profiles(id),
  revoked_at timestamptz not null default now(),
  event_recipient_removed boolean not null default false,
  event_cancelled boolean not null default false
);
alter table public.bes_learning_report_revocations enable row level security;
create policy "learning_revocations_owner_select"
 on public.bes_learning_report_revocations for select to authenticated
 using (head_id=(select auth.uid()) or (select public.is_admin()));
grant select on public.bes_learning_report_revocations to authenticated;
-- No direct insert/update/delete grants: every change must pass an authorized RPC.

create or replace function public.bes_revoke_learning_report_assignment(p_task_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
  v_actor uuid := (select auth.uid());
  v_task public.bes_learning_report_tasks%rowtype;
  v_event_id uuid;
  v_recipient_removed boolean := false;
  v_event_cancelled boolean := false;
begin
  if v_actor is null or not (select public.can_manage_brian_team()) then
    raise exception 'Only the responsible department head can revoke assignments';
  end if;
  if p_task_id is null then raise exception 'Missing report assignment ID'; end if;

  -- Lock by report assignment; never change another department head's data.
  select * into v_task from public.bes_learning_report_tasks
    where id=p_task_id for update;
  if not found then raise exception 'Report assignment not found or already removed'; end if;
  if v_task.head_id is distinct from v_actor or not exists(
    select 1 from public.department_team_workspaces w
      cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
      where w.owner_id=v_actor and d.value->>'id'=v_task.department_id
  ) then raise exception 'This assignment does not belong to your department'; end if;

  -- Preserve teaching notes, submitted reports, reviewed work and all session journals.
  if v_task.status<>'draft' or v_task.submitted_at is not null
     or v_task.reviewed_at is not null or
     exists(select 1 from jsonb_each_text(coalesce(v_task.payload,'{}'::jsonb)) f
       where nullif(btrim(f.value),'') is not null)
     or exists(select 1 from public.bes_learning_report_sessions s where s.task_id=p_task_id)
  then raise exception 'This report contains work or was submitted/reviewed; cannot revoke automatically';
  end if;

  v_event_id:=v_task.event_id;
  delete from public.bes_learning_report_tasks t where t.id=p_task_id;

  if v_event_id is not null and exists(
    select 1 from public.bes_events e where e.id=v_event_id
      and e.created_by=v_actor and e.title like 'Hạn nộp báo cáo%'
  ) then
    -- Shared event: keep other assigned teachers and recipients intact.
    if not exists(select 1 from public.bes_learning_report_tasks other
      where other.event_id=v_event_id and other.teacher_id=v_task.teacher_id) then
      delete from public.bes_event_recipients r
        where r.event_id=v_event_id and r.user_id=v_task.teacher_id;
      v_recipient_removed:=found;
    end if;
    -- Last participant removed: cancel the now-empty deadline event, retain audit.
    if not exists(select 1 from public.bes_learning_report_tasks other
      where other.event_id=v_event_id) then
      update public.bes_events e
        set status='cancelled',updated_by=v_actor
        where e.id=v_event_id and e.created_by=v_actor
          and e.status not in ('archived','cancelled');
      v_event_cancelled:=found;
    end if;
  end if;

  insert into public.bes_learning_report_revocations(
    original_task_id,head_id,department_id,teacher_id,report_kind,
    period,event_id,revoked_by,event_recipient_removed,event_cancelled
  ) values(
    v_task.id,v_task.head_id,v_task.department_id,v_task.teacher_id,
    v_task.report_kind,v_task.period,v_task.event_id,v_actor,
    v_recipient_removed,v_event_cancelled
  );

  return jsonb_build_object(
    'removed',true,'taskId',v_task.id,'teacherId',v_task.teacher_id,
    'reportKind',v_task.report_kind,'period',to_char(v_task.period,'YYYY-MM'),
    'eventRecipientRemoved',v_recipient_removed,'eventCancelled',v_event_cancelled
  );
end $fn$;
revoke all on function public.bes_revoke_learning_report_assignment(uuid) from public,anon;
grant execute on function public.bes_revoke_learning_report_assignment(uuid) to authenticated;
