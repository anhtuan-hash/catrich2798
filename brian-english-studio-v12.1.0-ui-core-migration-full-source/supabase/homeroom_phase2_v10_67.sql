-- Brian English Studio V10.67
-- Homeroom Teacher Workspace Phase 2
-- Connected family/student portals, subject-teacher feedback and read receipts.
-- Run after supabase/homeroom_workspace_v10_66.sql.

create extension if not exists pgcrypto;

create table if not exists public.bes_homeroom_portals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null default '',
  workspace_id text not null default 'default',
  parent_code text not null default '',
  student_code text not null default '',
  subject_code text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, workspace_id)
);

create unique index if not exists bes_homeroom_portals_parent_code_uidx
  on public.bes_homeroom_portals (upper(parent_code)) where parent_code <> '';
create unique index if not exists bes_homeroom_portals_student_code_uidx
  on public.bes_homeroom_portals (upper(student_code)) where student_code <> '';
create unique index if not exists bes_homeroom_portals_subject_code_uidx
  on public.bes_homeroom_portals (upper(subject_code)) where subject_code <> '';
create index if not exists bes_homeroom_portals_owner_idx
  on public.bes_homeroom_portals(owner_id, workspace_id);

create table if not exists public.bes_homeroom_feedback_inbox (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.bes_homeroom_portals(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null default 'default',
  student_ref text not null,
  subject text not null,
  teacher_name text not null,
  teacher_email text not null default '',
  period text not null default '',
  level text not null default 'Bình thường',
  comment text not null,
  suggested_action text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists bes_homeroom_feedback_owner_idx
  on public.bes_homeroom_feedback_inbox(owner_id, workspace_id, status, created_at desc);

create table if not exists public.bes_homeroom_portal_receipts (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.bes_homeroom_portals(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null default 'default',
  notice_id text not null,
  student_ref text not null,
  reader_role text not null,
  reader_name text not null default '',
  read_at timestamptz not null default now(),
  unique (portal_id, notice_id, student_ref, reader_role)
);
create index if not exists bes_homeroom_receipts_owner_idx
  on public.bes_homeroom_portal_receipts(owner_id, workspace_id, notice_id, read_at desc);

alter table public.bes_homeroom_portals enable row level security;
alter table public.bes_homeroom_feedback_inbox enable row level security;
alter table public.bes_homeroom_portal_receipts enable row level security;

-- Helper predicate is repeated so this migration does not depend on custom functions.
drop policy if exists "homeroom_portal_owner_select" on public.bes_homeroom_portals;
create policy "homeroom_portal_owner_select"
on public.bes_homeroom_portals for select to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
);

drop policy if exists "homeroom_portal_owner_insert" on public.bes_homeroom_portals;
create policy "homeroom_portal_owner_insert"
on public.bes_homeroom_portals for insert to authenticated
with check (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
);

drop policy if exists "homeroom_portal_owner_update" on public.bes_homeroom_portals;
create policy "homeroom_portal_owner_update"
on public.bes_homeroom_portals for update to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
)
with check (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
);

drop policy if exists "homeroom_portal_owner_delete" on public.bes_homeroom_portals;
create policy "homeroom_portal_owner_delete"
on public.bes_homeroom_portals for delete to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
);

-- GVCN/Admin can review incoming feedback and portal receipts.
drop policy if exists "homeroom_feedback_owner_select" on public.bes_homeroom_feedback_inbox;
create policy "homeroom_feedback_owner_select"
on public.bes_homeroom_feedback_inbox for select to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
);

drop policy if exists "homeroom_feedback_owner_update" on public.bes_homeroom_feedback_inbox;
create policy "homeroom_feedback_owner_update"
on public.bes_homeroom_feedback_inbox for update to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
)
with check (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
);

drop policy if exists "homeroom_receipt_owner_select" on public.bes_homeroom_portal_receipts;
create policy "homeroom_receipt_owner_select"
on public.bes_homeroom_portal_receipts for select to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin' and p.approved = true
  )
);

grant select, insert, update, delete on public.bes_homeroom_portals to authenticated;
grant select, update on public.bes_homeroom_feedback_inbox to authenticated;
grant select on public.bes_homeroom_portal_receipts to authenticated;

