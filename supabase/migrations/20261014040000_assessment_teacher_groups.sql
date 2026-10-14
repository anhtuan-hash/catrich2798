-- Assessment 4.1 · Reusable TTCM teacher groups; never changes existing grants.
create table if not exists public.lesson_check_teacher_groups (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 100),
 member_ids uuid[] not null default '{}',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint lesson_check_teacher_groups_max_members check (cardinality(member_ids) <= 100)
);
create unique index if not exists lesson_check_teacher_groups_owner_name_key
 on public.lesson_check_teacher_groups (owner_id, lower(btrim(name)));
create index if not exists lesson_check_teacher_groups_owner_idx
 on public.lesson_check_teacher_groups(owner_id, updated_at desc);
alter table public.lesson_check_teacher_groups enable row level security;
drop policy if exists "TTCM can manage own teacher groups" on public.lesson_check_teacher_groups;
create policy "TTCM can manage own teacher groups"
 on public.lesson_check_teacher_groups for all to authenticated
 using (owner_id = auth.uid() and public.lesson_check_is_leader())
 with check (owner_id = auth.uid() and public.lesson_check_is_leader());
revoke all on public.lesson_check_teacher_groups from anon;
grant select, insert, update, delete on public.lesson_check_teacher_groups to authenticated;

-- Harden group member integrity even when rows are written directly via PostgREST.
create or replace function public.lesson_check_guard_teacher_group_members()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not public.lesson_check_is_leader() or new.owner_id is distinct from auth.uid()
 then raise exception 'Only the group owner can modify teacher groups'; end if;
 if exists (
    select 1 from unnest(new.member_ids) u
    where u is null or not exists(
      select 1 from public.profiles p
      where p.id=u and p.approved=true
      and lower(coalesce(p.role,'teacher')) not in
       ('admin','ttcm','to_truong','tổ trưởng','department_head',
        'department-head','department head','department_leader',
        'department leader','subject_leader','subject leader','leader')
    )
 ) then raise exception 'Groups must contain approved teachers only'; end if;
 new.member_ids = (select coalesce(array_agg(distinct u), '{}'::uuid[])
   from unnest(new.member_ids) u);
 new.updated_at=now();
 return new;
end; $$;
drop trigger if exists lesson_check_guard_teacher_group_members_trigger on public.lesson_check_teacher_groups;
create trigger lesson_check_guard_teacher_group_members_trigger
 before insert or update on public.lesson_check_teacher_groups
 for each row execute function public.lesson_check_guard_teacher_group_members();
revoke all on function public.lesson_check_guard_teacher_group_members() from public, anon, authenticated;
