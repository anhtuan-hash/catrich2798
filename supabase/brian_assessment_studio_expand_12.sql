-- BRIAN Assessment Studio 12-module expansion.
-- Run after brian_assessment_studio_mvp.sql if the original 3-module schema
-- was already installed. This migration does not alter homeroom data.
begin;

alter table public.bes_assessments
  drop constraint if exists bes_assessments_kind_check;
alter table public.bes_assessments
  add constraint bes_assessments_kind_check
  check (kind in ('diagnostic','speaking','exit','error','vocabulary','reading','listening','writing','rewrite','self','peer','project'));

alter table public.bes_assessment_adjustments
  drop constraint if exists bes_assessment_implementation_proof;
alter table public.bes_assessment_adjustments
  add constraint bes_assessment_implementation_proof check (
    status = 'planned' or (
      implementation_date is not null and
      length(trim(evidence_note)) > 0
    )
  );
alter table public.bes_assessment_adjustments
  drop constraint if exists bes_assessment_reviewed_outcome;
alter table public.bes_assessment_adjustments
  add constraint bes_assessment_reviewed_outcome check (
    status <> 'reviewed' or (
      followup_assessment_id is not null and
      length(trim(followup_result)) > 0
    )
  );

commit;

-- This migration validates only explicit input fields.
-- It DOES NOT independently verify educational interventions or file evidence.
