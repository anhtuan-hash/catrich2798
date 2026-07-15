-- V12.37.0 preflight
select current_database() as database_name, current_user as database_role, now() as checked_at;
select to_regclass('public.system_roles') as optional_system_roles,
       to_regprocedure('public.bes_v1099_current_role(uuid)') as optional_role_helper;
select auth.uid() as authenticated_user;
