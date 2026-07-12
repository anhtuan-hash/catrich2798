-- Brian English Studio V10.89.0
-- Unified Work Hub: tasks, approvals, comments, activity and notifications
-- Safe to rerun. Existing work-hub rows are preserved.

begin;

create extension if not exists pgcrypto;

create or replace function public.work_hub_profile_uuid(profile_json jsonb)
returns uuid
language plpgsql
immutable
security invoker
set search_path = public, pg_temp
as $$
declare
  candidate text;
begin
  foreach candidate in array array[
    profile_json ->> 'id',
    profile_json ->> 'user_id',
    profile_json ->> 'profile_id'
  ]
  loop
    if candidate is not null
      and candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      return candidate::uuid;
    end if;
  end loop;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Role and account helpers compatible with different profile schemas.
-- ---------------------------------------------------------------------------

create or replace function public.work_hub_is_leader(target_user uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  jwt jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  jwt_role text := lower(coalesce(
    jwt -> 'app_metadata' ->> 'role',
    jwt -> 'user_metadata' ->> 'role',
    jwt ->> 'role',
    ''
  ));
  jwt_email text := lower(coalesce(jwt ->> 'email', ''));
  profile_match boolean := false;
begin
  if target_user is null then
    return false;
  end if;

  if target_user = auth.uid() and (
    jwt_role in ('admin', 'ttcm', 'leader', 'department_head', 'department-head', 'head')
    or jwt_email = 'anhtuan@pek.edu.vn'
  ) then
    return true;
  end if;

  if to_regclass('public.profiles') is null then
    return false;
  end if;

  select exists (
    select 1
    from public.profiles p
    cross join lateral (select to_jsonb(p) as j) x
    where public.work_hub_profile_uuid(x.j) = target_user
      and (
        lower(coalesce(x.j ->> 'role', '')) in (
          'admin', 'ttcm', 'leader', 'department_head', 'department-head', 'head'
        )
        or lower(coalesce(x.j ->> 'email', '')) = 'anhtuan@pek.edu.vn'
      )
  ) into profile_match;

  return coalesce(profile_match, false);
exception
  when others then
    return false;
end;
$$;

create or replace function public.work_hub_is_approved_user(target_user uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  profile_match boolean := false;
begin
  if target_user is null then
    return false;
  end if;

  if public.work_hub_is_leader(target_user) then
    return true;
  end if;

  if to_regclass('public.profiles') is null then
    return target_user = auth.uid();
  end if;

  select exists (
    select 1
    from public.profiles p
    cross join lateral (select to_jsonb(p) as j) x
    where public.work_hub_profile_uuid(x.j) = target_user
      and lower(coalesce(x.j ->> 'role', 'teacher')) not in ('blocked', 'disabled', 'rejected')
      and lower(coalesce(x.j ->> 'status', 'approved')) not in ('blocked', 'disabled', 'rejected')
      and lower(coalesce(x.j ->> 'approved', 'true')) not in ('false', '0', 'no')
  ) into profile_match;

  return coalesce(profile_match, false);
exception
  when others then
    return target_user = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Core tables.
-- ---------------------------------------------------------------------------

create table if not exists public.work_hub_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  item_type text not null default 'task',
  status text not null default 'draft',
  priority text not null default 'normal',
  created_by uuid not null default auth.uid(),
  owner_id uuid not null default auth.uid(),
  assignee_ids uuid[] not null default '{}',
  watcher_ids uuid[] not null default '{}',
  visibility text not null default 'restricted',
  start_at timestamptz,
  due_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  completed_at timestamptz,
  reviewed_by uuid,
  source_module text not null default '',
  source_id text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_hub_items_title_not_blank check (length(btrim(title)) > 0),
  constraint work_hub_items_type_check check (
    item_type in ('task', 'approval', 'meeting', 'document', 'reminder', 'announcement')
  ),
  constraint work_hub_items_status_check check (
    status in (
      'draft', 'assigned', 'accepted', 'in_progress', 'submitted',
      'changes_requested', 'approved', 'completed', 'archived', 'cancelled'
    )
  ),
  constraint work_hub_items_priority_check check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  constraint work_hub_items_visibility_check check (
    visibility in ('private', 'restricted', 'department')
  ),
  constraint work_hub_items_attachments_array check (jsonb_typeof(attachments) = 'array'),
  constraint work_hub_items_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.work_hub_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.work_hub_items(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  body text not null,
  comment_type text not null default 'comment',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_hub_comments_body_not_blank check (length(btrim(body)) > 0),
  constraint work_hub_comments_type_check check (
    comment_type in ('comment', 'review', 'system')
  ),
  constraint work_hub_comments_attachments_array check (jsonb_typeof(attachments) = 'array')
);

create table if not exists public.work_hub_activity (
  id bigint generated by default as identity primary key,
  item_id uuid not null references public.work_hub_items(id) on delete cascade,
  actor_id uuid,
  event_type text not null,
  from_status text,
  to_status text,
  message text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint work_hub_activity_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.work_hub_notifications (
  id bigint generated by default as identity primary key,
  user_id uuid not null,
  item_id uuid references public.work_hub_items(id) on delete cascade,
  notification_type text not null default 'work_item',
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists work_hub_items_status_idx
  on public.work_hub_items(status, updated_at desc);
create index if not exists work_hub_items_due_idx
  on public.work_hub_items(due_at) where due_at is not null;
create index if not exists work_hub_items_created_by_idx
  on public.work_hub_items(created_by, updated_at desc);
create index if not exists work_hub_items_owner_idx
  on public.work_hub_items(owner_id, updated_at desc);
create index if not exists work_hub_items_assignees_gin
  on public.work_hub_items using gin(assignee_ids);
create index if not exists work_hub_items_watchers_gin
  on public.work_hub_items using gin(watcher_ids);
create index if not exists work_hub_comments_item_idx
  on public.work_hub_comments(item_id, created_at);
create index if not exists work_hub_activity_item_idx
  on public.work_hub_activity(item_id, created_at desc);
create index if not exists work_hub_notifications_user_idx
  on public.work_hub_notifications(user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Shared permission helpers.
-- ---------------------------------------------------------------------------

create or replace function public.work_hub_can_view_item(item public.work_hub_items, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    target_user is not null
    and (
      public.work_hub_is_leader(target_user)
      or item.created_by = target_user
      or item.owner_id = target_user
      or target_user = any(item.assignee_ids)
      or target_user = any(item.watcher_ids)
      or (
        item.visibility = 'department'
        and public.work_hub_is_approved_user(target_user)
      )
    );
$$;

create or replace function public.work_hub_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.work_hub_guard_item_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  old_core jsonb;
  new_core jsonb;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  new.title := btrim(new.title);
  new.status := lower(btrim(new.status));
  new.priority := lower(btrim(new.priority));
  new.item_type := lower(btrim(new.item_type));
  new.visibility := lower(btrim(new.visibility));
  new.updated_at := now();

  if public.work_hub_is_leader(uid) then
    return new;
  end if;

  if (old.created_by = uid or old.owner_id = uid) then
    if new.visibility = 'department' and old.visibility is distinct from 'department' then
      raise exception 'Only Admin/TTCM can publish department-wide work items';
    end if;
    if new.owner_id is distinct from uid
      or not (new.assignee_ids <@ array[uid]::uuid[])
      or not (new.watcher_ids <@ array[uid]::uuid[])
    then
      raise exception 'Teachers can only manage personal work items';
    end if;
    return new;
  end if;

  if uid = any(old.assignee_ids) then
    old_core := to_jsonb(old) - array[
      'status', 'submitted_at', 'completed_at', 'updated_at'
    ];
    new_core := to_jsonb(new) - array[
      'status', 'submitted_at', 'completed_at', 'updated_at'
    ];

    if old_core <> new_core then
      raise exception 'Assignees can only update workflow status';
    end if;

    if new.status = old.status then
      return new;
    end if;

    if not (
      (old.status = 'assigned' and new.status in ('accepted', 'in_progress', 'submitted'))
      or (old.status = 'accepted' and new.status in ('in_progress', 'submitted'))
      or (old.status = 'in_progress' and new.status = 'submitted')
      or (old.status = 'changes_requested' and new.status in ('in_progress', 'submitted'))
    ) then
      raise exception 'Invalid assignee workflow transition: % -> %', old.status, new.status;
    end if;

    if new.status = 'submitted' then
      new.submitted_at := coalesce(new.submitted_at, now());
    end if;
    return new;
  end if;

  raise exception 'You cannot update this work item';
end;
$$;

drop trigger if exists work_hub_items_updated_at on public.work_hub_items;
create trigger work_hub_items_updated_at
before update on public.work_hub_items
for each row execute function public.work_hub_set_updated_at();

drop trigger if exists work_hub_items_guard_update on public.work_hub_items;
create trigger work_hub_items_guard_update
before update on public.work_hub_items
for each row execute function public.work_hub_guard_item_update();

drop trigger if exists work_hub_comments_updated_at on public.work_hub_comments;
create trigger work_hub_comments_updated_at
before update on public.work_hub_comments
for each row execute function public.work_hub_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Activity and notification automation.
-- ---------------------------------------------------------------------------

create or replace function public.work_hub_notify_users(
  target_item uuid,
  target_users uuid[],
  target_type text,
  target_title text,
  target_body text,
  actor uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  recipient uuid;
begin
  foreach recipient in array coalesce(target_users, '{}'::uuid[])
  loop
    if recipient is not null and recipient is distinct from actor then
      insert into public.work_hub_notifications(
        user_id, item_id, notification_type, title, body
      ) values (
        recipient, target_item, target_type, left(target_title, 240), left(coalesce(target_body, ''), 1000)
      );
    end if;
  end loop;
end;
$$;

create or replace function public.work_hub_after_item_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  recipients uuid[];
begin
  insert into public.work_hub_activity(
    item_id, actor_id, event_type, to_status, message, payload
  ) values (
    new.id, new.created_by, 'created', new.status,
    'Đã tạo công việc', jsonb_build_object('title', new.title, 'type', new.item_type)
  );

  select array_agg(distinct uid)
  into recipients
  from unnest(
    array_append(array_append(new.assignee_ids, new.owner_id), new.created_by)
    || new.watcher_ids
  ) as uid
  where uid is not null;

  perform public.work_hub_notify_users(
    new.id,
    recipients,
    'work_item_assigned',
    'Công việc mới: ' || new.title,
    case when new.due_at is null then 'Một công việc mới đã được giao.'
         else 'Hạn hoàn thành: ' || to_char(new.due_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
    end,
    new.created_by
  );

  return new;
end;
$$;

create or replace function public.work_hub_after_item_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := auth.uid();
  recipients uuid[];
begin
  if new.status is distinct from old.status then
    insert into public.work_hub_activity(
      item_id, actor_id, event_type, from_status, to_status, message, payload
    ) values (
      new.id, actor, 'status_changed', old.status, new.status,
      'Trạng thái chuyển từ ' || old.status || ' sang ' || new.status,
      jsonb_build_object('title', new.title)
    );

    select array_agg(distinct uid)
    into recipients
    from unnest(
      array_append(array_append(new.assignee_ids, new.owner_id), new.created_by)
      || new.watcher_ids
    ) as uid
    where uid is not null;

    perform public.work_hub_notify_users(
      new.id,
      recipients,
      'work_item_status',
      'Cập nhật: ' || new.title,
      'Trạng thái mới: ' || new.status,
      actor
    );
  elsif new.due_at is distinct from old.due_at or new.assignee_ids is distinct from old.assignee_ids then
    insert into public.work_hub_activity(
      item_id, actor_id, event_type, message, payload
    ) values (
      new.id, actor, 'updated', 'Đã cập nhật công việc',
      jsonb_build_object('due_at', new.due_at, 'assignee_ids', new.assignee_ids)
    );
  end if;

  return new;
end;
$$;

create or replace function public.work_hub_after_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  item public.work_hub_items%rowtype;
  recipients uuid[];
begin
  select * into item from public.work_hub_items where id = new.item_id;

  insert into public.work_hub_activity(
    item_id, actor_id, event_type, message, payload
  ) values (
    new.item_id, new.author_id, 'comment_added', 'Đã thêm phản hồi',
    jsonb_build_object('comment_id', new.id, 'comment_type', new.comment_type)
  );

  select array_agg(distinct uid)
  into recipients
  from unnest(
    array_append(array_append(item.assignee_ids, item.owner_id), item.created_by)
    || item.watcher_ids
  ) as uid
  where uid is not null;

  perform public.work_hub_notify_users(
    item.id,
    recipients,
    'work_item_comment',
    'Phản hồi mới: ' || item.title,
    left(new.body, 300),
    new.author_id
  );

  return new;
end;
$$;

drop trigger if exists work_hub_item_insert_activity on public.work_hub_items;
create trigger work_hub_item_insert_activity
after insert on public.work_hub_items
for each row execute function public.work_hub_after_item_insert();

drop trigger if exists work_hub_item_update_activity on public.work_hub_items;
create trigger work_hub_item_update_activity
after update on public.work_hub_items
for each row execute function public.work_hub_after_item_update();

drop trigger if exists work_hub_comment_insert_activity on public.work_hub_comments;
create trigger work_hub_comment_insert_activity
after insert on public.work_hub_comments
for each row execute function public.work_hub_after_comment_insert();

-- ---------------------------------------------------------------------------
-- 5. RLS policies.
-- ---------------------------------------------------------------------------

alter table public.work_hub_items enable row level security;
alter table public.work_hub_comments enable row level security;
alter table public.work_hub_activity enable row level security;
alter table public.work_hub_notifications enable row level security;

-- Remove only Work Hub policies so the migration remains idempotent.
do $do$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'work_hub_items', 'work_hub_comments', 'work_hub_activity', 'work_hub_notifications'
      )
      and policyname like 'work_hub_%'
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$do$;

create policy work_hub_items_select_v10890
on public.work_hub_items
for select
to authenticated
using (public.work_hub_can_view_item(work_hub_items, auth.uid()));

create policy work_hub_items_insert_v10890
on public.work_hub_items
for insert
to authenticated
with check (
  public.work_hub_is_approved_user(auth.uid())
  and (
    public.work_hub_is_leader(auth.uid())
    or (
      created_by = auth.uid()
      and owner_id = auth.uid()
      and visibility in ('private', 'restricted')
      and assignee_ids <@ array[auth.uid()]::uuid[]
      and watcher_ids <@ array[auth.uid()]::uuid[]
    )
  )
);

create policy work_hub_items_update_v10890
on public.work_hub_items
for update
to authenticated
using (
  public.work_hub_is_leader(auth.uid())
  or created_by = auth.uid()
  or owner_id = auth.uid()
  or auth.uid() = any(assignee_ids)
)
with check (
  public.work_hub_is_leader(auth.uid())
  or created_by = auth.uid()
  or owner_id = auth.uid()
  or auth.uid() = any(assignee_ids)
);

create policy work_hub_items_delete_v10890
on public.work_hub_items
for delete
to authenticated
using (
  public.work_hub_is_leader(auth.uid())
  or (created_by = auth.uid() and status = 'draft')
);

create policy work_hub_comments_select_v10890
on public.work_hub_comments
for select
to authenticated
using (
  exists (
    select 1 from public.work_hub_items i
    where i.id = item_id
      and public.work_hub_can_view_item(i, auth.uid())
  )
);

create policy work_hub_comments_insert_v10890
on public.work_hub_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.work_hub_items i
    where i.id = item_id
      and public.work_hub_can_view_item(i, auth.uid())
  )
);

create policy work_hub_comments_update_v10890
on public.work_hub_comments
for update
to authenticated
using (author_id = auth.uid() or public.work_hub_is_leader(auth.uid()))
with check (author_id = auth.uid() or public.work_hub_is_leader(auth.uid()));

create policy work_hub_comments_delete_v10890
on public.work_hub_comments
for delete
to authenticated
using (author_id = auth.uid() or public.work_hub_is_leader(auth.uid()));

create policy work_hub_activity_select_v10890
on public.work_hub_activity
for select
to authenticated
using (
  exists (
    select 1 from public.work_hub_items i
    where i.id = item_id
      and public.work_hub_can_view_item(i, auth.uid())
  )
);

create policy work_hub_notifications_select_v10890
on public.work_hub_notifications
for select
to authenticated
using (user_id = auth.uid() or public.work_hub_is_leader(auth.uid()));

create policy work_hub_notifications_update_v10890
on public.work_hub_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy work_hub_notifications_delete_v10890
on public.work_hub_notifications
for delete
to authenticated
using (user_id = auth.uid() or public.work_hub_is_leader(auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. RPC endpoints used by the update-only frontend.
-- ---------------------------------------------------------------------------

create or replace function public.work_hub_my_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  jwt jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  profile_data jsonb := '{}'::jsonb;
  display_name text := '';
  email_value text := lower(coalesce(jwt ->> 'email', ''));
  role_value text := lower(coalesce(
    jwt -> 'app_metadata' ->> 'role',
    jwt -> 'user_metadata' ->> 'role',
    jwt ->> 'role',
    'teacher'
  ));
begin
  if uid is null then
    return jsonb_build_object('authenticated', false);
  end if;

  if to_regclass('public.profiles') is not null then
    select to_jsonb(p)
    into profile_data
    from public.profiles p
    cross join lateral (select to_jsonb(p) as j) x
    where public.work_hub_profile_uuid(x.j) = uid
    limit 1;
  end if;

  profile_data := coalesce(profile_data, '{}'::jsonb);
  display_name := coalesce(
    nullif(profile_data ->> 'full_name', ''),
    nullif(profile_data ->> 'name', ''),
    nullif(profile_data ->> 'display_name', ''),
    nullif(jwt -> 'user_metadata' ->> 'full_name', ''),
    nullif(jwt -> 'user_metadata' ->> 'name', ''),
    split_part(email_value, '@', 1)
  );
  email_value := lower(coalesce(nullif(profile_data ->> 'email', ''), email_value));
  role_value := lower(coalesce(nullif(profile_data ->> 'role', ''), role_value, 'teacher'));

  if public.work_hub_is_leader(uid) then
    role_value := case when role_value = 'ttcm' then 'ttcm' else 'admin' end;
  end if;

  return jsonb_build_object(
    'authenticated', true,
    'user_id', uid,
    'email', email_value,
    'display_name', display_name,
    'role', role_value,
    'is_leader', public.work_hub_is_leader(uid),
    'is_approved', public.work_hub_is_approved_user(uid)
  );
end;
$$;

create or replace function public.work_hub_people()
returns table (
  user_id uuid,
  display_name text,
  email text,
  role text
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if to_regclass('public.profiles') is null then
    return query
    select
      auth.uid(),
      coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1)),
      lower(coalesce(auth.jwt() ->> 'email', '')),
      lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'teacher'));
    return;
  end if;

  return query
  select
    public.work_hub_profile_uuid(x.j) as user_id,
    coalesce(
      nullif(x.j ->> 'full_name', ''),
      nullif(x.j ->> 'name', ''),
      nullif(x.j ->> 'display_name', ''),
      split_part(coalesce(x.j ->> 'email', ''), '@', 1),
      'Giáo viên'
    ) as display_name,
    lower(coalesce(x.j ->> 'email', '')) as email,
    lower(coalesce(x.j ->> 'role', 'teacher')) as role
  from public.profiles p
  cross join lateral (select to_jsonb(p) as j) x
  where public.work_hub_profile_uuid(x.j) is not null
    and lower(coalesce(x.j ->> 'role', 'teacher')) not in ('blocked', 'disabled', 'rejected')
    and lower(coalesce(x.j ->> 'status', 'approved')) not in ('blocked', 'disabled', 'rejected')
    and lower(coalesce(x.j ->> 'approved', 'true')) not in ('false', '0', 'no')
  order by 2, 3;
end;
$$;

create or replace function public.work_hub_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select jsonb_build_object(
    'total', count(*),
    'active', count(*) filter (where status in ('assigned', 'accepted', 'in_progress', 'changes_requested')),
    'submitted', count(*) filter (where status = 'submitted'),
    'overdue', count(*) filter (
      where due_at < now()
        and status not in ('approved', 'completed', 'archived', 'cancelled')
    ),
    'due_soon', count(*) filter (
      where due_at >= now()
        and due_at < now() + interval '3 days'
        and status not in ('approved', 'completed', 'archived', 'cancelled')
    ),
    'completed', count(*) filter (where status in ('approved', 'completed'))
  )
  from public.work_hub_items;
$$;

create or replace function public.work_hub_transition_item(
  target_item uuid,
  next_status text,
  transition_note text default ''
)
returns public.work_hub_items
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  item public.work_hub_items%rowtype;
  normalized text := lower(btrim(next_status));
  is_leader boolean;
  is_owner boolean;
  is_assignee boolean;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select * into item
  from public.work_hub_items
  where id = target_item
  for update;

  if not found or not public.work_hub_can_view_item(item, uid) then
    raise exception 'Work item not found or not accessible';
  end if;

  is_leader := public.work_hub_is_leader(uid);
  is_owner := item.created_by = uid or item.owner_id = uid;
  is_assignee := uid = any(item.assignee_ids);

  if normalized not in (
    'draft', 'assigned', 'accepted', 'in_progress', 'submitted',
    'changes_requested', 'approved', 'completed', 'archived', 'cancelled'
  ) then
    raise exception 'Unsupported status: %', normalized;
  end if;

  if not is_leader and not is_owner then
    if not is_assignee then
      raise exception 'You cannot transition this work item';
    end if;
    if not (
      (item.status = 'assigned' and normalized in ('accepted', 'in_progress', 'submitted'))
      or (item.status = 'accepted' and normalized in ('in_progress', 'submitted'))
      or (item.status = 'in_progress' and normalized = 'submitted')
      or (item.status = 'changes_requested' and normalized in ('in_progress', 'submitted'))
    ) then
      raise exception 'Invalid transition for assignee: % -> %', item.status, normalized;
    end if;
  end if;

  update public.work_hub_items
  set
    status = normalized,
    submitted_at = case when normalized = 'submitted' then coalesce(submitted_at, now()) else submitted_at end,
    reviewed_at = case when normalized in ('approved', 'changes_requested') then now() else reviewed_at end,
    reviewed_by = case when normalized in ('approved', 'changes_requested') then uid else reviewed_by end,
    completed_at = case when normalized in ('approved', 'completed') then now() else completed_at end,
    updated_at = now()
  where id = target_item
  returning * into item;

  if length(btrim(coalesce(transition_note, ''))) > 0 then
    insert into public.work_hub_comments(item_id, author_id, body, comment_type)
    values (
      target_item,
      uid,
      left(btrim(transition_note), 4000),
      case when normalized in ('approved', 'changes_requested') then 'review' else 'comment' end
    );
  end if;

  return item;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants and Realtime.
-- ---------------------------------------------------------------------------

revoke all on public.work_hub_activity from anon, authenticated;
revoke all on public.work_hub_notifications from anon, authenticated;

grant select, insert, update, delete on public.work_hub_items to authenticated;
grant select, insert, update, delete on public.work_hub_comments to authenticated;
grant select on public.work_hub_activity to authenticated;
grant select, update, delete on public.work_hub_notifications to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.work_hub_profile_uuid(jsonb) to authenticated;
grant execute on function public.work_hub_is_leader(uuid) to authenticated;
grant execute on function public.work_hub_is_approved_user(uuid) to authenticated;
grant execute on function public.work_hub_my_context() to authenticated;
grant execute on function public.work_hub_people() to authenticated;
grant execute on function public.work_hub_dashboard() to authenticated;
grant execute on function public.work_hub_transition_item(uuid, text, text) to authenticated;

alter table public.work_hub_items replica identity full;
alter table public.work_hub_comments replica identity full;
alter table public.work_hub_notifications replica identity full;

do $do$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'work_hub_items'
    ) then
      alter publication supabase_realtime add table public.work_hub_items;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'work_hub_comments'
    ) then
      alter publication supabase_realtime add table public.work_hub_comments;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'work_hub_notifications'
    ) then
      alter publication supabase_realtime add table public.work_hub_notifications;
    end if;
  end if;
end
$do$;

commit;

-- ---------------------------------------------------------------------------
-- Verification output.
-- ---------------------------------------------------------------------------

select
  to_regclass('public.work_hub_items') as items_table,
  to_regclass('public.work_hub_comments') as comments_table,
  to_regclass('public.work_hub_activity') as activity_table,
  to_regclass('public.work_hub_notifications') as notifications_table;

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename like 'work_hub_%'
order by tablename;

select
  proname
from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where pg_namespace.nspname = 'public'
  and proname like 'work_hub_%'
order by proname;
