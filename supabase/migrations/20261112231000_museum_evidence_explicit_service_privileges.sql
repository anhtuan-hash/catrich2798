-- Supabase projects may grant ALL to service_role through default privileges.
-- Reset inherited grants explicitly so immutable evidence cannot be updated.
revoke all on public.museum_survey_snapshots,public.museum_checkpoints,public.museum_peer_pairs,public.museum_peer_reviews from service_role;
grant select,insert,delete on public.museum_survey_snapshots,public.museum_checkpoints,public.museum_peer_pairs,public.museum_peer_reviews to service_role;
