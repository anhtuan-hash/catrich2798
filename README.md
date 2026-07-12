# Brian English Studio V10.87.0 — Release, Security & Performance

V10.87.0 bổ sung Trung tâm cập nhật dành cho Admin, Feature Flags đồng bộ Supabase, rollback cấu hình, Release Guard, lớp bảo vệ API AI, kiểm tra upload và audit log metadata trên thiết bị. Toàn bộ AI Action & Governance và Connected Workflow của các phiên bản trước vẫn được giữ nguyên.

Tài liệu chi tiết: `V10_87_RELEASE_SECURITY_PERFORMANCE.md`.

Các điểm chính:

- Update Center tại `#/updates`, chỉ dành cho Admin.
- Feature Flags theo nhóm: Tắt, Admin, Admin + TTCM hoặc Tất cả.
- 12 điểm rollback cục bộ gần nhất; cấu hình hiện hành đồng bộ qua Supabase Realtime sau migration.
- Release Guard kiểm tra route, quyền, build, migration, asset budget và lazy chunk.
- API AI có same-origin, body limit, rate limit, timeout, output-token cap và model allowlist tùy chọn.
- Kho học liệu/Google Drive kiểm tra extension, MIME, dung lượng, magic bytes và tên file an toàn.
- Audit log chỉ lưu metadata đã lọc dữ liệu nhạy cảm.
- Release Center có CSS lazy riêng; stylesheet legacy chính vẫn khoảng 1.07 MB và còn cảnh báo hiệu suất.

Migration cần chạy:

```text
supabase/release_settings_v10_87.sql
```

Không có Environment Variable mới bắt buộc.

---

# Brian English Studio V10.83.2

Bản V10.83.2 giữ nguyên Launcher tùy biến và Brian AI nâng cao của V10.83.1, đồng thời bổ sung lớp khôi phục chống trang trắng, tự xử lý chunk cũ sau khi Vercel triển khai và chuẩn hóa dữ liệu launcher lỗi hoặc không đúng cấu trúc.

# Brian English Studio V10.82.7

Bổ sung bong bóng chat Brian AI toàn hệ thống theo kiểu Messenger: nhận biết ứng dụng hiện tại, lưu hội thoại theo tài khoản, gợi ý nhanh và hỗ trợ giao diện responsive.

# Brian English Studio V10.82.0

Newsroom Reader bổ sung thẻ đọc tin giáo dục Việt Nam và báo tiếng Anh trực tiếp trong ứng dụng.

# Brian English Studio V10.78

## Sửa nút Hủy ghi nhận rèn luyện

- Hộp thoại xác nhận nằm trong ứng dụng, không dùng `window.prompt`.
- Không yêu cầu nhập lý do hủy.
- Hủy xong tính lại bảng điểm tuần ngay và giữ bản ghi trong nhật ký.
- Có indicator khi đang xử lý cùng thông báo thành công, lỗi hoặc chưa đồng bộ cloud.
- Đã kiểm tra 93/93 smoke checks và runtime Admin/TTCM/Giáo viên.

---

# Brian English Studio V10.67

Flat Metro Teaching OS for English teaching.

## V10 interface direction

- Flat design only: no decorative motifs, no visual layers from older systems.
- Apps Hub is a Start Screen with workflow groups: Plan, Create, Assess, Manage.
- Home is a Teacher Command Center with large high-contrast tiles.
- Tool pages use a consistent two-column workspace: controls/input on the left, preview/output on the right.
- System font: BrianGesco. TextCare administrative preview remains Times New Roman.
- Motion: one unified GPU-friendly tile-to-page transition, with lightweight page entrance and reduced-motion support.

## V10.67 Homeroom Phase 2

- Advanced learning analytics with risk and trend indicators.
- Subject-teacher feedback inbox and review workflow.
- Team competition and live leaderboard.
- Parent/student announcements with read acknowledgement.
- Sanitized parent, student and subject-teacher portals.
- Admin-only school-wide homeroom summaries.

Run `supabase/homeroom_phase2_v10_67.sql` after the V10.66 homeroom migration.

## Validation

- `npm run build`: production build completed successfully.
- `npm test`: 45/45 smoke checks passed.
- Route animation audit: obsolete tile/page-flip animation layers removed; 11 focused keyframes remain across the full system.

---

# Brian English Studio V1.0

Official release candidate with real Supabase Auth, teacher accounts, admin approval, AI teaching tools, classroom games, resources, and third-party classroom tool launchers.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local app at:

```text
http://localhost:5173
```

## Supabase connection

