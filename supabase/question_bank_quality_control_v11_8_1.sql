-- Brian Question Bank v11.8.1
-- Quality Control backend: Golden Bank audit, coverage, empirical item analytics,
-- review queue and a consolidated dashboard payload.
-- Production database migrations:
--   question_bank_golden_audit_coverage_analytics_v1
--   question_bank_live_stats_and_audit_details_v1
--   question_bank_new_rpc_grants_hardening_v1
--   question_bank_quality_dashboard_rpc_v1

create or replace function public.qb_golden_bank_audit()
returns jsonb
language sql
stable
set search_path = public
as $$
with
me as (select auth.uid() as uid),
items as (
  select i.*
  from public.assessment_items i, me
  where i.owner_id = me.uid and i.archived_at is null
),
dup_fp as (
  select fingerprint, count(*)::int as n
  from items
  where nullif(trim(fingerprint),'') is not null
  group by fingerprint
  having count(*) > 1
),
bundle_rollup as (
  select
    b.id,
    b.bundle_type,
    b.status,
    case b.bundle_type
      when 'functional_cloze_6' then 6
      when 'discourse_cloze_5' then 5
      when 'reading_8' then 8
      when 'reading_10' then 10
      else null
    end as expected_count,
    count(i.id)::int as actual_count,
    count(i.id) filter (where i.status='approved')::int as approved_count,
    count(distinct i.bundle_position) filter (where i.bundle_position is not null)::int as distinct_positions,
    min(i.bundle_position) as min_position,
    max(i.bundle_position) as max_position
  from public.assessment_bundles b
  join me on b.owner_id = me.uid
  left join items i on i.bundle_id=b.id
  where b.archived_at is null
  group by b.id,b.bundle_type,b.status
),
bundle_health as (
  select *,
    (
      expected_count is not null
      and actual_count = expected_count
      and distinct_positions = expected_count
      and min_position = 1
      and max_position = expected_count
    ) as structurally_valid
  from bundle_rollup
),
item_health as (
  select
    i.id,
    (
      jsonb_typeof(i.options) <> 'array'
      or jsonb_array_length(i.options) <> 4
      or i.correct_answer not in ('A','B','C','D')
      or nullif(trim(i.stem),'') is null
      or nullif(trim(i.explanation),'') is null
      or nullif(trim(i.topic),'') is null
      or nullif(trim(i.skill),'') is null
      or nullif(trim(i.cefr),'') is null
      or nullif(trim(i.fingerprint),'') is null
      or cardinality(i.tags)=0
      or i.difficulty not between 1 and 5
      or (select count(distinct trim(value)) from jsonb_array_elements_text(i.options)) <> 4
      or exists (select 1 from dup_fp d where d.fingerprint=i.fingerprint)
      or (
        i.bundle_id is not null
        and exists (
          select 1 from bundle_health bh
          where bh.id=i.bundle_id and not bh.structurally_valid
        )
      )
    ) as blocked,
    (
      i.status <> 'approved'
      or (
        i.bundle_id is not null
        and exists (
          select 1 from bundle_health bh
          where bh.id=i.bundle_id and bh.status <> 'approved'
        )
      )
    ) as needs_review
  from items i
),
topic_dups as (
  select lower(trim(topic)) as topic_key, count(*)::int as n
  from public.assessment_bundles b, me
  where b.owner_id=me.uid and b.archived_at is null
  group by lower(trim(topic))
  having count(*)>1
),
answer_dist as (
  select correct_answer, count(*)::int as n
  from items
  group by correct_answer
),
status_dist as (
  select status, count(*)::int as n
  from items
  group by status
),
bundle_dist as (
  select b.bundle_type,
         count(*)::int as bundles,
         count(*) filter (where bh.structurally_valid)::int as structurally_valid,
         count(*) filter (where bh.structurally_valid and bh.status='approved')::int as approved_ready
  from public.assessment_bundles b
  join me on b.owner_id=me.uid
  join bundle_health bh on bh.id=b.id
  where b.archived_at is null
  group by b.bundle_type
)
select jsonb_build_object(
  'generatedAt', now(),
  'summary', jsonb_build_object(
    'totalItems', (select count(*) from items),
    'totalBundles', (select count(*) from bundle_health),
    'readyItems', (select count(*) from item_health where not blocked and not needs_review),
    'reviewItems', (select count(*) from item_health where not blocked and needs_review),
    'blockedItems', (select count(*) from item_health where blocked),
    'duplicateFingerprintGroups', (select count(*) from dup_fp),
    'duplicateExtraItems', coalesce((select sum(n-1) from dup_fp),0),
    'repeatedTopicLabels', coalesce((select sum(n-1) from topic_dups),0),
    'brokenBundles', (select count(*) from bundle_health where not structurally_valid)
  ),
  'metadata', jsonb_build_object(
    'missingFingerprint', (select count(*) from items where nullif(trim(fingerprint),'') is null),
    'missingTopic', (select count(*) from items where nullif(trim(topic),'') is null),
    'missingSkill', (select count(*) from items where nullif(trim(skill),'') is null),
    'missingCefr', (select count(*) from items where nullif(trim(cefr),'') is null),
    'missingTags', (select count(*) from items where cardinality(tags)=0),
    'missingExplanation', (select count(*) from items where nullif(trim(explanation),'') is null)
  ),
  'answerDistribution', coalesce(
    (select jsonb_object_agg(correct_answer,n order by correct_answer) from answer_dist),
    '{}'::jsonb
  ),
  'statusDistribution', coalesce(
    (select jsonb_object_agg(status,n order by status) from status_dist),
    '{}'::jsonb
  ),
  'bundleDistribution', coalesce(
    (select jsonb_agg(jsonb_build_object(
      'type',bundle_type,
      'bundles',bundles,
      'structurallyValid',structurally_valid,
      'approvedReady',approved_ready
    ) order by bundle_type) from bundle_dist),
    '[]'::jsonb
  )
);
$$;

