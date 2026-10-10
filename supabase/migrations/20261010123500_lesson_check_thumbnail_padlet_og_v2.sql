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
    case when public.lesson_check_has_activity_access(a.id) and a.thumbnail_profile = 'padlet-og-v2' then a.thumbnail_url else null end,
    case when public.lesson_check_has_activity_access(a.id) and a.thumbnail_profile = 'padlet-og-v2' then a.thumbnail_generated_at else null end,
    case when public.lesson_check_has_activity_access(a.id) and a.thumbnail_profile = 'padlet-og-v2' then a.thumbnail_source_updated_at else null end,
    public.lesson_check_has_activity_access(a.id),
    (
      select r.status
      from public.lesson_check_activity_requests r
      where r.activity_id = a.id and r.requester_id = auth.uid()
      order by r.created_at desc
      limit 1
    ),
    (select count(*) from public.lesson_check_activity_grants g where g.activity_id = a.id)
  from public.lesson_check_activities a
  where public.lesson_check_is_approved_user()
  order by a.updated_at desc, a.created_at desc;
$$;

revoke all on function public.lesson_check_list_activities() from public;
revoke execute on function public.lesson_check_list_activities() from anon;
grant execute on function public.lesson_check_list_activities() to authenticated;

comment on column public.lesson_check_activities.thumbnail_profile is
  'Thumbnail rendering profile. padlet-og-v2 persists Padlet Arcade native social preview images.';
