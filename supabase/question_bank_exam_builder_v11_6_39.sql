-- Brian v11.6.39 · Question Bank Exam Builder
-- Safe usage counter for bank-built exams. Security invoker respects assessment_items RLS.

create or replace function public.bes_assessment_increment_usage(p_item_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.assessment_items
  set usage_count = coalesce(usage_count, 0) + 1,
      updated_at = now()
  where owner_id = (select auth.uid())
    and id = any(coalesce(p_item_ids, array[]::uuid[]));
$$;

revoke all on function public.bes_assessment_increment_usage(uuid[]) from public;
grant execute on function public.bes_assessment_increment_usage(uuid[]) to authenticated;
grant execute on function public.bes_assessment_increment_usage(uuid[]) to service_role;
