-- English Hub: shared AI website launcher configuration
-- Run this file once in Supabase SQL Editor for the Production project.
-- Safe to run repeatedly.

create table if not exists public.ai_website_settings (
  workspace_key text primary key default 'english-hub',
  tools jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_website_settings_tools_array
    check (jsonb_typeof(tools) = 'array')
);

comment on table public.ai_website_settings is
  'Shared list of external AI websites shown inside the English Hub AI drawer.';

alter table public.ai_website_settings enable row level security;

drop policy if exists "Approved users can read AI website settings" on public.ai_website_settings;
create policy "Approved users can read AI website settings"
  on public.ai_website_settings
  for select
  to authenticated
  using (public.is_approved_profile() or public.can_publish_department());

drop policy if exists "Department publishers can insert AI website settings" on public.ai_website_settings;
create policy "Department publishers can insert AI website settings"
  on public.ai_website_settings
  for insert
  to authenticated
  with check (public.can_publish_department());

drop policy if exists "Department publishers can update AI website settings" on public.ai_website_settings;
create policy "Department publishers can update AI website settings"
  on public.ai_website_settings
  for update
  to authenticated
  using (public.can_publish_department())
  with check (public.can_publish_department());

drop policy if exists "Department publishers can delete AI website settings" on public.ai_website_settings;
create policy "Department publishers can delete AI website settings"
  on public.ai_website_settings
  for delete
  to authenticated
  using (public.can_publish_department());

grant select, insert, update, delete on public.ai_website_settings to authenticated;

insert into public.ai_website_settings (workspace_key, tools)
values ('english-hub', '[]'::jsonb)
on conflict (workspace_key) do nothing;

-- Enable Realtime without failing when the table has already been added.
do $$
begin
  alter publication supabase_realtime add table public.ai_website_settings;
exception
  when duplicate_object then null;
end $$;

-- Remove the temporary system record used by the previous Work Hub fallback.
delete from public.work_hub_items
where source_module = 'english-hub-ai-websites';
