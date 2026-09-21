# Giai đoạn 0 — Kiểm kê Supabase trước khi chuyển Cloudflare

Ngày kiểm kê: 24/07/2026  
Repository: `anhtuan-hash/catrich2798`  
Trạng thái: **Chỉ đọc mã nguồn; chưa thay đổi production hoặc dữ liệu Supabase**

## 1. Kết quả quét tự động

Máy quét tĩnh đã chạy thành công trong GitHub Actions:

- 794 tệp văn bản được quét.
- 306 tệp có dấu hiệu liên quan Supabase.
- 89 tên bảng/đối tượng được phát hiện trong toàn bộ repository.
- 6 tên bucket được phát hiện.
- 1 Supabase Edge Function được phát hiện.
- 11 bảng Realtime được máy quét phân giải trực tiếp.

Con số 89 **không phải 89 bảng cần chuyển**. Nó bao gồm:

- bảng đang được runtime sử dụng;
- schema/migration của tính năng cũ;
- script kiểm thử và release guard;
- mã đã lưu trong `archive/`;
- ba kết quả nhiễu rõ ràng: `does`, `if`, `public`.

Sau khi lọc theo tham chiếu nằm trong `src/`, `api/` và mã runtime hiện hành, có **42 bảng/đối tượng dữ liệu đang được web hoặc API sử dụng rõ ràng**.

## 2. Các phụ thuộc đang hoạt động

### 2.1. Tài khoản, phân quyền và hồ sơ

- `profiles`
- `system_roles`
- `permission_requests`
- Supabase Auth
- Edge Function `teacher-accounts`
- Bucket `profile-avatars`

Auth đang dùng đăng nhập mật khẩu, OAuth, đăng ký, khôi phục mật khẩu, cập nhật tài khoản, lắng nghe phiên đăng nhập và đăng xuất. Vì vậy Auth phải được giữ lại trong các giai đoạn chuyển D1/R2 đầu tiên.

### 2.2. Work Hub và lịch làm việc

- `work_hub_items`
- `work_hub_comments`
- `work_hub_notifications`
- Bucket `work-hub-submissions`

Lịch làm việc dùng chung cũng đang dùng `work_hub_items`, không phải một database riêng. Ba bảng trên có Realtime và là nhóm nghiệp vụ quan trọng, cần chuyển sau khi lớp API Worker và cơ chế dual-write đã ổn định.

### 2.3. Kho học liệu và Knowledge Hub

- `resource_items`
- `resource_category_overview`
- `resource_smart_metadata`
- `resource_user_state`
- `resource_collections`
- `resource_collection_items`
- `resource_activity_logs`
- `resource_drive_connections`

Phần lớn file Kho học liệu hiện nằm trên Google Drive; Supabase giữ metadata, trạng thái duyệt, liên kết Drive, nội dung trích xuất và nhật ký. Đây là ứng viên tốt để chuyển metadata sang D1 mà chưa cần di chuyển toàn bộ file Drive.

### 2.4. Thư viện cá nhân

- `library_items`

Bảng này lưu lịch sử, prompt và ngân hàng câu hỏi dạng payload. Đây từng là một điểm nóng egress và cần thiết kế lại theo metadata + nội dung tải lười khi chuyển sang D1/R2.

### 2.5. Assessment Core

- `assessment_items`
- `assessment_blueprints`
- `assessment_tests`
- `assessment_test_items`

`assessment_items` có thể có số lượng lớn. Khi chuyển D1 phải giữ phân trang, index và không tải các trường thống kê/nội dung không dùng trong danh sách.

### 2.6. Automation

- `automation_rules`
- `automation_runs`
- `automation_events`
- `automation_cloud_jobs`
- `automation_delivery_log`
- `automation_worker_heartbeats`
- `automation_digest_preferences`

Nhóm này phù hợp với Workers + D1, nhưng cần tách rõ job theo lịch, job đang chạy, log giao nhận và heartbeat trước khi cutover.

### 2.7. Chủ nhiệm

Các bảng đang có tham chiếu runtime rõ ràng:

- `bes_homeroom_workspaces`
- `bes_homeroom_portals`
- `bes_homeroom_feedback_inbox`
- `bes_homeroom_portal_receipts`
- `bes_homeroom_portal_responses`

Repository còn nhiều bảng Homeroom Phase 3 chỉ xuất hiện trong SQL migration. Cần xác nhận trên Supabase Dashboard xem chúng đã được tạo và có dữ liệu hay chưa trước khi quyết định chuyển.

### 2.8. Content Ecosystem

- `content_ecosystem_assets`
- `content_ecosystem_kits`

`content_ecosystem_assets` có `content_text` và `content_json` lớn. Khi chuyển, D1 chỉ nên giữ metadata và R2 nên giữ nội dung lớn hoặc snapshot.

### 2.9. Cấu hình và module độc lập

- `ai_website_settings`
- `app_visibility_settings`
- `bes_launcher_settings`
- `independent_chatbot_settings`
- `custom_game_platforms`
- `shared_music_settings`
- `vietnam_atmosphere_settings`
- `thpt_html_lessons`
- `api_security_events`

