#!/usr/bin/env bash
# Real PostgreSQL 16 RLS acceptance exercise using synthetic accounts only.
# No Supabase project, network, credentials, personal data, or production migration writes.
set -euo pipefail
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}" PGDATABASE="${PGDATABASE:-postgres}"
p() { psql -X -v ON_ERROR_STOP=1 -q "$@"; }
echo "[gallery-sql] Bootstrap disposable Supabase-compatible SQL primitives"
p <<'SQL'
create role anon nologin;
create role authenticated nologin;
create schema if not exists auth;
create schema if not exists storage;
grant usage on schema auth,storage,public to authenticated;
create table auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant execute on function auth.uid() to authenticated;
create table public.profiles(
  id uuid primary key references auth.users(id),
  role text not null check(role in ('admin','teacher','department_head','student')),
  school text not null default '',
  approved boolean not null default false
);
alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
-- Match the real Brian ordinary-user profile SELECT rule.
create policy synthetic_profile_read on public.profiles for select to authenticated
 using(id=(select auth.uid()));
create table storage.buckets(
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects(
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null
);
alter table storage.objects enable row level security;
grant select,insert on storage.objects to authenticated;
create or replace function storage.foldername(text) returns text[]
language sql immutable as $$ select string_to_array($1,'/') $$;
grant execute on function storage.foldername(text) to authenticated;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333'),
 ('44444444-4444-4444-8444-444444444444'),
 ('55555555-5555-4555-8555-555555555555'),
 ('66666666-6666-4666-8666-666666666666');
insert into public.profiles(id,role,school,approved) values
 ('11111111-1111-4111-8111-111111111111','admin','SCHOOL-A',true),
 ('22222222-2222-4222-8222-222222222222','teacher','SCHOOL-A',true),
 ('33333333-3333-4333-8333-333333333333','teacher','SCHOOL-A',true),
 ('44444444-4444-4444-8444-444444444444','teacher','SCHOOL-B',true),
 ('55555555-5555-4555-8555-555555555555','student','SCHOOL-A',true),
 ('66666666-6666-4666-8666-666666666666','student','SCHOOL-B',true);
SQL
echo "[gallery-sql] Apply migration to synthetic temporary database"
p -f supabase/migrations/20261112140000_brian_immersive_gallery_r1.sql
echo "[gallery-sql] Teacher creates private draft, room, asset and exhibit"
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
insert into public.gallery_exhibitions(id,slug,title,visibility,status,owner_id,accept_submissions) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','synthetic-climate','Synthetic Climate','school','draft','22222222-2222-4222-8222-222222222222',true);
insert into public.gallery_rooms(id,exhibition_id,title,template_key,sort_order) values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Classic','classic',0);
insert into public.gallery_assets(id,uploader_id,path,kind,mime_type,byte_size) values
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222/synthetic.png','image','image/png',248);
insert into public.gallery_exhibits(id,room_id,title,kind,asset_id,submitted_by,status) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Synthetic poster','image',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222','draft');
do $$ begin
 if (select count(*) from public.gallery_exhibitions where slug='synthetic-climate')<>1
 then raise exception 'Owner cannot read own draft';end if;
end $$;
SQL
echo "[gallery-sql] Verify immutable school scope from canonical owner profile"
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $ begin
 if (select school_scope from public.gallery_exhibitions where slug='synthetic-climate')<>'SCHOOL-A'
 then raise exception 'Canonical school scope mismatch';end if;
