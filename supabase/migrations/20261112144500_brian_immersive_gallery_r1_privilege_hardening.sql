-- BRIAN Gallery: explicit least-privilege GRANTs for all five R1 tables.
-- Supabase default role grants may be re-applied at table creation time.
-- TRUNCATE bypasses RLS, hence this separate post-creation migration.
revoke all privileges on table
 public.gallery_settings,
 public.gallery_exhibitions,
 public.gallery_rooms,
 public.gallery_assets,
 public.gallery_exhibits
from public, anon, authenticated;

grant select, update on table public.gallery_settings to authenticated;
grant select, insert, update on table public.gallery_exhibitions, public.gallery_rooms, public.gallery_exhibits to authenticated;
grant select, insert on table public.gallery_assets to authenticated;
