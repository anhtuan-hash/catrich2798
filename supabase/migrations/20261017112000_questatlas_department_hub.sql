-- QuestAtlas Department Hub; staged only. Requires qatl foundation migration.
-- Members from BRIAN department_members; no invented second directory.
CREATE TABLE public.qatl_department_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  department_id uuid NOT NULL REFERENCES public.departments(id),
  node_id uuid REFERENCES public.qatl_nodes(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES public.qatl_quests(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(snapshot)='object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text NOT NULL DEFAULT '' CHECK (length(review_note)<=500),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qatl_share_exactly_one_asset CHECK ((node_id IS NOT NULL) <> (quest_id IS NOT NULL)),
  CONSTRAINT qatl_share_review_consistency CHECK (
    (status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
    (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX qatl_share_node_unique ON public.qatl_department_shares(department_id,node_id) WHERE node_id IS NOT NULL;
CREATE UNIQUE INDEX qatl_share_quest_unique ON public.qatl_department_shares(department_id,quest_id) WHERE quest_id IS NOT NULL;
CREATE INDEX qatl_share_owner_idx ON public.qatl_department_shares(owner_id,created_at DESC);
CREATE INDEX qatl_share_pending_idx ON public.qatl_department_shares(department_id,status,created_at DESC);
ALTER TABLE public.qatl_department_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qatl_department_shares FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.qatl_department_shares TO authenticated;

CREATE POLICY qatl_share_read ON public.qatl_department_shares FOR SELECT TO authenticated USING (
  owner_id=(SELECT auth.uid())
  OR EXISTS (SELECT 1 FROM public.department_members m
    WHERE m.department_id=public.qatl_department_shares.department_id AND m.user_id=(SELECT auth.uid()) AND m.active=true
      AND (status='approved' OR m.role='department_head'))
);
CREATE POLICY qatl_share_submit ON public.qatl_department_shares FOR INSERT TO authenticated WITH CHECK (
  owner_id=(SELECT auth.uid()) AND status='pending'
  AND reviewed_by IS NULL AND reviewed_at IS NULL
  AND EXISTS (SELECT 1 FROM public.department_members m
    WHERE m.department_id=public.qatl_department_shares.department_id AND m.user_id=(SELECT auth.uid()) AND m.active=true)
);
-- Validate asset ownership in a BEFORE INSERT trigger instead of a policy
-- subquery: adding shared SELECT policies to nodes/quests would otherwise
-- create RLS recursion through qatl_department_shares.
CREATE FUNCTION public.qatl_verify_share_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $qatl_submit$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Share owner mismatch';
  END IF;
  -- Server generates the immutable review snapshot: never trust a client JSON payload.
  IF NEW.node_id IS NOT NULL THEN
    SELECT jsonb_build_object('kind','node','title',n.title,'summary',n.summary,
       'grade',n.grade,'unit_name',n.unit_name)
      INTO NEW.snapshot FROM public.qatl_nodes n
      WHERE n.id=NEW.node_id AND n.owner_id=NEW.owner_id;
    IF NEW.snapshot IS NULL THEN RAISE EXCEPTION 'Knowledge node not owned by submitter'; END IF;
  ELSIF NEW.quest_id IS NOT NULL THEN
    SELECT jsonb_build_object('kind','quest','title',q.title,'description',q.description,
       'world',q.world,'puzzles',coalesce((
         SELECT jsonb_agg(jsonb_build_object('position',p.position,'kind',p.kind,
           'stem',p.stem,'options',p.options,'correct_answer',p.correct_answer,
           'clue',p.clue,'points',p.points) ORDER BY p.position,p.id)
         FROM public.qatl_puzzles p WHERE p.quest_id=q.id
       ),'[]'::jsonb))
       INTO NEW.snapshot FROM public.qatl_quests q
       WHERE q.id=NEW.quest_id AND q.owner_id=NEW.owner_id AND q.status='published';
    IF NEW.snapshot IS NULL THEN RAISE EXCEPTION 'Quest must be published and owned by submitter'; END IF;
    IF jsonb_array_length(NEW.snapshot->'puzzles')<1 THEN RAISE EXCEPTION 'Quest has no puzzles'; END IF;
  END IF;
  RETURN NEW;
END $qatl_submit$;
CREATE TRIGGER qatl_verify_share_before_insert
BEFORE INSERT ON public.qatl_department_shares
FOR EACH ROW EXECUTE FUNCTION public.qatl_verify_share_submission();
REVOKE ALL ON FUNCTION public.qatl_verify_share_submission() FROM public,anon,authenticated;
CREATE POLICY qatl_share_review ON public.qatl_department_shares FOR UPDATE TO authenticated
USING (
  status='pending'
  AND EXISTS (SELECT 1 FROM public.department_members m WHERE
    m.department_id=public.qatl_department_shares.department_id AND m.user_id=(SELECT auth.uid())
    AND m.active=true AND m.role='department_head')
)
WITH CHECK (
  status IN ('approved','rejected')
  AND reviewed_by=(SELECT auth.uid()) AND reviewed_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.department_members m WHERE
    m.department_id=public.qatl_department_shares.department_id AND m.user_id=(SELECT auth.uid())
    AND m.active=true AND m.role='department_head')
);
CREATE POLICY qatl_share_revoke_owner ON public.qatl_department_shares FOR DELETE TO authenticated
USING (owner_id=(SELECT auth.uid()));

CREATE FUNCTION public.qatl_guard_share_review()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF (NEW.id,NEW.owner_id,NEW.department_id,NEW.node_id,NEW.quest_id,NEW.snapshot,NEW.created_at)
     IS DISTINCT FROM
     (OLD.id,OLD.owner_id,OLD.department_id,OLD.node_id,OLD.quest_id,OLD.snapshot,OLD.created_at)
  THEN RAISE EXCEPTION 'Share identity cannot be changed'; END IF;
  IF OLD.status <> 'pending' OR NEW.status NOT IN ('approved','rejected')
     OR NEW.reviewed_by IS DISTINCT FROM auth.uid()
     OR NEW.reviewed_at IS NULL
  THEN RAISE EXCEPTION 'Invalid review transition'; END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;
CREATE TRIGGER qatl_validate_review BEFORE UPDATE ON public.qatl_department_shares
FOR EACH ROW EXECUTE FUNCTION public.qatl_guard_share_review();
REVOKE ALL ON FUNCTION public.qatl_guard_share_review() FROM PUBLIC,anon,authenticated;

-- Approved shares become readable to department members, while anonymous users
-- retain no table privileges. Puzzle answer keys are visible only to authorized
-- signed-in teachers in the same department for approved, published Quests.
CREATE POLICY qatl_nodes_approved_department_read ON public.qatl_nodes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.qatl_department_shares s
     JOIN public.department_members m ON m.department_id=s.department_id
    WHERE s.node_id=public.qatl_nodes.id AND s.status='approved'
    AND m.user_id=(SELECT auth.uid()) AND m.active=true)
);
CREATE POLICY qatl_quests_approved_department_read ON public.qatl_quests FOR SELECT TO authenticated USING (
  status='published' AND EXISTS (SELECT 1 FROM public.qatl_department_shares s
    JOIN public.department_members m ON m.department_id=s.department_id
    WHERE s.quest_id=public.qatl_quests.id AND s.status='approved'
      AND m.user_id=(SELECT auth.uid()) AND m.active=true)
);
CREATE POLICY qatl_puzzles_approved_department_read ON public.qatl_puzzles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.qatl_quests q
   JOIN public.qatl_department_shares s ON s.quest_id=q.id
   JOIN public.department_members m ON m.department_id=s.department_id
   WHERE q.id=public.qatl_puzzles.quest_id AND q.status='published' AND s.status='approved'
     AND m.user_id=(SELECT auth.uid()) AND m.active=true)
);

