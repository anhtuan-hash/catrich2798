-- Protect canonical (school-wide) rosters against repeated student identities.
-- Confirmed in production after exact-duplicate cleanup (no users were deleted).
-- Older teacher-owned private rosters retain their own editing semantics.
CREATE OR REPLACE FUNCTION public.bes_validate_canonical_student_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $fn$
BEGIN
  IF NEW.roster_key NOT LIKE 'class:%' THEN RETURN NEW; END IF;

  IF jsonb_typeof(NEW.students) <> 'array' THEN
    RAISE EXCEPTION 'Danh sách lớp dùng chung phải là mảng học sinh'
      USING ERRCODE='23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.students) AS s(value)
    WHERE nullif(trim(s.value->>'rosterStudentId'),'') IS NULL
  ) THEN
    RAISE EXCEPTION 'Học sinh trong danh sách chung phải có mã định danh nội bộ'
      USING ERRCODE='23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.students) AS s(value)
    GROUP BY lower(trim(s.value->>'rosterStudentId'))
    HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'Một học sinh không được xuất hiện hai lần trong danh sách chung (trùng mã nội bộ)'
      USING ERRCODE='23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.students) AS s(value)
    WHERE nullif(trim(s.value->>'code'),'') IS NOT NULL
    GROUP BY lower(trim(s.value->>'code'))
    HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'Danh sách chung có mã học sinh bị trùng trong cùng lớp'
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS bes_class_roster_validate_student_identity ON public.bes_class_rosters;
CREATE TRIGGER bes_class_roster_validate_student_identity
BEFORE INSERT OR UPDATE OF students ON public.bes_class_rosters
FOR EACH ROW EXECUTE FUNCTION public.bes_validate_canonical_student_identity();
