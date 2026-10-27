-- Smart Assignment dual-kind compatibility fix.
-- A campaign may assign the same teacher BOTH a gifted and a remedial report.
-- Preserve existing stable constraint name and month-level deduplication.
-- No report, attendance, or event records are modified by this migration.
set local lock_timeout='5s';
do $migration$
declare v_def text;
begin
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid='public.bes_learning_report_tasks'::regclass
    and conname='bes_learning_report_tasks_campaign_id_teacher_id_key'
    and contype='u';
  if v_def='UNIQUE (campaign_id, teacher_id)' then
    alter table public.bes_learning_report_tasks
      drop constraint bes_learning_report_tasks_campaign_id_teacher_id_key;
    alter table public.bes_learning_report_tasks
      add constraint bes_learning_report_tasks_campaign_id_teacher_id_key
      unique (campaign_id, teacher_id, report_kind);
  elsif v_def='UNIQUE (campaign_id, teacher_id, report_kind)' then
    null; -- already applied, safe when environments have drifted
  else
    raise exception 'Unexpected learning report campaign uniqueness: %',coalesce(v_def,'missing');
  end if;
  if not exists (
    select 1 from pg_indexes where schemaname='public'
      and tablename='bes_learning_report_tasks'
      and indexname='bes_learning_report_one_per_teacher_kind_month'
  ) then
    raise exception 'Required one-per-teacher-per-kind-per-month index missing';
  end if;
end $migration$;
