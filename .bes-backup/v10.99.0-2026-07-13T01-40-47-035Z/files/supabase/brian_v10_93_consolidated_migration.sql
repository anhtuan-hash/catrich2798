-- Brian English Studio V10.93.0 Consolidated Migration
-- Runtime Core + Brian AI Workspace + Teaching Content Factory + Assessment Core
-- Safe to rerun. Existing V10.88–V10.90 data is preserved.

begin;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Version and compatible role helpers
-- ---------------------------------------------------------------------------
create table if not exists public.bes_schema_registry (
  component text primary key,
  version text not null,
  installed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

insert into public.bes_schema_registry(component, version, metadata)
values
  ('application', '10.93.0', '{"release":"Consolidated Runtime, AI, Content and Assessment"}'::jsonb),
  ('runtime_core', '1.0.0', '{}'::jsonb),
  ('ai_workspace', '10.91.0', '{}'::jsonb),
  ('content_factory', '10.92.0', '{}'::jsonb),
  ('assessment_core', '10.93.0', '{}'::jsonb)
on conflict(component) do update
set version=excluded.version, installed_at=now(), metadata=excluded.metadata;

create or replace function public.bes_v1093_try_uuid(value text)
returns uuid language plpgsql immutable security invoker set search_path=public,pg_temp as $$
begin
  if value is not null and value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return value::uuid;
  end if;
  return null;
end; $$;

create or replace function public.bes_v1093_profile_uuid(profile_json jsonb)
returns uuid language sql immutable security invoker set search_path=public,pg_temp as $$
  select coalesce(
    public.bes_v1093_try_uuid(profile_json->>'id'),
    public.bes_v1093_try_uuid(profile_json->>'user_id'),
    public.bes_v1093_try_uuid(profile_json->>'profile_id')
  );
$$;

create or replace function public.bes_v1093_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare
  jwt jsonb:=coalesce(auth.jwt(),'{}'::jsonb);
  jwt_role text:=lower(coalesce(jwt->'app_metadata'->>'role',jwt->'user_metadata'->>'role',jwt->>'role',''));
  jwt_email text:=lower(coalesce(jwt->>'email',''));
  matched boolean:=false;
begin
  if target_user is null then return false; end if;
  if target_user=auth.uid() and (
    jwt_role in ('admin','ttcm','leader','department_head','department-head','head')
    or jwt_email='anhtuan@pek.edu.vn'
  ) then return true; end if;
  if to_regclass('public.profiles') is null then return false; end if;
  select exists(
    select 1 from public.profiles p
    cross join lateral (select to_jsonb(p) j) x
    where public.bes_v1093_profile_uuid(x.j)=target_user
      and (
        lower(coalesce(x.j->>'role','')) in ('admin','ttcm','leader','department_head','department-head','head')
        or lower(coalesce(x.j->>'email',''))='anhtuan@pek.edu.vn'
      )
  ) into matched;
  return coalesce(matched,false);
exception when others then return false;
end; $$;

create or replace function public.bes_v1093_is_approved_user(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare matched boolean:=false;
begin
  if target_user is null then return false; end if;
  if public.bes_v1093_is_leader(target_user) then return true; end if;
  if to_regclass('public.profiles') is null then return target_user=auth.uid(); end if;
  select exists(
    select 1 from public.profiles p
    cross join lateral (select to_jsonb(p) j) x
    where public.bes_v1093_profile_uuid(x.j)=target_user
      and lower(coalesce(x.j->>'role','teacher')) not in ('blocked','disabled','rejected')
      and lower(coalesce(x.j->>'status','approved')) not in ('blocked','disabled','rejected')
      and lower(coalesce(x.j->>'approved','true')) not in ('false','0','no')
  ) into matched;
  return coalesce(matched,false);
exception when others then return target_user=auth.uid();
end; $$;

create or replace function public.bes_v1093_set_updated_at()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin new.updated_at=now(); return new; end; $$;

-- ---------------------------------------------------------------------------
-- 2. Ensure Work Hub and Knowledge Core objects remain compatible
-- ---------------------------------------------------------------------------
create table if not exists public.work_hub_items (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null default '',
  item_type text not null default 'task', status text not null default 'draft', priority text not null default 'normal',
  created_by uuid not null default auth.uid(), owner_id uuid not null default auth.uid(),
  assignee_ids uuid[] not null default '{}', watcher_ids uuid[] not null default '{}', visibility text not null default 'restricted',
  start_at timestamptz, due_at timestamptz, submitted_at timestamptz, reviewed_at timestamptz, completed_at timestamptz,
  reviewed_by uuid, source_module text not null default '', source_id text not null default '', attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.work_hub_comments (
  id uuid primary key default gen_random_uuid(), item_id uuid not null references public.work_hub_items(id) on delete cascade,
  author_id uuid not null default auth.uid(), body text not null, comment_type text not null default 'comment',
  attachments jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.resource_smart_metadata(
  resource_id uuid primary key, summary text not null default '', keywords text[] not null default '{}', subjects text[] not null default '{}',
  grade_levels text[] not null default '{}', units text[] not null default '{}', skills text[] not null default '{}', grammar_topics text[] not null default '{}',
  vocabulary_topics text[] not null default '{}', cefr_levels text[] not null default '{}', exam_types text[] not null default '{}',
  lifecycle_status text not null default 'active', quality_score integer not null default 0, review_due_at timestamptz, indexed_at timestamptz,
  embedding_status text not null default 'not_indexed', duplicate_group text not null default '', search_text text not null default '',
  created_by uuid default auth.uid(), updated_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.resource_collections(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid(), title text not null,
  description text not null default '', scope text not null default 'personal', color text not null default 'blue',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.resource_collection_items(
  collection_id uuid not null references public.resource_collections(id) on delete cascade,
  resource_id uuid not null, added_by uuid not null default auth.uid(), added_at timestamptz not null default now(),
  primary key(collection_id,resource_id)
);
create table if not exists public.resource_user_state(
  user_id uuid not null default auth.uid(), resource_id uuid not null, favorite boolean not null default false,
  last_opened_at timestamptz, notes text not null default '', updated_at timestamptz not null default now(),
  primary key(user_id,resource_id)
);

-- Compatible columns for older collections/metadata schemas.
alter table public.resource_collections add column if not exists owner_id uuid default auth.uid();
alter table public.resource_collections add column if not exists title text default '';
alter table public.resource_collections add column if not exists description text default '';
alter table public.resource_collections add column if not exists scope text default 'personal';
alter table public.resource_collections add column if not exists color text default 'blue';
alter table public.resource_collections add column if not exists created_at timestamptz default now();
alter table public.resource_collections add column if not exists updated_at timestamptz default now();
alter table public.resource_smart_metadata add column if not exists summary text default '';
alter table public.resource_smart_metadata add column if not exists keywords text[] default '{}';
alter table public.resource_smart_metadata add column if not exists skills text[] default '{}';
alter table public.resource_smart_metadata add column if not exists cefr_levels text[] default '{}';
alter table public.resource_smart_metadata add column if not exists units text[] default '{}';
alter table public.resource_smart_metadata add column if not exists lifecycle_status text default 'active';
alter table public.resource_smart_metadata add column if not exists quality_score integer default 0;
alter table public.resource_smart_metadata add column if not exists review_due_at timestamptz;
alter table public.resource_smart_metadata add column if not exists duplicate_group text default '';
alter table public.resource_smart_metadata add column if not exists created_by uuid default auth.uid();
alter table public.resource_smart_metadata add column if not exists updated_by uuid default auth.uid();
alter table public.resource_smart_metadata add column if not exists created_at timestamptz default now();
alter table public.resource_smart_metadata add column if not exists updated_at timestamptz default now();

-- ---------------------------------------------------------------------------
-- 3. V10.91 Brian AI Workspace
-- ---------------------------------------------------------------------------
create table if not exists public.ai_workspace_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  title text not null default 'Dự án AI mới',
  mode text not null default 'create',
  instruction text not null default '',
  source_text text not null default '',
  output_text text not null default '',
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_workspace_mode_check check(mode in('ask','create','transform','act')),
  constraint ai_workspace_status_check check(status in('draft','generated','reviewed','archived')),
  constraint ai_workspace_metadata_object check(jsonb_typeof(metadata)='object')
);
create index if not exists ai_workspace_projects_owner_idx on public.ai_workspace_projects(owner_id,updated_at desc);
drop trigger if exists ai_workspace_projects_updated_trg on public.ai_workspace_projects;
create trigger ai_workspace_projects_updated_trg before update on public.ai_workspace_projects for each row execute function public.bes_v1093_set_updated_at();

create table if not exists public.ai_workspace_messages (
  id bigint generated by default as identity primary key,
  project_id uuid not null references public.ai_workspace_projects(id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  role text not null default 'user',
  content text not null,
  provider text not null default '',
  model text not null default '',
  token_usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_workspace_messages_role_check check(role in('system','user','assistant','tool')),
  constraint ai_workspace_messages_usage_object check(jsonb_typeof(token_usage)='object')
);
create index if not exists ai_workspace_messages_project_idx on public.ai_workspace_messages(project_id,created_at);

-- ---------------------------------------------------------------------------
-- 4. V10.92 Teaching Content Factory
-- ---------------------------------------------------------------------------
create table if not exists public.content_factory_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  title text not null default 'Nội dung mới',
  output_type text not null default 'worksheet',
  level text not null default 'B2',
  item_count integer not null default 15,
  instruction text not null default '',
  source_text text not null default '',
  output_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_factory_item_count_check check(item_count between 0 and 500),
  constraint content_factory_output_object check(jsonb_typeof(output_json)='object'),
  constraint content_factory_status_check check(status in('draft','generated','published','archived'))
);
create index if not exists content_factory_projects_owner_idx on public.content_factory_projects(owner_id,updated_at desc);
drop trigger if exists content_factory_projects_updated_trg on public.content_factory_projects;
create trigger content_factory_projects_updated_trg before update on public.content_factory_projects for each row execute function public.bes_v1093_set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. V10.93 Assessment Core
-- ---------------------------------------------------------------------------
create table if not exists public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  visibility text not null default 'department',
  status text not null default 'approved',
  question_type text not null default 'mcq',
  stem text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null default '',
  explanation text not null default '',
  skill text not null default 'Use of English',
  cefr text not null default 'B2',
  topic text not null default '',
  cognitive_level text not null default 'application',
  difficulty integer not null default 3,
  source text not null default '',
  usage_count integer not null default 0,
  statistics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_items_stem_check check(length(btrim(stem))>0),
  constraint assessment_items_visibility_check check(visibility in('personal','department')),
  constraint assessment_items_status_check check(status in('draft','approved','retired','archived')),
  constraint assessment_items_difficulty_check check(difficulty between 1 and 5),
  constraint assessment_items_options_array check(jsonb_typeof(options)='array'),
  constraint assessment_items_statistics_object check(jsonb_typeof(statistics)='object')
);
create index if not exists assessment_items_search_idx on public.assessment_items(skill,cefr,question_type,status);
create index if not exists assessment_items_owner_idx on public.assessment_items(owner_id,updated_at desc);
drop trigger if exists assessment_items_updated_trg on public.assessment_items;
create trigger assessment_items_updated_trg before update on public.assessment_items for each row execute function public.bes_v1093_set_updated_at();

create table if not exists public.assessment_blueprints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  visibility text not null default 'department',
  title text not null,
  total_items integer not null default 40,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_blueprints_count_check check(total_items between 1 and 500),
  constraint assessment_blueprints_criteria_object check(jsonb_typeof(criteria)='object')
);
drop trigger if exists assessment_blueprints_updated_trg on public.assessment_blueprints;
create trigger assessment_blueprints_updated_trg before update on public.assessment_blueprints for each row execute function public.bes_v1093_set_updated_at();

create table if not exists public.assessment_tests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  blueprint_id uuid references public.assessment_blueprints(id) on delete set null,
  visibility text not null default 'department',
  title text not null,
  status text not null default 'draft',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_tests_status_check check(status in('draft','published','closed','archived')),
  constraint assessment_tests_settings_object check(jsonb_typeof(settings)='object')
);
drop trigger if exists assessment_tests_updated_trg on public.assessment_tests;
create trigger assessment_tests_updated_trg before update on public.assessment_tests for each row execute function public.bes_v1093_set_updated_at();

create table if not exists public.assessment_test_items (
  test_id uuid not null references public.assessment_tests(id) on delete cascade,
  item_id uuid not null references public.assessment_items(id) on delete restrict,
  position integer not null,
  option_order jsonb not null default '[]'::jsonb,
  points numeric(8,2) not null default 1,
  primary key(test_id,item_id),
  constraint assessment_test_items_option_array check(jsonb_typeof(option_order)='array')
);
create index if not exists assessment_test_items_position_idx on public.assessment_test_items(test_id,position);

-- ---------------------------------------------------------------------------
-- 6. RLS policies
-- ---------------------------------------------------------------------------
alter table public.bes_schema_registry enable row level security;
alter table public.ai_workspace_projects enable row level security;
alter table public.ai_workspace_messages enable row level security;
alter table public.content_factory_projects enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_blueprints enable row level security;
alter table public.assessment_tests enable row level security;
alter table public.assessment_test_items enable row level security;

-- Drop only V10.93 policy names to keep reruns safe without disturbing unrelated policies.
do $$ declare policy_name text; table_name text; begin
  foreach table_name in array array['bes_schema_registry','ai_workspace_projects','ai_workspace_messages','content_factory_projects','assessment_items','assessment_blueprints','assessment_tests','assessment_test_items'] loop
    for policy_name in select policyname from pg_policies where schemaname='public' and tablename=table_name and policyname like '%_v1093' loop
      execute format('drop policy if exists %I on public.%I',policy_name,table_name);
    end loop;
  end loop;
end $$;

create policy bes_schema_registry_read_v1093 on public.bes_schema_registry for select to authenticated using(true);
create policy bes_schema_registry_manage_v1093 on public.bes_schema_registry for all to authenticated using(public.bes_v1093_is_leader(auth.uid())) with check(public.bes_v1093_is_leader(auth.uid()));

create policy ai_workspace_projects_all_v1093 on public.ai_workspace_projects for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy ai_workspace_messages_all_v1093 on public.ai_workspace_messages for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy content_factory_projects_all_v1093 on public.content_factory_projects for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create policy assessment_items_read_v1093 on public.assessment_items for select to authenticated using(owner_id=auth.uid() or visibility='department' or public.bes_v1093_is_leader(auth.uid()));
create policy assessment_items_insert_v1093 on public.assessment_items for insert to authenticated with check(owner_id=auth.uid());
create policy assessment_items_update_v1093 on public.assessment_items for update to authenticated using(owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid())) with check(owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid()));
create policy assessment_items_delete_v1093 on public.assessment_items for delete to authenticated using(owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid()));

