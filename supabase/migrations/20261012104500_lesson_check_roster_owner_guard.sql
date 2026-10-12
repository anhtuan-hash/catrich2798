-- SECURITY: close cross-owner student roster disclosure via Lesson Check.
-- Actual production tables contain multiple independent owner rosters with
-- the same class_name. The pre-fix SECURITY DEFINER lateral join matched by
-- class_name alone, bypassing the base table's owner-aware RLS predicate.
-- Reuse that exact RLS authorization check before reading br.students.
-- Assigned class information without an authorized roster still uses the
-- existing registry class_payload.students fallback; no data changes.
CREATE OR REPLACE FUNCTION public.lesson_check_list_assigned_class_rosters()
 RETURNS TABLE(registry_owner_id uuid, class_name text, assignment_type text, class_payload jsonb, registry_updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$;
  with assigned as (
    select *
    from public.get_my_assigned_school_classes()
  )
  select
    a.registry_owner_id,
    a.class_name,
    a.assignment_type,
    jsonb_set(
      jsonb_set(
        coalesce(a.class_payload,'{}'::jsonb),
        '{students}',
        coalesce(r.students, a.class_payload->'students', '[]'::jsonb),
        true
      ),
      '{schoolYear}',
      to_jsonb(coalesce(nullif(r.school_year,''), a.class_payload->>'schoolYear', public.bes_current_school_year())),
      true
    ) as class_payload,
    greatest(a.registry_updated_at, coalesce(r.updated_at,a.registry_updated_at)) as registry_updated_at
  from assigned a
  left join lateral (
    select br.students, br.school_year, br.grade, br.updated_at
    from public.bes_class_rosters br
    where lower(trim(br.class_name)) = lower(trim(a.class_name))
      -- This SECURITY DEFINER function bypasses the table's SELECT RLS.
      -- Re-apply the identical ownership/assignment predicate here before
      -- merging roster students into the assigned classroom payload.
      and public.bes_can_access_class_roster_v3(
        br.roster_key, br.created_by, br.class_name, br.school_year
      )
      and (
        public.bes_is_current_school_year(br.school_year)
        or br.school_year = coalesce(a.class_payload->>'schoolYear','')
      )
    order by
      case when br.roster_key like 'class:%' then 0 else 1 end,
      br.updated_at desc
    limit 1
  ) r on true
  order by
    nullif(regexp_replace(a.class_name,'\..*$','','g'),'')::int nulls last,
    a.class_name;
$function$
