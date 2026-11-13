-- Classroom Media + Formative Lab. Additive, no destructive migration.
-- Accounts without school approval cannot access teacher media; guest groups
-- receive current-stage media only through their existing Creator Pass.
begin;
alter table public.museum_live_sessions
 add column if not exists media_board jsonb not null default '{}'::jsonb;
create table if not exists public.museum_live_micro_responses (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.museum_live_sessions(id) on delete restrict,
 group_id uuid not null references public.gcp_groups(id) on delete restrict,
 stage_index integer not null check(stage_index in (3,4,5,6,8,9)),
 choice integer not null check(choice between 0 and 2),
 reason text not null check(char_length(trim(reason)) between 12 and 450),
 submitted_at timestamptz not null default now(),
 unique(session_id,group_id,stage_index)
);
create index if not exists museum_live_micro_session_stage_idx
 on public.museum_live_micro_responses(session_id,stage_index);
alter table public.museum_live_micro_responses enable row level security;
revoke all on public.museum_live_micro_responses from public,anon,authenticated;
grant select,insert on public.museum_live_micro_responses to service_role;
commit;
