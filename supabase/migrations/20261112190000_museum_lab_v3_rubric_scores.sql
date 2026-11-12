-- BRIAN Museum Lab V3.0: optional assessment evidence for the existing Creator Pass.
-- Preserve all existing Gallery/Creator Pass data and security boundaries.
begin;
create table public.gcp_rubric_scores (
 review_id uuid primary key references public.gcp_reviews(id) on delete restrict,
 teacher_id uuid not null references auth.users(id),
 scores jsonb not null check(jsonb_typeof(scores)='object' and pg_column_size(scores)<2000),
 feedback text not null default '' check(length(feedback)<=2000),
 updated_at timestamptz not null default now()
);
create index gcp_rubric_scores_teacher_idx on public.gcp_rubric_scores(teacher_id,updated_at desc);
alter table public.gcp_rubric_scores enable row level security;
revoke all on public.gcp_rubric_scores from public,anon,authenticated;
grant all on public.gcp_rubric_scores to service_role;
commit;