Các bảng cấu hình nhỏ có thể là nhóm D1 thử nghiệm đầu tiên vì dễ đối chiếu và dễ rollback.

## 3. Supabase Storage

### Bucket có mã runtime sử dụng rõ ràng

1. `profile-avatars`
2. `shared-music`
3. `thpt-html-lessons`
4. `vietnam-atmosphere`
5. `work-hub-submissions`

### Bucket chỉ phát hiện trong schema

- `department-evidence`

Cần xác nhận bucket này có đang tồn tại và còn file thật trên Supabase hay không.

### Hướng chuyển dự kiến

- `work-hub-submissions` → R2 trước.
- `shared-music` → R2.
- `thpt-html-lessons` → R2.
- `profile-avatars` → R2 hoặc giữ tạm thời đến khi Auth/hồ sơ được chuyển.
- `vietnam-atmosphere` → R2, ưu tiên thấp vì dung lượng nhỏ.

## 4. Realtime

Máy quét phân giải trực tiếp 11 bảng:

- `app_visibility_settings`
- `automation_cloud_jobs`
- `automation_delivery_log`
- `automation_worker_heartbeats`
- `bes_launcher_settings`
- `resource_items`
- `resource_smart_metadata`
- `resource_user_state`
- `work_hub_comments`
- `work_hub_items`
- `work_hub_notifications`

Ngoài ra còn các subscription dùng tên bảng thông qua hằng số, gồm ít nhất:

- `ai_website_settings`
- `shared_music_settings`
- `independent_chatbot_settings`
- `vietnam_atmosphere_settings`

Cloudflare D1 không cung cấp Supabase Realtime tương đương trực tiếp. Mỗi subscription phải được thay bằng một trong các cách: cập nhật tại chỗ sau mutation, polling nhẹ có cache, Server-Sent Events/WebSocket qua Worker, hoặc Durable Objects cho nhu cầu thời gian thực thực sự.

## 5. Vercel API đang phụ thuộc Supabase

Các endpoint cần được rà soát khi chuyển backend:

- `/api/external-app-requests`
- `/api/personnel-directory`
- `/api/resource-sync`
- `/api/google-drive-connect`
- `/api/google-drive-upload`
- `/api/google-drive-file`
- `/api/google-drive-preview-session`
- `/api/google-drive-move`
- `/api/google-drive-delete`
- `/api/work-hub-archive-resource`
- `/api/teacher-accounts`

Các API tin tức, thời tiết, từ điển và nguồn tham khảo không phải trọng tâm của chuyển Supabase.

## 6. Biến môi trường hiện hành

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server/Edge:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` hoặc `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` hoặc `SUPABASE_SECRET_KEY`

Không được xóa các biến này trong giai đoạn chuyển song song. Chúng chỉ được gỡ sau khi Auth, database, Storage, API và rollback đã được kiểm tra hoàn chỉnh.

## 7. Phân nhóm chuyển đổi đề xuất

### Nhóm A — Chuyển thử trước, rủi ro thấp

- `app_visibility_settings`
- `bes_launcher_settings`
- `ai_website_settings`
- `vietnam_atmosphere_settings`

### Nhóm B — Storage và metadata

- `work-hub-submissions` → R2
- `shared-music` → R2
- `thpt-html-lessons` → R2
- `resource_items` và các bảng Knowledge Hub → D1

### Nhóm C — Nghiệp vụ chính

- Work Hub
- Lịch làm việc
- Assessment
- Automation
- Content Ecosystem

### Nhóm D — Dữ liệu nhạy cảm/phức tạp

- Homeroom
- Profiles và personnel directory
- Auth và quản trị tài khoản

## 8. Những gì chưa thể xác nhận chỉ từ GitHub

Để hoàn tất Giai đoạn 0, cần đối chiếu với Supabase Dashboard:

1. Danh sách bảng/view thực tế trong Database.
2. Số hàng và dung lượng từng bảng.
3. Danh sách bucket và dung lượng/file count từng bucket.
4. Edge Functions đang deploy.
5. Cron jobs, database functions, triggers và extensions đang hoạt động.
6. RLS policies hiện có.
7. Các bảng cũ vẫn có dữ liệu nhưng mã nguồn không còn tham chiếu.

Không được xóa hoặc bỏ qua các đối tượng chỉ vì chúng không xuất hiện trong mã nguồn hiện tại.

## 9. Kết luận Giai đoạn 0 từ phía mã nguồn

- Brian phụ thuộc sâu vào Supabase nhưng đã có lớp runtime tập trung, nên có thể thay dần backend.
- Không nên chuyển 89 đối tượng thô; danh sách runtime rõ ràng hiện là khoảng 42 bảng/đối tượng.
- Auth nên giữ Supabase cho tới giai đoạn cuối.
- R2 nên được triển khai trước cho file nộp Work Hub.
- D1 nên bắt đầu bằng các bảng cấu hình nhỏ, sau đó mới đến Work Hub, Assessment và Homeroom.
- Production chưa bị thay đổi trong Giai đoạn 0.
