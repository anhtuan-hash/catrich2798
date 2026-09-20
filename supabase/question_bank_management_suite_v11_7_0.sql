-- Brian v11.7.0 · Question Bank Management Suite
-- Adds version history, review metadata, taxonomy, backups, practice delivery and empirical item-performance data.

alter table public.assessment_items
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_by uuid null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists archived_at timestamptz null;

alter table public.assessment_bundles
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_by uuid null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists archived_at timestamptz null;

create table if not exists public.assessment_item_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.assessment_items(id) on delete cascade,
  owner_id uuid not null,
  version_no integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  reason text not null default 'edit',
  created_by uuid null,
  created_at timestamptz not null default now(),
  unique(item_id, version_no)
);

create table if not exists public.assessment_bundle_versions (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.assessment_bundles(id) on delete cascade,
  owner_id uuid not null,
  version_no integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  reason text not null default 'edit',
  created_by uuid null,
  created_at timestamptz not null default now(),
  unique(bundle_id, version_no)
);

create table if not exists public.assessment_taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  visibility text not null default 'personal' check (visibility in ('personal','private','department')),
  kind text not null check (kind in ('topic','grammar_point','tag','skill','question_type','source')),
  canonical_value text not null,
  aliases text[] not null default '{}'::text[],
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists assessment_taxonomy_owner_kind_value_uq on public.assessment_taxonomy_terms(owner_id,kind,lower(canonical_value));

create table if not exists public.assessment_bank_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  title text not null default '',
  item_count integer not null default 0,
  bundle_count integer not null default 0,
  blueprint_count integer not null default 0,
  test_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_practice_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  visibility text not null default 'personal' check (visibility in ('personal','private','department')),
  title text not null,
  status text not null default 'draft' check (status in ('draft','published','closed','archived')),
  settings jsonb not null default '{}'::jsonb,
  grade smallint null,
  school_year text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.assessment_practice_items (
  practice_id uuid not null references public.assessment_practice_sets(id) on delete cascade,
  item_id uuid not null references public.assessment_items(id) on delete restrict,
  position integer not null,
  points numeric not null default 1,
  primary key(practice_id,item_id),
  unique(practice_id,position)
);
create table if not exists public.assessment_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.assessment_practice_sets(id) on delete cascade,
  learner_id uuid not null default auth.uid(),
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  score numeric not null default 0,
  max_score numeric not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.assessment_practice_responses (
  attempt_id uuid not null references public.assessment_practice_attempts(id) on delete cascade,
  item_id uuid not null references public.assessment_items(id) on delete restrict,
  selected_answer text not null default '',
  is_correct boolean not null default false,
  response_time_seconds integer null,
  created_at timestamptz not null default now(),
  primary key(attempt_id,item_id)
);

create index if not exists assessment_item_versions_item_idx on public.assessment_item_versions(item_id,version_no desc);
create index if not exists assessment_bundle_versions_bundle_idx on public.assessment_bundle_versions(bundle_id,version_no desc);
create index if not exists assessment_snapshots_owner_idx on public.assessment_bank_snapshots(owner_id,created_at desc);
create index if not exists assessment_practice_sets_owner_idx on public.assessment_practice_sets(owner_id,updated_at desc);
create index if not exists assessment_practice_items_item_idx on public.assessment_practice_items(item_id);
create index if not exists assessment_practice_attempts_practice_idx on public.assessment_practice_attempts(practice_id,submitted_at desc);
create index if not exists assessment_practice_responses_item_idx on public.assessment_practice_responses(item_id,is_correct);

alter table public.assessment_item_versions enable row level security;
alter table public.assessment_bundle_versions enable row level security;
alter table public.assessment_taxonomy_terms enable row level security;
alter table public.assessment_bank_snapshots enable row level security;
alter table public.assessment_practice_sets enable row level security;
alter table public.assessment_practice_items enable row level security;
alter table public.assessment_practice_attempts enable row level security;
alter table public.assessment_practice_responses enable row level security;

drop policy if exists assessment_item_versions_read on public.assessment_item_versions;
create policy assessment_item_versions_read on public.assessment_item_versions for select using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));
drop policy if exists assessment_item_versions_write on public.assessment_item_versions;
create policy assessment_item_versions_write on public.assessment_item_versions for all using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid())))) with check (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_bundle_versions_read on public.assessment_bundle_versions;
create policy assessment_bundle_versions_read on public.assessment_bundle_versions for select using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));
drop policy if exists assessment_bundle_versions_write on public.assessment_bundle_versions;
create policy assessment_bundle_versions_write on public.assessment_bundle_versions for all using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid())))) with check (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_taxonomy_read on public.assessment_taxonomy_terms;
create policy assessment_taxonomy_read on public.assessment_taxonomy_terms for select using (owner_id=(select auth.uid()) or visibility='department' or (select public.bes_v1093_is_leader((select auth.uid()))));
drop policy if exists assessment_taxonomy_write on public.assessment_taxonomy_terms;
create policy assessment_taxonomy_write on public.assessment_taxonomy_terms for all using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid())))) with check (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_snapshots_owner on public.assessment_bank_snapshots;
create policy assessment_snapshots_owner on public.assessment_bank_snapshots for all using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));

