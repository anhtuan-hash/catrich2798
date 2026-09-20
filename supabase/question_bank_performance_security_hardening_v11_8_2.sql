-- Brian Question Bank v11.8.2
-- Performance and security hardening after Quality Control rollout.

create index if not exists assessment_exam_batches_blueprint_idx
  on public.assessment_exam_batches(blueprint_id);

create index if not exists assessment_practice_share_tokens_practice_idx
  on public.assessment_practice_share_tokens(practice_id);

create index if not exists assessment_test_items_item_idx
  on public.assessment_test_items(item_id);

create index if not exists assessment_tests_blueprint_idx
  on public.assessment_tests(blueprint_id);

alter policy assessment_blueprints_write_v1093
  on public.assessment_blueprints
  using (
    owner_id = (select auth.uid())
    or public.bes_v1093_is_leader((select auth.uid()))
  )
  with check (
    owner_id = (select auth.uid())
    or public.bes_v1093_is_leader((select auth.uid()))
  );

alter policy assessment_items_delete_v1093
  on public.assessment_items
  using (
    owner_id = (select auth.uid())
    or public.bes_v1093_is_leader((select auth.uid()))
  );

alter policy assessment_items_insert_v1093
  on public.assessment_items
  with check (
    owner_id = (select auth.uid())
  );

alter policy assessment_items_update_v1093
  on public.assessment_items
  using (
    owner_id = (select auth.uid())
    or public.bes_v1093_is_leader((select auth.uid()))
  )
  with check (
    owner_id = (select auth.uid())
    or public.bes_v1093_is_leader((select auth.uid()))
  );

alter policy assessment_test_items_read_v1093
  on public.assessment_test_items
  using (
    exists (
      select 1
      from public.assessment_tests t
      where t.id = assessment_test_items.test_id
        and (
          t.owner_id = (select auth.uid())
          or t.visibility = 'department'
          or public.bes_v1093_is_leader((select auth.uid()))
        )
    )
  );

alter policy assessment_test_items_write_v1093
  on public.assessment_test_items
  using (
    exists (
      select 1
      from public.assessment_tests t
      where t.id = assessment_test_items.test_id
        and (
          t.owner_id = (select auth.uid())
          or public.bes_v1093_is_leader((select auth.uid()))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.assessment_tests t
      where t.id = assessment_test_items.test_id
        and (
          t.owner_id = (select auth.uid())
          or public.bes_v1093_is_leader((select auth.uid()))
        )
    )
  );

alter policy assessment_tests_write_v1093
  on public.assessment_tests
  using (
    owner_id = (select auth.uid())
    or public.bes_v1093_is_leader((select auth.uid()))
  )
  with check (
    owner_id = (select auth.uid())
    or public.bes_v1093_is_leader((select auth.uid()))
  );

-- Internal helper: it is used by SECURITY DEFINER trigger/report functions and
-- must not be callable directly by a signed-in user with another user's UUID.
revoke execute on function public.qb_current_department_id(uuid) from public;
revoke execute on function public.qb_current_department_id(uuid) from anon;
revoke execute on function public.qb_current_department_id(uuid) from authenticated;
grant execute on function public.qb_current_department_id(uuid) to service_role;
