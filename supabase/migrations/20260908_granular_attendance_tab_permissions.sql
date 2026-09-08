-- 2026-09-08: split Attendance into five explicit per-tab permissions.
-- Admins always keep all access. Legacy route:attendance grants are expanded to all five tabs.

-- Backfill the previous coarse Attendance grant without changing unrelated permissions.
update public.profiles p
set permissions = jsonb_set(
  coalesce(p.permissions, '{"mode":"all","allowed":[]}'::jsonb),
  '{allowed}',
  (
    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    from (
      select distinct value
      from jsonb_array_elements_text(
        (coalesce(p.permissions -> 'allowed', '[]'::jsonb) - 'route:attendance')
        || '["attendance:quick","attendance:calendar","attendance:manage","attendance:history","attendance:report"]'::jsonb
      ) as expanded(value)
    ) deduped
  ),
  true
)
where coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance';

create or replace function public.can_read_extra_class_attendance()
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
      and p.approved = true
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ?| array[
          'attendance:quick', 'attendance:calendar', 'attendance:manage', 'attendance:history', 'attendance:report'
        ]
      )
  );
$$;

create or replace function public.can_take_extra_class_attendance()
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
      and p.approved = true
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:quick'
      )
  );
$$;

create or replace function public.can_manage_extra_class_roster()
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
      and p.approved = true
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:manage'
      )
  );
$$;

-- Compatibility helper used by existing read policies/callers.
create or replace function public.can_manage_extra_class_attendance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_read_extra_class_attendance();
$$;

revoke all on function public.can_read_extra_class_attendance() from public;
revoke all on function public.can_take_extra_class_attendance() from public;
revoke all on function public.can_manage_extra_class_roster() from public;
revoke all on function public.can_manage_extra_class_attendance() from public;
grant execute on function public.can_read_extra_class_attendance() to authenticated;
grant execute on function public.can_take_extra_class_attendance() to authenticated;
grant execute on function public.can_manage_extra_class_roster() to authenticated;
grant execute on function public.can_manage_extra_class_attendance() to authenticated;

-- Read access is shared by the five Attendance surfaces because they consume the same class/session tables.
drop policy if exists "Extra attendance Admins read classes" on public.bes_extra_classes;
create policy "Extra attendance Admins read classes" on public.bes_extra_classes for select using (public.can_read_extra_class_attendance());
drop policy if exists "Extra attendance Admins read members" on public.bes_extra_class_members;
create policy "Extra attendance Admins read members" on public.bes_extra_class_members for select using (public.can_read_extra_class_attendance());
drop policy if exists "Extra attendance Admins read class teachers" on public.bes_extra_class_teachers;
create policy "Extra attendance Admins read class teachers" on public.bes_extra_class_teachers for select using (public.can_read_extra_class_attendance());
drop policy if exists "Extra attendance Admins read sessions" on public.bes_extra_attendance_sessions;
create policy "Extra attendance Admins read sessions" on public.bes_extra_attendance_sessions for select using (public.can_read_extra_class_attendance());
drop policy if exists "Extra attendance Admins read records" on public.bes_extra_attendance_records;
create policy "Extra attendance Admins read records" on public.bes_extra_attendance_records for select using (public.can_read_extra_class_attendance());

-- Direct roster writes belong only to the Quản lý lớp permission.
drop policy if exists "Extra attendance Admins insert classes" on public.bes_extra_classes;
create policy "Extra attendance Admins insert classes" on public.bes_extra_classes for insert
  with check (public.can_manage_extra_class_roster() and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "Extra attendance Admins update classes" on public.bes_extra_classes;
create policy "Extra attendance Admins update classes" on public.bes_extra_classes for update
  using (public.can_manage_extra_class_roster())
  with check (public.can_manage_extra_class_roster() and updated_by = auth.uid());
drop policy if exists "Extra attendance Admins insert members" on public.bes_extra_class_members;
create policy "Extra attendance Admins insert members" on public.bes_extra_class_members for insert
  with check (public.can_manage_extra_class_roster() and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "Extra attendance Admins update members" on public.bes_extra_class_members;
create policy "Extra attendance Admins update members" on public.bes_extra_class_members for update
  using (public.can_manage_extra_class_roster())
  with check (
    public.can_manage_extra_class_roster()
    and updated_by = auth.uid()
    and (active = true or (left_at is not null and removed_by = auth.uid()))
  );

-- Preserve the existing RPC bodies exactly, replacing only their authorization gate.
do $granular$
declare
  v_definition text;
begin
  -- bes_confirm_extra_class_attendance -> can_take_extra_class_attendance
  select pg_get_functiondef('public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text)'::regprocedure) into v_definition;
  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected confirm attendance function body'; end if;
  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_take_extra_class_attendance()');

  -- bes_cancel_extra_class_session -> can_take_extra_class_attendance
  select pg_get_functiondef('public.bes_cancel_extra_class_session(uuid,date,text,text,text)'::regprocedure) into v_definition;
  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected cancel attendance function body'; end if;
  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_take_extra_class_attendance()');

  -- bes_delete_extra_attendance_session -> can_take_extra_class_attendance
  select pg_get_functiondef('public.bes_delete_extra_attendance_session(uuid)'::regprocedure) into v_definition;
  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected delete attendance function body'; end if;
  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_take_extra_class_attendance()');

  -- bes_add_extra_class_teacher -> can_manage_extra_class_roster
  select pg_get_functiondef('public.bes_add_extra_class_teacher(uuid,text)'::regprocedure) into v_definition;
  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected add teacher function body'; end if;
  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_manage_extra_class_roster()');

  -- bes_create_extra_class_with_teachers -> can_manage_extra_class_roster
  select pg_get_functiondef('public.bes_create_extra_class_with_teachers(text,text,text,text,text,text,text[])'::regprocedure) into v_definition;
  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected create class function body'; end if;
  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_manage_extra_class_roster()');

  -- bes_delete_extra_class -> can_manage_extra_class_roster
  select pg_get_functiondef('public.bes_delete_extra_class(uuid)'::regprocedure) into v_definition;
  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected delete class function body'; end if;
  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_manage_extra_class_roster()');

  -- Teacher directory is read-only and can be used by any granted Attendance surface.
  select pg_get_functiondef('public.bes_extra_attendance_list_teachers()'::regprocedure) into v_definition;
  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected attendance teacher list function body'; end if;
  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_read_extra_class_attendance()');
end
$granular$;

-- Keep SECURITY DEFINER Attendance RPCs unavailable to anonymous callers.
revoke all on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) from public;
revoke all on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) from public;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from public;
revoke all on function public.bes_add_extra_class_teacher(uuid,text) from public;
revoke all on function public.bes_create_extra_class_with_teachers(text,text,text,text,text,text,text[]) from public;
revoke all on function public.bes_delete_extra_class(uuid) from public;
revoke all on function public.bes_extra_attendance_list_teachers() from public;
grant execute on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) to authenticated;
grant execute on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) to authenticated;
grant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;
grant execute on function public.bes_add_extra_class_teacher(uuid,text) to authenticated;
grant execute on function public.bes_create_extra_class_with_teachers(text,text,text,text,text,text,text[]) to authenticated;
grant execute on function public.bes_delete_extra_class(uuid) to authenticated;
grant execute on function public.bes_extra_attendance_list_teachers() to authenticated;
