-- Shared Class Rosters V4
-- Append-only history and permission-aware restore for canonical/shared rosters.

create table if not exists public.bes_class_roster_history (
  id bigint generated always as identity primary key,
  roster_key text not null,
  class_name text not null default '',
  school_year text not null default '',
  grade text not null default '',
  action text not null default 'update',
  students jsonb not null default '[]'::jsonb,
  source_updated_at timestamptz,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  constraint bes_class_roster_history_students_array
    check (jsonb_typeof(students) = 'array'),
  constraint bes_class_roster_history_action
    check (action in ('create', 'update', 'restore', 'seed'))
);

create index if not exists bes_class_roster_history_key_time_idx
  on public.bes_class_roster_history (roster_key, changed_at desc, id desc);

create index if not exists bes_class_roster_history_actor_time_idx
  on public.bes_class_roster_history (changed_by, changed_at desc);

create or replace function public.bes_capture_class_roster_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  history_action text := 'update';
begin
  if tg_op = 'INSERT' then
    history_action := 'create';
  else
    history_action := nullif(current_setting('bes.roster_history_action', true), '');
    if history_action not in ('update', 'restore') then
      history_action := 'update';
    end if;
  end if;

  insert into public.bes_class_roster_history (
    roster_key,
    class_name,
    school_year,
    grade,
    action,
    students,
    source_updated_at,
    changed_by,
    changed_at
  ) values (
    new.roster_key,
    coalesce(new.class_name, ''),
    coalesce(new.school_year, ''),
    coalesce(new.grade, ''),
    history_action,
    coalesce(new.students, '[]'::jsonb),
    new.updated_at,
    coalesce(new.updated_by, auth.uid()),
    now()
  );

  return new;
end;
$$;

drop trigger if exists bes_class_rosters_history_trigger on public.bes_class_rosters;
create trigger bes_class_rosters_history_trigger
after insert or update on public.bes_class_rosters
for each row execute function public.bes_capture_class_roster_history();

-- Seed one initial snapshot for rows that pre-date V4.
insert into public.bes_class_roster_history (
  roster_key,
  class_name,
  school_year,
  grade,
  action,
  students,
  source_updated_at,
  changed_by,
  changed_at
)
select
  r.roster_key,
  coalesce(r.class_name, ''),
  coalesce(r.school_year, ''),
  coalesce(r.grade, ''),
  'seed',
  coalesce(r.students, '[]'::jsonb),
  r.updated_at,
  coalesce(r.updated_by, r.created_by),
  coalesce(r.updated_at, r.created_at, now())
from public.bes_class_rosters r
where not exists (
  select 1
  from public.bes_class_roster_history h
  where h.roster_key = r.roster_key
);

alter table public.bes_class_roster_history enable row level security;

drop policy if exists "bes_class_roster_history_select" on public.bes_class_roster_history;
create policy "bes_class_roster_history_select"
  on public.bes_class_roster_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bes_class_rosters r
      where r.roster_key = bes_class_roster_history.roster_key
        and public.bes_can_access_class_roster_v3(
          r.roster_key,
          r.created_by,
          r.class_name,
          r.school_year
        )
    )
  );

revoke insert, update, delete on public.bes_class_roster_history from authenticated;
grant select on public.bes_class_roster_history to authenticated;

create or replace function public.bes_restore_class_roster(
  p_roster_key text,
  p_history_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.bes_class_rosters%rowtype;
  history_row public.bes_class_roster_history%rowtype;
  restored_row public.bes_class_rosters%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_row
  from public.bes_class_rosters
  where roster_key = p_roster_key
  for update;

  if not found then
    raise exception 'Roster not found';
  end if;

  if not public.bes_can_access_class_roster_v3(
    current_row.roster_key,
    current_row.created_by,
    current_row.class_name,
    current_row.school_year
  ) then
    raise exception 'Roster access denied';
  end if;

  select * into history_row
  from public.bes_class_roster_history
  where id = p_history_id
    and roster_key = p_roster_key;

  if not found then
    raise exception 'Roster history snapshot not found';
  end if;

  perform set_config('bes.roster_history_action', 'restore', true);

  update public.bes_class_rosters
  set
    students = history_row.students,
    updated_by = auth.uid(),
    updated_at = now()
  where roster_key = p_roster_key
  returning * into restored_row;

  return jsonb_build_object(
    'ok', true,
    'roster_key', restored_row.roster_key,
    'students', restored_row.students,
    'updated_at', restored_row.updated_at,
    'updated_by', restored_row.updated_by,
    'restored_from_history_id', p_history_id
  );
end;
$$;

grant execute on function public.bes_restore_class_roster(text, bigint) to authenticated;

comment on table public.bes_class_roster_history is
  'Append-only snapshots of shared class rosters. Authenticated teachers can read only rosters they currently own or are assigned to; restore is performed through bes_restore_class_roster().';