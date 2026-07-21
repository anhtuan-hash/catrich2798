-- Brian English Studio V11.6.7
-- Shared Chatbot Drawer settings managed by approved TTCM/Admin.
-- Run once in Supabase SQL Editor.

begin;

create table if not exists public.independent_chatbot_settings (
  id text primary key default 'global',
  chatbots jsonb not null default
    '[{"id":"notrack-ai","name":"NoTrack AI","url":"https://notrack.ai/","enabled":true,"isDefault":true,"sortOrder":0}]'::jsonb,
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint independent_chatbot_settings_chatbots_array
    check (
      case
        when jsonb_typeof(chatbots) = 'array'
          then jsonb_array_length(chatbots) between 1 and 20
        else false
      end
    )
);

comment on table public.independent_chatbot_settings is
  'Shared external chatbot websites used by the global Brian Chatbot Drawer.';

create or replace function public.can_manage_shared_chatbots()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved is true
      and lower(coalesce(p.role, '')) in (
        'admin',
        'administrator',
        'department_head',
        'department-head',
        'department leader',
        'department_leader',
        'subject_leader',
        'subject leader',
        'ttcm',
        'leader',
        'head',
        'manager',
        'to_truong',
        'tổ trưởng'
      )
  );
$$;

revoke all on function public.can_manage_shared_chatbots() from public;
grant execute on function public.can_manage_shared_chatbots() to authenticated;

alter table public.independent_chatbot_settings enable row level security;

drop policy if exists "shared chatbots authenticated read" on public.independent_chatbot_settings;
create policy "shared chatbots authenticated read"
on public.independent_chatbot_settings
for select
to authenticated
using (true);

drop policy if exists "shared chatbots approved leaders insert" on public.independent_chatbot_settings;
create policy "shared chatbots approved leaders insert"
on public.independent_chatbot_settings
for insert
to authenticated
with check (public.can_manage_shared_chatbots());

drop policy if exists "shared chatbots approved leaders update" on public.independent_chatbot_settings;
create policy "shared chatbots approved leaders update"
on public.independent_chatbot_settings
for update
to authenticated
using (public.can_manage_shared_chatbots())
with check (public.can_manage_shared_chatbots());

drop policy if exists "shared chatbots approved leaders delete" on public.independent_chatbot_settings;
create policy "shared chatbots approved leaders delete"
on public.independent_chatbot_settings
for delete
to authenticated
using (public.can_manage_shared_chatbots());

insert into public.independent_chatbot_settings (id)
values ('global')
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'independent_chatbot_settings'
  ) then
    alter publication supabase_realtime
      add table public.independent_chatbot_settings;
  end if;
end
$$;

grant select on public.independent_chatbot_settings to authenticated;
grant insert, update, delete on public.independent_chatbot_settings to authenticated;

commit;
