-- Brian Department Workspace — verification
-- Expected result: every check is true and the membership role is department_head.

select
  to_regclass('public.departments') is not null as departments_table,
  to_regclass('public.department_members') is not null as members_table,
  to_regclass('public.department_entities') is not null as entities_table,
  to_regprocedure('public.department_replace_collection(uuid,text,jsonb)') is not null as replace_rpc,
  exists (
    select 1
    from storage.buckets
    where id = 'department-files'
      and public = false
  ) as private_files_bucket;

select
  d.id as department_id,
  d.name,
  d.code,
  d.active as department_active,
  dm.role,
  dm.display_name,
  dm.email,
  dm.active as membership_active
from public.departments d
join public.department_members dm on dm.department_id = d.id
where d.id = '00000000-0000-0000-0000-000000000001'::uuid
  and lower(dm.email) = lower('anhtuanpek@gmail.com');

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('departments', 'department_members', 'department_entities')
order by tablename, policyname;
