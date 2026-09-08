-- 2026-09-08: grade 10-12 gifted classes + multi-teacher assignments + safe deletion.
-- Safe to re-run.
-- EXPECTED_SEEDED_CLASSES = 23
-- EXPECTED_SEEDED_MEMBERS = 154
-- EXPECTED_SEEDED_TEACHERS = 52

alter table public.bes_extra_classes
  add column if not exists source_key text,
  add column if not exists school_year text not null default '',
  add column if not exists grade_level text not null default '',
  add column if not exists expected_student_count integer,
  add column if not exists periods_per_week integer,
  add column if not exists room text not null default '',
  add column if not exists weekdays text not null default '',
  add column if not exists time_range text not null default '';

create unique index if not exists bes_extra_classes_source_key_uidx
  on public.bes_extra_classes (source_key);

alter table public.bes_extra_class_members
  add column if not exists source_key text;

create unique index if not exists bes_extra_class_members_source_key_uidx
  on public.bes_extra_class_members (source_key);

create table if not exists public.bes_extra_class_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.bes_extra_classes(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text not null,
  teacher_email text not null default '',
  position integer not null default 1 check (position > 0),
  source_key text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bes_extra_class_teachers_source_key_uidx
  on public.bes_extra_class_teachers (source_key);
create index if not exists bes_extra_class_teachers_class_idx
  on public.bes_extra_class_teachers (class_id, position, teacher_name);

alter table public.bes_extra_class_teachers enable row level security;
drop policy if exists "Extra attendance Admins read class teachers" on public.bes_extra_class_teachers;
create policy "Extra attendance Admins read class teachers"
  on public.bes_extra_class_teachers for select
  using (public.can_manage_extra_class_attendance());
grant select on public.bes_extra_class_teachers to authenticated;

create or replace function public.bes_delete_extra_attendance_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.bes_extra_attendance_sessions%rowtype;
  v_record_count integer := 0;
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền xóa điểm danh đã duyệt.' using errcode = '42501';
  end if;

  select * into v_session
  from public.bes_extra_attendance_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Không tìm thấy buổi điểm danh cần xóa.' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_record_count
  from public.bes_extra_attendance_records
  where session_id = p_session_id;

  delete from public.bes_extra_attendance_sessions where id = p_session_id;

  return jsonb_build_object(
    'session_id', v_session.id,
    'class_id', v_session.class_id,
    'class_name', v_session.class_name,
    'checked_at', v_session.checked_at,
    'deleted_records', v_record_count
  );
end;
$$;

create or replace function public.bes_delete_extra_class(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.bes_extra_classes%rowtype;
  v_session_count integer := 0;
  v_member_count integer := 0;
  v_teacher_count integer := 0;
begin
  if not public.can_manage_extra_class_attendance() then
    raise exception 'Bạn không có quyền xóa lớp phụ đạo/bồi dưỡng.' using errcode = '42501';
  end if;

  select * into v_class
  from public.bes_extra_classes
  where id = p_class_id
  for update;

  if not found then
    raise exception 'Không tìm thấy lớp cần xóa.' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_session_count from public.bes_extra_attendance_sessions where class_id = p_class_id;
  select count(*)::integer into v_member_count from public.bes_extra_class_members where class_id = p_class_id;
  select count(*)::integer into v_teacher_count from public.bes_extra_class_teachers where class_id = p_class_id;

  delete from public.bes_extra_attendance_sessions where class_id = p_class_id;
  delete from public.bes_extra_class_members where class_id = p_class_id;
  delete from public.bes_extra_class_teachers where class_id = p_class_id;
  delete from public.bes_extra_classes where id = p_class_id;

  return jsonb_build_object(
    'class_id', v_class.id,
    'class_name', v_class.class_name,
    'deleted_sessions', v_session_count,
    'deleted_members', v_member_count,
    'deleted_teachers', v_teacher_count
  );
end;
$$;

revoke all on function public.bes_delete_extra_attendance_session(uuid) from public;
revoke all on function public.bes_delete_extra_class(uuid) from public;
grant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;
grant execute on function public.bes_delete_extra_class(uuid) to authenticated;

do $seed$
declare
  v_actor uuid;
  v_line text;
  v_parts text[];
  v_class_id uuid;
  v_teacher_id uuid;
  v_teacher_email text;
  v_count integer;
begin
  select p.id into v_actor
  from public.profiles p
  where p.approved = true
    and lower(coalesce(p.role, '')) in ('admin', 'administrator')
  order by p.created_at nulls last, p.id
  limit 1;

  if v_actor is null then
    raise exception 'Không tìm thấy tài khoản admin đã duyệt để ghi nhận dữ liệu lớp bồi dưỡng.';
  end if;

  foreach v_line in array string_to_array($classes$
hsg-2026-toan-10	Bồi dưỡng Toán 10	Toán	10	4	4	A303	3,5	16h45 đến 18h15	Võ Thị Thanh Huyền
hsg-2026-toan-11	Bồi dưỡng Toán 11	Toán	11	6	4	B.203	2,3	16h45 đến 18h15	Phạm Vũ Xuân Hằng
hsg-2026-toan-12	Bồi dưỡng Toán 12	Toán	12	2	4	A402	2,5	16h45 đến 18h15	Trần Nguyên Dự
hsg-2026-toan-12-casio	Bồi dưỡng Toán 12 - Casio	Toán/Casio	12	2	4	B205	3,6	16h45 đến 18h15	Trần Trọng Tiên
hsg-2026-ngu-van-10	Bồi dưỡng Ngữ văn 10	Ngữ văn	10	15	4	A201	4,6	16h45 đến 18h15	Nguyễn Võ Hữu Được
hsg-2026-ngu-van-11	Bồi dưỡng Ngữ văn 11	Ngữ văn	11	6	4	A201	2,6	16h45 đến 18h15	Văn Thị Bích Liên
hsg-2026-ngu-van-12	Bồi dưỡng Ngữ văn 12	Ngữ văn	12	6	4	A401	3,5	16h45 đến 18h15	Lê Thị Hà
hsg-2026-vat-li-10	Bồi dưỡng Vật lí 10	Vật lí	10	8	2	A104	5	16h45 đến 18h15	Trương Thị Thanh Tuyền
hsg-2026-vat-li-11	Bồi dưỡng Vật lí 11	Vật lí	11	5	4	B205	5,6	16h45 đến 18h15	Trương Thị Thanh Tuyền
hsg-2026-vat-li-12	Bồi dưỡng Vật lí 12	Vật lí	12	10	4	A306	5,6	16h45 đến 18h15	Trương Thị Thanh Tuyền
hsg-2026-hoa-hoc-10	Bồi dưỡng Hóa học 10	Hóa học	10	7	2	A204	6	16h45 đến 18h15	Nguyễn Minh Tiến
hsg-2026-hoa-hoc-11	Bồi dưỡng Hóa học 11	Hóa học	11	5	4	B206	2,6	16h45 đến 18h15	Nguyễn Minh Tiến
hsg-2026-hoa-hoc-12	Bồi dưỡng Hóa học 12	Hóa học	12	9	4	A305	2,6	16h45 đến 18h15	Nguyễn Minh Tiến
hsg-2026-sinh-hoc-10	Bồi dưỡng Sinh học 10	Sinh học	10	3	2	A206	3	16h45 đến 18h15	Nguyễn Thị Ninh
hsg-2026-sinh-hoc-12	Bồi dưỡng Sinh học 12	Sinh học	12	6	4	A304	3,5	16h45 đến 18h15	Nguyễn Thị Ninh
hsg-2026-tieng-anh-10	Bồi dưỡng Tiếng Anh 10	Tiếng Anh	10	16	4	A201	2,3	16h45 đến 18h15	Ngô Thị Mỹ Diệp
hsg-2026-tieng-anh-11	Bồi dưỡng Tiếng Anh 11	Tiếng Anh	11	10	4	A202	3,6	16h45 đến 18h15	Nguyễn Đặng Minh Hoa
hsg-2026-tieng-anh-12	Bồi dưỡng Tiếng Anh 12	Tiếng Anh	12	7	4	A404	2,3	16h45 đến 18h15	Phạm Thị Ngọc Châm
hsg-2026-lich-su-10	Bồi dưỡng Lịch sử 10	Lịch sử	10	6	4	A405	5,6	16h45 đến 18h15	Nguyễn Thị Hà
hsg-2026-lich-su-11	Bồi dưỡng Lịch sử 11	Lịch sử	11	5	4	A302	3,5	16h45 đến 18h15	Nguyễn Thị Hà
hsg-2026-lich-su-12	Bồi dưỡng Lịch sử 12	Lịch sử	12	6	4	A405	3,5	16h35 đến 18h05	Nguyễn Thị Hà
hsg-2026-dia-li-11	Bồi dưỡng Địa lí 11	Địa lí	11	3	4	A.406	2,6	16h45 đến 18h15	Lê Văn Hôn
hsg-2026-dia-li-12	Bồi dưỡng Địa lí 12	Địa lí	12	5	4	A.406	2,6	16h45 đến 18h15	Lê Văn Hôn
$classes$, E'\n')
  loop
    v_parts := string_to_array(v_line, E'\t');
    v_teacher_id := null;
    v_teacher_email := null;

    select p.id, coalesce(p.email, '')
      into v_teacher_id, v_teacher_email
    from public.profiles p
    where p.approved = true
      and lower(trim(coalesce(p.full_name, ''))) = lower(trim(v_parts[10]))
    order by p.id
    limit 1;

    insert into public.bes_extra_classes (
      class_type, class_name, subject, teacher_id, teacher_name, teacher_email,
      active, created_by, updated_by, source_key, school_year, grade_level,
      expected_student_count, periods_per_week, room, weekdays, time_range,
      created_at, updated_at
    ) values (
      'gifted', v_parts[2], v_parts[3], v_teacher_id, v_parts[10], coalesce(v_teacher_email, ''),
      true, v_actor, v_actor, v_parts[1], '2026-2027', v_parts[4],
      v_parts[5]::integer, v_parts[6]::integer, v_parts[7], v_parts[8], v_parts[9],
      now(), now()
    )
    on conflict (source_key) do update set
      class_type = excluded.class_type,
      class_name = excluded.class_name,
      subject = excluded.subject,
      teacher_id = excluded.teacher_id,
      teacher_name = excluded.teacher_name,
      teacher_email = excluded.teacher_email,
      active = true,
      updated_by = excluded.updated_by,
      school_year = excluded.school_year,
      grade_level = excluded.grade_level,
      expected_student_count = excluded.expected_student_count,
      periods_per_week = excluded.periods_per_week,
      room = excluded.room,
      weekdays = excluded.weekdays,
      time_range = excluded.time_range,
      updated_at = now();
  end loop;

  foreach v_line in array string_to_array($teachers$
hsg-2026-toan-10	1	Võ Thị Thanh Huyền
hsg-2026-toan-11	1	Phạm Vũ Xuân Hằng
hsg-2026-toan-12	1	Trần Nguyên Dự
hsg-2026-toan-12	2	Nguyễn Văn Minh
hsg-2026-toan-12-casio	1	Trần Trọng Tiên
hsg-2026-toan-12-casio	2	Nguyễn Đình Dương
hsg-2026-ngu-van-10	1	Nguyễn Võ Hữu Được
hsg-2026-ngu-van-10	2	Bùi Thị Thương
hsg-2026-ngu-van-10	3	Văn Thị Bích Liên
hsg-2026-ngu-van-11	1	Văn Thị Bích Liên
hsg-2026-ngu-van-11	2	Lê Thị Hà
hsg-2026-ngu-van-11	3	Cao Thị Hương
hsg-2026-ngu-van-12	1	Lê Thị Hà
hsg-2026-ngu-van-12	2	Bùi Thị Thương
hsg-2026-ngu-van-12	3	Cao Thị Hương
hsg-2026-vat-li-10	1	Trương Thị Thanh Tuyền
hsg-2026-vat-li-10	2	Nguyễn Hoàng Thúy Vy
hsg-2026-vat-li-10	3	Lê Thị Tú
hsg-2026-vat-li-10	4	Lê Thị Mỹ Thẩm
hsg-2026-vat-li-11	1	Trương Thị Thanh Tuyền
hsg-2026-vat-li-11	2	Nguyễn Hoàng Thúy Vy
hsg-2026-vat-li-11	3	Lê Thị Tú
hsg-2026-vat-li-11	4	Lê Thị Mỹ Thẩm
hsg-2026-vat-li-12	1	Trương Thị Thanh Tuyền
hsg-2026-vat-li-12	2	Nguyễn Hoàng Thúy Vy
hsg-2026-vat-li-12	3	Lê Thị Tú
hsg-2026-vat-li-12	4	Lê Thị Mỹ Thẩm
hsg-2026-hoa-hoc-10	1	Nguyễn Minh Tiến
hsg-2026-hoa-hoc-10	2	Trần Thị Bảo Quỳnh
hsg-2026-hoa-hoc-10	3	Nguyễn Thị Bích Ngọc
hsg-2026-hoa-hoc-11	1	Nguyễn Minh Tiến
hsg-2026-hoa-hoc-11	2	Trần Thị Bảo Quỳnh
hsg-2026-hoa-hoc-11	3	Nguyễn Thị Bích Ngọc
hsg-2026-hoa-hoc-11	4	Lê Thị Hồng Mai
hsg-2026-hoa-hoc-12	1	Nguyễn Minh Tiến
hsg-2026-hoa-hoc-12	2	Lê Thị Hồng Mai
hsg-2026-sinh-hoc-10	1	Nguyễn Thị Ninh
hsg-2026-sinh-hoc-10	2	Nguyễn Thị Minh Phượng
hsg-2026-sinh-hoc-12	1	Nguyễn Thị Ninh
hsg-2026-sinh-hoc-12	2	Nguyễn Thị Minh Phượng
hsg-2026-tieng-anh-10	1	Ngô Thị Mỹ Diệp
hsg-2026-tieng-anh-10	2	Nguyễn Thị Mỹ Duyên
hsg-2026-tieng-anh-11	1	Nguyễn Đặng Minh Hoa
hsg-2026-tieng-anh-11	2	Đào Ngọc Nhã
hsg-2026-tieng-anh-12	1	Phạm Thị Ngọc Châm
hsg-2026-lich-su-10	1	Nguyễn Thị Hà
hsg-2026-lich-su-10	2	Đoàn Thị Thành Hằng
hsg-2026-lich-su-11	1	Nguyễn Thị Hà
hsg-2026-lich-su-11	2	Đoàn Thị Thanh Hằng
hsg-2026-lich-su-12	1	Nguyễn Thị Hà
hsg-2026-dia-li-11	1	Lê Văn Hôn
hsg-2026-dia-li-12	1	Lê Văn Hôn
$teachers$, E'\n')
  loop
    v_parts := string_to_array(v_line, E'\t');
    select c.id into v_class_id from public.bes_extra_classes c where c.source_key = v_parts[1];

    v_teacher_id := null;
    v_teacher_email := null;
    select p.id, coalesce(p.email, '')
      into v_teacher_id, v_teacher_email
    from public.profiles p
    where p.approved = true
      and lower(trim(coalesce(p.full_name, ''))) = lower(trim(v_parts[3]))
    order by p.id
    limit 1;

    insert into public.bes_extra_class_teachers (
      class_id, teacher_id, teacher_name, teacher_email, position,
      source_key, created_by, updated_by, created_at, updated_at
    ) values (
      v_class_id, v_teacher_id, v_parts[3], coalesce(v_teacher_email, ''), v_parts[2]::integer,
      v_parts[1] || '::teacher::' || lpad(v_parts[2], 2, '0'),
      v_actor, v_actor, now(), now()
    )
    on conflict (source_key) do update set
      class_id = excluded.class_id,
      teacher_id = excluded.teacher_id,
      teacher_name = excluded.teacher_name,
      teacher_email = excluded.teacher_email,
      position = excluded.position,
      updated_by = excluded.updated_by,
      updated_at = now();
  end loop;

  foreach v_line in array string_to_array($members$
hsg-2026-toan-10	identity:do-hoang-an-10-7	Đỗ Hoàng An	10.7
hsg-2026-toan-10	identity:nguyen-pham-xuan-phuoc-10-7	Nguyễn Phạm Xuân Phước	10.7
hsg-2026-toan-10	identity:duong-tran-song-an-10-3	Dương Trần song An	10.3
hsg-2026-toan-10	identity:pham-ngoc-que-lam-10-3	Phạm Ngọc Quế Lâm	10.3
hsg-2026-toan-10	identity:than-ha-tuan-khang-10-12	Thân Hà Tuấn Khang	10.12
hsg-2026-toan-10	identity:doan-vo-tien-thanh-10-12	Đoàn Võ Tiến Thành	10.12
hsg-2026-toan-10	identity:nguyen-vo-thuy-duong-10-6	Nguyễn Võ Thùy Dương	10.6
hsg-2026-toan-10	identity:le-thanh-tung-10-6	Lê Thanh Tùng	10.6
hsg-2026-toan-11	identity:nguyen-hong-ngoc-hien-11-2	Nguyễn Hồng Ngọc Hiền	11.2
hsg-2026-toan-11	identity:tran-nguyen-phuc-an-11-3	Trần Nguyễn Phúc An	11.3
hsg-2026-toan-11	identity:nguyen-hoang-long-11-3	Nguyễn Hoàng Long	11.3
hsg-2026-toan-11	identity:nguyen-van-nhat-hoang-11-3	Nguyễn Văn Nhật Hoàng	11.3
hsg-2026-toan-11	identity:pham-thai-quoc-11-3	Phạm Thái Quốc	11.3
hsg-2026-toan-11	identity:luong-khanh-thy-11-3	Lương Khánh Thy	11.3
hsg-2026-toan-12	identity:phan-huynh-khoi-nguyen-12-4	Phan Huỳnh Khôi Nguyên	12.4
hsg-2026-toan-12	identity:nguyen-gia-huy-12-5	Nguyễn Gia Huy	12.5
hsg-2026-toan-12-casio	identity:tran-minh-nhut-12-2	Trần Minh Nhựt	12.2
hsg-2026-toan-12-casio	identity:tran-tuan-anh-12-6	Trần Tuấn Anh	12.6
hsg-2026-toan-12-casio	identity:nguyen-hoang-minh-khang-12-6	Nguyễn Hoàng Minh Khang	12.6
hsg-2026-hoa-hoc-10	identity:phung-hinh-nghi-10-2	Phùng Hinh Nghi	10.2
hsg-2026-hoa-hoc-10	identity:nguyen-tu-hieu-thao-10-2	Nguyễn Từ Hiếu Thảo	10.2
hsg-2026-hoa-hoc-10	identity:ngo-anh-thu-10-1	Ngô Anh Thư	10.1
hsg-2026-hoa-hoc-10	identity:nguyen-doan-phuoc-duyen-10-6	Nguyễn Đoàn Phước Duyên	10.6
hsg-2026-hoa-hoc-10	identity:do-nhat-gia-han-10-7	Đỗ Nhật Gia Hân	10.7
hsg-2026-hoa-hoc-10	identity:roan-ngoc-diep-10-7	Roãn Ngọc Diệp	10.7
hsg-2026-hoa-hoc-10	identity:pham-maika-10-11	Phạm Maika	10.11
hsg-2026-hoa-hoc-11	identity:le-nguyen-thuy-duong-11-1	Lê Nguyễn Thùy Dương	11.1
hsg-2026-hoa-hoc-11	identity:tran-vu-huy-11-2	Trần Vũ Huy	11.2
hsg-2026-hoa-hoc-11	identity:dang-nhu-my-ngoc-11-2	Đặng Như Mỹ Ngọc	11.2
hsg-2026-hoa-hoc-11	identity:phung-ngoc-binh-an-11-2	Phùng Ngọc Bình An	11.2
hsg-2026-hoa-hoc-11	identity:truong-quynh-lam-11-1	Trương Quỳnh Lam	11.1
hsg-2026-hoa-hoc-12	identity:do-thien-thanh-12-2	Đỗ Thiên Thanh	12.2
hsg-2026-hoa-hoc-12	identity:nguyen-minh-thuy-12-1	Nguyễn Minh Thùy	12.1
hsg-2026-hoa-hoc-12	identity:truong-quoc-dat-12-1	Trương Quốc Đạt	12.1
hsg-2026-hoa-hoc-12	identity:nguyen-tran-tran-12-3	Nguyễn Trân Trân	12.3
hsg-2026-hoa-hoc-12	identity:le-nguyen-nhu-y-12-2	Lê Nguyễn Như Ý	12.2
hsg-2026-hoa-hoc-12	identity:ngo-minh-huy-12-2	Ngô Minh Huy	12.2
hsg-2026-hoa-hoc-12	identity:ly-minh-hieu-12-2	Lý Minh Hiếu	12.2
hsg-2026-hoa-hoc-12	identity:ta-quoc-thai-12-3	Tạ Quốc Thái	12.3
hsg-2026-hoa-hoc-12	identity:nguyen-ngoc-nhu-y-12-2	Nguyễn Ngọc Như Ý	12.2
hsg-2026-sinh-hoc-10	identity:le-kim-minh-tri-10-7	Lê Kim Minh Trí	10.7
hsg-2026-sinh-hoc-10	identity:than-ha-tuan-khang-10-12	Thân Hà Tuấn Khang	10.12
hsg-2026-sinh-hoc-10	identity:nguyen-nu-anh-thu-10-12	Nguyễn Nữ Anh Thư	10.12
hsg-2026-sinh-hoc-12	identity:nguyen-minh-khoa-12-1	Nguyễn Minh Khoa	12.1
hsg-2026-sinh-hoc-12	identity:nguyen-ngoc-hong-anh-12-1	Nguyễn Ngọc Hồng Ánh	12.1
hsg-2026-sinh-hoc-12	identity:nguyen-anh-khoa-12-1	Nguyễn Anh Khoa	12.1
hsg-2026-sinh-hoc-12	identity:dinh-thi-hanh-nguyen-12-1	Đinh Thị Hạnh Nguyên	12.1
hsg-2026-sinh-hoc-12	identity:le-xuan-hung-12-1	Lê Xuân Hùng	12.1
hsg-2026-sinh-hoc-12	identity:huynh-kien-hau-12-1	Huỳnh Kiến Hậu	12.1
hsg-2026-vat-li-10	identity:tran-gia-hao-10-12	Trần Gia Hào	10.12
hsg-2026-vat-li-10	identity:nguyen-tan-dat-10-12	Nguyễn Tấn Đạt	10.12
hsg-2026-vat-li-10	identity:doan-vo-tien-thanh-10-12	Đoàn Võ Tiến Thành	10.12
hsg-2026-vat-li-10	identity:nguyen-cong-thanh-duy-10-7	Nguyễn Công Thanh Duy	10.7
hsg-2026-vat-li-10	identity:le-thanh-phuong-nghi-10-7	Lê Thành Phương Nghi	10.7
hsg-2026-vat-li-10	identity:quach-gia-han-10-7	Quách Gia Hân	10.7
hsg-2026-vat-li-10	identity:van-nhan-10-7	Văn Nhân	10.7
hsg-2026-vat-li-11	identity:truong-bao-anh-11-1	Trương Bảo Anh	11.1
hsg-2026-vat-li-11	identity:truong-nhat-anh-11-1	Trương Nhật Anh	11.1
hsg-2026-vat-li-11	identity:nguyen-huy-phat-11-1	Nguyễn Huy Phát	11.1
hsg-2026-vat-li-11	identity:tran-bao-uyen-11-3	Trần Bảo Uyên	11.3
hsg-2026-vat-li-11	identity:bui-nguyen-minh-anh-11-3	Bùi Nguyễn Minh Anh	11.3
hsg-2026-vat-li-11	identity:mai-thanh-phuong-11-2	Mai Thanh Phương	11.2
hsg-2026-vat-li-12	identity:nguyen-ngoc-hoang-chau-12-3	Nguyễn Ngọc Hoàng Châu	12.3
hsg-2026-vat-li-12	identity:le-phuong-nha-quan-12-4	Lê Phương Nhã Quân	12.4
hsg-2026-vat-li-12	identity:nguyen-vo-anh-khoa-12-4	Nguyễn Võ Anh Khoa	12.4
hsg-2026-vat-li-12	identity:tran-minh-hang-12-5	Trần Minh Hằng	12.5
hsg-2026-vat-li-12	identity:nguyen-hoang-gia-bao-12-3	Nguyễn Hoàng Gia Bảo	12.3
hsg-2026-vat-li-12	identity:nguyen-phan-thanh-phu-12-3	Nguyễn Phan Thanh Phú	12.3
hsg-2026-vat-li-12	identity:nguyen-dinh-thi-12-3	Nguyễn Đình Thi	12.3
hsg-2026-vat-li-12	identity:tran-minh-dang-12-3	Trần Minh Đăng	12.3
hsg-2026-vat-li-12	identity:nguyen-tan-viet-han-12-5	Nguyễn Tân Việt Hàn	12.5
hsg-2026-vat-li-12	identity:tran-le-quang-12-4	Trần Lê Quang	12.4
hsg-2026-ngu-van-10	identity:tran-le-thien-phu-10-3	Trần Lê Thiên Phú	10.3
hsg-2026-ngu-van-10	identity:pham-bao-han-10-1	Phạm Bảo Hân	10.1
hsg-2026-ngu-van-10	identity:vo-thuy-nhien-10-1	Võ Thuỳ Nhiên	10.1
hsg-2026-ngu-van-10	identity:vu-tam-nhu-10-1	Vũ Tâm Như	10.1
hsg-2026-ngu-van-10	identity:tran-tue-lam-10-8	Trần Tuệ Lâm	10.8
hsg-2026-ngu-van-10	identity:tran-ngoc-nhu-tuyet-10-7	Trần Ngọc Như Tuyết	10.7
hsg-2026-ngu-van-10	identity:pham-trong-gia-han-10-12	Phạm Trọng Gia Hân	10.12
hsg-2026-ngu-van-10	identity:tran-nguyen-hoang-mai-10-12	Trần Nguyễn Hoàng Mai	10.12
hsg-2026-ngu-van-10	identity:nguyen-thanh-mai-10-12	Nguyễn Thanh Mai	10.12
hsg-2026-ngu-van-10	identity:doan-bao-han-10-12	Đoàn Bảo Hân	10.12
hsg-2026-ngu-van-10	identity:nguyen-phan-minh-anh-10-11	Nguyễn Phan Minh Anh	10.11
hsg-2026-ngu-van-10	identity:pham-maika-10-11	Phạm Maika	10.11
hsg-2026-ngu-van-10	identity:tu-thien-di-10-5	Từ Thiên Di	10.5
hsg-2026-ngu-van-10	identity:nguyen-le-tram-anh-10-2	Nguyễn Lê Trâm Anh	10.2
hsg-2026-ngu-van-10	identity:le-hoang-gia-han-10-2	Lê Hoàng Gia Hân	10.2
hsg-2026-ngu-van-10	identity:dao-pham-thien-thanh-10-11	Đào Phạm Thiên Thanh	10.11
hsg-2026-ngu-van-11	identity:nguyen-chu-anh-thu-11-6	Nguyễn Chu Anh Thư	11.6
hsg-2026-ngu-van-11	identity:li-lu-11-3	Lí Lu	11.3
hsg-2026-ngu-van-11	identity:chu-hoang-phuong-thao-11-1	Chu Hoàng Phương Thảo	11.1
hsg-2026-ngu-van-11	identity:ha-thi-dieu-linh-11-3	Hà Thị Diệu Linh	11.3
hsg-2026-ngu-van-11	identity:le-huu-tien-huy-11-5	Lê Hữu Tiến Huy	11.5
hsg-2026-ngu-van-12	identity:nguyen-thi-kim-khanh-12-4	Nguyễn Thị Kim Khánh	12.4
hsg-2026-ngu-van-12	identity:do-tran-anh-ngoc-12-4	Đỗ Trần Ánh Ngọc	12.4
hsg-2026-ngu-van-12	identity:tran-cac-the-hao-12-4	Trần Các Thế Hào	12.4
hsg-2026-ngu-van-12	identity:nguyen-phuong-thanh-12-3	Nguyễn Phương Thanh	12.3
hsg-2026-ngu-van-12	identity:le-dam-nhuan-hong-12-5	Lê Đàm Nhuận Hồng	12.5
hsg-2026-ngu-van-12	identity:tran-thi-thuy-anh-12-7	Trần Thị Thuỳ Anh	12.7
hsg-2026-lich-su-10	identity:nguyen-ngoc-an-nhien-10-5	Nguyễn Ngọc An Nhiên	10.5
hsg-2026-lich-su-10	identity:pham-huynh-truc-diem-10-5	Phạm Huỳnh Trúc Diễm	10.5
hsg-2026-lich-su-10	identity:nguyen-bao-han-10-4	Nguyễn Bảo Hân	10.4
hsg-2026-lich-su-10	identity:tran-ngoc-song-thu-10-1	Trần Ngọc Song Thư	10.1
hsg-2026-lich-su-10	identity:pham-ngoc-que-lam-10-3	Phạm Ngọc Quế Lâm	10.3
hsg-2026-lich-su-10	identity:tran-hoang-duy-10-7	Trần Hoàng Duy	10.7
hsg-2026-lich-su-10	identity:ho-hai-dang-10-7	Hồ Hải Đăng	10.7
hsg-2026-lich-su-10	identity:nguyen-trung-duong-10-8	Nguyễn Trùng Dương	10.8
hsg-2026-lich-su-10	identity:nguyen-thi-quynh-anh-10-5	Nguyễn Thị Quỳnh Anh	10.5
hsg-2026-lich-su-10	identity:phan-nguyen-tram-anh-10-9	Phan Nguyễn Trâm Anh	10.9
hsg-2026-lich-su-11	identity:trinh-hoang-gia-bao-11-6	Trịnh Hoàng Gia Bảo	11.6
hsg-2026-lich-su-11	identity:ho-nguyen-gia-bao-11-5	Hồ Nguyễn Gia Bảo	11.5
hsg-2026-lich-su-11	identity:nguyen-hoang-kha-11-6	Nguyễn Hoàng Kha	11.6
hsg-2026-lich-su-11	identity:nguyen-le-minh-an-11-6	Nguyễn Lê Minh An	11.6
hsg-2026-lich-su-11	identity:diep-cat-tuong-11-6	Diệp Cát Tường	11.6
hsg-2026-lich-su-12	identity:roan-ngoc-han-12-7	Roãn Ngọc Hân	12.7
hsg-2026-lich-su-12	identity:nguyen-minh-khoi-12-7	Nguyễn Minh Khôi	12.7
hsg-2026-lich-su-12	identity:luong-huynh-minh-thu-12-9	Lương Huỳnh Minh Thư	12.9
hsg-2026-lich-su-12	identity:tran-lam-tuyet-nhung-12-7	Trần Lâm Tuyết Nhung	12.7
hsg-2026-lich-su-12	identity:tran-doan-hong-hanh-12-9	Trần Đoàn Hồng Hạnh	12.9
hsg-2026-lich-su-12	identity:le-anh-khoi-12-7	Lê Anh Khôi	12.7
hsg-2026-tieng-anh-10	identity:tran-thi-ha-oanh-10-10	Trần Thị Hà Oanh	10.10
hsg-2026-tieng-anh-10	identity:huynh-nguyen-thanh-truc-10-3	Huỳnh Nguyễn Thanh Trúc	10.3
hsg-2026-tieng-anh-10	identity:le-thi-dieu-hang-10-7	Lê Thị Diệu Hằng	10.7
hsg-2026-tieng-anh-10	identity:tran-ngoc-truc-quan-10-7	Trần Ngọc Trúc Quân	10.7
hsg-2026-tieng-anh-10	identity:vo-thi-an-binh-10-7	Võ Thị An Bình	10.7
hsg-2026-tieng-anh-10	identity:le-chi-hoang-10-7	Lê Chí Hoàng	10.7
hsg-2026-tieng-anh-10	identity:nguyen-hong-ngan-10-7	Nguyễn Hồng Ngân	10.7
hsg-2026-tieng-anh-10	identity:le-hong-bao-nguyen-10-7	Lê Hồng Bảo Nguyên	10.7
hsg-2026-tieng-anh-10	identity:nguyen-phuc-thinh-10-7	Nguyễn Phúc Thịnh	10.7
hsg-2026-tieng-anh-10	identity:nguyen-phuong-nhi-10-7	Nguyễn Phương Nhi	10.7
hsg-2026-tieng-anh-10	identity:nguyen-do-hoang-khang-10-7	Nguyễn Đỗ Hoàng Khang	10.7
hsg-2026-tieng-anh-10	identity:ngo-minh-triet-10-7	Ngô Minh Triết	10.7
hsg-2026-tieng-anh-10	identity:nguyen-gia-tin-10-1	Nguyễn Gia Tín	10.1
hsg-2026-tieng-anh-10	identity:nguyen-huynh-song-thu-10-8	Nguyễn Huỳnh Song Thư	10.8
hsg-2026-tieng-anh-10	identity:huynh-cong-minh-10-8	Huỳnh Công Minh	10.8
hsg-2026-tieng-anh-10	identity:vu-hai-my-10-2	Vũ Hải My	10.2
hsg-2026-tieng-anh-11	identity:dao-minh-dung-11-3	Đào Minh Dũng	11.3
hsg-2026-tieng-anh-11	identity:nguyen-ngoc-quy-11-3	Nguyễn Ngọc Quý	11.3
hsg-2026-tieng-anh-11	identity:tran-nguyen-vy-linh-11-3	Trần Nguyễn Vy Linh	11.3
hsg-2026-tieng-anh-11	identity:oh-sunmin-11-3	Oh Sunmin	11.3
hsg-2026-tieng-anh-11	identity:luu-tuan-nghi-11-5	Lưu Tuấn Nghị	11.5
hsg-2026-tieng-anh-11	identity:doan-vo-nhat-nam-11-6	Đoàn Võ Nhật Nam	11.6
hsg-2026-tieng-anh-11	identity:do-pham-quynh-anh-11-6	Đỗ Phạm Quỳnh Anh	11.6
hsg-2026-tieng-anh-11	identity:nguyen-an-nam-11-2	Nguyễn An Nam	11.2
hsg-2026-tieng-anh-11	identity:cap-minh-quan-11-3	Cáp Minh Quân	11.3
hsg-2026-tieng-anh-11	identity:le-vo-tram-anh-11-3	Lê Võ Trâm Anh	11.3
hsg-2026-tieng-anh-11	identity:doan-minh-duc-11-3	Đoàn Minh Đức	11.3
hsg-2026-tieng-anh-12	identity:lu-thua-han-12-6	Lữ Thừa Hàn	12.6
hsg-2026-tieng-anh-12	identity:pham-gia-lac-12-1	Phạm Gia Lạc	12.1
hsg-2026-tieng-anh-12	identity:lai-pha-le-12-4	Lai Pha Lê	12.4
hsg-2026-tieng-anh-12	identity:nguyen-duc-gia-bao-12-4	Nguyễn Đức Gia Bảo	12.4
hsg-2026-tieng-anh-12	identity:trinh-minh-dang-12-6	Trịnh Minh Đăng	12.6
hsg-2026-tieng-anh-12	identity:ngo-nguyen-minh-hai-12-7	Ngô Nguyễn Minh Hải	12.7
hsg-2026-tieng-anh-12	identity:le-huu-tuong-vi-12-7	Lê Hữu Tường Vi	12.7
$members$, E'\n')
  loop
    v_parts := string_to_array(v_line, E'\t');
    select c.id into v_class_id from public.bes_extra_classes c where c.source_key = v_parts[1];

    insert into public.bes_extra_class_members (
      class_id, member_key, student_code, student_full_name, school_class_name,
      active, joined_at, created_by, updated_by, source_key,
      left_at, removed_by, removal_reason, created_at, updated_at
    ) values (
      v_class_id, v_parts[2], '', v_parts[3], v_parts[4],
      true, now(), v_actor, v_actor, v_parts[1] || '::member::' || v_parts[2],
      null, null, '', now(), now()
    )
    on conflict (source_key) do update set
      class_id = excluded.class_id,
      member_key = excluded.member_key,
      student_full_name = excluded.student_full_name,
      school_class_name = excluded.school_class_name,
      active = true,
      joined_at = case
        when public.bes_extra_class_members.active = false then now()
        else public.bes_extra_class_members.joined_at
      end,
      left_at = null,
      removed_by = null,
      removal_reason = '',
      updated_by = excluded.updated_by,
      updated_at = now();
  end loop;

  select count(*)::integer into v_count
  from public.bes_extra_classes
  where source_key like 'hsg-2026-%';
  if v_count <> 23 then
    raise exception 'Gifted seed guard failed: expected 23 classes, got %.', v_count;
  end if;

  if exists (
    select 1
    from public.bes_extra_classes
    where source_key like 'hsg-2026-%'
      and grade_level not in ('10', '11', '12')
  ) then
    raise exception 'Gifted seed guard failed: only grades 10, 11, 12 are allowed.';
  end if;

  select count(*)::integer into v_count
  from public.bes_extra_class_members
  where source_key like 'hsg-2026-%' and active = true;
  if v_count <> 154 then
    raise exception 'Gifted seed guard failed: expected 154 active memberships, got %.', v_count;
  end if;

  select count(*)::integer into v_count
  from public.bes_extra_class_teachers
  where source_key like 'hsg-2026-%';
  if v_count <> 52 then
    raise exception 'Gifted seed guard failed: expected 52 teacher assignments, got %.', v_count;
  end if;
end
$seed$;

comment on table public.bes_extra_class_teachers is
  'Normalized multi-teacher assignments. teacher_id may be null when the source teacher has no system account.';
comment on column public.bes_extra_classes.expected_student_count is
  'Reference headcount from the teacher schedule; the student roster remains authoritative.';
