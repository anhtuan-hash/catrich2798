-- 2026-09-08: optional private photo evidence for completed extra-class attendance sessions.

alter table public.bes_extra_attendance_sessions
  add column if not exists proof_path text;

comment on column public.bes_extra_attendance_sessions.proof_path is
  'Optional private Storage object path for one attendance photo proof.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attendance-session-proofs',
  'attendance-session-proofs',
  false,
  2097152,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_view_extra_attendance_proof()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:history'
      )
  );
$$;

revoke all on function public.can_view_extra_attendance_proof() from public;
grant execute on function public.can_view_extra_attendance_proof() to authenticated;

drop policy if exists "Attendance takers upload session proof" on storage.objects;
create policy "Attendance takers upload session proof"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'attendance-session-proofs'
  and public.can_take_extra_class_attendance()
  and exists (
    select 1
    from public.bes_extra_attendance_sessions s
    where s.id::text = split_part(name, '/', 1)
      and s.session_status = 'completed'
      and s.checked_by = auth.uid()
  )
);

drop policy if exists "Attendance history viewers read session proof" on storage.objects;
create policy "Attendance history viewers read session proof"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'attendance-session-proofs'
  and public.can_view_extra_attendance_proof()
);

drop policy if exists "Attendance editors delete session proof" on storage.objects;
create policy "Attendance editors delete session proof"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'attendance-session-proofs'
  and (
    public.can_take_extra_class_attendance()
    or public.can_manage_extra_class_roster()
  )
);

create or replace function public.bes_set_extra_attendance_proof(
  p_session_id uuid,
  p_proof_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text := btrim(coalesce(p_proof_path, ''));
  v_updated integer := 0;
begin
  if not public.can_take_extra_class_attendance() then
    raise exception 'Bạn không có quyền lưu minh chứng điểm danh.';
  end if;
  if v_path = '' or length(v_path) > 500 or v_path not like p_session_id::text || '/%' then
    raise exception 'Đường dẫn ảnh minh chứng không hợp lệ.';
  end if;

  update public.bes_extra_attendance_sessions
  set proof_path = v_path
  where id = p_session_id
    and session_status = 'completed'
    and checked_by = auth.uid();
  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception 'Không tìm thấy buổi điểm danh đã chốt thuộc người dùng hiện tại.';
  end if;
end;
$$;

revoke all on function public.bes_set_extra_attendance_proof(uuid,text) from public;
grant execute on function public.bes_set_extra_attendance_proof(uuid,text) to authenticated;
