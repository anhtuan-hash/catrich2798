-- Brian English Studio V10.81.7
-- Fixes approved-resource visibility for teachers and normalises legacy status values.
-- Safe to run after V10.81.4. Does not delete files or expose Google Drive tokens.

begin;

-- Normalise any legacy status values that contain capitals or extra spaces.
update public.resource_items
set status = lower(btrim(status)),
    updated_at = now()
where status is not null
  and status <> lower(btrim(status));

-- Every authenticated teacher can read approved resources, regardless of who
-- uploaded them. Uploaders can still read their own pending/revision files;
-- TTCM/Admin and the Drive owner can read all workflow states.
drop policy if exists resource_items_read on public.resource_items;
create policy resource_items_read
on public.resource_items
for select
to authenticated
using (
  lower(btrim(coalesce(status, ''))) = 'approved'
  or uploader_id = auth.uid()
  or public.resource_is_leader(auth.uid())
  or public.resource_is_drive_owner(auth.uid())
);

grant select, insert, update on table public.resource_items to authenticated;
grant select on table public.resource_categories to authenticated;
grant select on table public.resource_category_overview to authenticated;

notify pgrst, 'reload schema';

commit;

-- Verification: approved files should appear here and be visible to teachers.
select id, title, status, uploader_name, category, drive_file_id, updated_at
from public.resource_items
where lower(btrim(coalesce(status, ''))) = 'approved'
order by updated_at desc;
