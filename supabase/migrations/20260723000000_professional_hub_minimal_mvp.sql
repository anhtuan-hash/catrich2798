-- Brian English · Hub Chuyên môn tối giản
-- Phạm vi duy nhất:
-- 1) TTCM gửi thông báo/lịch/yêu cầu nộp tài liệu.
-- 2) Giáo viên nhận, đánh dấu đã đọc và nộp tài liệu cho TTCM.

create extension if not exists pgcrypto;

create table if not exists public.professional_hub_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null check (role in ('leader', 'teacher')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_hub_announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'notice' check (kind in ('notice', 'meeting', 'work', 'submission_request')),
  title text not null check (char_length(title) between 1 and 180),
  content text not null check (char_length(content) between 1 and 3000),
  starts_at timestamptz,
  due_at timestamptz,
  requires_submission boolean not null default false,
  allow_resubmit boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_hub_submission_kind_check check (
    requires_submission = false or kind = 'submission_request'
  )
);

create table if not exists public.professional_hub_recipients (
  announcement_id uuid not null references public.professional_hub_announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create table if not exists public.professional_hub_submissions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.professional_hub_announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null default 0 check (file_size >= 0 and file_size <= 26214400),
  note text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'needs_revision', 'approved')),
  feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

create index if not exists professional_hub_announcements_created_at_idx
  on public.professional_hub_announcements (created_at desc);
create index if not exists professional_hub_announcements_starts_at_idx
  on public.professional_hub_announcements (starts_at);
create index if not exists professional_hub_announcements_due_at_idx
  on public.professional_hub_announcements (due_at);
create index if not exists professional_hub_recipients_user_idx
  on public.professional_hub_recipients (user_id, read_at, created_at desc);
create index if not exists professional_hub_submissions_request_idx
  on public.professional_hub_submissions (announcement_id, status, submitted_at desc);
create index if not exists professional_hub_submissions_user_idx
  on public.professional_hub_submissions (user_id, submitted_at desc);

create or replace function public.professional_hub_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.professional_hub_current_brian_role()
returns text
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  resolved_role text := '';
begin
  resolved_role := lower(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ));

  if resolved_role <> '' then
    return resolved_role;
  end if;

  if to_regclass('public.profiles') is not null and auth.uid() is not null then
    execute $query$
      select lower(coalesce(
        to_jsonb(profile_row) ->> 'role',
        to_jsonb(profile_row) ->> 'user_role',
        ''
      ))
      from public.profiles profile_row
      where coalesce(
        to_jsonb(profile_row) ->> 'id',
        to_jsonb(profile_row) ->> 'user_id',
        to_jsonb(profile_row) ->> 'auth_id',
        to_jsonb(profile_row) ->> 'profile_id'
      ) = $1
      limit 1
    $query$
    into resolved_role
    using auth.uid()::text;
  end if;

  return coalesce(resolved_role, '');
end;
$$;

create or replace function public.professional_hub_is_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.professional_hub_members member_row
    where member_row.user_id = auth.uid()
      and member_row.active = true
  );
$$;

create or replace function public.professional_hub_is_leader()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1
      from public.professional_hub_members member_row
      where member_row.user_id = auth.uid()
        and member_row.role = 'leader'
        and member_row.active = true
    )
    or public.professional_hub_current_brian_role() in (
      'admin', 'ttcm', 'department_leader', 'head', 'leader'
    );
$$;

create or replace function public.professional_hub_bootstrap_leader(
  requested_display_name text default null
)
returns public.professional_hub_members
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  result_row public.professional_hub_members;
  account_email text;
  account_name text;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập Brian.';
  end if;

  if public.professional_hub_current_brian_role() not in (
    'admin', 'ttcm', 'department_leader', 'head', 'leader'
  ) then
    raise exception 'Chỉ tài khoản Admin/TTCM mới được khởi tạo Hub.';
  end if;

  if exists (
    select 1 from public.professional_hub_members
    where role = 'leader' and active = true
  ) then
    raise exception 'Hub đã có TTCM. Hãy nhờ TTCM hiện tại thêm thành viên.';
  end if;

  select
    auth_user.email,
    coalesce(
      nullif(trim(requested_display_name), ''),
      nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth_user.raw_user_meta_data ->> 'name', ''),
      auth_user.email
    )
  into account_email, account_name
  from auth.users auth_user
  where auth_user.id = auth.uid();

  insert into public.professional_hub_members (
    user_id, email, display_name, role, active
  ) values (
    auth.uid(), account_email, account_name, 'leader', true
  )
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = 'leader',
    active = true,
    updated_at = now()
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.professional_hub_add_member_by_email(
  target_email text,
  target_role text default 'teacher'
)
returns public.professional_hub_members
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_account auth.users%rowtype;
  result_row public.professional_hub_members;
