-- Completed lesson exhibition lock. Schema-only: activation is a deliberate
-- separate UPDATE after the read-only frontend and APIs are deployed.
-- All guards apply to service_role and SECURITY DEFINER RPCs via triggers.
BEGIN;
ALTER TABLE public.gcp_assignments
 ADD COLUMN IF NOT EXISTS content_frozen_at timestamptz;
COMMENT ON COLUMN public.gcp_assignments.content_frozen_at IS
 'Non-null means original lesson, submissions, exhibits, scores and evidence are immutable. QR/passcode authentication and viewing remain available.';

CREATE OR REPLACE FUNCTION public.museum_assignment_of_row(p_scope text,p_row jsonb)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;
BEGIN
 IF p_row IS NULL THEN RETURN NULL; END IF;
 CASE p_scope
 WHEN 'assignment' THEN a := NULLIF(p_row->>'id','')::uuid;
 WHEN 'direct' THEN a := NULLIF(p_row->>'assignment_id','')::uuid;
 WHEN 'group' THEN
   SELECT g.assignment_id INTO a FROM public.gcp_groups g
    WHERE g.id=NULLIF(p_row->>'group_id','')::uuid;
 WHEN 'review' THEN
   SELECT g.assignment_id INTO a FROM public.gcp_reviews r
    JOIN public.gcp_groups g ON g.id=r.group_id
    WHERE r.id=NULLIF(p_row->>'review_id','')::uuid;
 WHEN 'session' THEN
   SELECT s.assignment_id INTO a FROM public.museum_live_sessions s
    WHERE s.id=NULLIF(p_row->>'session_id','')::uuid;
 WHEN 'peerroom' THEN
   SELECT s.assignment_id INTO a FROM public.museum_peer_live_rooms r
    JOIN public.museum_live_sessions s ON s.id=r.session_id
    WHERE r.id=NULLIF(p_row->>'room_id','')::uuid;
 WHEN 'exhibition' THEN
   SELECT g.assignment_id INTO a FROM public.gcp_publication_links l
    JOIN public.gcp_groups g ON g.id=l.group_id
    WHERE l.exhibition_id=NULLIF(p_row->>'id','')::uuid LIMIT 1;
 WHEN 'galleryroom' THEN
   SELECT g.assignment_id INTO a FROM public.gcp_publication_links l
    JOIN public.gcp_groups g ON g.id=l.group_id
    WHERE l.exhibition_id=NULLIF(p_row->>'exhibition_id','')::uuid LIMIT 1;
 WHEN 'galleryexhibit' THEN
   SELECT g.assignment_id INTO a FROM public.gallery_rooms r
    JOIN public.gcp_publication_links l ON l.exhibition_id=r.exhibition_id
    JOIN public.gcp_groups g ON g.id=l.group_id
    WHERE r.id=NULLIF(p_row->>'room_id','')::uuid LIMIT 1;
 WHEN 'publishedlink' THEN
   SELECT g.assignment_id INTO a FROM public.gcp_reviews r
    JOIN public.gcp_groups g ON g.id=r.group_id
    WHERE r.id=NULLIF(p_row->>'review_id','')::uuid LIMIT 1;
 WHEN 'galleryasset' THEN
   SELECT g.assignment_id INTO a FROM public.museum_publication_asset_links l
    JOIN public.gcp_reviews r ON r.id=l.review_id
    JOIN public.gcp_groups g ON g.id=r.group_id
    WHERE l.gallery_asset_id=NULLIF(p_row->>'id','')::uuid LIMIT 1;
 WHEN 'storage' THEN
   IF p_row->>'bucket_id'='museum-artwork-private' THEN
    SELECT m.assignment_id INTO a FROM public.museum_artwork_assets m
     WHERE m.storage_path=p_row->>'name' LIMIT 1;
   ELSIF p_row->>'bucket_id'='brian-gallery-private' THEN
    SELECT g.assignment_id INTO a FROM public.gallery_assets asset
     JOIN public.museum_publication_asset_links l ON l.gallery_asset_id=asset.id
     JOIN public.gcp_reviews r ON r.id=l.review_id
     JOIN public.gcp_groups g ON g.id=r.group_id
     WHERE asset.path=p_row->>'name' LIMIT 1;
   END IF;
 END CASE;
 RETURN a;
