-- Preserve YouTube playlist when switching BRIAN Focus between web scenes and other media.
ALTER TABLE public.brian_focus_settings
 ADD COLUMN IF NOT EXISTS youtube_playlist_backup text NOT NULL DEFAULT '';
UPDATE public.brian_focus_settings SET youtube_playlist_backup = media_path
 WHERE media_type='youtube'
 AND media_path ~ '^youtube:[A-Za-z0-9_-]{11}(,[A-Za-z0-9_-]{11}){0,29}$'
 AND youtube_playlist_backup='';
ALTER TABLE public.brian_focus_settings
 DROP CONSTRAINT IF EXISTS focus_youtube_backup_valid;
ALTER TABLE public.brian_focus_settings
 ADD CONSTRAINT focus_youtube_backup_valid
 CHECK (youtube_playlist_backup='' OR
   youtube_playlist_backup ~ '^youtube:[A-Za-z0-9_-]{11}(,[A-Za-z0-9_-]{11}){0,29}$');
