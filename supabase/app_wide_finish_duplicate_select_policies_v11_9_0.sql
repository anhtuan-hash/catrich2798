
-- Brian app-wide hardening v11.9.0 · Sprint E3
-- Finish the remaining duplicate SELECT policy paths while preserving access.

do $$
declare
  t text;
  old_admin text;
  old_view text;
  new_name text;
begin
  for t,old_admin,old_view,new_name in
    values
      ('bes_extra_attendance_records','Extra attendance Admins read records','Extra attendance approved users read records','extra_attendance_records_read_v1190'),
      ('bes_extra_attendance_sessions','Extra attendance Admins read sessions','Extra attendance approved users read sessions','extra_attendance_sessions_read_v1190'),
      ('bes_extra_class_members','Extra attendance Admins read members','Extra attendance approved users read members','extra_class_members_read_v1190'),
      ('bes_extra_class_teachers','Extra attendance Admins read class teachers','Extra attendance approved users read class teachers','extra_class_teachers_read_v1190'),
      ('bes_extra_classes','Extra attendance Admins read classes','Extra attendance approved users read classes','extra_classes_read_v1190')
  loop
    execute format('drop policy if exists %I on public.%I',new_name,t);
    execute format(
      'create policy %I on public.%I as permissive for select to authenticated using (can_read_extra_class_attendance() or can_view_extra_class_attendance())',
      new_name,t
    );
    execute format('drop policy if exists %I on public.%I',old_admin,t);
    execute format('drop policy if exists %I on public.%I',old_view,t);
  end loop;
end $$;

drop policy if exists "Public can read published weekly practice" on public.weekly_practice_items;
drop policy if exists "Publishers can read all weekly practice" on public.weekly_practice_items;
drop policy if exists weekly_practice_anon_read_v1190 on public.weekly_practice_items;
drop policy if exists weekly_practice_authenticated_read_v1190 on public.weekly_practice_items;

create policy weekly_practice_anon_read_v1190
on public.weekly_practice_items
as permissive
for select
to anon
using (status='published');

create policy weekly_practice_authenticated_read_v1190
on public.weekly_practice_items
as permissive
for select
to authenticated
using (status='published' or can_publish_department());

-- These helpers are no longer needed by anonymous RLS paths.
revoke execute on function public.can_read_extra_class_attendance() from public;
revoke execute on function public.can_read_extra_class_attendance() from anon;
grant execute on function public.can_read_extra_class_attendance() to authenticated;
grant execute on function public.can_read_extra_class_attendance() to service_role;

revoke execute on function public.can_publish_department() from public;
revoke execute on function public.can_publish_department() from anon;
grant execute on function public.can_publish_department() to authenticated;
grant execute on function public.can_publish_department() to service_role;
