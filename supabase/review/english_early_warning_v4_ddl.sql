-- REVIEW-ONLY SCHEMA PROPOSAL; DO NOT AUTO-APPLY.
-- Convert into a timestamped migration using "supabase migration new"
-- after school authorization, independent security review and staging tests.
-- No real student names/codes, narrative notes, or crosswalks belong here.
begin;

do $guard$
begin
  if to_regprocedure('public.bes_has_any_class_assignment(text)') is null then
    raise exception 'Required teacher assignment function is absent; do not enable EW cloud sync';
  end if;
end;
$guard$;

create schema if not exists private;

create or replace function private.brian_ew_score_valid(v jsonb, allow_null boolean default false)
returns boolean
language plpgsql immutable
set search_path = pg_catalog, private
as $$
begin
  if v is null or v = 'null'::jsonb then return allow_null; end if;
  if jsonb_typeof(v) <> 'number' then return false; end if;
  return (v::text)::numeric between 0 and 100;
exception when others then return false;
end;
$$;

create or replace function private.brian_ew_snapshot_valid(p jsonb)
returns boolean
language plpgsql immutable
set search_path = pg_catalog, private
as $$
declare
  learner jsonb;
  item jsonb;
  detail jsonb;
  skill text;
  field text;
  allowed_fields text[];
  codes text[] := array[]::text[];
  code text;
  n_assigned int;
  n_completed int;
  n_week int;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if jsonb_typeof(p->'schemaVersion') <> 'number'
    or (p->>'schemaVersion') <> '1' then return false; end if;
  for field in select jsonb_object_keys(p) loop
    if field not in ('schemaVersion','learners','reviews','entries') then return false; end if;
  end loop;
  if jsonb_typeof(p->'learners') <> 'array'
    or jsonb_typeof(p->'reviews') <> 'array'
    or jsonb_typeof(p->'entries') <> 'array' then return false; end if;
  if jsonb_array_length(p->'learners') not between 1 and 120
    or jsonb_array_length(p->'reviews') > 120
    or jsonb_array_length(p->'entries') > 960 then return false; end if;

  for learner in select value from jsonb_array_elements(p->'learners') loop
    if jsonb_typeof(learner) <> 'object' then return false; end if;
    for field in select jsonb_object_keys(learner) loop
      if field not in ('studentId','scores','post','recent1','recent2','missing14d') then return false; end if;
    end loop;
    code := learner->>'studentId';
    if code is null or code !~ '^P[0-9]{3,6}$' or code = any(codes) then return false; end if;
    codes := array_append(codes,code);
    if jsonb_typeof(learner->'scores') <> 'object' or jsonb_typeof(learner->'post') <> 'object' then return false; end if;
    for skill in select jsonb_object_keys(learner->'scores') loop
      if skill not in ('listening','speaking','reading','writing') then return false; end if;
    end loop;
    for skill in select jsonb_object_keys(learner->'post') loop
      if skill not in ('listening','speaking','reading','writing') then return false; end if;
    end loop;
    foreach skill in array array['listening','speaking','reading','writing'] loop
      if not private.brian_ew_score_valid(learner->'scores'->skill,false)
        or not private.brian_ew_score_valid(learner->'post'->skill,true) then return false; end if;
    end loop;
    if not private.brian_ew_score_valid(learner->'recent1',true)
      or not private.brian_ew_score_valid(learner->'recent2',true) then return false; end if;
    detail := learner->'missing14d';
    if detail is not null and detail <> 'null'::jsonb then
      if jsonb_typeof(detail) <> 'number'
        or (detail::text) !~ '^[0-9]{1,3}$'
        or (detail::text)::int > 100 then return false; end if;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p->'reviews') loop
    if jsonb_typeof(item) <> 'object' or not (item->>'studentId' = any(codes)) then return false; end if;
    for field in select jsonb_object_keys(item) loop
      if field not in ('studentId','decision','reviewedAt') then return false; end if;
    end loop;
    if item->>'decision' not in ('confirmed','not_confirmed')
      or coalesce(item->>'reviewedAt','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T' then return false; end if;
  end loop;

  for item in select value from jsonb_array_elements(p->'entries') loop
    if jsonb_typeof(item) <> 'object' or not (item->>'studentId' = any(codes)) then return false; end if;
    for field in select jsonb_object_keys(item) loop
      if field not in ('studentId','week','skill','assigned','completed','checkpointScore','observedOn','recordedAt','sequence') then return false; end if;
    end loop;
    if coalesce(item->>'week','') !~ '^[1-8]$' then return false; end if;
    n_week := (item->>'week')::int;
    if item->>'skill' not in ('listening','speaking','reading','writing') then return false; end if;
    if coalesce(item->>'assigned','') !~ '^([1-9]|1[0-9]|20)$' then return false; end if;
    if coalesce(item->>'completed','') !~ '^([0-9]|1[0-9]|20)$' then return false; end if;
    n_assigned := (item->>'assigned')::int;
    n_completed := (item->>'completed')::int;
    if n_completed > n_assigned then return false; end if;
    if not private.brian_ew_score_valid(item->'checkpointScore',true) then return false; end if;
    if coalesce(item->>'observedOn','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      or coalesce(item->>'recordedAt','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T' then return false; end if;
    if coalesce(item->>'sequence','') !~ '^[1-9][0-9]{0,2}$'
      or (item->>'sequence')::int > 960 then return false; end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function private.brian_ew_score_valid(jsonb, boolean) from public;
revoke all on function private.brian_ew_snapshot_valid(jsonb) from public;
-- CHECK expressions execute under the writing role; these validators hold no data.
grant execute on function private.brian_ew_score_valid(jsonb, boolean) to authenticated;
grant execute on function private.brian_ew_snapshot_valid(jsonb) to authenticated;

create table if not exists public.brian_english_ew_snapshots (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  class_name text not null check (char_length(class_name) between 2 and 60 and class_name !~ '[<>@]'),
  school_year text not null check (school_year ~ '^20[0-9]{2}-20[0-9]{2}$'),
  rule_version text not null default '0.1' check (rule_version='0.1'),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint brian_ew_payload_size check (octet_length(payload::text) <= 160000),
  constraint brian_ew_payload_structure check (private.brian_ew_snapshot_valid(payload)),
  primary key (owner_id,class_name,school_year)
);

create or replace function private.brian_ew_set_updated_at()
returns trigger language plpgsql set search_path=pg_catalog,private as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.brian_ew_set_updated_at() from public;
drop trigger if exists brian_ew_snapshots_updated on public.brian_english_ew_snapshots;
create trigger brian_ew_snapshots_updated before update
on public.brian_english_ew_snapshots for each row
execute function private.brian_ew_set_updated_at();

alter table public.brian_english_ew_snapshots enable row level security;
alter table public.brian_english_ew_snapshots force row level security;
revoke all on table public.brian_english_ew_snapshots from public,anon,authenticated;
grant select,insert,update,delete on table public.brian_english_ew_snapshots to authenticated;

create policy brian_ew_owner_read on public.brian_english_ew_snapshots
for select to authenticated using (owner_id = (select auth.uid()));

create policy brian_ew_verified_teacher_insert on public.brian_english_ew_snapshots
for insert to authenticated
with check (owner_id = (select auth.uid()) and public.bes_has_any_class_assignment(class_name));

create policy brian_ew_verified_teacher_update on public.brian_english_ew_snapshots
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()) and public.bes_has_any_class_assignment(class_name));

create policy brian_ew_owner_delete on public.brian_english_ew_snapshots
for delete to authenticated using (owner_id = (select auth.uid()));

comment on table public.brian_english_ew_snapshots is
  'Owner-isolated, coded English research pilot snapshot; no personal names, crosswalks or narrative notes. Enable only after authorized RLS QA.';
commit;
