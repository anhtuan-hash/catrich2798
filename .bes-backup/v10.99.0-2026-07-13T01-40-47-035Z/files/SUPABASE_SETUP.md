# Brian English Studio V1.0 — Supabase Connection Guide

## 1. Create the Supabase project

Create a new project in Supabase. Keep your database password safe.

## 2. Run the schema

Open Supabase Dashboard → SQL Editor → New query. Paste and run the full file:

```text
supabase/schema.sql
```

This creates or updates:

- `public.profiles`
- `profiles.permissions` for per-teacher access control
- RLS policies
- `public.is_admin()` helper
- `public.handle_new_user()` trigger

New teacher accounts are **pending by default**. Admin accounts approve them in the app and can grant either full access or custom permissions for each activity, game, tool, and content module.

## 3. Add Vercel Environment Variables

In Vercel → Project → Settings → Environment Variables, add:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ADMIN_EMAILS=your-admin-email@example.com
```

Never add the Supabase `service_role` key to Vercel frontend variables.

## 4. Configure Supabase Auth URLs

In Supabase → Authentication → URL Configuration:

```text
Site URL:
https://your-vercel-domain.vercel.app

Redirect URLs:
https://your-vercel-domain.vercel.app/**
http://localhost:5173/**
```

For a custom domain, add it too:

```text
https://your-custom-domain.com/**
```

## 5. Create the first admin

1. Open the deployed app.
2. Go to `#/register`.
3. Register using your admin email.
4. Confirm the email if Supabase asks for confirmation.
5. Go back to Supabase SQL Editor and run:

```sql
update public.profiles
set role = 'admin', approved = true
where email = 'your-admin-email@example.com';
```

6. Log in again. The Admin page should now load user profiles.

## 6. Test before launch

Open:

```text
https://your-vercel-domain.vercel.app/#/setup
```

Check:

- `VITE_SUPABASE_URL` is ✅
- `VITE_SUPABASE_ANON_KEY` is ✅
- Register a teacher account
- Confirm email if enabled
- Approve that teacher from Admin
- In Admin, set the teacher to **Custom** permissions
- Grant only 1–2 tools, for example QuizForge AI and Game Hub
- Log in as teacher
- Try password reset

## 7. Optional Supabase Auth settings

For private/internal launch, recommended:

- Keep email confirmation ON.
- Disable public signups only if you plan to invite users manually later.
- Set a strong password policy in Supabase Auth settings.
- Add your production domain and localhost to Redirect URLs.


## 8. Permission management

The Admin page now stores access rules in:

```text
public.profiles.permissions
```

Default value:

```json
{"mode":"all","allowed":[]}
```

This means the teacher can use all teacher modules after approval.

Custom example:

```json
{"mode":"custom","allowed":["tool:text2quiz","tool:game-hub","route:library"]}
```

This means the teacher can only open QuizForge AI, Game Hub, and Library. Admin accounts always have full access and are not restricted by this field.

After changing permissions for a teacher, ask the teacher to sign out and sign in again if the new access does not appear immediately.

## Upgrade: locked app cards + permission requests

After deploying this version, run `supabase/schema.sql` again in Supabase SQL Editor. The upgrade creates `public.permission_requests`.

Teacher flow:
1. Teacher opens Apps/Games/Tools.
2. Locked items remain visible but greyed out.
3. Teacher clicks **Xin quyền**.
4. Admin opens `#/admin`, reviews the request, and clicks **Cấp quyền** or **Từ chối**.

Admin approval updates `profiles.permissions` for custom-permission teachers and marks the request as approved.

## Upgrade: English Department Workspace permissions

This version adds a new app card: **Tổ chuyên môn / English Department Workspace** at `#/department`.

No new database table is required for the V1 local-first workspace. The new permissions are stored in the existing `profiles.permissions` JSON column and can be managed in `#/admin` under the **Tổ chuyên môn** permission group.

Teachers without access still see the Department Workspace card and locked submodule cards. They can click **Xin quyền** to create a request in `permission_requests`, and admins can approve it from `#/admin`.

## Department Workspace Cloud Sync

This build adds a shared table:

```text
department_workspace_snapshots
```

Run the full `supabase/schema.sql` again after upgrading. Then open the app and go to:

```text
#/department
```

Use:

- **Lưu cloud** to publish the current local workspace to Supabase.
- **Tải cloud** to load the shared workspace for the selected school year.
- **Xuất JSON / Nhập JSON** for offline backup.

The default SQL policy allows approved users to read and save department snapshots. After testing, you can make it stricter by changing insert/update policies to admin-only.

