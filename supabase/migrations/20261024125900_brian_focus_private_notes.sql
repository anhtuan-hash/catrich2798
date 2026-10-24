-- Brian Focus 4.0 personal notes. Production migration applied 2026-10-24.
-- A user may only read or modify their own notes, including with the REST API.
create table if not exists public.brian_focus_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 5000),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brian_focus_notes_owner_modified_idx
  on public.brian_focus_notes(user_id,updated_at desc);
alter table public.brian_focus_notes enable row level security;
revoke all on public.brian_focus_notes from anon;
grant select,insert,update,delete on public.brian_focus_notes to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='brian_focus_notes' and policyname='Focus notes private read') then
    create policy "Focus notes private read" on public.brian_focus_notes
      for select to authenticated using ((select auth.uid())=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='brian_focus_notes' and policyname='Focus notes private create') then
    create policy "Focus notes private create" on public.brian_focus_notes
      for insert to authenticated with check ((select auth.uid())=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='brian_focus_notes' and policyname='Focus notes private edit') then
    create policy "Focus notes private edit" on public.brian_focus_notes
      for update to authenticated using ((select auth.uid())=user_id)
      with check ((select auth.uid())=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='brian_focus_notes' and policyname='Focus notes private delete') then
    create policy "Focus notes private delete" on public.brian_focus_notes
      for delete to authenticated using ((select auth.uid())=user_id);
  end if;
end $$;
