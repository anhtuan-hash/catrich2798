-- Brian English Studio V10.69
-- Homeroom Teacher Workspace Phase 3 (batches 1-3)
-- Run after homeroom_workspace_v10_66.sql and homeroom_phase2_v10_67.sql.

create extension if not exists pgcrypto;

alter table public.bes_homeroom_workspaces
  add column if not exists status text not null default 'active',
  add column if not exists semester text not null default 'Học kỳ 1',
  add column if not exists archived_at timestamptz;

create index if not exists bes_homeroom_workspaces_status_idx
  on public.bes_homeroom_workspaces(owner_id, status, school_year, updated_at desc);

-- Security/audit tables used by Phase 3 and available for future normalized sync.
create table if not exists public.bes_homeroom_portal_attempts (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.bes_homeroom_portals(id) on delete cascade,
  reader_role text not null,
  student_ref text not null default '',
  failed_count integer not null default 0,
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now(),
  last_success_at timestamptz,
  ip_address inet,
  unique(portal_id, reader_role, student_ref)
);
create index if not exists bes_homeroom_portal_attempts_lookup_idx
  on public.bes_homeroom_portal_attempts(portal_id, reader_role, student_ref, locked_until);

create table if not exists public.bes_homeroom_audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  actor_email text not null default '',
  action text not null,
  entity_type text not null default 'workspace',
  entity_ref text not null default '',
  source text not null default 'manual',
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bes_homeroom_audit_owner_idx
  on public.bes_homeroom_audit_logs(owner_id, workspace_id, created_at desc);

create table if not exists public.bes_homeroom_backups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  label text not null default 'Tự động',
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists bes_homeroom_backups_owner_idx
  on public.bes_homeroom_backups(owner_id, workspace_id, created_at desc);

