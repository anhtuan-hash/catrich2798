-- Harden correlated RLS policy: explicitly qualify the outer deadline row.
drop policy if exists "learning_deadlines_scoped_read" on public.bes_learning_report_deadlines;
create policy "learning_deadlines_scoped_read" on public.bes_learning_report_deadlines
for select to authenticated using(
  head_id=(select auth.uid()) or (select public.is_admin())
  or exists(
    select 1 from public.bes_learning_report_tasks t
    where t.head_id=bes_learning_report_deadlines.head_id
      and t.department_id=bes_learning_report_deadlines.department_id
      and t.report_kind=bes_learning_report_deadlines.report_kind
      and t.period=bes_learning_report_deadlines.period
      and t.teacher_id=(select auth.uid())
  )
);
