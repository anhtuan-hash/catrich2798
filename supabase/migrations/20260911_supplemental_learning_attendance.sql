-- 2026-09-11: first-class supplemental-learning attendance.
-- Học bổ sung is deliberately separate from bes_extra_classes. This migration is
-- additive and reuses the existing global attendance permission + Giờ GV decision.

create table if not exists public.bes_supplemental_students (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('official', 'manual')),
  official_key text,
  linked_official_key text,
  student_code text not null default '',
  full_name text not null,
  school_class_name text not null default '',
  active boolean not null default true,
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (source_type <> 'official' or nullif(btrim(official_key), '') is not null),
  check (source_type <> 'official' or linked_official_key is null),
  check (source_type <> 'manual' or official_key is null)
);
create unique index if not exists bes_supplemental_students_official_key_uidx on public.bes_supplemental_students (lower(official_key)) where source_type='official' and official_key is not null;
create unique index if not exists bes_supplemental_students_active_manual_code_uidx on public.bes_supplemental_students (lower(student_code)) where source_type='manual' and active=true and nullif(btrim(student_code),'') is not null and linked_official_key is null;

create table if not exists public.bes_supplemental_groups (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  subject text not null,
  grade_level text not null default '',
  teacher_id uuid,
  teacher_name text not null default '',
  teacher_email text not null default '',
  room text not null default '',
  start_date date not null,
  end_date date not null,
  weekdays smallint[] not null default '{}'::smallint[],
  start_time time without time zone not null,
  end_time time without time zone not null,
  active boolean not null default true,
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (end_date >= start_date),
  check (start_time <> end_time),
  check (cardinality(weekdays) > 0),
  check (weekdays <@ array[1,2,3,4,5,6,7]::smallint[])
);

create table if not exists public.bes_supplemental_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.bes_supplemental_groups(id) on delete restrict,
  student_id uuid not null references public.bes_supplemental_students(id) on delete restrict,
  effective_from date not null,
  effective_until date,
  removal_reason text not null default '',
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (effective_until is null or effective_until >= effective_from)
);
create index if not exists bes_supplemental_memberships_group_dates_idx on public.bes_supplemental_group_memberships (group_id,effective_from,effective_until);
create index if not exists bes_supplemental_memberships_student_idx on public.bes_supplemental_group_memberships (student_id);

create table if not exists public.bes_supplemental_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.bes_supplemental_groups(id) on delete restrict,
  kind text not null check (kind in ('recurring', 'adhoc')),
  title text not null default '',
  attendance_date date not null,
  subject text not null,
  teacher_id uuid,
  teacher_name text not null default '',
  teacher_email text not null default '',
  room text not null default '',
  start_time time without time zone not null,
  end_time time without time zone not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'confirmed', 'cancelled')),
  cancellation_reason text not null default '',
  roster_frozen_at timestamptz,
  attendance_confirmed_at timestamptz,
  checked_by uuid,
  checked_by_name text not null default '',
  session_note text not null default '',
  proof_path text not null default '',
  total_students integer not null default 0 check (total_students >= 0),
  present_count integer not null default 0 check (present_count >= 0),
  absent_count integer not null default 0 check (absent_count >= 0),
  tardy_count integer not null default 0 check (tardy_count >= 0),
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (group_id, attendance_date),
  check (start_time <> end_time),
  check ((kind='recurring' and group_id is not null) or (kind='adhoc' and group_id is null))
);
create index if not exists bes_supplemental_sessions_date_idx on public.bes_supplemental_sessions (attendance_date,status);
create index if not exists bes_supplemental_sessions_group_idx on public.bes_supplemental_sessions (group_id,attendance_date);

create table if not exists public.bes_supplemental_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bes_supplemental_sessions(id) on delete restrict,
  student_id uuid not null references public.bes_supplemental_students(id) on delete restrict,
  canonical_student_key text not null,
  student_code_snapshot text not null default '',
  full_name_snapshot text not null,
  school_class_snapshot text not null default '',
  attendance_status text check (attendance_status is null or attendance_status in ('present','absent','tardy')),
  absence_reason_code text not null default '',
  absence_note text not null default '',
  recorded_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  unique (session_id, canonical_student_key),
  unique (session_id, student_id)
);
create index if not exists bes_supplemental_participants_student_idx on public.bes_supplemental_session_participants (student_id,session_id);

alter table public.bes_supplemental_students enable row level security;
alter table public.bes_supplemental_groups enable row level security;
alter table public.bes_supplemental_group_memberships enable row level security;
alter table public.bes_supplemental_sessions enable row level security;
alter table public.bes_supplemental_session_participants enable row level security;
revoke all on table public.bes_supplemental_students from public, anon, authenticated;
revoke all on table public.bes_supplemental_groups from public, anon, authenticated;
revoke all on table public.bes_supplemental_group_memberships from public, anon, authenticated;
revoke all on table public.bes_supplemental_sessions from public, anon, authenticated;
revoke all on table public.bes_supplemental_session_participants from public, anon, authenticated;

create or replace function private.bes_require_supplemental_admin()
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập để quản lý Học bổ sung.'; end if;
  select * into v_profile from public.profiles p where p.id=v_uid and p.approved=true;
  if not found or lower(coalesce(v_profile.role,'')) not in ('admin','administrator') then raise exception 'Chỉ Admin đã được duyệt mới có thể quản lý Học bổ sung.'; end if;
  return v_uid;
end; $$;

create or replace function private.bes_require_supplemental_reader(p_permissions text[])
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype; v_allowed jsonb;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập để xem dữ liệu Học bổ sung.'; end if;
  select * into v_profile from public.profiles p where p.id=v_uid and p.approved=true;
  if not found then raise exception 'Tài khoản chưa được duyệt.'; end if;
  if lower(coalesce(v_profile.role,'')) in ('admin','administrator') then return v_uid; end if;
  v_allowed:=coalesce(v_profile.permissions->'allowed','[]'::jsonb);
  if v_allowed ? 'route:attendance' then return v_uid; end if;
  if exists(select 1 from unnest(coalesce(p_permissions,'{}'::text[])) permission_id where v_allowed ? permission_id) then return v_uid; end if;
  raise exception 'Tài khoản chưa được cấp quyền phù hợp trong Điểm danh.';