END
$fn$;

CREATE OR REPLACE FUNCTION public.museum_block_frozen_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE old_a uuid; new_a uuid; is_frozen boolean;
BEGIN
 IF TG_OP <> 'INSERT' THEN
   old_a:=public.museum_assignment_of_row(TG_ARGV[0],to_jsonb(OLD));
 END IF;
 IF TG_OP <> 'DELETE' THEN
   new_a:=public.museum_assignment_of_row(TG_ARGV[0],to_jsonb(NEW));
 END IF;
 SELECT EXISTS(
  SELECT 1 FROM public.gcp_assignments a
  WHERE a.content_frozen_at IS NOT NULL
   AND (a.id=old_a OR a.id=new_a)
 ) INTO is_frozen;
 IF is_frozen THEN
   -- Allow only security-related failed-attempt counters, not passcode/handle
   -- rotations; these counters are required for working legacy QR sign-ins.
   IF TG_TABLE_SCHEMA='public' AND TG_TABLE_NAME='gcp_invites' AND TG_OP='UPDATE'
    AND to_jsonb(OLD)-'failed_attempts'-'locked_until'
      =to_jsonb(NEW)-'failed_attempts'-'locked_until' THEN
     RETURN NEW;
   END IF;
   RAISE EXCEPTION USING ERRCODE='P0001',
     MESSAGE='Completed lesson is read-only; changes to its content, access settings or evidence are prohibited.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END
$fn$;

REVOKE ALL ON FUNCTION public.museum_assignment_of_row(text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.museum_block_frozen_changes() FROM PUBLIC,anon,authenticated;

DO $triggers$
DECLARE rule text[];
BEGIN
 FOREACH rule SLICE 1 IN ARRAY ARRAY[
  ARRAY['gcp_assignments','assignment'],
  ARRAY['gcp_groups','direct'],
  ARRAY['gcp_drafts','group'],
  ARRAY['gcp_reviews','group'],
  ARRAY['gcp_rubric_scores','review'],
  ARRAY['gcp_review_events','review'],
  ARRAY['gcp_invites','group'],
  ARRAY['gcp_quick_access','direct'],
  ARRAY['gcp_publication_links','group'],
  ARRAY['museum_artwork_assets','direct'],
  ARRAY['museum_live_sessions','direct'],
  ARRAY['museum_live_responses','session'],
  ARRAY['museum_checkpoints','session'],
  ARRAY['museum_survey_snapshots','session'],
  ARRAY['museum_learning_events','session'],
  ARRAY['museum_peer_pairs','session'],
  ARRAY['museum_peer_reviews','session'],
  ARRAY['museum_live_micro_responses','session'],
  ARRAY['museum_peer_live_rooms','session'],
  ARRAY['museum_peer_live_feedback','peerroom'],
  ARRAY['museum_presentation_data_provenance','direct'],
  ARRAY['museum_presentation_rewrite_archive','direct'],
  ARRAY['museum_publication_asset_links','publishedlink'],
  ARRAY['gallery_exhibitions','exhibition'],
  ARRAY['gallery_rooms','galleryroom'],
  ARRAY['gallery_exhibits','galleryexhibit'],
  ARRAY['gallery_assets','galleryasset']
 ] LOOP
   EXECUTE format('DROP TRIGGER IF EXISTS museum_completed_readonly ON public.%I',rule[1]);
   EXECUTE format('CREATE TRIGGER museum_completed_readonly BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.museum_block_frozen_changes(%L)',rule[1],rule[2]);
 END LOOP;
END
$triggers$;

-- Protect already approved original and published image bytes from overwrite
-- or removal, including through privileged Storage API calls.
DROP TRIGGER IF EXISTS museum_completed_readonly ON storage.objects;
CREATE TRIGGER museum_completed_readonly
 BEFORE UPDATE OR DELETE ON storage.objects
 FOR EACH ROW EXECUTE FUNCTION public.museum_block_frozen_changes('storage');
COMMIT;
