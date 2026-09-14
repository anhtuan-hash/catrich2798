-- Brian English — read-only Attendance access for every approved authenticated account.
--
-- This migration intentionally widens SELECT access only. Existing write RPCs
-- and mutation RLS policies remain unchanged, so attendance operations still
-- require the permissions/roles enforced by the existing backend helpers.

create or replace function public.can_view_extra_class_attendance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.approved = true
    );
$$;

revoke all on function public.can_view_extra_class_attendance() from public;
grant execute on function public.can_view_extra_class_attendance() to authenticated;

-- Keep the existing admin/operator SELECT policies in place and add a second,
-- read-only path. PostgreSQL permissive RLS policies are OR-combined, so this
-- opens visibility to approved accounts without altering mutation policies.

drop policy if exists "Extra attendance approved users read classes" on public.bes_extra_classes;
create policy "Extra attendance approved users read classes"
  on public.bes_extra_classes for select
  to authenticated
  using (public.can_view_extra_class_attendance());

drop policy if exists "Extra attendance approved users read members" on public.bes_extra_class_members;
create policy "Extra attendance approved users read members"
  on public.bes_extra_class_members for select
  to authenticated
  using (public.can_view_extra_class_attendance());

drop policy if exists "Extra attendance approved users read class teachers" on public.bes_extra_class_teachers;
create policy "Extra attendance approved users read class teachers"
  on public.bes_extra_class_teachers for select
  to authenticated
  using (public.can_view_extra_class_attendance());

drop policy if exists "Extra attendance approved users read sessions" on public.bes_extra_attendance_sessions;
create policy "Extra attendance approved users read sessions"
  on public.bes_extra_attendance_sessions for select
  to authenticated
  using (public.can_view_extra_class_attendance());

drop policy if exists "Extra attendance approved users read records" on public.bes_extra_attendance_records;
create policy "Extra attendance approved users read records"
  on public.bes_extra_attendance_records for select
  to authenticated
  using (public.can_view_extra_class_attendance());
