-- BRIAN Assessment 4.0. Additive tables. No existing assessment rows are changed.
create table if not exists public.lesson_check_workspace_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  favorites uuid[] not null default '{}',
  recent_ids uuid[] not null default '{}',
  collections jsonb not null default '[]'::jsonb,
  runner jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint workspace_collections_array check (jsonb_typeof(collections)='array'),
  constraint workspace_runner_object check (jsonb_typeof(runner)='object')
);
alter table public.lesson_check_workspace_state enable row level security;
drop policy if exists "Workspace owners manage own state" on public.lesson_check_workspace_state;
create policy "Workspace owners manage own state" on public.lesson_check_workspace_state
  for all to authenticated using (user_id=auth.uid() and public.lesson_check_is_approved_user())
  with check (user_id=auth.uid() and public.lesson_check_is_approved_user());
grant select, insert, update, delete on public.lesson_check_workspace_state to authenticated;

create table if not exists public.lesson_check_activity_journal (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid references public.lesson_check_activities(id) on delete set null,
  activity_title text not null default '',
  class_name text not null default '',
  event_type text not null default 'opened' check(event_type in ('opened','completed')),
  duration_minutes smallint check(duration_minutes between 0 and 240),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists lesson_check_journal_teacher_idx on public.lesson_check_activity_journal(teacher_id,created_at desc);
alter table public.lesson_check_activity_journal enable row level security;
drop policy if exists "Journal owners and leaders can read" on public.lesson_check_activity_journal;
create policy "Journal owners and leaders can read" on public.lesson_check_activity_journal for select to authenticated
 using (teacher_id=auth.uid() or public.lesson_check_is_leader());
drop policy if exists "Journal owners can insert" on public.lesson_check_activity_journal;
create policy "Journal owners can insert" on public.lesson_check_activity_journal for insert to authenticated
 with check (teacher_id=auth.uid() and public.lesson_check_is_approved_user()
 and (activity_id is null or public.lesson_check_has_activity_access(activity_id)));
drop policy if exists "Journal owners can update" on public.lesson_check_activity_journal;
create policy "Journal owners can update" on public.lesson_check_activity_journal for update to authenticated
 using (teacher_id=auth.uid()) with check (teacher_id=auth.uid());
drop policy if exists "Journal owners can delete" on public.lesson_check_activity_journal;
create policy "Journal owners can delete" on public.lesson_check_activity_journal for delete to authenticated using (teacher_id=auth.uid());
grant select, insert, update, delete on public.lesson_check_activity_journal to authenticated;

create table if not exists public.lesson_check_interventions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_name text not null default '',
  student_ref text not null,
  student_name text not null,
  activity_id uuid references public.lesson_check_activities(id) on delete set null,
  focus_area text not null default '',
  baseline_grade numeric check (baseline_grade between 0 and 10),
  followup_grade numeric check (followup_grade between 0 and 10),
  action_plan text not null default '',
  due_on date,
  status text not null default 'planned' check(status in ('planned','in_progress','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lesson_check_interventions_teacher_idx on public.lesson_check_interventions(teacher_id,status,due_on);
alter table public.lesson_check_interventions enable row level security;
drop policy if exists "Interventions owner or leader read" on public.lesson_check_interventions;
create policy "Interventions owner or leader read" on public.lesson_check_interventions for select to authenticated
 using (teacher_id=auth.uid() or public.lesson_check_is_leader());
drop policy if exists "Interventions owner writes" on public.lesson_check_interventions;
create policy "Interventions owner writes" on public.lesson_check_interventions for all to authenticated
 using (teacher_id=auth.uid() and public.lesson_check_is_approved_user())
 with check (teacher_id=auth.uid() and public.lesson_check_is_approved_user());
grant select, insert, update, delete on public.lesson_check_interventions to authenticated;

-- Cross-activity permission operations are atomic and recorded for audit.
create table if not exists public.lesson_check_grant_audit (
 id bigint generated always as identity primary key,
 actor_id uuid references public.profiles(id) on delete set null,
 activity_id uuid references public.lesson_check_activities(id) on delete set null,
 teacher_id uuid references public.profiles(id) on delete set null,
 action text not null check(action in ('grant','revoke')),
 expires_at timestamptz,
 recorded_at timestamptz not null default now()
);
alter table public.lesson_check_grant_audit enable row level security;
drop policy if exists "Only leaders read grant audit" on public.lesson_check_grant_audit;
create policy "Only leaders read grant audit" on public.lesson_check_grant_audit for select to authenticated using (public.lesson_check_is_leader());
grant select on public.lesson_check_grant_audit to authenticated;

alter table public.lesson_check_activity_grants add column if not exists expires_at timestamptz;
create or replace function public.lesson_check_has_activity_access(target_activity uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.lesson_check_is_leader() or exists(
  select 1 from public.lesson_check_activity_grants g
  where g.activity_id=target_activity and g.user_id=auth.uid()
    and (g.expires_at is null or g.expires_at > now())
 );
$$;
-- Match the single-grant button semantics: a new manual grant never inherits an expired deadline.
create or replace function public.lesson_check_bulk_teacher_access(
 p_activities uuid[], p_teachers uuid[], p_allowed boolean, p_expires_at timestamptz default null
) returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if not public.lesson_check_is_leader() then raise exception 'Only leaders can modify permissions'; end if;
 if p_activities is null or p_teachers is null or array_length(p_activities,1) not between 1 and 50
   or array_length(p_teachers,1) not between 1 and 100 or p_allowed is null then
   raise exception 'Choose 1-50 activities and 1-100 teachers';
 end if;
 if p_expires_at is not null and (p_expires_at<=now() or not p_allowed) then raise exception 'Expiry must be a future grant date'; end if;
 if exists(select 1 from unnest(p_activities) a where a is null or not exists(select 1 from public.lesson_check_activities c where c.id=a)) then
  raise exception 'Invalid activity'; end if;
 if exists(select 1 from unnest(p_teachers) u where u is null or not exists(
  select 1 from public.profiles p where p.id=u and p.approved=true and
   lower(coalesce(p.role,'teacher')) not in ('admin','ttcm','to_truong','tổ trưởng','department_head','department-head','department head','department_leader','department leader','subject_leader','subject leader','leader')
 )) then raise exception 'Invalid teacher'; end if;
 if p_allowed then
  insert into public.lesson_check_activity_grants(activity_id,user_id,granted_by,created_at,expires_at)
  select distinct a,u,auth.uid(),now(),p_expires_at from unnest(p_activities) a cross join unnest(p_teachers) u
  on conflict(activity_id,user_id) do update set granted_by=excluded.granted_by,created_at=now(),expires_at=excluded.expires_at;
  update public.lesson_check_activity_requests r set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
   where r.activity_id=any(p_activities) and r.requester_id=any(p_teachers) and r.status='pending';
 else
  delete from public.lesson_check_activity_grants g where g.activity_id=any(p_activities) and g.user_id=any(p_teachers);
  update public.lesson_check_activity_requests r set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
   where r.activity_id=any(p_activities) and r.requester_id=any(p_teachers) and r.status='pending';
 end if;
 insert into public.lesson_check_grant_audit(actor_id,activity_id,teacher_id,action,expires_at)
 select auth.uid(),a,u,case when p_allowed then 'grant' else 'revoke' end,p_expires_at
 from (select distinct unnest(p_activities) as a) activities cross join (select distinct unnest(p_teachers) as u) teachers;
 select count(*)::integer into n from (select distinct unnest(p_activities) as a) x cross join (select distinct unnest(p_teachers) as u) y;
 return n;
end; $$;
revoke all on function public.lesson_check_bulk_teacher_access(uuid[],uuid[],boolean,timestamptz) from public;
grant execute on function public.lesson_check_bulk_teacher_access(uuid[],uuid[],boolean,timestamptz) to authenticated;
