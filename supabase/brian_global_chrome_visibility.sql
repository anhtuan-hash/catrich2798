-- Site-wide Brian Action Dock and BRIAN NEWSWIRE visibility.
-- Extend the existing singleton; preserve show_subtitles and its Admin-only RLS.
alter table public.brian_global_display_settings
  add column if not exists show_action_dock boolean not null default true,
  add column if not exists show_newswire boolean not null default true;

comment on column public.brian_global_display_settings.show_action_dock
  is 'Admin/TTCM-controlled site-wide visibility of the Brian Action Dock.';
comment on column public.brian_global_display_settings.show_newswire
  is 'Admin/TTCM-controlled site-wide visibility of the BRIAN NEWSWIRE bar.';

insert into public.brian_global_display_settings (id, show_action_dock, show_newswire)
values (true, true, true)
on conflict (id) do nothing;

-- Do not extend UPDATE on the table to TTCM: it also contains Admin-only
-- show_subtitles. Only this narrowly scoped RPC can edit the new flags.
create or replace function public.bes_set_global_chrome_visibility(
  p_show_action_dock boolean default null,
  p_show_newswire boolean default null
)
returns table (
  show_action_dock boolean,
  show_newswire boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or
     not private.bes_is_app_leader((select auth.uid())) then
    raise exception 'Only an approved Brian administrator or department leader may update global interface visibility.'
      using errcode = '42501';
  end if;

  return query
  insert into public.brian_global_display_settings as target
    (id, show_action_dock, show_newswire, updated_by, updated_at)
  values (
    true,
    coalesce(p_show_action_dock, true),
    coalesce(p_show_newswire, true),
    (select auth.uid())::text,
    now()
  )
  on conflict (id) do update set
    show_action_dock = coalesce(p_show_action_dock, target.show_action_dock),
    show_newswire = coalesce(p_show_newswire, target.show_newswire),
    updated_by = (select auth.uid())::text,
    updated_at = now()
  returning target.show_action_dock, target.show_newswire, target.updated_at;
end;
$function$;

revoke all on function public.bes_set_global_chrome_visibility(boolean, boolean)
  from public, anon;
grant execute on function public.bes_set_global_chrome_visibility(boolean, boolean)
  to authenticated, service_role;