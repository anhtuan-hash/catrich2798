-- Brian Focus global YouTube playlist; zero new tables/columns and same RLS.
-- Old youtube:VIDEO_ID values remain valid.
-- The text column is already capped at 512 characters.
BEGIN;
ALTER TABLE public.brian_focus_settings
  DROP CONSTRAINT IF EXISTS focus_media_consistency;
ALTER TABLE public.brian_focus_settings
  ADD CONSTRAINT focus_media_consistency CHECK (
    (media_type = 'default' AND media_path = '')
    OR (media_type IN ('image','video','html') AND media_path LIKE 'focus/%')
    OR (media_type = 'youtube'
      AND media_path ~ '^youtube:[A-Za-z0-9_-]{11}(,[A-Za-z0-9_-]{11}){0,29}$')
  );
COMMIT;
