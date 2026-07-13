-- Optional cloud sync table for Brian English Studio V8.6 Teacher Operating System
-- Run this in Supabase SQL Editor if you want Teacher OS project vault items to sync across devices.

create table if not exists public.teacher_os_projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  tool_title text not null,
  title text not null,
  input text,
  output text,
  options jsonb default '{}'::jsonb,
  quality_score int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.teacher_os_projects enable row level security;

drop policy if exists teacher_os_select_own on public.teacher_os_projects;
create policy teacher_os_select_own
  on public.teacher_os_projects for select
  using (auth.uid() = user_id);

drop policy if exists teacher_os_insert_own on public.teacher_os_projects;
create policy teacher_os_insert_own
  on public.teacher_os_projects for insert
  with check (auth.uid() = user_id);

drop policy if exists teacher_os_update_own on public.teacher_os_projects;
create policy teacher_os_update_own
  on public.teacher_os_projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists teacher_os_delete_own on public.teacher_os_projects;
create policy teacher_os_delete_own
  on public.teacher_os_projects for delete
  using (auth.uid() = user_id);

create or replace function public.set_teacher_os_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_os_projects_updated_at on public.teacher_os_projects;
create trigger teacher_os_projects_updated_at
before update on public.teacher_os_projects
for each row execute function public.set_teacher_os_updated_at();
