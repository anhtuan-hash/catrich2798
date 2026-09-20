-- Brian v11.7.0 · Question Bank management RPCs

create or replace function public.qb_merge_items(p_keeper uuid, p_duplicate uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_owner uuid;
  v_dup_owner uuid;
  rewired_tests integer := 0;
  rewired_practice integer := 0;
  removed_conflicts integer := 0;
begin
  if p_keeper=p_duplicate then raise exception 'keeper and duplicate must differ'; end if;
  select owner_id into v_owner from public.assessment_items where id=p_keeper;
  select owner_id into v_dup_owner from public.assessment_items where id=p_duplicate;
  if v_owner is null or v_dup_owner is null then raise exception 'item not found'; end if;
  if v_owner<>v_dup_owner then raise exception 'items must have same owner'; end if;
  if v_owner<>(select auth.uid()) and not (select public.bes_v1093_is_leader((select auth.uid()))) then raise exception 'not authorized'; end if;

  delete from public.assessment_test_items d
  where d.item_id=p_duplicate and exists(select 1 from public.assessment_test_items k where k.test_id=d.test_id and k.item_id=p_keeper);
  get diagnostics removed_conflicts=row_count;
  update public.assessment_test_items set item_id=p_keeper where item_id=p_duplicate;
  get diagnostics rewired_tests=row_count;

  delete from public.assessment_practice_items d
  where d.item_id=p_duplicate and exists(select 1 from public.assessment_practice_items k where k.practice_id=d.practice_id and k.item_id=p_keeper);
  update public.assessment_practice_items set item_id=p_keeper where item_id=p_duplicate;
  get diagnostics rewired_practice=row_count;

  delete from public.assessment_practice_responses d
  where d.item_id=p_duplicate and exists(select 1 from public.assessment_practice_responses k where k.attempt_id=d.attempt_id and k.item_id=p_keeper);
  update public.assessment_practice_responses set item_id=p_keeper where item_id=p_duplicate;

  update public.assessment_items k
  set usage_count=coalesce(k.usage_count,0)+coalesce(d.usage_count,0),updated_at=now()
  from public.assessment_items d where k.id=p_keeper and d.id=p_duplicate;

  update public.assessment_items
  set status='archived',archived_at=coalesce(archived_at,now()),
      review_note=concat_ws(' · ',nullif(review_note,''),'Merged into '||p_keeper::text),updated_at=now()
  where id=p_duplicate;

  return jsonb_build_object('keeper',p_keeper,'duplicate',p_duplicate,'rewiredTests',rewired_tests,'rewiredPractice',rewired_practice,'removedConflicts',removed_conflicts);
end;
$$;
grant execute on function public.qb_merge_items(uuid,uuid) to authenticated;

create or replace function public.qb_normalize_taxonomy_term(p_term_id uuid)
returns integer
language plpgsql
security invoker
set search_path=public
as $$
declare
  t public.assessment_taxonomy_terms%rowtype;
  changed integer:=0;
  aliases_lower text[];
begin
  select * into t from public.assessment_taxonomy_terms where id=p_term_id;
  if t.id is null then raise exception 'taxonomy term not found'; end if;
  if t.owner_id<>(select auth.uid()) and not (select public.bes_v1093_is_leader((select auth.uid()))) then raise exception 'not authorized'; end if;
  aliases_lower:=array(select lower(x) from unnest(array_append(coalesce(t.aliases,'{}'::text[]),t.canonical_value)) x);

  if t.kind='topic' then
    update public.assessment_items set topic=t.canonical_value,updated_at=now() where owner_id=t.owner_id and lower(topic)=any(aliases_lower);
  elsif t.kind='grammar_point' then
    update public.assessment_items set grammar_point=t.canonical_value,updated_at=now() where owner_id=t.owner_id and lower(grammar_point)=any(aliases_lower);
  elsif t.kind='skill' then
    update public.assessment_items set skill=t.canonical_value,updated_at=now() where owner_id=t.owner_id and lower(skill)=any(aliases_lower);
  elsif t.kind='question_type' then
    update public.assessment_items set question_type=t.canonical_value,updated_at=now() where owner_id=t.owner_id and lower(question_type)=any(aliases_lower);
  elsif t.kind='source' then
    update public.assessment_items set source=t.canonical_value,updated_at=now() where owner_id=t.owner_id and lower(source)=any(aliases_lower);
  elsif t.kind='tag' then
    update public.assessment_items i
    set tags=(select array_agg(distinct case when lower(tag)=any(aliases_lower) then t.canonical_value else tag end order by case when lower(tag)=any(aliases_lower) then t.canonical_value else tag end) from unnest(i.tags) tag),updated_at=now()
    where i.owner_id=t.owner_id and exists(select 1 from unnest(i.tags) tag where lower(tag)=any(aliases_lower));
  end if;
  get diagnostics changed=row_count;
  return changed;
end;
$$;
grant execute on function public.qb_normalize_taxonomy_term(uuid) to authenticated;
