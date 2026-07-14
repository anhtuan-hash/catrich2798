-- Brian English Studio V10.58
-- Run this migration in Supabase SQL Editor after the main schema.

do $$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles
    add constraint profiles_role_check
    check (role in (
      'teacher', 'admin', 'ttcm', 'to_truong', 'tổ trưởng',
      'department_leader', 'department leader',
      'subject_leader', 'subject leader', 'leader'
    ));
exception when duplicate_object then null;
end $$;

create table if not exists public.custom_game_platforms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_email text,
  owner_name text,
  label text not null,
  icon text not null default '🎮',
  home text not null,
  color text not null default 'violet',
  embed_mode text not null default 'iframe' check (embed_mode in ('iframe', 'newtab')),
  status text not null default 'private' check (status in ('private', 'pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_game_platforms_status_idx on public.custom_game_platforms (status, created_at desc);
create index if not exists custom_game_platforms_owner_idx on public.custom_game_platforms (owner_id, created_at desc);
alter table public.custom_game_platforms enable row level security;

drop policy if exists "Custom games visible to approved users" on public.custom_game_platforms;
create policy "Custom games visible to approved users" on public.custom_game_platforms for select
using (status = 'approved' or auth.uid() = owner_id or public.can_publish_department());

drop policy if exists "Teachers can create own custom games" on public.custom_game_platforms;
create policy "Teachers can create own custom games" on public.custom_game_platforms for insert
with check (
  auth.uid() = owner_id and public.is_approved_profile()
  and (status in ('private', 'pending') or public.can_publish_department())
);

drop policy if exists "Teachers can update own unapproved custom games" on public.custom_game_platforms;
create policy "Teachers can update own unapproved custom games" on public.custom_game_platforms for update
using (auth.uid() = owner_id and status <> 'approved')
with check (auth.uid() = owner_id and status in ('private', 'pending'));

drop policy if exists "Department leaders can review custom games" on public.custom_game_platforms;
create policy "Department leaders can review custom games" on public.custom_game_platforms for update
using (public.can_publish_department()) with check (public.can_publish_department());

drop policy if exists "Teachers can delete own unapproved custom games" on public.custom_game_platforms;
create policy "Teachers can delete own unapproved custom games" on public.custom_game_platforms for delete
using ((auth.uid() = owner_id and status <> 'approved') or public.can_publish_department());
