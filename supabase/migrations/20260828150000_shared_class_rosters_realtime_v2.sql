-- Shared Class Rosters V2
-- Enable Supabase Realtime for the canonical class roster table.

alter table if exists public.bes_class_rosters replica identity full;

do $$
begin
  if to_regclass('public.bes_class_rosters') is null then
    return;
  end if;

  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
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

comment on table public.bes_class_rosters is
  'Shared, subject-independent class roster with Realtime updates. Subject notes and score-key student ids stay inside each teacher Gradebook.';
