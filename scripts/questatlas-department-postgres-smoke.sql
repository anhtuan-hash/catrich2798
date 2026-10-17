\set ON_ERROR_STOP on
\echo '[QuestAtlas Dept] Building disposable BRIAN department fixture'
CREATE TABLE public.departments (id uuid PRIMARY KEY, name text NOT NULL, code text UNIQUE NOT NULL);
CREATE TABLE public.department_members (
  department_id uuid NOT NULL REFERENCES public.departments(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL, active boolean NOT NULL DEFAULT true, PRIMARY KEY(department_id,user_id)
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.departments,public.department_members TO authenticated;
CREATE POLICY dept_self_read ON public.department_members FOR SELECT TO authenticated
  USING (user_id=(select auth.uid()));
CREATE POLICY dept_read_active ON public.departments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.department_members m
    WHERE m.department_id=id AND m.user_id=(select auth.uid()) AND m.active=true));
INSERT INTO auth.users(id) VALUES
  ('33333333-3333-4333-8333-333333333333'),
  ('44444444-4444-4444-8444-444444444444');
INSERT INTO public.profiles(id,approved) VALUES
  ('33333333-3333-4333-8333-333333333333',true),
  ('44444444-4444-4444-8444-444444444444',true);
INSERT INTO public.departments(id,name,code) VALUES
 ('55555555-5555-4555-8555-555555555555','English Department','EN'),
 ('66666666-6666-4666-8666-666666666666','Different Department','OTHER');
INSERT INTO public.department_members(department_id,user_id,role,active) VALUES
 ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','department_head',true),
 ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','teacher',true),
 ('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','teacher',true);
\i supabase/migrations/20261017112000_questatlas_department_hub.sql
\echo '[QuestAtlas Dept] Migration accepted'
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
INSERT INTO public.qatl_nodes(id,title,summary,grade,unit_name)
VALUES ('77777777-7777-4777-8777-777777777777','Participles','Teaching participial clauses',11,'Unit 5');
INSERT INTO public.qatl_quests(id,title,description,world,status) VALUES
 ('88888888-8888-4888-8888-888888888888','Mystic Grammar Escape','A published classroom challenge','library','published');
INSERT INTO public.qatl_puzzles(quest_id,position,kind,stem,options,correct_answer)
VALUES ('88888888-8888-4888-8888-888888888888',1,'choice','Choose the correct participle','["Leaving","Left","Leaves","Leave"]','Leaving');
INSERT INTO public.qatl_department_shares(id,department_id,node_id) VALUES
 ('99999999-9999-4999-8999-999999999991','55555555-5555-4555-8555-555555555555','77777777-7777-4777-8777-777777777777');
INSERT INTO public.qatl_department_shares(id,department_id,quest_id) VALUES
 ('99999999-9999-4999-8999-999999999992','55555555-5555-4555-8555-555555555555','88888888-8888-4888-8888-888888888888');
SELECT (count(*)=2) AS both_pending FROM public.qatl_department_shares WHERE status='pending' \gset
\if :both_pending
  \echo '[QuestAtlas Dept] Teacher submitted two assets'
\else
  \echo 'FAIL expected pending teacher submissions'
  select 1/0;
\endif
-- Owner cannot update the review state (even with forged reviewed_by).
UPDATE public.qatl_department_shares SET status='approved',reviewed_by='33333333-3333-4333-8333-333333333333',reviewed_at=now()
WHERE id='99999999-9999-4999-8999-999999999991';
SELECT (count(*)=2) AS remains_pending FROM public.qatl_department_shares WHERE status='pending' \gset
\if :remains_pending
  \echo '[QuestAtlas Dept] Teacher cannot approve their own shares'
\else
  \echo 'FAIL owner approval bypass'
  select 1/0;
\endif
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
SELECT (count(*)=0) AS isolated FROM public.qatl_department_shares \gset
\if :isolated
  \echo '[QuestAtlas Dept] Other department cannot see private pending shares'
\else
  \echo 'FAIL cross-department share leak'
  select 1/0;
\endif
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT (count(*)=2) AS head_can_review FROM public.qatl_department_shares WHERE status='pending' \gset
\if :head_can_review
  \echo '[QuestAtlas Dept] TTCM sees pending submissions'
\else
  \echo 'FAIL TTCM pending visibility'
  select 1/0;
\endif
UPDATE public.qatl_department_shares SET status='approved',reviewed_by=auth.uid(),reviewed_at=now(),review_note='Validated content'
WHERE department_id='55555555-5555-4555-8555-555555555555' AND status='pending';
SELECT (count(*)=2) AS approved_shares FROM public.qatl_department_shares WHERE status='approved' \gset
\if :approved_shares
  \echo '[QuestAtlas Dept] TTCM approved assets'
\else
  \echo 'FAIL TTCM approval'
  select 1/0;
\endif
SELECT (public.qatl_department_fork('99999999-9999-4999-8999-999999999991')->>'kind')='node' AS fork_node \gset
SELECT (public.qatl_department_fork('99999999-9999-4999-8999-999999999992')->>'kind')='quest' AS fork_quest \gset
\if :fork_node
  \echo '[QuestAtlas Dept] Teacher copied approved node'
\else
  select 1/0;
\endif
\if :fork_quest
  \echo '[QuestAtlas Dept] Teacher copied approved quest'
\else
  select 1/0;
\endif
SELECT (count(*)=1) AS cloned_puzzles
 FROM public.qatl_puzzles p JOIN public.qatl_quests q ON q.id=p.quest_id
 WHERE q.owner_id=auth.uid() AND q.title LIKE '%(Copy)' \gset
\if :cloned_puzzles
  \echo '[QuestAtlas Dept] Forked quest retained puzzle and answer key only for authorized teachers'
\else
  \echo 'FAIL quiz clone incomplete'
  select 1/0;
\endif
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
SELECT (count(*)=0) AS no_approved_visibility
 FROM public.qatl_department_shares WHERE department_id='55555555-5555-4555-8555-555555555555' \gset
\if :no_approved_visibility
  \echo '[QuestAtlas Dept] Outsider cannot read approved English resources'
\else
  \echo 'FAIL published asset cross-department leak'
  select 1/0;
\endif
\echo '[QuestAtlas Dept] Disposable review / share / fork / isolation suite passed'
