-- Brian English Studio V10.81.2
-- FIX: adds missing resource_is_leader(uuid) and supports databases where public.resource_items already exists
-- with legacy category_id but without the text column category.
-- Safe to rerun. No existing resource rows are deleted.

create table if not exists public.resource_categories (
  slug text primary key,
  name_vi text not null,
  name_en text not null,
  description_vi text not null default '',
  description_en text not null default '',
  icon text not null default 'folder',
  tone text not null default 'blue',
  drive_folder_name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.resource_categories
  (slug, name_vi, name_en, description_vi, description_en, icon, tone, drive_folder_name, sort_order)
values
  ('lesson-plan', 'Giáo án – Kế hoạch bài dạy', 'Lesson Plans', 'Giáo án, kế hoạch bài dạy và tiến trình tổ chức hoạt động.', 'Lesson plans, teaching plans and classroom procedures.', 'book-open', 'blue', '01_GIAO_AN_KE_HOACH_BAI_DAY', 10),
  ('presentation', 'Bài giảng PowerPoint', 'Presentations', 'Slide bài giảng, học liệu trình chiếu và nội dung thuyết trình.', 'Teaching slides, presentation decks and projected materials.', 'presentation', 'violet', '02_BAI_GIANG_TRINH_CHIEU', 20),
  ('worksheet', 'Worksheet – Phiếu học tập', 'Worksheets', 'Phiếu học tập, bài luyện tập và tài liệu phát cho học sinh.', 'Worksheets, practice sheets and student handouts.', 'file-text', 'green', '03_WORKSHEET_PHIEU_HOC_TAP', 30),
  ('assessment', 'Đề kiểm tra', 'Assessments', 'Đề thường xuyên, giữa kì, cuối kì và đề luyện thi.', 'Quizzes, midterms, finals and practice tests.', 'clipboard-check', 'red', '04_DE_KIEM_TRA', 40),
  ('answer-key', 'Đáp án – Hướng dẫn chấm', 'Answer Keys', 'Đáp án, biểu điểm, rubric và hướng dẫn chấm.', 'Answer keys, marking schemes, rubrics and scoring guides.', 'key-round', 'amber', '05_DAP_AN_HUONG_DAN_CHAM', 50),
  ('thpt-exam', 'Tài liệu ôn thi THPT', 'THPT Exam Preparation', 'Tài liệu ôn thi tốt nghiệp THPT và chuyên đề luyện đề.', 'National high-school exam preparation resources.', 'graduation-cap', 'cyan', '06_ON_THI_THPT', 60),
  ('gifted', 'Tài liệu học sinh giỏi', 'Gifted Student Materials', 'Chuyên đề nâng cao, đề học sinh giỏi và tài liệu C1–C2.', 'Advanced topics, gifted-student tests and C1–C2 resources.', 'trophy', 'orange', '07_HOC_SINH_GIOI', 70),
  ('audio', 'Audio – Listening', 'Audio & Listening', 'File nghe, transcript và tài liệu luyện nghe.', 'Audio files, transcripts and listening resources.', 'headphones', 'pink', '08_AUDIO_LISTENING', 80),
  ('media', 'Video – Hình ảnh', 'Video & Images', 'Video, hình ảnh, infographic và học liệu trực quan.', 'Videos, images, infographics and visual resources.', 'image', 'indigo', '09_VIDEO_HINH_ANH', 90),
  ('professional-form', 'Biểu mẫu chuyên môn', 'Professional Forms', 'Biểu mẫu, biên bản, báo cáo và hồ sơ tổ chuyên môn.', 'Forms, minutes, reports and department records.', 'files', 'teal', '10_BIEU_MAU_CHUYEN_MON', 100),
  ('reference', 'Sách – Tài liệu tham khảo', 'Books & References', 'Sách, giáo trình, nghiên cứu và tài liệu tham khảo.', 'Books, textbooks, research and reference materials.', 'library', 'slate', '11_SACH_TAI_LIEU_THAM_KHAO', 110),
  ('other', 'Chưa phân loại', 'Uncategorised', 'Tài liệu chưa được xếp vào danh mục chính thức.', 'Resources not yet assigned to an official category.', 'folder-question', 'gray', '99_CHUA_PHAN_LOAI', 999)
on conflict (slug) do update set
  name_vi = excluded.name_vi,
  name_en = excluded.name_en,
  description_vi = excluded.description_vi,
  description_en = excluded.description_en,
  icon = excluded.icon,
  tone = excluded.tone,
  drive_folder_name = excluded.drive_folder_name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- IMPORTANT FIX: CREATE TABLE IF NOT EXISTS does not add missing columns
-- to an already-existing resource_items table. Add them explicitly.
alter table public.resource_items
  add column if not exists category text,
  add column if not exists school_year text not null default '',
  add column if not exists unit_name text not null default '',
  add column if not exists is_featured boolean not null default false;

-- Best-effort migration from a legacy category_id relation, when both
-- resource_categories.id and resource_items.category_id are present.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resource_items' and column_name = 'category_id'
  ) then
    -- The V10.81 UI writes the canonical text slug. Keep a legacy category_id
    -- column nullable so it cannot block new uploads.
    execute 'alter table public.resource_items alter column category_id drop not null';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'resource_categories' and column_name = 'id'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'resource_categories' and column_name = 'slug'
    ) then
      begin
        execute $map$
          update public.resource_items r
          set category = c.slug
          from public.resource_categories c
          where r.category_id = c.id
            and (r.category is null or btrim(r.category) = '')
        $map$;
      exception
        when others then
          raise notice 'Legacy category_id values were kept; text category will use the safe fallback.';
      end;
    end if;
  end if;
end $$;

update public.resource_items
set category = 'other'
where category is null or btrim(category) = '';

