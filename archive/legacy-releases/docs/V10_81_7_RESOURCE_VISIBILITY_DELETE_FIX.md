# Brian English Studio V10.81.7

## Fixed

1. Approved files uploaded by Admin/TTCM are now readable by every authenticated teacher.
2. Historical records that exist only in browser storage or Google Drive are automatically repaired into Supabase when the library opens.
3. Upload and approval use a server-side sync fallback, so a file is not treated as approved until its Supabase record exists.
4. Delete now handles legacy/local-only rows, duplicate rows, missing database rows, and files already missing from Google Drive.
5. Google Drive preview/download and approval use flexible Admin/TTCM role detection across different `profiles` schemas.

## Required database step

Run once:

`supabase/resource_library_v10_81_7_visibility_delete_hotfix.sql`

Then deploy the updated source and perform a hard refresh. Open the library with the Admin account once so old local-only records can be repaired automatically. After the repair message appears, teacher accounts can refresh and see approved files.