-- Authenticated members can copy an approved resource into their own private
-- drafts. SECURITY INVOKER: input read/write checked through the RLS above.
-- Immutable department event ledger. No direct INSERT/UPDATE/DELETE grants.
CREATE TABLE public.qatl_department_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('submitted','approved','rejected','revoked')),
  asset_kind text NOT NULL CHECK (asset_kind IN ('node','quest')),
  resource_title text NOT NULL,
  review_note text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qatl_audit_department_time_idx ON public.qatl_department_audit(department_id,occurred_at DESC);
CREATE INDEX qatl_audit_owner_time_idx ON public.qatl_department_audit(owner_id,occurred_at DESC);
ALTER TABLE public.qatl_department_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qatl_department_audit FROM public,anon,authenticated;
GRANT SELECT ON public.qatl_department_audit TO authenticated;
CREATE POLICY qatl_audit_read ON public.qatl_department_audit FOR SELECT TO authenticated USING (
 owner_id=(SELECT auth.uid())
 OR EXISTS (SELECT 1 FROM public.department_members m WHERE
    m.department_id=public.qatl_department_audit.department_id
    AND m.user_id=(SELECT auth.uid()) AND m.active=true AND m.role='department_head')
);
CREATE FUNCTION public.qatl_record_department_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $qatl_event$
DECLARE v_share public.qatl_department_shares%ROWTYPE;
        v_action text;
