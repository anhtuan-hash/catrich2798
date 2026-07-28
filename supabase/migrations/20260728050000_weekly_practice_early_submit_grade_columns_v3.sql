-- Brian English Studio: optional early submission and grade-column classification v3

-- Assign existing uploaded items to a grade column from their title when possible.
update public.weekly_practice_items
set grade = '10'
where title ~* '(tiếng[[:space:]]*anh|english)[[:space:]]*10';

update public.weekly_practice_items
set grade = '11'
where title ~* '(tiếng[[:space:]]*anh|english)[[:space:]]*11';

update public.weekly_practice_items
set grade = '12'
where title ~* '(tiếng[[:space:]]*anh|english)[[:space:]]*12';

alter table public.weekly_practice_items
  alter column grade set default '10';

-- Students may submit before 45 minutes. Duration is still stored for TTCM statistics.
alter table public.weekly_practice_results
  drop constraint if exists weekly_practice_result_minimum_duration;

alter table public.weekly_practice_results
  drop constraint if exists weekly_practice_result_non_negative_duration;

alter table public.weekly_practice_results
  add constraint weekly_practice_result_non_negative_duration
  check (duration_seconds is null or duration_seconds >= 0) not valid;

-- Replace the v2 guest insert policy without the former 2,700-second minimum.
drop policy if exists "Public can submit enabled weekly practice results" on public.weekly_practice_results;
create policy "Public can submit enabled weekly practice results"
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

comment on column public.weekly_practice_items.grade is
  'Weekly practice home column classification: 10, 11 or 12.';
