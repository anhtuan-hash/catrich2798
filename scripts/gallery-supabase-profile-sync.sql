-- Apply to the dedicated Gallery project after restoring its profiles table.
-- The main website remains the authority for sign-in and account approval.
CREATE OR REPLACE FUNCTION public.gallery_sync_brian_profile(
  p_id uuid, p_name text, p_school text, p_role text, p_approved boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Galleries reference Auth UUIDs. These rows carry no login credentials.
  INSERT INTO auth.users (
    id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  VALUES (
    p_id, 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, school, role, approved)
  VALUES (p_id, p_name, p_school, p_role, p_approved)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, school = EXCLUDED.school,
      role = EXCLUDED.role, approved = EXCLUDED.approved
  WHERE (profiles.full_name, profiles.school, profiles.role, profiles.approved)
    IS DISTINCT FROM (EXCLUDED.full_name, EXCLUDED.school, EXCLUDED.role, EXCLUDED.approved);
END;
$$;

REVOKE ALL ON FUNCTION public.gallery_sync_brian_profile(uuid, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gallery_sync_brian_profile(uuid, text, text, text, boolean)
  TO service_role;
