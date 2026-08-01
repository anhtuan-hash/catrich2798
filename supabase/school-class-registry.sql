-- Danh mục 27 lớp và phân công giáo viên dành cho TTCM.
-- Dữ liệu học sinh không được đưa vào Git; tệp Excel được nhập trực tiếp trong ứng dụng.

create table if not exists public.school_class_registries (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  owner_email text not null default '',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.school_class_registries enable row level security;

drop policy if exists "school_class_registries_select_own" on public.school_class_registries;
create policy "school_class_registries_select_own"
on public.school_class_registries for select
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true and p.role in ('admin', 'department_head')
  )
);

drop policy if exists "school_class_registries_insert_own" on public.school_class_registries;
create policy "school_class_registries_insert_own"
on public.school_class_registries for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true and p.role in ('admin', 'department_head')
  )
);

drop policy if exists "school_class_registries_update_own" on public.school_class_registries;
create policy "school_class_registries_update_own"
on public.school_class_registries for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true and p.role in ('admin', 'department_head')
  )
);

create index if not exists school_class_registries_updated_at_idx
  on public.school_class_registries (updated_at desc);

-- Chỉ trả về từng lớp mà tài khoản hiện tại được phân công.
-- TTCM/Admin được xem toàn bộ 27 lớp trong khu vực quản lý lớp của app GVCN,
-- nhưng hàm không bao giờ trả nguyên payload chứa tất cả lớp cho giáo viên thường.
create or replace function public.get_my_assigned_school_classes()
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
as $function$
  with me as (
    select
      p.id::text as user_id,
      lower(coalesce(p.email, '')) as email,
      p.role,
      p.approved
    from public.profiles p
    where p.id = auth.uid()
    limit 1
  ), expanded as (
    select
      r.owner_id,
      r.updated_at,
      item.value as class_payload,
      item.value ->> 'className' as class_name,
      coalesce(item.value #>> '{assignment,homeroomTeacherId}', '') as homeroom_teacher_id,
      case
        when jsonb_typeof(item.value #> '{assignment,subjectTeacherIds}') = 'array'
          then item.value #> '{assignment,subjectTeacherIds}'
        else '[]'::jsonb
      end as subject_teacher_ids
    from public.school_class_registries r
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(r.payload -> 'classes') = 'array' then r.payload -> 'classes'
        else '[]'::jsonb
      end
    ) with ordinality as item(value, position)
  ), visible as (
    select
      e.*,
      m.user_id,
      m.email,
      m.role,
      exists (
        select 1
        from jsonb_array_elements_text(e.subject_teacher_ids) assigned(value)
        where assigned.value = m.user_id or (m.email <> '' and lower(assigned.value) = m.email)
      ) as is_subject_teacher,
      (e.homeroom_teacher_id = m.user_id or (m.email <> '' and lower(e.homeroom_teacher_id) = m.email)) as is_homeroom_teacher
    from expanded e
    cross join me m
    where m.approved = true
  )
  select distinct on (v.class_name)
    v.owner_id as registry_owner_id,
    v.class_name,
    case
      when v.is_homeroom_teacher then 'homeroom'
      when v.is_subject_teacher then 'subject'
      else 'managed'
    end as assignment_type,
    v.class_payload,
    v.updated_at as registry_updated_at
  from visible v
  where
    v.class_name is not null
    and v.class_name <> ''
    and (
      v.role in ('admin', 'department_head')
      or v.is_homeroom_teacher
      or v.is_subject_teacher
    )
  order by v.class_name, v.updated_at desc;
$function$;

revoke all on function public.get_my_assigned_school_classes() from public;
grant execute on function public.get_my_assigned_school_classes() to authenticated;
