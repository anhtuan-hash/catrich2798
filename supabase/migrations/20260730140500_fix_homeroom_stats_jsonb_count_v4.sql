-- Brian English Studio — repair Homeroom compact statistics v4
-- PostgreSQL does not provide jsonb_object_length(jsonb). Count keys through
-- jsonb_object_keys() so the compact RPC can be installed on Supabase Postgres.

create or replace function public.bes_homeroom_school_stats_v2()
returns table (
  owner_id uuid,
  owner_email text,
  workspace_id text,
  class_name text,
  school_year text,
  adviser_name text,
  student_count bigint,
  attendance_count bigint,
  notice_count integer,
  feedback_count integer,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    workspace.owner_id,
    workspace.owner_email,
    workspace.workspace_id,
    coalesce(nullif(workspace.class_name, ''), nullif(workspace.payload #>> '{classProfile,className}', ''), 'Chưa đặt tên') as class_name,
    coalesce(nullif(workspace.school_year, ''), workspace.payload #>> '{classProfile,schoolYear}', '') as school_year,
    coalesce(workspace.payload #>> '{classProfile,adviserName}', workspace.owner_email, '') as adviser_name,
    (
      select count(*)
      from jsonb_array_elements(
        case
          when jsonb_typeof(workspace.payload -> 'students') = 'array' then workspace.payload -> 'students'
          else '[]'::jsonb
        end
      ) as student(value)
      where student.value -> 'active' is distinct from 'false'::jsonb
    )::bigint as student_count,
    (
      select count(*)
      from jsonb_each(
        case
          when jsonb_typeof(workspace.payload -> 'attendance') = 'object' then workspace.payload -> 'attendance'
          else '{}'::jsonb
        end
      ) as day_rows(day_key, value)
      cross join lateral jsonb_object_keys(
        case
          when jsonb_typeof(day_rows.value) = 'object' then day_rows.value
          else '{}'::jsonb
        end
      ) as attendance_entry(student_key)
    )::bigint as attendance_count,
    (case
      when jsonb_typeof(workspace.payload -> 'announcements') = 'array' then jsonb_array_length(workspace.payload -> 'announcements')
      else 0
    end)::integer as notice_count,
    (case
      when jsonb_typeof(workspace.payload -> 'subjectFeedback') = 'array' then jsonb_array_length(workspace.payload -> 'subjectFeedback')
      else 0
    end)::integer as feedback_count,
    workspace.updated_at
  from public.bes_homeroom_workspaces as workspace
  where exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and lower(coalesce(profile.role, '')) = 'admin'
      and coalesce(profile.approved, false) = true
  )
  order by class_name, school_year, workspace.updated_at desc
  limit 200;
$$;

grant execute on function public.bes_homeroom_school_stats_v2() to authenticated;

comment on function public.bes_homeroom_school_stats_v2() is
  'Compact Admin Homeroom statistics using jsonb_object_keys for attendance counts.';
