-- Brian v11.8.0 · Department-scoped Question Bank
-- Requires the v11.7 Question Bank management schema.

create or replace function public.qb_current_department_id(p_user_id uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select dm.department_id
  from public.department_members dm
  where dm.user_id=p_user_id and dm.active=true
  order by case when dm.role in ('leader','head','ttcm') then 0 else 1 end, dm.created_at
  limit 1
$$;

revoke execute on function public.qb_current_department_id(uuid) from public,anon;
grant execute on function public.qb_current_department_id(uuid) to authenticated,service_role;

alter table public.assessment_items add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.assessment_bundles add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.assessment_blueprints add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.assessment_tests add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.assessment_taxonomy_terms add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.assessment_practice_sets add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.assessment_exam_batches add column if not exists department_id uuid references public.departments(id) on delete set null;

create or replace function public.qb_set_department_id()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.department_id is null then
    new.department_id := public.qb_current_department_id(new.owner_id);
  end if;
  return new;
end;
$$;

revoke execute on function public.qb_set_department_id() from public,anon,authenticated;

drop trigger if exists trg_qb_set_department_id on public.assessment_items;
create trigger trg_qb_set_department_id before insert or update of owner_id,department_id,visibility on public.assessment_items for each row execute function public.qb_set_department_id();
drop trigger if exists trg_qb_set_department_id on public.assessment_bundles;
create trigger trg_qb_set_department_id before insert or update of owner_id,department_id,visibility on public.assessment_bundles for each row execute function public.qb_set_department_id();
drop trigger if exists trg_qb_set_department_id on public.assessment_blueprints;
create trigger trg_qb_set_department_id before insert or update of owner_id,department_id,visibility on public.assessment_blueprints for each row execute function public.qb_set_department_id();
drop trigger if exists trg_qb_set_department_id on public.assessment_tests;
create trigger trg_qb_set_department_id before insert or update of owner_id,department_id,visibility on public.assessment_tests for each row execute function public.qb_set_department_id();
drop trigger if exists trg_qb_set_department_id on public.assessment_taxonomy_terms;
create trigger trg_qb_set_department_id before insert or update of owner_id,department_id,visibility on public.assessment_taxonomy_terms for each row execute function public.qb_set_department_id();
drop trigger if exists trg_qb_set_department_id on public.assessment_practice_sets;
create trigger trg_qb_set_department_id before insert or update of owner_id,department_id,visibility on public.assessment_practice_sets for each row execute function public.qb_set_department_id();
drop trigger if exists trg_qb_set_department_id on public.assessment_exam_batches;
create trigger trg_qb_set_department_id before insert or update of owner_id,department_id on public.assessment_exam_batches for each row execute function public.qb_set_department_id();

create index if not exists assessment_items_department_idx on public.assessment_items(department_id,status,updated_at desc);
create index if not exists assessment_bundles_department_idx on public.assessment_bundles(department_id,status,updated_at desc);
create index if not exists assessment_blueprints_department_idx on public.assessment_blueprints(department_id,updated_at desc);
create index if not exists assessment_tests_department_idx on public.assessment_tests(department_id,updated_at desc);
create index if not exists assessment_taxonomy_department_idx on public.assessment_taxonomy_terms(department_id,kind);
create index if not exists assessment_practice_sets_department_idx on public.assessment_practice_sets(department_id,status,updated_at desc);

drop policy if exists assessment_items_read_v1093 on public.assessment_items;
create policy assessment_items_read_v1093 on public.assessment_items for select
using (owner_id=(select auth.uid()) or (visibility='department' and department_id=public.qb_current_department_id((select auth.uid()))) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_bundles_read_brian_qb on public.assessment_bundles;
create policy assessment_bundles_read_brian_qb on public.assessment_bundles for select
using (owner_id=(select auth.uid()) or (visibility='department' and department_id=public.qb_current_department_id((select auth.uid()))) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_blueprints_read_v1093 on public.assessment_blueprints;
create policy assessment_blueprints_read_v1093 on public.assessment_blueprints for select
using (owner_id=(select auth.uid()) or (visibility='department' and department_id=public.qb_current_department_id((select auth.uid()))) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_tests_read_v1093 on public.assessment_tests;
create policy assessment_tests_read_v1093 on public.assessment_tests for select
using (owner_id=(select auth.uid()) or (visibility='department' and department_id=public.qb_current_department_id((select auth.uid()))) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_taxonomy_read on public.assessment_taxonomy_terms;
create policy assessment_taxonomy_read on public.assessment_taxonomy_terms for select
using (owner_id=(select auth.uid()) or (visibility='department' and department_id=public.qb_current_department_id((select auth.uid()))) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_practice_sets_read on public.assessment_practice_sets;
create policy assessment_practice_sets_read on public.assessment_practice_sets for select
using (owner_id=(select auth.uid()) or (visibility='department' and department_id=public.qb_current_department_id((select auth.uid()))) or (select public.bes_v1093_is_leader((select auth.uid()))));

create or replace function public.qb_department_contributor_stats()
returns table(
  user_id uuid, display_name text, email text, member_role text,
  total_items bigint, department_items bigint, draft_items bigint, review_items bigint,
  approved_items bigint, archived_items bigint, bundle_count bigint, test_count bigint,
  latest_contribution timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  with ctx as (select public.qb_current_department_id(auth.uid()) department_id),
  members as (
    select dm.user_id,dm.display_name,dm.email,dm.role
    from public.department_members dm,ctx
    where dm.department_id=ctx.department_id and dm.active=true
  )
  select
    m.user_id,m.display_name,m.email,m.role,
    count(i.id) filter(where i.visibility='department')::bigint,
    count(i.id) filter(where i.visibility='department')::bigint,
    count(i.id) filter(where i.visibility='department' and i.status='draft')::bigint,
    count(i.id) filter(where i.visibility='department' and i.status='review')::bigint,
    count(i.id) filter(where i.visibility='department' and i.status='approved')::bigint,
    count(i.id) filter(where i.visibility='department' and i.status='archived')::bigint,
    (select count(*) from public.assessment_bundles b where b.owner_id=m.user_id and b.department_id=(select department_id from ctx) and b.visibility='department')::bigint,
    (select count(*) from public.assessment_tests t where t.owner_id=m.user_id and t.department_id=(select department_id from ctx) and t.visibility='department')::bigint,
    max(i.updated_at) filter(where i.visibility='department')
  from members m
  left join public.assessment_items i on i.owner_id=m.user_id and i.department_id=(select department_id from ctx)
  group by m.user_id,m.display_name,m.email,m.role
  order by count(i.id) filter(where i.visibility='department') desc,m.display_name
$$;

revoke execute on function public.qb_department_contributor_stats() from public,anon;
grant execute on function public.qb_department_contributor_stats() to authenticated,service_role;