-- Normalized Phase-3-ready tables. The app keeps backward compatibility with
-- the workspace JSON while these tables allow gradual querying and reporting.
create table if not exists public.bes_homeroom_students (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null, student_ref text not null, code text not null default '', full_name text not null,
  lifecycle_status text not null default 'active', profile jsonb not null default '{}'::jsonb,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, workspace_id, student_ref)
);
create table if not exists public.bes_homeroom_attendance (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null, student_ref text not null, attendance_date date not null,
  session_name text not null default 'Cả ngày', period_no integer, status text not null,
  note text not null default '', evidence_name text not null default '', locked boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, workspace_id, student_ref, attendance_date, session_name, period_no)
);
create table if not exists public.bes_homeroom_learning_records (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null, student_ref text not null, subject text not null, period text not null default '',
  assessment_type text not null default '', score numeric, weight numeric not null default 1,
  locked boolean not null default false, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bes_homeroom_incidents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null, student_ref text not null default '', occurred_at timestamptz not null default now(),
  severity text not null default 'Bình thường', title text not null, description text not null default '',
  action_taken text not null default '', follow_up_at timestamptz, status text not null default 'open',
  evidence_name text not null default '', payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bes_homeroom_parent_contacts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null, student_ref text not null default '', contact_at timestamptz not null default now(),
  channel text not null default '', subject text not null default '', message text not null default '',
  response_status text not null default 'Chưa phản hồi', follow_up_at timestamptz,
  attachment_name text not null default '', payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.bes_homeroom_announcements (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null, title text not null, content text not null default '', audience jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz, published_at timestamptz, due_at timestamptz,
  attachment_name text not null default '', status text not null default 'draft', payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bes_homeroom_documents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null, document_type text not null, title text not null,
  period text not null default '', content text not null default '', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Reusable owner/admin predicate.
create or replace function public.bes_homeroom_owner_or_admin(p_owner uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() = p_owner or exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and lower(coalesce(p.role,''))='admin' and p.approved=true
  );
$$;
revoke all on function public.bes_homeroom_owner_or_admin(uuid) from public;
grant execute on function public.bes_homeroom_owner_or_admin(uuid) to authenticated;

-- Apply owner/admin RLS to all private Phase 3 tables.
do $$
declare t text;
begin
  foreach t in array array[
    'bes_homeroom_audit_logs','bes_homeroom_backups','bes_homeroom_students',
    'bes_homeroom_attendance','bes_homeroom_learning_records','bes_homeroom_incidents',
    'bes_homeroom_parent_contacts','bes_homeroom_announcements','bes_homeroom_documents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.bes_homeroom_owner_or_admin(owner_id)) with check (public.bes_homeroom_owner_or_admin(owner_id))', t || '_owner_all', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.bes_homeroom_portal_attempts enable row level security;
-- No direct client access: only security-definer RPCs can read/write attempts.
revoke all on public.bes_homeroom_portal_attempts from anon, authenticated;

-- Secure portal lookup: SHA-256 PIN verification, rate limiting, temporary lockout,
-- session expiry and backward-compatible support for portals published by V10.67.
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
  v_attempt public.bes_homeroom_portal_attempts%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_student_ref text := trim(coalesce(p_student_code, ''));
  v_view jsonb;
  v_hash text;
  v_expected_hash text;
  v_legacy_pin text;
  v_max_attempts integer := 5;
  v_lock_minutes integer := 15;
  v_session_minutes integer := 30;
  v_next_failed integer;
begin
  if v_role not in ('parent', 'student', 'subject') then
    return jsonb_build_object('ok', false, 'message', 'Vai trò không hợp lệ.');
  end if;

  select * into v_portal from public.bes_homeroom_portals
  where case when v_role='parent' then upper(parent_code)=v_code
             when v_role='student' then upper(student_code)=v_code
             else upper(subject_code)=v_code end
  limit 1;

  if v_portal.id is null then
    return jsonb_build_object('ok', false, 'message', 'Mã truy cập không tồn tại hoặc đã được thay đổi.');
  end if;

  v_max_attempts := greatest(3, least(10, coalesce(nullif(v_portal.payload->'meta'->>'maxFailedAttempts','')::integer,5)));
  v_lock_minutes := greatest(5, least(1440, coalesce(nullif(v_portal.payload->'meta'->>'lockMinutes','')::integer,15)));
  v_session_minutes := greatest(10, least(240, coalesce(nullif(v_portal.payload->'meta'->>'sessionMinutes','')::integer,30)));

  if v_role='subject' then
    v_view := v_portal.payload->'subjectView';
  else
    select * into v_attempt from public.bes_homeroom_portal_attempts
      where portal_id=v_portal.id and reader_role=v_role and student_ref=v_student_ref;
    if v_attempt.locked_until is not null and v_attempt.locked_until > now() then
      return jsonb_build_object('ok',false,'locked',true,'lockedUntil',v_attempt.locked_until,
        'message','Cổng tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.');
    end if;

    v_hash := encode(digest(trim(coalesce(p_pin,'')),'sha256'),'hex');
    v_expected_hash := coalesce(v_portal.payload->'pinHashes'->>v_student_ref,'');
    v_legacy_pin := coalesce(v_portal.payload->'pins'->>v_student_ref,'');

    if v_student_ref='' or not ((v_expected_hash<>'' and v_expected_hash=v_hash) or (v_expected_hash='' and v_legacy_pin=trim(coalesce(p_pin,'')))) then
      v_next_failed := coalesce(v_attempt.failed_count,0)+1;
      insert into public.bes_homeroom_portal_attempts(portal_id,reader_role,student_ref,failed_count,locked_until,last_attempt_at,ip_address)
      values(v_portal.id,v_role,v_student_ref,v_next_failed,
        case when v_next_failed>=v_max_attempts then now()+make_interval(mins=>v_lock_minutes) else null end,
        now(),inet_client_addr())
      on conflict(portal_id,reader_role,student_ref) do update set
        failed_count=excluded.failed_count, locked_until=excluded.locked_until,
        last_attempt_at=now(), ip_address=inet_client_addr();
      return jsonb_build_object('ok',false,'remainingAttempts',greatest(0,v_max_attempts-v_next_failed),
        'locked',v_next_failed>=v_max_attempts,
        'message',case when v_next_failed>=v_max_attempts then 'Cổng đã tạm khóa do nhập sai nhiều lần.' else 'Mã học sinh hoặc PIN không đúng.' end);
    end if;

    insert into public.bes_homeroom_portal_attempts(portal_id,reader_role,student_ref,failed_count,locked_until,last_attempt_at,last_success_at,ip_address)
    values(v_portal.id,v_role,v_student_ref,0,null,now(),now(),inet_client_addr())
    on conflict(portal_id,reader_role,student_ref) do update set
      failed_count=0,locked_until=null,last_attempt_at=now(),last_success_at=now(),ip_address=inet_client_addr();

    if v_role='parent' then v_view := v_portal.payload->'parentViews'->v_student_ref;
    else v_view := v_portal.payload->'studentViews'->v_student_ref; end if;
  end if;

  if v_view is null then return jsonb_build_object('ok',false,'message','Không tìm thấy dữ liệu phù hợp.'); end if;

  return jsonb_build_object('ok',true,'role',v_role,'workspaceId',v_portal.workspace_id,
    'sessionExpiresAt',now()+make_interval(mins=>v_session_minutes),'view',v_view);
end;
$$;

create or replace function public.acknowledge_homeroom_notice(
  p_code text, p_role text, p_student_code text, p_pin text,
  p_notice_id text, p_reader_name text default ''
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
  v_role text := lower(trim(coalesce(p_role,'')));
  v_student_ref text := trim(coalesce(p_student_code,''));
  v_hash text := encode(digest(trim(coalesce(p_pin,'')),'sha256'),'hex');
  v_expected text;
  v_legacy text;
begin
  if v_role not in ('parent','student') then return jsonb_build_object('ok',false,'message','Vai trò không được phép xác nhận.'); end if;
  select * into v_portal from public.bes_homeroom_portals
    where (v_role='parent' and upper(parent_code)=v_code) or (v_role='student' and upper(student_code)=v_code) limit 1;
  if v_portal.id is null then return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.'); end if;
  v_expected := coalesce(v_portal.payload->'pinHashes'->>v_student_ref,'');
  v_legacy := coalesce(v_portal.payload->'pins'->>v_student_ref,'');
  if not ((v_expected<>'' and v_expected=v_hash) or (v_expected='' and v_legacy=trim(coalesce(p_pin,'')))) then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;
  insert into public.bes_homeroom_portal_receipts(portal_id,owner_id,workspace_id,notice_id,student_ref,reader_role,reader_name,read_at)
  values(v_portal.id,v_portal.owner_id,v_portal.workspace_id,p_notice_id,v_student_ref,v_role,coalesce(p_reader_name,''),now())
  on conflict(portal_id,notice_id,student_ref,reader_role) do update set reader_name=excluded.reader_name,read_at=now();
  return jsonb_build_object('ok',true,'readAt',now());
end;
$$;

grant execute on function public.get_homeroom_portal(text,text,text,text) to anon, authenticated;
grant execute on function public.acknowledge_homeroom_notice(text,text,text,text,text,text) to anon, authenticated;

comment on table public.bes_homeroom_portal_attempts is 'Rate limit and temporary lockout state for Phase 3 family/student portal access.';
comment on table public.bes_homeroom_audit_logs is 'Immutable-style audit stream for important homeroom changes.';
comment on table public.bes_homeroom_backups is 'Manual and automatic homeroom workspace restore points.';

-- Two-way family/student responses to homeroom announcements.
create table if not exists public.bes_homeroom_portal_responses (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.bes_homeroom_portals(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null default 'default',
  notice_id text not null default '',
  student_ref text not null,
  reader_role text not null,
  reader_name text not null default '',
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists bes_homeroom_portal_responses_owner_idx
  on public.bes_homeroom_portal_responses(owner_id,workspace_id,status,created_at desc);
alter table public.bes_homeroom_portal_responses enable row level security;
drop policy if exists "homeroom_response_owner_select" on public.bes_homeroom_portal_responses;
create policy "homeroom_response_owner_select" on public.bes_homeroom_portal_responses
  for select to authenticated using (public.bes_homeroom_owner_or_admin(owner_id));
drop policy if exists "homeroom_response_owner_update" on public.bes_homeroom_portal_responses;
create policy "homeroom_response_owner_update" on public.bes_homeroom_portal_responses
  for update to authenticated using (public.bes_homeroom_owner_or_admin(owner_id))
  with check (public.bes_homeroom_owner_or_admin(owner_id));
grant select,update on public.bes_homeroom_portal_responses to authenticated;

create or replace function public.submit_homeroom_portal_response(
  p_code text, p_role text, p_student_code text, p_pin text,
  p_notice_id text default '', p_message text default '', p_reader_name text default ''
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
  v_role text := lower(trim(coalesce(p_role,'')));
  v_student_ref text := trim(coalesce(p_student_code,''));
  v_hash text := encode(digest(trim(coalesce(p_pin,'')),'sha256'),'hex');
  v_expected text;
  v_legacy text;
  v_id uuid;
begin
  if v_role not in ('parent','student') then return jsonb_build_object('ok',false,'message','Vai trò không được phép phản hồi.'); end if;
  if length(trim(coalesce(p_message,''))) < 2 then return jsonb_build_object('ok',false,'message','Nội dung phản hồi quá ngắn.'); end if;
  select * into v_portal from public.bes_homeroom_portals
    where (v_role='parent' and upper(parent_code)=v_code) or (v_role='student' and upper(student_code)=v_code) limit 1;
  if v_portal.id is null then return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.'); end if;
  v_expected := coalesce(v_portal.payload->'pinHashes'->>v_student_ref,'');
  v_legacy := coalesce(v_portal.payload->'pins'->>v_student_ref,'');
  if not ((v_expected<>'' and v_expected=v_hash) or (v_expected='' and v_legacy=trim(coalesce(p_pin,'')))) then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;
  insert into public.bes_homeroom_portal_responses(portal_id,owner_id,workspace_id,notice_id,student_ref,reader_role,reader_name,message)
  values(v_portal.id,v_portal.owner_id,v_portal.workspace_id,trim(coalesce(p_notice_id,'')),v_student_ref,v_role,trim(coalesce(p_reader_name,'')),left(trim(p_message),4000))
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id,'createdAt',now());
end;
$$;
grant execute on function public.submit_homeroom_portal_response(text,text,text,text,text,text,text) to anon,authenticated;
