begin;

alter table public.gcp_assignments add column lesson_template text not null default 'climate'
  check (lesson_template in ('climate','asean-in-three-frames'));

-- Keep the established transactional assignment and invitation workflow.
create function public.museum_issue_templated_assignment(
  p_teacher uuid,p_reviewer uuid,p_school text,p_class text,p_title text,
  p_brief text,p_deadline timestamptz,p_tokens jsonb,p_template text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_template is distinct from 'asean-in-three-frames' or jsonb_array_length(p_tokens) is distinct from 10
 then raise exception 'invalid_lesson_template'; end if;
 result:=public.gcp_staff_issue_assignment(p_teacher,p_reviewer,p_school,p_class,p_title,p_brief,p_deadline,p_tokens);
 update public.gcp_assignments set lesson_template=p_template where id=(result#>>'{assignment,id}')::uuid;
 return jsonb_set(result,'{assignment,lesson_template}',to_jsonb(p_template));
end;
$$;

revoke all on function public.museum_issue_templated_assignment(uuid,uuid,text,text,text,text,timestamptz,jsonb,text)
  from public,anon,authenticated;
grant execute on function public.museum_issue_templated_assignment(uuid,uuid,text,text,text,text,timestamptz,jsonb,text)
  to service_role;

alter table public.museum_live_responses drop constraint museum_live_responses_stage_index_check,
  add constraint museum_live_responses_stage_index_check check (
    stage_index in (0,1,2,7,10) or
    (stage_index in (3,4,5) and jsonb_typeof(value)='object') or
    (stage_index=3 and jsonb_typeof(value)='array' and jsonb_path_match(
      value,'strict $.size() == 3 && ($[0] == 0 || $[0] == 1 || $[0] == 2) && ($[1] == 0 || $[1] == 1 || $[1] == 2) && ($[2] == 0 || $[2] == 1 || $[2] == 2)','{}',true
    ) is true)
  );

create or replace function public.museum_evidence_write_guard() returns trigger language plpgsql set search_path='' as $$
declare s public.museum_live_sessions; kit text;
begin
 if tg_table_name='gcp_drafts' then
  select ls.* into s from public.museum_live_sessions ls join public.gcp_groups g on g.assignment_id=ls.assignment_id where g.id=new.group_id for update of ls;
  select a.lesson_template into kit from public.gcp_assignments a join public.gcp_groups g on g.assignment_id=a.id where g.id=new.group_id;
  if kit='asean-in-three-frames' then
   if s.id is null or s.status<>'active' or not s.stage_open or s.stage_index not in (2,4)
      or exists(select 1 from public.museum_checkpoints where session_id=s.id and group_id=new.group_id and kind='after')
   then raise exception 'museum_asean_editing_closed'; end if;
   return new;
  end if;
  if s.id is not null and (s.status<>'active' or not s.stage_open or s.stage_index not in (3,4,6,7,8,9,10)) then raise exception 'Teacher has closed editing'; end if;
 else
  select * into s from public.museum_live_sessions where id=new.session_id for update;
  if s.status<>'active' or not s.stage_open or s.stage_index<>new.stage_index then raise exception 'Activity is closed'; end if;
  select lesson_template into kit from public.gcp_assignments where id=s.assignment_id;
  if kit='asean-in-three-frames' then
   if new.stage_index not in (0,1,3,4,5) or jsonb_typeof(new.value) is distinct from 'object'
      or not exists(select 1 from public.gcp_groups where id=new.group_id and assignment_id=s.assignment_id)
   then raise exception 'Invalid group response'; end if;
   return new;
  end if;
  if new.stage_index in (4,5) then raise exception 'Invalid activity'; end if;
  if new.stage_index=2 and exists(select 1 from public.museum_survey_snapshots where session_id=s.id) then raise exception 'Survey is frozen'; end if;
 end if;
 return new;
end $$;

create or replace function public.museum_capture_transition() returns trigger language plpgsql set search_path='' as $$
declare k text; kit text;
begin
 if new.stage_index=old.stage_index then return new; end if;
 select lesson_template into kit from public.gcp_assignments where id=new.assignment_id;
 if kit='asean-in-three-frames' then
  if old.stage_index<>2 or new.stage_index<>3 then return new; end if;
  k:='before';
 else
 k:=case when old.stage_index=4 and new.stage_index=5 then 'storyboard' when old.stage_index=6 and new.stage_index=7 then 'before' when old.stage_index=8 and new.stage_index=9 then 'after' end;
 end if;
 if k is null then return new; end if;
 insert into public.museum_checkpoints(session_id,group_id,kind,doc,version)
 select new.id,g.id,k,coalesce(d.doc,'{}'::jsonb),coalesce(d.version,0) from public.gcp_groups g left join public.gcp_drafts d on d.group_id=g.id where g.assignment_id=new.assignment_id on conflict do nothing;
 if k='before' then
  insert into public.museum_peer_pairs(session_id,from_group,to_group,checkpoint_id)
  select new.id,x.id,x.target,c.id from (
   select id,coalesce(lead(id) over(order by label collate "C",id),first_value(id) over(order by label collate "C",id)) target
   from public.gcp_groups where assignment_id=new.assignment_id
  ) x join public.museum_checkpoints c on c.session_id=new.id and c.group_id=x.target and c.kind='before'
  where x.id<>x.target on conflict do nothing;
 end if;
 return new;
end $$;

-- Store the revision that a fresh group will actually see. Lock the session
-- before reading the draft, matching the draft trigger's session lock.
create function public.museum_asean_capture_revision(p_session uuid,p_group uuid,p_version integer,p_question integer,p_reason text)
returns public.museum_checkpoints language plpgsql security invoker set search_path='' as $$
declare lesson public.museum_live_sessions; saved public.gcp_drafts; initial public.museum_checkpoints; final public.museum_checkpoints;
begin
 select * into lesson from public.museum_live_sessions where id=p_session for update;
 if lesson.id is null or lesson.status<>'active' or not lesson.stage_open or lesson.stage_index<>4
    or not exists(select 1 from public.gcp_assignments a where a.id=lesson.assignment_id
       and a.lesson_template='asean-in-three-frames' and a.content_frozen_at is null and a.archived_at is null)
    or not exists(select 1 from public.gcp_groups g where g.id=p_group and g.assignment_id=lesson.assignment_id)
 then raise exception 'Activity is closed'; end if;
 if p_question is null or p_question not between 1 and 3 or p_reason is null or length(trim(p_reason)) not between 1 and 300
 then raise exception 'Invalid revision details'; end if;
 select * into saved from public.gcp_drafts where group_id=p_group;
 select * into initial from public.museum_checkpoints where session_id=p_session and group_id=p_group and kind='before';
 if saved.group_id is null or saved.version<>p_version then raise exception 'version_conflict'; end if;
 if initial.id is null or not exists (
  select 1 from unnest(array['issue','evidence','solution']) as frame(key)
  where initial.doc->'learning'->frame.key is distinct from saved.doc->'learning'->frame.key
     or initial.doc->'artworks'->frame.key is distinct from saved.doc->'artworks'->frame.key
 )
 then raise exception 'museum_asean_revision_unchanged'; end if;
 insert into public.museum_checkpoints(session_id,group_id,kind,doc,version)
 values(p_session,p_group,'after',saved.doc||jsonb_build_object('retestQuestion',p_question,'revisionReason',trim(p_reason)),saved.version)
 on conflict(session_id,group_id,kind) do nothing returning * into final;
 if final.id is null then
  select * into final from public.museum_checkpoints where session_id=p_session and group_id=p_group and kind='after';
  if final.version<>p_version or final.doc->>'retestQuestion'<>p_question::text or final.doc->>'revisionReason'<>trim(p_reason) then raise exception 'version_conflict'; end if;
 end if;
 return final;
end;
$$;
revoke all on function public.museum_asean_capture_revision(uuid,uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.museum_asean_capture_revision(uuid,uuid,integer,integer,text) to service_role;

create or replace function public.gcp_admin_approve_with_rubric(
  p_review uuid,
  p_actor uuid,
  p_note text,
  p_scores jsonb,
  p_expected_updated_at timestamptz
) returns text
language plpgsql security invoker set search_path = ''
as $approve_with_rubric$
declare
  review_state text;
  criterion record;
  score numeric;
  total integer := 0;
  maximum_total integer := 100;
  kit text;
begin
  if jsonb_typeof(p_scores) is distinct from 'object' then
    raise exception 'invalid_rubric';
  end if;
  select a.lesson_template into kit
  from public.gcp_reviews r join public.gcp_groups g on g.id=r.group_id
  join public.gcp_assignments a on a.id=g.assignment_id where r.id=p_review;
  if kit='asean-in-three-frames' then maximum_total:=10; end if;
  if (select count(*) from jsonb_object_keys(p_scores)) <> (case when maximum_total=10 then 4 else 5 end) then
    raise exception 'invalid_rubric';
  end if;
  for criterion in
    select key, maximum from (values
      ('english',40,100), ('evidence',20,100), ('reasoning',15,100), ('design',15,100), ('revision',10,100),
      ('english',4,10), ('evidence',2,10), ('design',2,10), ('revision',2,10)
    ) as limits(key, maximum, scale) where scale=maximum_total
  loop
    if jsonb_typeof(p_scores->criterion.key) is distinct from 'number' then
      raise exception 'invalid_rubric';
    end if;
    score := (p_scores->>criterion.key)::numeric;
    if score <> trunc(score) or score < 0 or score > criterion.maximum then
      raise exception 'invalid_rubric';
    end if;
    total := total + score::integer;
  end loop;

  select state into review_state from public.gcp_reviews where id=p_review for update;
  perform public.gcp_admin_decide(p_review,p_actor,'approve',p_note);

  if p_expected_updated_at is null then
    insert into public.gcp_rubric_scores(review_id,teacher_id,scores,feedback,updated_at)
    values(p_review,p_actor,p_scores,coalesce(p_note,''),clock_timestamp())
    on conflict (review_id) do nothing;
  else
    update public.gcp_rubric_scores
    set teacher_id=p_actor,scores=p_scores,feedback=coalesce(p_note,''),updated_at=clock_timestamp()
    where review_id=p_review and updated_at=p_expected_updated_at;
  end if;
  if not found then raise exception 'stale_rubric'; end if;

  insert into public.gcp_review_events(review_id,actor_type,actor_id,action,from_state,to_state,note)
  values(p_review,'admin',p_actor,'rubric_scored',review_state,'approved_locked','Rubric '||total||'/'||maximum_total);
  return 'approved_locked';
end;
$approve_with_rubric$;


-- Enforce the same version and open stage for the atomic submission, even if
-- a teacher advances while the group's request is in flight.
create function public.museum_asean_submission_guard() returns trigger
language plpgsql set search_path='' as $$
declare lesson public.museum_live_sessions; kit text; selected_assignment uuid;
begin
 select a.id,a.lesson_template into selected_assignment,kit from public.gcp_groups g
 join public.gcp_assignments a on a.id=g.assignment_id where g.id=new.group_id;
 if kit is distinct from 'asean-in-three-frames' then return new; end if;
 select ls.* into lesson from public.museum_live_sessions ls where ls.assignment_id=selected_assignment for update;
 if lesson.id is null or lesson.stage_index<>5 or lesson.status<>'active' or not lesson.stage_open
 then raise exception 'museum_asean_submission_closed'; end if;
 if not exists(select 1 from public.museum_checkpoints where session_id=lesson.id and group_id=new.group_id
               and kind='after' and version=new.version)
 then raise exception 'version_conflict'; end if;
 return new;
end;
$$;
revoke all on function public.museum_asean_submission_guard() from public,anon,authenticated;
create trigger museum_asean_submission_guard before insert on public.gcp_reviews
 for each row execute function public.museum_asean_submission_guard();

commit;
