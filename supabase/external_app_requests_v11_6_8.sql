-- Brian English Studio V11.6.8
-- External website app approval policies.
-- Safe to run repeatedly in Supabase SQL Editor.

alter table public.permission_requests enable row level security;

drop policy if exists "Department publishers can read all permission requests" on public.permission_requests;
create policy "Department publishers can read all permission requests"
  on public.permission_requests
  for select
  to authenticated
  using (public.can_publish_department() or public.is_admin());

drop policy if exists "Department publishers can update all permission requests" on public.permission_requests;
create policy "Department publishers can update all permission requests"
  on public.permission_requests
  for update
  to authenticated
  using (public.can_publish_department() or public.is_admin())
  with check (public.can_publish_department() or public.is_admin());

grant select, insert, update on public.permission_requests to authenticated;
