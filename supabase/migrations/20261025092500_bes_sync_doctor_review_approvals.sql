-- Brian Sync Doctor v1.2: request / independent review / server audit only.
-- No authorization to mutate student, score, roster, homeroom or assessment records.
create table if not exists public.bes_sync_review_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id),
  case_hash text not null check (case_hash ~ '^[0-9a-f]{64}$'),
  issue_code text not null check (issue_code ~ '^[A-Z_]{3,64}$'),
  source text not null check (source in ('canonical','gradebook','homeroom','assessment','assignment','multiple','browser')),
  school_year text not null check (school_year ~ '^20[0-9]{2}-20[0-9]{2}$'),
  class_name text not null check (length(class_name) between 1 and 40),
  workspace_id text not null default '' check (length(workspace_id) <= 160),
  source_revision timestamptz,
  canonical_revision timestamptz,
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted' check (status in ('submitted','approved_for_review','rejected','stale','cancelled')),
  note text not null default '' check (length(note) <= 600),
  reviewer_id uuid references auth.users(id),
  reviewer_note text not null default '' check (length(reviewer_note) <= 600),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists bes_sync_review_requests_submitted_idx on public.bes_sync_review_requests(submitted_at desc);
create index if not exists bes_sync_review_requests_requester_idx on public.bes_sync_review_requests(requester_id, submitted_at desc);

create table if not exists public.bes_sync_review_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.bes_sync_review_requests(id),
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('submitted','approved_for_review','rejected','stale','cancelled')),
  occurred_at timestamptz not null default now(),
  note text not null default '' check(length(note) <= 600)
);
create index if not exists bes_sync_review_events_request_idx on public.bes_sync_review_events(request_id,id desc);

alter table public.bes_sync_review_requests enable row level security;
alter table public.bes_sync_review_events enable row level security;

revoke all on public.bes_sync_review_requests from public, anon, authenticated;
revoke all on public.bes_sync_review_events from public, anon, authenticated;
grant select on public.bes_sync_review_requests to authenticated;
grant select on public.bes_sync_review_events to authenticated;

create policy bes_sync_review_requests_read on public.bes_sync_review_requests
for select to authenticated using (
  requester_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id=(select auth.uid())
    and p.approved is true and p.role in ('admin','department_head'))
);
create policy bes_sync_review_events_read on public.bes_sync_review_events
for select to authenticated using (
  exists (
    select 1 from public.bes_sync_review_requests r
    where r.id=request_id and (
      r.requester_id=(select auth.uid())
      or exists (select 1 from public.profiles p
        where p.id=(select auth.uid()) and p.approved is true
          and p.role in ('admin','department_head'))
    )
  )
);

