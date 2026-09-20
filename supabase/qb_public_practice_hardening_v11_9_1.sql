-- Brian Question Bank public practice hardening v11.9.1
-- Backward-compatible token hashing, per-share attempt quotas, idempotent
-- submissions, bounded payloads, and published-only public delivery.

create or replace function public.qb_share_token_hash(p_token text)
returns text
language sql
immutable
set search_path = public, extensions, pg_catalog
as $function$
  select encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
$function$;

revoke execute on function public.qb_share_token_hash(text) from public;
revoke execute on function public.qb_share_token_hash(text) from anon;
revoke execute on function public.qb_share_token_hash(text) from authenticated;
grant execute on function public.qb_share_token_hash(text) to service_role;

create unique index if not exists assessment_practice_attempts_public_session_uniq_v1191
on public.assessment_practice_attempts(practice_id,anonymous_session_id)
where anonymous_session_id is not null;

create or replace function public.qb_create_practice_share(
  p_practice_id uuid,
  p_expires_at timestamptz default null,
  p_max_attempts integer default 500
)
returns table(token text, expires_at timestamptz, max_attempts integer)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $function$
declare
  v_owner uuid;
  v_token text;
  v_cap integer := greatest(1,least(coalesce(p_max_attempts,500),100000));
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode='42501';
  end if;

  select owner_id into v_owner
  from public.assessment_practice_sets
  where id=p_practice_id;

  if v_owner is null then raise exception 'Practice set not found'; end if;
  if v_owner<>auth.uid() and not public.bes_v1093_is_leader(auth.uid()) then
    raise exception 'Forbidden' using errcode='42501';
  end if;

  update public.assessment_practice_share_tokens
  set active=false
  where practice_id=p_practice_id and active=true;

  v_token := replace(gen_random_uuid()::text,'-','')
          || replace(gen_random_uuid()::text,'-','');

  insert into public.assessment_practice_share_tokens(
    practice_id,owner_id,token_hash,active,expires_at,max_attempts
  )
  values(
    p_practice_id,v_owner,public.qb_share_token_hash(v_token),true,p_expires_at,v_cap
  );

  update public.assessment_practice_sets
  set status='published',updated_at=now()
  where id=p_practice_id;

  return query select v_token,p_expires_at,v_cap;
end;
$function$;

revoke execute on function public.qb_create_practice_share(uuid,timestamptz,integer) from public;
revoke execute on function public.qb_create_practice_share(uuid,timestamptz,integer) from anon;
grant execute on function public.qb_create_practice_share(uuid,timestamptz,integer) to authenticated;
grant execute on function public.qb_create_practice_share(uuid,timestamptz,integer) to service_role;

revoke execute on function public.qb_disable_practice_share(uuid) from public;
revoke execute on function public.qb_disable_practice_share(uuid) from anon;
grant execute on function public.qb_disable_practice_share(uuid) to authenticated;
grant execute on function public.qb_disable_practice_share(uuid) to service_role;

