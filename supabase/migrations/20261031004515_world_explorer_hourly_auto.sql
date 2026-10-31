-- BRIAN World Explorer: hourly, no-review, freely licensed bilingual publications.
-- Keep the original reviewed-post paths for historical articles; automatic posts
-- use a separate service-role-only atomic ingestion path.
create extension if not exists pg_net;

alter table public.world_explorer_settings
  add column if not exists auto_publish_hourly boolean not null default true;

alter table public.world_explorer_publications
  drop constraint if exists world_explorer_publications_publication_date_key;
alter table public.world_explorer_publications
  add column if not exists publication_hour_epoch bigint,
  add column if not exists source_kind text not null default 'editorial',
  add column if not exists source_url_vi text,
  add column if not exists image_license text,
  add column if not exists content_license text;
create unique index if not exists world_explorer_publications_hour_unique
  on public.world_explorer_publications(publication_hour_epoch)
  where publication_hour_epoch is not null;
create unique index if not exists world_explorer_publications_wikimedia_source_unique
  on public.world_explorer_publications(source_url)
  where source_kind='wikimedia' and source_url is not null;
create index if not exists world_explorer_publications_recent_hourly
  on public.world_explorer_publications(published_at desc);

alter table public.world_explorer_articles
  drop constraint if exists world_explorer_articles_status_check;
alter table public.world_explorer_articles
  add constraint world_explorer_articles_status_check check(status in
   ('candidate','draft','in_review','approved','published','rejected','auto_published'));

create or replace function world_explorer_private.reset_approval_on_edit()
returns trigger language plpgsql set search_path='' as $fn$
begin
  new.updated_at=now();
  if old.status='auto_published' then
    raise exception 'Automatic published source records are immutable';
  end if;
  if old.status in ('approved','published') and (
      old.title_en is distinct from new.title_en or old.title_vi is distinct from new.title_vi or
      old.intro_en is distinct from new.intro_en or old.intro_vi is distinct from new.intro_vi or
      old.body_en is distinct from new.body_en or old.body_vi is distinct from new.body_vi or
      old.fact_en is distinct from new.fact_en or old.fact_vi is distinct from new.fact_vi or
      old.source_url is distinct from new.source_url or old.image_url is distinct from new.image_url or
      old.image_credit is distinct from new.image_credit or old.vocabulary is distinct from new.vocabulary or
      old.scheduled_date is distinct from new.scheduled_date
  ) then
    if old.status='published' then
      raise exception 'Published articles are immutable; create a revision as a new draft';
    end if;
    new.status='draft'; new.approved_by=null; new.approved_at=null;
  end if;
  return new;
end $fn$;

-- Secret is generated on the database server and never returned to the frontend.
do $block$
begin
  if not exists(select 1 from vault.secrets where name='world_explorer_cron_token') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
      'world_explorer_cron_token', 'BRIAN World Explorer hourly ingestion');
  end if;
end $block$;

create or replace function public.world_explorer_verify_cron_token(p_token text)
returns boolean
language plpgsql security definer set search_path=''
as $fn$
declare
  secret_value text;
begin
  if p_token is null or length(p_token)<>64 then return false; end if;
  select decrypted_secret into secret_value
  from vault.decrypted_secrets where name='world_explorer_cron_token' limit 1;
  if secret_value is null then return false; end if;
  return encode(extensions.digest(convert_to(p_token,'UTF8'),'sha256'),'hex') =
    encode(extensions.digest(convert_to(secret_value,'UTF8'),'sha256'),'hex');
end $fn$;
revoke all on function public.world_explorer_verify_cron_token(text) from public,anon,authenticated;
grant execute on function public.world_explorer_verify_cron_token(text) to service_role;

