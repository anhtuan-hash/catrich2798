-- Brian Department Workspace — English department bootstrap
-- Run after department-schema.sql in the Supabase SQL Editor.
-- This script is idempotent and targets the real Brian admin account.

do $$
declare
  v_department_id constant uuid := '00000000-0000-0000-0000-000000000001';
  v_admin_email constant text := 'anhtuan@pek.edu.vn';
  v_user_id uuid;
  v_existing_department_id uuid;
begin
  select id
  into v_existing_department_id
  from public.departments
  where code = 'ENGLISH'
  limit 1;

  if v_existing_department_id is not null
     and v_existing_department_id <> v_department_id then
    raise exception
      'Department code ENGLISH already belongs to %, expected %. Update VITE_DEPARTMENT_ID to the existing UUID or remove the duplicate before continuing.',
      v_existing_department_id,
      v_department_id;
  end if;

  insert into public.departments (id, name, code, active)
  values (v_department_id, 'Tổ Tiếng Anh', 'ENGLISH', true)
  on conflict (id) do update
  set name = excluded.name,
      code = excluded.code,
      active = true,
      updated_at = now();

  select id
  into v_user_id
  from auth.users
  where lower(email) = lower(v_admin_email)
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception
      'Supabase Auth does not contain %. Sign in to Brian with this account once or create it in Authentication > Users, then run this bootstrap again.',
      v_admin_email;
  end if;

  insert into public.department_members (
    department_id,
    user_id,
    role,
    display_name,
    email,
    active
  )
  values (
    v_department_id,
    v_user_id,
    'department_head',
    'Nguyễn Anh Tuấn',
    v_admin_email,
    true
  )
  on conflict (department_id, user_id) do update
  set role = 'department_head',
      display_name = excluded.display_name,
      email = excluded.email,
      active = true,
      updated_at = now();

  -- Disable the earlier mistakenly bootstrapped GitHub/commit email if present.
  update public.department_members
  set active = false,
      updated_at = now()
  where department_id = v_department_id
    and lower(coalesce(email, '')) = lower('anhtuanpek@gmail.com')
    and user_id <> v_user_id;
end
$$;

select
  d.id as department_id,
  d.name as department_name,
  d.code,
  dm.role,
  dm.display_name,
  dm.email,
  dm.active
from public.departments d
join public.department_members dm on dm.department_id = d.id
where d.id = '00000000-0000-0000-0000-000000000001'::uuid
  and lower(dm.email) = lower('anhtuan@pek.edu.vn');
