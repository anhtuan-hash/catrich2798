-- Halloween 2026 Awards: administrators may publish a live snapshot before 15:15.
-- All existing snapshots remain immutable; only the INSERT validity check changes.
-- The API always uses 50% jury + 50% audience, counts all saved judge
-- scores (including unfinished ballots), and assigns 0 for unscored artwork.
create or replace function public.bes_halloween_awards_2026_guard()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if tg_op='INSERT' then
  if new.album_id <> 'e1fc3295-2c5d-4e05-8538-b9a7aeef5a67'::uuid
   or new.status <> 'frozen'
   or new.cutoff_at > clock_timestamp()
   or jsonb_typeof(new.snapshot) <> 'array'
   or jsonb_array_length(new.snapshot) <> 18
   or new.judge_count < 0
   or new.vote_count < 0
   then raise exception 'Invalid Halloween awards snapshot'; end if;
  return new;
 end if;
 if old.status <> 'frozen' or new.status <> 'published'
  or new.snapshot is distinct from old.snapshot
  or new.judge_count is distinct from old.judge_count
  or new.vote_count is distinct from old.vote_count
  or new.album_id is distinct from old.album_id
  or new.cutoff_at is distinct from old.cutoff_at
  or new.frozen_at is distinct from old.frozen_at
  then raise exception 'Frozen award rankings cannot be edited'; end if;
 new.published_at := clock_timestamp();
 return new;
end $fn$;
revoke all on function public.bes_halloween_awards_2026_guard() from public,anon,authenticated;