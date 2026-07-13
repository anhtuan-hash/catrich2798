# V10.93.0 Consolidated Release

## 1. Mục tiêu kiến trúc

Các bản V10.89–V10.90 trước đây đưa Work Hub và Smart Knowledge vào hệ thống bằng JavaScript/CSS chèn từ `index.html`. Khi Supabase client thật được đóng trong module Vite, các trang này phải dựa vào runtime bridge, RPC patch và API-key capture. V10.93 loại bỏ chuỗi phụ thuộc đó.

Luồng mới:

```text
Vite boot
→ src/utils/supabase.js
→ Runtime Core
→ Auth / profile / role
→ React routes
→ Database / RPC / Realtime
```

Không còn dùng access token làm `apikey`, không dò key từ network và không tự tạo REST client song song.

## 2. Runtime Core

Các file chính:

- `src/services/runtime/core.js`
- `src/services/runtime/useRuntimeCore.js`
- `src/utils/supabase.js`

Runtime Core cung cấp session, hồ sơ, vai trò, query, RPC, Realtime và báo cáo chẩn đoán thống nhất. Có thể kiểm tra trong Console:

```js
window.BESRuntimeCore?.report?.()
window.BESSupabase?.getStatus?.()
```

Báo cáo không công khai API key hoặc access token.

## 3. Module V10.91–V10.93

### Brian AI Workspace

Route: `#/ai-workspace`

- Nhận văn bản và nhiều file.
- Trích xuất PDF/DOCX khi trình duyệt hỗ trợ.
- Hỏi, tạo, chuyển đổi và lập kế hoạch hành động.
- Dùng hệ thống provider AI hiện có.
- Lưu dự án vào `ai_workspace_projects`; có local fallback.
- Gửi đầu ra sang Content Factory.

### Teaching Content Factory

Route: `#/content-factory`

- Tạo nhiều loại học liệu từ một nguồn.
- Có AI JSON generation và mẫu offline.
- Chỉnh sửa nội dung trước khi xuất.
- Xuất JSON và HTML.
- Chuyển câu hỏi sang Assessment Core.

### Assessment Core

Route: `#/assessment-core`

- Ngân hàng câu hỏi có metadata.
- Import nội dung dán và sản phẩm Content Factory.
- Blueprint theo kỹ năng, CEFR và số lượng.
- Tạo đề, nhiều mã đề và đảo phương án.
- Xuất JSON và HTML in ấn.

## 4. Module được hợp nhất

- `#/work-hub`: React-native Work Hub.
- `#/knowledge-hub`: React-native Smart Knowledge.
- Các route cũ vẫn giữ nguyên để không làm hỏng bookmark và Launcher.
- Command Center, Global Navigation và trang Ứng dụng đã đăng ký các module mới.

## 5. Database

Migration chính:

`supabase/brian_v10_93_consolidated_migration.sql`

Migration tạo hoặc bổ sung:

- `bes_schema_registry`
- `ai_workspace_projects`
- `ai_workspace_messages`
- `content_factory_projects`
- `assessment_items`
- `assessment_blueprints`
- `assessment_tests`
- `assessment_test_items`

Migration giữ lại các bảng Work Hub, Resource Library và Smart Knowledge đã có, đồng thời bổ sung các cột tương thích cần thiết.

## 6. Kiểm thử đã chạy

Trên source được cung cấp:

- V10.93 consolidated static checks: 44/44.
- Legacy smoke tests: 179/179.
- Department runtime: Admin, TTCM và Teacher đều đạt.
- Vite production build: đạt, 198 modules transformed.
- Release Guard: 0 lỗi; chỉ cảnh báo font cá nhân phải bị loại khỏi ZIP phát hành.

Migration SQL chưa được chạy trực tiếp trên Supabase Production trong môi trường đóng gói. Cần chạy preflight, migration và verify trên dự án Supabase của hệ thống.

## 7. Kiểm thử nghiệm thu hai tài khoản

### Admin/TTCM

- Mở Work Hub và giao nhiệm vụ cho giáo viên.
- Mở Knowledge Hub, chỉnh metadata và tạo bộ sưu tập tổ.
- Tạo dự án AI, chuyển sang Content Factory.
- Đưa câu hỏi vào Assessment Core và tạo đề.

### Giáo viên

- Nhận nhiệm vụ, chuyển trạng thái và nộp sản phẩm.
- Xem tài liệu đã duyệt, yêu thích và tạo bộ sưu tập cá nhân.
- Chỉ đọc hoặc sửa dữ liệu trong phạm vi RLS cho phép.

### Realtime

Mở đồng thời hai tài khoản. Thay đổi nhiệm vụ hoặc tài liệu ở một tài khoản phải xuất hiện ở tài khoản còn lại sau Realtime event hoặc nút làm mới.

## 8. Khả năng quay lại

Installer update-only tạo backup file trong `.bes-backup/v10.93.0-*` và manifest trong `.bes-release/v10.93.0-install.json`. Script rollback chỉ khôi phục source. Không tự xóa bảng mới vì việc giữ chúng không ảnh hưởng ứng dụng cũ và an toàn hơn xóa dữ liệu.
