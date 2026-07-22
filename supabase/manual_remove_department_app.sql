-- One-time cleanup after removing the Tổ chuyên môn app.
-- IMPORTANT: delete the `department-evidence` bucket from Supabase Storage first.
-- Supabase Storage tables are read-only for direct SQL deletion; use the Dashboard or Storage API.
-- Back up any data you still need before running this script.

begin;

-- Remove storage policies tied only to the deleted app.
drop policy if exists "Users can upload their own department evidence" on storage.objects;
drop policy if exists "Users can read their own department evidence" on storage.objects;
drop policy if exists "Department publishers can read every evidence file" on storage.objects;
drop policy if exists "Approved users can read department request attachments" on storage.objects;
drop policy if exists "Users can update their own department evidence" on storage.objects;
drop policy if exists "Users can delete their own department evidence" on storage.objects;

-- Remove app tables. CASCADE also removes table-specific indexes and policies.
drop table if exists public.department_submissions cascade;
drop table if exists public.department_submission_requests cascade;
drop table if exists public.department_workspace_snapshots cascade;

-- Remove obsolete app permissions from existing profiles.
-- Keep `department:publish`, because retained apps still use it for TTCM approval workflows.
update public.profiles p
set permissions = jsonb_set(
  coalesce(p.permissions, '{"mode":"all","allowed":[]}'::jsonb),
  '{allowed}',
  coalesce(
    (
      select jsonb_agg(permission_id)
      from jsonb_array_elements_text(coalesce(p.permissions->'allowed', '[]'::jsonb)) as permission_id
      where permission_id not in (
        'tool:department-workspace',
        'department:dashboard',
        'department:plans',
        'department:meetings',
        'department:lesson-study',
        'department:observations',
        'department:assessment',
        'department:tasks',
        'department:documents',
        'department:submissions',
        'department:teacher-development',
        'department:student-activities',
        'department:reports',
        'department:policies'
      )
    ),
    '[]'::jsonb
  ),
  true
)
where jsonb_typeof(coalesce(p.permissions->'allowed', '[]'::jsonb)) = 'array';

commit;