-- Public portal lookup. The function returns only the selected student's prepared view.
create or replace function public.get_homeroom_portal(
  p_code text,
  p_role text,
  p_student_code text default '',
  p_pin text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_student_ref text := trim(coalesce(p_student_code, ''));
  v_view jsonb;
begin
  if v_role not in ('parent', 'student', 'subject') then
    return jsonb_build_object('ok', false, 'message', 'Vai trò không hợp lệ.');
  end if;

  select * into v_portal
  from public.bes_homeroom_portals
  where case
    when v_role = 'parent' then upper(parent_code) = v_code
    when v_role = 'student' then upper(student_code) = v_code
    else upper(subject_code) = v_code
  end
  limit 1;

  if v_portal.id is null then
    return jsonb_build_object('ok', false, 'message', 'Mã truy cập không tồn tại hoặc đã được thay đổi.');
  end if;

  if v_role = 'subject' then
    v_view := v_portal.payload -> 'subjectView';
  else
    if v_student_ref = '' or coalesce(v_portal.payload -> 'pins' ->> v_student_ref, '') <> trim(coalesce(p_pin, '')) then
      return jsonb_build_object('ok', false, 'message', 'Mã học sinh hoặc PIN không đúng.');
    end if;
    if v_role = 'parent' then
      v_view := v_portal.payload -> 'parentViews' -> v_student_ref;
    else
      v_view := v_portal.payload -> 'studentViews' -> v_student_ref;
    end if;
  end if;

  if v_view is null then
    return jsonb_build_object('ok', false, 'message', 'Không tìm thấy dữ liệu phù hợp.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'role', v_role,
    'workspaceId', v_portal.workspace_id,
    'view', v_view
  );
end;
$$;

-- Record a family/student read acknowledgement after validating the same portal credentials.
create or replace function public.acknowledge_homeroom_notice(
  p_code text,
  p_role text,
  p_student_code text,
  p_pin text,
  p_notice_id text,
  p_reader_name text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_student_ref text := trim(coalesce(p_student_code, ''));
begin
  if v_role not in ('parent', 'student') then
    return jsonb_build_object('ok', false, 'message', 'Vai trò không được phép xác nhận.');
  end if;

  select * into v_portal
  from public.bes_homeroom_portals
  where (v_role = 'parent' and upper(parent_code) = v_code)
     or (v_role = 'student' and upper(student_code) = v_code)
  limit 1;

  if v_portal.id is null
     or coalesce(v_portal.payload -> 'pins' ->> v_student_ref, '') <> trim(coalesce(p_pin, '')) then
    return jsonb_build_object('ok', false, 'message', 'Thông tin xác thực không đúng.');
  end if;

  if trim(coalesce(p_notice_id, '')) = '' then
    return jsonb_build_object('ok', false, 'message', 'Thiếu mã thông báo.');
  end if;

  insert into public.bes_homeroom_portal_receipts (
    portal_id, owner_id, workspace_id, notice_id, student_ref, reader_role, reader_name, read_at
  ) values (
    v_portal.id, v_portal.owner_id, v_portal.workspace_id, trim(p_notice_id), v_student_ref, v_role, trim(coalesce(p_reader_name, '')), now()
  )
  on conflict (portal_id, notice_id, student_ref, reader_role)
  do update set reader_name = excluded.reader_name, read_at = excluded.read_at;

  return jsonb_build_object('ok', true, 'readAt', now());
end;
$$;

-- Subject teachers can submit feedback with the class subject-code, without seeing private family data.
create or replace function public.submit_homeroom_subject_feedback(
  p_code text,
  p_student_code text,
  p_subject text,
  p_teacher_name text,
  p_teacher_email text default '',
  p_period text default '',
  p_level text default 'Bình thường',
  p_comment text default '',
  p_action text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_student_ref text := trim(coalesce(p_student_code, ''));
  v_student_exists boolean := false;
  v_id uuid;
begin
  select * into v_portal
  from public.bes_homeroom_portals
  where upper(subject_code) = v_code
  limit 1;

  if v_portal.id is null then
    return jsonb_build_object('ok', false, 'message', 'Mã giáo viên bộ môn không hợp lệ.');
  end if;

  select exists (
    select 1
    from jsonb_array_elements(coalesce(v_portal.payload -> 'subjectView' -> 'students', '[]'::jsonb)) student
    where coalesce(student ->> 'code', student ->> 'id') = v_student_ref
  ) into v_student_exists;

  if not v_student_exists then
    return jsonb_build_object('ok', false, 'message', 'Không tìm thấy học sinh trong lớp.');
  end if;

  if trim(coalesce(p_subject, '')) = '' or trim(coalesce(p_teacher_name, '')) = '' or trim(coalesce(p_comment, '')) = '' then
    return jsonb_build_object('ok', false, 'message', 'Thiếu môn học, tên giáo viên hoặc nội dung nhận xét.');
  end if;

  insert into public.bes_homeroom_feedback_inbox (
    portal_id, owner_id, workspace_id, student_ref, subject, teacher_name, teacher_email,
    period, level, comment, suggested_action, status
  ) values (
    v_portal.id, v_portal.owner_id, v_portal.workspace_id, v_student_ref,
    trim(p_subject), trim(p_teacher_name), trim(coalesce(p_teacher_email, '')),
    trim(coalesce(p_period, '')), trim(coalesce(p_level, 'Bình thường')),
    trim(p_comment), trim(coalesce(p_action, '')), 'pending'
  ) returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'message', 'Đã gửi nhận xét đến GVCN.');
end;
$$;

revoke all on function public.get_homeroom_portal(text,text,text,text) from public;
revoke all on function public.acknowledge_homeroom_notice(text,text,text,text,text,text) from public;
revoke all on function public.submit_homeroom_subject_feedback(text,text,text,text,text,text,text,text,text) from public;

grant execute on function public.get_homeroom_portal(text,text,text,text) to anon, authenticated;
grant execute on function public.acknowledge_homeroom_notice(text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.submit_homeroom_subject_feedback(text,text,text,text,text,text,text,text,text) to anon, authenticated;

comment on table public.bes_homeroom_portals is
'Sanitized, explicitly published homeroom portal snapshots. Private workspace payload remains in bes_homeroom_workspaces.';
comment on table public.bes_homeroom_feedback_inbox is
'Incoming subject-teacher feedback awaiting homeroom-teacher review.';
comment on table public.bes_homeroom_portal_receipts is
'Parent/student acknowledgements for homeroom announcements.';
