-- V3.1 approved student artwork publication bridge.
-- Private lesson preview is NOT a public publication. This function is called
-- only after an Admin verified the immutable TTCM-approved review snapshot.
begin;
create table public.museum_publication_asset_links(
 review_id uuid not null references public.gcp_reviews(id) on delete restrict,
 source_asset_id uuid not null references public.museum_artwork_assets(id) on delete restrict,
 gallery_asset_id uuid not null unique references public.gallery_assets(id) on delete restrict,
 created_at timestamptz not null default now(),
 primary key(review_id,source_asset_id)
);
alter table public.museum_publication_asset_links enable row level security;
revoke all on public.museum_publication_asset_links from public,anon,authenticated;
grant all on public.museum_publication_asset_links to service_role;
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
commit;