create or replace function public.qb_coverage_plan(
  p_blueprint_id uuid,
  p_target_exams integer default 5
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_criteria jsonb;
  v_title text;
  v_grade smallint;
  v_part jsonb;
  v_parts jsonb := '[]'::jsonb;
  v_mode text;
  v_type text;
  v_label text;
  v_required integer;
  v_item_count integer;
  v_approved integer;
  v_unused integer;
  v_cap_all integer;
  v_cap_unused integer;
  v_gap_units integer;
  v_gap_items integer;
  v_overall_all integer := null;
  v_overall_unused integer := null;
  v_target integer := greatest(1,least(coalesce(p_target_exams,5),100));
begin
  select title,criteria,nullif(criteria->>'grade','')::smallint
  into v_title,v_criteria,v_grade
  from public.assessment_blueprints
  where id=p_blueprint_id;

  if v_criteria is null then
    raise exception 'Blueprint not found or not accessible';
  end if;

  for v_part in
    select value from jsonb_array_elements(coalesce(v_criteria->'parts','[]'::jsonb))
  loop
    v_mode := coalesce(v_part->>'mode','items');
    v_type := coalesce(v_part->>'type','');
    v_label := coalesce(v_part->>'label',v_type);
    v_item_count := greatest(1,coalesce((v_part->>'itemCount')::integer,1));

    if v_mode='bundles' then
      v_required := greatest(1,coalesce((v_part->>'bundleCount')::integer,1));

      with eligible as (
        select b.id,
               count(i.id)::int as n,
               count(i.id) filter (where i.status='approved')::int as approved_n,
               count(distinct i.bundle_position) filter (where i.bundle_position is not null)::int as pos_n,
               min(i.bundle_position) as min_pos,
               max(i.bundle_position) as max_pos,
               bool_or(ti.item_id is not null) as ever_used
        from public.assessment_bundles b
        join public.assessment_items i on i.bundle_id=b.id and i.archived_at is null
        left join public.assessment_test_items ti on ti.item_id=i.id
        where b.archived_at is null
          and b.status='approved'
          and b.bundle_type=v_type
          and (v_grade is null or b.grade is null or b.grade=v_grade)
        group by b.id
      )
      select
        count(*) filter (
          where n=v_item_count and approved_n=v_item_count
            and pos_n=v_item_count and min_pos=1 and max_pos=v_item_count
        )::int,
        count(*) filter (
          where n=v_item_count and approved_n=v_item_count
            and pos_n=v_item_count and min_pos=1 and max_pos=v_item_count
            and not ever_used
        )::int
      into v_approved,v_unused
      from eligible;

      v_approved := coalesce(v_approved,0);
      v_unused := coalesce(v_unused,0);
      v_gap_units := greatest(0,v_target*v_required-v_approved);
      v_gap_items := v_gap_units*v_item_count;
    else
      v_required := greatest(1,coalesce((v_part->>'count')::integer,1));

      if v_type='arrangement_5' then
        select
          count(*) filter (where i.status='approved')::int,
          count(*) filter (where i.status='approved' and ti.item_id is null)::int
        into v_approved,v_unused
        from public.assessment_items i
        left join (select distinct item_id from public.assessment_test_items) ti on ti.item_id=i.id
        where i.archived_at is null
          and i.bundle_id is null
          and i.question_type='arrangement'
          and (v_grade is null or i.grade is null or i.grade=v_grade);
      elsif v_type='standalone_mcq' then
        select
          count(*) filter (where i.status='approved')::int,
          count(*) filter (where i.status='approved' and ti.item_id is null)::int
        into v_approved,v_unused
        from public.assessment_items i
        left join (select distinct item_id from public.assessment_test_items) ti on ti.item_id=i.id
        where i.archived_at is null
          and i.bundle_id is null
          and i.question_type<>'arrangement'
          and (v_grade is null or i.grade is null or i.grade=v_grade);
      else
        select
          count(*) filter (where i.status='approved')::int,
          count(*) filter (where i.status='approved' and ti.item_id is null)::int
        into v_approved,v_unused
        from public.assessment_items i
        left join (select distinct item_id from public.assessment_test_items) ti on ti.item_id=i.id
        where i.archived_at is null
          and i.bundle_id is null
          and i.question_type=v_type
          and (v_grade is null or i.grade is null or i.grade=v_grade);
      end if;

      v_approved := coalesce(v_approved,0);
      v_unused := coalesce(v_unused,0);
      v_gap_units := greatest(0,v_target*v_required-v_approved);
      v_gap_items := v_gap_units;
    end if;

    v_cap_all := case when v_required>0 then floor(v_approved::numeric/v_required)::int else 0 end;
    v_cap_unused := case when v_required>0 then floor(v_unused::numeric/v_required)::int else 0 end;

    v_overall_all := case when v_overall_all is null then v_cap_all else least(v_overall_all,v_cap_all) end;
    v_overall_unused := case when v_overall_unused is null then v_cap_unused else least(v_overall_unused,v_cap_unused) end;

    v_parts := v_parts || jsonb_build_array(jsonb_build_object(
      'label',v_label,
      'mode',v_mode,
      'type',v_type,
      'requiredPerExam',v_required,
      'itemCountPerBundle',case when v_mode='bundles' then v_item_count else 1 end,
      'approvedAvailable',v_approved,
      'unusedApprovedAvailable',v_unused,
      'capacityAll',v_cap_all,
      'capacityUnused',v_cap_unused,
      'targetExams',v_target,
      'gapUnitsForTarget',v_gap_units,
      'gapItemsForTarget',v_gap_items
    ));
  end loop;

  return jsonb_build_object(
    'generatedAt',now(),
    'blueprintId',p_blueprint_id,
    'blueprintTitle',v_title,
    'targetExams',v_target,
    'capacityAll',coalesce(v_overall_all,0),
    'capacityUnused',coalesce(v_overall_unused,0),
    'parts',v_parts
  );
end;
$$;

create or replace function public.qb_item_performance(p_limit integer default 200)
returns table (
  item_id uuid,
  bundle_id uuid,
  question_type text,
  stem text,
  response_count bigint,
  correct_percent numeric,
  avg_response_seconds numeric,
  median_response_seconds numeric,
  discrimination numeric,
  distractor_counts jsonb,
  health text
)
language sql
stable
set search_path = public
as $$
with me as (select auth.uid() as uid),
base as (
  select i.id as item_id,i.bundle_id,i.question_type,i.stem
  from public.assessment_items i, me
  where i.owner_id=me.uid and i.archived_at is null
),
agg as (
  select
    b.item_id,b.bundle_id,b.question_type,b.stem,
    count(r.*)::bigint as response_count,
    case when count(r.*)>0
      then round(100.0*count(*) filter (where r.is_correct)/count(r.*),1)
      else null end as correct_percent,
    round(avg(r.response_time_seconds)::numeric,1) as avg_response_seconds,
    round(percentile_cont(0.5) within group (order by r.response_time_seconds)::numeric,1) as median_response_seconds,
    round(corr(
      (r.is_correct::int)::double precision,
      case when a.max_score>0 then (a.score/a.max_score)::double precision else null end
    )::numeric,3) as discrimination
  from base b
  left join public.assessment_practice_responses r on r.item_id=b.item_id
  left join public.assessment_practice_attempts a on a.id=r.attempt_id
  group by b.item_id,b.bundle_id,b.question_type,b.stem
),
dist as (
  select r.item_id,jsonb_object_agg(r.selected_answer,r.n order by r.selected_answer) as distractor_counts
  from (
    select pr.item_id,pr.selected_answer,count(*)::int as n
    from public.assessment_practice_responses pr
    join base b on b.item_id=pr.item_id
    group by pr.item_id,pr.selected_answer
  ) r
  group by r.item_id
)
select
  a.item_id,a.bundle_id,a.question_type,a.stem,a.response_count,a.correct_percent,
  a.avg_response_seconds,a.median_response_seconds,a.discrimination,
  coalesce(d.distractor_counts,'{}'::jsonb) as distractor_counts,
  case
    when a.response_count=0 then 'no_data'
    when a.response_count<10 then 'collecting'
    when a.correct_percent>=90 then 'too_easy'
    when a.correct_percent<=30 then 'too_hard'
    when a.discrimination is not null and a.discrimination<0.15 then 'low_discrimination'
    else 'good'
  end as health
from agg a
left join dist d on d.item_id=a.item_id
order by a.response_count desc,a.item_id
limit greatest(1,least(coalesce(p_limit,200),1000));
$$;

create or replace function public.qb_golden_bank_issues(p_limit integer default 200)
returns table (
  item_id uuid,
  bundle_id uuid,
  bundle_type text,
  item_status text,
  bundle_status text,
  classification text,
  reasons text[]
)
language sql
stable
set search_path = public
as $$
with me as (select auth.uid() as uid),
items as (
  select i.*
  from public.assessment_items i, me
  where i.owner_id=me.uid and i.archived_at is null
),
dup_fp as (
  select fingerprint
  from items
  where nullif(trim(fingerprint),'') is not null
  group by fingerprint
  having count(*)>1
),
bundle_rollup as (
  select
    b.id,b.bundle_type,b.status,
    case b.bundle_type
      when 'functional_cloze_6' then 6
      when 'discourse_cloze_5' then 5
      when 'reading_8' then 8
      when 'reading_10' then 10
      else null
    end as expected_count,
    count(i.id)::int as actual_count,
    count(distinct i.bundle_position) filter (where i.bundle_position is not null)::int as pos_count,
    min(i.bundle_position) as min_pos,
    max(i.bundle_position) as max_pos
  from public.assessment_bundles b
  join me on b.owner_id=me.uid
  left join items i on i.bundle_id=b.id
  where b.archived_at is null
  group by b.id,b.bundle_type,b.status
),
x as (
  select
    i.id as item_id,
    i.bundle_id,
    b.bundle_type,
    i.status as item_status,
    b.status as bundle_status,
    array_remove(array[
      case when jsonb_typeof(i.options)<>'array' or jsonb_array_length(i.options)<>4 then 'options_not_four' end,
      case when i.correct_answer not in ('A','B','C','D') then 'invalid_correct_answer' end,
      case when nullif(trim(i.stem),'') is null then 'missing_stem' end,
      case when nullif(trim(i.explanation),'') is null then 'missing_explanation' end,
      case when nullif(trim(i.topic),'') is null then 'missing_topic' end,
      case when nullif(trim(i.skill),'') is null then 'missing_skill' end,
      case when nullif(trim(i.cefr),'') is null then 'missing_cefr' end,
      case when nullif(trim(i.fingerprint),'') is null then 'missing_fingerprint' end,
      case when cardinality(i.tags)=0 then 'missing_tags' end,
      case when i.difficulty not between 1 and 5 then 'difficulty_out_of_range' end,
      case when (select count(distinct trim(value)) from jsonb_array_elements_text(i.options))<>4 then 'duplicate_options' end,
      case when exists(select 1 from dup_fp d where d.fingerprint=i.fingerprint) then 'duplicate_fingerprint' end,
      case when i.bundle_id is not null and (
        br.expected_count is null
        or br.actual_count<>br.expected_count
        or br.pos_count<>br.expected_count
        or br.min_pos<>1
        or br.max_pos<>br.expected_count
      ) then 'broken_bundle' end,
      case when i.status<>'approved' then 'item_not_approved' end,
      case when i.bundle_id is not null and b.status<>'approved' then 'bundle_not_approved' end
    ],null)::text[] as reasons
  from items i
  left join public.assessment_bundles b on b.id=i.bundle_id
  left join bundle_rollup br on br.id=i.bundle_id
)
select
  x.item_id,x.bundle_id,x.bundle_type,x.item_status,x.bundle_status,
  case
    when x.reasons && array[
      'options_not_four','invalid_correct_answer','missing_stem','missing_explanation',
      'missing_topic','missing_skill','missing_cefr','missing_fingerprint','missing_tags',
      'difficulty_out_of_range','duplicate_options','duplicate_fingerprint','broken_bundle'
    ]::text[] then 'blocked'
    when cardinality(x.reasons)>0 then 'review'
    else 'ready'
  end as classification,
  x.reasons
from x
where cardinality(x.reasons)>0
order by
  case
    when x.reasons && array[
      'options_not_four','invalid_correct_answer','missing_stem','missing_explanation',
      'missing_topic','missing_skill','missing_cefr','missing_fingerprint','missing_tags',
      'difficulty_out_of_range','duplicate_options','duplicate_fingerprint','broken_bundle'
    ]::text[] then 0 else 1
  end,
  x.item_id
limit greatest(1,least(coalesce(p_limit,200),1000));
$$;

create or replace function public.qb_refresh_stats_after_practice_responses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  with target as (select distinct item_id from new_rows),
  stats as (
    select
      t.item_id,
      count(r.*)::int as response_count,
      count(r.*) filter (where r.is_correct)::int as correct_count,
      case when count(r.*)>0
        then round((count(r.*) filter (where r.is_correct))::numeric / count(r.*)::numeric * 100, 1)
        else null end as correct_percent,
      round(avg(r.response_time_seconds)::numeric,1) as avg_response_seconds,
      round(percentile_cont(0.5) within group (order by r.response_time_seconds)::numeric,1) as median_response_seconds,
      round(corr(
        (r.is_correct::int)::double precision,
        case when a.max_score>0 then (a.score/a.max_score)::double precision else null end
      )::numeric,3) as discrimination
    from target t
    left join public.assessment_practice_responses r on r.item_id=t.item_id
    left join public.assessment_practice_attempts a on a.id=r.attempt_id
    group by t.item_id
  )
  update public.assessment_items i
  set statistics = coalesce(i.statistics,'{}'::jsonb) || jsonb_build_object(
      'responseCount',s.response_count,
      'correctCount',s.correct_count,
      'correctPercent',s.correct_percent,
      'avgResponseSeconds',s.avg_response_seconds,
      'medianResponseSeconds',s.median_response_seconds,
      'discrimination',s.discrimination,
      'distractorCounts',coalesce((
        select jsonb_object_agg(d.selected_answer,d.n order by d.selected_answer)
        from (
          select pr.selected_answer,count(*)::int as n
          from public.assessment_practice_responses pr
          where pr.item_id=s.item_id
          group by pr.selected_answer
        ) d
      ),'{}'::jsonb),
      'lastRecomputedAt',now()
    ),
    updated_at=now()
  from stats s
  where i.id=s.item_id;

  return null;
end;
$$;

create or replace function public.qb_recompute_item_statistics(p_item_ids uuid[] default null::uuid[])
returns integer
language plpgsql
set search_path = public
as $$
declare
  updated_count integer;
begin
  with target as (
    select i.id as item_id
    from public.assessment_items i
    where i.owner_id=auth.uid()
      and i.archived_at is null
      and (p_item_ids is null or i.id=any(p_item_ids))
  ),
  stats as (
    select
      t.item_id,
      count(r.*)::int as response_count,
      count(r.*) filter (where r.is_correct)::int as correct_count,
      case when count(r.*)>0
        then round((count(r.*) filter (where r.is_correct))::numeric / count(r.*)::numeric * 100, 1)
        else null end as correct_percent,
      round(avg(r.response_time_seconds)::numeric,1) as avg_response_seconds,
      round(percentile_cont(0.5) within group (order by r.response_time_seconds)::numeric,1) as median_response_seconds,
      round(corr(
        (r.is_correct::int)::double precision,
        case when a.max_score>0 then (a.score/a.max_score)::double precision else null end
      )::numeric,3) as discrimination
    from target t
    left join public.assessment_practice_responses r on r.item_id=t.item_id
    left join public.assessment_practice_attempts a on a.id=r.attempt_id
    group by t.item_id
  )
  update public.assessment_items i
  set statistics = coalesce(i.statistics,'{}'::jsonb) || jsonb_build_object(
      'responseCount',s.response_count,
      'correctCount',s.correct_count,
      'correctPercent',s.correct_percent,
      'avgResponseSeconds',s.avg_response_seconds,
      'medianResponseSeconds',s.median_response_seconds,
      'discrimination',s.discrimination,
      'distractorCounts',coalesce((
        select jsonb_object_agg(d.selected_answer,d.n order by d.selected_answer)
        from (
          select pr.selected_answer,count(*)::int as n
          from public.assessment_practice_responses pr
          where pr.item_id=s.item_id
          group by pr.selected_answer
        ) d
      ),'{}'::jsonb),
      'lastRecomputedAt',now()
    ),
    updated_at=now()
  from stats s
  where i.id=s.item_id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.qb_quality_dashboard(
  p_blueprint_id uuid,
  p_target_exams integer default 10,
  p_item_limit integer default 50
)
returns jsonb
language sql
stable
set search_path = public
as $$
with practice as (
  select
    count(distinct a.id)::int as attempts,
    count(r.*)::int as responses,
    count(distinct a.id) filter (where a.status='submitted')::int as submitted_attempts,
    case when count(distinct a.id) filter (where a.status='submitted')>0
      then round(avg(case when a.max_score>0 then 100*a.score/a.max_score else null end)::numeric,1)
      else null end as avg_score_percent
  from public.assessment_practice_sets ps
  left join public.assessment_practice_attempts a on a.practice_id=ps.id
  left join public.assessment_practice_responses r on r.attempt_id=a.id
  where ps.owner_id=auth.uid()
),
perf as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.response_count desc,x.item_id),'[]'::jsonb) as rows
  from public.qb_item_performance(greatest(1,least(coalesce(p_item_limit,50),200))) x
)
select jsonb_build_object(
  'generatedAt',now(),
  'audit',public.qb_golden_bank_audit(),
  'coverage',public.qb_coverage_plan(
    p_blueprint_id,
    greatest(1,least(coalesce(p_target_exams,10),100))
  ),
  'practice',jsonb_build_object(
    'attempts',practice.attempts,
    'submittedAttempts',practice.submitted_attempts,
    'responses',practice.responses,
    'averageScorePercent',practice.avg_score_percent
  ),
  'itemPerformance',perf.rows
)
from practice,perf;
$$;

