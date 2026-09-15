begin;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_support_cases_category_nonempty'
      and conrelid = 'public.student_support_cases'::regclass
  ) then
    alter table public.student_support_cases
      add constraint student_support_cases_category_nonempty
      check (length(trim(category)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'student_support_cases_title_nonempty'
      and conrelid = 'public.student_support_cases'::regclass
  ) then
    alter table public.student_support_cases
      add constraint student_support_cases_title_nonempty
      check (length(trim(title)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'student_support_actions_title_nonempty'
      and conrelid = 'public.student_support_actions'::regclass
  ) then
    alter table public.student_support_actions
      add constraint student_support_actions_title_nonempty
      check (length(trim(title)) > 0);
  end if;
end
$$;

commit;