begin
  if not public.professional_hub_is_leader() then
    raise exception 'Chỉ TTCM mới được thêm thành viên.';
  end if;

  if lower(coalesce(target_role, 'teacher')) not in ('leader', 'teacher') then
    raise exception 'Vai trò không hợp lệ.';
  end if;

  select * into target_account
  from auth.users auth_user
  where lower(auth_user.email) = lower(trim(target_email))
  limit 1;

  if target_account.id is null then
    raise exception 'Không tìm thấy tài khoản Brian với email này.';
  end if;

  insert into public.professional_hub_members (
    user_id, email, display_name, role, active
  ) values (
    target_account.id,
    target_account.email,
    coalesce(
      nullif(target_account.raw_user_meta_data ->> 'full_name', ''),
      nullif(target_account.raw_user_meta_data ->> 'name', ''),
      target_account.email
    ),
    lower(coalesce(target_role, 'teacher')),
    true
  )
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role,
    active = true,
    updated_at = now()
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.professional_hub_deactivate_member(
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.professional_hub_is_leader() then
    raise exception 'Chỉ TTCM mới được gỡ thành viên.';
  end if;

  if exists (
    select 1 from public.professional_hub_members
    where user_id = target_user_id and role = 'leader'
  ) then
    raise exception 'Không thể gỡ tài khoản TTCM bằng thao tác này.';
  end if;

  update public.professional_hub_members
  set active = false, updated_at = now()
  where user_id = target_user_id and role = 'teacher';

  return found;
end;
$$;

create or replace function public.professional_hub_mark_read(
  target_announcement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.professional_hub_recipients
  set read_at = coalesce(read_at, now())
  where announcement_id = target_announcement_id
    and user_id = auth.uid();

  return found;
end;
$$;

revoke all on function public.professional_hub_touch_updated_at() from public, anon;
revoke all on function public.professional_hub_current_brian_role() from public, anon;
revoke all on function public.professional_hub_is_member() from public, anon;
revoke all on function public.professional_hub_is_leader() from public, anon;
revoke all on function public.professional_hub_bootstrap_leader(text) from public, anon;
revoke all on function public.professional_hub_add_member_by_email(text, text) from public, anon;
revoke all on function public.professional_hub_deactivate_member(uuid) from public, anon;
revoke all on function public.professional_hub_mark_read(uuid) from public, anon;

grant execute on function public.professional_hub_current_brian_role() to authenticated;
grant execute on function public.professional_hub_is_member() to authenticated;
grant execute on function public.professional_hub_is_leader() to authenticated;
grant execute on function public.professional_hub_bootstrap_leader(text) to authenticated;
grant execute on function public.professional_hub_add_member_by_email(text, text) to authenticated;
grant execute on function public.professional_hub_deactivate_member(uuid) to authenticated;
grant execute on function public.professional_hub_mark_read(uuid) to authenticated;

grant select, insert, update, delete on public.professional_hub_members to authenticated;
grant select, insert, update, delete on public.professional_hub_announcements to authenticated;
grant select, insert, update, delete on public.professional_hub_recipients to authenticated;
grant select, insert, update, delete on public.professional_hub_submissions to authenticated;

alter table public.professional_hub_members enable row level security;
alter table public.professional_hub_announcements enable row level security;
alter table public.professional_hub_recipients enable row level security;
alter table public.professional_hub_submissions enable row level security;

drop policy if exists professional_hub_members_select on public.professional_hub_members;
create policy professional_hub_members_select
on public.professional_hub_members
for select
to authenticated
using (public.professional_hub_is_member() and active = true);

drop policy if exists professional_hub_members_manage on public.professional_hub_members;
create policy professional_hub_members_manage
on public.professional_hub_members
for all
to authenticated
using (public.professional_hub_is_leader())
with check (public.professional_hub_is_leader());

drop policy if exists professional_hub_announcements_select on public.professional_hub_announcements;
create policy professional_hub_announcements_select
on public.professional_hub_announcements
for select
to authenticated
using (
  public.professional_hub_is_leader()
  or exists (
    select 1
    from public.professional_hub_recipients recipient_row
    where recipient_row.announcement_id = professional_hub_announcements.id
      and recipient_row.user_id = auth.uid()
  )
);

drop policy if exists professional_hub_announcements_insert on public.professional_hub_announcements;
create policy professional_hub_announcements_insert
on public.professional_hub_announcements
for insert
to authenticated
with check (
  public.professional_hub_is_leader()
  and created_by = auth.uid()
);

drop policy if exists professional_hub_announcements_update on public.professional_hub_announcements;
create policy professional_hub_announcements_update
on public.professional_hub_announcements
for update
to authenticated
using (public.professional_hub_is_leader())
with check (public.professional_hub_is_leader());

drop policy if exists professional_hub_announcements_delete on public.professional_hub_announcements;
create policy professional_hub_announcements_delete
on public.professional_hub_announcements
for delete
to authenticated
using (public.professional_hub_is_leader());

drop policy if exists professional_hub_recipients_select on public.professional_hub_recipients;
create policy professional_hub_recipients_select
on public.professional_hub_recipients
for select
to authenticated
using (
  user_id = auth.uid()
  or public.professional_hub_is_leader()
);

drop policy if exists professional_hub_recipients_insert on public.professional_hub_recipients;
create policy professional_hub_recipients_insert
on public.professional_hub_recipients
for insert
to authenticated
with check (
  public.professional_hub_is_leader()
  and exists (
    select 1 from public.professional_hub_members member_row
    where member_row.user_id = professional_hub_recipients.user_id
      and member_row.role = 'teacher'
      and member_row.active = true
  )
);

drop policy if exists professional_hub_recipients_delete on public.professional_hub_recipients;
create policy professional_hub_recipients_delete
on public.professional_hub_recipients
for delete
to authenticated
using (public.professional_hub_is_leader());

drop policy if exists professional_hub_submissions_select on public.professional_hub_submissions;
create policy professional_hub_submissions_select
on public.professional_hub_submissions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.professional_hub_is_leader()
);

drop policy if exists professional_hub_submissions_insert on public.professional_hub_submissions;
create policy professional_hub_submissions_insert
on public.professional_hub_submissions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.professional_hub_is_member()
  and exists (
    select 1
    from public.professional_hub_announcements announcement_row
    join public.professional_hub_recipients recipient_row
      on recipient_row.announcement_id = announcement_row.id
    where announcement_row.id = professional_hub_submissions.announcement_id
      and announcement_row.requires_submission = true
      and recipient_row.user_id = auth.uid()
  )
);

