-- Brian Question Bank + ChatGPT bridge (V11.6.8)
-- Additive migration: reuses the existing assessment_* core.

create table if not exists public.assessment_bundles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  visibility text not null default 'private',
  title text not null default '',
  bundle_type text not null default 'passage',
  context_text text not null default '',
  instructions text not null default '',
  topic text not null default '',
  skill text not null default '',
  grade smallint,
  unit_name text not null default '',
  school_year text not null default '',
  source text not null default '',
  source_kind text not null default 'manual',
  source_reference text not null default '',
  status text not null default 'draft',
  fingerprint text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assessment_bundles enable row level security;

drop policy if exists assessment_bundles_read_brian_qb on public.assessment_bundles;
create policy assessment_bundles_read_brian_qb
on public.assessment_bundles
for select
to authenticated
using (
  owner_id = auth.uid()
  or visibility = 'department'
  or public.bes_v1093_is_leader(auth.uid())
);

drop policy if exists assessment_bundles_insert_brian_qb on public.assessment_bundles;
create policy assessment_bundles_insert_brian_qb
on public.assessment_bundles
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists assessment_bundles_update_brian_qb on public.assessment_bundles;
create policy assessment_bundles_update_brian_qb
on public.assessment_bundles
for update
to authenticated
using (owner_id = auth.uid() or public.bes_v1093_is_leader(auth.uid()))
with check (owner_id = auth.uid() or public.bes_v1093_is_leader(auth.uid()));

drop policy if exists assessment_bundles_delete_brian_qb on public.assessment_bundles;
create policy assessment_bundles_delete_brian_qb
on public.assessment_bundles
for delete
to authenticated
using (owner_id = auth.uid() or public.bes_v1093_is_leader(auth.uid()));

alter table public.assessment_items
  add column if not exists bundle_id uuid references public.assessment_bundles(id) on delete set null,
  add column if not exists bundle_position integer,
  add column if not exists grade smallint,
  add column if not exists unit_name text not null default '',
  add column if not exists school_year text not null default '',
  add column if not exists grammar_point text not null default '',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists source_kind text not null default 'manual',
  add column if not exists source_reference text not null default '',
  add column if not exists fingerprint text not null default '',
  add column if not exists import_metadata jsonb not null default '{}'::jsonb;

alter table public.assessment_tests
  add column if not exists grade smallint,
  add column if not exists school_year text not null default '',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists source_kind text not null default 'manual',
  add column if not exists source_reference text not null default '',
  add column if not exists import_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.question_bank_integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'chatgpt',
  label text not null default 'ChatGPT',
  token_hash text not null,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider),
  unique (token_hash)
);

alter table public.question_bank_integrations enable row level security;

drop policy if exists question_bank_integrations_owner_select on public.question_bank_integrations;
create policy question_bank_integrations_owner_select
on public.question_bank_integrations
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists question_bank_integrations_owner_insert on public.question_bank_integrations;
create policy question_bank_integrations_owner_insert
on public.question_bank_integrations
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists question_bank_integrations_owner_update on public.question_bank_integrations;
create policy question_bank_integrations_owner_update
on public.question_bank_integrations
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists question_bank_integrations_owner_delete on public.question_bank_integrations;
create policy question_bank_integrations_owner_delete
on public.question_bank_integrations
for delete
to authenticated
using (owner_id = auth.uid());

create table if not exists public.assessment_import_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid references public.question_bank_integrations(id) on delete set null,
  request_id text not null default '',
  source_kind text not null default 'chatgpt',
  imported_items integer not null default 0,
  reused_items integer not null default 0,
  imported_bundles integer not null default 0,
  imported_tests integer not null default 0,
  payload_hash text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.assessment_import_events enable row level security;

drop policy if exists assessment_import_events_owner_read on public.assessment_import_events;
create policy assessment_import_events_owner_read
on public.assessment_import_events
for select
to authenticated
using (owner_id = auth.uid());

create index if not exists assessment_bundles_owner_updated_idx
  on public.assessment_bundles(owner_id, updated_at desc);
create index if not exists assessment_bundles_search_idx
  on public.assessment_bundles(owner_id, grade, skill, status);
create unique index if not exists assessment_bundles_owner_fingerprint_uidx
  on public.assessment_bundles(owner_id, fingerprint)
  where fingerprint <> '';

create index if not exists assessment_items_bundle_position_idx
  on public.assessment_items(bundle_id, bundle_position);
create index if not exists assessment_items_owner_grade_idx
  on public.assessment_items(owner_id, grade, updated_at desc);
create index if not exists assessment_items_owner_tags_idx
  on public.assessment_items using gin(tags);
create unique index if not exists assessment_items_owner_fingerprint_uidx
  on public.assessment_items(owner_id, fingerprint)
  where fingerprint <> '';

create index if not exists assessment_tests_owner_updated_idx
  on public.assessment_tests(owner_id, updated_at desc);
create index if not exists assessment_import_events_owner_created_idx
  on public.assessment_import_events(owner_id, created_at desc);

revoke all on table public.assessment_bundles from anon;
revoke all on table public.question_bank_integrations from anon;
revoke all on table public.assessment_import_events from anon;

grant select, insert, update, delete on table public.assessment_bundles to authenticated;
grant select, insert, update, delete on table public.question_bank_integrations to authenticated;
grant select on table public.assessment_import_events to authenticated;

grant all on table public.assessment_bundles to service_role;
grant all on table public.question_bank_integrations to service_role;
grant all on table public.assessment_import_events to service_role;

comment on table public.assessment_bundles is
  'Question bundles such as reading passages or cloze texts whose questions must retain shared context.';
comment on table public.question_bank_integrations is
  'Per-user hashed connector credentials for importing question-bank content from approved external clients such as ChatGPT.';
comment on table public.assessment_import_events is
  'Audit log for external question-bank imports; raw connector secrets and full prompts are intentionally excluded.';
