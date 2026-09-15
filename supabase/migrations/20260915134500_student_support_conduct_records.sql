-- Student Support Student 360: expose canonical Homeroom conduct violations.
-- The data remains in bes_homeroom_workspaces.payload.conductRecords; nothing is copied/backfilled.

create or replace function public.bes_get_student_support_student_360(
  p_student_ref text,
  p_workspace_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_owner_id uuid;
  v_workspace_id text;
  v_class_name text;
  v_school_year text;
  v_payload jsonb;
  v_student jsonb;
  v_student_id text;
  v_student_ref text;
  v_code text;
  v_attendance jsonb := '[]'::jsonb;
  v_grades jsonb := '[]'::jsonb;
  v_conduct_records jsonb := '[]'::jsonb;
  v_gradebook_payload jsonb;
begin
  if auth.uid() is null
     or trim(coalesce(p_student_ref, '')) = ''
     or trim(coalesce(p_workspace_id, '')) = '' then
    return null;
  end if;

  select
    w.owner_id,
    w.workspace_id,
    coalesce(w.class_name, ''),
    coalesce(w.school_year, ''),
    w.payload,
    s.student
  into
    v_owner_id,
    v_workspace_id,
    v_class_name,
    v_school_year,
    v_payload,
    v_student
  from public.bes_homeroom_workspaces w
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(w.payload -> 'students') = 'array' then w.payload -> 'students'
      else '[]'::jsonb
    end
  ) as s(student)
  where w.archived_at is null
    and w.workspace_id = trim(p_workspace_id)
    and coalesce(s.student ->> 'deletedAt', '') = ''
    and lower(coalesce(s.student ->> 'active', 'true')) <> 'false'
    and lower(coalesce(s.student ->> 'lifecycleStatus', 'active')) <> 'archived'
    and (
      public.is_admin()
      or w.owner_id = auth.uid()
      or exists (
        select 1
        from public.department_teacher_sync d
        where d.teacher_id = w.owner_id
          and d.department_head_id = auth.uid()
      )
      or public.bes_has_any_class_assignment(w.class_name)
    )
    and (
      trim(coalesce(s.student ->> 'id', '')) = trim(p_student_ref)
      or (
        trim(coalesce(s.student ->> 'code', '')) <> ''
        and 'code:' || trim(s.student ->> 'code') = trim(p_student_ref)
      )
    )
  order by (w.owner_id = auth.uid()) desc, w.updated_at desc nulls last
  limit 1;

  if v_student is null then
    return null;
  end if;

  v_student_id := trim(coalesce(v_student ->> 'id', ''));
  v_code := trim(coalesce(v_student ->> 'code', ''));
  v_student_ref := coalesce(
    nullif(v_student_id, ''),
    case when v_code <> '' then 'code:' || v_code else null end
  );

  if v_student_id <> '' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', split_part(session_entry.key, '::', 1),
          'session_name', split_part(session_entry.key, '::', 2),
          'period_no', nullif(split_part(session_entry.key, '::', 3), ''),
          'status', coalesce(session_entry.value -> v_student_id ->> 'status', ''),
          'note', coalesce(session_entry.value -> v_student_id ->> 'note', ''),
          'reason', coalesce(session_entry.value -> v_student_id ->> 'reason', ''),
          'marked_at', coalesce(session_entry.value -> v_student_id ->> 'markedAt', ''),
          'source', 'homeroom'
        )
        order by session_entry.key desc
      ),
      '[]'::jsonb
    )
    into v_attendance
    from jsonb_each(
      case
        when jsonb_typeof(v_payload -> 'attendance') = 'object' then v_payload -> 'attendance'
        else '{}'::jsonb
      end
    ) as session_entry(key, value)
    where jsonb_typeof(session_entry.value) = 'object'
      and session_entry.value ? v_student_id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', coalesce(record_entry.record ->> 'id', ''),
          'date', coalesce(record_entry.record ->> 'date', ''),
          'title', coalesce(record_entry.record ->> 'title', ''),
          'category', coalesce(record_entry.record ->> 'category', ''),
          'code', coalesce(record_entry.record ->> 'code', ''),
          'deduction', coalesce(record_entry.record -> 'deduction', '0'::jsonb),
          'severity', coalesce(record_entry.record ->> 'severity', 'normal'),
          'status', coalesce(record_entry.record ->> 'status', 'confirmed'),
          'note', coalesce(record_entry.record ->> 'note', ''),
          'source', coalesce(record_entry.record ->> 'source', 'homeroom-conduct')
        )
        order by coalesce(record_entry.record ->> 'date', '') desc,
                 coalesce(record_entry.record ->> 'createdAt', '') desc
      ),
      '[]'::jsonb
    )
    into v_conduct_records
    from jsonb_array_elements(
      case
        when jsonb_typeof(v_payload -> 'conductRecords') = 'array' then v_payload -> 'conductRecords'
        else '[]'::jsonb
      end
    ) as record_entry(record)
    where trim(coalesce(record_entry.record ->> 'studentId', '')) = v_student_id
      and lower(coalesce(record_entry.record ->> 'entryType', 'violation')) = 'violation'
      and lower(coalesce(record_entry.record ->> 'status', 'confirmed')) <> 'cancelled';
  end if;

  select g.payload
  into v_gradebook_payload
  from public.bes_gradebook_workspaces g
  where g.archived_at is null
    and g.owner_id = v_owner_id
    and g.workspace_id = v_workspace_id
  order by g.updated_at desc nulls last
  limit 1;

  if v_gradebook_payload is not null and v_student_id <> '' then
    with subjects as (
      select
        subject_entry.key as subject_key,
        subject_entry.value as subject_value
      from jsonb_each(
        case
          when jsonb_typeof(v_gradebook_payload -> 'learningGradebook' -> 'subjects') = 'object'
            then v_gradebook_payload -> 'learningGradebook' -> 'subjects'
          else '{}'::jsonb
        end
      ) as subject_entry(key, value)
    ), semesters as (
      select
        subjects.subject_key,
        subjects.subject_value,
        semester_entry.key as semester_key,
        semester_entry.value as semester_value
      from subjects
      cross join lateral jsonb_each(
        case
          when jsonb_typeof(subjects.subject_value -> 'semesters') = 'object'
            then subjects.subject_value -> 'semesters'
          else '{}'::jsonb
        end
      ) as semester_entry(key, value)
    ), regular_blocks as (
      select
        semesters.subject_key,
        semesters.subject_value,
        semesters.semester_key,
        block_entry.value as block_value,
        block_entry.ordinality as block_no
      from semesters
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(semesters.semester_value -> 'regular') = 'array'
            then semesters.semester_value -> 'regular'
          else '[]'::jsonb
        end
      ) with ordinality as block_entry(value, ordinality)
    ), score_cells as (
      select
        regular_blocks.subject_key,
        coalesce(nullif(regular_blocks.subject_value ->> 'name', ''), regular_blocks.subject_key) as subject_name,
        regular_blocks.semester_key,
        regular_blocks.block_no,
        column_entry.ordinality as column_no,
        coalesce(nullif(column_entry.value ->> 'label', ''), column_entry.value ->> 'id', '') as column_label,
        regular_blocks.block_value -> 'scores' -> v_student_id -> (column_entry.value ->> 'id') as score_value
      from regular_blocks
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(regular_blocks.block_value -> 'columns') = 'array'
            then regular_blocks.block_value -> 'columns'
          else '[]'::jsonb
        end
      ) with ordinality as column_entry(value, ordinality)
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', coalesce(v_gradebook_payload ->> 'updatedAt', ''),
          'score', replace(score_cells.score_value #>> '{}', ',', '.')::numeric,
          'subject', score_cells.subject_name,
          'period', concat_ws(' · ', score_cells.semester_key, score_cells.column_label),
          'assessment_type', 'regular',
          'source', 'gradebook'
        )
        order by score_cells.subject_key, score_cells.semester_key, score_cells.block_no, score_cells.column_no
      ) filter (
        where score_cells.score_value is not null
          and (score_cells.score_value #>> '{}') ~ '^[-+]?[0-9]+([.,][0-9]+)?$'
      ),
      '[]'::jsonb
    )
    into v_grades
    from score_cells;
  end if;

  return jsonb_build_object(
    'student', jsonb_build_object(
      'student_ref', v_student_ref,
      'code', v_code,
      'full_name', coalesce(v_student ->> 'fullName', ''),
      'class_name', v_class_name,
      'workspace_id', v_workspace_id,
      'school_year', v_school_year,
      'grade', coalesce(v_payload -> 'classProfile' ->> 'grade', ''),
      'lifecycle_status', coalesce(v_student ->> 'lifecycleStatus', 'active')
    ),
    'attendance', coalesce(v_attendance, '[]'::jsonb),
    'grades', coalesce(v_grades, '[]'::jsonb),
    'conduct_records', coalesce(v_conduct_records, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.bes_get_student_support_student_360(text, text) from public;
revoke all on function public.bes_get_student_support_student_360(text, text) from anon;
grant execute on function public.bes_get_student_support_student_360(text, text) to authenticated;
grant execute on function public.bes_get_student_support_student_360(text, text) to service_role;