This version uses Supabase Auth for real email/password login and a `public.profiles` table for role, approval, and per-teacher permission management.

Read the full setup guide:

```text
SUPABASE_SETUP.md
```

Run this file in Supabase SQL Editor:

```text
supabase/schema.sql
```

Add these variables to Vercel:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ADMIN_EMAILS=your-admin-email@example.com
```

Never expose the Supabase `service_role` key in this frontend app.

## First admin account

After the first admin registers, run this in Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', approved = true
where email = 'your-admin-email@example.com';
```

Then log in again and open `#/admin`.

## Deployment

```bash
npm run build
```

Deploy to Vercel. The included `vercel.json` rewrites routes to `index.html` for SPA support.

## Pre-launch check

After deploying, open:

```text
https://your-domain/#/setup
```

Confirm that Supabase URL and anon key are detected, then test:

1. Register teacher account.
2. Confirm email if Supabase requires it.
3. Admin approves teacher.
4. Admin tests Custom permissions for a teacher.
5. Teacher logs in and only sees granted modules.
6. Password reset flow.
7. Logout/login session persistence.

## Scripts

```bash
npm run build
npm test
```

## Notes

- Teacher accounts are pending by default until approved by an admin.
- Admin can approve/disable users, change roles, and grant/deny access to individual activities, games, teaching tools, and content modules in the Admin page.
- Deleting Auth users requires Supabase Dashboard or a private backend/Edge Function using the service role key.
- AI provider keys are still BYOK and stored in the browser unless you later add a backend proxy.

## V1.0 Permission request upgrade

This build keeps locked apps visible to teachers. When a teacher does not have access to an activity/game/tool, the card is greyed out and shows a **Request access / Xin quyền** button.

Admins can review requests in `#/admin` and approve or reject them. Approving a request automatically adds that permission to the teacher when the teacher is in custom-permission mode.

If upgrading an existing Supabase project, rerun `supabase/schema.sql` in Supabase SQL Editor. The script adds the `permission_requests` table and RLS policies without deleting existing users.

## V1.0 update: English Department Workspace

This build adds a dedicated **Tổ chuyên môn / English Department Workspace** card for subject leaders.

Route:

```text
#/department
```

Main features:

- Department dashboard for plans, meetings, tasks and evidence.
- Professional plan tracker.
- Department meeting/minutes tracker.
- Task assignment tracker.
- Department records and evidence links.
- Automatic report generator with optional AI report writing.
- Locked module cards with **Request access** buttons.
- Admin permission group **Tổ chuyên môn** with granular rights:
  - `department:dashboard`
  - `department:plans`
  - `department:meetings`
  - `department:lesson-study`
  - `department:observations`
  - `department:assessment`
  - `department:tasks`
  - `department:documents`
  - `department:teacher-development`
  - `department:student-activities`
  - `department:reports`
  - `department:policies`

Department workspace data is local-first in V1 and is saved in the browser per user. Supabase is used for authentication, approval, permissions and access requests.

## V1.0 Department Workspace Cloud Sync

The **Tổ chuyên môn / English Department Workspace** is local-first and now supports a shared Supabase cloud snapshot.

- Local-first: data is saved in the browser immediately.
- Cloud snapshot: TTCM/Admin can save one shared workspace per school year to Supabase.
- Import/export JSON: backup or move the department workspace between devices.

After upgrading, run `supabase/schema.sql` again in Supabase SQL Editor. The script is safe to rerun and adds `department_workspace_snapshots` if missing.

## V1 Department Workspace upgrade: submissions + TTCM publishing

This build adds a stronger English Department workflow:

- Teachers can see the Department Workspace, submit evidence/records, and track review status.
- Admin/TTCM can approve or reject submitted evidence.
- Approved evidence is added into Department Records and can be included in reports.
- Only admin or users explicitly granted `department:publish` can save the official shared cloud snapshot.
- Teachers can still load/read the shared Supabase snapshot but cannot overwrite the official department data.

After upgrading an existing Supabase project, rerun `supabase/schema.sql` in Supabase SQL Editor.

## V1 Department Workspace completion upgrade

This build makes the Department Workspace more complete for real TTCM use:

- Structured CRUD panels for Lesson Study, Observations, Assessment, Teacher Development, Student Activities, and Policies/Templates.
- Dashboard priority alerts for overdue and pending items.
- HTML portfolio export for a clean offline evidence package.
- Report type selector for monthly, semester, meeting, evidence, and assessment reports.
- Template cards can now be inserted directly into Professional Plans.
- Teacher submissions can be filtered by status, and teachers can cancel pending submissions.
- Existing local/cloud data is normalized automatically so older Department Workspace data still opens.

