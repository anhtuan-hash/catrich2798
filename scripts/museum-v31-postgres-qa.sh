#!/usr/bin/env bash
# Disposable PostgreSQL 16: real SQL constraints and TTCM-approved image publication.
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres
p(){ psql -X -v ON_ERROR_STOP=1 -q "$@"; }
bash scripts/gallery-creator-postgres-qa.sh >/tmp/museum-r1-v2.log 2>&1 || { tail -80 /tmp/museum-r1-v2.log; exit 1; }
p <<'SQL'
create schema if not exists storage;
create table storage.buckets(
 id text primary key,name text not null,public boolean not null default false,
 file_size_limit bigint,allowed_mime_types text[]
);
SQL
p -f supabase/migrations/20261112210000_museum_live_classroom_artwork.sql
p -f supabase/migrations/20261112212000_museum_approved_artwork_publication.sql
p <<'SQL'
do $check_rls$
declare t record;
begin
 for t in select tablename from pg_tables where schemaname='public'
  and (tablename like 'museum_%') loop
  if not(select relrowsecurity from pg_class where oid=('public.'||quote_ident(t.tablename))::regclass)
   then raise exception 'Missing RLS on %',t.tablename;end if;
  if has_table_privilege('anon','public.'||quote_ident(t.tablename),'SELECT')
   or has_table_privilege('authenticated','public.'||quote_ident(t.tablename),'SELECT')
   then raise exception 'Leaked direct table grants on %',t.tablename;end if;
 end loop;
 if (select public from storage.buckets where id='museum-artwork-private') then
  raise exception 'Student artwork bucket is not private';end if;
end $check_rls$;
insert into public.gcp_groups(id,assignment_id,label)
values('cccccccc-1111-4111-8111-111111111111',
'aaaaaaaa-1111-4111-8111-111111111111','QA image group');
insert into public.gcp_drafts(group_id)
values('cccccccc-1111-4111-8111-111111111111');
insert into public.museum_artwork_assets(
 id,group_id,assignment_id,storage_path,mime,bytes,width,height,original_name,sha256
)values(
 'dddddddd-1111-4111-8111-111111111111',
 'cccccccc-1111-4111-8111-111111111111',
 'aaaaaaaa-1111-4111-8111-111111111111',
 'aaaaaaaa-1111-4111-8111-111111111111/cccccccc-1111-4111-8111-111111111111/art.png',
 'image/png',500,100,100,'synthetic-poster.png',repeat('a',64)
);
SQL
p <<'SQL'
set role service_role;
select public.gcp_guest_save('cccccccc-1111-4111-8111-111111111111',0,
 '{"title":"Student Original Art","summary":"QA dummy",
 "rooms":[{"title":"Exhibit hall","template_key":"classic",
 "exhibits":[{"title":"Original poster","description":"A synthetic school improvement poster.",
 "kind":"image","asset_id":"dddddddd-1111-4111-8111-111111111111",
 "transform":{"position":[0,2,-7],"rotation":[0,0,0],"scale":[1,1,1]}}]}]}'::jsonb);
select public.gcp_guest_submit('cccccccc-1111-4111-8111-111111111111',1);
reset role;
SQL
p <<'SQL'
do $check_publication$
declare rev uuid; gallery_id uuid; link uuid; denied boolean:=false;
begin
 select id into rev from public.gcp_reviews where group_id='cccccccc-1111-4111-8111-111111111111';
 perform public.gcp_review_decide(rev,'22222222-2222-4222-8222-222222222222','teacher_forward','Synthetic teacher approved');
 perform public.gcp_review_decide(rev,'33333333-3333-4333-8333-333333333333','ttcm_approve','Synthetic TTCM approved');
 begin
  perform public.gcp_admin_publish(rev,'11111111-1111-4111-8111-111111111111');
 exception when others then denied:=true;end;
 if not denied then raise exception 'Unlinked image was published';end if;
 insert into public.gallery_assets(uploader_id,path,kind,mime_type,byte_size)
 values('22222222-2222-4222-8222-222222222222',
 '22222222-2222-4222-8222-222222222222/museum-approved/qa.png','image','image/png',500)
 returning id into link;
 insert into public.museum_publication_asset_links(review_id,source_asset_id,gallery_asset_id)
 values(rev,'dddddddd-1111-4111-8111-111111111111',link);
 gallery_id:=public.gcp_admin_publish(rev,'11111111-1111-4111-8111-111111111111');
 if gallery_id is null then raise exception 'No gallery published';end if;
 if not exists(select 1 from public.gallery_exhibits e join public.gallery_rooms room on room.id=e.room_id
  where room.exhibition_id=gallery_id and e.kind='image' and e.asset_id=link and e.status='published')
  then raise exception 'Approved original image failed native R1 publication';end if;
 if public.gcp_admin_publish(rev,'11111111-1111-4111-8111-111111111111') is distinct from gallery_id
  then raise exception 'Image publication is not idempotent';end if;
end $check_publication$;
SQL
echo "[museum-v31] PASSED: RLS, private bucket, unauthorized image denial, TTCM image publication"
