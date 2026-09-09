-- 2026-09-09: optional assigned-teacher/time-window enforcement for Attendance.
-- Defaults OFF so existing attendance behavior is unchanged until an Admin enables it.
-- Admins and users with attendance:report bypass the schedule restriction.

create schema if not exists private;

create table if not exists public.bes_attendance_access_settings (
  id smallint primary key default 1 check (id = 1),
  enforce_teacher_schedule boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.bes_attendance_access_settings (id, enforce_teacher_schedule)
values (1, false)
on conflict (id) do nothing;

alter table public.bes_attendance_access_settings enable row level security;
revoke all on table public.bes_attendance_access_settings from anon, authenticated;

create or replace function private.bes_parse_attendance_time_range(p_value text)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_text text := lower(trim(coalesce(p_value, '')));
  v_match text[];
  v_start_hour integer;
  v_start_minute integer;
  v_end_hour integer;
  v_end_minute integer;
  v_start integer;
  v_end integer;
begin
  if v_text = '' then return null; end if;
  v_text := replace(replace(replace(v_text, '–', '-'), '—', '-'), '−', '-');
  v_text := regexp_replace(v_text, '[[:space:]]+(đến|den|to)[[:space:]]+', '-', 'gi');
  v_match := regexp_match(
    v_text,
    '^([0-9]{1,2})[[:space:]]*([:hg])?[[:space:]]*([0-9]{0,2})[[:space:]]*-[[:space:]]*([0-9]{1,2})[[:space:]]*([:hg])?[[:space:]]*([0-9]{0,2})$',
    'i'
  );
  if v_match is null then return null; end if;

  v_start_hour := v_match[1]::integer;
  v_start_minute := case when coalesce(v_match[3], '') = '' then 0 else v_match[3]::integer end;
  v_end_hour := v_match[4]::integer;
  v_end_minute := case when coalesce(v_match[6], '') = '' then 0 else v_match[6]::integer end;

  if v_start_hour not between 0 and 23
     or v_end_hour not between 0 and 23
     or v_start_minute not between 0 and 59
     or v_end_minute not between 0 and 59 then
    return null;
  end if;

  v_start := v_start_hour * 60 + v_start_minute;
  v_end := v_end_hour * 60 + v_end_minute;
  return jsonb_build_object(
    'start_minute', v_start,
    'end_minute', v_end,
    'overnight', v_end < v_start
  );
exception when others then
  return null;
end;
$$;

create or replace function private.bes_attendance_access_decision(
  p_class_id uuid,
  p_attendance_date date,
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
  v_is_admin boolean := false;
  v_has_report boolean := false;
  v_is_assigned boolean := false;
  v_selected_teacher text := lower(trim(coalesce(p_teacher_name, '')));
  v_window jsonb;
  v_start integer;
  v_end integer;
  v_local_now timestamp without time zone := coalesce(p_now, clock_timestamp()) at time zone 'Asia/Ho_Chi_Minh';
  v_clock_seconds integer;
  v_expected_date date;
  v_in_window boolean := false;
  v_day_allowed boolean := true;
  v_dow integer;
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

  select coalesce(s.enforce_teacher_schedule, false)
  into v_enforced
  from public.bes_attendance_access_settings s
  where s.id = 1;

  v_enforced := coalesce(v_enforced, false);
  if not v_enforced then
    return jsonb_build_object('allowed', true, 'reason', 'restriction_disabled', 'bypass', false);
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
      'time_range', coalesce(v_class.time_range, '')
    );
  end if;

  v_window := private.bes_parse_attendance_time_range(v_class.time_range);
  if v_window is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_time',
      'class_id', p_class_id,
      'time_range', coalesce(v_class.time_range, '')
    );
  end if;

  v_start := (v_window ->> 'start_minute')::integer;
  v_end := (v_window ->> 'end_minute')::integer;
  v_clock_seconds := floor(extract(epoch from v_local_now::time))::integer;
  v_expected_date := v_local_now::date;

  if v_end < v_start then
    if v_clock_seconds >= v_start * 60 then
      v_in_window := true;
      v_expected_date := v_local_now::date;
    elsif v_clock_seconds <= v_end * 60 then
      v_in_window := true;
      v_expected_date := (v_local_now::date - 1);
    end if;
  else
    v_in_window := v_clock_seconds >= v_start * 60
                   and v_clock_seconds <= v_end * 60;
  end if;

  if not v_in_window then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'outside_time',
      'class_id', p_class_id,
      'time_range', coalesce(v_class.time_range, ''),
      'expected_session_date', v_expected_date
    );
  end if;

  if p_attendance_date is null or p_attendance_date <> v_expected_date then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'wrong_session_date',
      'class_id', p_class_id,
      'time_range', coalesce(v_class.time_range, ''),
      'expected_session_date', v_expected_date
    );
  end if;

  if nullif(trim(coalesce(v_class.weekdays, '')), '') is not null then
    v_dow := extract(dow from p_attendance_date)::integer;
    select exists (
      select 1
      from unnest(string_to_array(v_class.weekdays, ',')) as token(value)
      where (
        lower(trim(token.value)) in ('cn', 'chu nhat', 'chủ nhật')
        and v_dow = 0
      ) or (
        trim(token.value) ~ '^[2-7]$'
        and trim(token.value)::integer - 1 = v_dow
      )
    )
    into v_day_allowed;
  end if;

  if not coalesce(v_day_allowed, true) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'off_schedule',
      'class_id', p_class_id,
      'time_range', coalesce(v_class.time_range, ''),
      'expected_session_date', v_expected_date
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'within_window',
    'bypass', false,
    'class_id', p_class_id,
    'time_range', coalesce(v_class.time_range, ''),
    'expected_session_date', v_expected_date
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

  select coalesce(s.enforce_teacher_schedule, false)
  into v_enabled
  from public.bes_attendance_access_settings s
  where s.id = 1;

  v_is_admin := lower(coalesce(v_profile.role, '')) in ('admin', 'administrator');
  v_has_report := coalesce(v_profile.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:report';

  return jsonb_build_object(
    'enforce_teacher_schedule', coalesce(v_enabled, false),
    'can_administer', v_is_admin,
    'bypass_schedule', v_is_admin or v_has_report,
    'server_now', clock_timestamp(),
    'time_zone', 'Asia/Ho_Chi_Minh'
  );
end;
$$;

create or replace function private.bes_set_attendance_time_restriction(p_enabled boolean)
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

  insert into public.bes_attendance_access_settings (
    id, enforce_teacher_schedule, updated_by, updated_at
  ) values (
    1, coalesce(p_enabled, false), v_uid, clock_timestamp()
  )
  on conflict (id) do update
  set enforce_teacher_schedule = excluded.enforce_teacher_schedule,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;

  return private.bes_attendance_settings_snapshot();
end;
$$;

revoke all on function private.bes_attendance_access_decision(uuid,date,text,timestamptz) from public;
revoke all on function private.bes_attendance_settings_snapshot() from public;
revoke all on function private.bes_set_attendance_time_restriction(boolean) from public;
grant usage on schema private to authenticated;
grant execute on function private.bes_attendance_access_decision(uuid,date,text,timestamptz) to authenticated;
grant execute on function private.bes_attendance_settings_snapshot() to authenticated;
grant execute on function private.bes_set_attendance_time_restriction(boolean) to authenticated;

create or replace function public.bes_can_operate_extra_class_attendance(
  p_class_id uuid,
  p_attendance_date date,
  p_teacher_name text default null,
  p_now timestamptz default clock_timestamp()
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select coalesce(
    (private.bes_attendance_access_decision(p_class_id, p_attendance_date, p_teacher_name, p_now) ->> 'allowed')::boolean,
    false
  );
$$;

create or replace function public.bes_get_extra_class_attendance_access(
  p_class_id uuid,
  p_attendance_date date,
  p_teacher_name text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.bes_attendance_access_decision(p_class_id, p_attendance_date, p_teacher_name, clock_timestamp());
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
      v_session.attendance_date,
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

create or replace function public.bes_admin_set_attendance_time_restriction(p_enabled boolean)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.bes_set_attendance_time_restriction(p_enabled);
$$;

revoke all on function public.bes_can_operate_extra_class_attendance(uuid,date,text,timestamptz) from public;
revoke all on function public.bes_can_operate_extra_class_attendance(uuid,date,text,timestamptz) from anon;
revoke all on function public.bes_get_extra_class_attendance_access(uuid,date,text) from public;
revoke all on function public.bes_get_extra_class_attendance_access(uuid,date,text) from anon;
revoke all on function public.bes_can_operate_extra_attendance_session(uuid,timestamptz) from public;
revoke all on function public.bes_can_operate_extra_attendance_session(uuid,timestamptz) from anon;
revoke all on function public.bes_get_attendance_access_settings() from public;
revoke all on function public.bes_get_attendance_access_settings() from anon;
revoke all on function public.bes_admin_set_attendance_time_restriction(boolean) from public;
revoke all on function public.bes_admin_set_attendance_time_restriction(boolean) from anon;

grant execute on function public.bes_can_operate_extra_class_attendance(uuid,date,text,timestamptz) to authenticated;
grant execute on function public.bes_get_extra_class_attendance_access(uuid,date,text) to authenticated;
grant execute on function public.bes_can_operate_extra_attendance_session(uuid,timestamptz) to authenticated;
grant execute on function public.bes_get_attendance_access_settings() to authenticated;
grant execute on function public.bes_admin_set_attendance_time_restriction(boolean) to authenticated;

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
      'public.bes_can_operate_extra_class_attendance(p_class_id, p_attendance_date, p_teacher_name, clock_timestamp())'
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
      'public.bes_can_operate_extra_class_attendance(p_class_id, p_attendance_date, null, clock_timestamp())'
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
  'Global Admin toggle for assigned-teacher attendance schedule enforcement. Defaults OFF for backwards compatibility.';