drop policy if exists professional_hub_submissions_teacher_update on public.professional_hub_submissions;
create policy professional_hub_submissions_teacher_update
on public.professional_hub_submissions
for update
to authenticated
using (
  user_id = auth.uid()
  and status <> 'approved'
  and exists (
    select 1
    from public.professional_hub_announcements announcement_row
    where announcement_row.id = professional_hub_submissions.announcement_id
      and announcement_row.allow_resubmit = true
  )
)
with check (
  user_id = auth.uid()
  and status = 'submitted'
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists professional_hub_submissions_leader_update on public.professional_hub_submissions;
create policy professional_hub_submissions_leader_update
on public.professional_hub_submissions
for update
to authenticated
using (public.professional_hub_is_leader())
with check (public.professional_hub_is_leader());

drop trigger if exists professional_hub_members_touch on public.professional_hub_members;
create trigger professional_hub_members_touch
before update on public.professional_hub_members
for each row execute function public.professional_hub_touch_updated_at();

drop trigger if exists professional_hub_announcements_touch on public.professional_hub_announcements;
create trigger professional_hub_announcements_touch
before update on public.professional_hub_announcements
for each row execute function public.professional_hub_touch_updated_at();

drop trigger if exists professional_hub_submissions_touch on public.professional_hub_submissions;
create trigger professional_hub_submissions_touch
before update on public.professional_hub_submissions
for each row execute function public.professional_hub_touch_updated_at();

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'professional-hub-submissions',
  'professional-hub-submissions',
  false,
  26214400,
  null
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

drop policy if exists professional_hub_storage_select on storage.objects;
create policy professional_hub_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'professional-hub-submissions'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.professional_hub_is_leader()
  )
);

drop policy if exists professional_hub_storage_insert on storage.objects;
create policy professional_hub_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'professional-hub-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.professional_hub_is_member()
);

drop policy if exists professional_hub_storage_update on storage.objects;
create policy professional_hub_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'professional-hub-submissions'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.professional_hub_is_leader()
  )
)
with check (
  bucket_id = 'professional-hub-submissions'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.professional_hub_is_leader()
  )
);

drop policy if exists professional_hub_storage_delete on storage.objects;
create policy professional_hub_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'professional-hub-submissions'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.professional_hub_is_leader()
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'professional_hub_announcements'
    ) then
      alter publication supabase_realtime add table public.professional_hub_announcements;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'professional_hub_recipients'
    ) then
      alter publication supabase_realtime add table public.professional_hub_recipients;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'professional_hub_submissions'
    ) then
      alter publication supabase_realtime add table public.professional_hub_submissions;
    end if;
  end if;
end;
$$;
