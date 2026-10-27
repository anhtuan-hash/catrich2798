-- Focus Interactive Web Scenes: additive schema, preserves existing YouTube RLS/data.
ALTER TABLE public.brian_focus_settings
 ADD COLUMN IF NOT EXISTS web_scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN IF NOT EXISTS web_layout text NOT NULL DEFAULT 'single';
ALTER TABLE public.brian_focus_settings
 DROP CONSTRAINT IF EXISTS brian_focus_settings_media_type_check;
ALTER TABLE public.brian_focus_settings
 ADD CONSTRAINT brian_focus_settings_media_type_check
 CHECK (media_type IN ('default','image','video','html','youtube','website'));
ALTER TABLE public.brian_focus_settings
 DROP CONSTRAINT IF EXISTS focus_media_consistency;
ALTER TABLE public.brian_focus_settings
 ADD CONSTRAINT focus_media_consistency CHECK (
  (media_type='default' AND media_path='')
  OR (media_type IN ('image','video','html') AND media_path LIKE 'focus/%')
  OR (media_type='youtube' AND media_path ~ '^youtube:[A-Za-z0-9_-]{11}(,[A-Za-z0-9_-]{11}){0,29}$')
  OR (media_type='website' AND media_path='')
 );
ALTER TABLE public.brian_focus_settings
 DROP CONSTRAINT IF EXISTS focus_web_scenes_valid,
 DROP CONSTRAINT IF EXISTS focus_web_layout_valid;
ALTER TABLE public.brian_focus_settings
 ADD CONSTRAINT focus_web_scenes_valid CHECK (
   jsonb_typeof(web_scenes)='array'
   AND jsonb_array_length(web_scenes) <= 30
   AND octet_length(web_scenes::text) <= 18000
 ),
 ADD CONSTRAINT focus_web_layout_valid CHECK(web_layout IN ('single','split','quad'));
