-- Brian app-wide hardening v11.9.0 · Sprint A
-- Critical auth/admin fix + explicit service-only RLS + search_path + duplicate indexes.

create table if not exists public.app_admin_allowlist (
  email text primary key check (email = lower(trim(email)) and position('@' in email) > 1),
  active boolean not null default true,
  note text not null default '',
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_admin_allowlist enable row level security;

revoke all on table public.app_admin_allowlist from public;
revoke all on table public.app_admin_allowlist from anon;
revoke all on table public.app_admin_allowlist from authenticated;
grant all on table public.app_admin_allowlist to service_role;

drop policy if exists app_admin_allowlist_deny_direct_v1190 on public.app_admin_allowlist;
create policy app_admin_allowlist_deny_direct_v1190
on public.app_admin_allowlist
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

insert into public.app_admin_allowlist(email,active,note,created_by)
select lower(trim(p.email)),true,'Seeded from existing approved admin profile',p.id
from public.profiles p
where p.approved=true
  and lower(coalesce(p.role,'')) in ('admin','administrator')
  and nullif(trim(p.email),'') is not null
on conflict (email) do update
set active=true,
    note=excluded.note,
    updated_at=now();

create or replace function public.bes_admin_claim_configured_admin(allowed_emails text[])
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $function$
declare
  current_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_allowed boolean := false;
begin
  -- IMPORTANT: allowed_emails is intentionally ignored. The client must never
  -- be able to choose who is an administrator.
  if auth.uid() is null or current_email = '' then
    return false;
  end if;

  select exists(
    select 1
    from public.app_admin_allowlist a
    where a.email=current_email
      and a.active=true
  ) into v_allowed;

  if not v_allowed then
    return false;
  end if;

  insert into public.profiles (
    id,email,full_name,school,role,approved,permissions,created_at,updated_at
  )
  values (
    auth.uid(),
    current_email,
    split_part(current_email,'@',1),
    '',
    'admin',
    true,
    '{"mode":"all","allowed":[]}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do update set
    email=excluded.email,
    role='admin',
    approved=true,
    permissions=coalesce(public.profiles.permissions,excluded.permissions),
    updated_at=now();

  return true;
end;
$function$;

revoke execute on function public.bes_admin_claim_configured_admin(text[]) from public;
revoke execute on function public.bes_admin_claim_configured_admin(text[]) from anon;
grant execute on function public.bes_admin_claim_configured_admin(text[]) to authenticated;
grant execute on function public.bes_admin_claim_configured_admin(text[]) to service_role;

revoke execute on function public.bes_admin_list_profiles() from public;
revoke execute on function public.bes_admin_list_profiles() from anon;
grant execute on function public.bes_admin_list_profiles() to authenticated;
grant execute on function public.bes_admin_list_profiles() to service_role;

revoke execute on function public.bes_admin_sync_missing_profiles() from public;
revoke execute on function public.bes_admin_sync_missing_profiles() from anon;
grant execute on function public.bes_admin_sync_missing_profiles() to authenticated;
grant execute on function public.bes_admin_sync_missing_profiles() to service_role;

revoke execute on function public.bes_admin_update_profile(uuid,jsonb) from public;
revoke execute on function public.bes_admin_update_profile(uuid,jsonb) from anon;
grant execute on function public.bes_admin_update_profile(uuid,jsonb) to authenticated;
grant execute on function public.bes_admin_update_profile(uuid,jsonb) to service_role;

alter function public.set_teacher_os_updated_at()
  set search_path = pg_catalog, public;
alter function public.bes_v1099_try_uuid(text)
  set search_path = pg_catalog, public;
alter function public.bes_v1099_normalize_role(text)
  set search_path = pg_catalog, public;
alter function public.bes_v1099_snapshot_tables(text)
  set search_path = pg_catalog, public;

do $$
declare
  t text;
  tables text[] := array[
    'bes_attendance_access_settings',
    'bes_attendance_archive',
    'bes_extra_class_archive',
    'bes_homeroom_portal_attempts',
    'bes_supplemental_attendance_record_changes',
    'bes_supplemental_group_memberships',
    'bes_supplemental_group_teachers',
    'bes_supplemental_groups',
    'bes_supplemental_session_participants',
    'bes_supplemental_sessions',
    'bes_supplemental_students',
    'resource_drive_connections'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on public.%I','deny_direct_client_v1190',t);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      'deny_direct_client_v1190',t
    );
  end loop;
end $$;

drop index if exists public.work_hub_comments_item_v1133;
drop index if exists public.work_hub_items_assignees_v1133;
drop index if exists public.work_hub_notifications_user_v1133;

comment on table public.app_admin_allowlist is
'Server-controlled allowlist for administrator bootstrap. Never sourced from client-provided email arrays.';
comment on function public.bes_admin_claim_configured_admin(text[]) is
'Claims admin only when the signed-in email is active in app_admin_allowlist. The legacy argument is ignored for backward compatibility.';
