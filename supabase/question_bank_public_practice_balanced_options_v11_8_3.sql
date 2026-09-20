-- Brian Question Bank v11.8.3
-- Preserve balanced answer positions in public practice while keeping item analytics
-- tied to the canonical source option.

alter table public.assessment_practice_items
  add column if not exists option_order jsonb not null default '[0,1,2,3]'::jsonb;

-- Reuse the exact balanced order of the source test whenever a practice set
-- was created from a generated exam. Other existing practices keep identity order.
update public.assessment_practice_items pi
set option_order = ti.option_order
from public.assessment_practice_sets ps,
     public.assessment_test_items ti
where ps.id = pi.practice_id
  and ti.test_id::text = ps.settings->>'sourceTestId'
  and ti.item_id = pi.item_id
  and ti.position = pi.position
  and jsonb_typeof(ti.option_order)='array'
  and jsonb_array_length(ti.option_order)=4;

create or replace function public.qb_public_practice_get(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_share public.assessment_practice_share_tokens%rowtype;
  v_practice public.assessment_practice_sets%rowtype;
  v_attempts bigint;
begin
  select * into v_share
  from public.assessment_practice_share_tokens
  where token_hash=md5(coalesce(p_token,'')) and active=true
  limit 1;

  if v_share.id is null then return jsonb_build_object('ok',false,'error','invalid_or_disabled'); end if;
  if v_share.expires_at is not null and v_share.expires_at<now() then return jsonb_build_object('ok',false,'error','expired'); end if;

  select count(*) into v_attempts
  from public.assessment_practice_attempts
  where practice_id=v_share.practice_id and status='submitted';

  if v_attempts>=v_share.max_attempts then return jsonb_build_object('ok',false,'error','attempt_limit'); end if;

  select * into v_practice from public.assessment_practice_sets where id=v_share.practice_id;
  if v_practice.id is null or v_practice.status not in ('published','draft') then
    return jsonb_build_object('ok',false,'error','unavailable');
  end if;

  update public.assessment_practice_share_tokens
  set last_used_at=now()
  where id=v_share.id;

  return jsonb_build_object(
    'ok',true,
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

create or replace function public.qb_public_practice_submit(
  p_token text,
  p_session_id uuid,
  p_learner_label text,
  p_responses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_share public.assessment_practice_share_tokens%rowtype;
  v_attempt_id uuid;
  v_score numeric;
  v_max numeric;
  v_attempts bigint;
begin
  select * into v_share
  from public.assessment_practice_share_tokens
  where token_hash=md5(coalesce(p_token,'')) and active=true
  limit 1;

  if v_share.id is null then return jsonb_build_object('ok',false,'error','invalid_or_disabled'); end if;
  if v_share.expires_at is not null and v_share.expires_at<now() then return jsonb_build_object('ok',false,'error','expired'); end if;

  select count(*) into v_attempts
  from public.assessment_practice_attempts
  where practice_id=v_share.practice_id and status='submitted';

  if v_attempts>=v_share.max_attempts then return jsonb_build_object('ok',false,'error','attempt_limit'); end if;

  if p_session_id is null then p_session_id := gen_random_uuid(); end if;

  insert into public.assessment_practice_attempts(
    practice_id,learner_id,anonymous_session_id,learner_label,status,score,max_score,started_at,submitted_at,metadata
  )
  values(
    v_share.practice_id,auth.uid(),p_session_id,left(coalesce(p_learner_label,''),120),'submitted',0,0,now(),now(),
    jsonb_build_object('publicShare',true,'answerSpace','canonical-source-option')
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
  where pi.practice_id=v_share.practice_id;

  select
    count(*) filter(where r.is_correct)::numeric,
    count(*)::numeric
  into v_score,v_max
  from public.assessment_practice_responses r
  where r.attempt_id=v_attempt_id;

  update public.assessment_practice_attempts
  set score=v_score,max_score=v_max,submitted_at=now()
  where id=v_attempt_id;

  update public.assessment_practice_share_tokens
  set last_used_at=now()
  where id=v_share.id;

  return jsonb_build_object(
    'ok',true,
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
