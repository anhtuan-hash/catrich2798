-- BRIAN Museum Lab: reversible, school-scoped exhibition removal.
-- Keep original student reviews, assets and learning evidence unchanged.
create table if not exists public.museum_showcase_archives (
 school_scope text not null check (char_length(school_scope) between 1 and 180),
 item_kind text not null check (item_kind in ('gallery','collection')),
 item_key text not null check (char_length(item_key) between 1 and 80),
 previous_status text check (previous_status in ('draft','published')),
 previous_visibility text check (previous_visibility in ('private','school','public')),
 previous_accept_submissions boolean,
 archived_by uuid not null references auth.users(id),
 archived_at timestamptz not null default now(),
 primary key (school_scope,item_kind,item_key)
);
alter table public.museum_showcase_archives enable row level security;
revoke all on table public.museum_showcase_archives from public, anon, authenticated;
grant select, insert, update, delete on table public.museum_showcase_archives to service_role;
-- The server calls this through a service-role client after verifying a signed-in
-- approved school Admin. Revalidate within the transaction, too.
create or replace function public.museum_showcase_change(
 p_kind text, p_key text, p_school text, p_actor uuid, p_archive boolean
) returns text
language plpgsql security invoker set search_path = public, pg_temp
as $function$
declare v_gallery public.gallery_exhibitions%rowtype;
        v_before public.museum_showcase_archives%rowtype;
begin
 if not exists(select 1 from public.profiles p
   where p.id=p_actor and p.approved=true and lower(p.role)='admin'
     and p.school=p_school) then
  raise exception 'admin_required' using errcode='42501';
 end if;
 if p_kind not in ('gallery','collection') or p_key is null then
  raise exception 'invalid_exhibition_key' using errcode='22023';
 end if;
 if p_kind='collection' then
  if p_key !~ '^[a-z0-9-]{1,64}$' then
   raise exception 'invalid_collection_key' using errcode='22023';
  end if;
  if p_archive then
   insert into public.museum_showcase_archives(school_scope,item_kind,item_key,archived_by)
   values(p_school,'collection',p_key,p_actor)
   on conflict (school_scope,item_kind,item_key) do nothing;
   return 'archived';
  end if;
  delete from public.museum_showcase_archives
   where school_scope=p_school and item_kind='collection' and item_key=p_key;
  if not found then raise exception 'archive_not_found' using errcode='P0002'; end if;
  return 'restored';
 end if;
 if p_key !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
  raise exception 'invalid_exhibition_id' using errcode='22023';
 end if;
 select * into v_gallery from public.gallery_exhibitions
  where id=p_key::uuid and school_scope=p_school for update;
 if not found then raise exception 'exhibition_not_found' using errcode='P0002'; end if;
 if p_archive then
  if v_gallery.status='archived' then return 'archived'; end if;
  insert into public.museum_showcase_archives(
   school_scope,item_kind,item_key,previous_status,previous_visibility,
   previous_accept_submissions,archived_by
  ) values(p_school,'gallery',p_key,v_gallery.status,v_gallery.visibility,
    v_gallery.accept_submissions,p_actor)
  on conflict (school_scope,item_kind,item_key) do nothing;
  update public.gallery_exhibitions set
   status='archived',visibility='private',accept_submissions=false,
   updated_at=now()
  where id=v_gallery.id;
  return 'archived';
 end if;
 select * into v_before from public.museum_showcase_archives
   where school_scope=p_school and item_kind='gallery' and item_key=p_key;
 if not found or v_gallery.status<>'archived' then
   raise exception 'archive_not_found' using errcode='P0002';
 end if;
 update public.gallery_exhibitions set
  status=coalesce(v_before.previous_status,'draft'),
  visibility=coalesce(v_before.previous_visibility,'private'),
  accept_submissions=coalesce(v_before.previous_accept_submissions,false),
  updated_at=now()
 where id=v_gallery.id;
 delete from public.museum_showcase_archives
  where school_scope=p_school and item_kind='gallery' and item_key=p_key;
 return 'restored';
end
$function$;
revoke execute on function public.museum_showcase_change(text,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.museum_showcase_change(text,text,text,uuid,boolean) to service_role;