create or replace function public.world_explorer_auto_ingest(p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path=''
as $fn$
declare
  slot bigint := floor(extract(epoch from now()) / 3600)::bigint;
  day_vn date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  existing_id uuid;
  new_article_id uuid;
  new_post_id uuid;
  slug_value text;
  source_en text := coalesce(p_payload->>'source_url','');
  source_vi text := coalesce(p_payload->>'source_url_vi','');
  photo text := coalesce(p_payload->>'image_url','');
  attribution text := coalesce(p_payload->>'image_credit','');
  fields text[] := array['title_en','title_vi','intro_en','intro_vi','body_en','body_vi'];
  field_name text;
begin
  -- Only the backend service-role connection may call this privileged RPC.
  -- Revoke/grant above is the primary API privilege boundary.
  if (current_setting('request.jwt.claim.role',true) is distinct from 'service_role') then
    raise exception 'Service role required' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('brian-world-explorer-hourly'));
  if not exists(select 1 from public.world_explorer_settings where id=1 and enabled and auto_publish_hourly) then
    return jsonb_build_object('published',false,'reason','disabled');
  end if;
  select id into existing_id from public.world_explorer_publications
    where publication_hour_epoch=slot limit 1;
  if existing_id is not null then
    return jsonb_build_object('published',false,'reason','slot_already_published','id',existing_id);
  end if;

  foreach field_name in array fields loop
    if length(btrim(coalesce(p_payload->>field_name,''))) < 20 then
      raise exception 'Missing or short bilingual field: %', field_name;
    end if;
  end loop;
  if length(p_payload->>'body_en')<350 or length(p_payload->>'body_vi')<260 then
    raise exception 'Article must have complete English and Vietnamese content';
  end if;
  if source_en !~ '^https://en\.wikipedia\.org/wiki/' or
     source_vi !~ '^https://vi\.wikipedia\.org/wiki/' or
     photo !~ '^https://upload\.wikimedia\.org/' then
    raise exception 'Only curated Wikimedia sources and Wikimedia imagery are allowed';
  end if;
  if length(attribution)<24 or length(coalesce(p_payload->>'image_license',''))<3
     or p_payload->>'content_license' <> 'CC BY-SA 4.0' then
    raise exception 'Image license, credit and text license are required';
  end if;
  if exists (select 1 from public.world_explorer_publications
      where source_kind='wikimedia' and source_url=source_en) then
    return jsonb_build_object('published',false,'reason','already_used_source');
  end if;
  slug_value := 'wiki-' || substr(md5(source_en),1,24);

  insert into public.world_explorer_articles
    (slug,category,title_en,title_vi,intro_en,intro_vi,body_en,body_vi,
     fact_en,fact_vi,image_url,image_alt_en,image_credit,source_title,source_url,
     vocabulary,status,scheduled_date)
  values (
    slug_value,coalesce(nullif(p_payload->>'category',''),'culture'),
    p_payload->>'title_en',p_payload->>'title_vi',
    p_payload->>'intro_en',p_payload->>'intro_vi',
    p_payload->>'body_en',p_payload->>'body_vi',
    coalesce(p_payload->>'fact_en',''),coalesce(p_payload->>'fact_vi',''),
    photo,coalesce(p_payload->>'image_alt_en',p_payload->>'title_en'),
    attribution,'Wikipedia · CC BY-SA 4.0',source_en,'[]'::jsonb,
    'auto_published',day_vn
  ) returning id into new_article_id;

  insert into public.world_explorer_publications
    (article_id,slug,category,title_en,title_vi,intro_en,intro_vi,body_en,body_vi,
     fact_en,fact_vi,image_url,image_alt_en,image_credit,source_title,source_url,
     vocabulary,publication_date,published_at,is_visible,publication_hour_epoch,
     source_kind,source_url_vi,image_license,content_license)
  values (
    new_article_id,slug_value,coalesce(nullif(p_payload->>'category',''),'culture'),
    p_payload->>'title_en',p_payload->>'title_vi',
    p_payload->>'intro_en',p_payload->>'intro_vi',
    p_payload->>'body_en',p_payload->>'body_vi',
    coalesce(p_payload->>'fact_en',''),coalesce(p_payload->>'fact_vi',''),
    photo,coalesce(p_payload->>'image_alt_en',p_payload->>'title_en'),
    attribution,'Wikipedia · CC BY-SA 4.0',source_en,'[]'::jsonb,
    day_vn,now(),true,slot,'wikimedia',source_vi,
    p_payload->>'image_license','CC BY-SA 4.0'
  ) returning id into new_post_id;

  insert into public.world_explorer_audit_logs(article_id,event,detail)
    values(new_article_id,'automatic_hourly_publication',
      jsonb_build_object('hour_epoch',slot,'source',source_en,'license',p_payload->>'image_license'));
  return jsonb_build_object('published',true,'id',new_post_id,'hour_epoch',slot);
end $fn$;
revoke all on function public.world_explorer_auto_ingest(jsonb) from public,anon,authenticated;
grant execute on function public.world_explorer_auto_ingest(jsonb) to service_role;

-- Disable old once-daily reviewed-only job; hourly ingest will own scheduling.
do $block$
begin
 if exists(select 1 from cron.job where jobname='world-explorer-publish-0700-vn') then
  perform cron.unschedule('world-explorer-publish-0700-vn');
 end if;
end $block$;
