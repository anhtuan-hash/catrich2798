-- Brian English Studio V11.4.2 preflight
-- Safe read-only checks before applying the lesson integration migration.

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Missing public.profiles. Run the Brian base schema before V11.4.2.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='id'
  ) then
    raise exception 'public.profiles.id is required.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='role'
  ) then
    raise exception 'public.profiles.role is required.';
  end if;
end $$;

select 'V11.4.2 preflight passed' as result;
