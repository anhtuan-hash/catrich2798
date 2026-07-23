-- Professional Hub core schema
-- Phase 2.1A: design and verification only.
-- Do not apply to Production before explicit approval.

begin;

create extension if not exists pgcrypto;

create table if not exists public.professional_hubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  subject text,
  school_year text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_hub_members (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null
    references public.professional_hubs(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role text not null
    check (role in ('leader', 'teacher')),
  membership_status text not null default 'active'
    check (
      membership_status in (
        'invited',
        'active',
        'suspended',
        'left'
      )
    ),
  joined_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hub_id, user_id)
);

create table if not exists public.professional_hub_tasks (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null
    references public.professional_hubs(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 240),
  description text,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  due_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, hub_id)
);

create table if not exists public.professional_hub_task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  hub_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'assigned'
    check (
      status in (
        'assigned',
        'in_progress',
        'submitted',
        'completed',
        'returned'
      )
    ),
  progress integer not null default 0
    check (progress between 0 and 100),
  note text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, user_id),
  foreign key (task_id, hub_id)
    references public.professional_hub_tasks(id, hub_id)
    on delete cascade
);

create table if not exists public.professional_hub_plans (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null
    references public.professional_hubs(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 240),
  plan_type text,
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'submitted',
        'approved',
        'needs_revision',
        'archived'
      )
    ),
  owner_id uuid not null references auth.users(id) on delete restrict,
  reviewer_id uuid references auth.users(id) on delete set null,
  description text,
  period_start date,
  period_end date,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_hub_records (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null
    references public.professional_hubs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  reviewer_id uuid references auth.users(id) on delete set null,
  record_type text,
  title text not null check (char_length(trim(title)) between 2 and 240),
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'submitted',
        'approved',
        'needs_revision',
        'archived'
      )
    ),
  description text,
  file_path text,
  feedback text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_hub_meetings (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null
    references public.professional_hubs(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 240),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  chair_id uuid references auth.users(id) on delete set null,
  secretary_id uuid references auth.users(id) on delete set null,
  agenda jsonb not null default '[]'::jsonb,
  minutes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.professional_hub_evidence (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null
    references public.professional_hubs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 240),
  category text,
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'submitted',
        'verified',
        'rejected'
      )
    ),
  description text,
  file_path text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_hub_notifications (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null
    references public.professional_hubs(id) on delete cascade,
  recipient_id uuid not null
    references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  notification_type text not null,
  entity_type text,
  entity_id uuid,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists professional_hub_members_user_idx
  on public.professional_hub_members(user_id, membership_status);

create index if not exists professional_hub_members_hub_role_idx
  on public.professional_hub_members(hub_id, role, membership_status);

create index if not exists professional_hub_tasks_hub_due_idx
  on public.professional_hub_tasks(hub_id, due_at);

create index if not exists professional_hub_task_assignees_user_idx
  on public.professional_hub_task_assignees(user_id, status);

create index if not exists professional_hub_plans_hub_status_idx
  on public.professional_hub_plans(hub_id, status);

create index if not exists professional_hub_records_hub_status_idx
  on public.professional_hub_records(hub_id, status);

create index if not exists professional_hub_meetings_hub_start_idx
  on public.professional_hub_meetings(hub_id, starts_at);

create index if not exists professional_hub_evidence_hub_status_idx
  on public.professional_hub_evidence(hub_id, status);

create index if not exists professional_hub_notifications_recipient_idx
  on public.professional_hub_notifications(
    recipient_id,
    read_at,
    created_at desc
  );

create or replace function public.professional_hub_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_professional_hub_member(
  target_hub_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.professional_hub_members m
    where m.hub_id = target_hub_id
      and m.user_id = auth.uid()
      and m.membership_status = 'active'
  );
$$;

create or replace function public.has_professional_hub_role(
  target_hub_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.professional_hub_members m
    where m.hub_id = target_hub_id
      and m.user_id = auth.uid()
      and m.membership_status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_professional_hub_member(uuid)
  from public;
revoke all on function public.has_professional_hub_role(uuid, text[])
  from public;

grant execute on function public.is_professional_hub_member(uuid)
  to authenticated;
grant execute on function public.has_professional_hub_role(uuid, text[])
  to authenticated;

drop trigger if exists professional_hubs_set_updated_at
  on public.professional_hubs;
create trigger professional_hubs_set_updated_at
before update on public.professional_hubs
for each row execute function public.professional_hub_set_updated_at();

drop trigger if exists professional_hub_members_set_updated_at
  on public.professional_hub_members;
create trigger professional_hub_members_set_updated_at
before update on public.professional_hub_members
for each row execute function public.professional_hub_set_updated_at();

drop trigger if exists professional_hub_tasks_set_updated_at
  on public.professional_hub_tasks;
create trigger professional_hub_tasks_set_updated_at
before update on public.professional_hub_tasks
for each row execute function public.professional_hub_set_updated_at();

drop trigger if exists professional_hub_task_assignees_set_updated_at
  on public.professional_hub_task_assignees;
create trigger professional_hub_task_assignees_set_updated_at
before update on public.professional_hub_task_assignees
for each row execute function public.professional_hub_set_updated_at();

drop trigger if exists professional_hub_plans_set_updated_at
  on public.professional_hub_plans;
create trigger professional_hub_plans_set_updated_at
before update on public.professional_hub_plans
for each row execute function public.professional_hub_set_updated_at();

drop trigger if exists professional_hub_records_set_updated_at
  on public.professional_hub_records;
create trigger professional_hub_records_set_updated_at
before update on public.professional_hub_records
for each row execute function public.professional_hub_set_updated_at();

drop trigger if exists professional_hub_meetings_set_updated_at
  on public.professional_hub_meetings;
create trigger professional_hub_meetings_set_updated_at
before update on public.professional_hub_meetings
for each row execute function public.professional_hub_set_updated_at();

drop trigger if exists professional_hub_evidence_set_updated_at
  on public.professional_hub_evidence;
create trigger professional_hub_evidence_set_updated_at
before update on public.professional_hub_evidence
for each row execute function public.professional_hub_set_updated_at();

alter table public.professional_hubs enable row level security;
alter table public.professional_hub_members enable row level security;
alter table public.professional_hub_tasks enable row level security;
alter table public.professional_hub_task_assignees enable row level security;
alter table public.professional_hub_plans enable row level security;
alter table public.professional_hub_records enable row level security;
alter table public.professional_hub_meetings enable row level security;
alter table public.professional_hub_evidence enable row level security;
alter table public.professional_hub_notifications enable row level security;

drop policy if exists professional_hubs_select_member
  on public.professional_hubs;
create policy professional_hubs_select_member
on public.professional_hubs
for select
to authenticated
using (public.is_professional_hub_member(id));

drop policy if exists professional_hub_members_select_member
  on public.professional_hub_members;
create policy professional_hub_members_select_member
on public.professional_hub_members
for select
to authenticated
using (public.is_professional_hub_member(hub_id));

drop policy if exists professional_hub_members_insert_leader
  on public.professional_hub_members;
create policy professional_hub_members_insert_leader
on public.professional_hub_members
for insert
to authenticated
with check (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_members_update_leader
  on public.professional_hub_members;
create policy professional_hub_members_update_leader
on public.professional_hub_members
for update
to authenticated
using (
  public.has_professional_hub_role(hub_id, array['leader'])
)
with check (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_members_delete_leader
  on public.professional_hub_members;
create policy professional_hub_members_delete_leader
on public.professional_hub_members
for delete
to authenticated
using (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_tasks_select_member
  on public.professional_hub_tasks;
create policy professional_hub_tasks_select_member
on public.professional_hub_tasks
for select
to authenticated
using (public.is_professional_hub_member(hub_id));

drop policy if exists professional_hub_tasks_insert_leader
  on public.professional_hub_tasks;
create policy professional_hub_tasks_insert_leader
on public.professional_hub_tasks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_tasks_update_leader
  on public.professional_hub_tasks;
create policy professional_hub_tasks_update_leader
on public.professional_hub_tasks
for update
to authenticated
using (
  public.has_professional_hub_role(hub_id, array['leader'])
)
with check (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_tasks_delete_leader
  on public.professional_hub_tasks;
create policy professional_hub_tasks_delete_leader
on public.professional_hub_tasks
for delete
to authenticated
using (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_task_assignees_select_member
  on public.professional_hub_task_assignees;
create policy professional_hub_task_assignees_select_member
on public.professional_hub_task_assignees
for select
to authenticated
using (public.is_professional_hub_member(hub_id));

drop policy if exists professional_hub_task_assignees_insert_leader
  on public.professional_hub_task_assignees;
create policy professional_hub_task_assignees_insert_leader
on public.professional_hub_task_assignees
for insert
to authenticated
with check (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_task_assignees_update_owner_or_leader
  on public.professional_hub_task_assignees;
create policy professional_hub_task_assignees_update_owner_or_leader
on public.professional_hub_task_assignees
for update
to authenticated
using (
  user_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
)
with check (
  user_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_task_assignees_delete_leader
  on public.professional_hub_task_assignees;
create policy professional_hub_task_assignees_delete_leader
on public.professional_hub_task_assignees
for delete
to authenticated
using (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_plans_select_member
  on public.professional_hub_plans;
create policy professional_hub_plans_select_member
on public.professional_hub_plans
for select
to authenticated
using (public.is_professional_hub_member(hub_id));

drop policy if exists professional_hub_plans_insert_member
  on public.professional_hub_plans;
create policy professional_hub_plans_insert_member
on public.professional_hub_plans
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.is_professional_hub_member(hub_id)
);

drop policy if exists professional_hub_plans_update_owner_or_leader
  on public.professional_hub_plans;
create policy professional_hub_plans_update_owner_or_leader
on public.professional_hub_plans
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
)
with check (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_plans_delete_owner_or_leader
  on public.professional_hub_plans;
create policy professional_hub_plans_delete_owner_or_leader
on public.professional_hub_plans
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_records_select_member
  on public.professional_hub_records;
create policy professional_hub_records_select_member
on public.professional_hub_records
for select
to authenticated
using (public.is_professional_hub_member(hub_id));

drop policy if exists professional_hub_records_insert_owner
  on public.professional_hub_records;
create policy professional_hub_records_insert_owner
on public.professional_hub_records
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.is_professional_hub_member(hub_id)
);

drop policy if exists professional_hub_records_update_owner_or_leader
  on public.professional_hub_records;
create policy professional_hub_records_update_owner_or_leader
on public.professional_hub_records
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
)
with check (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_records_delete_owner_or_leader
  on public.professional_hub_records;
create policy professional_hub_records_delete_owner_or_leader
on public.professional_hub_records
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_meetings_select_member
  on public.professional_hub_meetings;
create policy professional_hub_meetings_select_member
on public.professional_hub_meetings
for select
to authenticated
using (public.is_professional_hub_member(hub_id));

drop policy if exists professional_hub_meetings_insert_leader
  on public.professional_hub_meetings;
create policy professional_hub_meetings_insert_leader
on public.professional_hub_meetings
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_meetings_update_leader
  on public.professional_hub_meetings;
create policy professional_hub_meetings_update_leader
on public.professional_hub_meetings
for update
to authenticated
using (
  public.has_professional_hub_role(hub_id, array['leader'])
)
with check (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_meetings_delete_leader
  on public.professional_hub_meetings;
create policy professional_hub_meetings_delete_leader
on public.professional_hub_meetings
for delete
to authenticated
using (
  public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_evidence_select_member
  on public.professional_hub_evidence;
create policy professional_hub_evidence_select_member
on public.professional_hub_evidence
for select
to authenticated
using (public.is_professional_hub_member(hub_id));

drop policy if exists professional_hub_evidence_insert_owner
  on public.professional_hub_evidence;
create policy professional_hub_evidence_insert_owner
on public.professional_hub_evidence
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.is_professional_hub_member(hub_id)
);

drop policy if exists professional_hub_evidence_update_owner_or_leader
  on public.professional_hub_evidence;
create policy professional_hub_evidence_update_owner_or_leader
on public.professional_hub_evidence
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
)
with check (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_evidence_delete_owner_or_leader
  on public.professional_hub_evidence;
create policy professional_hub_evidence_delete_owner_or_leader
on public.professional_hub_evidence
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.has_professional_hub_role(hub_id, array['leader'])
);

drop policy if exists professional_hub_notifications_select_recipient
  on public.professional_hub_notifications;
create policy professional_hub_notifications_select_recipient
on public.professional_hub_notifications
for select
to authenticated
using (recipient_id = auth.uid());

drop policy if exists professional_hub_notifications_insert_leader
  on public.professional_hub_notifications;
create policy professional_hub_notifications_insert_leader
on public.professional_hub_notifications
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and public.has_professional_hub_role(hub_id, array['leader'])
  and exists (
    select 1
    from public.professional_hub_members recipient_membership
    where recipient_membership.hub_id = professional_hub_notifications.hub_id
      and recipient_membership.user_id = recipient_id
      and recipient_membership.membership_status = 'active'
  )
);

drop policy if exists professional_hub_notifications_update_recipient
  on public.professional_hub_notifications;
create policy professional_hub_notifications_update_recipient
on public.professional_hub_notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

comment on table public.professional_hubs is
  'Native Brian Professional Hub containers. Provision initial leaders through a trusted admin/service-role path.';

comment on table public.professional_hub_members is
  'Memberships map real Brian auth.users accounts to leader or teacher roles.';

comment on table public.professional_hub_notifications is
  'Recipient-specific Professional Hub notifications. Database is the source of truth; realtime is only a delivery aid.';

commit;
