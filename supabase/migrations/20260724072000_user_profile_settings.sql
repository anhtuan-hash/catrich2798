-- Editable user profiles for Brian Settings.
-- Users can update only their own non-privileged profile fields through the
-- security-definer RPC below. Role, approval and permissions remain protected.

alter table public.profiles
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists avatar_url text;

create or replace function public.bes_update_own_profile(profile_patch jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := auth.uid();
  updated_profile public.profiles%rowtype;
  clean_name text;
begin
  if target_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  clean_name := nullif(left(trim(coalesce(profile_patch->>'full_name', '')), 120), '');

  update public.profiles
  set
    full_name = case
      when profile_patch ? 'full_name' then coalesce(clean_name, full_name)
      else full_name
    end,
    school = case
      when profile_patch ? 'school' then nullif(left(trim(coalesce(profile_patch->>'school', '')), 160), '')
      else school
    end,
    job_title = case
      when profile_patch ? 'job_title' then nullif(left(trim(coalesce(profile_patch->>'job_title', '')), 120), '')
      else job_title
    end,
    phone = case
      when profile_patch ? 'phone' then nullif(left(trim(coalesce(profile_patch->>'phone', '')), 40), '')
      else phone
    end,
    bio = case
      when profile_patch ? 'bio' then nullif(left(trim(coalesce(profile_patch->>'bio', '')), 320), '')
      else bio
    end,
    avatar_url = case
      when profile_patch ? 'avatar_url' then nullif(left(trim(coalesce(profile_patch->>'avatar_url', '')), 2048), '')
      else avatar_url
    end,
    updated_at = now()
  where id = target_id
  returning * into updated_profile;

  if not found then
    raise exception 'The signed-in profile was not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', updated_profile.id,
    'email', updated_profile.email,
    'full_name', updated_profile.full_name,
    'school', updated_profile.school,
    'job_title', updated_profile.job_title,
    'phone', updated_profile.phone,
    'bio', updated_profile.bio,
    'avatar_url', updated_profile.avatar_url,
    'updated_at', updated_profile.updated_at
  );
end;
$$;

revoke all on function public.bes_update_own_profile(jsonb) from public;
grant execute on function public.bes_update_own_profile(jsonb) to authenticated;

-- One public avatar per account. The fixed user-owned path allows the client to
-- replace an avatar without accumulating abandoned files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile avatars are publicly readable" on storage.objects;
create policy "Profile avatars are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'profile-avatars');

drop policy if exists "Users can upload their own profile avatar" on storage.objects;
create policy "Users can upload their own profile avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can replace their own profile avatar" on storage.objects;
create policy "Users can replace their own profile avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can remove their own profile avatar" on storage.objects;
create policy "Users can remove their own profile avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
