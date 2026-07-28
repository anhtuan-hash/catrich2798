-- Brian English Studio: repair weekly practice submission RLS after enabling early submission v4

begin;

-- Published practices must always accept result collection.
update public.weekly_practice_items
set collect_results = true
where status = 'published'
  and collect_results is distinct from true;

-- Remove every duration-related CHECK inherited from earlier migrations,
-- then keep only a non-negative duration rule.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select constraint_name.conname
    from pg_constraint constraint_name
    join pg_class table_name on table_name.oid = constraint_name.conrelid
    join pg_namespace schema_name on schema_name.oid = table_name.relnamespace
    where schema_name.nspname = 'public'
      and table_name.relname = 'weekly_practice_results'
      and constraint_name.contype = 'c'
      and pg_get_constraintdef(constraint_name.oid) ilike '%duration_seconds%'
  loop
    execute format(
      'alter table public.weekly_practice_results drop constraint if exists %I',
      constraint_row.conname
    );
  end loop;
end
$$;

alter table public.weekly_practice_results
  add constraint weekly_practice_result_non_negative_duration_v4
  check (duration_seconds is null or duration_seconds >= 0) not valid;

-- Remove every INSERT policy on the result table so no stale 45-minute
-- condition survives under another policy name.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'weekly_practice_results'
      and cmd = 'INSERT'
  loop
    execute format(
      'drop policy if exists %I on public.weekly_practice_results',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy "Public can submit weekly practice results v4"
on public.weekly_practice_results
for insert
to anon, authenticated
with check (
  char_length(btrim(student_name)) between 2 and 120
  and class_code in (
    '10.1','10.2','10.3','10.4','10.5','10.6','10.7','10.8','10.9','10.10','10.11','10.12',
    '11.1','11.2','11.3','11.4','11.5','11.6',
    '12.1','12.2','12.3','12.4','12.5','12.6','12.7','12.8','12.9'
  )
  and coalesce(duration_seconds, 0) >= 0
  and char_length(proof_path) between 1 and 500
  and proof_path like practice_id::text || '/%'
  and exists (
    select 1
    from public.weekly_practice_items item
    where item.id = practice_id
      and item.status = 'published'
      and item.collect_results = true
  )
);

grant insert on table public.weekly_practice_results to anon, authenticated;

comment on policy "Public can submit weekly practice results v4" on public.weekly_practice_results is
  'Allows confirmed weekly-practice submissions at any non-negative duration while requiring identity, class and private proof image.';

commit;