create or replace function public.qb_public_practice_get(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  v_share public.assessment_practice_share_tokens%rowtype;
  v_practice public.assessment_practice_sets%rowtype;
  v_attempts bigint := 0;
begin
  select * into v_share
  from public.assessment_practice_share_tokens
  where active=true
    and token_hash in (
      public.qb_share_token_hash(coalesce(p_token,'')),
      md5(coalesce(p_token,''))
    )
  limit 1;

  if v_share.id is null then
    return jsonb_build_object('ok',false,'error','invalid_or_disabled');
  end if;
  if v_share.expires_at is not null and v_share.expires_at<now() then
    return jsonb_build_object('ok',false,'error','expired');
  end if;

  select count(*) into v_attempts
  from public.assessment_practice_attempts
  where practice_id=v_share.practice_id
    and status='submitted'
    and metadata->>'shareTokenId'=v_share.id::text;

  if v_attempts>=v_share.max_attempts then
    return jsonb_build_object('ok',false,'error','attempt_limit');
  end if;

  select * into v_practice
  from public.assessment_practice_sets
  where id=v_share.practice_id;

  if v_practice.id is null or v_practice.status<>'published' then
    return jsonb_build_object('ok',false,'error','unavailable');
  end if;

  update public.assessment_practice_share_tokens
  set last_used_at=now()
  where id=v_share.id;

  return jsonb_build_object(
    'ok',true,
    'attemptCount',v_attempts,
    'remainingAttempts',greatest(0,v_share.max_attempts-v_attempts),
    'practice',jsonb_build_object(
      'id',v_practice.id,
      'title',v_practice.title,
      'grade',v_practice.grade,
      'schoolYear',v_practice.school_year,
      'settings',v_practice.settings
    ),
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,
        'position',pi.position,
        'stem',i.stem,
        'options',
          case
            when jsonb_typeof(pi.option_order)='array' and jsonb_array_length(pi.option_order)=4
            then (
              select jsonb_agg(i.options -> (x.src::int) order by x.ord)
              from jsonb_array_elements_text(pi.option_order) with ordinality as x(src,ord)
            )
            else i.options
          end,
        'questionType',i.question_type,
        'cefr',i.cefr,
        'topic',i.topic,
        'bundleId',i.bundle_id,
        'bundleTitle',b.title,
        'bundleContext',b.context_text,
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

revoke execute on function public.qb_public_practice_get(text) from public;
grant execute on function public.qb_public_practice_get(text) to anon;
grant execute on function public.qb_public_practice_get(text) to authenticated;
grant execute on function public.qb_public_practice_get(text) to service_role;

create or replace function public.qb_public_practice_submit(
  p_token text,
  p_session_id uuid,
  p_learner_label text,
  p_responses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $function$
declare
  v_share public.assessment_practice_share_tokens%rowtype;
  v_practice_status text;
  v_attempt_id uuid;
  v_score numeric := 0;
  v_max numeric := 0;
  v_attempts bigint := 0;
  v_existing boolean := false;
  v_response_count integer := 0;
begin
  select * into v_share
  from public.assessment_practice_share_tokens
  where active=true
    and token_hash in (
      public.qb_share_token_hash(coalesce(p_token,'')),
      md5(coalesce(p_token,''))
    )
  limit 1;

  if v_share.id is null then
    return jsonb_build_object('ok',false,'error','invalid_or_disabled');
  end if;
  if v_share.expires_at is not null and v_share.expires_at<now() then
    return jsonb_build_object('ok',false,'error','expired');
  end if;

  select status into v_practice_status
  from public.assessment_practice_sets
  where id=v_share.practice_id;

  if coalesce(v_practice_status,'')<>'published' then
    return jsonb_build_object('ok',false,'error','unavailable');
  end if;

  if p_session_id is null then
    p_session_id := gen_random_uuid();
  end if;

  select id,score,max_score
  into v_attempt_id,v_score,v_max
  from public.assessment_practice_attempts
  where practice_id=v_share.practice_id
    and anonymous_session_id=p_session_id
    and status='submitted'
  limit 1;

  if found then
    v_existing := true;
  else
    if p_responses is not null and jsonb_typeof(p_responses)<>'array' then
      return jsonb_build_object('ok',false,'error','invalid_response_payload');
    end if;

    v_response_count := case
      when p_responses is null then 0
      else jsonb_array_length(p_responses)
    end;

    if v_response_count>200 then
      return jsonb_build_object('ok',false,'error','response_payload_too_large');
    end if;

    select count(*) into v_attempts
    from public.assessment_practice_attempts
    where practice_id=v_share.practice_id
      and status='submitted'
      and metadata->>'shareTokenId'=v_share.id::text;

    if v_attempts>=v_share.max_attempts then
      return jsonb_build_object('ok',false,'error','attempt_limit');
    end if;

    insert into public.assessment_practice_attempts(
      practice_id,learner_id,anonymous_session_id,learner_label,status,
      score,max_score,started_at,submitted_at,metadata
    )
    values(
      v_share.practice_id,
      auth.uid(),
      p_session_id,
      left(trim(coalesce(p_learner_label,'')),120),
      'submitted',
      0,
      0,
      now(),
      now(),
      jsonb_build_object(
        'publicShare',true,
        'shareTokenId',v_share.id,
        'answerSpace','canonical-source-option',
        'submittedResponseCount',v_response_count
      )
    )
    returning id into v_attempt_id;

    insert into public.assessment_practice_responses(
      attempt_id,item_id,selected_answer,is_correct,response_time_seconds
    )
    select
      v_attempt_id,
      pi.item_id,
      mapped.source_answer,
      mapped.source_answer=upper(left(i.correct_answer,1)),
      case when r.seconds is null then null else greatest(0,least(r.seconds,7200)) end
    from public.assessment_practice_items pi
    join public.assessment_items i on i.id=pi.item_id
    left join jsonb_to_recordset(coalesce(p_responses,'[]'::jsonb))
      as r(item_id uuid,answer text,seconds integer)
      on r.item_id=pi.item_id
    cross join lateral (
      select upper(left(coalesce(r.answer,''),1)) as visible_answer
    ) submitted
    cross join lateral (
      select case
        when submitted.visible_answer ~ '^[A-D]$'
         and jsonb_typeof(pi.option_order)='array'
         and jsonb_array_length(pi.option_order)=4
        then chr(65 + ((pi.option_order ->> (ascii(submitted.visible_answer)-ascii('A')))::int))
        when submitted.visible_answer ~ '^[A-D]$'
        then submitted.visible_answer
        else ''
      end as source_answer
    ) mapped
    where pi.practice_id=v_share.practice_id
      and i.status='approved';

    select
      count(*) filter(where r.is_correct)::numeric,
      count(*)::numeric
    into v_score,v_max
    from public.assessment_practice_responses r
    where r.attempt_id=v_attempt_id;

    update public.assessment_practice_attempts
    set score=v_score,max_score=v_max,submitted_at=now()
    where id=v_attempt_id;
  end if;

  update public.assessment_practice_share_tokens
  set last_used_at=now()
  where id=v_share.id;

  return jsonb_build_object(
    'ok',true,
    'replayed',v_existing,
    'attemptId',v_attempt_id,
    'score',v_score,
    'maxScore',v_max,
    'results',coalesce((
      select jsonb_agg(jsonb_build_object(
        'itemId',i.id,
        'selectedAnswer',
          case
            when r.selected_answer ~ '^[A-D]$'
             and jsonb_typeof(pi.option_order)='array'
             and jsonb_array_length(pi.option_order)=4
            then coalesce((
              select chr((64+x.ord)::int)
              from jsonb_array_elements_text(pi.option_order) with ordinality as x(src,ord)
              where x.src::int=ascii(r.selected_answer)-ascii('A')
              limit 1
            ),r.selected_answer)
            else r.selected_answer
          end,
        'isCorrect',r.is_correct,
        'correctAnswer',
          case
            when upper(left(i.correct_answer,1)) ~ '^[A-D]$'
             and jsonb_typeof(pi.option_order)='array'
             and jsonb_array_length(pi.option_order)=4
            then coalesce((
              select chr((64+x.ord)::int)
              from jsonb_array_elements_text(pi.option_order) with ordinality as x(src,ord)
              where x.src::int=ascii(upper(left(i.correct_answer,1)))-ascii('A')
              limit 1
            ),upper(left(i.correct_answer,1)))
            else upper(left(i.correct_answer,1))
          end,
        'explanation',i.explanation
      ) order by pi.position)
      from public.assessment_practice_items pi
      join public.assessment_items i on i.id=pi.item_id
      join public.assessment_practice_responses r
        on r.item_id=i.id and r.attempt_id=v_attempt_id
      where pi.practice_id=v_share.practice_id
    ),'[]'::jsonb)
  );
end;
$function$;

revoke execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) from public;
grant execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) to anon;
grant execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) to authenticated;
grant execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) to service_role;
