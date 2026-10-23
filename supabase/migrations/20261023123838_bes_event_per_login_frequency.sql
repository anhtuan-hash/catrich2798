-- Applied to ESL Brian Supabase on 2026-10-23.
-- New event frequency: once per real Supabase authentication session.
ALTER TABLE public.bes_events DROP CONSTRAINT IF EXISTS bes_events_frequency_check;
ALTER TABLE public.bes_events ADD CONSTRAINT bes_events_frequency_check
  CHECK (frequency IN ('once', 'daily', 'until_ack', 'per_login'));
COMMENT ON COLUMN public.bes_events.frequency IS
  'once = once per event version; daily = daily until acknowledged; until_ack = on Dashboard until acknowledged; per_login = once per Auth session even if previously acknowledged';