No destructive database migration is required. Rerun `supabase/schema.sql` only if your current project does not yet have `department_submissions` or `department_workspace_snapshots`.


## V1 Department AI Workflow update

This package adds a more polished English Department Workspace for subject leaders:

- Modules are grouped by TTCM workflow: command center, professional cycle, quality/growth, records/policies.
- New AI Copilot module for department leaders. It can generate leader briefs, monthly/weekly plans, meeting agendas/minutes, follow-up tasks, observation forms, assessment reviews and evidence checklists.
- AI output can be saved directly into plans, meetings, tasks, assessment, records or reports.
- Dashboard now includes an operation-health card based on overdue work, open tasks, pending submissions and upcoming deadlines.
- Existing Supabase tables remain compatible; no new database table is required for this update.

## V1 Department Upload + Leader Review upgrade

This build adds a stronger English Department workflow:

- Teachers can submit evidence with either a link or a real uploaded file.
- Uploaded evidence is stored in the private Supabase Storage bucket `department-evidence`.
- Normal teachers only see their own submissions and uploaded files.
- Admin/TTCM accounts with `department:publish` can view all teacher submissions, open uploaded files, approve/reject them, and add approved items to official department records.
- The Department page now has a top notification/action bar showing pending submissions, overdue work, cloud status and quick actions.

After upgrading an existing Supabase project, run `supabase/schema.sql` again in Supabase SQL Editor so the new columns, storage bucket and RLS policies are created.

### Department gated submissions

The Department Workspace now supports leader-gated submissions: teachers can only submit reports, plans, documents or task updates after the department leader creates an open notice/request. Leaders/admins can view every teacher submission; teachers can only see their own submissions. Run `supabase/schema.sql` again after upgrading.

## Cập nhật: Kho lưu trữ hồ sơ TTCM

Bản này bổ sung Kho lưu trữ hồ sơ TTCM cho các hồ sơ/báo cáo/kế hoạch/văn bản/nhiệm vụ giáo viên nộp theo thông báo:

- Khi TTCM/Admin bấm **Duyệt & lưu kho**, hồ sơ được chuyển trạng thái `approved` và được gắn `archive_folder` để tra cứu lại sau.
- TTCM có tab/bộ lọc **Kho lưu trữ TTCM** trong phân hệ Thông báo & nộp nội dung.
- Có thể lọc theo từng thư mục lưu trữ, mở lại link minh chứng hoặc file đã tải lên từ Supabase Storage.
- Có thể **Đổi thư mục** hoặc **Bỏ lưu kho** nếu cần sắp xếp lại.

Sau khi cập nhật, chạy lại toàn bộ `supabase/schema.sql` trong Supabase SQL Editor để thêm các cột lưu trữ: `archive_folder`, `archive_note`, `archived_by`, `archived_by_email`, `archived_at`.


## System upgrade proposals

See `SYSTEM_UPGRADE_PROPOSALS.md` for the latest audit notes and recommended next upgrades.

## V10.35 — Exam Studio Sage Hero

Exam Studio được dựng lại theo mockup giao diện sage/cream: hero minh hoạ mới bằng CSS, thanh tóm tắt realtime nằm ngang ngay dưới hero, stepper chuyên nghiệp hơn và khu làm việc sử dụng toàn bộ chiều rộng.

## V10.66 — Giáo viên chủ nhiệm, Giai đoạn 1

Bản này bổ sung thẻ **Giáo viên chủ nhiệm** với các phân hệ Tổng quan, Học sinh, Điểm danh, Lịch công việc, Sinh hoạt lớp, Phụ huynh, Hồ sơ & báo cáo và AI GVCN.

Sau khi triển khai, chạy một lần:

```text
supabase/homeroom_workspace_v10_66.sql
```

trong Supabase SQL Editor để bật đồng bộ dữ liệu lớp theo tài khoản.

## V10.69 — Giáo viên chủ nhiệm, Giai đoạn 3 hoàn chỉnh

Bản này hoàn tất cả ba đợt của Giai đoạn 3: nhiều lớp/năm học, lưu trữ thay vì xóa, audit và backup, cổng PIN băm có khóa tạm thời, điểm danh theo buổi/tiết, hồ sơ sự việc và kế hoạch hỗ trợ, nhập điểm Excel/CSV, thông báo hai chiều có tệp đính kèm, tìm kiếm toàn lớp, nhắc việc và xuất Word/PDF.

Sau khi nâng cấp, chạy:

```text
supabase/homeroom_phase3_v10_69.sql
```

sau hai migration V10.66 và V10.67.