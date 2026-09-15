-- Student Support live-source bridge
-- Reads the existing Homeroom / Gradebook workspace payloads without copying student data.

create or replace function public.bes_search_student_support_students(
  p_query text default '',
  p_limit integer default 30
)
returns table(
  student_ref text,
  code text,
  full_name text,
  workspace_id text,
  class_name text,
  school_year text,
  grade text,
  homeroom_owner_id uuid
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
  v_limit integer := greatest(1, least(50, coalesce(p_limit, 30)));
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  with live_students as (
    select
      w.owner_id,
      w.workspace_id,
      w.class_name,
      w.school_year,
      w.updated_at,
      s.student,
      coalesce(
        nullif(trim(s.student ->> 'id'), ''),
        case
          when trim(coalesce(s.student ->> 'code', '')) <> ''
            then 'code:' || trim(s.student ->> 'code')
          else null
        end
      ) as normalized_student_ref,
      trim(coalesce(s.student ->> 'code', '')) as normalized_code,
      trim(coalesce(s.student ->> 'name', '')) as normalized_name,
      coalesce(w.payload -> 'classProfile' ->> 'grade', '') as normalized_grade
    from public.bes_homeroom_workspaces w
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(w.payload -> 'students') = 'array' then w.payload -> 'students'
        else '[]'::jsonb
      end
    ) as s(student)
    where w.archived_at is null
      and lower(coalesce(s.student ->> 'active', 'true')) <> 'false'
      and lower(coalesce(s.student ->> 'status', 'active')) <> 'archived'
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
  ), ranked as (
    select
      live_students.*,
      row_number() over (
        partition by live_students.workspace_id, live_students.normalized_student_ref
        order by (live_students.owner_id = auth.uid()) desc, live_students.updated_at desc nulls last
      ) as rn
    from live_students
    where live_students.normalized_student_ref is not null
      and (
        v_query = ''
        or lower(live_students.normalized_name) like '%' || v_query || '%'
        or lower(live_students.normalized_code) like '%' || v_query || '%'
        or lower(coalesce(live_students.class_name, '')) like '%' || v_query || '%'
      )
  )
  select
    ranked.normalized_student_ref,
    ranked.normalized_code,
    ranked.normalized_name,
    ranked.workspace_id,
    coalesce(ranked.class_name, ''),
    coalesce(ranked.school_year, ''),
    coalesce(ranked.normalized_grade, ''),
    ranked.owner_id
  from ranked
  where ranked.rn = 1
  order by lower(coalesce(ranked.class_name, '')), lower(ranked.normalized_name), lower(ranked.normalized_code)
  limit v_limit;
end;
$$;

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
  v_attendance_key text;
  v_attendance jsonb := '[]'::jsonb;
  v_grades jsonb := '[]'::jsonb;
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
    and lower(coalesce(s.student ->> 'active', 'true')) <> 'false'
    and lower(coalesce(s.student ->> 'status', 'active')) <> 'archived'
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
      or trim(coalesce(s.student ->> 'code', '')) = trim(p_student_ref)
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
  v_attendance_key := coalesce(nullif(v_student_id, ''), nullif(v_code, ''), v_student_ref);

  if v_attendance_key is not null then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', split_part(session_entry.key, '::', 1),
          'session_name', split_part(session_entry.key, '::', 2),
          'period_no', nullif(split_part(session_entry.key, '::', 3), ''),
          'status', coalesce(session_entry.value -> v_attendance_key ->> 'status', ''),
          'note', coalesce(session_entry.value -> v_attendance_key ->> 'note', ''),
          'reason', coalesce(session_entry.value -> v_attendance_key ->> 'reason', ''),
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
      and session_entry.value ? v_attendance_key;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', coalesce(
          record_entry.record ->> 'createdAt',
          record_entry.record ->> 'created_at',
          record_entry.record ->> 'updatedAt',
          record_entry.record ->> 'updated_at',
          record_entry.record ->> 'date',
          ''
        ),
        'score', coalesce(
          record_entry.record -> 'score',
          record_entry.record -> 'value',
          record_entry.record -> 'grade',
          'null'::jsonb
        ),
        'subject', coalesce(record_entry.record ->> 'subject', record_entry.record ->> 'subjectName', ''),
        'period', coalesce(record_entry.record ->> 'period', record_entry.record ->> 'term', ''),
        'assessment_type', coalesce(record_entry.record ->> 'assessmentType', record_entry.record ->> 'assessment_type', record_entry.record ->> 'type', ''),
        'source', 'gradebook'
      )
    ),
    '[]'::jsonb
  )
  into v_grades
  from public.bes_gradebook_workspaces g
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(g.payload -> 'learningRecords') = 'array' then g.payload -> 'learningRecords'
      else '[]'::jsonb
    end
  ) as record_entry(record)
  where g.archived_at is null
    and g.owner_id = v_owner_id
    and g.workspace_id = v_workspace_id
    and (
      trim(coalesce(record_entry.record ->> 'studentId', record_entry.record ->> 'student_id', '')) = v_student_id
      or trim(coalesce(record_entry.record ->> 'studentRef', record_entry.record ->> 'student_ref', '')) = v_student_ref
      or (
        v_code <> ''
        and trim(coalesce(record_entry.record ->> 'studentCode', record_entry.record ->> 'student_code', '')) = v_code
      )
    );

  return jsonb_build_object(
    'student', jsonb_build_object(
      'student_ref', v_student_ref,
      'code', v_code,
      'full_name', coalesce(v_student ->> 'name', ''),
      'class_name', v_class_name,
      'workspace_id', v_workspace_id,
      'school_year', v_school_year,
      'grade', coalesce(v_payload -> 'classProfile' ->> 'grade', ''),
      'lifecycle_status', 'active'
    ),
    'attendance', coalesce(v_attendance, '[]'::jsonb),
    'grades', coalesce(v_grades, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.bes_search_student_support_students(text, integer) from public;
revoke all on function public.bes_search_student_support_students(text, integer) from anon;
grant execute on function public.bes_search_student_support_students(text, integer) to authenticated;
grant execute on function public.bes_search_student_support_students(text, integer) to service_role;

revoke all on function public.bes_get_student_support_student_360(text, text) from public;
revoke all on function public.bes_get_student_support_student_360(text, text) from anon;
grant execute on function public.bes_get_student_support_student_360(text, text) to authenticated;
grant execute on function public.bes_get_student_support_student_360(text, text) to service_role;
