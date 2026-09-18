
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-records-private',
  'student-records-private',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "student_records_private_insert_v1" on storage.objects;
create policy "student_records_private_insert_v1" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'student-records-private'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bes_homeroom_workspaces w
    where w.owner_id = auth.uid()
      and w.workspace_id = (storage.foldername(name))[2]
      and coalesce(w.status, 'active') <> 'archived'
  )
);

drop policy if exists "student_records_private_select_v1" on storage.objects;
create policy "student_records_private_select_v1" on storage.objects
for select to authenticated
using (
  bucket_id = 'student-records-private'
  and (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      and exists (
        select 1 from public.bes_homeroom_workspaces w
        where w.owner_id = auth.uid()
          and w.workspace_id = (storage.foldername(name))[2]
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.approved, false) = true
        and lower(coalesce(p.role, '')) in ('admin','administrator')
    )
  )
);

drop policy if exists "student_records_private_update_v1" on storage.objects;
create policy "student_records_private_update_v1" on storage.objects
for update to authenticated
using (
  bucket_id = 'student-records-private'
  and (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      and exists (
        select 1 from public.bes_homeroom_workspaces w
        where w.owner_id = auth.uid()
          and w.workspace_id = (storage.foldername(name))[2]
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.approved, false) = true
        and lower(coalesce(p.role, '')) in ('admin','administrator')
    )
  )
)
with check (
  bucket_id = 'student-records-private'
  and (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      and exists (
        select 1 from public.bes_homeroom_workspaces w
        where w.owner_id = auth.uid()
          and w.workspace_id = (storage.foldername(name))[2]
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.approved, false) = true
        and lower(coalesce(p.role, '')) in ('admin','administrator')
    )
  )
);

drop policy if exists "student_records_private_delete_v1" on storage.objects;
create policy "student_records_private_delete_v1" on storage.objects
for delete to authenticated
using (
  bucket_id = 'student-records-private'
  and (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      and exists (
        select 1 from public.bes_homeroom_workspaces w
        where w.owner_id = auth.uid()
          and w.workspace_id = (storage.foldername(name))[2]
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.approved, false) = true
        and lower(coalesce(p.role, '')) in ('admin','administrator')
    )
  )
);
