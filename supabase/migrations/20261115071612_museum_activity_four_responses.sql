-- Activity 4 includes a three-question NASA listening check.
-- Keep existing activity slots and require the documented three-answer format for Activity 4.
alter table public.museum_live_responses
  drop constraint museum_live_responses_stage_index_check,
  add constraint museum_live_responses_stage_index_check
  check (
    stage_index in (0, 1, 2, 7, 10)
    or (
      stage_index = 3
      and jsonb_typeof(value) = 'array'
      and jsonb_path_match(
        value,
        'strict $.size() == 3 && ($[0] == 0 || $[0] == 1 || $[0] == 2) && ($[1] == 0 || $[1] == 1 || $[1] == 2) && ($[2] == 0 || $[2] == 1 || $[2] == 2)',
        '{}', true
      ) is true
    )
  );
