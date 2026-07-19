-- Brian English Studio V11.6.7 · THPT Practice Hub
-- Run once in Supabase SQL Editor to enable cross-device sync and TTCM approval.

create or replace function public.thpt_practice_is_manager(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public as $$
declare role_value text; email_value text;
begin
  email_value:=lower(coalesce(auth.jwt()->>'email',''));
  if email_value='anhtuan@pek.edu.vn' then return true; end if;
  select lower(coalesce(p.role,'')) into role_value from public.profiles p where p.id=target_user limit 1;
  return role_value in ('admin','administrator','department_head','department-head','ttcm','leader','head','manager');
exception when others then return false;
end $$;

grant execute on function public.thpt_practice_is_manager(uuid) to authenticated;

create table if not exists public.thpt_html_lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  topic text not null default '',
  grade text not null default '12',
  cefr text not null default 'B2–C1',
  status text not null default 'pending' check(status in ('pending','approved','revision','rejected')),
  visibility text not null default 'department' check(visibility in ('private','department')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text,
  owner_name text,
  file_name text not null,
  file_path text not null,
  file_size bigint not null default 0,
  file_mime text not null default 'text/html',
  version_number integer not null default 1,
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists thpt_html_lessons_status_idx on public.thpt_html_lessons(status,updated_at desc);
create index if not exists thpt_html_lessons_owner_idx on public.thpt_html_lessons(owner_id,updated_at desc);
alter table public.thpt_html_lessons enable row level security;

drop policy if exists thpt_lessons_select on public.thpt_html_lessons;
create policy thpt_lessons_select on public.thpt_html_lessons for select to authenticated using (
  owner_id=auth.uid() or public.thpt_practice_is_manager(auth.uid()) or (status='approved' and visibility='department')
);
drop policy if exists thpt_lessons_insert on public.thpt_html_lessons;
create policy thpt_lessons_insert on public.thpt_html_lessons for insert to authenticated with check (
  owner_id=auth.uid() and (status='pending' or public.thpt_practice_is_manager(auth.uid()))
);
drop policy if exists thpt_lessons_update on public.thpt_html_lessons;
create policy thpt_lessons_update on public.thpt_html_lessons for update to authenticated using (
  public.thpt_practice_is_manager(auth.uid()) or (owner_id=auth.uid() and status<>'approved')
) with check (
  public.thpt_practice_is_manager(auth.uid()) or (owner_id=auth.uid() and status='pending')
);
drop policy if exists thpt_lessons_delete on public.thpt_html_lessons;
create policy thpt_lessons_delete on public.thpt_html_lessons for delete to authenticated using (
  public.thpt_practice_is_manager(auth.uid()) or (owner_id=auth.uid() and status<>'approved')
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('thpt-html-lessons','thpt-html-lessons',false,20971520,array['text/html','application/xhtml+xml'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists thpt_html_storage_select on storage.objects;
create policy thpt_html_storage_select on storage.objects for select to authenticated using (
  bucket_id='thpt-html-lessons' and (
    public.thpt_practice_is_manager(auth.uid()) or
    split_part(name,'/',1)=auth.uid()::text or
    exists(select 1 from public.thpt_html_lessons l where l.file_path=name and l.status='approved' and l.visibility='department')
  )
);
drop policy if exists thpt_html_storage_insert on storage.objects;
create policy thpt_html_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id='thpt-html-lessons' and (split_part(name,'/',1)=auth.uid()::text or public.thpt_practice_is_manager(auth.uid()))
);
drop policy if exists thpt_html_storage_update on storage.objects;
create policy thpt_html_storage_update on storage.objects for update to authenticated using (
  bucket_id='thpt-html-lessons' and (split_part(name,'/',1)=auth.uid()::text or public.thpt_practice_is_manager(auth.uid()))
);
drop policy if exists thpt_html_storage_delete on storage.objects;
create policy thpt_html_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='thpt-html-lessons' and (split_part(name,'/',1)=auth.uid()::text or public.thpt_practice_is_manager(auth.uid()))
);

do $$ begin
  alter publication supabase_realtime add table public.thpt_html_lessons;
exception when duplicate_object then null; when undefined_object then null;
end $$;