drop policy if exists assessment_practice_sets_read on public.assessment_practice_sets;
create policy assessment_practice_sets_read on public.assessment_practice_sets for select using (owner_id=(select auth.uid()) or visibility='department' or (select public.bes_v1093_is_leader((select auth.uid()))));
drop policy if exists assessment_practice_sets_write on public.assessment_practice_sets;
create policy assessment_practice_sets_write on public.assessment_practice_sets for all using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid())))) with check (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_practice_items_read on public.assessment_practice_items;
create policy assessment_practice_items_read on public.assessment_practice_items for select using (exists (select 1 from public.assessment_practice_sets p where p.id=practice_id and (p.owner_id=(select auth.uid()) or p.visibility='department' or (select public.bes_v1093_is_leader((select auth.uid()))))));
drop policy if exists assessment_practice_items_write on public.assessment_practice_items;
create policy assessment_practice_items_write on public.assessment_practice_items for all using (exists (select 1 from public.assessment_practice_sets p where p.id=practice_id and (p.owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid())))))) with check (exists (select 1 from public.assessment_practice_sets p where p.id=practice_id and (p.owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))))));

drop policy if exists assessment_practice_attempts_access on public.assessment_practice_attempts;
create policy assessment_practice_attempts_access on public.assessment_practice_attempts for all using (learner_id=(select auth.uid()) or exists (select 1 from public.assessment_practice_sets p where p.id=practice_id and (p.owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid())))))) with check (learner_id=(select auth.uid()) or exists (select 1 from public.assessment_practice_sets p where p.id=practice_id and (p.owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))))));

drop policy if exists assessment_practice_responses_access on public.assessment_practice_responses;
create policy assessment_practice_responses_access on public.assessment_practice_responses for all using (exists (select 1 from public.assessment_practice_attempts a join public.assessment_practice_sets p on p.id=a.practice_id where a.id=attempt_id and (a.learner_id=(select auth.uid()) or p.owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid())))))) with check (exists (select 1 from public.assessment_practice_attempts a join public.assessment_practice_sets p on p.id=a.practice_id where a.id=attempt_id and (a.learner_id=(select auth.uid()) or p.owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))))));

grant select,insert,update,delete on public.assessment_item_versions,public.assessment_bundle_versions,public.assessment_taxonomy_terms,public.assessment_bank_snapshots,public.assessment_practice_sets,public.assessment_practice_items,public.assessment_practice_attempts,public.assessment_practice_responses to authenticated;

create or replace function public.qb_capture_item_version() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if ((to_jsonb(old)-array['updated_at','usage_count','statistics']) is distinct from (to_jsonb(new)-array['updated_at','usage_count','statistics'])) then
    insert into public.assessment_item_versions(item_id,owner_id,version_no,snapshot,reason,created_by)
    values(old.id,old.owner_id,coalesce((select max(v.version_no)+1 from public.assessment_item_versions v where v.item_id=old.id),1),to_jsonb(old),'edit',auth.uid());
  end if;
  return new;
end; $$;
drop trigger if exists trg_qb_capture_item_version on public.assessment_items;
create trigger trg_qb_capture_item_version before update on public.assessment_items for each row execute function public.qb_capture_item_version();

create or replace function public.qb_capture_bundle_version() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if ((to_jsonb(old)-array['updated_at']) is distinct from (to_jsonb(new)-array['updated_at'])) then
    insert into public.assessment_bundle_versions(bundle_id,owner_id,version_no,snapshot,reason,created_by)
    values(old.id,old.owner_id,coalesce((select max(v.version_no)+1 from public.assessment_bundle_versions v where v.bundle_id=old.id),1),to_jsonb(old),'edit',auth.uid());
  end if;
  return new;
end; $$;
drop trigger if exists trg_qb_capture_bundle_version on public.assessment_bundles;
create trigger trg_qb_capture_bundle_version before update on public.assessment_bundles for each row execute function public.qb_capture_bundle_version();

create or replace function public.qb_recompute_item_statistics(p_item_ids uuid[] default null)
returns integer language plpgsql security invoker set search_path=public as $$
declare updated_count integer;
begin
  with stats as (
    select i.id,count(r.*)::int response_count,count(r.*) filter(where r.is_correct)::int correct_count,
      case when count(r.*)>0 then round((count(r.*) filter(where r.is_correct))::numeric/count(r.*)::numeric*100,1) else null end correct_percent,
      avg(r.response_time_seconds)::numeric(10,1) avg_response_seconds
    from public.assessment_items i
    left join public.assessment_practice_responses r on r.item_id=i.id
    where i.owner_id=(select auth.uid()) and (p_item_ids is null or i.id=any(p_item_ids))
    group by i.id
  )
  update public.assessment_items i
  set statistics=coalesce(i.statistics,'{}'::jsonb)||jsonb_build_object('responseCount',s.response_count,'correctCount',s.correct_count,'correctPercent',s.correct_percent,'avgResponseSeconds',s.avg_response_seconds,'lastRecomputedAt',now()),updated_at=now()
  from stats s where i.id=s.id;
  get diagnostics updated_count=row_count;
  return updated_count;
end; $$;
grant execute on function public.qb_recompute_item_statistics(uuid[]) to authenticated;