-- All writes happen through this allowlisted RPC, never direct client inserts.
create or replace function public.bes_sync_submit_review(
  p_case_hash text, p_issue_code text, p_source text,
  p_school_year text, p_class_name text, p_workspace_id text default '',
  p_source_revision timestamptz default null, p_canonical_revision timestamptz default null,
  p_note text default ''
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  created uuid;
  actual_source timestamptz;
  actual_canonical timestamptz;
begin
  if actor is null or not exists (
    select 1 from public.profiles p where p.id=actor and p.approved is true
      and p.role in ('admin','department_head')
  ) then
    raise exception 'Sync Doctor reviewer permission required' using errcode='42501';
  end if;
  if coalesce(p_case_hash,'') !~ '^[0-9a-f]{64}$'
    or coalesce(p_issue_code,'') !~ '^[A-Z_]{3,64}$'
    or p_source not in ('canonical','gradebook','homeroom','assessment','assignment','multiple','browser')
    or coalesce(p_school_year,'') !~ '^20[0-9]{2}-20[0-9]{2}$'
    or length(trim(coalesce(p_class_name,''))) not between 1 and 40
    or length(coalesce(p_workspace_id,'')) > 160 or length(coalesce(p_note,'')) > 600
  then raise exception 'Invalid review scope or metadata' using errcode='22023'; end if;

  if p_issue_code='STUDENT_NOT_LINKED' and
     (p_source not in ('gradebook','homeroom') or p_source_revision is null
       or p_canonical_revision is null or coalesce(p_workspace_id,'') = '') then
    raise exception 'Association review requires source and canonical revisions' using errcode='22023';
  end if;

  if p_canonical_revision is not null then
    select r.updated_at into actual_canonical
      from public.bes_class_rosters r
      where r.roster_key=('class:'||lower(p_school_year)||'||'||lower(p_class_name))
      limit 1;
    if actual_canonical is distinct from p_canonical_revision then
      raise exception 'Canonical revision changed: rescan required' using errcode='40001';
    end if;
  end if;
  if p_source_revision is not null and p_source in ('gradebook','homeroom') then
    if coalesce(p_workspace_id,'')='' then raise exception 'Workspace reference required' using errcode='22023'; end if;
    if p_source='gradebook' then
      select g.updated_at into actual_source from public.bes_gradebook_workspaces g
        where g.workspace_id=p_workspace_id and g.school_year=p_school_year
          and g.class_name=p_class_name limit 1;
    else
      select h.updated_at into actual_source from public.bes_homeroom_workspaces h
        where h.workspace_id=p_workspace_id and h.school_year=p_school_year
          and h.class_name=p_class_name limit 1;
    end if;
    if actual_source is distinct from p_source_revision then
      raise exception 'Workspace revision changed: rescan required' using errcode='40001';
    end if;
  end if;

  insert into public.bes_sync_review_requests
    (requester_id,case_hash,issue_code,source,school_year,class_name,
     workspace_id,source_revision,canonical_revision,note)
  values (actor,p_case_hash,p_issue_code,p_source,p_school_year,trim(p_class_name),
     coalesce(p_workspace_id,''),p_source_revision,p_canonical_revision,coalesce(p_note,''))
  returning id into created;

  insert into public.bes_sync_review_events(request_id,actor_id,action,note)
    values (created,actor,'submitted','Request created; no underlying data changed');
  return created;
end;
$$;

create or replace function public.bes_sync_decide_review(
  p_request_id uuid, p_decision text, p_note text default ''
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  r public.bes_sync_review_requests%rowtype;
  actual_source timestamptz;
  actual_canonical timestamptz;
  next_status text;
begin
  if actor is null or not exists (
    select 1 from public.profiles p where p.id=actor and p.approved is true
      and p.role in ('admin','department_head')
  ) then raise exception 'Reviewer permission required' using errcode='42501'; end if;
  if p_decision not in ('approved_for_review','rejected') or length(coalesce(p_note,''))>600
  then raise exception 'Invalid decision' using errcode='22023'; end if;
  select * into r from public.bes_sync_review_requests where id=p_request_id for update;
  if not found then raise exception 'Review request does not exist' using errcode='P0002'; end if;
  if r.status <> 'submitted' then raise exception 'Review already resolved' using errcode='55000'; end if;
  if r.requester_id=actor then raise exception 'Independent reviewer required' using errcode='42501'; end if;

  next_status := p_decision;
  if p_decision='approved_for_review' then
    if r.canonical_revision is not null then
      select c.updated_at into actual_canonical from public.bes_class_rosters c
        where c.roster_key=('class:'||lower(r.school_year)||'||'||lower(r.class_name)) limit 1;
      if actual_canonical is distinct from r.canonical_revision then next_status:='stale'; end if;
    end if;
    if r.source_revision is not null and r.source in ('gradebook','homeroom') then
      if r.source='gradebook' then
        select g.updated_at into actual_source from public.bes_gradebook_workspaces g
          where g.workspace_id=r.workspace_id and g.school_year=r.school_year
             and g.class_name=r.class_name limit 1;
      else
        select h.updated_at into actual_source from public.bes_homeroom_workspaces h
          where h.workspace_id=r.workspace_id and h.school_year=r.school_year
             and h.class_name=r.class_name limit 1;
      end if;
      if actual_source is distinct from r.source_revision then next_status:='stale'; end if;
    end if;
  end if;

  update public.bes_sync_review_requests
    set status=next_status, reviewer_id=actor,
      reviewer_note=case when next_status='stale' then 'Source changed; rescan required'
        else coalesce(p_note,'') end,
      reviewed_at=now(),updated_at=now()
  where id=r.id;

  insert into public.bes_sync_review_events(request_id,actor_id,action,note)
    values(r.id,actor,next_status,
      case when next_status='stale' then 'Source changed; no repair executed'
       else left(coalesce(p_note,''),600) end);
  return next_status;
end;
$$;

create or replace function public.bes_sync_cancel_review(
  p_request_id uuid
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 r public.bes_sync_review_requests%rowtype;
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into r from public.bes_sync_review_requests where id=p_request_id for update;
 if not found then raise exception 'Request does not exist' using errcode='P0002'; end if;
 if r.requester_id<>actor or r.status<>'submitted' then
   raise exception 'Only the requester can cancel a pending review' using errcode='42501';
 end if;
 update public.bes_sync_review_requests set status='cancelled',updated_at=now() where id=r.id;
 insert into public.bes_sync_review_events(request_id,actor_id,action,note)
 values(r.id,actor,'cancelled','Cancelled by original requester');
 return 'cancelled';
end;
$$;

revoke execute on function public.bes_sync_submit_review(text,text,text,text,text,text,timestamptz,timestamptz,text)
 from public,anon;
revoke execute on function public.bes_sync_decide_review(uuid,text,text) from public,anon;
revoke execute on function public.bes_sync_cancel_review(uuid) from public,anon;
grant execute on function public.bes_sync_submit_review(text,text,text,text,text,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.bes_sync_decide_review(uuid,text,text) to authenticated;
grant execute on function public.bes_sync_cancel_review(uuid) to authenticated;

comment on table public.bes_sync_review_requests is
  'Sync Doctor review approvals only; never authorizes a data repair.';
comment on table public.bes_sync_review_events is
  'Append-only server-side review events, writable by guarded RPC functions only.';
