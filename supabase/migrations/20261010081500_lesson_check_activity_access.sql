-- Lesson Check Studio: shared Global Success activity library + per-activity TTCM access.
-- Teachers can discover every published activity, but embedded source code is protected
-- until a TTCM/Admin grants access. Safe to run repeatedly.

create table if not exists public.lesson_check_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  book_key text not null default 'global-success',
  grade smallint,
  unit_no smallint,
  unit_title text,
  lesson_key text,
  lesson_title text,
  class_label text,
  activity_type text not null default 'quiz',
  notes text,
  source_host text,
  embed_kind text not null default 'url' check (embed_kind in ('url','html')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_check_activity_content (
  activity_id uuid primary key references public.lesson_check_activities(id) on delete cascade,
  embed_code text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_check_activity_grants (
  activity_id uuid not null references public.lesson_check_activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table if not exists public.lesson_check_activity_requests (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.lesson_check_activities(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lesson_check_pending_request_unique
  on public.lesson_check_activity_requests (activity_id, requester_id)
  where status = 'pending';

create index if not exists lesson_check_activities_grade_unit_idx
  on public.lesson_check_activities (grade, unit_no, updated_at desc);

create index if not exists lesson_check_requests_status_idx
  on public.lesson_check_activity_requests (status, created_at desc);

create index if not exists lesson_check_grants_user_idx
  on public.lesson_check_activity_grants (user_id, activity_id);

create or replace function public.lesson_check_is_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and lower(coalesce(p.role, '')) in (
        'admin','ttcm','to_truong','tổ trưởng',
        'department_head','department-head','department head',
        'department_leader','department leader',
        'subject_leader','subject leader','leader'
      )
  );
$$;

create or replace function public.lesson_check_is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true
  );
$$;

create or replace function public.lesson_check_has_activity_access(target_activity uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.lesson_check_is_leader()
    or exists (
      select 1
      from public.lesson_check_activity_grants g
      where g.activity_id = target_activity
        and g.user_id = auth.uid()
    );
$$;

alter table public.lesson_check_activities enable row level security;
alter table public.lesson_check_activity_content enable row level security;
alter table public.lesson_check_activity_grants enable row level security;
alter table public.lesson_check_activity_requests enable row level security;

drop policy if exists "Approved users can read lesson check activity metadata" on public.lesson_check_activities;
create policy "Approved users can read lesson check activity metadata"
  on public.lesson_check_activities for select to authenticated
  using (public.lesson_check_is_approved_user());

drop policy if exists "TTCM can create lesson check activities" on public.lesson_check_activities;
create policy "TTCM can create lesson check activities"
  on public.lesson_check_activities for insert to authenticated
  with check (public.lesson_check_is_leader());

drop policy if exists "TTCM can update lesson check activities" on public.lesson_check_activities;
create policy "TTCM can update lesson check activities"
  on public.lesson_check_activities for update to authenticated
  using (public.lesson_check_is_leader())
  with check (public.lesson_check_is_leader());

drop policy if exists "TTCM can delete lesson check activities" on public.lesson_check_activities;
create policy "TTCM can delete lesson check activities"
  on public.lesson_check_activities for delete to authenticated
  using (public.lesson_check_is_leader());

drop policy if exists "Granted users can read lesson check content" on public.lesson_check_activity_content;
create policy "Granted users can read lesson check content"
  on public.lesson_check_activity_content for select to authenticated
  using (public.lesson_check_has_activity_access(activity_id));

drop policy if exists "TTCM can manage lesson check content" on public.lesson_check_activity_content;
create policy "TTCM can manage lesson check content"
  on public.lesson_check_activity_content for all to authenticated
  using (public.lesson_check_is_leader())
  with check (public.lesson_check_is_leader());

drop policy if exists "Users can read own lesson check grants" on public.lesson_check_activity_grants;
create policy "Users can read own lesson check grants"
  on public.lesson_check_activity_grants for select to authenticated
  using (user_id = auth.uid() or public.lesson_check_is_leader());

drop policy if exists "TTCM can manage lesson check grants" on public.lesson_check_activity_grants;
create policy "TTCM can manage lesson check grants"
  on public.lesson_check_activity_grants for all to authenticated
  using (public.lesson_check_is_leader())
  with check (public.lesson_check_is_leader());

drop policy if exists "Users can read own lesson check requests" on public.lesson_check_activity_requests;
create policy "Users can read own lesson check requests"
  on public.lesson_check_activity_requests for select to authenticated
  using (requester_id = auth.uid() or public.lesson_check_is_leader());

drop policy if exists "Users can create own lesson check requests" on public.lesson_check_activity_requests;
create policy "Users can create own lesson check requests"
  on public.lesson_check_activity_requests for insert to authenticated
  with check (
    requester_id = auth.uid()
    and public.lesson_check_is_approved_user()
    and not public.lesson_check_has_activity_access(activity_id)
  );

drop policy if exists "TTCM can review lesson check requests" on public.lesson_check_activity_requests;
create policy "TTCM can review lesson check requests"
  on public.lesson_check_activity_requests for update to authenticated
  using (public.lesson_check_is_leader())
  with check (public.lesson_check_is_leader());

grant select, insert, update, delete on public.lesson_check_activities to authenticated;
grant select, insert, update, delete on public.lesson_check_activity_content to authenticated;
grant select, insert, update, delete on public.lesson_check_activity_grants to authenticated;
grant select, insert, update on public.lesson_check_activity_requests to authenticated;

create or replace function public.lesson_check_list_activities()
returns table (
  id uuid,
  title text,
  book_key text,
  grade smallint,
  unit_no smallint,
  unit_title text,
  lesson_key text,
  lesson_title text,
  class_label text,
  activity_type text,
  notes text,
  source_host text,
  embed_kind text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  has_access boolean,
  request_status text,
  grant_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id, a.title, a.book_key, a.grade, a.unit_no, a.unit_title,
    a.lesson_key, a.lesson_title, a.class_label, a.activity_type, a.notes,
    a.source_host, a.embed_kind, a.created_by, a.created_at, a.updated_at,
    public.lesson_check_has_activity_access(a.id) as has_access,
    (
      select r.status
      from public.lesson_check_activity_requests r
      where r.activity_id = a.id and r.requester_id = auth.uid()
      order by r.created_at desc
      limit 1
    ) as request_status,
    (select count(*) from public.lesson_check_activity_grants g where g.activity_id = a.id) as grant_count
  from public.lesson_check_activities a
  where public.lesson_check_is_approved_user()
  order by a.updated_at desc, a.created_at desc;
$$;

create or replace function public.lesson_check_get_activity_content(target_activity uuid)
returns table (activity_id uuid, embed_kind text, embed_code text)
language sql
stable
security definer
set search_path = public
as $$
  select c.activity_id, a.embed_kind, c.embed_code
  from public.lesson_check_activity_content c
  join public.lesson_check_activities a on a.id = c.activity_id
  where c.activity_id = target_activity
    and public.lesson_check_has_activity_access(c.activity_id);
$$;

create or replace function public.lesson_check_save_activity(
  target_activity uuid,
  p_title text,
  p_book_key text,
  p_grade smallint,
  p_unit_no smallint,
  p_unit_title text,
  p_lesson_key text,
  p_lesson_title text,
  p_class_label text,
  p_activity_type text,
  p_notes text,
  p_source_host text,
  p_embed_kind text,
  p_embed_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
begin
  if not public.lesson_check_is_leader() then
    raise exception 'Only TTCM/Admin can create or edit Lesson Check activities.';
  end if;
  if nullif(btrim(coalesce(p_title,'')), '') is null then raise exception 'Activity title is required.'; end if;
  if p_embed_kind not in ('url','html') then raise exception 'Invalid embed kind.'; end if;
  if nullif(btrim(coalesce(p_embed_code,'')), '') is null then raise exception 'Embed code is required.'; end if;

  if target_activity is null then
    insert into public.lesson_check_activities (
      title,book_key,grade,unit_no,unit_title,lesson_key,lesson_title,class_label,
      activity_type,notes,source_host,embed_kind,created_by,updated_at
    ) values (
      btrim(p_title),coalesce(nullif(btrim(p_book_key),''),'global-success'),p_grade,p_unit_no,
      nullif(btrim(coalesce(p_unit_title,'')),''),
      nullif(btrim(coalesce(p_lesson_key,'')),''),
      nullif(btrim(coalesce(p_lesson_title,'')),''),
      nullif(btrim(coalesce(p_class_label,'')),''),
      coalesce(nullif(btrim(p_activity_type),''),'quiz'),
      nullif(btrim(coalesce(p_notes,'')),''),
      nullif(btrim(coalesce(p_source_host,'')),''),
      p_embed_kind,auth.uid(),now()
    ) returning id into saved_id;
  else
    update public.lesson_check_activities
    set title=btrim(p_title),
        book_key=coalesce(nullif(btrim(p_book_key),''),'global-success'),
        grade=p_grade, unit_no=p_unit_no,
        unit_title=nullif(btrim(coalesce(p_unit_title,'')),''),
        lesson_key=nullif(btrim(coalesce(p_lesson_key,'')),''),
        lesson_title=nullif(btrim(coalesce(p_lesson_title,'')),''),
        class_label=nullif(btrim(coalesce(p_class_label,'')),''),
        activity_type=coalesce(nullif(btrim(p_activity_type),''),'quiz'),
        notes=nullif(btrim(coalesce(p_notes,'')),''),
        source_host=nullif(btrim(coalesce(p_source_host,'')),''),
        embed_kind=p_embed_kind,
        updated_at=now()
    where id=target_activity
    returning id into saved_id;
    if saved_id is null then raise exception 'Activity not found.'; end if;
  end if;

  insert into public.lesson_check_activity_content(activity_id,embed_code,updated_at)
  values(saved_id,p_embed_code,now())
  on conflict(activity_id) do update
  set embed_code=excluded.embed_code,updated_at=excluded.updated_at;

  return saved_id;
end;
$$;

create or replace function public.lesson_check_delete_activity(target_activity uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lesson_check_is_leader() then raise exception 'Only TTCM/Admin can delete activities.'; end if;
  delete from public.lesson_check_activities where id=target_activity;
  return found;
end;
$$;

create or replace function public.lesson_check_request_access(target_activity uuid, request_message text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
begin
  if not public.lesson_check_is_approved_user() then raise exception 'Approved account required.'; end if;
  if public.lesson_check_has_activity_access(target_activity) then raise exception 'You already have access.'; end if;
  if not exists(select 1 from public.lesson_check_activities where id=target_activity) then raise exception 'Activity not found.'; end if;

  select r.id into request_id
  from public.lesson_check_activity_requests r
  where r.activity_id=target_activity and r.requester_id=auth.uid() and r.status='pending'
  limit 1;

  if request_id is not null then return request_id; end if;

  insert into public.lesson_check_activity_requests(activity_id,requester_id,message,status,updated_at)
  values(target_activity,auth.uid(),nullif(btrim(coalesce(request_message,'')),''),'pending',now())
  returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.lesson_check_list_access_requests()
returns table (
  id uuid,
  activity_id uuid,
  activity_title text,
  requester_id uuid,
  requester_name text,
  requester_email text,
  message text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id,r.activity_id,a.title,r.requester_id,
    coalesce(nullif(p.full_name,''),p.email,'Teacher') as requester_name,
    p.email as requester_email,r.message,r.status,r.created_at,r.updated_at
  from public.lesson_check_activity_requests r
  join public.lesson_check_activities a on a.id=r.activity_id
  left join public.profiles p on p.id=r.requester_id
  where public.lesson_check_is_leader()
  order by case when r.status='pending' then 0 else 1 end,r.created_at desc;
$$;

create or replace function public.lesson_check_review_access_request(target_request uuid, decision text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.lesson_check_activity_requests%rowtype;
  normalized text;
begin
  if not public.lesson_check_is_leader() then raise exception 'Only TTCM/Admin can review requests.'; end if;
  normalized := lower(btrim(coalesce(decision,'')));
  if normalized not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.'; end if;

  select * into req from public.lesson_check_activity_requests where id=target_request for update;
  if req.id is null then raise exception 'Request not found.'; end if;

  if normalized='approved' then
    insert into public.lesson_check_activity_grants(activity_id,user_id,granted_by)
    values(req.activity_id,req.requester_id,auth.uid())
    on conflict(activity_id,user_id) do update
    set granted_by=excluded.granted_by,created_at=now();
  end if;

  update public.lesson_check_activity_requests
  set status=normalized,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=target_request;
  return true;
end;
$$;

create or replace function public.lesson_check_list_teacher_access(target_activity uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  approved boolean,
  has_access boolean,
  pending_request boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
    coalesce(nullif(p.full_name,''),p.email,'Teacher') as full_name,
    p.email,p.role,p.approved,
    exists(select 1 from public.lesson_check_activity_grants g where g.activity_id=target_activity and g.user_id=p.id) as has_access,
    exists(select 1 from public.lesson_check_activity_requests r where r.activity_id=target_activity and r.requester_id=p.id and r.status='pending') as pending_request
  from public.profiles p
  where public.lesson_check_is_leader()
    and p.approved=true
    and lower(coalesce(p.role,'teacher')) not in ('admin','ttcm','to_truong','tổ trưởng','department_head','department-head','department head','department_leader','department leader','subject_leader','subject leader','leader')
  order by lower(coalesce(p.full_name,p.email,''));
$$;

create or replace function public.lesson_check_set_teacher_access(target_activity uuid, target_user uuid, allowed boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lesson_check_is_leader() then raise exception 'Only TTCM/Admin can manage access.'; end if;
  if not exists(select 1 from public.lesson_check_activities where id=target_activity) then raise exception 'Activity not found.'; end if;
  if not exists(select 1 from public.profiles where id=target_user and approved=true) then raise exception 'Teacher not found.'; end if;

  if allowed then
    insert into public.lesson_check_activity_grants(activity_id,user_id,granted_by)
    values(target_activity,target_user,auth.uid())
    on conflict(activity_id,user_id) do update
    set granted_by=excluded.granted_by,created_at=now();

    update public.lesson_check_activity_requests
    set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
    where activity_id=target_activity and requester_id=target_user and status='pending';
  else
    delete from public.lesson_check_activity_grants
    where activity_id=target_activity and user_id=target_user;

    update public.lesson_check_activity_requests
    set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
    where activity_id=target_activity and requester_id=target_user and status='pending';
  end if;
  return true;
end;
$$;

revoke all on function public.lesson_check_is_leader() from public;
revoke all on function public.lesson_check_is_approved_user() from public;
revoke all on function public.lesson_check_has_activity_access(uuid) from public;
revoke all on function public.lesson_check_list_activities() from public;
revoke all on function public.lesson_check_get_activity_content(uuid) from public;
revoke all on function public.lesson_check_save_activity(uuid,text,text,smallint,smallint,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.lesson_check_delete_activity(uuid) from public;
revoke all on function public.lesson_check_request_access(uuid,text) from public;
revoke all on function public.lesson_check_list_access_requests() from public;
revoke all on function public.lesson_check_review_access_request(uuid,text) from public;
revoke all on function public.lesson_check_list_teacher_access(uuid) from public;
revoke all on function public.lesson_check_set_teacher_access(uuid,uuid,boolean) from public;

grant execute on function public.lesson_check_is_leader() to authenticated;
grant execute on function public.lesson_check_is_approved_user() to authenticated;
grant execute on function public.lesson_check_has_activity_access(uuid) to authenticated;
grant execute on function public.lesson_check_list_activities() to authenticated;
grant execute on function public.lesson_check_get_activity_content(uuid) to authenticated;
grant execute on function public.lesson_check_save_activity(uuid,text,text,smallint,smallint,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.lesson_check_delete_activity(uuid) to authenticated;
grant execute on function public.lesson_check_request_access(uuid,text) to authenticated;
grant execute on function public.lesson_check_list_access_requests() to authenticated;
grant execute on function public.lesson_check_review_access_request(uuid,text) to authenticated;
grant execute on function public.lesson_check_list_teacher_access(uuid) to authenticated;
grant execute on function public.lesson_check_set_teacher_access(uuid,uuid,boolean) to authenticated;

comment on table public.lesson_check_activities is 'Shared Lesson Check catalog metadata. All approved teachers may discover rows.';
comment on table public.lesson_check_activity_content is 'Protected iframe/HTML source. Only TTCM/Admin or explicitly granted teachers may read it.';
comment on table public.lesson_check_activity_grants is 'Per-activity access granted by TTCM/Admin.';
comment on table public.lesson_check_activity_requests is 'Teacher requests for per-activity access.';
