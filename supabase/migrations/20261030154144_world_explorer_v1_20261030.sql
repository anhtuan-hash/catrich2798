-- BRIAN World Explorer v1: isolated, public-read / admin-write publication system.
create schema if not exists world_explorer_private;
revoke all on schema world_explorer_private from public, anon, authenticated;

create table if not exists public.world_explorer_settings (
  id smallint primary key default 1 check(id = 1),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.world_explorer_settings(id,enabled) values(1,true) on conflict(id) do nothing;

create table if not exists public.world_explorer_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null default 'culture' check (category in ('culture','history','places','science','language','international')),
  title_en text not null default '',
  title_vi text not null default '',
  intro_en text not null default '',
  intro_vi text not null default '',
  body_en text not null default '',
  body_vi text not null default '',
  fact_en text not null default '',
  fact_vi text not null default '',
  image_url text,
  image_alt_en text,
  image_credit text,
  source_title text,
  source_url text,
  vocabulary jsonb not null default '[]'::jsonb check(jsonb_typeof(vocabulary)='array'),
  status text not null default 'draft' check(status in ('candidate','draft','in_review','approved','published','rejected')),
  scheduled_date date,
  approved_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(status not in ('approved','published') or (
    length(btrim(title_en)) > 5 and length(btrim(title_vi)) > 5
    and length(btrim(intro_en)) > 10 and length(btrim(intro_vi)) > 10
    and length(btrim(body_en)) > 30 and length(btrim(body_vi)) > 30
    and source_url like 'https://%' and scheduled_date is not null
    and approved_by is not null and approved_at is not null
    and (image_url is null or (image_url like 'https://%' and length(btrim(coalesce(image_credit,''))) > 2))
  ))
);
create index if not exists world_explorer_articles_queue_idx on public.world_explorer_articles(status,scheduled_date);

create table if not exists public.world_explorer_publications (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.world_explorer_articles(id),
  slug text not null unique,
  category text not null,
  title_en text not null,
  title_vi text not null,
  intro_en text not null,
  intro_vi text not null,
  body_en text not null,
  body_vi text not null,
  fact_en text not null default '',
  fact_vi text not null default '',
  image_url text,
  image_alt_en text,
  image_credit text,
  source_title text,
  source_url text,
  vocabulary jsonb not null default '[]'::jsonb,
  publication_date date not null unique,
  published_at timestamptz not null default now(),
  is_visible boolean not null default true
);
create index if not exists world_explorer_publications_list_idx on public.world_explorer_publications(publication_date desc) where is_visible;

create table if not exists public.world_explorer_audit_logs (
  id bigint generated always as identity primary key,
  article_id uuid,
  actor_id uuid,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- All exposed tables are RLS protected.
alter table public.world_explorer_settings enable row level security;
alter table public.world_explorer_articles enable row level security;
alter table public.world_explorer_publications enable row level security;
alter table public.world_explorer_audit_logs enable row level security;
revoke all on public.world_explorer_settings,public.world_explorer_articles,public.world_explorer_publications,public.world_explorer_audit_logs from anon,authenticated;
grant select on public.world_explorer_settings to anon,authenticated;
grant update on public.world_explorer_settings to authenticated;
grant select,insert,update on public.world_explorer_articles to authenticated;
grant select on public.world_explorer_publications to anon,authenticated;
grant select on public.world_explorer_audit_logs to authenticated;

create policy world_explorer_settings_public_read on public.world_explorer_settings
for select to anon,authenticated using (true);
create policy world_explorer_settings_admin_update on public.world_explorer_settings
for update to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true));

create policy world_explorer_articles_admin_all on public.world_explorer_articles
for all to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true));

create policy world_explorer_publications_visible_only on public.world_explorer_publications
for select to anon,authenticated using(is_visible);

create policy world_explorer_audit_admin_read on public.world_explorer_audit_logs
for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.approved=true));

