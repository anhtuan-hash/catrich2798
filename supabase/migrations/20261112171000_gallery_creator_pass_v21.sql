-- Brian Gallery Creator Pass v2.1. Additive, OFF by default.
-- Student groups are NOT auth.users; every guest operation uses a server-verified
-- opaque session. No direct REST grants for anon or authenticated users.
begin;

create table public.gcp_settings (
 id boolean primary key default true check (id),
 enabled boolean not null default false,
 upload_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.gcp_settings(id) values(true);

create table public.gcp_reviewer_grants (
 reviewer_id uuid primary key references auth.users(id),
 school_scope text not null check (length(trim(school_scope)) between 1 and 180),
 can_publish boolean not null default false,
 active boolean not null default true,
 granted_by uuid not null references auth.users(id),
 granted_at timestamptz not null default now()
);

create table public.gcp_assignments (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id),
 reviewer_id uuid not null references auth.users(id),
 school_scope text not null check(length(trim(school_scope)) between 1 and 180),
 class_scope text not null check(length(trim(class_scope)) between 1 and 120),
 title text not null check(length(trim(title)) between 1 and 140),
 brief text not null default '' check(length(brief)<=5000),
 deadline_at timestamptz not null,
 max_rooms integer not null default 3 check(max_rooms between 1 and 3),
 max_exhibits integer not null default 12 check(max_exhibits between 1 and 12),
 max_visibility text not null default 'school' check(max_visibility='school'),
 status text not null default 'active' check(status in ('active','closed')),
 created_at timestamptz not null default now()
);
create index gcp_assignments_teacher_idx on public.gcp_assignments(created_by, created_at desc);
create index gcp_assignments_reviewer_idx on public.gcp_assignments(reviewer_id, created_at desc);

create table public.gcp_groups (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.gcp_assignments(id) on delete restrict,
 label text not null check(length(trim(label)) between 1 and 80),
 state text not null default 'issued' check(state in ('issued','editing','submitted','ttcm_review','changes_requested','approved_locked','rejected','published')),
 created_at timestamptz not null default now(),
 submitted_at timestamptz,
 unique(assignment_id,label)
);
create index gcp_groups_assignment_idx on public.gcp_groups(assignment_id);

create table public.gcp_invites (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null unique references public.gcp_groups(id) on delete restrict,
 handle text not null unique check(length(handle) between 16 and 80),
 secret_hash text not null check(length(secret_hash)=64),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 failed_attempts integer not null default 0 check(failed_attempts>=0),
 locked_until timestamptz,
 created_at timestamptz not null default now()
);
create index gcp_invites_lookup_idx on public.gcp_invites(handle) where revoked_at is null;

create table public.gcp_sessions (
 token_hash text primary key check(length(token_hash)=64),
 group_id uuid not null references public.gcp_groups(id) on delete restrict,
 csrf_token text not null check(length(csrf_token)>=32),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 last_used_at timestamptz not null default now()
);
create index gcp_sessions_group_idx on public.gcp_sessions(group_id,expires_at);

create table public.gcp_redeem_attempts (
 id bigint generated always as identity primary key,
 ip_hash text not null check(length(ip_hash)=64),
 handle_hash text not null check(length(handle_hash)=64),
 succeeded boolean not null default false,
 occurred_at timestamptz not null default now()
);
create index gcp_attempts_window_idx on public.gcp_redeem_attempts(ip_hash,occurred_at desc);

create table public.gcp_drafts (
 group_id uuid primary key references public.gcp_groups(id) on delete restrict,
 doc jsonb not null default '{"title":"","summary":"","rooms":[]}'::jsonb
  check(jsonb_typeof(doc)='object' and pg_column_size(doc)<=110000),
 version integer not null default 0 check(version>=0),
 updated_at timestamptz not null default now()
);

create table public.gcp_reviews (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.gcp_groups(id) on delete restrict,
 version integer not null check(version>=0),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 snapshot_hash text not null check(length(snapshot_hash)=64),
 state text not null default 'submitted' check(state in ('submitted','ttcm_review','changes_requested','approved_locked','rejected','published')),
 teacher_note text not null default '' check(length(teacher_note)<=2000),
 ttcm_note text not null default '' check(length(ttcm_note)<=2000),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 submitted_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(group_id,version)
);
create index gcp_reviews_group_idx on public.gcp_reviews(group_id,submitted_at desc);

