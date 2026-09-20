-- Brian Question Bank v11.8.2
-- Golden Bank audit: an approved bundle is "approvedReady" only when
-- the bundle and every expected child item are approved.

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
  select
    bundle_type,
    count(*)::int as bundles,
    count(*) filter (where structurally_valid)::int as structurally_valid,
    count(*) filter (
      where structurally_valid
        and status='approved'
        and approved_count=expected_count
    )::int as approved_ready
  from bundle_health
  group by bundle_type
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

comment on function public.qb_golden_bank_audit() is
'Brian Question Bank Golden Bank structural audit for the signed-in owner. approvedReady requires both approved bundle status and all child items approved.';
