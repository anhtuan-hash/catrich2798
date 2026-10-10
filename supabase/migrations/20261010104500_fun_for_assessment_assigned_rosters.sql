-- Fun for Assessment: resolve assigned classes against the canonical shared roster.
-- get_my_assigned_school_classes remains the authorization source; bes_class_rosters
-- supplies the current student list because registry assignment payloads may omit students.

create or replace function public.lesson_check_list_assigned_class_rosters()
returns table (
  registry_owner_id uuid,
  class_name text,
  assignment_type text,
  class_payload jsonb,
  registry_updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.lesson_check_list_assigned_class_rosters() from public;
revoke execute on function public.lesson_check_list_assigned_class_rosters() from anon;
grant execute on function public.lesson_check_list_assigned_class_rosters() to authenticated;
