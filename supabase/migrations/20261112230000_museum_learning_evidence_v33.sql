-- Additive V3.3: private immutable classroom evidence. No demo or student data seeded.
create table public.museum_survey_snapshots (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null unique references public.museum_live_sessions(id) on delete cascade,
 counts integer[] not null check(array_length(counts,1)=4 and 0 <= all(counts)),
 source text not null check(source in ('online','paper')),
 note text not null default '' check(length(note)<=500),
 created_at timestamptz not null default now()
);
create table public.museum_checkpoints (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.museum_live_sessions(id) on delete cascade,
 group_id uuid not null references public.gcp_groups(id) on delete cascade,
 kind text not null check(kind in ('storyboard','before','after')),
 doc jsonb not null, version integer not null, created_at timestamptz not null default now(),
 unique(session_id,group_id,kind)
);
create table public.museum_peer_pairs (
 session_id uuid not null references public.museum_live_sessions(id) on delete cascade,
 from_group uuid not null references public.gcp_groups(id) on delete cascade,
 to_group uuid not null references public.gcp_groups(id) on delete cascade,
 checkpoint_id uuid not null references public.museum_checkpoints(id) on delete cascade,
 primary key(session_id,from_group),unique(session_id,to_group),check(from_group<>to_group)
);
create table public.museum_peer_reviews (
 session_id uuid not null, from_group uuid not null,
 learned text not null check(length(learned) between 10 and 400),
 clarify text not null check(length(clarify) between 10 and 400),
 rating integer not null check(rating between 1 and 4),
 created_at timestamptz not null default now(),
 primary key(session_id,from_group),
 foreign key(session_id,from_group) references public.museum_peer_pairs(session_id,from_group) on delete cascade
);
alter table public.museum_survey_snapshots enable row level security;
alter table public.museum_checkpoints enable row level security;
alter table public.museum_peer_pairs enable row level security;
alter table public.museum_peer_reviews enable row level security;
revoke all on public.museum_survey_snapshots,public.museum_checkpoints,public.museum_peer_pairs,public.museum_peer_reviews from public,anon,authenticated;
grant select,insert,delete on public.museum_survey_snapshots,public.museum_checkpoints,public.museum_peer_pairs,public.museum_peer_reviews to service_role;
-- Serialize draft saves and response inserts against teacher transitions/freezing.
create function public.museum_evidence_write_guard() returns trigger language plpgsql set search_path='' as $$
declare s public.museum_live_sessions;
begin
 if tg_table_name='gcp_drafts' then
  select ls.* into s from public.museum_live_sessions ls join public.gcp_groups g on g.assignment_id=ls.assignment_id where g.id=new.group_id for update of ls;
  if s.id is not null and (s.status<>'active' or not s.stage_open or s.stage_index not in (3,4,6,7,8,9,10)) then raise exception 'Teacher has closed editing'; end if;
 else
  select * into s from public.museum_live_sessions where id=new.session_id for update;
  if s.status<>'active' or not s.stage_open or s.stage_index<>new.stage_index then raise exception 'Activity is closed'; end if;
  if new.stage_index=2 and exists(select 1 from public.museum_survey_snapshots where session_id=s.id) then raise exception 'Survey is frozen'; end if;
 end if;
 return new;
end $$;
create trigger museum_draft_evidence_guard before update of doc on public.gcp_drafts for each row execute function public.museum_evidence_write_guard();
create trigger museum_response_evidence_guard before insert on public.museum_live_responses for each row execute function public.museum_evidence_write_guard();
-- Checkpoints and pairing occur inside the SAME transaction as the stage transition.
create function public.museum_capture_transition() returns trigger language plpgsql set search_path='' as $$
declare k text;
begin
 if new.stage_index=old.stage_index then return new; end if;
 k:=case when old.stage_index=4 and new.stage_index=5 then 'storyboard' when old.stage_index=6 and new.stage_index=7 then 'before' when old.stage_index=8 and new.stage_index=9 then 'after' end;
 if k is null then return new; end if;
 insert into public.museum_checkpoints(session_id,group_id,kind,doc,version)
 select new.id,g.id,k,coalesce(d.doc,'{}'::jsonb),coalesce(d.version,0) from public.gcp_groups g left join public.gcp_drafts d on d.group_id=g.id where g.assignment_id=new.assignment_id on conflict do nothing;
 if k='before' then
  insert into public.museum_peer_pairs(session_id,from_group,to_group,checkpoint_id)
  select new.id,x.id,x.target,c.id from (
   select id,coalesce(lead(id) over(order by label collate "C",id),first_value(id) over(order by label collate "C",id)) target
   from public.gcp_groups where assignment_id=new.assignment_id
  ) x join public.museum_checkpoints c on c.session_id=new.id and c.group_id=x.target and c.kind='before'
  where x.id<>x.target on conflict do nothing;
 end if;
 return new;
end $$;
create trigger museum_capture_transition after update of stage_index on public.museum_live_sessions for each row execute function public.museum_capture_transition();
create function public.museum_freeze_survey(p_session uuid,p_version integer,p_counts integer[] default null,p_note text default '') returns jsonb language plpgsql set search_path='' as $$
declare s public.museum_live_sessions; snap public.museum_survey_snapshots; c integer[]; total integer;
begin
 select * into s from public.museum_live_sessions where id=p_session for update;
 select * into snap from public.museum_survey_snapshots where session_id=p_session;
 if snap.id is not null then return to_jsonb(snap); end if;
 if s.id is null or s.version<>p_version or s.status<>'active' or s.stage_index<>2 then raise exception 'Survey state changed'; end if;
 if p_counts is not null then
  if exists(select 1 from public.museum_live_responses where session_id=p_session and stage_index=2) then raise exception 'Cannot mix paper tally with online votes'; end if;
  c:=p_counts;
 else
  select array_agg(n order by i) into c from (select i,(select count(*)::integer from public.museum_live_responses where session_id=p_session and stage_index=2 and value=to_jsonb(i)) n from generate_series(0,3) i) a;
 end if;
 select sum(v) into total from unnest(c) v;
 if array_length(c,1)<>4 or not (0<=all(c)) or total<1 or total>1000 or array_position(c,null) is not null then raise exception 'Invalid tally'; end if;
 insert into public.museum_survey_snapshots(session_id,counts,source,note) values(p_session,c,case when p_counts is null then 'online' else 'paper' end,left(p_note,500)) returning * into snap;
 update public.museum_live_sessions set stage_open=false,revealed=true,version=version+1,updated_at=now() where id=p_session;
 return to_jsonb(snap);
end $$;
revoke all on function public.museum_evidence_write_guard(),public.museum_capture_transition(),public.museum_freeze_survey(uuid,integer,integer[],text) from public,anon,authenticated;
grant execute on function public.museum_freeze_survey(uuid,integer,integer[],text) to service_role;

create function public.museum_peer_review_guard() returns trigger language plpgsql set search_path='' as $$
declare s public.museum_live_sessions;
begin
 select * into s from public.museum_live_sessions where id=new.session_id for update;
 if s.status<>'active' or not s.stage_open or s.stage_index<>7 then raise exception 'Peer review is closed'; end if;
 return new;
end $$;
create trigger museum_peer_review_guard before insert on public.museum_peer_reviews for each row execute function public.museum_peer_review_guard();
revoke all on function public.museum_peer_review_guard() from public,anon,authenticated;
