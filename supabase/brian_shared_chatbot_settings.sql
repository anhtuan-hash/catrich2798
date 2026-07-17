-- Brian English Studio: shared independent chatbot configuration
-- Run once in Supabase SQL Editor.

create table if not exists public.independent_chatbot_settings (
  id text primary key default 'default' check (id = 'default'),
  chatbot_url text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.independent_chatbot_settings enable row level security;

drop policy if exists "authenticated users can read independent chatbot settings" on public.independent_chatbot_settings;
create policy "authenticated users can read independent chatbot settings"
on public.independent_chatbot_settings
for select
to authenticated
using (true);

drop policy if exists "admins can insert independent chatbot settings" on public.independent_chatbot_settings;
create policy "admins can insert independent chatbot settings"
on public.independent_chatbot_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
      and profile.approved = true
  )
);

drop policy if exists "admins can update independent chatbot settings" on public.independent_chatbot_settings;
create policy "admins can update independent chatbot settings"
on public.independent_chatbot_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
      and profile.approved = true
  )
)
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
      and profile.approved = true
  )
);

drop policy if exists "admins can delete independent chatbot settings" on public.independent_chatbot_settings;
create policy "admins can delete independent chatbot settings"
on public.independent_chatbot_settings
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
      and profile.approved = true
  )
);

grant select on public.independent_chatbot_settings to authenticated;
grant insert, update, delete on public.independent_chatbot_settings to authenticated;

insert into public.independent_chatbot_settings (id, chatbot_url)
values ('default', '')
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
    alter publication supabase_realtime add table public.independent_chatbot_settings;
  end if;
end
$$;
