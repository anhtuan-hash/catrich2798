-- Classroom-only, group-initiated peer exhibition feedback.
-- Additive to existing Museum Lab; does not replace the stage 3 priority survey
-- or the original rotating stage 8 peer assessment.
begin;
create table if not exists public.museum_peer_live_rooms (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.museum_live_sessions(id) on delete cascade,
 owner_group_id uuid not null references public.gcp_groups(id) on delete cascade,
 draft_snapshot jsonb not null,
 draft_version integer not null check(draft_version >= 0),
 is_open boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(session_id,owner_group_id)
);
create table if not exists public.museum_peer_live_feedback (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.museum_peer_live_rooms(id) on delete cascade,
 from_group_id uuid not null references public.gcp_groups(id) on delete cascade,
 learned text not null check(length(trim(learned)) between 10 and 400),
 clarify text not null check(length(trim(clarify)) between 10 and 400),
 rating integer not null check(rating between 1 and 4),
 created_at timestamptz not null default now(),
 unique(room_id,from_group_id)
);
create index if not exists museum_peer_live_rooms_session_idx on public.museum_peer_live_rooms(session_id,is_open);
create index if not exists museum_peer_live_feedback_room_idx on public.museum_peer_live_feedback(room_id,created_at);
alter table public.museum_peer_live_rooms enable row level security;
alter table public.museum_peer_live_feedback enable row level security;
revoke all on public.museum_peer_live_rooms,public.museum_peer_live_feedback from public,anon,authenticated;
grant select,insert,update on public.museum_peer_live_rooms to service_role;
grant select,insert on public.museum_peer_live_feedback to service_role;
-- Protect response integrity even from accidental server-side bypass.
create or replace function public.museum_peer_live_feedback_guard() returns trigger
 language plpgsql set search_path='' as $$
declare r public.museum_peer_live_rooms; s public.museum_live_sessions;
        reviewer_assignment uuid; author_assignment uuid;
begin
 select * into r from public.museum_peer_live_rooms where id=new.room_id for update;
 if r.id is null or not r.is_open then raise exception 'Live feedback room closed'; end if;
 select * into s from public.museum_live_sessions where id=r.session_id for share;
 if s.id is null or s.status<>'active' or not s.stage_open or s.stage_index not between 7 and 9
 then raise exception 'Live peer feedback activity closed'; end if;
 select assignment_id into reviewer_assignment from public.gcp_groups where id=new.from_group_id;
 select assignment_id into author_assignment from public.gcp_groups where id=r.owner_group_id;
 if new.from_group_id=r.owner_group_id or reviewer_assignment is distinct from s.assignment_id
    or author_assignment is distinct from s.assignment_id
 then raise exception 'Invalid classroom peer feedback relation'; end if;
 return new;
end $$;
drop trigger if exists museum_peer_live_feedback_guard on public.museum_peer_live_feedback;
create trigger museum_peer_live_feedback_guard before insert on public.museum_peer_live_feedback
for each row execute function public.museum_peer_live_feedback_guard();
revoke all on function public.museum_peer_live_feedback_guard() from public,anon,authenticated;
commit;
