-- V5.3: Optional exhibit focus for private class peer feedback.
-- Existing reviews remain valid as exhibition-wide comments (NULL).
-- Auth and group/lesson scope remain enforced in museum-live; no new public grants.
alter table public.museum_peer_live_feedback
 add column if not exists target_exhibit text;
do $$
begin
 if not exists(select 1 from pg_constraint
   where conname='museum_peer_live_feedback_target_exhibit_check'
     and conrelid='public.museum_peer_live_feedback'::regclass) then
  alter table public.museum_peer_live_feedback
    add constraint museum_peer_live_feedback_target_exhibit_check
    check (target_exhibit is null or target_exhibit in ('issue','evidence','solution'));
 end if;
end $$;
comment on column public.museum_peer_live_feedback.target_exhibit is
 'Optional original exhibit focus: issue/evidence/solution; NULL means overall exhibition. Only server-authorized Creator Pass write.';
