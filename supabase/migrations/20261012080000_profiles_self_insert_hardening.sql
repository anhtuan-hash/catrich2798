-- 2026-10-12: fail closed for self-created BRIAN profiles.
-- Approved and privileged profiles are created only by trusted server-side
-- administration or allowlist-verified SECURITY DEFINER flows.
-- This does not modify existing accounts, roles, passwords, or data.
ALTER POLICY "Users can insert their own profile"
ON public.profiles
WITH CHECK (
  (SELECT auth.uid()) = id
  AND role = 'teacher'
  AND approved = false
  AND permissions = '{"mode":"all","allowed":[]}'::jsonb
);

-- Check afterwards:
-- SELECT polname, pg_get_expr(polwithcheck,polrelid)
-- FROM pg_policy WHERE polrelid='public.profiles'::regclass
-- AND polname='Users can insert their own profile';
