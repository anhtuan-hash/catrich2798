
-- Brian app-wide hardening v11.9.0 · Sprint F2
-- Keep approved custom games public while moving every authenticated-only
-- branch and all writes to the authenticated role.

drop policy if exists "Custom games visible to approved users" on public.custom_game_platforms;
drop policy if exists custom_games_anon_read_v1190 on public.custom_game_platforms;
drop policy if exists custom_games_authenticated_read_v1190 on public.custom_game_platforms;

create policy custom_games_anon_read_v1190
on public.custom_game_platforms
as permissive for select to anon
using (status='approved');

create policy custom_games_authenticated_read_v1190
on public.custom_game_platforms
as permissive for select to authenticated
using (
  status='approved'
  or owner_id=(select auth.uid())
  or can_publish_department()
);

drop policy if exists "Teachers can create own custom games" on public.custom_game_platforms;
create policy "Teachers can create own custom games"
on public.custom_game_platforms
as permissive for insert to authenticated
with check (
  owner_id=(select auth.uid())
  and is_approved_profile()
  and (status in ('private','pending') or can_publish_department())
);

drop policy if exists "Teachers can delete own unapproved custom games" on public.custom_game_platforms;
create policy "Teachers can delete own unapproved custom games"
on public.custom_game_platforms
as permissive for delete to authenticated
using (
  (owner_id=(select auth.uid()) and status<>'approved')
  or can_publish_department()
);

drop policy if exists consolidated_custom_game_platforms_update_47e4c189_v1190 on public.custom_game_platforms;
create policy custom_games_update_v1190
on public.custom_game_platforms
as permissive for update to authenticated
using (
  can_publish_department()
  or (owner_id=(select auth.uid()) and status<>'approved')
)
with check (
  can_publish_department()
  or (owner_id=(select auth.uid()) and status in ('private','pending'))
);
