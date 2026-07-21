-- Brian English Studio V10.90.0
-- Smart Knowledge Library: metadata, collections, favorites, saved searches,
-- duplicate governance and AI-ready indexing queue.
-- Safe to rerun. Existing resource_items and files are not deleted.

begin;
create extension if not exists pgcrypto;

create or replace function public.knowledge_try_uuid(value text)
returns uuid language plpgsql immutable security invoker set search_path=public,pg_temp as $$
begin
  if value is not null and value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return value::uuid; end if;
  return null;
end; $$;

create or replace function public.knowledge_profile_uuid(profile_json jsonb)
returns uuid language sql immutable security invoker set search_path=public,pg_temp as $$
  select coalesce(public.knowledge_try_uuid(profile_json->>'id'),public.knowledge_try_uuid(profile_json->>'user_id'),public.knowledge_try_uuid(profile_json->>'profile_id'));
$$;

create or replace function public.knowledge_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare jwt jsonb:=coalesce(auth.jwt(),'{}'::jsonb); r text:=lower(coalesce(jwt->'app_metadata'->>'role',jwt->'user_metadata'->>'role',jwt->>'role','')); e text:=lower(coalesce(jwt->>'email','')); ok boolean:=false;
begin
  if target_user is null then return false; end if;
  if target_user=auth.uid() and (r in ('admin','ttcm','leader','department_head','department-head','head') or e='anhtuan@pek.edu.vn') then return true; end if;
  if to_regclass('public.profiles') is null then return false; end if;
  select exists(select 1 from public.profiles p cross join lateral(select to_jsonb(p) j)x where public.knowledge_profile_uuid(x.j)=target_user and (lower(coalesce(x.j->>'role','')) in ('admin','ttcm','leader','department_head','department-head','head') or lower(coalesce(x.j->>'email',''))='anhtuan@pek.edu.vn')) into ok;
  return coalesce(ok,false);
exception when others then return false;
end; $$;

