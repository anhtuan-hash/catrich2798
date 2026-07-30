-- Brian English Studio — low-risk Supabase egress hardening v3
-- 1) New weekly-practice proofs prefer WebP while legacy PNG remains readable.
-- 2) School-wide Homeroom statistics are aggregated inside Postgres instead of
--    transferring every complete workspace JSON payload to the Admin browser.

update storage.buckets
set public = false,
    file_size_limit = 3145728,
    allowed_mime_types = array['image/webp', 'image/png']
where id = 'weekly-practice-proofs';

comment on column public.weekly_practice_results.proof_path is
  'Private WebP completion proof (PNG remains supported for legacy/browser fallback) in weekly-practice-proofs.';

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
    coalesce((
      select sum(
        case when jsonb_typeof(day_rows.value) = 'object' then jsonb_object_length(day_rows.value) else 0 end
      )
      from jsonb_each(
        case
          when jsonb_typeof(workspace.payload -> 'attendance') = 'object' then workspace.payload -> 'attendance'
          else '{}'::jsonb
        end
      ) as day_rows
    ), 0)::bigint as attendance_count,
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
  'Compact Admin Homeroom statistics. Full workspace payload remains private and is not returned.';
