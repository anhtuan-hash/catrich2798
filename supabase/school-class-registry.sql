-- Danh mục 27 lớp và phân công giáo viên dành cho TTCM.
-- Dữ liệu học sinh không được đưa vào Git; tệp Excel được nhập trực tiếp trong ứng dụng.

create table if not exists public.school_class_registries (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  owner_email text not null default '',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.school_class_registries enable row level security;

drop policy if exists "school_class_registries_select_own" on public.school_class_registries;
create policy "school_class_registries_select_own"
on public.school_class_registries for select
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true and p.role in ('admin', 'department_head')
  )
);

drop policy if exists "school_class_registries_insert_own" on public.school_class_registries;
create policy "school_class_registries_insert_own"
on public.school_class_registries for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true and p.role in ('admin', 'department_head')
  )
);

drop policy if exists "school_class_registries_update_own" on public.school_class_registries;
create policy "school_class_registries_update_own"
on public.school_class_registries for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true and p.role in ('admin', 'department_head')
  )
);

create index if not exists school_class_registries_updated_at_idx
  on public.school_class_registries (updated_at desc);
