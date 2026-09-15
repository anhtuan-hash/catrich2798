begin;

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.student_support_workspace_class_name(p_workspace_id text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(w.class_name, '')
  from public.bes_homeroom_workspaces w
  where w.workspace_id = p_workspace_id
    and w.archived_at is null
  order by case when w.owner_id = auth.uid() then 0 else 1 end, w.updated_at desc
  limit 1;
$$;

create or replace function private.student_support_is_workspace_owner(p_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.bes_homeroom_workspaces w
    where w.workspace_id = p_workspace_id
      and w.owner_id = auth.uid()
      and w.archived_at is null
  );
$$;

create or replace function private.student_support_is_department_head_for_workspace(p_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.bes_homeroom_workspaces w
    join public.department_teacher_sync d on d.teacher_id = w.owner_id
    where w.workspace_id = p_workspace_id
      and d.department_head_id = auth.uid()
      and w.archived_at is null
  );
$$;

create or replace function private.student_support_can_read_workspace(p_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and (
    public.is_admin()
    or private.student_support_is_workspace_owner(p_workspace_id)
    or private.student_support_is_department_head_for_workspace(p_workspace_id)
  );
$$;

create or replace function private.student_support_can_manage_workspace(p_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and (
    public.is_admin()
    or private.student_support_is_workspace_owner(p_workspace_id)
  );
$$;

create or replace function private.student_support_is_teaching_team_for_workspace(p_workspace_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_class_name text;
begin
  if auth.uid() is null then return false; end if;
  select private.student_support_workspace_class_name(p_workspace_id) into v_class_name;
  if coalesce(trim(v_class_name), '') = '' then return false; end if;
  return public.bes_has_any_class_assignment(v_class_name);
end;
$$;

revoke all on function private.student_support_workspace_class_name(text) from public;
revoke all on function private.student_support_is_workspace_owner(text) from public;
revoke all on function private.student_support_is_department_head_for_workspace(text) from public;
revoke all on function private.student_support_can_read_workspace(text) from public;
revoke all on function private.student_support_can_manage_workspace(text) from public;
revoke all on function private.student_support_is_teaching_team_for_workspace(text) from public;
grant execute on function private.student_support_workspace_class_name(text) to authenticated;
grant execute on function private.student_support_is_workspace_owner(text) to authenticated;
grant execute on function private.student_support_is_department_head_for_workspace(text) to authenticated;
grant execute on function private.student_support_can_read_workspace(text) to authenticated;
grant execute on function private.student_support_can_manage_workspace(text) to authenticated;
grant execute on function private.student_support_is_teaching_team_for_workspace(text) to authenticated;

alter table public.student_support_rules enable row level security;
alter table public.student_support_alerts enable row level security;
alter table public.student_support_cases enable row level security;
alter table public.student_support_actions enable row level security;
alter table public.student_support_notes enable row level security;
alter table public.student_support_teacher_observations enable row level security;
alter table public.student_support_family_contacts enable row level security;
alter table public.student_support_case_events enable row level security;

revoke all on table public.student_support_rules from anon, authenticated;
revoke all on table public.student_support_alerts from anon, authenticated;
revoke all on table public.student_support_cases from anon, authenticated;
revoke all on table public.student_support_actions from anon, authenticated;
revoke all on table public.student_support_notes from anon, authenticated;
revoke all on table public.student_support_teacher_observations from anon, authenticated;
revoke all on table public.student_support_family_contacts from anon, authenticated;
revoke all on table public.student_support_case_events from anon, authenticated;

grant select, insert, update on table public.student_support_rules to authenticated;
grant select, insert, update on table public.student_support_alerts to authenticated;
grant select, insert, update on table public.student_support_cases to authenticated;
grant select, insert, update on table public.student_support_actions to authenticated;
grant select, insert, update on table public.student_support_notes to authenticated;
grant select, insert, update on table public.student_support_teacher_observations to authenticated;
grant select, insert, update on table public.student_support_family_contacts to authenticated;
grant select, insert on table public.student_support_case_events to authenticated;

create policy student_support_rules_select
on public.student_support_rules for select
to authenticated
using (enabled = true or public.is_admin());

create policy student_support_rules_insert_admin
on public.student_support_rules for insert
to authenticated
with check (public.is_admin());

create policy student_support_rules_update_admin
on public.student_support_rules for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy student_support_cases_select_scope
on public.student_support_cases for select
to authenticated
using (private.student_support_can_read_workspace(homeroom_workspace_id));

create policy student_support_cases_insert_manager
on public.student_support_cases for insert
to authenticated
with check (
  private.student_support_can_manage_workspace(homeroom_workspace_id)
  and (public.is_admin() or created_by = auth.uid())
);

create policy student_support_cases_update_manager
on public.student_support_cases for update
to authenticated
using (private.student_support_can_manage_workspace(homeroom_workspace_id))
with check (private.student_support_can_manage_workspace(homeroom_workspace_id));

create policy student_support_alerts_select_scope
on public.student_support_alerts for select
to authenticated
using (private.student_support_can_read_workspace(homeroom_workspace_id));

create policy student_support_alerts_insert_manager
on public.student_support_alerts for insert
to authenticated
with check (private.student_support_can_manage_workspace(homeroom_workspace_id));

create policy student_support_alerts_update_manager
on public.student_support_alerts for update
to authenticated
using (private.student_support_can_manage_workspace(homeroom_workspace_id))
with check (private.student_support_can_manage_workspace(homeroom_workspace_id));

create policy student_support_actions_select_scope
on public.student_support_actions for select
to authenticated
using (
  private.student_support_can_read_workspace(homeroom_workspace_id)
  or assigned_to = auth.uid()
);

create policy student_support_actions_insert_manager
on public.student_support_actions for insert
to authenticated
with check (private.student_support_can_manage_workspace(homeroom_workspace_id));

create policy student_support_actions_update_scope
on public.student_support_actions for update
to authenticated
using (
  private.student_support_can_manage_workspace(homeroom_workspace_id)
  or assigned_to = auth.uid()
)
with check (
  private.student_support_can_manage_workspace(homeroom_workspace_id)
  or assigned_to = auth.uid()
);

create policy student_support_notes_select_visibility
on public.student_support_notes for select
to authenticated
using (
  public.is_admin()
  or author_id = auth.uid()
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

create policy student_support_notes_insert_authorized
on public.student_support_notes for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    private.student_support_can_manage_workspace(homeroom_workspace_id)
    or private.student_support_is_teaching_team_for_workspace(homeroom_workspace_id)
  )
);

create policy student_support_notes_update_author
on public.student_support_notes for update
to authenticated
using (public.is_admin() or author_id = auth.uid())
with check (public.is_admin() or author_id = auth.uid());

create policy student_support_observations_select_scope
on public.student_support_teacher_observations for select
to authenticated
using (
  teacher_id = auth.uid()
  or (
    submitted_to_homeroom = true
    and private.student_support_can_read_workspace(homeroom_workspace_id)
  )
);

create policy student_support_observations_insert_scope
on public.student_support_teacher_observations for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and (
    private.student_support_is_workspace_owner(homeroom_workspace_id)
    or public.bes_has_any_class_assignment(source_class_name)
    or public.is_admin()
  )
);

create policy student_support_observations_update_scope
on public.student_support_teacher_observations for update
to authenticated
using (public.is_admin() or teacher_id = auth.uid() or private.student_support_is_workspace_owner(homeroom_workspace_id))
with check (public.is_admin() or teacher_id = auth.uid() or private.student_support_is_workspace_owner(homeroom_workspace_id));

create policy student_support_contacts_select_private_scope
on public.student_support_family_contacts for select
to authenticated
using (public.is_admin() or private.student_support_is_workspace_owner(homeroom_workspace_id));

create policy student_support_contacts_insert_private_scope
on public.student_support_family_contacts for insert
to authenticated
with check (
  contacted_by = auth.uid()
  and (public.is_admin() or private.student_support_is_workspace_owner(homeroom_workspace_id))
);

create policy student_support_contacts_update_private_scope
on public.student_support_family_contacts for update
to authenticated
using (public.is_admin() or contacted_by = auth.uid() or private.student_support_is_workspace_owner(homeroom_workspace_id))
with check (public.is_admin() or contacted_by = auth.uid() or private.student_support_is_workspace_owner(homeroom_workspace_id));

create policy student_support_case_events_select_scope
on public.student_support_case_events for select
to authenticated
using (private.student_support_can_read_workspace(homeroom_workspace_id));

create policy student_support_case_events_insert_scope
on public.student_support_case_events for insert
to authenticated
with check (
  actor_id = auth.uid()
  and (
    private.student_support_can_manage_workspace(homeroom_workspace_id)
    or private.student_support_is_teaching_team_for_workspace(homeroom_workspace_id)
  )
);

create or replace function public.bes_search_student_support_students(
  p_query text default '',
  p_limit integer default 30
)
returns table (
  student_ref text,
  code text,
  full_name text,
  workspace_id text,
  class_name text,
  school_year text,
  grade text,
  homeroom_owner_id uuid
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
  v_limit integer := greatest(1, least(50, coalesce(p_limit, 30)));
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    coalesce(nullif(trim(s.student_ref), ''), case when trim(coalesce(s.code, '')) <> '' then 'code:' || trim(s.code) else '' end) as student_ref,
    coalesce(s.code, '') as code,
    coalesce(s.full_name, '') as full_name,
    s.workspace_id,
    coalesce(w.class_name, '') as class_name,
    coalesce(w.school_year, '') as school_year,
    coalesce(w.payload -> 'classProfile' ->> 'grade', '') as grade,
    w.owner_id as homeroom_owner_id
  from public.bes_homeroom_students s
  join public.bes_homeroom_workspaces w
    on w.owner_id = s.owner_id
   and w.workspace_id = s.workspace_id
  where s.archived_at is null
    and coalesce(s.lifecycle_status, 'active') <> 'archived'
    and w.archived_at is null
    and (
      public.is_admin()
      or w.owner_id = auth.uid()
      or exists (
        select 1
        from public.department_teacher_sync d
        where d.teacher_id = w.owner_id
          and d.department_head_id = auth.uid()
      )
      or public.bes_has_any_class_assignment(w.class_name)
    )
    and (
      v_query = ''
      or lower(coalesce(s.full_name, '')) like '%' || v_query || '%'
      or lower(coalesce(s.code, '')) like '%' || v_query || '%'
      or lower(coalesce(w.class_name, '')) like '%' || v_query || '%'
    )
    and coalesce(nullif(trim(s.student_ref), ''), nullif('code:' || trim(coalesce(s.code, '')), 'code:')) is not null
  order by lower(coalesce(w.class_name, '')), lower(coalesce(s.full_name, '')), lower(coalesce(s.code, ''))
  limit v_limit;
end;
$$;

revoke all on function public.bes_search_student_support_students(text, integer) from public;
revoke all on function public.bes_search_student_support_students(text, integer) from anon;
grant execute on function public.bes_search_student_support_students(text, integer) to authenticated;

commit;
