-- Museum Lab V3.1 classroom teaching + private student-created artwork.
-- Additive only. Does not modify existing Gallery R1 policies or publish student work.
begin;
create table public.museum_live_sessions(
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null unique references public.gcp_assignments(id) on delete restrict,
 owner_id uuid not null references auth.users(id),
 school_scope text not null,
 stage_index integer not null default 0 check(stage_index between 0 and 10),
 status text not null default 'paused' check(status in ('active','paused','ended')),
 stage_open boolean not null default false,
 revealed boolean not null default false,
 started_at timestamptz not null default now(),
 stage_started_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 0 check(version>=0)
);
create table public.museum_live_responses(
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.museum_live_sessions(id) on delete restrict,
 group_id uuid not null references public.gcp_groups(id) on delete restrict,
 stage_index integer not null check(stage_index in (0,1,2,7,10)),
 value jsonb not null check(pg_column_size(value)<=1800),
 created_at timestamptz not null default now(),
 unique(session_id,stage_index,group_id)
);
create index museum_live_responses_stage_idx on public.museum_live_responses(session_id,stage_index);
create table public.museum_artwork_assets(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.gcp_groups(id) on delete restrict,
 assignment_id uuid not null references public.gcp_assignments(id) on delete restrict,
 storage_path text not null unique,
 mime text not null default 'image/png' check(mime='image/png'),
 bytes integer not null check(bytes between 100 and 3200000),
 width integer not null check(width between 1 and 1600),
 height integer not null check(height between 1 and 1600),
 original_name text not null default 'Student artwork' check(length(original_name)<=150),
 sha256 text not null check(length(sha256)=64),
 status text not null default 'private_ready' check(status in ('private_ready','removed')),
 created_at timestamptz not null default now(),
 removed_at timestamptz
);
create index museum_artwork_group_idx on public.museum_artwork_assets(group_id,status,created_at);
create table public.museum_learning_events(
 id uuid primary key default gen_random_uuid(),
 session_id uuid references public.museum_live_sessions(id) on delete restrict,
 group_id uuid references public.gcp_groups(id) on delete restrict,
 actor_role text not null check(actor_role in ('teacher','group')),
 action text not null check(length(action)<=70),
 stage_index integer check(stage_index between 0 and 10),
 details jsonb not null default '{}'::jsonb check(pg_column_size(details)<4000),
 created_at timestamptz not null default now()
);
create index museum_learning_session_idx on public.museum_learning_events(session_id,created_at);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('museum-artwork-private','museum-artwork-private',false,3200000,array['image/png'])
on conflict(id) do update set public=false,file_size_limit=3200000,allowed_mime_types=array['image/png'];
alter table public.museum_live_sessions enable row level security;
alter table public.museum_live_responses enable row level security;
alter table public.museum_artwork_assets enable row level security;
alter table public.museum_learning_events enable row level security;
revoke all on public.museum_live_sessions,public.museum_live_responses,
 public.museum_artwork_assets,public.museum_learning_events from public,anon,authenticated;
grant all on public.museum_live_sessions,public.museum_live_responses,
 public.museum_artwork_assets,public.museum_learning_events to service_role;
-- No browser or guest JWT may read Storage objects. Only server-side privileged access.
revoke all on storage.objects from anon;
commit;
