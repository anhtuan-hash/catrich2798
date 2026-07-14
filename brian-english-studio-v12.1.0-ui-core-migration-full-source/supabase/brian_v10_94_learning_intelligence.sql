-- Brian English Studio V10.94.0 Learning Intelligence
-- Mastery analytics, error taxonomy, early warning and adaptive practice.
-- Safe to rerun. Existing V10.93 data is preserved.

begin;
create extension if not exists pgcrypto;

create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

insert into public.bes_schema_registry(component, version, metadata)
values
  ('application', '10.94.0', '{"release":"Learning Intelligence"}'::jsonb),
  ('runtime_core', '1.1.0', '{"feature":"learning-analytics"}'::jsonb),
  ('learning_intelligence', '10.94.0', '{"mastery":true,"error_taxonomy":true,"adaptive_practice":true}'::jsonb)
on conflict(component) do update
set version=excluded.version, installed_at=now(), metadata=excluded.metadata;

create or replace function public.bes_v1094_try_uuid(value text)
returns uuid language plpgsql immutable security invoker set search_path=public,pg_temp as $$
begin
  if value is not null and value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return value::uuid; end if;
  return null;
end; $$;

create or replace function public.bes_v1094_profile_uuid(profile_json jsonb)
returns uuid language sql immutable security invoker set search_path=public,pg_temp as $$
  select coalesce(
    public.bes_v1094_try_uuid(profile_json->>'id'),
    public.bes_v1094_try_uuid(profile_json->>'user_id'),
    public.bes_v1094_try_uuid(profile_json->>'profile_id')
  );
$$;

create or replace function public.bes_v1094_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare
  jwt jsonb:=coalesce(auth.jwt(),'{}'::jsonb);
  jwt_role text:=lower(coalesce(jwt->'app_metadata'->>'role',jwt->'user_metadata'->>'role',jwt->>'role',''));
  jwt_email text:=lower(coalesce(jwt->>'email',''));
  matched boolean:=false;
begin
  if target_user is null then return false; end if;
  if target_user=auth.uid() and (jwt_role in ('admin','ttcm','leader','department_head','department-head','head') or jwt_email='anhtuan@pek.edu.vn') then return true; end if;
  if to_regclass('public.profiles') is null then return false; end if;
  select exists(
    select 1 from public.profiles p
    cross join lateral (select to_jsonb(p) j) x
    where public.bes_v1094_profile_uuid(x.j)=target_user
      and (
        lower(coalesce(x.j->>'role','')) in ('admin','ttcm','leader','department_head','department-head','head')
        or lower(coalesce(x.j->>'email',''))='anhtuan@pek.edu.vn'
        or lower(coalesce(x.j->>'position','')) similar to '%(ttcm|tổ trưởng|to truong|department head|department leader)%'
      )
  ) into matched;
  return coalesce(matched,false);
exception when others then return false;
end; $$;

create or replace function public.bes_v1094_set_updated_at()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin new.updated_at=now(); return new; end; $$;

create table if not exists public.learning_learners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  assigned_teacher_id uuid not null default auth.uid(),
  learner_user_id uuid,
  display_name text not null,
  class_name text not null default '',
  student_code text not null default '',
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_learners_name_check check(length(btrim(display_name))>0),
  constraint learning_learners_metadata_object check(jsonb_typeof(metadata)='object')
);
create index if not exists learning_learners_teacher_idx on public.learning_learners(assigned_teacher_id,class_name,display_name);
create index if not exists learning_learners_user_idx on public.learning_learners(learner_user_id) where learner_user_id is not null;
drop trigger if exists learning_learners_updated_trg on public.learning_learners;
create trigger learning_learners_updated_trg before update on public.learning_learners for each row execute function public.bes_v1094_set_updated_at();