end; $$;

create or replace function private.bes_supplemental_canonical_key(p_student_id uuid)
returns text language sql stable security definer set search_path=''
as $$ select case when nullif(btrim(s.linked_official_key),'') is not null then 'official:'||lower(btrim(s.linked_official_key)) when s.source_type='official' and nullif(btrim(s.official_key),'') is not null then 'official:'||lower(btrim(s.official_key)) else 'supplemental:'||s.id::text end from public.bes_supplemental_students s where s.id=p_student_id $$;

create or replace function private.bes_supplemental_official_candidates()
returns table(official_key text,student_code text,full_name text,school_class_name text)
language sql stable security definer set search_path=''
as $$
with registry_students as (
  select case when nullif(btrim(student->>'code'),'') is not null then 'school:'||lower(btrim(student->>'code')) else 'registry:'||md5(lower(coalesce(student->>'fullName',''))||'|'||lower(coalesce(cls->>'className',''))||'|'||coalesce(student->>'birthDate','')) end official_key,
    coalesce(student->>'code','') student_code,coalesce(student->>'fullName','') full_name,coalesce(student->>'className',cls->>'className','') school_class_name
  from public.school_class_registries r cross join lateral jsonb_array_elements(coalesce(r.payload->'classes','[]'::jsonb)) cls cross join lateral jsonb_array_elements(coalesce(cls->'students','[]'::jsonb)) student
  where coalesce((student->>'active')::boolean,true)=true and coalesce(student->>'lifecycleStatus','active')<>'deleted' and nullif(btrim(student->>'fullName'),'') is not null
), homeroom_students as (
  select case when nullif(btrim(h.code),'') is not null then 'school:'||lower(btrim(h.code)) else 'homeroom:'||lower(btrim(h.student_ref)) end,coalesce(h.code,''),coalesce(h.full_name,''),coalesce(h.profile->>'className',h.workspace_id,'')
  from public.bes_homeroom_students h where h.lifecycle_status<>'deleted' and nullif(btrim(h.full_name),'') is not null
), extra_members as (
  select case when nullif(btrim(m.student_code),'') is not null then 'school:'||lower(btrim(m.student_code)) else 'extra-member:'||lower(btrim(m.member_key)) end,coalesce(m.student_code,''),coalesce(m.student_full_name,''),coalesce(m.school_class_name,'')
  from public.bes_extra_class_members m where m.active=true and nullif(btrim(m.student_full_name),'') is not null
), combined as (select * from registry_students union all select * from homeroom_students union all select * from extra_members)
select distinct on(c.official_key) c.official_key,c.student_code,c.full_name,c.school_class_name from combined c where nullif(btrim(c.official_key),'') is not null order by c.official_key,case when nullif(btrim(c.student_code),'') is not null then 0 else 1 end,c.full_name
$$;