-- Approved text edits require reapproval; changing schedule alone also invalidates prior approval.
create or replace function world_explorer_private.reset_approval_on_edit()
returns trigger language plpgsql set search_path='' as $fn$
begin
  new.updated_at = now();
  if old.status in ('approved','published') and (
      old.title_en is distinct from new.title_en or old.title_vi is distinct from new.title_vi or
      old.intro_en is distinct from new.intro_en or old.intro_vi is distinct from new.intro_vi or
      old.body_en is distinct from new.body_en or old.body_vi is distinct from new.body_vi or
      old.fact_en is distinct from new.fact_en or old.fact_vi is distinct from new.fact_vi or
      old.source_url is distinct from new.source_url or old.image_url is distinct from new.image_url or
      old.image_credit is distinct from new.image_credit or old.vocabulary is distinct from new.vocabulary or
      old.scheduled_date is distinct from new.scheduled_date
  ) then
    if old.status = 'published' then
      raise exception 'Published articles are immutable; create a revision as a new draft';
    end if;
    new.status = 'draft';
    new.approved_by = null;
    new.approved_at = null;
  end if;
  return new;
end $fn$;
drop trigger if exists world_explorer_article_revision_guard on public.world_explorer_articles;
create trigger world_explorer_article_revision_guard before update on public.world_explorer_articles
for each row execute function world_explorer_private.reset_approval_on_edit();

create or replace function world_explorer_private.log_article_change()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  insert into public.world_explorer_audit_logs(article_id,actor_id,event,detail)
    values(new.id,auth.uid(),case when tg_op='INSERT' then 'created' else 'status_or_content_updated' end,
    jsonb_build_object('status',new.status,'scheduled_date',new.scheduled_date));
  return new;
end $fn$;
drop trigger if exists world_explorer_article_audit on public.world_explorer_articles;
create trigger world_explorer_article_audit after insert or update on public.world_explorer_articles
for each row execute function world_explorer_private.log_article_change();

-- Runs as the restricted cron owner within a private schema, never from a public RPC.
create or replace function world_explorer_private.publish_due()
returns void language plpgsql security definer set search_path='' as $fn$
declare
  vietnam_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  item public.world_explorer_articles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('brian-world-explorer-daily'));
  if exists(select 1 from public.world_explorer_publications where publication_date=vietnam_day) then return; end if;
  select * into item from public.world_explorer_articles
    where status='approved' and scheduled_date <= vietnam_day and approved_at is not null and approved_by is not null
    order by scheduled_date asc, approved_at asc limit 1 for update skip locked;
  if not found then return; end if;
  insert into public.world_explorer_publications
  (article_id,slug,category,title_en,title_vi,intro_en,intro_vi,body_en,body_vi,
   fact_en,fact_vi,image_url,image_alt_en,image_credit,source_title,source_url,vocabulary,publication_date)
  values (item.id,item.slug,item.category,item.title_en,item.title_vi,item.intro_en,item.intro_vi,item.body_en,item.body_vi,
   item.fact_en,item.fact_vi,item.image_url,item.image_alt_en,item.image_credit,item.source_title,item.source_url,item.vocabulary,vietnam_day);
  update public.world_explorer_articles set status='published',published_at=now() where id=item.id;
  insert into public.world_explorer_audit_logs(article_id,event,detail)
  values(item.id,'published',jsonb_build_object('publication_date',vietnam_day));
end $fn$;

revoke all on function world_explorer_private.publish_due() from public,anon,authenticated;
revoke all on function world_explorer_private.reset_approval_on_edit() from public,anon,authenticated;
revoke all on function world_explorer_private.log_article_change() from public,anon,authenticated;

-- 00:00 UTC = 07:00 Asia/Ho_Chi_Minh.
do $block$
begin
  if not exists(select 1 from cron.job where jobname='world-explorer-publish-0700-vn') then
    perform cron.schedule('world-explorer-publish-0700-vn','0 0 * * *',
      'select world_explorer_private.publish_due()');
  end if;
end $block$;
