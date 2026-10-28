-- Photo Story V2: support the two new two-frame cinematic transition modes.
-- No albums or slides are modified; RLS and grants remain unchanged.
alter table public.bes_slideshow_albums
  drop constraint if exists bes_slideshow_albums_transition_check;
alter table public.bes_slideshow_albums
  add constraint bes_slideshow_albums_transition_check
  check (transition in ('fade', 'slide', 'zoom', 'reveal', 'blur'));
