-- Brian Question Bank shared read-only access
-- Admin/TTCM may explicitly grant Assessment Core usage to approved teachers.
-- Granted teachers can read the shared leader-owned bank and create/use their own tests,
-- but cannot insert, update or delete bank questions or bundles.

create or replace function public.qb_can_use_assessment()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and (
      private.bes_is_app_leader(auth.uid())
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.approved = true
          and coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:assessment-core'
      )
    );
$function$;

revoke all on function public.qb_can_use_assessment() from public, anon;
grant execute on function public.qb_can_use_assessment() to authenticated, service_role;

create or replace function public.qb_can_read_shared_assessment_owner(target_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select public.qb_can_use_assessment()
    and target_owner is not null
    and private.bes_is_app_leader(target_owner);
$function$;

revoke all on function public.qb_can_read_shared_assessment_owner(uuid) from public, anon;
grant execute on function public.qb_can_read_shared_assessment_owner(uuid) to authenticated, service_role;

create or replace function public.qb_can_contribute_assessment_for_user(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select target_user is not null and private.bes_is_app_leader(target_user);
$function$;

revoke all on function public.qb_can_contribute_assessment_for_user(uuid) from public, anon, authenticated;
grant execute on function public.qb_can_contribute_assessment_for_user(uuid) to service_role;

create or replace function public.qb_access_state()
returns table (
  can_use boolean,
  can_share boolean,
  can_contribute boolean,
  shared_owner_ids uuid[]
)
language sql
stable
security definer
set search_path = ''
as $function$
  with current_access as (
    select
      public.qb_can_use_assessment() as allowed,
      private.bes_is_app_leader(auth.uid()) as leader
  ),
  leader_owners as (
    select distinct owner_id
    from (
      select owner_id from public.assessment_items
      union all
      select owner_id from public.assessment_bundles
      union all
      select owner_id from public.assessment_tests
      union all
      select owner_id from public.assessment_blueprints
    ) source_owners
    where owner_id is not null
      and private.bes_is_app_leader(owner_id)
  )
  select
    current_access.allowed,
    current_access.leader,
    current_access.leader,
    case
      when current_access.allowed then coalesce((select array_agg(owner_id order by owner_id) from leader_owners), array[]::uuid[])
      else array[]::uuid[]
    end
  from current_access;
$function$;

revoke all on function public.qb_access_state() from public, anon;
grant execute on function public.qb_access_state() to authenticated, service_role;

create or replace function public.qb_list_access_users()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  assessment_enabled boolean,
  inherited_leader_access boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not private.bes_is_app_leader(auth.uid()) then
    raise exception 'Only Admin/TTCM may manage Assessment Core access.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.username), ''), p.email),
    p.email,
    p.role,
    (
      private.bes_is_app_leader(p.id)
      or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:assessment-core'
    ),
    private.bes_is_app_leader(p.id)
  from public.profiles p
  where p.approved = true
    and p.id <> auth.uid()
  order by lower(coalesce(p.full_name, p.username, p.email));
end;
$function$;

revoke all on function public.qb_list_access_users() from public, anon;
grant execute on function public.qb_list_access_users() to authenticated, service_role;

create or replace function public.qb_set_user_access(p_user_id uuid, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_permissions jsonb;
  current_allowed text[];
  next_allowed text[];
begin
  if not private.bes_is_app_leader(auth.uid()) then
    raise exception 'Only Admin/TTCM may manage Assessment Core access.'
      using errcode = '42501';
  end if;

  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'Choose another approved teacher account.'
      using errcode = '22023';
  end if;

  if private.bes_is_app_leader(p_user_id) then
    return true;
  end if;

  select coalesce(
      p.permissions,
      '{"mode":"all","allowed":[]}'::jsonb
    )
  into current_permissions
  from public.profiles p
  where p.id = p_user_id
    and p.approved = true
  for update;

  if current_permissions is null then
    raise exception 'Approved teacher account not found.'
      using errcode = 'P0002';
  end if;

  select coalesce(array_agg(value), array[]::text[])
  into current_allowed
  from jsonb_array_elements_text(coalesce(current_permissions -> 'allowed', '[]'::jsonb)) as values_list(value);

  if coalesce(p_enabled, false) then
    if not ('route:assessment-core' = any(current_allowed)) then
      next_allowed := array_append(current_allowed, 'route:assessment-core');
    else
      next_allowed := current_allowed;
    end if;
  else
    next_allowed := array_remove(current_allowed, 'route:assessment-core');
  end if;

  update public.profiles
  set permissions = jsonb_set(
        current_permissions,
        '{allowed}',
        to_jsonb(coalesce(next_allowed, array[]::text[])),
        true
      ),
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$function$;

revoke all on function public.qb_set_user_access(uuid, boolean) from public, anon;
grant execute on function public.qb_set_user_access(uuid, boolean) to authenticated, service_role;

-- Shared read access: granted teachers can read leader-owned bank content.
drop policy if exists assessment_items_read_v1093 on public.assessment_items;
create policy assessment_items_read_v1093
on public.assessment_items
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.qb_can_read_shared_assessment_owner(owner_id)
  or (
    visibility = 'department'
    and department_id = public.qb_current_department_id((select auth.uid()))
  )
  or public.bes_v1093_is_leader((select auth.uid()))
);

drop policy if exists assessment_bundles_read_brian_qb on public.assessment_bundles;
create policy assessment_bundles_read_brian_qb
on public.assessment_bundles
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.qb_can_read_shared_assessment_owner(owner_id)
  or (
    visibility = 'department'
    and department_id = public.qb_current_department_id((select auth.uid()))
  )
  or public.bes_v1093_is_leader((select auth.uid()))
);

drop policy if exists assessment_tests_read_v1093 on public.assessment_tests;
create policy assessment_tests_read_v1093
on public.assessment_tests
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.qb_can_read_shared_assessment_owner(owner_id)
  or (
    visibility = 'department'
    and department_id = public.qb_current_department_id((select auth.uid()))
  )
  or public.bes_v1093_is_leader((select auth.uid()))
);

