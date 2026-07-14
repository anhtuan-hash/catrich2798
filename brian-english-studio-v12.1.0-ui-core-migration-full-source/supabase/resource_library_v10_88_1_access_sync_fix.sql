-- Brian English Studio V10.88.1
-- Resource Library cross-account visibility + approval workflow repair
-- Safe to rerun. No resource rows or Google Drive files are deleted.

begin;

-- ---------------------------------------------------------------------------
-- 1. Compatibility columns: older builds used owner_*, newer builds use
--    uploader_*. Keep both names synchronized so old and new UI/API code work.
-- ---------------------------------------------------------------------------

alter table public.resource_items
  add column if not exists owner_id uuid,
  add column if not exists owner_name text not null default '',
  add column if not exists owner_email text not null default '',
  add column if not exists uploader_id uuid,
  add column if not exists uploader_name text not null default '',
  add column if not exists uploader_email text not null default '',
  add column if not exists allowed_user_ids uuid[] not null default '{}',
  add column if not exists visibility text not null default 'department';

update public.resource_items
set
  uploader_id = coalesce(uploader_id, owner_id),
  owner_id = coalesce(owner_id, uploader_id),
  uploader_name = coalesce(nullif(btrim(uploader_name), ''), owner_name, ''),
  owner_name = coalesce(nullif(btrim(owner_name), ''), uploader_name, ''),
  uploader_email = coalesce(nullif(btrim(uploader_email), ''), owner_email, ''),
  owner_email = coalesce(nullif(btrim(owner_email), ''), uploader_email, ''),
  status = lower(btrim(coalesce(status, 'pending'))),
  visibility = lower(btrim(coalesce(visibility, 'department'))),
  updated_at = now();

update public.resource_items
set status = 'pending'
where status not in (
  'draft', 'uploading', 'pending', 'changes_requested',
  'approved', 'rejected', 'archived', 'sync_error'
);

update public.resource_items
set visibility = 'department'
where visibility not in ('department', 'restricted', 'private', 'internal');

-- Approved items are the shared department library. Legacy rows occasionally
-- kept an empty/private default even though the admin had approved them.
update public.resource_items
set visibility = 'department', updated_at = now()
where status = 'approved'
  and (visibility is null or visibility = '' or visibility = 'private');

create index if not exists resource_items_uploader_idx
  on public.resource_items(uploader_id);
create index if not exists resource_items_owner_compat_idx
  on public.resource_items(owner_id);
create index if not exists resource_items_status_normalized_idx
  on public.resource_items((lower(btrim(status))));

-- Keep compatibility fields synchronized for future inserts and updates.
create or replace function public.resource_sync_identity_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
begin
  if new.uploader_id is null and new.owner_id is null then
    new.uploader_id := auth.uid();
    new.owner_id := auth.uid();
  elsif new.uploader_id is null then
    new.uploader_id := new.owner_id;
  elsif new.owner_id is null then
    new.owner_id := new.uploader_id;
  end if;

  if coalesce(btrim(new.uploader_name), '') = '' then
    new.uploader_name := coalesce(new.owner_name, '');
  end if;
  if coalesce(btrim(new.owner_name), '') = '' then
    new.owner_name := coalesce(new.uploader_name, '');
  end if;
  if coalesce(btrim(new.uploader_email), '') = '' then
    new.uploader_email := coalesce(new.owner_email, '');
  end if;
  if coalesce(btrim(new.owner_email), '') = '' then
    new.owner_email := coalesce(new.uploader_email, '');
  end if;

  new.status := lower(btrim(coalesce(new.status, 'pending')));
  if new.status not in (
    'draft', 'uploading', 'pending', 'changes_requested',
    'approved', 'rejected', 'archived', 'sync_error'
  ) then
    new.status := 'pending';
  end if;

  new.visibility := lower(btrim(coalesce(new.visibility, 'department')));
  if new.visibility not in ('department', 'restricted', 'private', 'internal') then
    new.visibility := 'department';
  end if;

  if new.status = 'approved' and new.visibility = 'private' then
    new.visibility := 'department';
  end if;

  return new;
