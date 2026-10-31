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
  -- Only service_role has EXECUTE, enforced by PostgreSQL function ACL.
  -- Do not inspect request.jwt.claim.role: it may be unset by newer auth keys.

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
