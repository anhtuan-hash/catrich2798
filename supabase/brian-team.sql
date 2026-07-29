-- Brian Team 2.0 — personnel workspace for subject-department leaders
-- Re-run safely in Supabase SQL Editor to refresh roles and the account directory RPC.

-- Allow the first-class department_head role while preserving existing aliases in old data.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (lower(coalesce(role, 'teacher')) in (
    'teacher', 'admin', 'department_head', 'department-head',
    'ttcm', 'to_truong', 'tổ trưởng', 'department_leader',
    'department leader', 'subject_leader', 'subject leader', 'leader'
  ));

create or replace function public.can_manage_brian_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approved = true
      and lower(coalesce(role, '')) in (
        'admin', 'department_head', 'department-head',
        'ttcm', 'to_truong', 'tổ trưởng', 'department_leader',
        'department leader', 'subject_leader', 'subject leader', 'leader'
      )
  );
$$;

create table if not exists public.department_team_workspaces (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.department_team_workspaces enable row level security;

drop policy if exists "Brian Team managers can read their workspace" on public.department_team_workspaces;
create policy "Brian Team managers can read their workspace"
  on public.department_team_workspaces
  for select
  using (
    public.can_manage_brian_team()
    and (owner_id = auth.uid() or public.is_admin())
  );

drop policy if exists "Brian Team managers can create their workspace" on public.department_team_workspaces;
create policy "Brian Team managers can create their workspace"
  on public.department_team_workspaces
  for insert
  with check (
    public.can_manage_brian_team()
    and owner_id = auth.uid()
    and updated_by = auth.uid()
  );

drop policy if exists "Brian Team managers can update their workspace" on public.department_team_workspaces;
create policy "Brian Team managers can update their workspace"
  on public.department_team_workspaces
  for update
  using (
    public.can_manage_brian_team()
    and (owner_id = auth.uid() or public.is_admin())
  )
  with check (
    public.can_manage_brian_team()
    and (owner_id = auth.uid() or public.is_admin())
  );

drop policy if exists "Brian Team managers can delete their workspace" on public.department_team_workspaces;
create policy "Brian Team managers can delete their workspace"
  on public.department_team_workspaces
  for delete
  using (
    public.can_manage_brian_team()
    and (owner_id = auth.uid() or public.is_admin())
  );

-- TTCM may choose only existing approved accounts. The UI never creates a free-text person record.
-- Approved Admin accounts are included because an Admin may also teach or lead a department.
create or replace function public.bes_department_list_teacher_accounts()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  approved boolean,
  school text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.approved,
    p.school,
    p.created_at
  from public.profiles p
  where public.can_manage_brian_team()
    and p.approved = true
    and lower(coalesce(p.role, 'teacher')) in (
      'teacher', 'admin', 'department_head', 'department-head',
      'ttcm', 'to_truong', 'tổ trưởng', 'department_leader',
      'department leader', 'subject_leader', 'subject leader', 'leader'
    )
  order by
    case when lower(coalesce(p.role, '')) = 'admin' then 0 else 1 end,
    lower(coalesce(p.full_name, p.email));
$$;

grant execute on function public.can_manage_brian_team() to authenticated;
grant execute on function public.bes_department_list_teacher_accounts() to authenticated;

grant select, insert, update, delete on public.department_team_workspaces to authenticated;

comment on table public.department_team_workspaces is
  'One Brian Team workspace per TTCM account. Members reference public.profiles IDs only; extended teacher profiles are stored in the workspace JSON payload.';
