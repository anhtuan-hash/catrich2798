-- QuestAtlas Department Hub; staged only. Requires qatl foundation migration.
-- Members from BRIAN department_members; no invented second directory.
CREATE TABLE public.qatl_department_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  department_id uuid NOT NULL REFERENCES public.departments(id),
  node_id uuid REFERENCES public.qatl_nodes(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES public.qatl_quests(id) ON DELETE CASCADE,
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
  IF NEW.node_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.qatl_nodes n WHERE
      n.id=NEW.node_id AND n.owner_id=NEW.owner_id) THEN
      RAISE EXCEPTION 'Knowledge node not owned by submitter';
    END IF;
  ELSIF NEW.quest_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.qatl_quests q WHERE
      q.id=NEW.quest_id AND q.owner_id=NEW.owner_id AND q.status='published') THEN
      RAISE EXCEPTION 'Quest must be published and owned by submitter';
    END IF;
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
  IF (NEW.id,NEW.owner_id,NEW.department_id,NEW.node_id,NEW.quest_id,NEW.created_at)
     IS DISTINCT FROM
     (OLD.id,OLD.owner_id,OLD.department_id,OLD.node_id,OLD.quest_id,OLD.created_at)
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
CREATE FUNCTION public.qatl_department_fork(p_share_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
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
      SELECT v_uid,title,summary,grade,unit_name,'draft'
        FROM public.qatl_nodes WHERE id=s.node_id
      RETURNING id INTO v_new;
    IF v_new IS NULL THEN RAISE EXCEPTION 'Node unavailable'; END IF;
    RETURN jsonb_build_object('kind','node','id',v_new);
  END IF;
  INSERT INTO public.qatl_quests(owner_id,title,description,world,status)
    SELECT v_uid,LEFT(title || ' (Copy)',150),description,world,'draft'
      FROM public.qatl_quests WHERE id=s.quest_id AND status='published'
    RETURNING id INTO v_new;
  IF v_new IS NULL THEN RAISE EXCEPTION 'Quest unavailable'; END IF;
  INSERT INTO public.qatl_puzzles(owner_id,quest_id,source_node_id,position,kind,stem,options,correct_answer,clue,points)
    SELECT v_uid,v_new,NULL,position,kind,stem,options,correct_answer,clue,points
      FROM public.qatl_puzzles WHERE quest_id=s.quest_id ORDER BY position,id;
  RETURN jsonb_build_object('kind','quest','id',v_new);
END $$;
REVOKE ALL ON FUNCTION public.qatl_department_fork(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.qatl_department_fork(uuid) TO authenticated;