## Upgrade: TTCM publishing + teacher evidence submissions

This version adds:

- `department:publish` special permission for TTCM / tổ phó.
- `department_submissions` table for teachers to submit evidence.
- Stricter RLS: approved teachers can read shared department snapshots and submit evidence, but only admin or `department:publish` users can save official shared snapshots and review submissions.

To upgrade an existing project, open Supabase SQL Editor and rerun the whole file:

```text
supabase/schema.sql
```

Then in the app Admin page, grant these permissions to a TTCM/tổ phó account if that person should manage department data without full admin rights:

```text
tool:department-workspace
department:dashboard
department:submissions
department:documents
department:reports
department:publish
```

## Upgrade: completed Department Workspace panels

The latest Department Workspace upgrade adds more local-first data panels but does not require new tables beyond:

```text
department_workspace_snapshots
department_submissions
```

Teachers can now cancel their own pending submissions. This uses the existing `department_submissions` update policy that allows a submitter to move a pending item to `cancelled`.

The HTML portfolio export is generated locally in the browser. It does not upload files to Supabase.

## Department evidence upload setup

The Department Workspace now supports teacher file uploads for evidence/minh chứng. Run the latest `supabase/schema.sql` in SQL Editor. It will:

1. Add file metadata columns to `department_submissions`.
2. Create a private Storage bucket named `department-evidence`.
3. Add RLS policies so teachers upload/read only their own files.
4. Allow Admin/TTCM users with `department:publish` to read all evidence files for review.

Teacher view: only their own submissions are returned by Row Level Security.
Leader view: Admin/TTCM can see all submissions and review them.

Maximum upload size is configured at 50 MB per file.

## Cập nhật mới: giáo viên chỉ nộp khi có thông báo từ TTCM

Bản `department-gated-submissions` bổ sung bảng `department_submission_requests`.

Luồng vận hành:

1. TTCM/Admin vào `#/department` → `Nộp hồ sơ / minh chứng`.
2. TTCM tạo **Thông báo/yêu cầu nộp** với một trong bốn loại: `Báo cáo`, `Kế hoạch`, `Văn bản`, `Nhiệm vụ`.
3. TTCM có thể gửi cho toàn tổ hoặc nhập danh sách email giáo viên cụ thể.
4. Giáo viên chỉ nhìn thấy thông báo đang mở dành cho mình.
5. Giáo viên chỉ được nộp nội dung khi chọn một thông báo đang mở.
6. TTCM/Admin xem toàn bộ nội dung giáo viên gửi lên; giáo viên chỉ xem nội dung của chính mình.

Sau khi cập nhật bản này, chạy lại toàn bộ file `supabase/schema.sql` trong Supabase SQL Editor để thêm bảng, cột và RLS mới.

## Cập nhật: Kho lưu trữ hồ sơ TTCM

Bản này bổ sung Kho lưu trữ hồ sơ TTCM cho các hồ sơ/báo cáo/kế hoạch/văn bản/nhiệm vụ giáo viên nộp theo thông báo:

- Khi TTCM/Admin bấm **Duyệt & lưu kho**, hồ sơ được chuyển trạng thái `approved` và được gắn `archive_folder` để tra cứu lại sau.
- TTCM có tab/bộ lọc **Kho lưu trữ TTCM** trong phân hệ Thông báo & nộp nội dung.
- Có thể lọc theo từng thư mục lưu trữ, mở lại link minh chứng hoặc file đã tải lên từ Supabase Storage.
- Có thể **Đổi thư mục** hoặc **Bỏ lưu kho** nếu cần sắp xếp lại.

Sau khi cập nhật, chạy lại toàn bộ `supabase/schema.sql` trong Supabase SQL Editor để thêm các cột lưu trữ: `archive_folder`, `archive_note`, `archived_by`, `archived_by_email`, `archived_at`.

## Homeroom Teacher Workspace V10.66

Run this migration once in Supabase SQL Editor:

```text
supabase/homeroom_workspace_v10_66.sql
```

It creates `public.bes_homeroom_workspaces` with RLS. Teachers can only access their own workspace; approved administrators can support all workspaces.

## Homeroom Phase 3 (V10.69)

Run after the Phase 1 and Phase 2 homeroom migrations:

```text
supabase/homeroom_phase3_v10_69.sql
```

This migration adds secure PIN hashing/rate limiting, session expiry, portal replies, audit/backup tables and normalized Phase-3-ready homeroom tables with owner/admin RLS.
