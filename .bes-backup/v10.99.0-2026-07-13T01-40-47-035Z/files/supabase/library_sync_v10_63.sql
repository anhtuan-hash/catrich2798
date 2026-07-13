-- Brian English Studio V10.63
-- Account-scoped library, prompts, question bank, and reusable activity payloads.

create table if not exists public.library_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  item_type text not null check (item_type in ('history','prompt','question')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists library_items_user_type_updated_idx
  on public.library_items (user_id, item_type, updated_at desc);

alter table public.library_items enable row level security;

drop policy if exists "library_items_select_own" on public.library_items;
create policy "library_items_select_own"
  on public.library_items for select
  using (auth.uid() = user_id);

drop policy if exists "library_items_insert_own" on public.library_items;
create policy "library_items_insert_own"
  on public.library_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "library_items_update_own" on public.library_items;
create policy "library_items_update_own"
  on public.library_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "library_items_delete_own" on public.library_items;
create policy "library_items_delete_own"
  on public.library_items for delete
  using (auth.uid() = user_id);

-- Optional admin visibility for support/audit. Remove these two policies if admins
-- should never inspect teacher libraries.
drop policy if exists "library_items_admin_select" on public.library_items;
create policy "library_items_admin_select"
  on public.library_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.approved = true
    )
  );

comment on table public.library_items is
  'Per-account Brian English Studio library. Payload contains sourceApp, templateId, activityData, ownership and replay metadata.';
