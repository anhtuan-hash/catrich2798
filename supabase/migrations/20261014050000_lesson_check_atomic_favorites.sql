-- Assessment 4.2: atomic per-account favorite update.
-- Existing collections, runner, history and assessments are left untouched.
create or replace function public.lesson_check_set_favorite(
  p_activity uuid, p_favorite boolean
) returns uuid[]
language plpgsql security definer set search_path=public as $$
declare
  updated_favorites uuid[];
  user_key uuid := auth.uid();
begin
  if user_key is null or not public.lesson_check_is_approved_user() then
    raise exception 'Authentication and approved account required';
  end if;
  if p_activity is null or p_favorite is null or not exists (
    select 1 from public.lesson_check_activities where id=p_activity
  ) then
    raise exception 'Invalid activity or favorite preference';
  end if;

  insert into public.lesson_check_workspace_state(user_id,favorites,updated_at)
  values(user_key,case when p_favorite then array[p_activity] else '{}'::uuid[] end,now())
  on conflict(user_id) do update
    set favorites = case
       when p_favorite
         then case when p_activity=any(coalesce(lesson_check_workspace_state.favorites,'{}'::uuid[]))
           then lesson_check_workspace_state.favorites
           else array_append(coalesce(lesson_check_workspace_state.favorites,'{}'::uuid[]),p_activity)
         end
       else array_remove(coalesce(lesson_check_workspace_state.favorites,'{}'::uuid[]),p_activity)
       end,
       updated_at=now()
  returning favorites into updated_favorites;

  if cardinality(updated_favorites)>500 then
    raise exception 'Favorite limit reached (500 activities)';
  end if;
  return updated_favorites;
end; $$;
revoke all on function public.lesson_check_set_favorite(uuid,boolean) from public,anon;
grant execute on function public.lesson_check_set_favorite(uuid,boolean) to authenticated;