create or replace function private.bes_materialize_supplemental_group_sessions(p_group_id uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare v_group public.bes_supplemental_groups%rowtype; v_count integer:=0;
begin
  select * into v_group from public.bes_supplemental_groups g where g.id=p_group_id for update;
  if not found then raise exception 'Không tìm thấy nhóm Học bổ sung.'; end if;
  update public.bes_supplemental_sessions s set status='cancelled',cancellation_reason='Lịch nhóm đã thay đổi',updated_by=v_group.updated_by,updated_at=clock_timestamp()
  where s.group_id=v_group.id and s.kind='recurring' and s.status='scheduled' and s.roster_frozen_at is null and s.attendance_date>=current_date and (v_group.active=false or s.attendance_date<v_group.start_date or s.attendance_date>v_group.end_date or not(extract(isodow from s.attendance_date)::smallint=any(v_group.weekdays)));
  insert into public.bes_supplemental_sessions(group_id,kind,title,attendance_date,subject,teacher_id,teacher_name,teacher_email,room,start_time,end_time,status,cancellation_reason,created_by,updated_by,created_at,updated_at)
  select v_group.id,'recurring',v_group.group_name,d::date,v_group.subject,v_group.teacher_id,v_group.teacher_name,v_group.teacher_email,v_group.room,v_group.start_time,v_group.end_time,'scheduled','',v_group.created_by,v_group.updated_by,clock_timestamp(),clock_timestamp()
  from generate_series(v_group.start_date,v_group.end_date,interval '1 day') d where v_group.active=true and extract(isodow from d)::smallint=any(v_group.weekdays)
  on conflict(group_id,attendance_date) do update set title=excluded.title,subject=excluded.subject,teacher_id=excluded.teacher_id,teacher_name=excluded.teacher_name,teacher_email=excluded.teacher_email,room=excluded.room,start_time=excluded.start_time,end_time=excluded.end_time,status=case when public.bes_supplemental_sessions.status='cancelled' and public.bes_supplemental_sessions.cancellation_reason='Lịch nhóm đã thay đổi' then 'scheduled' else public.bes_supplemental_sessions.status end,cancellation_reason=case when public.bes_supplemental_sessions.status='cancelled' and public.bes_supplemental_sessions.cancellation_reason='Lịch nhóm đã thay đổi' then '' else public.bes_supplemental_sessions.cancellation_reason end,updated_by=excluded.updated_by,updated_at=clock_timestamp()
  where public.bes_supplemental_sessions.roster_frozen_at is null and public.bes_supplemental_sessions.status in('scheduled','cancelled');
  get diagnostics v_count=row_count; return v_count;
end; $$;

-- The central decision now accepts either an active legacy extra class id or a
-- non-cancelled supplemental session id, preserving the existing signature.
create or replace function private.bes_attendance_access_decision(p_class_id uuid,p_teacher_name text,p_now timestamptz)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype; v_enforced boolean:=false; v_start time:=time '16:40'; v_end time:=time '17:15';
 v_local_time time:=(coalesce(p_now,clock_timestamp()) at time zone 'Asia/Ho_Chi_Minh')::time; v_is_admin boolean:=false; v_has_report boolean:=false; v_in_window boolean:=false; v_activity_exists boolean:=false;
begin
 if v_uid is null then return jsonb_build_object('allowed',false,'reason','not_authenticated'); end if;
 select * into v_profile from public.profiles p where p.id=v_uid and p.approved=true;
 if not found then return jsonb_build_object('allowed',false,'reason','profile_not_approved'); end if;
 v_is_admin:=lower(coalesce(v_profile.role,'')) in('admin','administrator'); v_has_report:=coalesce(v_profile.permissions->'allowed','[]'::jsonb)?'attendance:report';
 if v_is_admin then return jsonb_build_object('allowed',true,'reason','admin_bypass','bypass',true); end if;
 if v_has_report then return jsonb_build_object('allowed',true,'reason','report_bypass','bypass',true); end if;
 if not public.can_take_extra_class_attendance() then return jsonb_build_object('allowed',false,'reason','missing_permission'); end if;
 select coalesce(s.enforce_teacher_time_window,false),s.teacher_start_time,s.teacher_end_time into v_enforced,v_start,v_end from public.bes_attendance_access_settings s where s.id=1;
 v_enforced:=coalesce(v_enforced,false); v_start:=coalesce(v_start,time '16:40'); v_end:=coalesce(v_end,time '17:15');
 if not v_enforced then return jsonb_build_object('allowed',true,'reason','restriction_disabled','bypass',false,'window_start',to_char(v_start,'HH24:MI'),'window_end',to_char(v_end,'HH24:MI')); end if;
 perform p_teacher_name;
 select (exists(select 1 from public.bes_extra_classes c where c.id=p_class_id and c.active=true) or exists(select 1 from public.bes_supplemental_sessions s where s.id=p_class_id and s.status<>'cancelled')) into v_activity_exists;
 if not v_activity_exists then return jsonb_build_object('allowed',false,'reason','class_not_found'); end if;
 if v_start=v_end then return jsonb_build_object('allowed',false,'reason','invalid_time','class_id',p_class_id); end if;
 if v_end>v_start then v_in_window:=v_local_time>=v_start and v_local_time<=v_end; else v_in_window:=v_local_time>=v_start or v_local_time<=v_end; end if;
 if not v_in_window then return jsonb_build_object('allowed',false,'reason','outside_time','class_id',p_class_id,'window_start',to_char(v_start,'HH24:MI'),'window_end',to_char(v_end,'HH24:MI')); end if;
 return jsonb_build_object('allowed',true,'reason','within_window','bypass',false,'class_id',p_class_id,'window_start',to_char(v_start,'HH24:MI'),'window_end',to_char(v_end,'HH24:MI'));
end; $$;

create or replace function public.bes_list_supplemental_admin_data()
returns jsonb language plpgsql security definer set search_path=''
as $$ begin perform private.bes_require_supplemental_admin(); return jsonb_build_object(
 'officialStudents',coalesce((select jsonb_agg(jsonb_build_object('officialKey',c.official_key,'studentCode',c.student_code,'fullName',c.full_name,'schoolClassName',c.school_class_name) order by c.school_class_name,c.full_name) from private.bes_supplemental_official_candidates() c),'[]'::jsonb),
 'students',coalesce((select jsonb_agg(to_jsonb(s) order by s.full_name) from public.bes_supplemental_students s),'[]'::jsonb),
 'groups',coalesce((select jsonb_agg(to_jsonb(g) order by g.active desc,g.group_name) from public.bes_supplemental_groups g),'[]'::jsonb),
 'memberships',coalesce((select jsonb_agg(to_jsonb(m) order by m.effective_from desc) from public.bes_supplemental_group_memberships m),'[]'::jsonb),
 'sessions',coalesce((select jsonb_agg(to_jsonb(s) order by s.attendance_date desc,s.start_time) from public.bes_supplemental_sessions s),'[]'::jsonb),
 'participants',coalesce((select jsonb_agg(to_jsonb(p) order by p.full_name_snapshot) from public.bes_supplemental_session_participants p),'[]'::jsonb)); end; $$;

create or replace function public.bes_upsert_supplemental_student(p_student_id uuid default null,p_source_type text default 'manual',p_official_key text default null,p_student_code text default '',p_full_name text default '',p_school_class_name text default '',p_active boolean default true)
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_uid uuid:=private.bes_require_supplemental_admin(); v_row public.bes_supplemental_students%rowtype; v_source text:=lower(btrim(coalesce(p_source_type,'manual'))); v_official_key text:=nullif(btrim(p_official_key),'');
begin
 if v_source not in('official','manual') then raise exception 'Loại học sinh không hợp lệ.'; end if; if nullif(btrim(p_full_name),'') is null then raise exception 'Họ tên học sinh là bắt buộc.'; end if; if v_source='official' and v_official_key is null then raise exception 'Học sinh chính thức phải có khóa định danh.'; end if;
 if p_student_id is null then insert into public.bes_supplemental_students(source_type,official_key,student_code,full_name,school_class_name,active,created_by,updated_by,created_at,updated_at) values(v_source,case when v_source='official' then v_official_key else null end,btrim(coalesce(p_student_code,'')),btrim(p_full_name),btrim(coalesce(p_school_class_name,'')),coalesce(p_active,true),v_uid,v_uid,clock_timestamp(),clock_timestamp()) returning * into v_row;
 else update public.bes_supplemental_students s set source_type=v_source,official_key=case when v_source='official' then v_official_key else null end,linked_official_key=case when v_source='official' then null else s.linked_official_key end,student_code=btrim(coalesce(p_student_code,'')),full_name=btrim(p_full_name),school_class_name=btrim(coalesce(p_school_class_name,'')),active=coalesce(p_active,s.active),updated_by=v_uid,updated_at=clock_timestamp() where s.id=p_student_id returning * into v_row; if not found then raise exception 'Không tìm thấy học sinh Học bổ sung.'; end if; end if;
 return to_jsonb(v_row); end; $$;

create or replace function public.bes_link_supplemental_student(p_student_id uuid,p_official_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_uid uuid:=private.bes_require_supplemental_admin(); v_row public.bes_supplemental_students%rowtype; v_target text:=nullif(btrim(p_official_key),''); v_target_canonical text;
begin
 if v_target is null then raise exception 'Hãy chọn học sinh chính thức để liên kết.'; end if;
 if not exists(select 1 from private.bes_supplemental_official_candidates() c where lower(c.official_key)=lower(v_target)) and not exists(select 1 from public.bes_supplemental_students s where s.source_type='official' and lower(s.official_key)=lower(v_target)) then raise exception 'Không tìm thấy học sinh chính thức tương ứng.'; end if;
 select * into v_row from public.bes_supplemental_students s where s.id=p_student_id for update; if not found then raise exception 'Không tìm thấy học sinh Học bổ sung.'; end if; if v_row.source_type<>'manual' then raise exception 'Chỉ học sinh nhập thủ công mới cần liên kết.'; end if; v_target_canonical:='official:'||lower(v_target);
 if exists(select 1 from public.bes_supplemental_session_participants ownp join public.bes_supplemental_session_participants otherp on otherp.session_id=ownp.session_id and otherp.id<>ownp.id where ownp.student_id=p_student_id and private.bes_supplemental_canonical_key(otherp.student_id)=v_target_canonical) then raise exception 'Không thể liên kết vì học sinh chính thức đã xuất hiện trong cùng một buổi học.'; end if;
 if exists(select 1 from public.bes_supplemental_group_memberships ownm join public.bes_supplemental_group_memberships otherm on otherm.group_id=ownm.group_id and otherm.id<>ownm.id where ownm.student_id=p_student_id and private.bes_supplemental_canonical_key(otherm.student_id)=v_target_canonical and daterange(ownm.effective_from,coalesce(ownm.effective_until+1,'infinity'::date),'[)')&&daterange(otherm.effective_from,coalesce(otherm.effective_until+1,'infinity'::date),'[)')) then raise exception 'Không thể liên kết vì sẽ tạo thành viên trùng trong cùng nhóm.'; end if;
 update public.bes_supplemental_students s set linked_official_key=v_target,updated_by=v_uid,updated_at=clock_timestamp() where s.id=p_student_id returning * into v_row;
 return to_jsonb(v_row); end; $$;

create or replace function public.bes_upsert_supplemental_group(p_group_id uuid default null,p_group_name text default '',p_subject text default '',p_grade_level text default '',p_teacher_id uuid default null,p_teacher_name text default '',p_teacher_email text default '',p_room text default '',p_start_date date default current_date,p_end_date date default current_date,p_weekdays smallint[] default array[1]::smallint[],p_start_time time default time '16:45',p_end_time time default time '18:00',p_active boolean default true)
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_uid uuid:=private.bes_require_supplemental_admin(); v_row public.bes_supplemental_groups%rowtype;
begin
 if nullif(btrim(p_group_name),'') is null or nullif(btrim(p_subject),'') is null then raise exception 'Tên nhóm và môn học là bắt buộc.'; end if; if p_end_date<p_start_date then raise exception 'Ngày kết thúc không hợp lệ.'; end if; if p_start_time=p_end_time then raise exception 'Giờ bắt đầu và kết thúc phải khác nhau.'; end if; if cardinality(p_weekdays)=0 or not(p_weekdays<@array[1,2,3,4,5,6,7]::smallint[]) then raise exception 'Thứ trong tuần không hợp lệ.'; end if;
 if p_group_id is null then insert into public.bes_supplemental_groups(group_name,subject,grade_level,teacher_id,teacher_name,teacher_email,room,start_date,end_date,weekdays,start_time,end_time,active,created_by,updated_by,created_at,updated_at) values(btrim(p_group_name),btrim(p_subject),btrim(coalesce(p_grade_level,'')),p_teacher_id,btrim(coalesce(p_teacher_name,'')),btrim(coalesce(p_teacher_email,'')),btrim(coalesce(p_room,'')),p_start_date,p_end_date,p_weekdays,p_start_time,p_end_time,coalesce(p_active,true),v_uid,v_uid,clock_timestamp(),clock_timestamp()) returning * into v_row;
 else update public.bes_supplemental_groups g set group_name=btrim(p_group_name),subject=btrim(p_subject),grade_level=btrim(coalesce(p_grade_level,'')),teacher_id=p_teacher_id,teacher_name=btrim(coalesce(p_teacher_name,'')),teacher_email=btrim(coalesce(p_teacher_email,'')),room=btrim(coalesce(p_room,'')),start_date=p_start_date,end_date=p_end_date,weekdays=p_weekdays,start_time=p_start_time,end_time=p_end_time,active=coalesce(p_active,g.active),updated_by=v_uid,updated_at=clock_timestamp() where g.id=p_group_id returning * into v_row; if not found then raise exception 'Không tìm thấy nhóm Học bổ sung.'; end if; end if;
 perform private.bes_materialize_supplemental_group_sessions(v_row.id); return to_jsonb(v_row); end; $$;

create or replace function public.bes_set_supplemental_membership(p_membership_id uuid default null,p_group_id uuid default null,p_student_id uuid default null,p_effective_from date default current_date,p_effective_until date default null,p_removal_reason text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_uid uuid:=private.bes_require_supplemental_admin(); v_row public.bes_supplemental_group_memberships%rowtype; v_canonical text;
begin
 if p_group_id is null or p_student_id is null then raise exception 'Nhóm và học sinh là bắt buộc.'; end if; if p_effective_until is not null and p_effective_until<p_effective_from then raise exception 'Ngày ngừng tham gia không hợp lệ.'; end if;
 if not exists(select 1 from public.bes_supplemental_groups g where g.id=p_group_id) then raise exception 'Không tìm thấy nhóm Học bổ sung.'; end if; if not exists(select 1 from public.bes_supplemental_students s where s.id=p_student_id and s.active=true) then raise exception 'Không tìm thấy học sinh đang hoạt động.'; end if;
 v_canonical:=private.bes_supplemental_canonical_key(p_student_id);
 if exists(select 1 from public.bes_supplemental_group_memberships m where m.group_id=p_group_id and m.id<>coalesce(p_membership_id,'00000000-0000-0000-0000-000000000000'::uuid) and private.bes_supplemental_canonical_key(m.student_id)=v_canonical and daterange(m.effective_from,coalesce(m.effective_until+1,'infinity'::date),'[)')&&daterange(p_effective_from,coalesce(p_effective_until+1,'infinity'::date),'[)')) then raise exception 'Học sinh đã có khoảng thời gian tham gia trùng trong nhóm này.'; end if;
 if p_membership_id is null then insert into public.bes_supplemental_group_memberships(group_id,student_id,effective_from,effective_until,removal_reason,created_by,updated_by,created_at,updated_at) values(p_group_id,p_student_id,p_effective_from,p_effective_until,btrim(coalesce(p_removal_reason,'')),v_uid,v_uid,clock_timestamp(),clock_timestamp()) returning * into v_row;
 else update public.bes_supplemental_group_memberships m set group_id=p_group_id,student_id=p_student_id,effective_from=p_effective_from,effective_until=p_effective_until,removal_reason=btrim(coalesce(p_removal_reason,'')),updated_by=v_uid,updated_at=clock_timestamp() where m.id=p_membership_id returning * into v_row; if not found then raise exception 'Không tìm thấy thành viên nhóm.'; end if; end if; return to_jsonb(v_row); end; $$;

create or replace function public.bes_upsert_supplemental_session(p_session_id uuid default null,p_group_id uuid default null,p_kind text default 'adhoc',p_title text default '',p_attendance_date date default current_date,p_subject text default '',p_teacher_id uuid default null,p_teacher_name text default '',p_teacher_email text default '',p_room text default '',p_start_time time default time '16:45',p_end_time time default time '18:00',p_participant_ids uuid[] default '{}'::uuid[],p_session_note text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_uid uuid:=private.bes_require_supplemental_admin(); v_kind text:=lower(btrim(coalesce(p_kind,'adhoc'))); v_row public.bes_supplemental_sessions%rowtype; v_existing public.bes_supplemental_sessions%rowtype;
begin
 if v_kind not in('recurring','adhoc') then raise exception 'Loại buổi học không hợp lệ.'; end if; if v_kind='recurring' and p_group_id is null then raise exception 'Buổi dài ngày phải thuộc một nhóm.'; end if; if v_kind='adhoc' and p_group_id is not null then raise exception 'Buổi phát sinh không gắn với nhóm dài ngày.'; end if; if nullif(btrim(p_subject),'') is null then raise exception 'Môn học là bắt buộc.'; end if; if p_start_time=p_end_time then raise exception 'Giờ bắt đầu và kết thúc phải khác nhau.'; end if;
 if p_session_id is not null then select * into v_existing from public.bes_supplemental_sessions s where s.id=p_session_id for update; if not found then raise exception 'Không tìm thấy buổi Học bổ sung.'; end if; if v_existing.roster_frozen_at is not null or v_existing.status<>'scheduled' then raise exception 'Buổi đã bắt đầu/chốt hoặc đã hủy nên không thể thay đổi.'; end if; end if;
 if p_session_id is null then insert into public.bes_supplemental_sessions(group_id,kind,title,attendance_date,subject,teacher_id,teacher_name,teacher_email,room,start_time,end_time,status,session_note,created_by,updated_by,created_at,updated_at) values(p_group_id,v_kind,coalesce(nullif(btrim(p_title),''),btrim(p_subject)||' · '||p_attendance_date::text),p_attendance_date,btrim(p_subject),p_teacher_id,btrim(coalesce(p_teacher_name,'')),btrim(coalesce(p_teacher_email,'')),btrim(coalesce(p_room,'')),p_start_time,p_end_time,'scheduled',btrim(coalesce(p_session_note,'')),v_uid,v_uid,clock_timestamp(),clock_timestamp()) returning * into v_row;
 else update public.bes_supplemental_sessions s set group_id=p_group_id,kind=v_kind,title=coalesce(nullif(btrim(p_title),''),btrim(p_subject)||' · '||p_attendance_date::text),attendance_date=p_attendance_date,subject=btrim(p_subject),teacher_id=p_teacher_id,teacher_name=btrim(coalesce(p_teacher_name,'')),teacher_email=btrim(coalesce(p_teacher_email,'')),room=btrim(coalesce(p_room,'')),start_time=p_start_time,end_time=p_end_time,session_note=btrim(coalesce(p_session_note,'')),updated_by=v_uid,updated_at=clock_timestamp() where s.id=p_session_id returning * into v_row; end if;
 if v_kind='adhoc' then
  if cardinality(coalesce(p_participant_ids,'{}'::uuid[]))=0 then raise exception 'Buổi phát sinh cần ít nhất một học sinh.'; end if; if cardinality(p_participant_ids)<>(select count(distinct x) from unnest(p_participant_ids) x) then raise exception 'Danh sách có học sinh bị chọn trùng.'; end if;
  if exists(select 1 from unnest(p_participant_ids) x left join public.bes_supplemental_students st on st.id=x where st.id is null or st.active=false) then raise exception 'Danh sách có học sinh không tồn tại hoặc đã ngừng hoạt động.'; end if;
  if (select count(*) from(select distinct private.bes_supplemental_canonical_key(x) from unnest(p_participant_ids) x) q)<>cardinality(p_participant_ids) then raise exception 'Danh sách có hai hồ sơ cùng một học sinh chính thức.'; end if;
  delete from public.bes_supplemental_session_participants p where p.session_id=v_row.id;
  insert into public.bes_supplemental_session_participants(session_id,student_id,canonical_student_key,student_code_snapshot,full_name_snapshot,school_class_snapshot,updated_at) select v_row.id,st.id,private.bes_supplemental_canonical_key(st.id),st.student_code,st.full_name,st.school_class_name,clock_timestamp() from public.bes_supplemental_students st where st.id=any(p_participant_ids);
 end if; return to_jsonb(v_row); end; $$;

create or replace function public.bes_cancel_supplemental_session(p_session_id uuid,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_uid uuid:=private.bes_require_supplemental_admin(); v_row public.bes_supplemental_sessions%rowtype;
begin select * into v_row from public.bes_supplemental_sessions s where s.id=p_session_id for update; if not found then raise exception 'Không tìm thấy buổi Học bổ sung.'; end if; if v_row.status='confirmed' then raise exception 'Buổi đã chốt điểm danh không thể hủy.'; end if; if v_row.status='cancelled' then return to_jsonb(v_row); end if; update public.bes_supplemental_sessions s set status='cancelled',cancellation_reason=btrim(coalesce(p_reason,'')),updated_by=v_uid,updated_at=clock_timestamp() where s.id=p_session_id returning * into v_row; return to_jsonb(v_row); end; $$;

create or replace function public.bes_list_supplemental_attendance(p_from date default current_date,p_to date default current_date)
returns jsonb language plpgsql security definer set search_path=''
as $$ begin perform private.bes_require_supplemental_reader(array['attendance:calendar','attendance:quick','attendance:history','attendance:report']); if p_to<p_from then raise exception 'Khoảng ngày không hợp lệ.'; end if; return coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'groupId',s.group_id,'kind',s.kind,'title',s.title,'groupName',g.group_name,'attendanceDate',s.attendance_date,'subject',s.subject,'teacherId',s.teacher_id,'teacherName',s.teacher_name,'teacherEmail',s.teacher_email,'room',s.room,'startTime',to_char(s.start_time,'HH24:MI'),'endTime',to_char(s.end_time,'HH24:MI'),'timeRange',to_char(s.start_time,'HH24:MI')||'–'||to_char(s.end_time,'HH24:MI'),'status',s.status,'participantCount',(select count(*) from public.bes_supplemental_session_participants p where p.session_id=s.id),'rosterFrozenAt',s.roster_frozen_at,'sessionNote',s.session_note,'proofPath',s.proof_path) order by s.attendance_date,s.start_time,s.title) from public.bes_supplemental_sessions s left join public.bes_supplemental_groups g on g.id=s.group_id where s.attendance_date between p_from and p_to),'[]'::jsonb); end; $$;

create or replace function public.bes_begin_supplemental_attendance(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_uid uuid:=auth.uid(); v_session public.bes_supplemental_sessions%rowtype; v_access jsonb;
begin
 if v_uid is null then raise exception 'Bạn cần đăng nhập để điểm danh.'; end if;
 -- Explicitly reference the existing global quick-attendance gate; the central decision preserves Admin/report bypass behavior.
 perform public.can_take_extra_class_attendance();
 select * into v_session from public.bes_supplemental_sessions s where s.id=p_session_id for update; if not found then raise exception 'Không tìm thấy buổi Học bổ sung.'; end if; if v_session.status='cancelled' then raise exception 'Buổi Học bổ sung đã bị hủy.'; end if; if v_session.status='confirmed' then raise exception 'Buổi Học bổ sung đã chốt điểm danh.'; end if;
 v_access:=private.bes_attendance_access_decision(v_session.id,v_session.teacher_name,clock_timestamp()); if coalesce((v_access->>'allowed')::boolean,false) is not true then raise exception '%',coalesce(v_access->>'reason','attendance_not_allowed'); end if;
 if v_session.roster_frozen_at is null then
  if v_session.kind='recurring' then
   delete from public.bes_supplemental_session_participants p where p.session_id=v_session.id;
   insert into public.bes_supplemental_session_participants(session_id,student_id,canonical_student_key,student_code_snapshot,full_name_snapshot,school_class_snapshot,updated_at)
   select distinct on(private.bes_supplemental_canonical_key(st.id)) v_session.id,st.id,private.bes_supplemental_canonical_key(st.id),st.student_code,st.full_name,st.school_class_name,clock_timestamp() from public.bes_supplemental_group_memberships m join public.bes_supplemental_students st on st.id=m.student_id and st.active=true where m.group_id=v_session.group_id and m.effective_from<=v_session.attendance_date and(m.effective_until is null or m.effective_until>=v_session.attendance_date) order by private.bes_supplemental_canonical_key(st.id),st.id;
  else
   if not exists(select 1 from public.bes_supplemental_session_participants p where p.session_id=v_session.id) then raise exception 'Buổi phát sinh chưa có học sinh.'; end if;
   update public.bes_supplemental_session_participants p set canonical_student_key=private.bes_supplemental_canonical_key(st.id),student_code_snapshot=st.student_code,full_name_snapshot=st.full_name,school_class_snapshot=st.school_class_name,updated_at=clock_timestamp() from public.bes_supplemental_students st where p.session_id=v_session.id and st.id=p.student_id;
  end if;
  update public.bes_supplemental_sessions s set roster_frozen_at=clock_timestamp(),status='in_progress',total_students=(select count(*) from public.bes_supplemental_session_participants p where p.session_id=v_session.id),updated_by=v_uid,updated_at=clock_timestamp() where s.id=v_session.id returning * into v_session;
 elsif v_session.status='scheduled' then update public.bes_supplemental_sessions s set status='in_progress',updated_by=v_uid,updated_at=clock_timestamp() where s.id=v_session.id returning * into v_session; end if;
 return jsonb_build_object('session',to_jsonb(v_session),'participants',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'studentId',p.student_id,'canonicalStudentKey',p.canonical_student_key,'studentCode',p.student_code_snapshot,'fullName',p.full_name_snapshot,'schoolClassName',p.school_class_snapshot,'status',coalesce(p.attendance_status,'present'),'absenceReasonCode',p.absence_reason_code,'absenceNote',p.absence_note) order by p.full_name_snapshot) from public.bes_supplemental_session_participants p where p.session_id=v_session.id),'[]'::jsonb),'access',v_access,'serverNow',clock_timestamp());
