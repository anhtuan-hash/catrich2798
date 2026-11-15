-- Approve the current snapshot and save the Admin-confirmed rubric atomically.
create function public.gcp_admin_approve_with_rubric(
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
begin
  if jsonb_typeof(p_scores) is distinct from 'object' then
    raise exception 'invalid_rubric';
  end if;
  if (select count(*) from jsonb_object_keys(p_scores)) <> 5 then
    raise exception 'invalid_rubric';
  end if;
  for criterion in
    select * from (values ('english',40), ('evidence',20), ('reasoning',15), ('design',15), ('revision',10)) as limits(key, maximum)
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
  values(p_review,'admin',p_actor,'rubric_scored',review_state,'approved_locked','Rubric '||total||'/100');
  return 'approved_locked';
end;
$approve_with_rubric$;

revoke all on function public.gcp_admin_approve_with_rubric(uuid,uuid,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.gcp_admin_approve_with_rubric(uuid,uuid,text,jsonb,timestamptz) to service_role;
