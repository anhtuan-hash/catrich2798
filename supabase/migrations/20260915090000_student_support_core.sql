begin;

create table if not exists public.student_support_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  rule_type text not null check (rule_type in (
    'attendance_count','grade_window_drop','consecutive_scores_below','observation_count','combined_all'
  )),
  enabled boolean not null default true,
  scope text not null default 'school',
  config jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_support_cases (
  id uuid primary key default gen_random_uuid(),
  student_ref text not null check (length(trim(student_ref)) > 0),
  homeroom_workspace_id text not null check (length(trim(homeroom_workspace_id)) > 0),
  source_class_name text not null default '',
  school_year text not null default '',
  category text not null,
  title text not null,
  reason text not null default '',
  goal text not null default '',
  owner_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'NEW' check (status in (
    'NEW','REVIEWING','ACTIVE','FOLLOW_UP','RESOLVED','CLOSED','NO_ACTION_REQUIRED'
  )),
  follow_up_at timestamptz,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.student_support_alerts (
  id uuid primary key default gen_random_uuid(),
  student_ref text not null check (length(trim(student_ref)) > 0),
  homeroom_workspace_id text not null check (length(trim(homeroom_workspace_id)) > 0),
  source_class_name text not null default '',
  school_year text not null default '',
  rule_id uuid not null references public.student_support_rules(id) on delete restrict,
  rule_version integer not null check (rule_version > 0),
  alert_type text not null,
  status text not null default 'NEW' check (status in (
    'NEW','REVIEWING','LINKED_TO_CASE','NO_ACTION_REQUIRED','RESOLVED','ARCHIVED'
  )),
  evidence jsonb not null default '{}'::jsonb,
  window_start date,
  window_end date,
  dedupe_key text not null,
  first_triggered_at timestamptz not null default now(),
  last_evaluated_at timestamptz not null default now(),
  assigned_to uuid references auth.users(id) on delete set null,
  linked_case_id uuid references public.student_support_cases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.student_support_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_support_cases(id) on delete cascade,
  student_ref text not null,
  homeroom_workspace_id text not null,
  title text not null,
  description text not null default '',
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'TODO' check (status in ('TODO','IN_PROGRESS','DONE','CANCELLED')),
  due_at timestamptz,
  completed_at timestamptz,
  outcome_note text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_support_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_support_cases(id) on delete cascade,
  student_ref text not null,
  homeroom_workspace_id text not null,
  author_id uuid not null references auth.users(id) on delete restrict,
  note_type text not null default 'GENERAL',
  body text not null,
  visibility_scope text not null default 'HOMEROOM' check (visibility_scope in (
    'PRIVATE','HOMEROOM','TEACHING_TEAM','MANAGEMENT'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.student_support_teacher_observations (
  id uuid primary key default gen_random_uuid(),
  student_ref text not null check (length(trim(student_ref)) > 0),
  homeroom_workspace_id text not null check (length(trim(homeroom_workspace_id)) > 0),
  source_workspace_id text not null default '',
  source_class_name text not null,
  subject_name text not null default '',
  teacher_id uuid not null references auth.users(id) on delete restrict,
  observation_type text not null,
  observation_date date not null default current_date,
  period_label text not null default '',
  body text not null default '',
  visibility_scope text not null default 'HOMEROOM' check (visibility_scope in (
    'PRIVATE','HOMEROOM','TEACHING_TEAM','MANAGEMENT'
  )),
  submitted_to_homeroom boolean not null default false,
  follow_up_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.student_support_family_contacts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_support_cases(id) on delete cascade,
  student_ref text not null,
  homeroom_workspace_id text not null,
  contacted_by uuid not null references auth.users(id) on delete restrict,
  contact_method text not null,
  contact_status text not null,
  contacted_at timestamptz not null default now(),
  summary text not null default '',
  follow_up_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_support_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_support_cases(id) on delete cascade,
  student_ref text not null,
  homeroom_workspace_id text not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists student_support_alerts_active_dedupe_idx
  on public.student_support_alerts (dedupe_key)
  where archived_at is null and status in ('NEW','REVIEWING','LINKED_TO_CASE');

create index if not exists student_support_alerts_student_idx
  on public.student_support_alerts (student_ref, created_at desc);
create index if not exists student_support_alerts_workspace_idx
  on public.student_support_alerts (homeroom_workspace_id, status, updated_at desc);
create index if not exists student_support_cases_student_idx
  on public.student_support_cases (student_ref, updated_at desc);
create index if not exists student_support_cases_workspace_idx
  on public.student_support_cases (homeroom_workspace_id, status, updated_at desc);
create index if not exists student_support_actions_due_idx
  on public.student_support_actions (assigned_to, due_at)
  where status not in ('DONE','CANCELLED');
create index if not exists student_support_notes_case_idx
  on public.student_support_notes (case_id, created_at desc);
create index if not exists student_support_observations_student_idx
  on public.student_support_teacher_observations (student_ref, observation_date desc);
create index if not exists student_support_observations_workspace_idx
  on public.student_support_teacher_observations (homeroom_workspace_id, created_at desc);
create index if not exists student_support_contacts_case_idx
  on public.student_support_family_contacts (case_id, contacted_at desc);
create index if not exists student_support_events_case_idx
  on public.student_support_case_events (case_id, created_at asc);

create or replace function public.student_support_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger student_support_rules_set_updated_at
before update on public.student_support_rules
for each row execute function public.student_support_set_updated_at();
create trigger student_support_cases_set_updated_at
before update on public.student_support_cases
for each row execute function public.student_support_set_updated_at();
create trigger student_support_alerts_set_updated_at
before update on public.student_support_alerts
for each row execute function public.student_support_set_updated_at();
create trigger student_support_actions_set_updated_at
before update on public.student_support_actions
for each row execute function public.student_support_set_updated_at();
create trigger student_support_notes_set_updated_at
before update on public.student_support_notes
for each row execute function public.student_support_set_updated_at();
create trigger student_support_observations_set_updated_at
before update on public.student_support_teacher_observations
for each row execute function public.student_support_set_updated_at();
create trigger student_support_contacts_set_updated_at
before update on public.student_support_family_contacts
for each row execute function public.student_support_set_updated_at();

comment on table public.student_support_rules is 'Deterministic non-AI rules for Student Support Center.';
comment on table public.student_support_alerts is 'Explainable rule-based support alerts. Alerts never make autonomous student decisions.';
comment on table public.student_support_cases is 'Human-reviewed student support cases.';
comment on table public.student_support_case_events is 'Append-oriented Student Support case timeline.';

commit;
