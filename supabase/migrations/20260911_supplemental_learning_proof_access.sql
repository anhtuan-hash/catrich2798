-- Supplemental Học bổ sung proof-image access for the existing private bucket.
-- Separate policies keep legacy extra-class proof authorization untouched.

create or replace function public.bes_can_upload_supplemental_proof(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.bes_supplemental_sessions s
    where s.id::text = split_part(coalesce(p_object_name,''), '/', 1)
      and s.status = 'confirmed'
      and s.checked_by = auth.uid()
  );
$$;

create or replace function public.bes_can_view_supplemental_proof(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_allowed jsonb;
begin
  if v_uid is null then return false; end if;
  if not exists (
    select 1 from public.bes_supplemental_sessions s
    where s.id::text = split_part(coalesce(p_object_name,''), '/', 1)
      and s.status = 'confirmed'
      and nullif(btrim(s.proof_path),'') is not null
      and s.proof_path = p_object_name
  ) then return false; end if;
  select * into v_profile from public.profiles p where p.id=v_uid and p.approved=true;
  if not found then return false; end if;
  if lower(coalesce(v_profile.role,'')) in ('admin','administrator') then return true; end if;
  v_allowed:=coalesce(v_profile.permissions->'allowed','[]'::jsonb);
  return v_allowed ? 'route:attendance'
    or v_allowed ? 'attendance:history'
    or v_allowed ? 'attendance:report';
end;
$$;

revoke all on function public.bes_can_upload_supplemental_proof(text) from public, anon;
revoke all on function public.bes_can_view_supplemental_proof(text) from public, anon;
grant execute on function public.bes_can_upload_supplemental_proof(text) to authenticated;
grant execute on function public.bes_can_view_supplemental_proof(text) to authenticated;

drop policy if exists "Supplemental attendance operators upload session proof" on storage.objects;
create policy "Supplemental attendance operators upload session proof"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'attendance-session-proofs'
  and public.bes_can_upload_supplemental_proof(name)
);

drop policy if exists "Supplemental attendance viewers read session proof" on storage.objects;
create policy "Supplemental attendance viewers read session proof"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'attendance-session-proofs'
  and public.bes_can_view_supplemental_proof(name)
);