create table if not exists public.learning_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learning_learners(id) on delete cascade,
  assessment_item_id uuid,
  test_id uuid,
  recorded_by uuid not null default auth.uid(),
  source text not null default 'manual',
  skill text not null default 'Use of English',
  topic text not null default 'General',
  cefr text not null default 'B2',
  question_type text not null default '',
  is_correct boolean not null default false,
  response_time_ms integer not null default 0,
  error_code text not null default '',
  raw_response text not null default '',
  correct_answer text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint learning_attempts_response_time_check check(response_time_ms>=0),
  constraint learning_attempts_metadata_object check(jsonb_typeof(metadata)='object')
);
create index if not exists learning_attempts_learner_time_idx on public.learning_attempts(learner_id,attempted_at desc);
create index if not exists learning_attempts_skill_idx on public.learning_attempts(skill,topic,cefr,is_correct);
create index if not exists learning_attempts_error_idx on public.learning_attempts(error_code) where error_code<>'';

create table if not exists public.learning_mastery (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learning_learners(id) on delete cascade,
  skill text not null default 'Use of English',
  topic text not null default 'General',
  cefr text not null default 'B2',
  mastery_score numeric(5,2) not null default 0,
  confidence numeric(5,2) not null default 0,
  attempts integer not null default 0,
  correct_count integer not null default 0,
  error_distribution jsonb not null default '{}'::jsonb,
  last_practiced_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint learning_mastery_score_check check(mastery_score between 0 and 100),
  constraint learning_mastery_confidence_check check(confidence between 0 and 100),
  constraint learning_mastery_errors_object check(jsonb_typeof(error_distribution)='object'),
  unique(learner_id,skill,topic,cefr)
);
create index if not exists learning_mastery_review_idx on public.learning_mastery(next_review_at,mastery_score);
drop trigger if exists learning_mastery_updated_trg on public.learning_mastery;
create trigger learning_mastery_updated_trg before update on public.learning_mastery for each row execute function public.bes_v1094_set_updated_at();

create table if not exists public.learning_interventions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learning_learners(id) on delete cascade,
  assigned_by uuid not null default auth.uid(),
  title text not null,
  reason text not null default '',
  status text not null default 'active',
  priority text not null default 'normal',
  due_at timestamptz,
  plan_json jsonb not null default '{}'::jsonb,
  outcome_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_interventions_status_check check(status in('draft','active','review','completed','cancelled','archived')),
  constraint learning_interventions_priority_check check(priority in('low','normal','high','urgent')),
  constraint learning_interventions_plan_object check(jsonb_typeof(plan_json)='object'),
  constraint learning_interventions_outcome_object check(jsonb_typeof(outcome_json)='object')
);
create index if not exists learning_interventions_learner_idx on public.learning_interventions(learner_id,status,due_at);
drop trigger if exists learning_interventions_updated_trg on public.learning_interventions;
create trigger learning_interventions_updated_trg before update on public.learning_interventions for each row execute function public.bes_v1094_set_updated_at();

