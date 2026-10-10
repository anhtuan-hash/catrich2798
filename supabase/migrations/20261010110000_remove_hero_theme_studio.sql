-- Retire Hero Theme Studio V1 completely.
-- IMPORTANT: this migration deliberately does NOT touch the separate homepage Hero CMS,
-- its public/hero static artifacts, homepage_hero_* tables/functions, or publish handlers.

drop function if exists public.hero_theme_public_manifest();
drop function if exists public.hero_theme_publish_draft(uuid);
drop function if exists public.hero_theme_restore_revision(uuid);

drop table if exists public.hero_theme_active;
drop table if exists public.hero_theme_revisions;
drop table if exists public.hero_theme_drafts;
drop table if exists public.hero_theme_media;
drop table if exists public.hero_theme_sets;

drop function if exists public.hero_theme_is_admin();
