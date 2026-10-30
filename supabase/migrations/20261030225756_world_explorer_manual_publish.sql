-- Admin-only manual same-day publication.
-- Reuses the exact idempotent private daily publisher and its one-per-day constraint.
create or replace function public.world_explorer_publish_today()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester uuid := (select auth.uid());
  vietnam_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  previous_id uuid;
  published_id uuid;
begin
  if requester is null or not exists (
    select 1 from public.profiles p
    where p.id = requester and p.role = 'admin' and p.approved = true
  ) then
    raise exception 'Only an approved administrator can publish a World Explorer article'
      using errcode = '42501';
  end if;

  select id into previous_id from public.world_explorer_publications
  where publication_date = vietnam_day limit 1;

  if previous_id is not null then
    return jsonb_build_object('published', false, 'reason', 'already_published_today',
      'publication_date', vietnam_day, 'publication_id', previous_id);
  end if;

  perform world_explorer_private.publish_due();

  select id into published_id from public.world_explorer_publications
  where publication_date = vietnam_day limit 1;

  if published_id is null then
    return jsonb_build_object('published', false, 'reason', 'no_approved_due_article',
      'publication_date', vietnam_day);
  end if;

  insert into public.world_explorer_audit_logs(article_id,actor_id,event,detail)
  select article_id,requester,'manual_publish_requested',jsonb_build_object('publication_date',vietnam_day)
  from public.world_explorer_publications where id=published_id;

  return jsonb_build_object('published', true, 'publication_date', vietnam_day,
    'publication_id', published_id);
end;
$$;
revoke all on function public.world_explorer_publish_today() from public, anon;
grant execute on function public.world_explorer_publish_today() to authenticated;