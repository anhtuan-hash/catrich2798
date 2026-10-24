-- Brian Board — separate owner-scoped cloud lesson snapshots.
-- Applied to production project xpkbgqdlfonsinriggmj; no legacy table altered.
create table if not exists public.brian_board_cloud_lessons (
 owner_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null check (length(lesson_id) between 8 and 85),
 title text not null check (length(title) between 1 and 180),
 payload jsonb not null,
 revision bigint not null default 1 check (revision>=1),
 updated_at timestamptz not null default now(),
 primary key(owner_id,lesson_id),
 constraint brian_board_cloud_payload_limit check(pg_column_size(payload)<400000)
);
create index if not exists brian_board_cloud_owner_recent_idx
 on public.brian_board_cloud_lessons(owner_id,updated_at desc);
alter table public.brian_board_cloud_lessons enable row level security;
revoke all on public.brian_board_cloud_lessons from anon,authenticated;
grant select,insert,update,delete on public.brian_board_cloud_lessons to authenticated;
create policy brian_board_owner_select on public.brian_board_cloud_lessons for select
 to authenticated using(owner_id=(select auth.uid()));
create policy brian_board_owner_insert on public.brian_board_cloud_lessons for insert
 to authenticated with check(owner_id=(select auth.uid()));
create policy brian_board_owner_update on public.brian_board_cloud_lessons for update
 to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy brian_board_owner_delete on public.brian_board_cloud_lessons for delete
 to authenticated using(owner_id=(select auth.uid()));
