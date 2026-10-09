-- BRIAN Assessment Studio — Integrity hardening
-- Apply only AFTER:
--   supabase/brian_assessment_studio_mvp.sql
--   supabase/brian_assessment_studio_expand_12.sql
-- BEFORE RUNNING: backup data and review any legacy results with blank/duplicate IDs.
-- This migration deliberately stops instead of inventing student identifiers.

begin;

do $$
begin
  if exists (
    select 1 from public.bes_assessment_results
    where student_code is null
      or student_code !~ '^[A-Z0-9][A-Z0-9._-]{0,39}$'
      or student_code <> upper(btrim(student_code))
  ) then
    raise exception 'Assessment Studio integrity check failed: correct missing/invalid student codes BEFORE migrating; no codes have been fabricated.';
  end if;
  if exists (
    select 1 from (
      select assessment_id, student_code
      from public.bes_assessment_results
      group by assessment_id, student_code
      having count(*) > 1
    ) dup
  ) then
    raise exception 'Assessment Studio integrity check failed: duplicate (assessment, student_code) records exist; reconcile from original documents first.';
  end if;
end $$;

alter table public.bes_assessment_results
  add constraint bes_assessment_results_student_code_format
    check (student_code ~ '^[A-Z0-9][A-Z0-9._-]{0,39}$');
create unique index if not exists bes_assessment_results_unique_student_per_test
  on public.bes_assessment_results(assessment_id, student_code);

-- Limit routine teacher operations to INSERT and SELECT, not silent
-- alterations or removals of verified source evidence.
revoke update, delete on public.bes_assessments from authenticated;
revoke update, delete on public.bes_assessment_results from authenticated;
revoke update, delete on public.bes_assessment_adjustments from authenticated;

-- Remove pre-existing FOR ALL policies, which would otherwise permit writes
-- if table privileges were broadened by a future administrator.
drop policy if exists "bes_assessments_owner_access" on public.bes_assessments;
drop policy if exists "bes_assessment_results_owner_access" on public.bes_assessment_results;
drop policy if exists "bes_assessment_adjustments_owner_access" on public.bes_assessment_adjustments;

drop policy if exists "bes_assessments_owner_read" on public.bes_assessments;
drop policy if exists "bes_assessments_owner_insert" on public.bes_assessments;
create policy "bes_assessments_owner_read"
  on public.bes_assessments for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "bes_assessments_owner_insert"
  on public.bes_assessments for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "bes_assessment_results_owner_read" on public.bes_assessment_results;
drop policy if exists "bes_assessment_results_owner_insert" on public.bes_assessment_results;
create policy "bes_assessment_results_owner_read"
  on public.bes_assessment_results for select to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.bes_assessments a
    where a.id=assessment_id and a.owner_id=(select auth.uid())
  ));
create policy "bes_assessment_results_owner_insert"
  on public.bes_assessment_results for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.bes_assessments a
    where a.id=assessment_id and a.owner_id=(select auth.uid())
  ));

drop policy if exists "bes_assessment_adjustments_owner_read" on public.bes_assessment_adjustments;
drop policy if exists "bes_assessment_adjustments_owner_insert" on public.bes_assessment_adjustments;
create policy "bes_assessment_adjustments_owner_read"
  on public.bes_assessment_adjustments for select to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.bes_assessments a
    where a.id=assessment_id and a.owner_id=(select auth.uid())
  ));
create policy "bes_assessment_adjustments_owner_insert"
  on public.bes_assessment_adjustments for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.bes_assessments a
      where a.id=assessment_id and a.owner_id=(select auth.uid())
    )
    and (
      followup_assessment_id is null or exists (
        select 1
        from public.bes_assessments base
        join public.bes_assessments followup
          on followup.id=followup_assessment_id
        where base.id=assessment_id
          and base.owner_id=(select auth.uid())
          and followup.owner_id=(select auth.uid())
          and followup.id<>assessment_id
          and followup.kind=base.kind
          and followup.class_label=base.class_label
          and followup.objective=base.objective
      )
    )
  );

commit;

-- Note: users cannot edit or remove erroneous scores in this teacher-facing
-- release. An authorized data-correction process with an immutable audit log
-- must be implemented before production grading use. Administrative erasure
-- via privileged tooling remains possible where legally required.
