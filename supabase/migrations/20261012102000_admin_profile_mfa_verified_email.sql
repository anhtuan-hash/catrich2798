-- Keep Admin role/approval changes behind the same verified second-factor
-- requirement as account management API actions. Existing Admins without a
-- registered factor remain usable (staged rollout); no factor or role mutations.
-- The helper lives in private (unexposed) and returns only an authorization boolean.
CREATE OR REPLACE FUNCTION private.bes_admin_mfa_session_allowed()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND (
      coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
      OR NOT EXISTS (
        SELECT 1
        FROM auth.mfa_factors AS f
        WHERE f.user_id = auth.uid()
          AND f.status = 'verified'
      )
    );
$function$;

REVOKE ALL ON FUNCTION private.bes_admin_mfa_session_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bes_admin_mfa_session_allowed() TO authenticated;

-- AAL1 Administrators must not bypass the MFA modal by directly updating
-- public.profiles over the Data API. Reuse the existing approved Admin predicate.
ALTER POLICY "Admins can update all profiles"
ON public.profiles
USING (public.is_admin() AND private.bes_admin_mfa_session_allowed())
WITH CHECK (public.is_admin() AND private.bes_admin_mfa_session_allowed());

-- SECURITY DEFINER RPCs bypass RLS; defend this privilege-changing RPC too.
-- Log only actor/target IDs and boolean change categories, never patch values.
CREATE OR REPLACE FUNCTION public.bes_admin_update_profile(target_id uuid, patch jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_updated integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admin can update profiles.' using errcode = '42501';
  end if;
  if not private.bes_admin_mfa_session_allowed() then
    raise exception 'MFA verification is required before changing user permissions.' using errcode = '42501';
  end if;

  update public.profiles
  set
    role = coalesce(nullif(patch->>'role', ''), role),
    approved = coalesce((patch->>'approved')::boolean, approved),
    permissions = coalesce(patch->'permissions', permissions),
    full_name = coalesce(nullif(patch->>'full_name', ''), full_name),
    school = coalesce(nullif(patch->>'school', ''), school),
    updated_at = now()
  where id = target_id;
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    begin
      insert into public.api_security_events
        (actor_id,actor_role,endpoint,action,status,details)
      values
        (auth.uid(),'admin','rpc/bes_admin_update_profile','admin_profile_update','ok',
         jsonb_build_object(
           'target_id',target_id,
           'changed_role',coalesce(patch ? 'role',false),
           'changed_approval',coalesce(patch ? 'approved',false),
           'changed_permissions',coalesce(patch ? 'permissions',false)
         ));
    exception when others then
      -- Audit is best-effort: an audit-table outage must not leave an admin
      -- edit half-applied, or change previous RPC response behavior.
      raise warning 'Admin profile update audit unavailable';
    end;
  end if;
end;
$function$;

-- Admin bootstrap is deliberately restricted to a SERVER-VERIFIED email,
-- not merely the email claim inside an otherwise valid signed JWT.
-- allowed_emails is intentionally ignored to prevent caller-driven elevation.
CREATE OR REPLACE FUNCTION public.bes_admin_claim_configured_admin(allowed_emails text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_catalog'
AS $function$
declare
  current_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_allowed boolean := false;
  v_verified boolean := false;
begin
  if auth.uid() is null or current_email = '' then
    return false;
  end if;

  select exists(
    select 1
    from auth.users u
    where u.id=auth.uid()
      and lower(coalesce(u.email,''))=current_email
      and u.email_confirmed_at is not null
  ) into v_verified;
  if not v_verified then
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
