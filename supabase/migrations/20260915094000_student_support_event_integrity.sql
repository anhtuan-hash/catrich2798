begin;

drop policy if exists student_support_case_events_insert_scope
on public.student_support_case_events;

create policy student_support_case_events_insert_scope
on public.student_support_case_events for insert
to authenticated
with check (
  actor_id = auth.uid()
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
          and n.author_id = auth.uid()
          and n.archived_at is null
      )
    )
  )
);

comment on policy student_support_case_events_insert_scope
on public.student_support_case_events is
'Managers may append fixed workflow events bound to the real case. Subject teachers may only append NOTE_CREATED for their own note on that case.';

commit;
