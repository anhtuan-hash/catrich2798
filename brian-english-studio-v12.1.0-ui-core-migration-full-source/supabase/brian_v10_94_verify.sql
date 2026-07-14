-- Brian English Studio V10.94.0 verify
select component,version,installed_at,metadata
from public.bes_schema_registry
where component in('application','runtime_core','learning_intelligence')
order by component;

select 'learning_learners' object,count(*) rows from public.learning_learners
union all select 'learning_attempts',count(*) from public.learning_attempts
union all select 'learning_mastery',count(*) from public.learning_mastery
union all select 'learning_interventions',count(*) from public.learning_interventions
union all select 'learning_practice_sets',count(*) from public.learning_practice_sets;

select routine_name from information_schema.routines
where routine_schema='public' and routine_name in('learning_can_access_learner','learning_rebuild_mastery')
order by routine_name;

select tablename,policyname,cmd from pg_policies
where schemaname='public' and tablename like 'learning_%'
order by tablename,policyname;