end $;
SQL
echo "[gallery-sql] Seed foreign uploader and verify cross-account asset reference guard"
p <<'SQL'
insert into public.gallery_assets(id,uploader_id,path,kind,mime_type,byte_size) values
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111/admin-only.png','image','image/png',135);
SQL
echo "[gallery-sql] Unrelated teacher cannot read or modify private draft"
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
do $$ begin
 if (select count(*) from public.gallery_exhibitions where slug='synthetic-climate')<>0
 then raise exception 'Cross-school draft leak';end if;
 if (select count(*) from public.gallery_assets where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')<>0
 then raise exception 'Private asset leak';end if;
end $$;
SQL
echo "[gallery-sql] Approved teacher reviews the draft"
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
update public.gallery_exhibits
set status='approved',reviewed_by='22222222-2222-4222-8222-222222222222',reviewed_at=now()
where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
SQL
denied() {
 local statement="$1" role="$2" label="$3"
 if psql -X -v ON_ERROR_STOP=1 -q -c "set role authenticated; select set_config('request.jwt.claim.sub','$role',false); $statement" >/tmp/gallery-denied.out 2>&1; then
  echo "[gallery-sql] FAILURE: $label unexpectedly permitted"
  cat /tmp/gallery-denied.out
  exit 1
 fi
 echo "[gallery-sql] DENIED: $label"
}
denied "select public.gallery_publish_exhibition('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');"  '22222222-2222-4222-8222-222222222222' 'Teacher unauthorized publish'
denied "update public.gallery_exhibits set description='tampered' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';"  '22222222-2222-4222-8222-222222222222' 'Edit after approval without returning to draft'
denied "update public.gallery_exhibits set submitted_by='33333333-3333-4333-8333-333333333333' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';"  '22222222-2222-4222-8222-222222222222' 'Reassign immutable submitter'
denied "insert into public.gallery_exhibits(room_id,title,kind,asset_id,submitted_by,status) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Forged foreign image','image','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','22222222-2222-4222-8222-222222222222','draft');" \
 '22222222-2222-4222-8222-222222222222' 'Teacher attaches another uploader protected asset'
denied "update public.gallery_assets set path='22222222-2222-4222-8222-222222222222/reassigned.png' where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';" \
 '22222222-2222-4222-8222-222222222222' 'Changing approved asset metadata'
denied "update public.gallery_exhibitions set school_scope='SCHOOL-B' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';" \
 '22222222-2222-4222-8222-222222222222' 'Forged school scope'
denied "update public.gallery_exhibitions set owner_id='33333333-3333-4333-8333-333333333333' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';" \
 '22222222-2222-4222-8222-222222222222' 'Forged exhibition owner'
echo "[gallery-sql] Admin enables Gallery and atomically publishes"
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
update public.gallery_settings set enabled=true where id=true;
select status from public.gallery_publish_exhibition('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$ begin
 if (select status from public.gallery_exhibits where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>'published'
 then raise exception 'Atomic publisher did not approve exhibit';end if;
end $$;
SQL
echo "[gallery-sql] Same-school teacher can read; unrelated teacher cannot"
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$ begin
 if (select count(*) from public.gallery_exhibitions where slug='synthetic-climate')<>1
 then raise exception 'Same-school view rejected';end if;
 if (select count(*) from public.gallery_assets where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')<>1
 then raise exception 'Approved school media rejected';end if;
end $$;
SQL
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
do $$ begin
 if (select count(*) from public.gallery_exhibitions where slug='synthetic-climate')<>0
 then raise exception 'Cross-school published gallery disclosed';end if;
 if (select count(*) from public.gallery_assets where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')<>0
 then raise exception 'Cross-school media disclosed';end if;
end $$;
SQL
echo "[gallery-sql] Student from another school is refused"
denied "insert into public.gallery_exhibits(room_id,title,kind,submitted_by,status) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Cross-school','text','66666666-6666-4666-8666-666666666666','submitted');"  '66666666-6666-4666-8666-666666666666' 'Cross-school student submission'
echo "[gallery-sql] Same-school synthetic student submission succeeds (future role prototype only)"
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',false);
insert into public.gallery_exhibits(room_id,title,kind,submitted_by,status)
values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Approved school draft','text',
'55555555-5555-4555-8555-555555555555','submitted');
SQL
echo "[gallery-sql] Disabling feature blocks published school visitor access"
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
update public.gallery_settings set enabled=false where id=true;
SQL
p <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$ begin
 if (select count(*) from public.gallery_exhibitions where slug='synthetic-climate')<>0
 then raise exception 'Feature OFF does not block published gallery access';end if;
end $$;
SQL
echo "[gallery-sql] PASS synthetic PostgreSQL RLS and atomic publisher tests"
