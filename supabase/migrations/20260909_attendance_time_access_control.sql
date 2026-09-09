-- 2026-09-09: optional Admin-configured global attendance time window.
-- Baseline is the exact PR #704 tree. This migration intentionally does NOT
-- hard-lock by class weekdays/time_range (PR #705 behavior stays rolled back).
-- Toggle defaults OFF. Admin and attendance:report users bypass the window.

create schema if not exists private;

create table if not exists public.bes_attendance_access_settings (
  id smallint primary key default 1 check (id = 1),
  enforce_teacher_time_window boolean not null default false,
  teacher_start_time time without time zone not null default time '16:40',
  teacher_end_time time without time zone not null default time '17:15',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint bes_attendance_access_distinct_times check (teacher_start_time <> teacher_end_time)
);

insert into public.bes_attendance_access_settings (
  id,
  enforce_teacher_time_window,
  teacher_start_time,
  teacher_end_time
)
values (1, false, time '16:40', time '17:15')
on conflict (id) do nothing;

alter table public.bes_attendance_access_settings enable row level security;
revoke all on table public.bes_attendance_access_settings from anon, authenticated;

create or replace function private.bes_attendance_access_decision(
  p_class_id uuid,
  p_teacher_name text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_class public.bes_extra_classes%rowtype;
  v_enforced boolean := false;
  v_start time without time zone := time '16:40';
  v_end time without time zone := time '17:15';
  v_local_time time without time zone := (coalesce(p_now, clock_timestamp()) at time zone 'Asia/Ho_Chi_Minh')::time;
  v_is_admin boolean := false;
  v_has_report boolean := false;
  v_is_assigned boolean := false;
  v_selected_teacher text := lower(trim(coalesce(p_teacher_name, '')));
  v_in_window boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_uid
    and p.approved = true;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'profile_not_approved');
  end if;

  v_is_admin := lower(coalesce(v_profile.role, '')) in ('admin', 'administrator');
  v_has_report := coalesce(v_profile.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:report';

  if v_is_admin then
    return jsonb_build_object('allowed', true, 'reason', 'admin_bypass', 'bypass', true);
  end if;

  if v_has_report then
    return jsonb_build_object('allowed', true, 'reason', 'report_bypass', 'bypass', true);
  end if;

  if not public.can_take_extra_class_attendance() then
    return jsonb_build_object('allowed', false, 'reason', 'missing_permission');
  end if;

  select
    coalesce(s.enforce_teacher_time_window, false),
    s.teacher_start_time,
    s.teacher_end_time
  into v_enforced, v_start, v_end
  from public.bes_attendance_access_settings s
  where s.id = 1;

  v_enforced := coalesce(v_enforced, false);
  v_start := coalesce(v_start, time '16:40');
  v_end := coalesce(v_end, time '17:15');

  if not v_enforced then
    return jsonb_build_object(
      'allowed', true,
      'reason', 'restriction_disabled',
      'bypass', false,
      'window_start', to_char(v_start, 'HH24:MI'),
      'window_end', to_char(v_end, 'HH24:MI')
    );
  end if;

  select *
  into v_class
  from public.bes_extra_classes c
  where c.id = p_class_id
    and c.active = true;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'class_not_found');
  end if;

  select exists (
    select 1
    from public.bes_extra_class_teachers t
    where t.class_id = p_class_id
      and (
        t.teacher_id = v_uid
        or (
          nullif(trim(coalesce(t.teacher_email, '')), '') is not null
          and lower(trim(t.teacher_email)) = lower(trim(coalesce(v_profile.email, '')))
        )
        or lower(trim(t.teacher_name)) = lower(trim(coalesce(v_profile.full_name, '')))
      )
      and (
        v_selected_teacher = ''
        or lower(trim(t.teacher_name)) = v_selected_teacher
      )
  )
  into v_is_assigned;

  if not v_is_assigned then
    select exists (
      select 1
      from regexp_split_to_table(coalesce(v_class.teacher_name, ''), '\s*,\s*') as fallback_teacher(name)
      where trim(fallback_teacher.name) <> ''
        and lower(trim(fallback_teacher.name)) = lower(trim(coalesce(v_profile.full_name, '')))
        and (
          v_selected_teacher = ''
          or lower(trim(fallback_teacher.name)) = v_selected_teacher
        )
    )
    into v_is_assigned;
  end if;

  if not v_is_assigned
     and (
       v_class.teacher_id = v_uid
       or (
         nullif(trim(coalesce(v_class.teacher_email, '')), '') is not null
         and lower(trim(v_class.teacher_email)) = lower(trim(coalesce(v_profile.email, '')))
       )
     )
     and (
       v_selected_teacher = ''
       or lower(trim(v_class.teacher_name)) = v_selected_teacher
     ) then
    v_is_assigned := true;
  end if;

  if not v_is_assigned then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'unassigned',
      'class_id', p_class_id,
      'window_start', to_char(v_start, 'HH24:MI'),
      'window_end', to_char(v_end, 'HH24:MI')
    );
  end if;

  if v_start = v_end then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_time',
      'class_id', p_class_id
    );
  end if;

  if v_end > v_start then
    v_in_window := v_local_time >= v_start and v_local_time <= v_end;
  else
    -- Overnight window, e.g. 22:00 -> 01:30.
    v_in_window := v_local_time >= v_start or v_local_time <= v_end;
  end if;

  if not v_in_window then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'outside_time',
      'class_id', p_class_id,
      'window_start', to_char(v_start, 'HH24:MI'),
      'window_end', to_char(v_end, 'HH24:MI')
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'within_window',
    'bypass', false,
    'class_id', p_class_id,
    'window_start', to_char(v_start, 'HH24:MI'),
    'window_end', to_char(v_end, 'HH24:MI')
  );
