-- Brian English Studio — custom app links with TTCM approval
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.custom_app_links (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 80),
  description text,
  url text not null check (url ~* '^https?://'),
  icon text not null default '↗',
  accent text not null default '#7C5CE7',
  status text not null default 'private' check (status in ('private', 'pending', 'approved', 'rejected')),
  owner_id uuid not null default auth.uid(),
  owner_email text,
  owner_name text,
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_app_links_status_idx on public.custom_app_links(status);
create index if not exists custom_app_links_owner_idx on public.custom_app_links(owner_id);
create index if not exists custom_app_links_created_idx on public.custom_app_links(created_at desc);

alter table public.custom_app_links enable row level security;

drop policy if exists "custom apps visible to owner leaders and teachers" on public.custom_app_links;
create policy "custom apps visible to owner leaders and teachers"
on public.custom_app_links
for select
to authenticated
using (
  status = 'approved'
  or owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'department-head', 'department_leader', 'ttcm', 'to_truong')
  )
);

drop policy if exists "teachers create own custom apps" on public.custom_app_links;
create policy "teachers create own custom apps"
on public.custom_app_links
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and status in ('private', 'pending')
);

drop policy if exists "leaders create shared custom apps" on public.custom_app_links;
create policy "leaders create shared custom apps"
on public.custom_app_links
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'department-head', 'department_leader', 'ttcm', 'to_truong')
  )
);

drop policy if exists "teachers update own unapproved custom apps" on public.custom_app_links;
create policy "teachers update own unapproved custom apps"
on public.custom_app_links
for update
to authenticated
using (
  owner_id = auth.uid()
  and status <> 'approved'
)
with check (
  owner_id = auth.uid()
  and status in ('private', 'pending', 'rejected')
);

drop policy if exists "leaders review all custom apps" on public.custom_app_links;
create policy "leaders review all custom apps"
on public.custom_app_links
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'department-head', 'department_leader', 'ttcm', 'to_truong')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'department-head', 'department_leader', 'ttcm', 'to_truong')
  )
);

drop policy if exists "owners delete unapproved custom apps" on public.custom_app_links;
create policy "owners delete unapproved custom apps"
on public.custom_app_links
for delete
to authenticated
using (
  (owner_id = auth.uid() and status <> 'approved')
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'department_head', 'department-head', 'department_leader', 'ttcm', 'to_truong')
  )
);

-- Realtime is optional; ignore duplicate publication errors when already enabled.
do $$
begin
  alter publication supabase_realtime add table public.custom_app_links;
exception
  when duplicate_object then null;
end $$;