end;
$$;

drop trigger if exists resource_items_sync_identity_fields on public.resource_items;
create trigger resource_items_sync_identity_fields
before insert or update on public.resource_items
for each row execute function public.resource_sync_identity_fields();

-- ---------------------------------------------------------------------------
-- 2. Robust leader detection.
--    The frontend can recognise Admin by app state/email while an older RLS
--    helper may fail because profiles uses id/user_id/profile_id differently.
-- ---------------------------------------------------------------------------

create or replace function public.resource_is_leader(p_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role text := '';
  v_email text := '';
  v_id_column text;
  v_sql text;
  v_result boolean := false;
  v_role_aliases text[] := array[
    'admin', 'administrator', 'superadmin', 'super_admin',
    'ttcm', 'to_truong', 'tổ trưởng',
    'department_leader', 'department leader',
    'subject_leader', 'subject leader',
    'leader', 'head', 'manager'
  ];
begin
  if p_user_id is null then
    return false;
  end if;

  -- JWT claims, when available.
  begin
    v_role := lower(btrim(coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )));
    v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
    if v_role = any(v_role_aliases) then
      return true;
    end if;
  exception when others then
    null;
  end;

  -- Auth record: supports projects where the app recognises Admin by email.
  begin
    select
      lower(btrim(coalesce(u.email, ''))),
      lower(btrim(coalesce(
        u.raw_app_meta_data ->> 'role',
        u.raw_user_meta_data ->> 'role',
        ''
      )))
    into v_email, v_role
    from auth.users u
    where u.id = p_user_id;

    if v_email = 'anhtuan@pek.edu.vn' or v_role = any(v_role_aliases) then
      return true;
    end if;
  exception when others then
    null;
  end;

  if to_regclass('public.profiles') is null then
    return false;
  end if;

  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
    ) then 'id'
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
    ) then 'user_id'
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'profile_id'
    ) then 'profile_id'
    else null
  end into v_id_column;

  if v_id_column is null then
    return false;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    v_sql := format(
      'select exists (
         select 1 from public.profiles p
         where p.%I::text = $1::text
           and lower(btrim(coalesce(p.role::text, ''''))) = any($2)
       )',
      v_id_column
    );
    execute v_sql into v_result using p_user_id, v_role_aliases;
    if coalesce(v_result, false) then
      return true;
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) then
    v_sql := format(
      'select exists (
         select 1 from public.profiles p
         where p.%I::text = $1::text
           and lower(btrim(coalesce(p.email::text, ''''))) = ''anhtuan@pek.edu.vn''
       )',
      v_id_column
    );
    execute v_sql into v_result using p_user_id;
    if coalesce(v_result, false) then
      return true;
    end if;
  end if;

  return false;
exception when others then
  return false;
end;
$$;

revoke all on function public.resource_is_leader(uuid) from public;
grant execute on function public.resource_is_leader(uuid) to authenticated;

-- Support both the old user_id schema and the newer owner_user_id schema
-- without exposing refresh tokens to the browser.
create or replace function public.resource_is_drive_owner(p_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_column text;
  v_condition text := 'true';
  v_sql text;
  v_result boolean := false;
begin
  if p_user_id is null or to_regclass('public.resource_drive_connections') is null then
    return false;
  end if;

  select case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'resource_drive_connections'
        and column_name = 'owner_user_id'
    ) then 'owner_user_id'
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'resource_drive_connections'
        and column_name = 'user_id'
    ) then 'user_id'
    else null
  end into v_user_column;

  if v_user_column is null then
    return false;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resource_drive_connections'
      and column_name = 'is_active'
  ) then
    v_condition := 'coalesce(is_active, false) = true';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resource_drive_connections'
      and column_name = 'status'
  ) then
    v_condition := 'lower(coalesce(status::text, '''')) = ''connected''';
  end if;

  v_sql := format(
    'select exists (
       select 1 from public.resource_drive_connections
       where %I::text = $1::text and %s
     )',
    v_user_column,
    v_condition
  );
  execute v_sql into v_result using p_user_id;
  return coalesce(v_result, false);