BEGIN
  IF TG_OP='DELETE' THEN v_share=OLD; v_action='revoked';
  ELSIF TG_OP='INSERT' THEN v_share=NEW; v_action='submitted';
  ELSIF TG_OP='UPDATE' THEN
    IF OLD.status=NEW.status THEN RETURN NEW; END IF;
    v_share=NEW; v_action=NEW.status;
  END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Audit actor required'; END IF;
  INSERT INTO public.qatl_department_audit
    (share_id,department_id,owner_id,actor_id,action,asset_kind,resource_title,review_note)
  VALUES (v_share.id,v_share.department_id,v_share.owner_id,auth.uid(),
    v_action,v_share.snapshot->>'kind',v_share.snapshot->>'title',v_share.review_note);
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $qatl_event$;
REVOKE ALL ON FUNCTION public.qatl_record_department_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER qatl_share_audit AFTER INSERT OR UPDATE OR DELETE
ON public.qatl_department_shares
FOR EACH ROW EXECUTE FUNCTION public.qatl_record_department_event();

-- Copies frozen, teacher-reviewed content rather than mutable source rows.
CREATE FUNCTION public.qatl_department_fork(p_share_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $qatl_fork$
DECLARE s public.qatl_department_shares%ROWTYPE; v_new uuid; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id=v_uid AND p.approved=true
  ) THEN RAISE EXCEPTION 'Approved teacher account required'; END IF;
  SELECT * INTO s FROM public.qatl_department_shares WHERE id=p_share_id AND status='approved';
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.department_members m
    WHERE m.department_id=s.department_id AND m.user_id=v_uid AND m.active=true
  ) THEN RAISE EXCEPTION 'Approved resource is unavailable'; END IF;
  IF s.node_id IS NOT NULL THEN
    INSERT INTO public.qatl_nodes(owner_id,title,summary,grade,unit_name,status)
      VALUES(v_uid,s.snapshot->>'title',s.snapshot->>'summary',
        (s.snapshot->>'grade')::integer,s.snapshot->>'unit_name','draft')
      RETURNING id INTO v_new;
    RETURN jsonb_build_object('kind','node','id',v_new);
  END IF;
  INSERT INTO public.qatl_quests(owner_id,title,description,world,status)
    VALUES(v_uid,LEFT(s.snapshot->>'title' || ' (Copy)',150),
      s.snapshot->>'description',s.snapshot->>'world','draft')
    RETURNING id INTO v_new;
  INSERT INTO public.qatl_puzzles(owner_id,quest_id,source_node_id,position,kind,stem,options,correct_answer,clue,points)
    SELECT v_uid,v_new,NULL,(p->>'position')::integer,p->>'kind',
      p->>'stem',p->'options',p->>'correct_answer',p->>'clue',(p->>'points')::integer
      FROM jsonb_array_elements(s.snapshot->'puzzles') p;
  RETURN jsonb_build_object('kind','quest','id',v_new);
END $qatl_fork$;
REVOKE ALL ON FUNCTION public.qatl_department_fork(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.qatl_department_fork(uuid) TO authenticated;
