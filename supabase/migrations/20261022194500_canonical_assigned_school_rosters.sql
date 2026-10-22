-- 2026-10-22: Initial school-wide roster reconciliation for Lesson Check and Gradebook.
-- Idempotent: only insert missing canonical class:<year>||<class> rows.
-- Never modify existing owner rosters, homeroom profiles, attendance, conduct, or assessment results.
-- The school registry establishes class membership and teacher access; select the
-- populated official-GVCN workspace first, otherwise an assigned subject teacher,
-- with a populated legacy school workspace as fallback.
BEGIN;

CREATE OR REPLACE FUNCTION public.bes_has_any_class_assignment(p_class_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $func$
  SELECT auth.uid() IS NOT NULL AND NULLIF(trim(p_class_name),'') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.get_my_assigned_school_classes() AS assigned
      WHERE lower(trim(assigned.class_name)) = lower(trim(p_class_name))
    );
$func$;
REVOKE ALL ON FUNCTION public.bes_has_any_class_assignment(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bes_has_any_class_assignment(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.bes_has_any_class_assignment(text) TO authenticated;

WITH official AS (
  SELECT r.owner_id AS registry_owner_id, c.value AS info,
         trim(c.value->>'className') AS class_name,
         (c.value->>'expectedCount')::int AS expected
  FROM public.school_class_registries r
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(r.payload->'classes')='array'
    THEN r.payload->'classes' ELSE '[]'::jsonb END
  ) c(value)
  WHERE trim(c.value->>'className') ~ '^(10|11|12)[.][0-9]+$'
), candidates AS (
  SELECT r.*, w.owner_id AS source_owner, w.updated_at AS source_updated,
         w.payload->'students' AS source_students,
         (SELECT count(*) FROM jsonb_array_elements(w.payload->'students') s
           WHERE coalesce(s->>'active','true')='true'
             AND coalesce(s->>'lifecycleStatus','active')<>'deleted'
             AND coalesce(s->>'deletedAt','')='') AS active_count,
         (w.owner_id::text=nullif(r.info#>>'{assignment,homeroomTeacherId}','')) AS is_gvcn,
         coalesce((r.info#>'{assignment,subjectTeacherIds}') ? w.owner_id::text,false) AS is_gvbm
  FROM official r
  JOIN public.bes_homeroom_workspaces w ON w.class_name=r.class_name
     AND w.school_year=public.bes_current_school_year()
     AND w.status='active'
  WHERE jsonb_typeof(w.payload->'students')='array'
), preferred AS (
  SELECT *,row_number() OVER (
    PARTITION BY class_name ORDER BY (active_count>0) DESC, is_gvcn DESC,
      (active_count=expected) DESC,is_gvbm DESC,source_updated DESC
  ) AS rank
  FROM candidates
), sanitized AS (
  SELECT p.class_name,p.registry_owner_id,p.info->>'grade' AS grade,
    jsonb_agg(jsonb_build_object(
      'rosterStudentId',coalesce(nullif(trim(s.value->>'rosterStudentId'),''),
         nullif(trim(s.value->>'id'),''),nullif(trim(s.value->>'code'),''),
         'student-'||s.ordinality::text),
      'rosterPersonKey',CASE WHEN nullif(trim(s.value->>'code'),'') IS NOT NULL
        THEN 'code:'||lower(trim(s.value->>'code'))
        ELSE 'person:'||lower(trim(coalesce(s.value->>'fullName','')))
          ||'|'||coalesce(s.value->>'birthDate','')
          ||'|'||lower(coalesce(s.value->>'gender','')) END,
      'code',coalesce(s.value->>'code',''),
      'fullName',coalesce(s.value->>'fullName',''),
      'birthDate',coalesce(s.value->>'birthDate',''),
      'gender',coalesce(s.value->>'gender',''),
      'active',(coalesce(s.value->>'active','true')='true'
          AND coalesce(s.value->>'lifecycleStatus','active')<>'deleted'
          AND coalesce(s.value->>'deletedAt','')=''),
      'archivedAt',coalesce(s.value->>'inactiveAt',''),
      'archivedReason',coalesce(s.value->>'inactiveReason','')
    ) ORDER BY s.ordinality) AS students
  FROM preferred p
  CROSS JOIN LATERAL jsonb_array_elements(p.source_students)
    WITH ORDINALITY AS s(value,ordinality)
  WHERE p.rank=1 AND (nullif(trim(s.value->>'code'),'') IS NOT NULL
      OR nullif(trim(s.value->>'fullName'),'') IS NOT NULL)
  GROUP BY p.class_name,p.registry_owner_id,p.info
)
INSERT INTO public.bes_class_rosters
  (roster_key,department_id,class_name,school_year,grade,students,
   created_by,updated_by,created_at,updated_at)
SELECT 'class:'||lower(public.bes_current_school_year())||'||'||lower(class_name),
       '',class_name,public.bes_current_school_year(),
       coalesce(grade,split_part(class_name,'.',1)),students,
       registry_owner_id,registry_owner_id,now(),now()
FROM sanitized
ON CONFLICT (roster_key) DO NOTHING;
COMMIT;
