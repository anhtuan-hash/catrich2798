-- Admin-led BRIAN Museum Lab workflow; no student data is deleted.
-- Existing Creator Pass records remain intact; archive is reversible by an
-- authorized administrator using an audited recovery operation (not exposed in UI).
alter table public.gcp_assignments
 add column if not exists archived_at timestamptz,
 add column if not exists archived_by uuid references auth.users(id);
alter table public.gcp_reviews
 add column if not exists archived_at timestamptz,
 add column if not exists archived_by uuid references auth.users(id);
create index if not exists gcp_assignment_unarchived_idx on public.gcp_assignments(school_scope,created_at desc) where archived_at is null;
create index if not exists gcp_reviews_unarchived_idx on public.gcp_reviews(group_id,submitted_at desc) where archived_at is null;

create or replace function public.gcp_staff_issue_assignment(
 p_teacher uuid,p_reviewer uuid,p_school text,p_class text,p_title text,
 p_brief text,p_deadline timestamptz,p_tokens jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $gcp_issue$
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
    or (not exists(select 1 from public.profiles z where z.id=p_teacher
        and z.role='admin' and z.approved=true and z.school=p_school)
     and (not exists(select 1 from public.gcp_reviewer_grants g
        join public.profiles p on p.id=g.reviewer_id
       where g.reviewer_id=p_reviewer and g.school_scope=p_school
         and g.can_publish and g.active and p.approved and p.school=p_school)
       or p_teacher=p_reviewer)) then raise exception 'assignment_authority_denied';end if;
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
end; $gcp_issue$;

-- Atomic direct review by an approved Admin in the same school.
create or replace function public.gcp_admin_decide(p_review uuid,p_actor uuid,p_action text,p_note text)
returns text language plpgsql security definer set search_path='' as $$
declare rev public.gcp_reviews; g public.gcp_groups; a public.gcp_assignments;
 d public.gcp_drafts; next_state text; from_state text;
begin
 if p_action not in ('approve','return','reject') then raise exception 'invalid_action';end if;
 if length(coalesce(p_note,''))>2000 then raise exception 'note_too_long';end if;
 select * into rev from public.gcp_reviews where id=p_review for update;
 if not found or rev.archived_at is not null then raise exception 'review_missing';end if;
 select * into g from public.gcp_groups where id=rev.group_id for update;
 select * into a from public.gcp_assignments where id=g.assignment_id for update;
 if a.archived_at is not null or a.status<>'active' then raise exception 'assignment_closed';end if;
 if not exists(select 1 from public.profiles p where p.id=p_actor and p.role='admin'
   and p.approved=true and trim(p.school)=a.school_scope) then raise exception 'admin_required';end if;
 if rev.state not in ('submitted','ttcm_review') or g.state<>rev.state
  then raise exception 'invalid_review_state';end if;
 select * into d from public.gcp_drafts where group_id=g.id;
 if rev.version<>d.version or
  rev.snapshot_hash<>encode(extensions.digest(convert_to(d.doc::text,'UTF8'),'sha256'),'hex')
 then raise exception 'stale_review';end if;
 from_state:=rev.state;
 next_state:=case p_action when 'approve' then 'approved_locked'
  when 'return' then 'changes_requested' else 'rejected' end;
 update public.gcp_reviews set state=next_state,ttcm_note=coalesce(p_note,''),
  approved_by=case when p_action='approve' then p_actor else approved_by end,
  approved_at=case when p_action='approve' then now() else approved_at end,updated_at=now()
 where id=rev.id;
 update public.gcp_groups set state=next_state where id=g.id;
 insert into public.gcp_review_events(review_id,actor_type,actor_id,action,from_state,to_state,note)
 values(rev.id,'admin',p_actor,'admin_'||p_action,from_state,next_state,coalesce(p_note,''));
 return next_state;
end; $$;

-- Archiving a submitted review preserves historical evidence but removes it
-- from the active queue; students may revise and resubmit a new draft version.
create or replace function public.gcp_admin_archive_review(p_review uuid,p_actor uuid)
returns text language plpgsql security definer set search_path='' as $$
declare rev public.gcp_reviews; g public.gcp_groups; a public.gcp_assignments;
begin
 select * into rev from public.gcp_reviews where id=p_review for update;
 if not found or rev.archived_at is not null then raise exception 'review_missing';end if;
 select * into g from public.gcp_groups where id=rev.group_id for update;
 select * into a from public.gcp_assignments where id=g.assignment_id for update;
 if not exists(select 1 from public.profiles p where p.id=p_actor and p.role='admin'
   and p.approved=true and trim(p.school)=a.school_scope) then raise exception 'admin_required';end if;
 if rev.state in ('approved_locked','published') or
   exists(select 1 from public.gcp_publication_links x where x.review_id=rev.id)
 then raise exception 'approved_review_immutable';end if;
 if rev.state not in ('submitted','ttcm_review','changes_requested','rejected')
 then raise exception 'invalid_review_state';end if;
 update public.gcp_reviews set archived_at=now(),archived_by=p_actor,updated_at=now() where id=rev.id;
 if g.state=rev.state and g.state in ('submitted','ttcm_review','changes_requested','rejected') then
   update public.gcp_groups set state='changes_requested' where id=g.id;
 end if;
 insert into public.gcp_review_events(review_id,actor_type,actor_id,action,from_state,to_state,note)
 values(rev.id,'admin',p_actor,'admin_archive_review',rev.state,'archived',
  'Archived from active review queue; original student evidence preserved.');
 return 'archived';
end; $$;

-- Archive a lesson, hide it from active lists, and revoke current Creator
-- Pass access. Public exhibitions are immutable and require separate unpublish.
create or replace function public.gcp_admin_archive_assignment(p_assignment uuid,p_actor uuid)
returns text language plpgsql security definer set search_path='' as $$
declare a public.gcp_assignments;
begin
 select * into a from public.gcp_assignments where id=p_assignment for update;
 if not found or a.archived_at is not null then raise exception 'assignment_missing';end if;
 if not exists(select 1 from public.profiles p where p.id=p_actor and p.role='admin'
   and p.approved=true and trim(p.school)=a.school_scope) then raise exception 'admin_required';end if;
 if exists(select 1 from public.gcp_publication_links x
   join public.gcp_groups g on g.id=x.group_id where g.assignment_id=a.id)
 then raise exception 'published_assignment_immutable';end if;
 update public.gcp_assignments set status='closed',archived_at=now(),archived_by=p_actor where id=a.id;
 update public.gcp_sessions set revoked_at=now()
  where revoked_at is null and group_id in (select id from public.gcp_groups where assignment_id=a.id);
 update public.gcp_invites set revoked_at=now()
  where revoked_at is null and group_id in (select id from public.gcp_groups where assignment_id=a.id);
 return 'archived';
end; $$;

create or replace function public.gcp_admin_publish(p_review uuid,p_admin uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rev public.gcp_reviews; g public.gcp_groups; a public.gcp_assignments;
d public.gcp_drafts; new_exhibition uuid; new_room uuid; room jsonb;
piece jsonb; idx integer:=0; item_idx integer; created_item uuid;
title text; model text; target_asset uuid; source_asset uuid; total_items integer:=0;
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
    (rev.archived_at is not null or a.archived_at is not null or
    not (exists(select 1 from public.gcp_reviewer_grants k
      where k.reviewer_id=rev.approved_by and k.active=true and
        k.school_scope=a.school_scope and k.can_publish=true)
      or exists(select 1 from public.profiles p where p.id=rev.approved_by
        and p.role='admin' and p.approved=true and p.school=a.school_scope)))
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
     if piece->>'kind' not in ('text','model','image') then raise exception 'media_not_cleared'; end if;
     target_asset:=null;
     if piece->>'kind'='image' then
       begin source_asset:=(piece->>'asset_id')::uuid;
       exception when others then raise exception 'invalid_image_id'; end;
       select link.gallery_asset_id into target_asset
       from public.museum_publication_asset_links link
       join public.museum_artwork_assets original on original.id=link.source_asset_id
       join public.gallery_assets gallery_asset on gallery_asset.id=link.gallery_asset_id
       where link.review_id=rev.id and link.source_asset_id=source_asset
        and original.group_id=g.id and original.status='private_ready'
        and gallery_asset.uploader_id=a.created_by
        and gallery_asset.kind='image' and gallery_asset.mime_type='image/png';
       if target_asset is null then raise exception 'image_not_verified_for_publication'; end if;
     end if;
     model:=case when piece->>'kind'='model' then piece->>'model_key' else null end;
     if model is not null and model not in ('pedestal','globe','book') then raise exception 'bad_model'; end if;
     insert into public.gallery_exhibits(room_id,title,description,kind,model_key,asset_id,alt_text,submitted_by,transform,status)
     values(new_room,left(coalesce(nullif(trim(piece->>'title'),''),'Exhibit'),160),
       left(coalesce(piece->>'description',''),5000),piece->>'kind',
       model,target_asset,left(coalesce(piece->>'title','Student artwork'),500),a.created_by,coalesce(piece->'transform',
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

revoke all on function public.gcp_admin_decide(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.gcp_admin_archive_review(uuid,uuid) from public,anon,authenticated;
revoke all on function public.gcp_admin_archive_assignment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.gcp_admin_decide(uuid,uuid,text,text) to service_role;
grant execute on function public.gcp_admin_archive_review(uuid,uuid) to service_role;
grant execute on function public.gcp_admin_archive_assignment(uuid,uuid) to service_role;
