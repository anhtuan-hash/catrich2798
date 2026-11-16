BEGIN;

CREATE OR REPLACE FUNCTION public.museum_block_frozen_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE old_a uuid; new_a uuid; assignment_row record;
BEGIN
 IF TG_OP <> 'INSERT' THEN
   old_a:=public.museum_assignment_of_row(TG_ARGV[0],to_jsonb(OLD));
 END IF;
 IF TG_OP <> 'DELETE' THEN
   new_a:=public.museum_assignment_of_row(TG_ARGV[0],to_jsonb(NEW));
 END IF;

 -- Only the freeze marker may be cleared on a finalized assignment.
 -- Assignment writes and the lifecycle RPC are restricted to service_role.
 IF TG_ARGV[0]='assignment' AND TG_OP='UPDATE'
   AND (to_jsonb(OLD)->>'content_frozen_at') IS NOT NULL
   AND (to_jsonb(NEW)->>'content_frozen_at') IS NULL
   AND to_jsonb(OLD)-'content_frozen_at'=to_jsonb(NEW)-'content_frozen_at' THEN
   RETURN NEW;
 END IF;

 IF TG_ARGV[0]='assignment' THEN
   -- This trigger already runs under the assignment row's write lock.
   IF TG_OP='INSERT' OR (to_jsonb(OLD)->>'content_frozen_at') IS NULL THEN
     IF TG_OP='DELETE' THEN RETURN OLD; END IF;
     RETURN NEW;
   END IF;
 ELSE
   -- Hold the assignment lock through commit. A concurrent write either
   -- finishes before completion or observes the marker and rolls back.
   FOR assignment_row IN
     SELECT id,content_frozen_at FROM public.gcp_assignments
      WHERE id=old_a OR id=new_a ORDER BY id FOR KEY SHARE
   LOOP
     IF assignment_row.content_frozen_at IS NULL THEN CONTINUE; END IF;

     -- Preserve failed-attempt limits for QR/passcode sign-in.
     IF TG_TABLE_SCHEMA='public' AND TG_TABLE_NAME='gcp_invites' AND TG_OP='UPDATE'
       AND to_jsonb(OLD)-'failed_attempts'-'locked_until'
         =to_jsonb(NEW)-'failed_attempts'-'locked_until' THEN
       RETURN NEW;
     END IF;
     RAISE EXCEPTION 'museum_lesson_frozen' USING ERRCODE='P0001';
   END LOOP;
   IF TG_OP='DELETE' THEN RETURN OLD; END IF;
   RETURN NEW;
 END IF;

 RAISE EXCEPTION 'museum_lesson_frozen' USING ERRCODE='P0001';
END
$fn$;

CREATE FUNCTION public.museum_set_lesson_completion(
 p_assignment uuid,p_actor uuid,p_complete boolean,p_version integer,p_frozen_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
 lesson public.gcp_assignments%ROWTYPE;
 live public.museum_live_sessions%ROWTYPE;
 changed_at timestamptz;
BEGIN
 -- Some live writes hold the session row, while some evidence writes
 -- acquire the assignment lock first. Retry instead of waiting on both.
 BEGIN
   SELECT * INTO live FROM public.museum_live_sessions
    WHERE assignment_id=p_assignment FOR UPDATE NOWAIT;
   SELECT * INTO lesson FROM public.gcp_assignments
    WHERE id=p_assignment FOR UPDATE NOWAIT;
 EXCEPTION WHEN lock_not_available THEN
   RAISE EXCEPTION 'version_conflict' USING ERRCODE='P0001';
 END;
 IF lesson.id IS NULL OR lesson.archived_at IS NOT NULL OR lesson.status<>'active' THEN
   RAISE EXCEPTION 'assignment_closed' USING ERRCODE='P0001';
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM public.profiles p
    WHERE p.id=p_actor AND p.approved=true AND p.school=lesson.school_scope
      AND (lesson.created_by=p.id OR lower(p.role)='admin')
 ) THEN
   RAISE EXCEPTION 'museum_lesson_staff_required' USING ERRCODE='42501';
 END IF;

 IF p_complete THEN
   IF lesson.content_frozen_at IS NOT NULL THEN
     RETURN jsonb_build_object('contentFrozenAt',lesson.content_frozen_at,'session',to_jsonb(live));
   END IF;
   IF live.id IS NULL THEN
     RAISE EXCEPTION 'museum_live_session_missing' USING ERRCODE='P0001';
   END IF;
   IF live.version IS DISTINCT FROM p_version THEN
     RAISE EXCEPTION 'version_conflict' USING ERRCODE='P0001';
   END IF;

   changed_at:=clock_timestamp();
   UPDATE public.museum_live_sessions SET status='ended',stage_open=false,
     elapsed_seconds=CASE WHEN status='active' THEN LEAST(7200,elapsed_seconds+
        GREATEST(0, floor(extract(epoch FROM (changed_at-stage_started_at)))::integer))
        ELSE elapsed_seconds END,
     version=version+1,updated_at=changed_at
    WHERE id=live.id RETURNING * INTO live;
   INSERT INTO public.museum_learning_events(session_id,actor_role,action,stage_index)
    VALUES(live.id,'teacher','stage_end',live.stage_index);
   UPDATE public.gcp_assignments SET content_frozen_at=changed_at
    WHERE id=p_assignment RETURNING * INTO lesson;
 ELSE
   IF lesson.content_frozen_at IS NULL THEN
     RETURN jsonb_build_object('contentFrozenAt',NULL,'session',CASE WHEN live.id IS NOT NULL THEN to_jsonb(live) END);
   END IF;
   IF lesson.content_frozen_at IS DISTINCT FROM p_frozen_at THEN
     RAISE EXCEPTION 'version_conflict' USING ERRCODE='P0001';
   END IF;

   changed_at:=clock_timestamp();
   UPDATE public.gcp_assignments SET content_frozen_at=NULL
    WHERE id=p_assignment RETURNING * INTO lesson;
   IF live.id IS NOT NULL THEN
     UPDATE public.museum_live_sessions SET status='active',stage_open=false,
       stage_started_at=changed_at,updated_at=changed_at,version=version+1
      WHERE id=live.id RETURNING * INTO live;
     INSERT INTO public.museum_learning_events(session_id,actor_role,action,stage_index)
      VALUES(live.id,'teacher','lesson_unlocked',live.stage_index);
   END IF;
 END IF;

 RETURN jsonb_build_object('contentFrozenAt',lesson.content_frozen_at,
   'session',CASE WHEN live.id IS NOT NULL THEN to_jsonb(live) END);
END
$fn$;

REVOKE ALL ON FUNCTION public.museum_set_lesson_completion(uuid,uuid,boolean,integer,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.museum_set_lesson_completion(uuid,uuid,boolean,integer,timestamptz)
 TO service_role;

COMMIT;
