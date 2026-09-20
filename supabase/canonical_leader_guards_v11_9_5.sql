
-- Brian v11.9.5 · Canonical leader guard hardening
-- Consolidate legacy leader/admin compatibility predicates onto one
-- identity-neutral database role resolver.

create or replace function private.bes_is_app_leader(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
  select target_user is not null and (
    exists (
      select 1
      from public.system_roles sr
      where sr.user_id = target_user
        and sr.active = true
        and lower(btrim(coalesce(sr.role,''))) in (
          'admin','administrator','superadmin','super_admin',
          'ttcm','leader','head','manager',
          'department_head','department-head','department_leader','department leader',
          'to_truong','to truong','tổ trưởng',
          'subject_leader','subject leader'
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = target_user
        and p.approved = true
        and lower(btrim(coalesce(p.role,''))) in (
          'admin','administrator','superadmin','super_admin',
          'ttcm','leader','head','manager',
          'department_head','department-head','department_leader','department leader',
          'to_truong','to truong','tổ trưởng',
          'subject_leader','subject leader'
        )
    )
  );
$function$;

revoke all on function private.bes_is_app_leader(uuid) from public, anon, authenticated;
grant execute on function private.bes_is_app_leader(uuid) to service_role;

create or replace function public.bes_v1093_is_leader(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

create or replace function public.bes_v1094_is_leader(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

create or replace function public.bes_v1096_is_leader(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

create or replace function public.bes_v1097_is_leader(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

create or replace function public.bes_v1098_is_leader(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

create or replace function public.knowledge_is_leader(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

create or replace function public.resource_is_leader(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(p_user_id); $function$;

create or replace function public.thpt_practice_is_manager(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

create or replace function public.work_hub_is_leader(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

create or replace function public.bes_v1237_is_ai_admin(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $function$ select private.bes_is_app_leader(target_user); $function$;

do $block$
declare
  fn regprocedure;
begin
  foreach fn in array array[
    'public.bes_v1093_is_leader(uuid)'::regprocedure,
    'public.bes_v1094_is_leader(uuid)'::regprocedure,
    'public.bes_v1096_is_leader(uuid)'::regprocedure,
    'public.bes_v1097_is_leader(uuid)'::regprocedure,
    'public.bes_v1098_is_leader(uuid)'::regprocedure,
    'public.knowledge_is_leader(uuid)'::regprocedure,
    'public.resource_is_leader(uuid)'::regprocedure,
    'public.thpt_practice_is_manager(uuid)'::regprocedure,
    'public.work_hub_is_leader(uuid)'::regprocedure,
    'public.bes_v1237_is_ai_admin(uuid)'::regprocedure
  ]
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end
$block$;