create table if not exists public.learning_practice_sets (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learning_learners(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  title text not null,
  status text not null default 'draft',
  criteria_json jsonb not null default '{}'::jsonb,
  items_json jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_practice_status_check check(status in('draft','assigned','in_progress','completed','archived')),
  constraint learning_practice_criteria_object check(jsonb_typeof(criteria_json)='object'),
  constraint learning_practice_items_array check(jsonb_typeof(items_json)='array')
);
create index if not exists learning_practice_learner_idx on public.learning_practice_sets(learner_id,status,updated_at desc);
drop trigger if exists learning_practice_sets_updated_trg on public.learning_practice_sets;
create trigger learning_practice_sets_updated_trg before update on public.learning_practice_sets for each row execute function public.bes_v1094_set_updated_at();

create or replace function public.learning_can_access_learner(target_learner uuid,target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
  select exists(
    select 1 from public.learning_learners l
    where l.id=target_learner
      and (
        l.owner_id=target_user
        or l.assigned_teacher_id=target_user
        or l.learner_user_id=target_user
        or public.bes_v1094_is_leader(target_user)
      )
  );
$$;

create or replace function public.learning_rebuild_mastery(target_learner uuid default null)
returns integer language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare rebuilt integer:=0;
begin
  if target_learner is not null and not public.learning_can_access_learner(target_learner,auth.uid()) then
    raise exception 'Not allowed to rebuild mastery for this learner.';
  end if;

  delete from public.learning_mastery m
  where (target_learner is null or m.learner_id=target_learner)
    and public.learning_can_access_learner(m.learner_id,auth.uid());

  with base as (
    select a.learner_id,a.skill,a.topic,a.cefr,
      count(*)::integer attempts,
      count(*) filter(where a.is_correct)::integer correct_count,
      max(a.attempted_at) last_practiced_at
    from public.learning_attempts a
    where (target_learner is null or a.learner_id=target_learner)
      and public.learning_can_access_learner(a.learner_id,auth.uid())
    group by a.learner_id,a.skill,a.topic,a.cefr
  ), errors as (
    select x.learner_id,x.skill,x.topic,x.cefr,
      coalesce(jsonb_object_agg(x.error_code,x.error_count),'{}'::jsonb) error_distribution
    from (
      select a.learner_id,a.skill,a.topic,a.cefr,coalesce(nullif(a.error_code,''),'other') error_code,count(*)::integer error_count
      from public.learning_attempts a
      where not a.is_correct
        and (target_learner is null or a.learner_id=target_learner)
        and public.learning_can_access_learner(a.learner_id,auth.uid())
      group by a.learner_id,a.skill,a.topic,a.cefr,coalesce(nullif(a.error_code,''),'other')
    ) x
    group by x.learner_id,x.skill,x.topic,x.cefr
  )
  insert into public.learning_mastery(
    learner_id,skill,topic,cefr,mastery_score,confidence,attempts,correct_count,error_distribution,last_practiced_at,next_review_at,updated_at
  )
  select b.learner_id,b.skill,b.topic,b.cefr,
    round((b.correct_count::numeric/nullif(b.attempts,0))*100,2),
    least(100,b.attempts*10)::numeric,
    b.attempts,b.correct_count,coalesce(e.error_distribution,'{}'::jsonb),b.last_practiced_at,
    b.last_practiced_at + case
      when (b.correct_count::numeric/nullif(b.attempts,0))*100 < 50 then interval '2 days'
      when (b.correct_count::numeric/nullif(b.attempts,0))*100 < 70 then interval '4 days'
      when (b.correct_count::numeric/nullif(b.attempts,0))*100 < 85 then interval '7 days'
      else interval '14 days' end,
    now()
  from base b left join errors e using(learner_id,skill,topic,cefr)
  on conflict(learner_id,skill,topic,cefr) do update set
    mastery_score=excluded.mastery_score,confidence=excluded.confidence,attempts=excluded.attempts,
    correct_count=excluded.correct_count,error_distribution=excluded.error_distribution,
    last_practiced_at=excluded.last_practiced_at,next_review_at=excluded.next_review_at,updated_at=now();

  get diagnostics rebuilt=row_count;
  return rebuilt;
end; $$;

alter table public.learning_learners enable row level security;
alter table public.learning_attempts enable row level security;
alter table public.learning_mastery enable row level security;
alter table public.learning_interventions enable row level security;
alter table public.learning_practice_sets enable row level security;

do $$ declare policy_name text; table_name text; begin
  foreach table_name in array array['learning_learners','learning_attempts','learning_mastery','learning_interventions','learning_practice_sets'] loop
    for policy_name in select policyname from pg_policies where schemaname='public' and tablename=table_name and policyname like '%_v1094' loop
      execute format('drop policy if exists %I on public.%I',policy_name,table_name);
    end loop;
  end loop;
end $$;

create policy learning_learners_read_v1094 on public.learning_learners for select to authenticated
using(owner_id=auth.uid() or assigned_teacher_id=auth.uid() or learner_user_id=auth.uid() or public.bes_v1094_is_leader(auth.uid()));
create policy learning_learners_insert_v1094 on public.learning_learners for insert to authenticated
with check(owner_id=auth.uid() or assigned_teacher_id=auth.uid() or public.bes_v1094_is_leader(auth.uid()));
create policy learning_learners_update_v1094 on public.learning_learners for update to authenticated
using(owner_id=auth.uid() or assigned_teacher_id=auth.uid() or public.bes_v1094_is_leader(auth.uid()))
with check(owner_id=auth.uid() or assigned_teacher_id=auth.uid() or public.bes_v1094_is_leader(auth.uid()));
create policy learning_learners_delete_v1094 on public.learning_learners for delete to authenticated
using(owner_id=auth.uid() or public.bes_v1094_is_leader(auth.uid()));

create policy learning_attempts_read_v1094 on public.learning_attempts for select to authenticated
using(public.learning_can_access_learner(learner_id,auth.uid()));
create policy learning_attempts_insert_v1094 on public.learning_attempts for insert to authenticated
with check(public.learning_can_access_learner(learner_id,auth.uid()) and (recorded_by=auth.uid() or public.bes_v1094_is_leader(auth.uid())));
create policy learning_attempts_update_v1094 on public.learning_attempts for update to authenticated
using(recorded_by=auth.uid() or public.bes_v1094_is_leader(auth.uid()))
with check(public.learning_can_access_learner(learner_id,auth.uid()));
create policy learning_attempts_delete_v1094 on public.learning_attempts for delete to authenticated
using(recorded_by=auth.uid() or public.bes_v1094_is_leader(auth.uid()));

create policy learning_mastery_read_v1094 on public.learning_mastery for select to authenticated
using(public.learning_can_access_learner(learner_id,auth.uid()));
create policy learning_mastery_write_v1094 on public.learning_mastery for all to authenticated
using(public.learning_can_access_learner(learner_id,auth.uid()))
with check(public.learning_can_access_learner(learner_id,auth.uid()));

create policy learning_interventions_read_v1094 on public.learning_interventions for select to authenticated
using(public.learning_can_access_learner(learner_id,auth.uid()));
create policy learning_interventions_write_v1094 on public.learning_interventions for all to authenticated
using(public.learning_can_access_learner(learner_id,auth.uid()))
with check(public.learning_can_access_learner(learner_id,auth.uid()));

create policy learning_practice_sets_read_v1094 on public.learning_practice_sets for select to authenticated
using(public.learning_can_access_learner(learner_id,auth.uid()));
create policy learning_practice_sets_write_v1094 on public.learning_practice_sets for all to authenticated
using(public.learning_can_access_learner(learner_id,auth.uid()))
with check(public.learning_can_access_learner(learner_id,auth.uid()));

revoke all on public.learning_learners,public.learning_attempts,public.learning_mastery,public.learning_interventions,public.learning_practice_sets from anon;
grant select,insert,update,delete on public.learning_learners,public.learning_attempts,public.learning_mastery,public.learning_interventions,public.learning_practice_sets to authenticated;
grant execute on function public.bes_v1094_try_uuid(text),public.bes_v1094_is_leader(uuid),public.learning_can_access_learner(uuid,uuid),public.learning_rebuild_mastery(uuid) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['learning_learners','learning_attempts','learning_mastery','learning_interventions','learning_practice_sets'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
exception when undefined_object then
  raise notice 'supabase_realtime publication is unavailable; manual refresh remains active.';
end $$;

commit;

select 'learning_learners' object,count(*) rows from public.learning_learners
union all select 'learning_attempts',count(*) from public.learning_attempts
union all select 'learning_mastery',count(*) from public.learning_mastery
union all select 'learning_interventions',count(*) from public.learning_interventions
union all select 'learning_practice_sets',count(*) from public.learning_practice_sets;
