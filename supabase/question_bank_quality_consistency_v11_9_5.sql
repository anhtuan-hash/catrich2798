-- Brian Question Bank quality consistency hotfix · v11.9.5
-- Aligns Golden Bank audit, coverage and Exam Builder semantics for Arrangement sets.
-- Also repairs legacy Functional Cloze items that were missing canonical tags.

update public.assessment_items i
set tags = array['TNTHPT2025-2026','functional-cloze']::text[],
    updated_at = now()
from public.assessment_bundles b
where i.bundle_id=b.id
  and i.archived_at is null
  and b.archived_at is null
  and b.bundle_type='functional_cloze_6'
  and cardinality(i.tags)=0;

do $do$
declare
  fn_oid oid;
  old_def text;
  new_def text;
begin
  select p.oid into fn_oid
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='qb_golden_bank_audit'
    and pg_get_function_identity_arguments(p.oid)='';
  if fn_oid is null then raise exception 'qb_golden_bank_audit() not found'; end if;
  old_def := pg_get_functiondef(fn_oid);
  new_def := replace(
    old_def,
    'when ''functional_cloze_6'' then 6',
    E'when ''arrangement_5'' then 5\n      when ''functional_cloze_6'' then 6'
  );
  if new_def=old_def then raise exception 'qb_golden_bank_audit patch anchor not found'; end if;
  execute new_def;

  select p.oid into fn_oid
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='qb_golden_bank_issues'
    and pg_get_function_identity_arguments(p.oid)='p_limit integer';
  if fn_oid is null then raise exception 'qb_golden_bank_issues(integer) not found'; end if;
  old_def := pg_get_functiondef(fn_oid);
  new_def := replace(
    old_def,
    'when ''functional_cloze_6'' then 6',
    E'when ''arrangement_5'' then 5\n      when ''functional_cloze_6'' then 6'
  );
  if new_def=old_def then raise exception 'qb_golden_bank_issues patch anchor not found'; end if;
  execute new_def;

  select p.oid into fn_oid
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='qb_coverage_plan'
    and pg_get_function_identity_arguments(p.oid)='p_blueprint_id uuid, p_target_exams integer';
  if fn_oid is null then raise exception 'qb_coverage_plan(uuid,integer) not found'; end if;
  old_def := pg_get_functiondef(fn_oid);
  new_def := replace(
    old_def,
    E'where i.archived_at is null\n          and i.bundle_id is null\n          and i.question_type=''arrangement''\n          and (v_grade is null or i.grade is null or i.grade=v_grade);',
    E'where i.archived_at is null\n          and i.question_type=''arrangement''\n          and (v_grade is null or i.grade is null or i.grade=v_grade)\n          and (\n            i.bundle_id is null\n            or exists (\n              select 1\n              from public.assessment_bundles ab\n              where ab.id=i.bundle_id\n                and ab.archived_at is null\n                and ab.status=''approved''\n                and ab.bundle_type=''arrangement_5''\n                and (select count(*) from public.assessment_items ai where ai.bundle_id=ab.id and ai.archived_at is null)=5\n                and (select count(distinct ai.bundle_position) from public.assessment_items ai where ai.bundle_id=ab.id and ai.archived_at is null)=5\n                and (select min(ai.bundle_position) from public.assessment_items ai where ai.bundle_id=ab.id and ai.archived_at is null)=1\n                and (select max(ai.bundle_position) from public.assessment_items ai where ai.bundle_id=ab.id and ai.archived_at is null)=5\n            )\n          );'
  );
  if new_def=old_def then raise exception 'qb_coverage_plan arrangement patch anchor not found'; end if;
  execute new_def;
end
$do$;

comment on function public.qb_golden_bank_audit() is
'Brian Golden Bank audit. Arrangement bundles are valid 5-item sets; all supported bundle types use contiguous 1..N positions.';

comment on function public.qb_coverage_plan(uuid,integer) is
'Brian coverage plan aligned with Exam Builder: Arrangement capacity includes standalone items and structurally valid approved arrangement_5 bundles.';
