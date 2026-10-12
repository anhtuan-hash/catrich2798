-- Resolve only the authenticated teacher's explicitly assigned homeroom.
-- Unlike get_my_assigned_school_classes this RPC does not transfer 27+ rosters.
-- A GVCN assignment wins over any previously opened subject class.
create or replace function public.bes_get_my_assigned_homeroom()
returns table(workspace_id text, class_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with viewer as (
    select p.id, lower(coalesce(p.email, '')) as email
    from public.profiles p
    where p.id = auth.uid() and p.approved is true
    limit 1
  ),
  assigned as (
    select
      viewer.id as teacher_id,
      trim(entry.value ->> 'className') as assigned_class_name,
      coalesce(
        nullif(trim(entry.value ->> 'schoolYear'), ''),
        concat(
          extract(year from current_date)::int - case when extract(month from current_date)::int < 7 then 1 else 0 end,
          '-',
          extract(year from current_date)::int + case when extract(month from current_date)::int < 7 then 0 else 1 end
        )
      ) as school_year,
      registry.updated_at
    from viewer
    cross join public.school_class_registries registry
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(registry.payload -> 'classes') = 'array'
        then registry.payload -> 'classes' else '[]'::jsonb end
    ) entry(value)
    where
      nullif(trim(entry.value ->> 'className'), '') is not null
      and (
        trim(entry.value #>> '{assignment,homeroomTeacherId}') = viewer.id::text
        or (
          viewer.email <> ''
          and lower(trim(entry.value #>> '{assignment,homeroomTeacherId}')) = viewer.email
        )
      )
  )
  select
    coalesce(
      existing.workspace_id,
      'school-' || regexp_replace(
        lower(assigned.assigned_class_name || '-' || assigned.school_year),
        '[^a-z0-9]+', '-', 'g'
      )
    ) as workspace_id,
    assigned.assigned_class_name as class_name
  from assigned
  left join lateral (
    select workspace.workspace_id
    from public.bes_homeroom_workspaces workspace
    where workspace.owner_id = assigned.teacher_id
      and trim(workspace.class_name) = assigned.assigned_class_name
      and workspace.status <> 'archived'
    order by workspace.updated_at desc
    limit 1
  ) existing on true
  order by assigned.updated_at desc, assigned.assigned_class_name
  limit 1;
$$;

revoke all on function public.bes_get_my_assigned_homeroom() from public;
grant execute on function public.bes_get_my_assigned_homeroom() to authenticated;