end; $$;

create or replace function public.bes_confirm_supplemental_attendance(p_session_id uuid,p_participants jsonb,p_session_note text default '',p_proof_path text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_uid uuid:=auth.uid(); v_session public.bes_supplemental_sessions%rowtype; v_profile public.profiles%rowtype; v_access jsonb; v_expected integer; v_payload_count integer; v_present integer; v_absent integer; v_tardy integer;
begin
 if v_uid is null then raise exception 'Bạn cần đăng nhập để điểm danh.'; end if; select * into v_session from public.bes_supplemental_sessions s where s.id=p_session_id for update; if not found then raise exception 'Không tìm thấy buổi Học bổ sung.'; end if; if v_session.status='cancelled' then raise exception 'Buổi Học bổ sung đã bị hủy.'; end if; if v_session.status='confirmed' then raise exception 'Buổi Học bổ sung đã chốt điểm danh.'; end if; if v_session.roster_frozen_at is null or v_session.status<>'in_progress' then raise exception 'Hãy bắt đầu điểm danh để khóa danh sách học sinh trước.'; end if;
 v_access:=private.bes_attendance_access_decision(v_session.id,v_session.teacher_name,clock_timestamp()); if coalesce((v_access->>'allowed')::boolean,false) is not true then raise exception '%',coalesce(v_access->>'reason','attendance_not_allowed'); end if;
 if jsonb_typeof(p_participants)<>'array' then raise exception 'Dữ liệu điểm danh không hợp lệ.'; end if; select count(*) into v_expected from public.bes_supplemental_session_participants p where p.session_id=v_session.id; select count(*) into v_payload_count from jsonb_array_elements(p_participants); if v_payload_count<>v_expected then raise exception 'Dữ liệu điểm danh phải có đúng toàn bộ học sinh của danh sách đã khóa.'; end if;
 if(select count(distinct x->>'participantId') from jsonb_array_elements(p_participants) x)<>v_expected then raise exception 'Mỗi học sinh chỉ được gửi một trạng thái điểm danh.'; end if;
 if exists(select 1 from jsonb_array_elements(p_participants) x left join public.bes_supplemental_session_participants p on p.id::text=x->>'participantId' and p.session_id=v_session.id where p.id is null or coalesce(x->>'status','') not in('present','absent','tardy')) then raise exception 'Danh sách hoặc trạng thái điểm danh không hợp lệ.'; end if;
 update public.bes_supplemental_session_participants p set attendance_status=x.status,absence_reason_code=case when x.status='absent' then x.absence_reason_code else '' end,absence_note=case when x.status='absent' then x.absence_note else '' end,recorded_at=clock_timestamp(),updated_at=clock_timestamp()
 from(select(j->>'participantId')::uuid participant_id,j->>'status' status,coalesce(j->>'absenceReasonCode','') absence_reason_code,coalesce(j->>'absenceNote','') absence_note from jsonb_array_elements(p_participants) j) x where p.id=x.participant_id and p.session_id=v_session.id;
 select count(*) filter(where p.attendance_status='present'),count(*) filter(where p.attendance_status='absent'),count(*) filter(where p.attendance_status='tardy') into v_present,v_absent,v_tardy from public.bes_supplemental_session_participants p where p.session_id=v_session.id;
 if coalesce(v_present,0)+coalesce(v_absent,0)+coalesce(v_tardy,0)<>v_expected then raise exception 'Chưa có trạng thái hợp lệ cho toàn bộ học sinh.'; end if;
 select * into v_profile from public.profiles p where p.id=v_uid; update public.bes_supplemental_sessions s set status='confirmed',attendance_confirmed_at=clock_timestamp(),checked_by=v_uid,checked_by_name=coalesce(v_profile.full_name,v_profile.email,''),session_note=btrim(coalesce(p_session_note,'')),proof_path=btrim(coalesce(p_proof_path,'')),total_students=v_expected,present_count=coalesce(v_present,0),absent_count=coalesce(v_absent,0),tardy_count=coalesce(v_tardy,0),updated_by=v_uid,updated_at=clock_timestamp() where s.id=v_session.id returning * into v_session;
 return jsonb_build_object('session',to_jsonb(v_session),'participants',coalesce((select jsonb_agg(to_jsonb(p) order by p.full_name_snapshot) from public.bes_supplemental_session_participants p where p.session_id=v_session.id),'[]'::jsonb),'serverNow',clock_timestamp());
end; $$;

create or replace function public.bes_list_supplemental_history(p_from date default(current_date-31),p_to date default current_date,p_query text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_q text:=lower(btrim(coalesce(p_query,'')));
begin perform private.bes_require_supplemental_reader(array['attendance:history','attendance:report']); return coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'activityType','supplemental','kind',s.kind,'title',s.title,'groupName',g.group_name,'date',s.attendance_date,'subject',s.subject,'teacherName',s.teacher_name,'room',s.room,'timeRange',to_char(s.start_time,'HH24:MI')||'–'||to_char(s.end_time,'HH24:MI'),'status',s.status,'cancellationReason',s.cancellation_reason,'totalStudents',s.total_students,'presentCount',s.present_count,'absentCount',s.absent_count,'tardyCount',s.tardy_count,'checkedByName',s.checked_by_name,'sessionNote',s.session_note,'proofPath',s.proof_path,'participants',coalesce((select jsonb_agg(jsonb_build_object('studentId',p.student_id,'canonicalStudentKey',p.canonical_student_key,'studentCode',p.student_code_snapshot,'fullName',p.full_name_snapshot,'schoolClassName',p.school_class_snapshot,'status',p.attendance_status,'absenceReasonCode',p.absence_reason_code,'absenceNote',p.absence_note) order by p.full_name_snapshot) from public.bes_supplemental_session_participants p where p.session_id=s.id),'[]'::jsonb)) order by s.attendance_date desc,s.start_time desc) from public.bes_supplemental_sessions s left join public.bes_supplemental_groups g on g.id=s.group_id where s.attendance_date between p_from and p_to and s.status in('confirmed','cancelled') and(v_q='' or lower(s.title) like '%'||v_q||'%' or lower(s.subject) like '%'||v_q||'%' or lower(s.teacher_name) like '%'||v_q||'%' or lower(coalesce(g.group_name,'')) like '%'||v_q||'%' or exists(select 1 from public.bes_supplemental_session_participants p where p.session_id=s.id and lower(p.full_name_snapshot) like '%'||v_q||'%'))),'[]'::jsonb); end; $$;

