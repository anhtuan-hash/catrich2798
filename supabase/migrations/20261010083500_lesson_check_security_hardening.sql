-- Lesson Check Studio hardening after production advisor review.
-- 1) Remove unintended anon EXECUTE from all Lesson Check SECURITY DEFINER functions.
-- 2) Split broad ALL policies so SELECT has only one permissive policy per table.
-- Safe to run repeatedly.

revoke execute on function public.lesson_check_is_leader() from anon;
revoke execute on function public.lesson_check_is_approved_user() from anon;
revoke execute on function public.lesson_check_has_activity_access(uuid) from anon;
revoke execute on function public.lesson_check_list_activities() from anon;
revoke execute on function public.lesson_check_get_activity_content(uuid) from anon;
revoke execute on function public.lesson_check_save_activity(uuid,text,text,smallint,smallint,text,text,text,text,text,text,text,text,text) from anon;
revoke execute on function public.lesson_check_delete_activity(uuid) from anon;
revoke execute on function public.lesson_check_request_access(uuid,text) from anon;
revoke execute on function public.lesson_check_list_access_requests() from anon;
revoke execute on function public.lesson_check_review_access_request(uuid,text) from anon;
revoke execute on function public.lesson_check_list_teacher_access(uuid) from anon;
revoke execute on function public.lesson_check_set_teacher_access(uuid,uuid,boolean) from anon;

drop policy if exists "TTCM can manage lesson check content" on public.lesson_check_activity_content;

create policy "TTCM can insert lesson check content"
  on public.lesson_check_activity_content
  for insert
  to authenticated
  with check (public.lesson_check_is_leader());

create policy "TTCM can update lesson check content"
  on public.lesson_check_activity_content
  for update
  to authenticated
  using (public.lesson_check_is_leader())
  with check (public.lesson_check_is_leader());

create policy "TTCM can delete lesson check content"
  on public.lesson_check_activity_content
  for delete
  to authenticated
  using (public.lesson_check_is_leader());

drop policy if exists "TTCM can manage lesson check grants" on public.lesson_check_activity_grants;

create policy "TTCM can insert lesson check grants"
  on public.lesson_check_activity_grants
  for insert
  to authenticated
  with check (public.lesson_check_is_leader());

create policy "TTCM can update lesson check grants"
  on public.lesson_check_activity_grants
  for update
  to authenticated
  using (public.lesson_check_is_leader())
  with check (public.lesson_check_is_leader());

create policy "TTCM can delete lesson check grants"
  on public.lesson_check_activity_grants
  for delete
  to authenticated
  using (public.lesson_check_is_leader());