create table public.gcp_review_events (
 id bigint generated always as identity primary key,
 review_id uuid not null references public.gcp_reviews(id) on delete restrict,
 actor_type text not null check(actor_type in ('guest_group','teacher','ttcm','admin')),
 actor_id uuid references auth.users(id),
 action text not null,
 from_state text,
 to_state text not null,
 note text not null default '' check(length(note)<=2000),
 occurred_at timestamptz not null default now()
);
create index gcp_events_review_idx on public.gcp_review_events(review_id,occurred_at);

create table public.gcp_publication_links (
 review_id uuid primary key references public.gcp_reviews(id) on delete restrict,
 group_id uuid not null unique references public.gcp_groups(id) on delete restrict,
 exhibition_id uuid not null unique references public.gallery_exhibitions(id) on delete restrict,
 snapshot_hash text not null check(length(snapshot_hash)=64),
 published_by uuid not null references auth.users(id),
 published_at timestamptz not null default now()
);

-- Guest accounts are NEVER created. All these tables are server-only.
alter table public.gcp_settings enable row level security;
alter table public.gcp_reviewer_grants enable row level security;
alter table public.gcp_assignments enable row level security;
alter table public.gcp_groups enable row level security;
alter table public.gcp_invites enable row level security;
alter table public.gcp_sessions enable row level security;
alter table public.gcp_redeem_attempts enable row level security;
alter table public.gcp_drafts enable row level security;
alter table public.gcp_reviews enable row level security;
alter table public.gcp_review_events enable row level security;
alter table public.gcp_publication_links enable row level security;

revoke all on table
 public.gcp_settings, public.gcp_reviewer_grants, public.gcp_assignments,
 public.gcp_groups, public.gcp_invites, public.gcp_sessions,
 public.gcp_redeem_attempts, public.gcp_drafts, public.gcp_reviews,
 public.gcp_review_events, public.gcp_publication_links
from public, anon, authenticated;

revoke all on sequence public.gcp_redeem_attempts_id_seq, public.gcp_review_events_id_seq
from public, anon, authenticated;
grant all on table
 public.gcp_settings, public.gcp_reviewer_grants, public.gcp_assignments,
 public.gcp_groups, public.gcp_invites, public.gcp_sessions,
 public.gcp_redeem_attempts, public.gcp_drafts, public.gcp_reviews,
 public.gcp_review_events, public.gcp_publication_links
to service_role;
grant usage,select on sequence public.gcp_redeem_attempts_id_seq, public.gcp_review_events_id_seq to service_role;

