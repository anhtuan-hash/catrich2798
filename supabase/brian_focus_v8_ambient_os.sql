-- Brian Focus 8.0 Ambient OS: non-destructive, authenticated user-isolated
-- data sources for Cloud Vault and Companion Remote.
-- Applied to project xpkbgqdlfonsinriggmj on 2026-10-24.
-- For reproducibility. Do not rerun without checking policies/migration status.

create table if not exists public.brian_focus_v8_vault (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb,
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 constraint brian_focus_v8_vault_size check (pg_column_size(payload) < 300000)
);
alter table public.brian_focus_v8_vault enable row level security;
revoke all on public.brian_focus_v8_vault from anon, authenticated;
grant select, insert, update, delete on public.brian_focus_v8_vault to authenticated;
create policy focus_v8_vault_select on public.brian_focus_v8_vault for select to authenticated using (user_id = (select auth.uid()));
create policy focus_v8_vault_insert on public.brian_focus_v8_vault for insert to authenticated with check (user_id = (select auth.uid()));
create policy focus_v8_vault_update on public.brian_focus_v8_vault for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy focus_v8_vault_delete on public.brian_focus_v8_vault for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.brian_focus_v8_remote (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 code text not null check (length(code) between 8 and 64),
 expires_at timestamptz not null,
 revoked boolean not null default false,
 seq integer not null default 0,
 command jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 constraint brian_focus_v8_remote_command_size check (pg_column_size(command) < 4000)
);
create index if not exists idx_brian_focus_v8_remote_user on public.brian_focus_v8_remote(user_id,expires_at);
alter table public.brian_focus_v8_remote enable row level security;
revoke all on public.brian_focus_v8_remote from anon, authenticated;
grant select, insert, update, delete on public.brian_focus_v8_remote to authenticated;
create policy focus_v8_remote_select on public.brian_focus_v8_remote for select to authenticated using (user_id = (select auth.uid()));
create policy focus_v8_remote_insert on public.brian_focus_v8_remote for insert to authenticated with check
  (user_id = (select auth.uid()) and expires_at <= now() + interval '15 minutes' and expires_at > now());
create policy focus_v8_remote_update on public.brian_focus_v8_remote for update to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy focus_v8_remote_delete on public.brian_focus_v8_remote for delete to authenticated using (user_id = (select auth.uid()));
