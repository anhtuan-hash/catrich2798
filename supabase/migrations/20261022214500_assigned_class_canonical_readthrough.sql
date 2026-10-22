-- Canonical student roster read-through for all apps using school assignments.
-- Approved GVCN/GVBM see only assigned classes; admins see managed school classes.
-- SQL was checked against production before being retained as a migration.
CREATE OR REPLACE FUNCTION public.get_my_assigned_school_classes()
RETURNS TABLE (
  registry_owner_id uuid,
  class_name text,
  assignment_type text,
  class_payload jsonb,
  registry_updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH me AS (
    SELECT p.id::text user_id, lower(coalesce(p.email,'')) email, p.role, p.approved
    FROM public.profiles p WHERE p.id=auth.uid() LIMIT 1
  ), expanded AS (
    SELECT r.owner_id,r.updated_at,item.value class_payload,
      item.value->>'className' class_name,
      coalesce(item.value #>> '{assignment,homeroomTeacherId}','') homeroom_teacher_id,
      CASE WHEN jsonb_typeof(item.value #> '{assignment,subjectTeacherIds}')='array'
        THEN item.value #> '{assignment,subjectTeacherIds}' ELSE '[]'::jsonb END subject_teacher_ids
    FROM public.school_class_registries r
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(r.payload->'classes')='array'
        THEN r.payload->'classes' ELSE '[]'::jsonb END) item(value)
  ), visible AS (
    SELECT e.*,m.user_id,m.email,m.role,
      EXISTS (SELECT 1 FROM jsonb_array_elements_text(e.subject_teacher_ids) a(value)
        WHERE a.value=m.user_id OR (m.email<>'' AND lower(a.value)=m.email)) is_subject_teacher,
      (e.homeroom_teacher_id=m.user_id OR
        (m.email<>'' AND lower(e.homeroom_teacher_id)=m.email)) is_homeroom_teacher
    FROM expanded e CROSS JOIN me m WHERE m.approved=true
  )
  SELECT DISTINCT ON (v.class_name)
    v.owner_id,v.class_name,
    CASE WHEN v.is_homeroom_teacher THEN 'homeroom'
         WHEN v.is_subject_teacher THEN 'subject' ELSE 'managed' END,
    jsonb_set(
      jsonb_set(coalesce(v.class_payload,'{}'::jsonb),'{students}',
        coalesce(shared.students,v.class_payload->'students','[]'::jsonb),true),
      '{schoolYear}',to_jsonb(coalesce(nullif(shared.school_year,''),
        v.class_payload->>'schoolYear',public.bes_current_school_year())),true),
    greatest(v.updated_at,coalesce(shared.updated_at,v.updated_at))
  FROM visible v
  LEFT JOIN LATERAL (
    SELECT r.students,r.school_year,r.updated_at
    FROM public.bes_class_rosters r
    WHERE r.roster_key='class:'||
      lower(coalesce(nullif(v.class_payload->>'schoolYear',''),public.bes_current_school_year()))
      ||'||'||lower(trim(v.class_name))
    LIMIT 1
  ) shared ON true
  WHERE v.class_name IS NOT NULL AND v.class_name<>''
    AND (v.role IN ('admin','department_head') OR v.is_homeroom_teacher OR v.is_subject_teacher)
  ORDER BY v.class_name,v.updated_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_my_assigned_school_classes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_assigned_school_classes() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_assigned_school_classes() TO authenticated;
