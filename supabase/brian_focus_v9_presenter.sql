-- Applied via Supabase migration to project xpkbgqdlfonsinriggmj.
-- Restricted to the signed-in owner; no anonymous grants.
create table if not exists public.brian_focus_v9_presenter (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb,
 expires_at timestamptz not null,
 revoked boolean not null default false,
 updated_at timestamptz not null default now(),
 constraint focus_v9_state_size check (pg_column_size(state) < 5000)
);
create index if not exists idx_focus_v9_presenter_owner
 on public.brian_focus_v9_presenter (user_id, expires_at);
alter table public.brian_focus_v9_presenter enable row level security;
revoke all on public.brian_focus_v9_presenter from anon,authenticated;
grant select,insert,update,delete on public.brian_focus_v9_presenter to authenticated;
create policy focus9_owner_read on public.brian_focus_v9_presenter for select to authenticated
 using (user_id=(select auth.uid()));
create policy focus9_owner_insert on public.brian_focus_v9_presenter for insert to authenticated
 with check (user_id=(select auth.uid()) and expires_at>now() and expires_at<=now()+interval '2 hours');
create policy focus9_owner_update on public.brian_focus_v9_presenter for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy focus9_owner_delete on public.brian_focus_v9_presenter for delete to authenticated
 using (user_id=(select auth.uid()));