create policy assessment_blueprints_read_v1093 on public.assessment_blueprints for select to authenticated using(owner_id=auth.uid() or visibility='department' or public.bes_v1093_is_leader(auth.uid()));
create policy assessment_blueprints_write_v1093 on public.assessment_blueprints for all to authenticated using(owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid())) with check(owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid()));
create policy assessment_tests_read_v1093 on public.assessment_tests for select to authenticated using(owner_id=auth.uid() or visibility='department' or public.bes_v1093_is_leader(auth.uid()));
create policy assessment_tests_write_v1093 on public.assessment_tests for all to authenticated using(owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid())) with check(owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid()));
create policy assessment_test_items_read_v1093 on public.assessment_test_items for select to authenticated using(exists(select 1 from public.assessment_tests t where t.id=test_id and (t.owner_id=auth.uid() or t.visibility='department' or public.bes_v1093_is_leader(auth.uid()))));
create policy assessment_test_items_write_v1093 on public.assessment_test_items for all to authenticated using(exists(select 1 from public.assessment_tests t where t.id=test_id and (t.owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid())))) with check(exists(select 1 from public.assessment_tests t where t.id=test_id and (t.owner_id=auth.uid() or public.bes_v1093_is_leader(auth.uid()))));

revoke all on public.bes_schema_registry,public.ai_workspace_projects,public.ai_workspace_messages,public.content_factory_projects,public.assessment_items,public.assessment_blueprints,public.assessment_tests,public.assessment_test_items from anon;
grant select on public.bes_schema_registry to authenticated;
grant select,insert,update,delete on public.ai_workspace_projects,public.ai_workspace_messages,public.content_factory_projects,public.assessment_items,public.assessment_blueprints,public.assessment_tests,public.assessment_test_items to authenticated;
grant usage,select on sequence public.ai_workspace_messages_id_seq to authenticated;
grant execute on function public.bes_v1093_try_uuid(text),public.bes_v1093_is_leader(uuid),public.bes_v1093_is_approved_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Realtime registration (optional on projects without the publication)
-- ---------------------------------------------------------------------------
do $$ declare table_name text; begin
  foreach table_name in array array['work_hub_items','work_hub_comments','resource_smart_metadata','resource_collections','resource_collection_items','resource_user_state','ai_workspace_projects','content_factory_projects','assessment_items','assessment_tests','assessment_test_items'] loop
    if to_regclass('public.'||table_name) is not null and not exists(
      select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
exception when undefined_object then
  raise notice 'supabase_realtime publication is unavailable; the application will use manual refresh.';
end $$;

commit;

select component,version,installed_at from public.bes_schema_registry order by component;
select 'ai_workspace_projects' object,count(*) rows from public.ai_workspace_projects
union all select 'content_factory_projects',count(*) from public.content_factory_projects
union all select 'assessment_items',count(*) from public.assessment_items
union all select 'assessment_blueprints',count(*) from public.assessment_blueprints
union all select 'assessment_tests',count(*) from public.assessment_tests;