end;
$$;

create or replace function private.bes_attendance_settings_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_enabled boolean := false;
  v_start time without time zone := time '16:40';
  v_end time without time zone := time '17:15';
  v_is_admin boolean := false;
  v_has_report boolean := false;
begin
  if v_uid is null then
    raise exception 'Bạn chưa đăng nhập.' using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_uid
    and p.approved = true;

  if not found or not public.can_read_extra_class_attendance() then
    raise exception 'Bạn không có quyền truy cập phân hệ điểm danh.' using errcode = '42501';
  end if;

  select
    coalesce(s.enforce_teacher_time_window, false),
    s.teacher_start_time,
    s.teacher_end_time
  into v_enabled, v_start, v_end
  from public.bes_attendance_access_settings s
  where s.id = 1;

  v_start := coalesce(v_start, time '16:40');
  v_end := coalesce(v_end, time '17:15');
  v_is_admin := lower(coalesce(v_profile.role, '')) in ('admin', 'administrator');
  v_has_report := coalesce(v_profile.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:report';

  return jsonb_build_object(
    'enforce_teacher_time_window', coalesce(v_enabled, false),
    'teacher_start_time', to_char(v_start, 'HH24:MI'),
    'teacher_end_time', to_char(v_end, 'HH24:MI'),
    'can_administer', v_is_admin,
    'bypass_time_window', v_is_admin or v_has_report,
    'server_now', clock_timestamp(),
    'time_zone', 'Asia/Ho_Chi_Minh'
  );
end;
$$;

create or replace function private.bes_set_attendance_time_restriction(
  p_enabled boolean,
  p_start_time time without time zone,
  p_end_time time without time zone
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.approved = true
      and lower(coalesce(p.role, '')) in ('admin', 'administrator')
  ) then
    raise exception 'Chỉ Admin được thay đổi giới hạn giờ điểm danh.' using errcode = '42501';
  end if;

  if p_start_time is null or p_end_time is null or p_start_time = p_end_time then
    raise exception 'Giờ bắt đầu và giờ kết thúc phải hợp lệ và khác nhau.' using errcode = '22023';
  end if;

  insert into public.bes_attendance_access_settings (
    id,
    enforce_teacher_time_window,
    teacher_start_time,
    teacher_end_time,
    updated_by,
    updated_at
  ) values (
    1,
    coalesce(p_enabled, false),
    p_start_time,
    p_end_time,
    v_uid,
    clock_timestamp()
  )
  on conflict (id) do update
  set enforce_teacher_time_window = excluded.enforce_teacher_time_window,
      teacher_start_time = excluded.teacher_start_time,
      teacher_end_time = excluded.teacher_end_time,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;

  return private.bes_attendance_settings_snapshot();
end;
$$;

revoke all on function private.bes_attendance_access_decision(uuid,text,timestamptz) from public;
revoke all on function private.bes_attendance_settings_snapshot() from public;
revoke all on function private.bes_set_attendance_time_restriction(boolean,time without time zone,time without time zone) from public;
grant usage on schema private to authenticated;
grant execute on function private.bes_attendance_access_decision(uuid,text,timestamptz) to authenticated;
grant execute on function private.bes_attendance_settings_snapshot() to authenticated;
grant execute on function private.bes_set_attendance_time_restriction(boolean,time without time zone,time without time zone) to authenticated;

create or replace function public.bes_can_operate_extra_class_attendance(
  p_class_id uuid,
  p_teacher_name text default null,
  p_now timestamptz default clock_timestamp()
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select coalesce(
    (private.bes_attendance_access_decision(p_class_id, p_teacher_name, p_now) ->> 'allowed')::boolean,
    false
  );
$$;

create or replace function public.bes_get_extra_class_attendance_access(
  p_class_id uuid,
  p_teacher_name text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.bes_attendance_access_decision(p_class_id, p_teacher_name, clock_timestamp());
$$;

create or replace function public.bes_can_operate_extra_attendance_session(
  p_session_id uuid,
  p_now timestamptz default clock_timestamp()
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.bes_extra_attendance_sessions%rowtype;
begin
  select *
  into v_session
  from public.bes_extra_attendance_sessions s
  where s.id = p_session_id;

  if not found then return false; end if;

  return coalesce(
    (private.bes_attendance_access_decision(
      v_session.class_id,
      null,
      p_now
    ) ->> 'allowed')::boolean,
    false
  );
end;
$$;

create or replace function public.bes_get_attendance_access_settings()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.bes_attendance_settings_snapshot();
$$;

create or replace function public.bes_admin_set_attendance_time_restriction(
  p_enabled boolean,
  p_start_time time without time zone,
  p_end_time time without time zone
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.bes_set_attendance_time_restriction(p_enabled, p_start_time, p_end_time);
$$;

revoke all on function public.bes_can_operate_extra_class_attendance(uuid,text,timestamptz) from public;
revoke all on function public.bes_can_operate_extra_class_attendance(uuid,text,timestamptz) from anon;
revoke all on function public.bes_get_extra_class_attendance_access(uuid,text) from public;
revoke all on function public.bes_get_extra_class_attendance_access(uuid,text) from anon;
revoke all on function public.bes_can_operate_extra_attendance_session(uuid,timestamptz) from public;
revoke all on function public.bes_can_operate_extra_attendance_session(uuid,timestamptz) from anon;
revoke all on function public.bes_get_attendance_access_settings() from public;
revoke all on function public.bes_get_attendance_access_settings() from anon;
revoke all on function public.bes_admin_set_attendance_time_restriction(boolean,time without time zone,time without time zone) from public;
revoke all on function public.bes_admin_set_attendance_time_restriction(boolean,time without time zone,time without time zone) from anon;

grant execute on function public.bes_can_operate_extra_class_attendance(uuid,text,timestamptz) to authenticated;
grant execute on function public.bes_get_extra_class_attendance_access(uuid,text) to authenticated;
grant execute on function public.bes_can_operate_extra_attendance_session(uuid,timestamptz) to authenticated;
grant execute on function public.bes_get_attendance_access_settings() to authenticated;
grant execute on function public.bes_admin_set_attendance_time_restriction(boolean,time without time zone,time without time zone) to authenticated;

-- Patch only the existing PR #704 write gates. This does not introduce the
-- PR #705 class-schedule trigger or weekday hard-lock behavior.
do $attendance_time_gate$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text)'::regprocedure)
  into v_definition;
  if position('public.bes_can_operate_extra_class_attendance(' in v_definition) = 0 then
    if position('public.can_take_extra_class_attendance()' in v_definition) = 0 then
      raise exception 'Unexpected confirm attendance authorization gate';
    end if;
    execute replace(
      v_definition,
      'public.can_take_extra_class_attendance()',
      'public.bes_can_operate_extra_class_attendance(p_class_id, p_teacher_name, clock_timestamp())'
    );
  end if;

  select pg_get_functiondef('public.bes_cancel_extra_class_session(uuid,date,text,text,text)'::regprocedure)
  into v_definition;
  if position('public.bes_can_operate_extra_class_attendance(' in v_definition) = 0 then
    if position('public.can_take_extra_class_attendance()' in v_definition) = 0 then
      raise exception 'Unexpected cancel attendance authorization gate';
    end if;
    execute replace(
      v_definition,
      'public.can_take_extra_class_attendance()',
      'public.bes_can_operate_extra_class_attendance(p_class_id, null, clock_timestamp())'
    );
  end if;

  select pg_get_functiondef('public.bes_delete_extra_attendance_session(uuid)'::regprocedure)
  into v_definition;
  if position('public.bes_can_operate_extra_attendance_session(' in v_definition) = 0 then
    if position('public.can_take_extra_class_attendance()' in v_definition) = 0 then
      raise exception 'Unexpected delete attendance authorization gate';
    end if;
    execute replace(
      v_definition,
      'public.can_take_extra_class_attendance()',
      'public.bes_can_operate_extra_attendance_session(p_session_id, clock_timestamp())'
    );
  end if;
end
$attendance_time_gate$;

revoke all on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) from public;
revoke all on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) from anon;
revoke all on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) from public;
revoke all on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) from anon;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from public;
revoke all on function public.bes_delete_extra_attendance_session(uuid) from anon;
grant execute on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) to authenticated;
grant execute on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) to authenticated;
grant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;

comment on table public.bes_attendance_access_settings is
  'Admin-controlled global attendance window for assigned teachers. Defaults OFF; PR #704 behavior is preserved when disabled.';
