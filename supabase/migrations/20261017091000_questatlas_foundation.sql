-- BRIAN QuestAtlas foundation (reviewed PR only; DO NOT run on production automatically)
-- This migration deliberately has no public student-play RPC or anonymous grants.
create table if not exists public.qatl_nodes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  title text not null check (length(title) between 3 and 150),
  summary text not null default '',
  grade integer check (grade between 10 and 12),
  unit_name text not null default '',
  status text not null default 'draft' check (status in ('draft','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.qatl_edges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  from_node_id uuid not null references public.qatl_nodes(id) on delete cascade,
  to_node_id uuid not null references public.qatl_nodes(id) on delete cascade,
  relation text not null default 'related' check (relation in ('related','prerequisite','confusable')),
  created_at timestamptz not null default now(),
  constraint qatl_edges_distinct check (from_node_id <> to_node_id),
  constraint qatl_edges_unique unique (owner_id,from_node_id,to_node_id,relation)
);
create table if not exists public.qatl_quests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  title text not null check (length(title) between 5 and 150),
  description text not null default '',
  world text not null default 'temple' check (world in ('temple','cyber','library')),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.qatl_puzzles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  quest_id uuid not null references public.qatl_quests(id) on delete cascade,
  source_node_id uuid references public.qatl_nodes(id) on delete set null,
  position integer not null default 1 check (position between 1 and 100),
  kind text not null check (kind in ('choice','code')),
  stem text not null check (length(stem) between 8 and 500),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options)='array'),
  correct_answer text not null check (length(correct_answer) between 1 and 180),
  clue text not null default '',
  points integer not null default 10 check (points between 1 and 100),
  created_at timestamptz not null default now()
);
create index if not exists qatl_nodes_owner_idx on public.qatl_nodes(owner_id);
create index if not exists qatl_edges_owner_idx on public.qatl_edges(owner_id);
create index if not exists qatl_edges_target_idx on public.qatl_edges(to_node_id);
create index if not exists qatl_quests_owner_idx on public.qatl_quests(owner_id);
create index if not exists qatl_puzzles_quest_order_idx on public.qatl_puzzles(quest_id,position);
create index if not exists qatl_puzzles_node_idx on public.qatl_puzzles(source_node_id);
alter table public.qatl_nodes enable row level security;
alter table public.qatl_edges enable row level security;
alter table public.qatl_quests enable row level security;
alter table public.qatl_puzzles enable row level security;
-- No write access without an approved BRIAN profile. Scoped to one owner for Phase 02.
create policy qatl_nodes_select_owner on public.qatl_nodes for select to authenticated using (owner_id=(select auth.uid()));
create policy qatl_nodes_insert_owner on public.qatl_nodes for insert to authenticated with check (
  owner_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.approved=true)
);
create policy qatl_nodes_update_owner on public.qatl_nodes for update to authenticated
  using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy qatl_nodes_delete_owner on public.qatl_nodes for delete to authenticated using (owner_id=(select auth.uid()));
create policy qatl_edges_select_owner on public.qatl_edges for select to authenticated using (owner_id=(select auth.uid()));
create policy qatl_edges_insert_owner on public.qatl_edges for insert to authenticated with check (
  owner_id=(select auth.uid()) and exists(select 1 from public.qatl_nodes n where n.id=from_node_id and n.owner_id=(select auth.uid()))
  and exists(select 1 from public.qatl_nodes n where n.id=to_node_id and n.owner_id=(select auth.uid()))
);
create policy qatl_edges_delete_owner on public.qatl_edges for delete to authenticated using (owner_id=(select auth.uid()));
create policy qatl_quests_select_owner on public.qatl_quests for select to authenticated using (owner_id=(select auth.uid()));
create policy qatl_quests_insert_owner on public.qatl_quests for insert to authenticated with check (
  owner_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.approved=true)
);
create policy qatl_quests_update_owner on public.qatl_quests for update to authenticated
  using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy qatl_quests_delete_owner on public.qatl_quests for delete to authenticated using (owner_id=(select auth.uid()));
create policy qatl_puzzles_select_owner on public.qatl_puzzles for select to authenticated using (owner_id=(select auth.uid()));
create policy qatl_puzzles_insert_owner on public.qatl_puzzles for insert to authenticated with check (
  owner_id=(select auth.uid()) and exists(select 1 from public.qatl_quests q where q.id=quest_id and q.owner_id=(select auth.uid()))
  and (source_node_id is null or exists(select 1 from public.qatl_nodes n where n.id=source_node_id and n.owner_id=(select auth.uid())))
);
create policy qatl_puzzles_delete_owner on public.qatl_puzzles for delete to authenticated using (owner_id=(select auth.uid()));
revoke all on public.qatl_nodes,public.qatl_edges,public.qatl_quests,public.qatl_puzzles from anon;
grant select,insert,update,delete on public.qatl_nodes,public.qatl_quests to authenticated;
grant select,insert,delete on public.qatl_edges,public.qatl_puzzles to authenticated;
-- Never ship correct_answer to an anonymous or student-facing query.
