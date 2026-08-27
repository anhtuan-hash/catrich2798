-- Shared Class Rosters V3
-- A formally assigned class has one canonical roster across the whole school,
-- independent of subject department. Legacy department-scoped rows are kept as backup.

create or replace function public.bes_current_school_year()
returns text
language sql
stable
set search_path = public
as $$
  with local_clock as (
    select timezone('Asia/Ho_Chi_Minh', now()) as ts
  )
  select case
    when extract(month from ts) >= 7 then
      extract(year from ts)::int::text || '-' || (extract(year from ts)::int + 1)::text
    else
      (extract(year from ts)::int - 1)::text || '-' || extract(year from ts)::int::text
  end
  from local_clock;
$$;

create or replace function public.bes_is_current_school_year(
  p_school_year text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select replace(replace(lower(trim(coalesce(p_school_year, ''))), '–', '-'), '—', '-')
    = lower(public.bes_current_school_year());
$$;

create or replace function public.bes_has_any_class_assignment(
  p_class_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
begin
  if auth.uid() is null
     or coalesce(trim(p_class_name), '') = '' then
    return false;
  end if;

  if to_regclass('public.department_teacher_sync') is null then
    return false;
  end if;

  execute $query$
    select exists (
      select 1
      from public.department_teacher_sync s
      where s.teacher_id = $1
        and exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(s.member -> 'teachingClasses') = 'array'
                then s.member -> 'teachingClasses'
              else '[]'::jsonb
            end
          ) as c(class_name)
          where lower(trim(c.class_name)) = lower(trim($2))
        )
    )
  $query$ into allowed using auth.uid(), p_class_name;

  return coalesce(allowed, false);
end;
$$;

create or replace function public.bes_can_access_class_roster_v3(
  p_roster_key text,
  p_created_by uuid,
  p_class_name text,
  p_school_year text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      p_created_by = auth.uid()
      or (
        coalesce(p_roster_key, '') like 'class:%'
        and public.bes_is_current_school_year(p_school_year)
        and public.bes_has_any_class_assignment(p_class_name)
      )
    );
$$;

grant execute on function public.bes_current_school_year() to authenticated;
grant execute on function public.bes_is_current_school_year(text) to authenticated;
grant execute on function public.bes_has_any_class_assignment(text) to authenticated;
grant execute on function public.bes_can_access_class_roster_v3(text, uuid, text, text) to authenticated;

-- Consolidate all department-scoped rosters into one canonical school-wide row.
-- For the same student appearing in several source rows, the most recently updated
-- roster version wins. Existing canonical rows participate in the merge as well.
do $$
begin
  if to_regclass('public.bes_class_rosters') is null then
    return;
  end if;

  with source_rows as (
    select
      case
        when r.roster_key like 'class:%' then r.roster_key
        else
          'class:'
          || lower(trim(coalesce(nullif(r.school_year, ''), 'unknown-year')))
          || '||'
          || lower(trim(r.class_name))
      end as canonical_key,
      r.*
    from public.bes_class_rosters r
    where r.roster_key like 'department:%'
       or r.roster_key like 'class:%'
  ),
  latest_meta as (
    select distinct on (canonical_key)
      canonical_key,
      class_name,
      school_year,
      grade,
      created_by,
      updated_by,
      created_at,
      updated_at
    from source_rows
    order by canonical_key, updated_at desc, created_at desc
  ),
  expanded_students as (
    select
      s.canonical_key,
      s.updated_at as roster_updated_at,
      student,
      case
        when coalesce(trim(student ->> 'code'), '') <> '' then
          'code:' || lower(trim(student ->> 'code'))
        else
          'person:'
          || lower(trim(coalesce(student ->> 'fullName', '')))
          || '|'
          || trim(coalesce(student ->> 'birthDate', ''))
          || '|'
          || lower(trim(coalesce(student ->> 'gender', '')))
      end as student_key
    from source_rows s
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(s.students) = 'array' then s.students
        else '[]'::jsonb
      end
    ) as student
    where coalesce(trim(student ->> 'fullName'), '') <> ''
       or coalesce(trim(student ->> 'code'), '') <> ''
  ),
  latest_students as (
    select distinct on (canonical_key, student_key)
      canonical_key,
      student_key,
      student,
      roster_updated_at
    from expanded_students
    order by canonical_key, student_key, roster_updated_at desc
  ),
  aggregated_students as (
    select
      canonical_key,
      jsonb_agg(
        student
        order by
          lower(coalesce(student ->> 'fullName', '')),
          lower(coalesce(student ->> 'code', ''))
      ) as students
    from latest_students
    group by canonical_key
  )
  insert into public.bes_class_rosters (
    roster_key,
    department_id,
    class_name,
    school_year,
    grade,
    students,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  select
    m.canonical_key,
    '',
    m.class_name,
    coalesce(nullif(m.school_year, ''), 'unknown-year'),
    coalesce(m.grade, ''),
    coalesce(a.students, '[]'::jsonb),
    m.created_by,
    coalesce(m.updated_by, m.created_by),
    m.created_at,
    m.updated_at
  from latest_meta m
  left join aggregated_students a
    on a.canonical_key = m.canonical_key
  on conflict (roster_key) do update set
    department_id = '',
    class_name = excluded.class_name,
    school_year = excluded.school_year,
    grade = excluded.grade,
    students = excluded.students,
    updated_by = excluded.updated_by,
    updated_at = greatest(public.bes_class_rosters.updated_at, excluded.updated_at);
end
$$;

alter table public.bes_class_rosters enable row level security;

drop policy if exists "bes_class_rosters_select" on public.bes_class_rosters;
create policy "bes_class_rosters_select"
  on public.bes_class_rosters
  for select
  to authenticated
  using (
    public.bes_can_access_class_roster_v3(roster_key, created_by, class_name, school_year)
  );

drop policy if exists "bes_class_rosters_insert" on public.bes_class_rosters;
create policy "bes_class_rosters_insert"
  on public.bes_class_rosters
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      roster_key like 'owner:%'
      or (
        roster_key like 'class:%'
        and public.bes_is_current_school_year(school_year)
        and public.bes_has_any_class_assignment(class_name)
      )
    )
  );

drop policy if exists "bes_class_rosters_update" on public.bes_class_rosters;
create policy "bes_class_rosters_update"
  on public.bes_class_rosters
  for update
  to authenticated
  using (
    public.bes_can_access_class_roster_v3(roster_key, created_by, class_name, school_year)
  )
  with check (
    public.bes_can_access_class_roster_v3(roster_key, created_by, class_name, school_year)
  );

grant select, insert, update on public.bes_class_rosters to authenticated;
revoke delete on public.bes_class_rosters from authenticated;

comment on table public.bes_class_rosters is
  'Canonical school-wide class roster for current-year assigned classes. Legacy department rows remain as backup; owner-scoped private classes remain isolated.';
