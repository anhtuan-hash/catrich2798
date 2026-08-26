-- Allow the Windows 8 Metro motion profile on an existing production table.
DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.brian_global_motion_settings') IS NULL THEN
    RETURN;
  END IF;
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.brian_global_motion_settings'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%preset%'
  LOOP
    EXECUTE format('ALTER TABLE public.brian_global_motion_settings DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE public.brian_global_motion_settings
    ADD CONSTRAINT brian_global_motion_settings_preset_check
    CHECK (preset IN ('off', 'subtle', 'balanced', 'windows8', 'expressive'));
END $$;
