begin;

create or replace function private.student_support_guard_case_bound_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.case_id is distinct from new.case_id
       or old.student_ref is distinct from new.student_ref
       or old.homeroom_workspace_id is distinct from new.homeroom_workspace_id then
      raise exception 'Student Support case binding is immutable';
    end if;

    if tg_table_name = 'student_support_actions'
       and old.created_by is distinct from new.created_by then
      raise exception 'Student Support action creator is immutable';
    end if;

    if tg_table_name = 'student_support_notes'
       and old.author_id is distinct from new.author_id then
      raise exception 'Student Support note author is immutable';
    end if;

    if tg_table_name = 'student_support_family_contacts'
       and old.contacted_by is distinct from new.contacted_by then
      raise exception 'Student Support family-contact actor is immutable';
    end if;
  end if;

  if not exists (
    select 1
    from public.student_support_cases c
    where c.id = new.case_id
      and c.student_ref = new.student_ref
      and c.homeroom_workspace_id = new.homeroom_workspace_id
      and c.archived_at is null
  ) then
    raise exception 'Student Support row must match an active case identity';
  end if;

  return new;
end;
$$;

revoke all on function private.student_support_guard_case_bound_identity() from public;
revoke all on function private.student_support_guard_case_bound_identity() from anon;
revoke all on function private.student_support_guard_case_bound_identity() from authenticated;

drop trigger if exists student_support_actions_guard_identity on public.student_support_actions;
create trigger student_support_actions_guard_identity
before insert or update on public.student_support_actions
for each row execute function private.student_support_guard_case_bound_identity();

drop trigger if exists student_support_notes_guard_identity on public.student_support_notes;
create trigger student_support_notes_guard_identity
before insert or update on public.student_support_notes
for each row execute function private.student_support_guard_case_bound_identity();

drop trigger if exists student_support_contacts_guard_identity on public.student_support_family_contacts;
create trigger student_support_contacts_guard_identity
before insert or update on public.student_support_family_contacts
for each row execute function private.student_support_guard_case_bound_identity();

create or replace function private.student_support_guard_alert_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    old.student_ref is distinct from new.student_ref
    or old.homeroom_workspace_id is distinct from new.homeroom_workspace_id
    or old.rule_id is distinct from new.rule_id
    or old.rule_version is distinct from new.rule_version
    or old.dedupe_key is distinct from new.dedupe_key
    or old.first_triggered_at is distinct from new.first_triggered_at
  ) then
    raise exception 'Student Support alert identity is immutable';
  end if;

  if new.linked_case_id is not null and not exists (
    select 1
    from public.student_support_cases c
    where c.id = new.linked_case_id
      and c.student_ref = new.student_ref
      and c.homeroom_workspace_id = new.homeroom_workspace_id
      and c.archived_at is null
  ) then
    raise exception 'Student Support alert may only link to a matching active case';
  end if;

  return new;
end;
$$;

revoke all on function private.student_support_guard_alert_identity() from public;
revoke all on function private.student_support_guard_alert_identity() from anon;
revoke all on function private.student_support_guard_alert_identity() from authenticated;

drop trigger if exists student_support_alerts_guard_identity on public.student_support_alerts;
create trigger student_support_alerts_guard_identity
before insert or update on public.student_support_alerts
for each row execute function private.student_support_guard_alert_identity();

create or replace function private.student_support_guard_observation_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    old.student_ref is distinct from new.student_ref
    or old.homeroom_workspace_id is distinct from new.homeroom_workspace_id
    or old.source_workspace_id is distinct from new.source_workspace_id
    or old.source_class_name is distinct from new.source_class_name
    or old.teacher_id is distinct from new.teacher_id
  ) then
    raise exception 'Student Support observation identity is immutable';
  end if;

  return new;
end;
$$;

revoke all on function private.student_support_guard_observation_identity() from public;
revoke all on function private.student_support_guard_observation_identity() from anon;
revoke all on function private.student_support_guard_observation_identity() from authenticated;

drop trigger if exists student_support_observations_guard_identity on public.student_support_teacher_observations;
create trigger student_support_observations_guard_identity
before update on public.student_support_teacher_observations
for each row execute function private.student_support_guard_observation_identity();

commit;
