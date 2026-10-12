-- Detect an actual change to the Auth password hash, not a client claim.
-- No account content or existing credentials are modified by this migration.
CREATE OR REPLACE FUNCTION public.bes_track_auth_password_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE public.profiles
       SET must_change_password = false,
           updated_at = now()
     WHERE id = NEW.id AND must_change_password = true;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bes_track_auth_password_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS bes_track_password_change ON auth.users;
CREATE TRIGGER bes_track_password_change
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
  EXECUTE FUNCTION public.bes_track_auth_password_change();
