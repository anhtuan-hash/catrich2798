-- Persisted thumbnails for Fun for Assessment / Activity Arcade.
-- Stores one immutable screenshot per activity content revision in Supabase Storage.

alter table public.lesson_check_activities
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_generated_at timestamptz,
  add column if not exists thumbnail_source_updated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-check-thumbnails',
  'lesson-check-thumbnails',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop function if exists public.lesson_check_list_activities();

create function public.lesson_check_list_activities()
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
  focus_area text,
  notes text,
  source_host text,
  embed_kind text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  thumbnail_url text,
  thumbnail_generated_at timestamptz,
  thumbnail_source_updated_at timestamptz,
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
    a.lesson_key, a.lesson_title, a.class_label, a.activity_type, a.focus_area, a.notes,
    a.source_host, a.embed_kind, a.created_by, a.created_at, a.updated_at,
    case when public.lesson_check_has_activity_access(a.id) then a.thumbnail_url else null end as thumbnail_url,
    case when public.lesson_check_has_activity_access(a.id) then a.thumbnail_generated_at else null end as thumbnail_generated_at,
    case when public.lesson_check_has_activity_access(a.id) then a.thumbnail_source_updated_at else null end as thumbnail_source_updated_at,
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

revoke all on function public.lesson_check_list_activities() from public;
revoke execute on function public.lesson_check_list_activities() from anon;
grant execute on function public.lesson_check_list_activities() to authenticated;

comment on column public.lesson_check_activities.thumbnail_url is
  'Permanent public Supabase Storage URL for the generated activity thumbnail. Returned by the catalog RPC only to users who can access the activity.';
comment on column public.lesson_check_activities.thumbnail_generated_at is
  'Timestamp when the persisted thumbnail was generated.';
comment on column public.lesson_check_activities.thumbnail_source_updated_at is
  'Activity content revision represented by the persisted thumbnail.';
