-- Gradebook standalone seed V1
-- Copies only teaching/grade data from legacy Homeroom workspaces.
-- Safe to rerun: existing dedicated Gradebook rows are never overwritten.

do $$
begin
  if to_regclass('public.bes_homeroom_workspaces') is null then
    raise notice 'bes_homeroom_workspaces not found; nothing to migrate.';
    return;
  end if;

  insert into public.bes_gradebook_workspaces (
    owner_id,
    owner_email,
    workspace_id,
    class_name,
    school_year,
    grade,
    semester,
    class_type,
    status,
    archived_at,
    student_count,
    payload,
    migrated_from_homeroom,
    created_at,
    updated_at
  )
  select
    h.owner_id,
    coalesce(h.owner_email, ''),
    h.workspace_id,
    coalesce(nullif(h.class_name, ''), nullif(h.payload #>> '{classProfile,className}', ''), 'Lớp bộ môn'),
    coalesce(nullif(h.school_year, ''), nullif(h.payload #>> '{classProfile,schoolYear}', ''), ''),
    coalesce(nullif(h.payload #>> '{classProfile,grade}', ''), ''),
    coalesce(nullif(h.semester, ''), nullif(h.payload ->> 'semester', ''), 'Học kỳ I'),
    coalesce(nullif(h.payload #>> '{classProfile,classType}', ''), 'subject'),
    coalesce(nullif(h.status, ''), nullif(h.payload ->> 'status', ''), 'active'),
    h.archived_at,
    case
      when jsonb_typeof(h.payload -> 'students') = 'array'
        then jsonb_array_length(h.payload -> 'students')
      else 0
    end,
    jsonb_build_object(
      'id', h.workspace_id,
      'status', coalesce(nullif(h.status, ''), nullif(h.payload ->> 'status', ''), 'active'),
      'archivedAt', to_jsonb(h.archived_at),
      'semester', coalesce(nullif(h.semester, ''), nullif(h.payload ->> 'semester', ''), 'Học kỳ I'),
      'classProfile',
        coalesce(h.payload -> 'classProfile', '{}'::jsonb)
        || jsonb_build_object(
          'classType', coalesce(nullif(h.payload #>> '{classProfile,classType}', ''), 'subject'),
          'className', coalesce(nullif(h.class_name, ''), nullif(h.payload #>> '{classProfile,className}', ''), 'Lớp bộ môn'),
          'schoolYear', coalesce(nullif(h.school_year, ''), nullif(h.payload #>> '{classProfile,schoolYear}', ''), ''),
          'grade', coalesce(nullif(h.payload #>> '{classProfile,grade}', ''), '')
        ),
      'students', case
        when jsonb_typeof(h.payload -> 'students') = 'array' then h.payload -> 'students'
        else '[]'::jsonb
      end,
      'learningGradebook', case
        when jsonb_typeof(h.payload -> 'learningGradebook') = 'object' then h.payload -> 'learningGradebook'
        else '{}'::jsonb
      end,
      'learningRecords', case
        when jsonb_typeof(h.payload -> 'learningRecords') = 'array' then h.payload -> 'learningRecords'
        else '[]'::jsonb
      end,
      'gradeSettings', case
        when jsonb_typeof(h.payload -> 'gradeSettings') = 'object' then h.payload -> 'gradeSettings'
        else '{}'::jsonb
      end,
      'academicTerms', coalesce(h.payload -> 'academicTerms', '[]'::jsonb),
      'createdAt', coalesce(h.payload -> 'createdAt', to_jsonb(h.created_at)),
      'updatedAt', coalesce(h.payload -> 'updatedAt', to_jsonb(h.updated_at)),
      'gradebookStorageVersion', 1
    ),
    true,
    h.created_at,
    h.updated_at
  from public.bes_homeroom_workspaces h
  on conflict (owner_id, workspace_id) do nothing;
end
$$;
