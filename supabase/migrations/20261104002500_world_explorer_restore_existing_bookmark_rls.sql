-- Preserve pre-existing more restrictive bookmark publication visibility checks.
-- PostgreSQL permissive RLS policies combine by OR; remove only the new duplicates.
drop policy if exists world_explorer_bookmarks_own_select on public.world_explorer_bookmarks;
drop policy if exists world_explorer_bookmarks_own_insert on public.world_explorer_bookmarks;
drop policy if exists world_explorer_bookmarks_own_delete on public.world_explorer_bookmarks;