drop policy if exists assessment_blueprints_read_v1093 on public.assessment_blueprints;
create policy assessment_blueprints_read_v1093
on public.assessment_blueprints
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.qb_can_read_shared_assessment_owner(owner_id)
  or (
    visibility = 'department'
    and department_id = public.qb_current_department_id((select auth.uid()))
  )
  or public.bes_v1093_is_leader((select auth.uid()))
);

drop policy if exists assessment_test_items_read_v1093 on public.assessment_test_items;
create policy assessment_test_items_read_v1093
on public.assessment_test_items
for select
to authenticated
using (
  exists (
    select 1
    from public.assessment_tests t
    where t.id = assessment_test_items.test_id
      and (
        t.owner_id = (select auth.uid())
        or public.qb_can_read_shared_assessment_owner(t.owner_id)
        or t.visibility = 'department'
        or public.bes_v1093_is_leader((select auth.uid()))
      )
  )
);

-- Question-bank writes remain leader-only. Teachers with "use" access are read-only
-- for questions and bundles even if they call Supabase directly.
drop policy if exists assessment_items_insert_v1093 on public.assessment_items;
create policy assessment_items_insert_v1093
on public.assessment_items
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and public.bes_v1093_is_leader((select auth.uid()))
);

drop policy if exists assessment_items_update_v1093 on public.assessment_items;
create policy assessment_items_update_v1093
on public.assessment_items
for update
to authenticated
using (public.bes_v1093_is_leader((select auth.uid())))
with check (public.bes_v1093_is_leader((select auth.uid())));

drop policy if exists assessment_items_delete_v1093 on public.assessment_items;
create policy assessment_items_delete_v1093
on public.assessment_items
for delete
to authenticated
using (public.bes_v1093_is_leader((select auth.uid())));

drop policy if exists assessment_bundles_insert_brian_qb on public.assessment_bundles;
create policy assessment_bundles_insert_brian_qb
on public.assessment_bundles
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and public.bes_v1093_is_leader((select auth.uid()))
);

drop policy if exists assessment_bundles_update_brian_qb on public.assessment_bundles;
create policy assessment_bundles_update_brian_qb
on public.assessment_bundles
for update
to authenticated
using (public.bes_v1093_is_leader((select auth.uid())))
with check (public.bes_v1093_is_leader((select auth.uid())));

drop policy if exists assessment_bundles_delete_brian_qb on public.assessment_bundles;
create policy assessment_bundles_delete_brian_qb
on public.assessment_bundles
for delete
to authenticated
using (public.bes_v1093_is_leader((select auth.uid())));

comment on function public.qb_set_user_access(uuid, boolean) is
'Admin/TTCM grant or revoke explicit Assessment Core use. This never grants question-bank contribution rights.';
