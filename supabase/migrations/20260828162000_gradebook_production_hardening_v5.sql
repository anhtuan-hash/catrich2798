-- Gradebook production hardening V5
-- Final cleanup after dedicated Gradebook, shared roster, Realtime and history migrations.

-- Reassert Realtime configuration idempotently.
alter table if exists public.bes_class_rosters replica identity full;

do $$
begin
  if to_regclass('public.bes_class_rosters') is null then
    return;
  end if;

  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bes_class_rosters'
  ) then
    execute 'alter publication supabase_realtime add table public.bes_class_rosters';
  end if;
end
$$;

-- Keep history useful without allowing unbounded growth. Authenticated users still
-- cannot delete history directly; retention is performed only by this trigger owner.
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

  delete from public.bes_class_roster_history h
  where h.roster_key = new.roster_key
    and h.id not in (
      select keep.id
      from public.bes_class_roster_history keep
      where keep.roster_key = new.roster_key
      order by keep.changed_at desc, keep.id desc
      limit 120
    );

  return new;
end;
$$;

-- Old department-scoped policy helpers are no longer used by V3 canonical roster policies.
drop function if exists public.bes_can_access_class_roster_v2(text, uuid, text);
drop function if exists public.bes_can_access_class_roster(uuid, text, text);
drop function if exists public.bes_has_class_assignment(text, text);

-- Infrastructure-only health check. It exposes no student or score data.
create or replace function public.bes_gradebook_health()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok',
      to_regclass('public.bes_gradebook_workspaces') is not null
      and to_regclass('public.bes_class_rosters') is not null
      and to_regclass('public.bes_class_roster_history') is not null,
    'gradebook_table', to_regclass('public.bes_gradebook_workspaces') is not null,
    'roster_table', to_regclass('public.bes_class_rosters') is not null,
    'history_table', to_regclass('public.bes_class_roster_history') is not null,
    'current_school_year', public.bes_current_school_year(),
    'realtime_enabled', exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'bes_class_rosters'
    ),
    'roster_policy_count', (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'bes_class_rosters'
    ),
    'history_policy_count', (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'bes_class_roster_history'
    ),
    'history_trigger', exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'bes_class_rosters'
        and t.tgname = 'bes_class_rosters_history_trigger'
        and not t.tgisinternal
    )
  );
$$;

grant execute on function public.bes_gradebook_health() to authenticated;

comment on function public.bes_gradebook_health() is
  'Infrastructure-only Gradebook health check: dedicated storage, shared roster, history, RLS and Realtime readiness.';
