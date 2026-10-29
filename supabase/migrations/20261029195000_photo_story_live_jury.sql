-- BRIAN Photo Story Live Jury: admin can hide public score aggregates.
-- Opted-in because this album's owner approved a public anonymous live scoreboard.
alter table public.bes_judging_sessions
  add column if not exists public_live_enabled boolean not null default true;
comment on column public.bes_judging_sessions.public_live_enabled is
  'Admin-controlled visibility of anonymous, submitted-only public jury statistics. Min 3 submitted judges per artwork.';