create or replace function public.bes_supplemental_student_report(p_from date default(current_date-365),p_to date default current_date,p_student_key text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$ begin perform private.bes_require_supplemental_reader(array['attendance:report']); return coalesce((with report_rows as(
 select case when nullif(btrim(st.linked_official_key),'') is not null then 'official:'||lower(btrim(st.linked_official_key)) when st.source_type='official' and nullif(btrim(st.official_key),'') is not null then 'official:'||lower(btrim(st.official_key)) else p.canonical_student_key end canonical_key,p.student_code_snapshot,p.full_name_snapshot,p.school_class_snapshot,p.attendance_status,s.id session_id,s.attendance_date,s.subject
 from public.bes_supplemental_session_participants p join public.bes_supplemental_sessions s on s.id=p.session_id and s.status='confirmed' left join public.bes_supplemental_students st on st.id=p.student_id where s.attendance_date between p_from and p_to), grouped as(
 select r.canonical_key,(array_agg(r.student_code_snapshot order by r.attendance_date desc))[1] student_code,(array_agg(r.full_name_snapshot order by r.attendance_date desc))[1] full_name,(array_agg(r.school_class_snapshot order by r.attendance_date desc))[1] school_class_name,count(distinct r.session_id) eligible_session_count,count(*) filter(where r.attendance_status='present') present_count,count(*) filter(where r.attendance_status='absent') absent_count,count(*) filter(where r.attendance_status='tardy') tardy_count,min(r.attendance_date) first_date,max(r.attendance_date) last_date,array_agg(distinct r.subject order by r.subject) subjects from report_rows r where p_student_key is null or r.canonical_key=p_student_key group by r.canonical_key)
 select jsonb_agg(jsonb_build_object('canonicalStudentKey',g.canonical_key,'studentCode',g.student_code,'fullName',g.full_name,'schoolClassName',g.school_class_name,'subjects',to_jsonb(g.subjects),'eligibleSessionCount',g.eligible_session_count,'presentCount',g.present_count,'absentCount',g.absent_count,'tardyCount',g.tardy_count,'attendanceRate',case when g.eligible_session_count=0 then 0 else round(((g.present_count+g.tardy_count)::numeric*100)/g.eligible_session_count,1) end,'firstDate',g.first_date,'lastDate',g.last_date) order by g.school_class_name,g.full_name) from grouped g),'[]'::jsonb); end; $$;

create or replace function public.bes_list_attendance_activities(p_from date default current_date,p_to date default current_date,p_activity_type text default 'all')
returns jsonb language plpgsql security definer set search_path=''
as $$ declare v_type text:=lower(btrim(coalesce(p_activity_type,'all')));
begin perform private.bes_require_supplemental_reader(array['attendance:calendar','attendance:history','attendance:report']); if v_type not in('all','remedial','enrichment','supplemental') then raise exception 'Loại hoạt động không hợp lệ.'; end if; return coalesce((with activities as(
 select x.id::text id,'extra'::text source,case when x.class_type='enrichment' then 'enrichment' else 'remedial' end activity_type,x.class_name title,x.subject,x.teacher_name,x.attendance_date,x.teaching_time_range time_range,x.teaching_room room,x.total_students participant_count,x.session_status status,null::text supplemental_kind from public.bes_extra_attendance_sessions x where x.attendance_date between p_from and p_to
 union all select s.id::text,'supplemental','supplemental',s.title,s.subject,s.teacher_name,s.attendance_date,to_char(s.start_time,'HH24:MI')||'–'||to_char(s.end_time,'HH24:MI'),s.room,(select count(*) from public.bes_supplemental_session_participants p where p.session_id=s.id)::integer,s.status,s.kind from public.bes_supplemental_sessions s where s.attendance_date between p_from and p_to)
 select jsonb_agg(jsonb_build_object('id',a.id,'source',a.source,'activityType',a.activity_type,'title',a.title,'subject',a.subject,'teacherName',a.teacher_name,'date',a.attendance_date,'timeRange',a.time_range,'room',a.room,'participantCount',a.participant_count,'status',a.status,'supplementalKind',a.supplemental_kind) order by a.attendance_date,a.time_range,a.title) from activities a where v_type='all' or a.activity_type=v_type),'[]'::jsonb); end; $$;

revoke all on function private.bes_require_supplemental_admin() from public;
revoke all on function private.bes_require_supplemental_reader(text[]) from public;
revoke all on function private.bes_supplemental_canonical_key(uuid) from public;
revoke all on function private.bes_supplemental_official_candidates() from public;
revoke all on function private.bes_materialize_supplemental_group_sessions(uuid) from public;
revoke all on function private.bes_attendance_access_decision(uuid,text,timestamptz) from public;
grant execute on function private.bes_attendance_access_decision(uuid,text,timestamptz) to authenticated;

revoke all on function public.bes_list_supplemental_admin_data() from public,anon;
revoke all on function public.bes_upsert_supplemental_student(uuid,text,text,text,text,text,boolean) from public,anon;
revoke all on function public.bes_link_supplemental_student(uuid,text) from public,anon;
revoke all on function public.bes_upsert_supplemental_group(uuid,text,text,text,uuid,text,text,text,date,date,smallint[],time,time,boolean) from public,anon;
revoke all on function public.bes_set_supplemental_membership(uuid,uuid,uuid,date,date,text) from public,anon;
revoke all on function public.bes_upsert_supplemental_session(uuid,uuid,text,text,date,text,uuid,text,text,text,time,time,uuid[],text) from public,anon;
revoke all on function public.bes_cancel_supplemental_session(uuid,text) from public,anon;
revoke all on function public.bes_list_supplemental_attendance(date,date) from public,anon;
revoke all on function public.bes_begin_supplemental_attendance(uuid) from public,anon;
revoke all on function public.bes_confirm_supplemental_attendance(uuid,jsonb,text,text) from public,anon;
revoke all on function public.bes_list_supplemental_history(date,date,text) from public,anon;
revoke all on function public.bes_supplemental_student_report(date,date,text) from public,anon;
revoke all on function public.bes_list_attendance_activities(date,date,text) from public,anon;
grant execute on function public.bes_list_supplemental_admin_data() to authenticated;
grant execute on function public.bes_upsert_supplemental_student(uuid,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.bes_link_supplemental_student(uuid,text) to authenticated;
grant execute on function public.bes_upsert_supplemental_group(uuid,text,text,text,uuid,text,text,text,date,date,smallint[],time,time,boolean) to authenticated;
grant execute on function public.bes_set_supplemental_membership(uuid,uuid,uuid,date,date,text) to authenticated;
grant execute on function public.bes_upsert_supplemental_session(uuid,uuid,text,text,date,text,uuid,text,text,text,time,time,uuid[],text) to authenticated;
grant execute on function public.bes_cancel_supplemental_session(uuid,text) to authenticated;
grant execute on function public.bes_list_supplemental_attendance(date,date) to authenticated;
grant execute on function public.bes_begin_supplemental_attendance(uuid) to authenticated;
grant execute on function public.bes_confirm_supplemental_attendance(uuid,jsonb,text,text) to authenticated;
grant execute on function public.bes_list_supplemental_history(date,date,text) to authenticated;
grant execute on function public.bes_supplemental_student_report(date,date,text) to authenticated;
grant execute on function public.bes_list_attendance_activities(date,date,text) to authenticated;
