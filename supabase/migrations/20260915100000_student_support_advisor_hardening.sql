begin;

create index if not exists student_support_actions_case_fk_idx
  on public.student_support_actions (case_id);
create index if not exists student_support_actions_created_by_idx
  on public.student_support_actions (created_by);
create index if not exists student_support_alerts_assigned_to_idx
  on public.student_support_alerts (assigned_to);
create index if not exists student_support_alerts_linked_case_idx
  on public.student_support_alerts (linked_case_id);
create index if not exists student_support_alerts_rule_idx
  on public.student_support_alerts (rule_id);
create index if not exists student_support_case_events_actor_idx
  on public.student_support_case_events (actor_id);
create index if not exists student_support_cases_created_by_idx
  on public.student_support_cases (created_by);
create index if not exists student_support_cases_owner_idx
  on public.student_support_cases (owner_id);
create index if not exists student_support_family_contacts_actor_idx
  on public.student_support_family_contacts (contacted_by);
create index if not exists student_support_notes_author_idx
  on public.student_support_notes (author_id);
create index if not exists student_support_rules_created_by_idx
  on public.student_support_rules (created_by);
create index if not exists student_support_observations_teacher_idx
  on public.student_support_teacher_observations (teacher_id);

drop policy if exists student_support_cases_insert_manager
on public.student_support_cases;
create policy student_support_cases_insert_manager
on public.student_support_cases for insert
to authenticated
with check (
  private.student_support_can_manage_workspace(homeroom_workspace_id)
  and (public.is_admin() or created_by = (select auth.uid()))
);

drop policy if exists student_support_actions_select_scope
on public.student_support_actions;
create policy student_support_actions_select_scope
on public.student_support_actions for select
to authenticated
using (
  private.student_support_can_read_workspace(homeroom_workspace_id)
  or assigned_to = (select auth.uid())
);

drop policy if exists student_support_actions_update_scope
on public.student_support_actions;
create policy student_support_actions_update_scope
on public.student_support_actions for update
to authenticated
using (
  private.student_support_can_manage_workspace(homeroom_workspace_id)
  or assigned_to = (select auth.uid())
)
with check (
  private.student_support_can_manage_workspace(homeroom_workspace_id)
  or assigned_to = (select auth.uid())
);

drop policy if exists student_support_notes_select_visibility
on public.student_support_notes;
create policy student_support_notes_select_visibility
on public.student_support_notes for select
to authenticated
using (
  public.is_admin()
  or author_id = (select auth.uid())
  or (
    visibility_scope = 'HOMEROOM'
    and private.student_support_is_workspace_owner(homeroom_workspace_id)
  )
  or (
    visibility_scope = 'TEACHING_TEAM'
    and (
      private.student_support_is_workspace_owner(homeroom_workspace_id)
      or private.student_support_is_teaching_team_for_workspace(homeroom_workspace_id)
    )
  )
  or (
    visibility_scope = 'MANAGEMENT'
    and (
      private.student_support_is_workspace_owner(homeroom_workspace_id)
      or private.student_support_is_department_head_for_workspace(homeroom_workspace_id)
    )
  )
);

drop policy if exists student_support_notes_insert_authorized
on public.student_support_notes;
create policy student_support_notes_insert_authorized
on public.student_support_notes for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    private.student_support_can_manage_workspace(homeroom_workspace_id)
    or private.student_support_is_teaching_team_for_workspace(homeroom_workspace_id)
  )
);

drop policy if exists student_support_notes_update_author
on public.student_support_notes;
create policy student_support_notes_update_author
on public.student_support_notes for update
to authenticated
using (public.is_admin() or author_id = (select auth.uid()))
with check (public.is_admin() or author_id = (select auth.uid()));

drop policy if exists student_support_observations_select_scope
on public.student_support_teacher_observations;
create policy student_support_observations_select_scope
on public.student_support_teacher_observations for select
to authenticated
using (
  teacher_id = (select auth.uid())
  or (
    submitted_to_homeroom = true
    and private.student_support_can_read_workspace(homeroom_workspace_id)
  )
);

drop policy if exists student_support_observations_insert_scope
on public.student_support_teacher_observations;
create policy student_support_observations_insert_scope
on public.student_support_teacher_observations for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and (
    private.student_support_is_workspace_owner(homeroom_workspace_id)
    or public.bes_has_any_class_assignment(source_class_name)
    or public.is_admin()
  )
);

drop policy if exists student_support_observations_update_scope
on public.student_support_teacher_observations;
create policy student_support_observations_update_scope
on public.student_support_teacher_observations for update
to authenticated
using (
  public.is_admin()
  or teacher_id = (select auth.uid())
  or private.student_support_is_workspace_owner(homeroom_workspace_id)
)
with check (
  public.is_admin()
  or teacher_id = (select auth.uid())
  or private.student_support_is_workspace_owner(homeroom_workspace_id)
);

drop policy if exists student_support_contacts_insert_private_scope
on public.student_support_family_contacts;
create policy student_support_contacts_insert_private_scope
on public.student_support_family_contacts for insert
to authenticated
with check (
  contacted_by = (select auth.uid())
  and (public.is_admin() or private.student_support_is_workspace_owner(homeroom_workspace_id))
);

drop policy if exists student_support_contacts_update_private_scope
on public.student_support_family_contacts;
create policy student_support_contacts_update_private_scope
on public.student_support_family_contacts for update
to authenticated
using (
  public.is_admin()
  or contacted_by = (select auth.uid())
  or private.student_support_is_workspace_owner(homeroom_workspace_id)
)
with check (
  public.is_admin()
  or contacted_by = (select auth.uid())
  or private.student_support_is_workspace_owner(homeroom_workspace_id)
);

drop policy if exists student_support_case_events_insert_scope
on public.student_support_case_events;
create policy student_support_case_events_insert_scope
on public.student_support_case_events for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and event_type in (
    'CASE_CREATED',
    'CASE_STATUS_CHANGED',
    'ACTION_CREATED',
    'ACTION_STATUS_CHANGED',
    'NOTE_CREATED',
    'FAMILY_CONTACT_LOGGED',
    'CASE_ARCHIVED',
    'CASE_RESTORED'
  )
  and exists (
    select 1
    from public.student_support_cases c
    where c.id = student_support_case_events.case_id
      and c.student_ref = student_support_case_events.student_ref
      and c.homeroom_workspace_id = student_support_case_events.homeroom_workspace_id
      and c.archived_at is null
  )
  and (
    private.student_support_can_manage_workspace(homeroom_workspace_id)
    or (
      event_type = 'NOTE_CREATED'
      and private.student_support_is_teaching_team_for_workspace(homeroom_workspace_id)
      and exists (
        select 1
        from public.student_support_notes n
        where n.id::text = coalesce(metadata ->> 'note_id', '')
          and n.case_id = student_support_case_events.case_id
          and n.student_ref = student_support_case_events.student_ref
          and n.homeroom_workspace_id = student_support_case_events.homeroom_workspace_id
          and n.author_id = (select auth.uid())
          and n.archived_at is null
      )
    )
  )
);

comment on policy student_support_case_events_insert_scope
on public.student_support_case_events is
'Managers may append fixed workflow events bound to the real case. Subject teachers may only append NOTE_CREATED for their own note on that case.';

commit;
