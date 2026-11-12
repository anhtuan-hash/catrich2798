-- BRIAN IMMERSIVE GALLERY R1, REVIEW ONLY. DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL.
-- Schema is additive; existing Brian tables are not altered.
begin;
create table if not exists public.gallery_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.gallery_settings(id, enabled) values (true, false) on conflict(id) do nothing;

create table if not exists public.gallery_exhibitions (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
 title text not null check(length(trim(title)) between 1 and 140),
 summary text not null default '' check(length(summary)<=1200),
 visibility text not null default 'private' check(visibility in ('private','school','public')),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 owner_id uuid not null references auth.users(id),
 accept_submissions boolean not null default false,
 published_at timestamptz,
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists gallery_exhibitions_owner_idx on public.gallery_exhibitions(owner_id);
create index if not exists gallery_exhibitions_status_idx on public.gallery_exhibitions(status,visibility,updated_at desc);

create table if not exists public.gallery_rooms (
 id uuid primary key default gen_random_uuid(),
 exhibition_id uuid not null references public.gallery_exhibitions(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),
 template_key text not null check(template_key in ('classic','culture','lab')),
 sort_order integer not null default 0 check(sort_order between 0 and 100),
 created_at timestamptz not null default now(),
 unique(exhibition_id,sort_order)
);
create index if not exists gallery_rooms_exhibition_idx on public.gallery_rooms(exhibition_id);

create table if not exists public.gallery_assets (
 id uuid primary key default gen_random_uuid(),
 uploader_id uuid not null references auth.users(id),
 path text not null unique,
 kind text not null check(kind in ('image','audio','pdf')),
 mime_type text not null,
 byte_size bigint not null check(byte_size>0 and byte_size<=12582912),
 created_at timestamptz not null default now(),
 constraint gallery_asset_owner_path check(split_part(path,'/',1)=uploader_id::text),
 constraint gallery_asset_mime check(
   (kind='image' and mime_type in ('image/png','image/jpeg','image/webp','image/avif')) or
   (kind='audio' and mime_type in ('audio/mpeg','audio/mp4','audio/ogg','audio/wav')) or
   (kind='pdf' and mime_type='application/pdf'))
);
create index if not exists gallery_assets_owner_idx on public.gallery_assets(uploader_id);

create table if not exists public.gallery_exhibits (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.gallery_rooms(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160),
 description text not null default '' check(length(description)<=5000),
 kind text not null default 'text' check(kind in ('text','image','audio','video','pdf','model')),
 asset_id uuid references public.gallery_assets(id) on delete set null,
 external_url text,
 model_key text,
 alt_text text not null default '' check(length(alt_text)<=500),
 transcript text not null default '' check(length(transcript)<=5000),
 transform jsonb not null default '{"position":[0,2,-7.72],"rotation":[0,0,0],"scale":[1,1,1]}'::jsonb
  check(jsonb_typeof(transform)='object' and pg_column_size(transform)<=1500),
 status text not null default 'draft' check(status in ('draft','submitted','approved','published','rejected')),
 submitted_by uuid not null references auth.users(id),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 review_note text not null default '' check(length(review_note)<=1000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists gallery_exhibits_room_idx on public.gallery_exhibits(room_id,status);
create index if not exists gallery_exhibits_submitter_idx on public.gallery_exhibits(submitted_by,status);

alter table public.gallery_settings enable row level security;
alter table public.gallery_exhibitions enable row level security;
alter table public.gallery_rooms enable row level security;
alter table public.gallery_assets enable row level security;
alter table public.gallery_exhibits enable row level security;
revoke all on public.gallery_settings,public.gallery_exhibitions,public.gallery_rooms,public.gallery_assets,public.gallery_exhibits from anon;
grant select,update on public.gallery_settings to authenticated;
grant select,insert,update on public.gallery_exhibitions,public.gallery_rooms,public.gallery_exhibits,public.gallery_assets to authenticated;

-- Only canonical server-managed profile.role may authorize administrative operations.
create policy gallery_settings_select on public.gallery_settings for select to authenticated using (true);
create policy gallery_settings_admin_update on public.gallery_settings for update to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true));

-- The own-school check is intentionally strict and fails closed when school is blank.
-- The gallery requires Brian login even when visibility='public'; no anon grant exists.
create policy gallery_exhibitions_select on public.gallery_exhibitions for select to authenticated using (
 owner_id=(select auth.uid()) or
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true) or
 (
  status='published' and
  (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()) and
  exists(select 1 from public.gallery_settings s where s.id=true and s.enabled=true) and
  (
   visibility='public' or
   (
    visibility='school' and
    exists(select 1 from public.profiles viewer join public.profiles owner on owner.id=owner_id
      where viewer.id=(select auth.uid()) and length(trim(viewer.school))>0 and viewer.school=owner.school and viewer.approved=true)
   )
  )
 )
);
create policy gallery_exhibitions_insert on public.gallery_exhibitions for insert to authenticated
 with check(owner_id=(select auth.uid()) and status='draft' and visibility in ('private','school','public')
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin','teacher','department_head') and p.approved=true));
create policy gallery_exhibitions_update on public.gallery_exhibitions for update to authenticated
 using(owner_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))
 with check(
  (owner_id=(select auth.uid()) and status<>'published' and
   exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin','teacher','department_head') and p.approved=true))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true)
 );

create policy gallery_rooms_select on public.gallery_rooms for select to authenticated
 using(exists(select 1 from public.gallery_exhibitions g where g.id=exhibition_id));
create policy gallery_rooms_insert on public.gallery_rooms for insert to authenticated
 with check(exists(select 1 from public.gallery_exhibitions g where g.id=exhibition_id and
 (g.owner_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))));