exception when others then
  return false;
end;
$$;

revoke all on function public.resource_is_drive_owner(uuid) from public;
grant execute on function public.resource_is_drive_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Replace conflicting/legacy policies with one authoritative workflow.
-- ---------------------------------------------------------------------------

alter table public.resource_items enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'resource_items'
  loop
    execute format('drop policy if exists %I on public.resource_items', p.policyname);
  end loop;
end $$;

-- Teachers can see every approved item in the shared library, plus their own
-- pending/revision items. Admin/TTCM/Drive owner can see every workflow state.
create policy resource_items_read_v10881
on public.resource_items
for select
to authenticated
using (
  lower(btrim(coalesce(status, ''))) = 'approved'
  or coalesce(uploader_id, owner_id) = auth.uid()
  or auth.uid() = any(coalesce(allowed_user_ids, '{}'::uuid[]))
  or public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
);

create policy resource_items_insert_v10881
on public.resource_items
for insert
to authenticated
with check (
  coalesce(uploader_id, owner_id) = auth.uid()
  or public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
);

create policy resource_items_update_v10881
on public.resource_items
for update
to authenticated
using (
  public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
  or (
    coalesce(uploader_id, owner_id) = auth.uid()
    and lower(btrim(coalesce(status, ''))) in (
      'draft', 'uploading', 'pending', 'changes_requested', 'rejected', 'sync_error'
    )
  )
)
with check (
  public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
  or (
    coalesce(uploader_id, owner_id) = auth.uid()
    and lower(btrim(coalesce(status, ''))) in (
      'draft', 'uploading', 'pending', 'changes_requested', 'rejected', 'sync_error'
    )
  )
);

create policy resource_items_delete_v10881
on public.resource_items
for delete
to authenticated
using (
  public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
);

grant select, insert, update, delete on table public.resource_items to authenticated;

-- Approval records: submitter can read their own request; Admin/TTCM can read
-- and review every request.
do $$
declare p record;
begin
  if to_regclass('public.resource_approvals') is not null then
    execute 'alter table public.resource_approvals enable row level security';
    for p in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'resource_approvals'
    loop
      execute format('drop policy if exists %I on public.resource_approvals', p.policyname);
    end loop;
  end if;
end $$;

create policy resource_approvals_read_v10881
on public.resource_approvals
for select
to authenticated
using (
  submitter_id = auth.uid()
  or reviewer_id = auth.uid()
  or public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
);

create policy resource_approvals_insert_v10881
on public.resource_approvals
for insert
to authenticated
with check (
  submitter_id = auth.uid()
  or public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
);

create policy resource_approvals_update_v10881
on public.resource_approvals
for update
to authenticated
using (
  public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
)
with check (
  public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
);

create policy resource_approvals_delete_v10881
on public.resource_approvals
for delete
to authenticated
using (
  public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
);

grant select, insert, update, delete on table public.resource_approvals to authenticated;

-- Keep the sensitive OAuth table server-side only.
revoke all on table public.resource_drive_connections from anon, authenticated;

-- Categories and the overview remain readable by signed-in users.
grant select on table public.resource_categories to authenticated;
grant select on table public.resource_category_overview to authenticated;

-- Realtime refresh for upload/approval changes.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'resource_items'
     ) then
    execute 'alter publication supabase_realtime add table public.resource_items';
  end if;
exception when duplicate_object then
  null;
end $$;

notify pgrst, 'reload schema';

commit;

-- ---------------------------------------------------------------------------
-- 4. Verification output in Supabase SQL Editor.
-- ---------------------------------------------------------------------------

select
  status,
  visibility,
  count(*) as item_count
from public.resource_items
group by status, visibility
order by status, visibility;

select
  id,
  title,
  status,
  visibility,
  coalesce(uploader_id, owner_id) as submitted_by,
  coalesce(nullif(uploader_name, ''), owner_name) as submitter_name,
  updated_at
from public.resource_items
order by updated_at desc
limit 30;
