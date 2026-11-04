-- Use the existing read-only theme singleton and its Realtime publication.
alter table public.bes_navigation_theme_settings
  add column if not exists assessment_scrapbook_enabled boolean not null default true;

create or replace function public.bes_set_assessment_scrapbook_enabled(p_enabled boolean)
returns table(assessment_scrapbook_enabled boolean, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null or not exists (
    select 1 from public.profiles p where p.id = actor
      and lower(p.role) in ('admin', 'administrator') and p.approved is true
  ) then
    raise exception 'Chỉ quản trị viên đã duyệt được đổi giao diện Kiểm tra.' using errcode = '42501';
  end if;
  if p_enabled is null then
    raise exception 'Cần chọn bật hoặc tắt.' using errcode = '22023';
  end if;

  return query
    update public.bes_navigation_theme_settings as t
      set assessment_scrapbook_enabled = p_enabled, updated_by = actor, updated_at = clock_timestamp()
      where t.id = true returning t.assessment_scrapbook_enabled, t.updated_at;
end;
$$;
revoke all on function public.bes_set_assessment_scrapbook_enabled(boolean) from public, anon;
grant execute on function public.bes_set_assessment_scrapbook_enabled(boolean) to authenticated;