create or replace function public.knowledge_is_approved_user(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare ok boolean:=false;
begin
  if target_user is null then return false; end if;
  if public.knowledge_is_leader(target_user) then return true; end if;
  if to_regclass('public.profiles') is null then return target_user=auth.uid(); end if;
  select exists(select 1 from public.profiles p cross join lateral(select to_jsonb(p) j)x where public.knowledge_profile_uuid(x.j)=target_user and lower(coalesce(x.j->>'role','teacher')) not in ('blocked','disabled','rejected') and lower(coalesce(x.j->>'status','approved')) not in ('blocked','disabled','rejected') and lower(coalesce(x.j->>'approved','true')) not in ('false','0','no')) into ok;
  return coalesce(ok,false);
exception when others then return target_user=auth.uid();
end; $$;

create or replace function public.knowledge_can_manage_resource(target_resource uuid,target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare ok boolean:=false;
begin
  if target_resource is null or target_user is null then return false; end if;
  if public.knowledge_is_leader(target_user) then return true; end if;
  if to_regclass('public.resource_items') is null then return false; end if;
  execute $q$select exists(select 1 from public.resource_items r cross join lateral(select to_jsonb(r) j)x where public.knowledge_try_uuid(x.j->>'id')=$1 and coalesce(public.knowledge_try_uuid(x.j->>'uploader_id'),public.knowledge_try_uuid(x.j->>'owner_id'),public.knowledge_try_uuid(x.j->>'user_id'),public.knowledge_try_uuid(x.j->>'created_by'))=$2)$q$ into ok using target_resource,target_user;
  return coalesce(ok,false);
exception when others then return false;
end; $$;

create table if not exists public.resource_smart_metadata(
  resource_id uuid primary key,
  summary text not null default '',
  keywords text[] not null default '{}', subjects text[] not null default '{}', grade_levels text[] not null default '{}', units text[] not null default '{}', skills text[] not null default '{}', grammar_topics text[] not null default '{}', vocabulary_topics text[] not null default '{}', cefr_levels text[] not null default '{}', exam_types text[] not null default '{}',
  lifecycle_status text not null default 'active', quality_score integer not null default 0, review_due_at timestamptz, indexed_at timestamptz, embedding_status text not null default 'not_indexed', duplicate_group text not null default '', search_text text not null default '', search_document tsvector,
  created_by uuid default auth.uid(), updated_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint resource_smart_lifecycle_check check(lifecycle_status in('draft','active','needs_review','superseded','archived')),
  constraint resource_smart_quality_check check(quality_score between 0 and 100),
  constraint resource_smart_embedding_check check(embedding_status in('not_indexed','queued','processing','indexed','failed'))
);
create index if not exists resource_smart_search_gin on public.resource_smart_metadata using gin(search_document);
create index if not exists resource_smart_lifecycle_idx on public.resource_smart_metadata(lifecycle_status,review_due_at);
create index if not exists resource_smart_keywords_gin on public.resource_smart_metadata using gin(keywords);
create index if not exists resource_smart_skills_gin on public.resource_smart_metadata using gin(skills);
create index if not exists resource_smart_cefr_gin on public.resource_smart_metadata using gin(cefr_levels);

create table if not exists public.resource_collections(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid(), title text not null, description text not null default '', scope text not null default 'personal', color text not null default 'blue', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint resource_collections_title_check check(length(btrim(title))>0), constraint resource_collections_scope_check check(scope in('personal','department'))
);
create table if not exists public.resource_collection_items(
  collection_id uuid not null references public.resource_collections(id) on delete cascade, resource_id uuid not null, added_by uuid not null default auth.uid(), added_at timestamptz not null default now(), primary key(collection_id,resource_id)
);
create index if not exists resource_collection_items_resource_idx on public.resource_collection_items(resource_id);

create table if not exists public.resource_saved_searches(
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), title text not null, query_text text not null default '', filters jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint resource_saved_search_filters_object check(jsonb_typeof(filters)='object')
);
create index if not exists resource_saved_searches_user_idx on public.resource_saved_searches(user_id,updated_at desc);

create table if not exists public.resource_user_state(
  user_id uuid not null default auth.uid(), resource_id uuid not null, favorite boolean not null default false, last_opened_at timestamptz, notes text not null default '', updated_at timestamptz not null default now(), primary key(user_id,resource_id)
);
create index if not exists resource_user_state_recent_idx on public.resource_user_state(user_id,last_opened_at desc);

create table if not exists public.resource_index_jobs(
  id bigint generated by default as identity primary key, resource_id uuid not null, requested_by uuid not null default auth.uid(), provider text not null default 'auto', status text not null default 'queued', attempts integer not null default 0, payload jsonb not null default '{}'::jsonb, error_message text not null default '', created_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz,
  constraint resource_index_jobs_status_check check(status in('queued','processing','completed','failed','cancelled')), constraint resource_index_jobs_payload_object check(jsonb_typeof(payload)='object')
);
create index if not exists resource_index_jobs_status_idx on public.resource_index_jobs(status,created_at);

create or replace function public.resource_smart_metadata_prepare()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  new.updated_at=now();
  new.search_text=concat_ws(' ',new.summary,array_to_string(new.keywords,' '),array_to_string(new.subjects,' '),array_to_string(new.grade_levels,' '),array_to_string(new.units,' '),array_to_string(new.skills,' '),array_to_string(new.grammar_topics,' '),array_to_string(new.vocabulary_topics,' '),array_to_string(new.cefr_levels,' '),array_to_string(new.exam_types,' '));
  new.search_document=to_tsvector('simple',coalesce(new.search_text,''));
  return new;
end; $$;
drop trigger if exists resource_smart_metadata_prepare_trg on public.resource_smart_metadata;
create trigger resource_smart_metadata_prepare_trg before insert or update on public.resource_smart_metadata for each row execute function public.resource_smart_metadata_prepare();

create or replace function public.resource_smart_sync_from_item()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare j jsonb:=to_jsonb(new); rid uuid; ttl text; descr text; rawtags text; fp text;
begin
  rid=public.knowledge_try_uuid(j->>'id'); if rid is null then return new; end if;
  ttl=coalesce(j->>'title',j->>'name',j->>'file_name',j->>'filename',''); descr=coalesce(j->>'description',j->>'summary',''); rawtags=coalesce(j->>'tags',j->>'keywords',j->>'labels','');
  fp=md5(lower(regexp_replace(ttl,'[^[:alnum:]]+','','g'))||'|'||coalesce(j->>'size_bytes',j->>'file_size',j->>'size','0'));
  insert into public.resource_smart_metadata(resource_id,summary,search_text,duplicate_group) values(rid,descr,concat_ws(' ',ttl,descr,rawtags),fp)
  on conflict(resource_id) do update set search_text=concat_ws(' ',excluded.search_text,public.resource_smart_metadata.search_text),duplicate_group=excluded.duplicate_group,updated_at=now();
  return new;
end; $$;

do $$ begin
  if to_regclass('public.resource_items') is null then raise exception 'public.resource_items does not exist. Run the Resource Library migration first.'; end if;
  execute 'drop trigger if exists resource_smart_sync_from_item_trg on public.resource_items';
  execute 'create trigger resource_smart_sync_from_item_trg after insert or update on public.resource_items for each row execute function public.resource_smart_sync_from_item()';
end $$;

do $$ declare r record; j jsonb; rid uuid; ttl text; descr text; rawtags text; fp text; begin
  for r in select * from public.resource_items loop
    j=to_jsonb(r); rid=public.knowledge_try_uuid(j->>'id');
    if rid is not null then
      ttl=coalesce(j->>'title',j->>'name',j->>'file_name',j->>'filename',''); descr=coalesce(j->>'description',j->>'summary',''); rawtags=coalesce(j->>'tags',j->>'keywords',j->>'labels',''); fp=md5(lower(regexp_replace(ttl,'[^[:alnum:]]+','','g'))||'|'||coalesce(j->>'size_bytes',j->>'file_size',j->>'size','0'));
      insert into public.resource_smart_metadata(resource_id,summary,search_text,duplicate_group) values(rid,descr,concat_ws(' ',ttl,descr,rawtags),fp)
      on conflict(resource_id) do update set search_text=case when public.resource_smart_metadata.search_text='' then excluded.search_text else public.resource_smart_metadata.search_text end,duplicate_group=excluded.duplicate_group,updated_at=now();
    end if;
  end loop;
end $$;

create or replace function public.knowledge_can_view_collection(target_collection uuid,target_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$ select exists(select 1 from public.resource_collections c where c.id=target_collection and (c.owner_id=target_user or (c.scope='department' and public.knowledge_is_approved_user(target_user)) or public.knowledge_is_leader(target_user))); $$;
create or replace function public.knowledge_can_manage_collection(target_collection uuid,target_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$ select exists(select 1 from public.resource_collections c where c.id=target_collection and (c.owner_id=target_user or public.knowledge_is_leader(target_user))); $$;

alter table public.resource_smart_metadata enable row level security; alter table public.resource_collections enable row level security; alter table public.resource_collection_items enable row level security; alter table public.resource_saved_searches enable row level security; alter table public.resource_user_state enable row level security; alter table public.resource_index_jobs enable row level security;

do $$ declare p record; t text; begin
  foreach t in array array['resource_smart_metadata','resource_collections','resource_collection_items','resource_saved_searches','resource_user_state','resource_index_jobs'] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy if exists %I on public.%I',p.policyname,t); end loop;
  end loop;
end $$;

create policy resource_smart_metadata_read_v10900 on public.resource_smart_metadata for select to authenticated using(public.knowledge_is_approved_user(auth.uid()));
create policy resource_smart_metadata_insert_v10900 on public.resource_smart_metadata for insert to authenticated with check(public.knowledge_can_manage_resource(resource_id,auth.uid()));
create policy resource_smart_metadata_update_v10900 on public.resource_smart_metadata for update to authenticated using(public.knowledge_can_manage_resource(resource_id,auth.uid())) with check(public.knowledge_can_manage_resource(resource_id,auth.uid()));
create policy resource_smart_metadata_delete_v10900 on public.resource_smart_metadata for delete to authenticated using(public.knowledge_is_leader(auth.uid()));

create policy resource_collections_read_v10900 on public.resource_collections for select to authenticated using(owner_id=auth.uid() or (scope='department' and public.knowledge_is_approved_user(auth.uid())) or public.knowledge_is_leader(auth.uid()));
create policy resource_collections_insert_v10900 on public.resource_collections for insert to authenticated with check(owner_id=auth.uid() and (scope='personal' or public.knowledge_is_leader(auth.uid())));
create policy resource_collections_update_v10900 on public.resource_collections for update to authenticated using(owner_id=auth.uid() or public.knowledge_is_leader(auth.uid())) with check(owner_id=auth.uid() or public.knowledge_is_leader(auth.uid()));
create policy resource_collections_delete_v10900 on public.resource_collections for delete to authenticated using(owner_id=auth.uid() or public.knowledge_is_leader(auth.uid()));

create policy resource_collection_items_read_v10900 on public.resource_collection_items for select to authenticated using(public.knowledge_can_view_collection(collection_id,auth.uid()));
create policy resource_collection_items_insert_v10900 on public.resource_collection_items for insert to authenticated with check(public.knowledge_can_manage_collection(collection_id,auth.uid()));
create policy resource_collection_items_delete_v10900 on public.resource_collection_items for delete to authenticated using(public.knowledge_can_manage_collection(collection_id,auth.uid()));

create policy resource_saved_searches_all_v10900 on public.resource_saved_searches for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy resource_user_state_all_v10900 on public.resource_user_state for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy resource_index_jobs_read_v10900 on public.resource_index_jobs for select to authenticated using(requested_by=auth.uid() or public.knowledge_is_leader(auth.uid()) or public.knowledge_can_manage_resource(resource_id,auth.uid()));
create policy resource_index_jobs_insert_v10900 on public.resource_index_jobs for insert to authenticated with check(requested_by=auth.uid() and public.knowledge_can_manage_resource(resource_id,auth.uid()));
create policy resource_index_jobs_update_v10900 on public.resource_index_jobs for update to authenticated using(public.knowledge_is_leader(auth.uid())) with check(public.knowledge_is_leader(auth.uid()));

revoke all on public.resource_smart_metadata,public.resource_collections,public.resource_collection_items,public.resource_saved_searches,public.resource_user_state,public.resource_index_jobs from anon;
grant select,insert,update,delete on public.resource_smart_metadata,public.resource_collections,public.resource_collection_items,public.resource_saved_searches,public.resource_user_state,public.resource_index_jobs to authenticated;
grant usage,select on sequence public.resource_index_jobs_id_seq to authenticated;
grant execute on function public.knowledge_try_uuid(text),public.knowledge_is_leader(uuid),public.knowledge_is_approved_user(uuid),public.knowledge_can_manage_resource(uuid,uuid),public.knowledge_can_view_collection(uuid,uuid),public.knowledge_can_manage_collection(uuid,uuid) to authenticated;

do $$ declare t text; begin
  foreach t in array array['resource_smart_metadata','resource_collections','resource_collection_items','resource_user_state','resource_index_jobs'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
exception when undefined_object then raise notice 'supabase_realtime publication is unavailable; polling fallback remains active.';
end $$;

commit;

select 'resource_smart_metadata' as object,count(*) as rows from public.resource_smart_metadata
union all select 'resource_collections',count(*) from public.resource_collections
union all select 'resource_collection_items',count(*) from public.resource_collection_items
union all select 'resource_saved_searches',count(*) from public.resource_saved_searches
union all select 'resource_user_state',count(*) from public.resource_user_state
union all select 'resource_index_jobs',count(*) from public.resource_index_jobs;
