-- Record a supplemental proof path only after the object exists in the private bucket.
create or replace function public.bes_attach_supplemental_proof(
  p_session_id uuid,
  p_proof_path text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.bes_supplemental_sessions%rowtype;
  v_path text := btrim(coalesce(p_proof_path,''));
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if v_path = '' or split_part(v_path,'/',1) <> p_session_id::text then
    raise exception 'Đường dẫn minh chứng không hợp lệ.';
  end if;
  select * into v_session
  from public.bes_supplemental_sessions s
  where s.id=p_session_id
  for update;
  if not found then raise exception 'Không tìm thấy buổi Học bổ sung.'; end if;
  if v_session.status <> 'confirmed' then raise exception 'Chỉ buổi đã chốt mới được gắn minh chứng.'; end if;
  if v_session.checked_by <> v_uid then raise exception 'Chỉ người chốt điểm danh mới được gắn minh chứng.'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id='attendance-session-proofs'
      and o.name=v_path
  ) then raise exception 'Ảnh minh chứng chưa được tải lên máy chủ.'; end if;
  update public.bes_supplemental_sessions s
  set proof_path=v_path,updated_by=v_uid,updated_at=clock_timestamp()
  where s.id=p_session_id
  returning * into v_session;
  return to_jsonb(v_session);
end;
$$;

revoke all on function public.bes_attach_supplemental_proof(uuid,text) from public,anon;
grant execute on function public.bes_attach_supplemental_proof(uuid,text) to authenticated;
