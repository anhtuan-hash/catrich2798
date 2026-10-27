-- Atomic, idempotent auto-dispatch: source is recomputed on the server.
-- Do not invoke automatically during deployment; TTCM initiates through the UI.
create or replace function public.bes_dispatch_auto_learning_reports(
 p_department_id text,p_period date,p_due_at timestamptz,
 p_kinds text[] default array['gifted','remedial']::text[],
 p_teacher_ids uuid[] default null,
 p_expected_fingerprint text default null,
 p_send_notification boolean default true,
 p_create_event boolean default true
)
returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
 v_actor uuid:=(select auth.uid());
 v_preview jsonb;v_current text;v_group jsonb;v_class jsonb;
 v_campaign uuid:=gen_random_uuid();v_task_id uuid;
 v_kind text;v_event uuid;v_name text;v_org text;v_dept jsonb;
 v_created integer:=0;v_linked integer:=0;v_skipped integer:=0;
 v_events jsonb:='[]'::jsonb;
begin
 if v_actor is null or not (select public.can_manage_brian_team())
    then raise exception 'TTCM authorization required';end if;
 if p_due_at is null or p_due_at<=now() or p_due_at>now()+interval '370 days'
    then raise exception 'Invalid future deadline'; end if;
 -- Serialize repeated and concurrent dispatch for this reporting cohort.
 perform pg_advisory_xact_lock(hashtextextended(
   v_actor::text||'|'||p_department_id||'|'||p_period::text,0));
 v_preview:=public.bes_preview_auto_learning_assignments(
   p_department_id,p_period,p_kinds,p_teacher_ids);
 v_current:=v_preview->>'fingerprint';
 if nullif(p_expected_fingerprint,'') is not null
    and p_expected_fingerprint<>v_current
   then raise exception 'Attendance changed since preview; refresh before dispatch'; end if;
 select d.value into v_dept
 from public.department_team_workspaces w
 cross join lateral jsonb_array_elements(coalesce(w.payload->'departments','[]'::jsonb)) d(value)
 where w.owner_id=v_actor and d.value->>'id'=p_department_id limit 1;
 if v_dept is null then raise exception 'Department not owned by TTCM'; end if;
 v_org:=coalesce(nullif(v_dept->>'name',''),'Tổ chuyên môn');
 -- Fail closed rather than silently claiming the same instructor for two accounts
 -- or overwriting a previously verified per-class instructor identity.
 if exists(
   select 1
   from jsonb_array_elements(v_preview->'groups') g
   cross join lateral jsonb_array_elements(g->'classLinks') x
   join public.bes_learning_report_class_bindings b
     on b.head_id=v_actor and b.report_kind=g->>'kind'
       and b.class_id=(x->>'classId')::uuid
   where
     (b.teacher_id=(g->>'teacherId')::uuid
       and lower(regexp_replace(btrim(b.attendance_teacher_name),'\s+',' ','g'))
         is distinct from lower(regexp_replace(btrim(x->>'instructorName'),'\s+',' ','g')))
     or (b.teacher_id<>(g->>'teacherId')::uuid
       and lower(regexp_replace(btrim(b.attendance_teacher_name),'\s+',' ','g'))
         =lower(regexp_replace(btrim(x->>'instructorName'),'\s+',' ','g')))
 ) then raise exception 'Conflicting existing instructor binding; verify the mapped teacher before dispatch'; end if;

 -- Pre-bind exactly the sources in the preview. No class-wide attribution.
 for v_group in select value from jsonb_array_elements(v_preview->'groups') as t(value)
 loop
   for v_class in select value from jsonb_array_elements(v_group->'classLinks') as t(value)
   loop
     insert into public.bes_learning_report_class_bindings(
       head_id,teacher_id,report_kind,class_id,attendance_teacher_name)
     values(v_actor,(v_group->>'teacherId')::uuid,v_group->>'kind',
       (v_class->>'classId')::uuid,v_class->>'instructorName')
     on conflict(head_id,teacher_id,report_kind,class_id) do nothing;
     v_linked:=v_linked+1;
   end loop;
   v_task_id:=null;
   insert into public.bes_learning_report_tasks(
      campaign_id,head_id,department_id,teacher_id,report_kind,
      period,due_at,event_id,notify_enabled)
   values(v_campaign,v_actor,p_department_id,
      (v_group->>'teacherId')::uuid,v_group->>'kind',
      p_period,p_due_at,null,p_send_notification)
   on conflict(head_id,department_id,teacher_id,report_kind,period) do nothing
   returning id into v_task_id;
   if v_task_id is null then v_skipped:=v_skipped+1;
   else v_created:=v_created+1; end if;
 end loop;

 -- One event per report kind, recipients strictly those with newly created tasks.
 if p_create_event then
   for v_kind in select distinct report_kind from public.bes_learning_report_tasks
     where campaign_id=v_campaign
   loop
     v_name:=case when v_kind='gifted' then 'Bồi dưỡng học sinh giỏi'
        else 'Phụ đạo học sinh' end;
     insert into public.bes_events(
       title,category,summary,description,organizer,school_year,
       event_start_at,event_end_at,display_start_at,display_end_at,
       venue_type,venue_name,priority,frequency,status,created_by,updated_by,published_at
     ) values(
       'Hạn nộp báo cáo '||v_name,
       'Thông báo chung',
       'Yêu cầu báo cáo '||v_name||' kỳ '||to_char(p_period,'MM/YYYY'),
       'Mở Brian Reports → Bồi dưỡng & Phụ đạo để hoàn thành báo cáo được phân công.',
       v_org,
       case when extract(month from p_period)>=8
         then extract(year from p_period)::int::text||'-'||(extract(year from p_period)::int+1)::text
         else (extract(year from p_period)::int-1)::text||'-'||extract(year from p_period)::int::text end,
       greatest(now(),p_due_at-interval '15 minutes'),p_due_at+interval '5 minutes',
       now()-interval '1 minute',p_due_at+interval '1 day',
       'online','Brian Reports','important','once','published',v_actor,v_actor,now()
     ) returning id into v_event;
     insert into public.bes_event_recipients(event_id,user_id)
       select distinct v_event,t.teacher_id from public.bes_learning_report_tasks t
       where t.campaign_id=v_campaign and t.report_kind=v_kind;
     update public.bes_learning_report_tasks t set event_id=v_event
       where t.campaign_id=v_campaign and t.report_kind=v_kind;
     v_events:=v_events||jsonb_build_array(jsonb_build_object(
       'kind',v_kind,'eventId',v_event));
   end loop;
 end if;
 return jsonb_build_object(
   'campaignId',v_campaign,'created',v_created,'existing',v_skipped,
   'linkedClasses',v_linked,'events',v_events,
   'needsReview',coalesce(jsonb_array_length(v_preview->'exceptions'),0),
   'exceptions',v_preview->'exceptions','fingerprint',v_current);
end $fn$;
revoke all on function public.bes_dispatch_auto_learning_reports(text,date,timestamptz,text[],uuid[],text,boolean,boolean) from public,anon;
grant execute on function public.bes_dispatch_auto_learning_reports(text,date,timestamptz,text[],uuid[],text,boolean,boolean) to authenticated;