alter table public.resource_items
  alter column category set default 'other',
  alter column category set not null;

create index if not exists resource_items_category_idx on public.resource_items(category);
create index if not exists resource_items_school_year_idx on public.resource_items(school_year);
create index if not exists resource_items_featured_idx on public.resource_items(is_featured) where is_featured = true;

-- Normalise legacy aliases without deleting or recreating data.
update public.resource_items set category = 'lesson-plan'
where lower(category) in ('lesson_plan','lesson plan','lesson-plan','teaching-plan','teaching_plan','plan');
update public.resource_items set category = 'presentation'
where lower(category) in ('slide','slides','ppt','pptx','powerpoint','presentation');
update public.resource_items set category = 'worksheet'
where lower(category) in ('worksheet','worksheets','handout','practice');
update public.resource_items set category = 'assessment'
where lower(category) in ('test','tests','exam','exams','assessment','quiz');
update public.resource_items set category = 'answer-key'
where lower(category) in ('answer','answers','answer-key','answer_key','marking-scheme','rubric');
update public.resource_items set category = 'thpt-exam'
where lower(category) in ('thpt','thpt-exam','national-exam','exam-prep');
update public.resource_items set category = 'gifted'
where lower(category) in ('hsg','gifted','advanced');
update public.resource_items set category = 'audio'
where lower(category) in ('audio','listening','mp3','wav');
update public.resource_items set category = 'media'
where lower(category) in ('video','image','images','media','visual');
update public.resource_items set category = 'professional-form'
where lower(category) in ('form','forms','template','professional-form','department-form');
update public.resource_items set category = 'reference'
where lower(category) in ('book','books','reference','references','textbook');
update public.resource_items set category = 'other'
where not exists (
  select 1 from public.resource_categories c
  where c.slug = resource_items.category and c.is_active = true
);

create or replace function public.resource_validate_category()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category is null or not exists (
    select 1
    from public.resource_categories c
    where c.slug = new.category and c.is_active = true
  ) then
    new.category := 'other';
  end if;
  return new;
end;
$$;

drop trigger if exists resource_items_validate_category on public.resource_items;
create trigger resource_items_validate_category
before insert or update of category on public.resource_items
for each row execute function public.resource_validate_category();

create or replace view public.resource_category_overview
with (security_invoker = true)
as
select
  c.slug,
  c.name_vi,
  c.name_en,
  c.description_vi,
  c.description_en,
  c.icon,
  c.tone,
  c.drive_folder_name,
  c.sort_order,
  count(r.id)::bigint as item_count,
  count(r.id) filter (where r.created_at >= now() - interval '7 days')::bigint as new_count,
  max(r.updated_at) as latest_at,
  (
    select r2.title
    from public.resource_items r2
    where r2.category = c.slug
    order by r2.updated_at desc nulls last
    limit 1
  ) as latest_title
from public.resource_categories c
left join public.resource_items r on r.category = c.slug
where c.is_active = true
group by c.slug, c.name_vi, c.name_en, c.description_vi, c.description_en,
         c.icon, c.tone, c.drive_folder_name, c.sort_order;

-- V10.81.2 compatibility helper.
-- The older database did not yet contain resource_is_leader(uuid).
-- This function recognises the existing profiles.role = 'admin' model,
-- while remaining compatible with common TTCM/leader role labels.
create or replace function public.resource_is_leader(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result boolean := false;
  v_id_column text;
  v_approval_condition text := 'true';
  v_sql text;
  v_claim_role text;
begin
  if p_user_id is null then
    return false;
  end if;

  -- Prefer a trusted role claim when the project already writes one to JWT.
  begin
    v_claim_role := lower(coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ));

    if v_claim_role in ('admin', 'ttcm', 'leader', 'head', 'manager') then
      return true;
    end if;
  exception
    when others then null;
  end;

  -- Fall back to the project's public.profiles table.
  if to_regclass('public.profiles') is null then
    return false;
  end if;

  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
    ) then 'id'
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
    ) then 'user_id'
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'profile_id'
    ) then 'profile_id'
    else null
  end into v_id_column;

  if v_id_column is null or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    return false;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'approved'
  ) then
    v_approval_condition := 'coalesce(approved, false) = true';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_approved'
  ) then
    v_approval_condition := 'coalesce(is_approved, false) = true';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
  ) then
    v_approval_condition :=
      'lower(coalesce(status::text, '''')) in (''approved'', ''active'', ''enabled'')';
  end if;

  v_sql := format(
    'select exists (
       select 1
       from public.profiles
       where %I::text = $1::text
         and lower(coalesce(role::text, '''')) in
             (''admin'', ''ttcm'', ''leader'', ''head'', ''manager'')
         and %s
     )',
    v_id_column,
    v_approval_condition
  );

  execute v_sql into v_result using p_user_id;
  return coalesce(v_result, false);
exception
  when others then
    return false;
end;
$$;

revoke all on function public.resource_is_leader(uuid) from public;
grant execute on function public.resource_is_leader(uuid) to authenticated;

alter table public.resource_categories enable row level security;

drop policy if exists resource_categories_read on public.resource_categories;
create policy resource_categories_read on public.resource_categories
for select to authenticated
using (is_active = true or public.resource_is_leader(auth.uid()));

drop policy if exists resource_categories_admin_write on public.resource_categories;
create policy resource_categories_admin_write on public.resource_categories
for all to authenticated
using (public.resource_is_leader(auth.uid()))
with check (public.resource_is_leader(auth.uid()));

grant select on public.resource_categories to authenticated;
grant select on public.resource_category_overview to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.resource_items;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

-- Verification: Supabase Results should return 12 rows.
select slug, name_vi, item_count, new_count, latest_at
from public.resource_category_overview
order by sort_order;