revoke all on function public.qb_golden_bank_audit() from public;
revoke all on function public.qb_coverage_plan(uuid,integer) from public;
revoke all on function public.qb_item_performance(integer) from public;
revoke all on function public.qb_golden_bank_issues(integer) from public;
revoke all on function public.qb_recompute_item_statistics(uuid[]) from public;
revoke all on function public.qb_quality_dashboard(uuid,integer,integer) from public;
revoke all on function public.qb_refresh_stats_after_practice_responses() from public;

revoke execute on function public.qb_golden_bank_audit() from anon;
revoke execute on function public.qb_coverage_plan(uuid,integer) from anon;
revoke execute on function public.qb_item_performance(integer) from anon;
revoke execute on function public.qb_golden_bank_issues(integer) from anon;
revoke execute on function public.qb_recompute_item_statistics(uuid[]) from anon;
revoke execute on function public.qb_quality_dashboard(uuid,integer,integer) from anon;

grant execute on function public.qb_golden_bank_audit() to authenticated;
grant execute on function public.qb_coverage_plan(uuid,integer) to authenticated;
grant execute on function public.qb_item_performance(integer) to authenticated;
grant execute on function public.qb_golden_bank_issues(integer) to authenticated;
grant execute on function public.qb_recompute_item_statistics(uuid[]) to authenticated;
grant execute on function public.qb_quality_dashboard(uuid,integer,integer) to authenticated;
grant execute on function public.qb_refresh_stats_after_practice_responses() to service_role;

comment on function public.qb_golden_bank_audit() is
'Brian Question Bank Golden Bank structural audit for the signed-in owner.';
comment on function public.qb_coverage_plan(uuid,integer) is
'Coverage Planner backend for blueprint capacity, unused capacity and target gaps.';
comment on function public.qb_item_performance(integer) is
'Empirical item-performance analytics from real practice responses.';
comment on function public.qb_golden_bank_issues(integer) is
'Detailed deterministic Golden Bank review queue. Semantic approval remains a human editorial decision.';
comment on function public.qb_quality_dashboard(uuid,integer,integer) is
'Combined Quality Control payload: Golden Bank audit, coverage, practice telemetry and item performance.';
