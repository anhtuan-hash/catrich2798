-- Abuse guard for existing anonymous practice share-token RPCs.
-- Only adds bounded token/answer size checks and share/IP rolling rate limits.
-- Preserves access grants, scoring behavior, existing shares and stored attempts.
-- 600 GET per minute and 240 submissions per minute per share and source IP.
CREATE OR REPLACE FUNCTION public.qb_public_practice_get(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_share public.assessment_practice_share_tokens%rowtype;
  v_practice public.assessment_practice_sets%rowtype;
  v_attempts bigint;
begin
  -- Bound untrusted public inputs before hash lookups or JSONB record parsing.
  if length(coalesce(p_token,'')) > 512 then
    return jsonb_build_object('ok',false,'error','invalid_or_disabled');
  end if;
  select * into v_share
  from public.assessment_practice_share_tokens
  where token_hash=md5(coalesce(p_token,'')) and active=true
  limit 1;

  if v_share.id is null then return jsonb_build_object('ok',false,'error','invalid_or_disabled'); end if;
  if v_share.expires_at is not null and v_share.expires_at<now() then return jsonb_build_object('ok',false,'error','expired'); end if;
  if not public.app_public_rate_limit_allow(
    'qb_public_practice_get',
    v_share.id::text || ':' || coalesce(inet_client_addr()::text,'unknown'),
    600,
    60
  ) then
    return jsonb_build_object('ok',false,'error','rate_limited');
  end if;

  select count(*) into v_attempts from public.assessment_practice_attempts where practice_id=v_share.practice_id and status='submitted';
  if v_attempts>=v_share.max_attempts then return jsonb_build_object('ok',false,'error','attempt_limit'); end if;

  select * into v_practice from public.assessment_practice_sets where id=v_share.practice_id;
  if v_practice.id is null or v_practice.status<>'published' then return jsonb_build_object('ok',false,'error','unavailable'); end if;

  update public.assessment_practice_share_tokens set last_used_at=now() where id=v_share.id;

  return jsonb_build_object(
    'ok',true,
    'practice',jsonb_build_object(
      'id',v_practice.id,'title',v_practice.title,'grade',v_practice.grade,
      'schoolYear',v_practice.school_year,'settings',v_practice.settings
    ),
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,'position',pi.position,'stem',i.stem,'options',i.options,
        'questionType',i.question_type,'cefr',i.cefr,'topic',i.topic,
        'bundleId',i.bundle_id,'bundleTitle',b.title,'bundleContext',b.context_text,
        'bundleInstructions',b.instructions
      ) order by pi.position)
      from public.assessment_practice_items pi
      join public.assessment_items i on i.id=pi.item_id
      left join public.assessment_bundles b on b.id=i.bundle_id
      where pi.practice_id=v_practice.id and i.status='approved'
    ),'[]'::jsonb)
  );
end;
$function$;


CREATE OR REPLACE FUNCTION public.qb_public_practice_submit(p_token text, p_session_id uuid, p_learner_label text, p_responses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_share public.assessment_practice_share_tokens%rowtype;
  v_attempt_id uuid;
  v_score numeric;
  v_max numeric;
  v_attempts bigint;
begin
  -- Bound untrusted public inputs before hash lookups or JSONB record parsing.
  if length(coalesce(p_token,'')) > 512 then
    return jsonb_build_object('ok',false,'error','invalid_or_disabled');
  end if;
  -- Check type and size separately so invalid JSON cannot cause exceptions.
  if p_responses is not null and jsonb_typeof(p_responses) <> 'array' then
    return jsonb_build_object('ok',false,'error','invalid_responses');
  end if;
  if p_responses is not null and pg_column_size(p_responses) > 524288 then
    return jsonb_build_object('ok',false,'error','payload_too_large');
  end if;
  if p_responses is not null and jsonb_array_length(p_responses) > 500 then
    return jsonb_build_object('ok',false,'error','too_many_responses');
  end if;

  select * into v_share
  from public.assessment_practice_share_tokens
  where token_hash=md5(coalesce(p_token,'')) and active=true
  limit 1;

  if v_share.id is null then return jsonb_build_object('ok',false,'error','invalid_or_disabled'); end if;
  if v_share.expires_at is not null and v_share.expires_at<now() then return jsonb_build_object('ok',false,'error','expired'); end if;
  if not public.app_public_rate_limit_allow(
    'qb_public_practice_submit',
    v_share.id::text || ':' || coalesce(inet_client_addr()::text,'unknown'),
    240,
    60
  ) then
    return jsonb_build_object('ok',false,'error','rate_limited');
  end if;
  select count(*) into v_attempts from public.assessment_practice_attempts where practice_id=v_share.practice_id and status='submitted';
  if v_attempts>=v_share.max_attempts then return jsonb_build_object('ok',false,'error','attempt_limit'); end if;

  if p_session_id is null then p_session_id := gen_random_uuid(); end if;

  insert into public.assessment_practice_attempts(
    practice_id,learner_id,anonymous_session_id,learner_label,status,score,max_score,started_at,submitted_at,metadata
  )
  values(
    v_share.practice_id,auth.uid(),p_session_id,left(coalesce(p_learner_label,''),120),'submitted',
    0,0,now(),now(),jsonb_build_object('publicShare',true)
  )
  returning id into v_attempt_id;

  insert into public.assessment_practice_responses(
    attempt_id,item_id,selected_answer,is_correct,response_time_seconds
  )
  select
    v_attempt_id,pi.item_id,upper(left(coalesce(r.answer,''),1)),
    upper(left(coalesce(r.answer,''),1))=upper(left(i.correct_answer,1)),
    case when r.seconds is null then null else greatest(0,least(r.seconds,7200)) end
  from public.assessment_practice_items pi
  join public.assessment_items i on i.id=pi.item_id
  left join jsonb_to_recordset(coalesce(p_responses,'[]'::jsonb)) as r(item_id uuid,answer text,seconds integer)
    on r.item_id=pi.item_id
  where pi.practice_id=v_share.practice_id;

  select count(*) filter(where r.is_correct)::numeric,count(*)::numeric
  into v_score,v_max
  from public.assessment_practice_responses r
  where r.attempt_id=v_attempt_id;

  update public.assessment_practice_attempts
  set score=v_score,max_score=v_max,submitted_at=now()
  where id=v_attempt_id;

  update public.assessment_practice_share_tokens set last_used_at=now() where id=v_share.id;

  return jsonb_build_object(
    'ok',true,'attemptId',v_attempt_id,'score',v_score,'maxScore',v_max,
    'results',coalesce((
      select jsonb_agg(jsonb_build_object(
        'itemId',i.id,'selectedAnswer',r.selected_answer,'isCorrect',r.is_correct,
        'correctAnswer',i.correct_answer,'explanation',i.explanation
      ) order by pi.position)
      from public.assessment_practice_items pi
      join public.assessment_items i on i.id=pi.item_id
      join public.assessment_practice_responses r on r.item_id=i.id and r.attempt_id=v_attempt_id
      where pi.practice_id=v_share.practice_id
    ),'[]'::jsonb)
  );
end;
$function$;