-- Guest save: concurrency protection and state gate run in the database.
create function public.gcp_guest_save(p_group uuid,p_expected integer,p_doc jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare g public.gcp_groups; a public.gcp_assignments; v integer;
begin
 select * into g from public.gcp_groups where id=p_group for update;
 if not found then raise exception 'group_missing'; end if;
 select * into a from public.gcp_assignments where id=g.assignment_id;
 if g.state not in ('issued','editing','changes_requested') or
    a.status<>'active' or a.deadline_at < now() or
    not (select enabled from public.gcp_settings where id=true)
 then raise exception 'editing_closed'; end if;
 if jsonb_typeof(p_doc) <> 'object' or
    jsonb_typeof(p_doc->'rooms') <> 'array' or
    pg_column_size(p_doc)>110000 or
    jsonb_array_length(p_doc->'rooms')>a.max_rooms
 then raise exception 'invalid_draft'; end if;
 update public.gcp_drafts set doc=p_doc,version=version+1,updated_at=now()
 where group_id=p_group and version=p_expected returning version into v;
 if not found then raise exception 'version_conflict'; end if;
 update public.gcp_groups set state='editing' where id=p_group;
 return v;
end; $$;

create function public.gcp_guest_submit(p_group uuid,p_expected integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare g public.gcp_groups; a public.gcp_assignments; d public.gcp_drafts; review_id uuid;
begin
 select * into g from public.gcp_groups where id=p_group for update;
 if not found then raise exception 'group_missing'; end if;
 -- A repeated HTTP submit after an uncertain network response returns the
 -- already-created review, rather than issuing a duplicate or error.
 if g.state='submitted' then
   select id into review_id from public.gcp_reviews
    where group_id=p_group and version=p_expected and state='submitted';
   if review_id is not null then return review_id;end if;
 end if;
 select * into a from public.gcp_assignments where id=g.assignment_id;
 if g.state not in ('editing','changes_requested') or
    a.status<>'active' or a.deadline_at < now() or
    not (select enabled from public.gcp_settings where id=true)
 then raise exception 'submission_closed'; end if;
 select * into d from public.gcp_drafts where group_id=p_group;
 if d.version<>p_expected then raise exception 'version_conflict'; end if;
 if length(trim(coalesce(d.doc->>'title','')))=0 or
    jsonb_array_length(d.doc->'rooms')=0 then raise exception 'draft_incomplete'; end if;
 insert into public.gcp_reviews(group_id,version,snapshot,snapshot_hash)
 values (p_group,d.version,d.doc,
   encode(extensions.digest(convert_to(d.doc::text,'UTF8'),'sha256'),'hex'))
 returning id into review_id;
 update public.gcp_groups set state='submitted',submitted_at=now() where id=p_group;
 insert into public.gcp_review_events(review_id,actor_type,action,from_state,to_state)
 values(review_id,'guest_group','submit',g.state,'submitted');
 return review_id;
end; $$;

-- Teacher/TTCM authority is re-evaluated inside each atomic state transition.
create function public.gcp_review_decide(p_review uuid,p_actor uuid,p_action text,p_note text)
returns text language plpgsql security definer set search_path = '' as $$
declare rev public.gcp_reviews; g public.gcp_groups; a public.gcp_assignments;
actor public.profiles; from_state text; next_state text; is_ttcm boolean;
begin
 select * into rev from public.gcp_reviews where id=p_review for update;
 if not found then raise exception 'review_missing'; end if;
 select * into g from public.gcp_groups where id=rev.group_id for update;
 select * into a from public.gcp_assignments where id=g.assignment_id;
 select * into actor from public.profiles where id=p_actor;
 if actor.id is null or actor.approved is distinct from true or
    trim(actor.school)<>a.school_scope then raise exception 'reviewer_denied'; end if;
 if length(coalesce(p_note,''))>2000 then raise exception 'note_too_long'; end if;
 if (select version from public.gcp_drafts where group_id=g.id) <> rev.version
 then raise exception 'stale_review'; end if;
 from_state:=rev.state;
 if p_action='teacher_forward' then
   if p_actor<>a.created_by or rev.state<>'submitted' then raise exception 'teacher_denied'; end if;
   next_state:='ttcm_review';
 elsif p_action='teacher_return' then
   if p_actor<>a.created_by or rev.state<>'submitted' then raise exception 'teacher_denied'; end if;
   next_state:='changes_requested';
 elsif p_action in ('ttcm_approve','ttcm_return','ttcm_reject') then
   select exists(select 1 from public.gcp_reviewer_grants k
    where k.reviewer_id=p_actor and k.school_scope=a.school_scope and k.active=true
    and p_actor=a.reviewer_id) into is_ttcm;
   if not is_ttcm or rev.state<>'ttcm_review' or p_actor=a.created_by
   then raise exception 'ttcm_denied'; end if;
   next_state:=case p_action when 'ttcm_approve' then 'approved_locked'
      when 'ttcm_return' then 'changes_requested' else 'rejected' end;
 else raise exception 'invalid_action'; end if;
 update public.gcp_reviews
 set state=next_state,teacher_note=case when p_action like 'teacher_%' then coalesce(p_note,'') else teacher_note end,
 ttcm_note=case when p_action like 'ttcm_%' then coalesce(p_note,'') else ttcm_note end,
 approved_by=case when next_state='approved_locked' then p_actor else approved_by end,
 approved_at=case when next_state='approved_locked' then now() else approved_at end,
 updated_at=now() where id=p_review;
 update public.gcp_groups set state=next_state where id=g.id;
 insert into public.gcp_review_events(review_id,actor_type,actor_id,action,from_state,to_state,note)
 values(p_review,case when p_action like 'ttcm_%' then 'ttcm' else 'teacher' end,
 p_actor,p_action,from_state,next_state,coalesce(p_note,''));
 return next_state;
end; $$;


-- Atomic assignment/group issuance: a failed insert cannot strand partly created groups.
create function public.gcp_staff_issue_assignment(
 p_teacher uuid,p_reviewer uuid,p_school text,p_class text,p_title text,
 p_brief text,p_deadline timestamptz,p_tokens jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $
declare a public.gcp_assignments; gid uuid; token jsonb;
 issued jsonb:='[]'::jsonb; seq integer:=0; label text;
begin
 if jsonb_typeof(p_tokens)<>'array' or jsonb_array_length(p_tokens) not between 1 and 12
   or pg_column_size(p_tokens)>12000 then raise exception 'invalid_group_count';end if;
 if p_deadline<now()+interval '1 hour' or p_deadline>now()+interval '120 days'
   then raise exception 'invalid_deadline';end if;
 if not (select enabled from public.gcp_settings where id=true) then
   raise exception 'creator_pass_disabled';end if;
 if not exists(select 1 from public.profiles p where p.id=p_teacher
     and p.approved=true and p.school=p_school
     and lower(p.role) in ('admin','teacher','department_head','ttcm','department-head','to_truong'))
    or not exists(select 1 from public.gcp_reviewer_grants g
       join public.profiles p on p.id=g.reviewer_id
       where g.reviewer_id=p_reviewer and g.school_scope=p_school
       and g.can_publish and g.active and p.approved and p.school=p_school)
    or p_teacher=p_reviewer then raise exception 'assignment_authority_denied';end if;
 insert into public.gcp_assignments(created_by,reviewer_id,school_scope,
  class_scope,title,brief,deadline_at)
 values(p_teacher,p_reviewer,p_school,p_class,p_title,p_brief,p_deadline)
 returning * into a;
 for token in select value from pg_catalog.jsonb_array_elements(p_tokens)
 loop
   if length(coalesce(token->>'handle','')) not between 16 and 80
     or length(coalesce(token->>'secret_hash',''))<>64
     then raise exception 'invalid_group_token';end if;
   seq:=seq+1;
   label:='Nhóm '||lpad(seq::text,2,'0');
   insert into public.gcp_groups(assignment_id,label)
   values(a.id,label) returning id into gid;
   insert into public.gcp_drafts(group_id)values(gid);
   insert into public.gcp_invites(group_id,handle,secret_hash,expires_at)
   values(gid,token->>'handle',token->>'secret_hash',p_deadline);
   issued:=issued||pg_catalog.jsonb_build_array(
     pg_catalog.jsonb_build_object('groupId',gid,'label',label,'handle',token->>'handle')
   );
 end loop;
 return pg_catalog.jsonb_build_object('assignment',
  pg_catalog.jsonb_build_object('id',a.id,'title',a.title,'deadline_at',a.deadline_at),
  'groups',issued);
end; $;

revoke all on function public.gcp_staff_issue_assignment(uuid,uuid,text,text,text,text,timestamptz,jsonb)
from public,anon,authenticated;
grant execute on function public.gcp_staff_issue_assignment(uuid,uuid,text,text,text,text,timestamptz,jsonb)
to service_role;

-- Privileged admin publication. The TTCM's final approval is mandatory;
-- native Gallery trigger still requires a genuine Admin to publish. Do not
-- disable or weaken native Gallery triggers to bypass this requirement.
create function public.gcp_admin_publish(p_review uuid,p_admin uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rev public.gcp_reviews; g public.gcp_groups; a public.gcp_assignments;
d public.gcp_drafts; new_exhibition uuid; new_room uuid; room jsonb;
piece jsonb; idx integer:=0; item_idx integer; created_item uuid;
title text; model text; total_items integer:=0;
begin
 select * into rev from public.gcp_reviews where id=p_review for update;
 if not found then raise exception 'review_missing'; end if;
 select * into g from public.gcp_groups where id=rev.group_id for update;
 select * into a from public.gcp_assignments where id=g.assignment_id;
 select * into d from public.gcp_drafts where group_id=g.id;
 if not exists(select 1 from public.profiles p where p.id=p_admin and
   p.role='admin' and p.approved=true and trim(p.school)=a.school_scope) then
   raise exception 'admin_required'; end if;
 if rev.state='published' and g.state='published' then
   select exhibition_id into new_exhibition from public.gcp_publication_links
     where group_id=g.id and snapshot_hash=rev.snapshot_hash and review_id=rev.id;
   if new_exhibition is not null then return new_exhibition;end if;
 end if;
 if rev.state<>'approved_locked' or g.state<>'approved_locked' or
    rev.version<>d.version or
    rev.snapshot_hash<>encode(extensions.digest(convert_to(d.doc::text,'UTF8'),'sha256'),'hex') or
    not exists(select 1 from public.gcp_reviewer_grants k
      where k.reviewer_id=rev.approved_by and k.active=true and
        k.school_scope=a.school_scope and k.can_publish=true)
 then raise exception 'approved_snapshot_required'; end if;
 if exists(select 1 from public.gcp_publication_links x where x.group_id=g.id) then
   select exhibition_id into new_exhibition from public.gcp_publication_links where group_id=g.id;
   return new_exhibition;
 end if;
 if jsonb_array_length(rev.snapshot->'rooms')=0 or
    jsonb_array_length(rev.snapshot->'rooms')>a.max_rooms then raise exception 'invalid_rooms'; end if;
 -- Bridge R1's canonical-school trigger under explicitly delegated ownership.
 -- This is a transaction-local auth.uid claim, never exposed to client requests.
 perform pg_catalog.set_config('request.jwt.claim.sub',a.created_by::text,true);
 insert into public.gallery_exhibitions(slug,title,summary,visibility,status,owner_id,accept_submissions)
 values ('gcp-'||replace(g.id::text,'-',''),
    left(coalesce(nullif(trim(rev.snapshot->>'title'),''),'Gallery'),140),
    left(coalesce(rev.snapshot->>'summary',''),1200),'school','draft',a.created_by,false)
 returning id into new_exhibition;
 for room in select value from pg_catalog.jsonb_array_elements(rev.snapshot->'rooms') loop
   if room->>'template_key' not in ('classic','culture','lab') then raise exception 'invalid_template'; end if;
   insert into public.gallery_rooms(exhibition_id,title,template_key,sort_order)
   values(new_exhibition,left(coalesce(nullif(trim(room->>'title'),''),'Room'),120),room->>'template_key',idx)
   returning id into new_room;
   item_idx:=0;
   for piece in select value from pg_catalog.jsonb_array_elements(room->'exhibits') loop
     if total_items>=a.max_exhibits then raise exception 'too_many_exhibits'; end if;
     if piece->>'kind' not in ('text','model') then raise exception 'media_not_cleared'; end if;
     model:=case when piece->>'kind'='model' then piece->>'model_key' else null end;
     if model is not null and model not in ('pedestal','globe','book') then raise exception 'bad_model'; end if;
     insert into public.gallery_exhibits(room_id,title,description,kind,model_key,submitted_by,transform,status)
     values(new_room,left(coalesce(nullif(trim(piece->>'title'),''),'Exhibit'),160),
       left(coalesce(piece->>'description',''),5000),piece->>'kind',
       model,a.created_by,coalesce(piece->'transform',
       '{"position":[0,2,-7.72],"rotation":[0,0,0],"scale":[1,1,1]}'::jsonb),'draft')
     returning id into created_item;
     item_idx:=item_idx+1;
     total_items:=total_items+1;
   end loop;
   idx:=idx+1;
 end loop;
 if not exists(select 1 from public.gallery_exhibits e join public.gallery_rooms r
   on r.id=e.room_id where r.exhibition_id=new_exhibition) then raise exception 'empty_exhibition'; end if;
 -- R1 moderation/publication triggers check auth.uid and canonical Admin.
 perform pg_catalog.set_config('request.jwt.claim.sub',p_admin::text,true);
 update public.gallery_exhibits e set status='approved',reviewed_by=p_admin,reviewed_at=now()
 where e.room_id in (select id from public.gallery_rooms where exhibition_id=new_exhibition);
 perform public.gallery_publish_exhibition(new_exhibition);
 insert into public.gcp_publication_links(review_id,group_id,exhibition_id,snapshot_hash,published_by)
 values(p_review,g.id,new_exhibition,rev.snapshot_hash,p_admin);
 update public.gcp_reviews set state='published',updated_at=now() where id=p_review;
 update public.gcp_groups set state='published' where id=g.id;
 insert into public.gcp_review_events(review_id,actor_type,actor_id,action,from_state,to_state)
 values(p_review,'admin',p_admin,'admin_publish','approved_locked','published');
 return new_exhibition;
end; $$;

revoke all on function public.gcp_guest_save(uuid,integer,jsonb) from public,anon,authenticated;
revoke all on function public.gcp_guest_submit(uuid,integer) from public,anon,authenticated;
revoke all on function public.gcp_review_decide(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.gcp_admin_publish(uuid,uuid) from public,anon,authenticated;
grant execute on function public.gcp_guest_save(uuid,integer,jsonb) to service_role;
grant execute on function public.gcp_guest_submit(uuid,integer) to service_role;
grant execute on function public.gcp_review_decide(uuid,uuid,text,text) to service_role;
grant execute on function public.gcp_admin_publish(uuid,uuid) to service_role;

commit;
