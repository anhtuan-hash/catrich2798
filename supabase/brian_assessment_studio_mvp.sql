-- BRIAN Assessment Studio MVP. Apply manually through the Supabase SQL editor after review.
-- Authenticated teacher-owned records only. No public/anonymous write policies.
create table if not exists public.bes_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('diagnostic','speaking','exit','error','vocabulary','reading','listening','writing','rewrite','self','peer','project')),
  title text not null check (char_length(title) between 1 and 180),
  class_label text not null default '',
  objective text not null default '',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bes_assessments_owner_created_idx on public.bes_assessments(owner_id, created_at desc);
alter table public.bes_assessments enable row level security;
revoke all on public.bes_assessments from anon;
grant select,insert,update,delete on public.bes_assessments to authenticated;
drop policy if exists "bes_assessments_owner_access" on public.bes_assessments;
create policy "bes_assessments_owner_access" on public.bes_assessments
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create table if not exists public.bes_assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.bes_assessments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_code text not null default '',
  student_name text not null check (char_length(student_name) between 1 and 160),
  answers jsonb not null default '[]'::jsonb,
  score numeric(8,2) not null check (score >= 0),
  max_score numeric(8,2) not null check (max_score > 0 and score <= max_score),
  breakdown jsonb not null default '{}'::jsonb,
  assessed_at timestamptz not null default now()
);
create index if not exists bes_assessment_results_owner_assessment_idx
  on public.bes_assessment_results(owner_id, assessment_id, assessed_at desc);
alter table public.bes_assessment_results enable row level security;
revoke all on public.bes_assessment_results from anon;
grant select,insert,update,delete on public.bes_assessment_results to authenticated;
drop policy if exists "bes_assessment_results_owner_access" on public.bes_assessment_results;
create policy "bes_assessment_results_owner_access" on public.bes_assessment_results
  for all to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.bes_assessments a
    where a.id = assessment_id and a.owner_id = (select auth.uid())
  ))
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.bes_assessments a
    where a.id = assessment_id and a.owner_id = (select auth.uid())
  ));

create table if not exists public.bes_assessment_adjustments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.bes_assessments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  followup_assessment_id uuid references public.bes_assessments(id) on delete set null,
  finding text not null default '',
  action_taken text not null default '',
  status text not null default 'planned' check (status in ('planned','implemented','reviewed')),
  constraint bes_assessment_review_link check (status <> 'reviewed' or followup_assessment_id is not null),
  constraint bes_assessment_no_self_followup check (followup_assessment_id is distinct from assessment_id),
  implementation_date date,
  evidence_note text not null default '',
  followup_result text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists bes_assessment_adjustments_owner_assessment_idx
  on public.bes_assessment_adjustments(owner_id, assessment_id, created_at desc);
alter table public.bes_assessment_adjustments enable row level security;
revoke all on public.bes_assessment_adjustments from anon;
grant select,insert,update,delete on public.bes_assessment_adjustments to authenticated;
drop policy if exists "bes_assessment_adjustments_owner_access" on public.bes_assessment_adjustments;
create policy "bes_assessment_adjustments_owner_access" on public.bes_assessment_adjustments
  for all to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.bes_assessments a
    where a.id = assessment_id and a.owner_id = (select auth.uid())
  ))
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.bes_assessments a
    where a.id = assessment_id and a.owner_id = (select auth.uid())
  ) and (followup_assessment_id is null or exists (
    select 1 from public.bes_assessments f
    where f.id = followup_assessment_id and f.owner_id = (select auth.uid())
  )));
