-- Operational audit only: records safe restoration of the five original
-- October 2026 gifted assignments affected by a testing mistake.
-- Does not modify or recreate live tasks. Data is already restored in Production.
create table if not exists public.bes_learning_report_recovery_audit (
  original_task_id uuid primary key,
  head_id uuid not null,
  restored_at timestamptz not null default now(),
  previous_revocation jsonb not null,
  note text not null
);
alter table public.bes_learning_report_recovery_audit enable row level security;
revoke all on public.bes_learning_report_recovery_audit from public,anon,authenticated;