create policy gallery_rooms_update on public.gallery_rooms for update to authenticated
 using(exists(select 1 from public.gallery_exhibitions g where g.id=exhibition_id and
 (g.owner_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))))
 with check(exists(select 1 from public.gallery_exhibitions g where g.id=exhibition_id and
 (g.owner_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))));

create policy gallery_exhibits_select on public.gallery_exhibits for select to authenticated
 using(submitted_by=(select auth.uid())
 or exists(select 1 from public.gallery_rooms r join public.gallery_exhibitions g on g.id=r.exhibition_id
 where r.id=room_id and (g.owner_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true)
 or (status='published' and g.status='published'))));
create policy gallery_exhibits_insert on public.gallery_exhibits for insert to authenticated
 with check(submitted_by=(select auth.uid()) and
 (
   (status='draft' and exists(select 1 from public.gallery_rooms r join public.gallery_exhibitions g on g.id=r.exhibition_id
     where r.id=room_id and (g.owner_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))))
  or (status='submitted' and exists(select 1 from public.gallery_rooms r join public.gallery_exhibitions g on g.id=r.exhibition_id
    where r.id=room_id and g.status='published' and g.accept_submissions=true and
    exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='student' and p.approved=true)))
 ));
create policy gallery_exhibits_update on public.gallery_exhibits for update to authenticated
 using(exists(select 1 from public.gallery_rooms r join public.gallery_exhibitions g on g.id=r.exhibition_id where r.id=room_id and
 (g.owner_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))))
 with check(exists(select 1 from public.gallery_rooms r join public.gallery_exhibitions g on g.id=r.exhibition_id where r.id=room_id and
 (g.owner_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))));

create policy gallery_assets_select on public.gallery_assets for select to authenticated using (
 uploader_id=(select auth.uid()) or
 exists(select 1 from public.gallery_exhibits e where e.asset_id=id and
 (e.status='published' or e.status='submitted' or e.status='approved'))
);
create policy gallery_assets_insert on public.gallery_assets for insert to authenticated with check (
 uploader_id=(select auth.uid()) and split_part(path,'/',1)=(select auth.uid())::text
);
create policy gallery_assets_update on public.gallery_assets for update to authenticated
 using(uploader_id=(select auth.uid())) with check(uploader_id=(select auth.uid()));

-- Keep media in a private bucket; signed URLs are short lived and RLS checks matter.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('brian-gallery-private','brian-gallery-private',false,12582912,
 array['image/png','image/jpeg','image/webp','image/avif','audio/mpeg','audio/mp4','audio/ogg','audio/wav','application/pdf'])
 on conflict(id) do nothing;
create policy gallery_storage_insert on storage.objects for insert to authenticated
 with check(bucket_id='brian-gallery-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy gallery_storage_select on storage.objects for select to authenticated
 using(bucket_id='brian-gallery-private' and
 ((storage.foldername(name))[1]=(select auth.uid())::text or
 exists(select 1 from public.gallery_assets a where a.path=name)));

-- Prevent metadata spoofing and bypass of moderation via direct API calls.
create or replace function public.gallery_lock_exhibit_identity() returns trigger
language plpgsql security invoker set search_path = '' as $
begin
 if new.submitted_by is distinct from old.submitted_by then raise exception 'submitted_by is immutable'; end if;
 if new.room_id is distinct from old.room_id then raise exception 'room_id is immutable'; end if;
 if new.status='published' and old.status<>'published' and not exists(
   select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.approved=true
 ) then raise exception 'Only admin may publish exhibits'; end if;
 return new;
end; $;
revoke all on function public.gallery_lock_exhibit_identity() from public,anon,authenticated;
drop trigger if exists gallery_immutable_exhibit on public.gallery_exhibits;
create trigger gallery_immutable_exhibit before update on public.gallery_exhibits
 for each row execute function public.gallery_lock_exhibit_identity();

commit;

-- SECURITY REVIEW REQUIRED BEFORE APPLYING:
-- 1. Check that 'profiles' is actually readable to its own user.
-- 2. Verify tenant/class membership before allowing student submissions (R1 temporary
--    model limits students to approved registered Brian accounts and publication-enabled exhibitions).
-- 3. Attempt direct REST UPDATE that swaps room_id, owner_id, or submitted_by;
--    if permitted, add immutable-identity trigger before production authorization.
-- 4. Verify private signed URL access and cache revocation semantics in staging.
