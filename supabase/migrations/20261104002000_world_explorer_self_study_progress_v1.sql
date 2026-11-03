-- Additive World Explorer self-study persistence. No existing publication data changes.
alter table public.world_explorer_settings add column if not exists learning_enabled boolean not null default true;

create table if not exists public.world_explorer_learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  publication_id uuid not null references public.world_explorer_publications(id) on delete cascade,
  content_hash text not null check (length(content_hash) between 6 and 128),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers)='object'),
  feedback jsonb not null default '{}'::jsonb check (jsonb_typeof(feedback)='object'),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id,publication_id,content_hash),
  constraint world_explorer_learning_progress_answers_size check (pg_column_size(answers)<=32768),
  constraint world_explorer_learning_progress_feedback_size check (pg_column_size(feedback)<=16384)
);
alter table public.world_explorer_learning_progress enable row level security;
revoke all on public.world_explorer_learning_progress from public,anon,authenticated;
grant select,insert,update,delete on public.world_explorer_learning_progress to authenticated;
drop policy if exists world_explorer_progress_own_select on public.world_explorer_learning_progress;
create policy world_explorer_progress_own_select on public.world_explorer_learning_progress
  for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists world_explorer_progress_own_insert on public.world_explorer_learning_progress;
create policy world_explorer_progress_own_insert on public.world_explorer_learning_progress
  for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists world_explorer_progress_own_update on public.world_explorer_learning_progress;
create policy world_explorer_progress_own_update on public.world_explorer_learning_progress
  for update to authenticated using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()));
drop policy if exists world_explorer_progress_own_delete on public.world_explorer_learning_progress;
create policy world_explorer_progress_own_delete on public.world_explorer_learning_progress
  for delete to authenticated using (user_id=(select auth.uid()));
create index if not exists world_explorer_progress_recent_idx
  on public.world_explorer_learning_progress(user_id,updated_at desc);

create table if not exists public.world_explorer_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  publication_id uuid not null references public.world_explorer_publications(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id,publication_id)
);
alter table public.world_explorer_bookmarks enable row level security;
revoke all on public.world_explorer_bookmarks from public,anon,authenticated;
grant select,insert,delete on public.world_explorer_bookmarks to authenticated;
drop policy if exists world_explorer_bookmarks_own_select on public.world_explorer_bookmarks;
create policy world_explorer_bookmarks_own_select on public.world_explorer_bookmarks
  for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists world_explorer_bookmarks_own_insert on public.world_explorer_bookmarks;
create policy world_explorer_bookmarks_own_insert on public.world_explorer_bookmarks
  for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists world_explorer_bookmarks_own_delete on public.world_explorer_bookmarks;
create policy world_explorer_bookmarks_own_delete on public.world_explorer_bookmarks
  for delete to authenticated using (user_id=(select auth.uid()));
