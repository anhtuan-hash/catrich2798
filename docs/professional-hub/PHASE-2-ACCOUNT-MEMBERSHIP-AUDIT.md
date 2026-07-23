# PHASE 2.0 — ACCOUNT, MEMBERSHIP, PERMISSION & NOTIFICATION AUDIT

## Mục tiêu

Khóa cơ chế dữ liệu trước khi nối Hub Chuyên môn vào Supabase.

Phase này không tạo bảng, không sửa RLS, không ghi dữ liệu và không thay đổi giao diện đã duyệt.

## Nguyên tắc bắt buộc

1. Hub Chuyên môn dùng phiên đăng nhập Brian hiện tại.
2. Không có màn hình đăng nhập riêng.
3. Giáo viên là tài khoản thật trong hệ thống Brian.
4. Không dùng tên giáo viên hard-code.
5. Một tài khoản chỉ thấy Hub mà tài khoản đó là thành viên.
6. TTCM và Giáo viên có quyền khác nhau.
7. Thông báo phải gắn với người nhận thật và có trạng thái đã đọc/chưa đọc.
8. Không phục hồi bảng, route hoặc quyền của ứng dụng Tổ chuyên môn cũ.
9. Phase 2 phải dùng namespace `professional_hub_*` để tránh đụng cấu trúc cũ.
10. Không deploy Production trước khi RLS và kiểm thử quyền hoàn tất.

## Kiểm kê file nền tảng

```text
src/utils/auth.js	22141 bytes
src/utils/supabase.js	1525 bytes
src/services/runtime/core.js	7309 bytes
src/pages/ToolPage.jsx	8837 bytes
src/data/apps.js	15424 bytes
supabase/schema.sql	28059 bytes
src/apps/professional-hub/ProfessionalHubApp.jsx	11959 bytes
```

## Kiểm tra currentUser và route native

```text
ProfessionalHubApp receives currentUser: YES
ProfessionalHubApp receives language: YES
ToolPage references ProfessionalHub: YES
ToolPage passes props or currentUser: YES
Professional Hub has separate login UI: NO
Professional Hub has hard-coded teacher roster: NO
```

## Kiểm tra tên object có thể tồn tại trong schema

```text
profiles: FOUND
notifications: NOT_FOUND
user_notifications: NOT_FOUND
department_members: NOT_FOUND
department_memberships: NOT_FOUND
professional_hubs: NOT_FOUND
professional_hub_members: NOT_FOUND
tasks: FOUND
plans: FOUND
records: NOT_FOUND
evidence: FOUND
meetings: FOUND
```

## Mô hình dữ liệu đề xuất

### `professional_hubs`

Thông tin Hub:

- `id`
- `name`
- `subject`
- `school_year`
- `status`
- `created_by`
- `created_at`
- `updated_at`

### `professional_hub_members`

Liên kết Hub với tài khoản Brian:

- `id`
- `hub_id`
- `user_id`
- `role`: `leader` hoặc `teacher`
- `membership_status`
- `joined_at`
- `created_by`

Ràng buộc duy nhất:

```text
unique(hub_id, user_id)
```

### `professional_hub_tasks`

- `hub_id`
- `title`
- `description`
- `assignee_id`
- `created_by`
- `priority`
- `status`
- `due_at`
- `progress`
- timestamps

### `professional_hub_records`

- `hub_id`
- `owner_id`
- `record_type`
- `title`
- `status`
- `reviewer_id`
- `feedback`
- file metadata
- timestamps

### `professional_hub_plans`

- `hub_id`
- `title`
- `plan_type`
- `status`
- `owner_id`
- period fields
- approval fields
- timestamps

### `professional_hub_meetings`

- `hub_id`
- `title`
- `starts_at`
- `ends_at`
- `location`
- `chair_id`
- `secretary_id`
- agenda/minutes
- timestamps

### `professional_hub_evidence`

- `hub_id`
- `owner_id`
- `title`
- `category`
- `status`
- verification fields
- file metadata
- timestamps

### `professional_hub_notifications`

- `hub_id`
- `recipient_id`
- `actor_id`
- `notification_type`
- `entity_type`
- `entity_id`
- `title`
- `body`
- `read_at`
- `created_at`

## Phân quyền đề xuất

### TTCM (`leader`)

- Xem toàn bộ thành viên thuộc Hub.
- Giao, sửa, thu hồi và xóa nhiệm vụ.
- Tạo và duyệt kế hoạch.
- Xem, phản hồi và duyệt hồ sơ.
- Tạo lịch họp và biên bản.
- Xác minh minh chứng.
- Xuất báo cáo.
- Gửi thông báo tới một, nhiều hoặc toàn bộ giáo viên trong Hub.
- Không được xem Hub khác nếu không có membership.

### Giáo viên (`teacher`)

- Xem Hub được phân công.
- Xem nhiệm vụ của mình hoặc nhiệm vụ chung.
- Cập nhật tiến độ nhiệm vụ của mình.
- Nộp và chỉnh sửa hồ sơ của mình trong trạng thái cho phép.
- Xem lịch họp và phản hồi được yêu cầu.
- Tải minh chứng của mình.
- Xem thông báo gửi tới mình.
- Không được duyệt hồ sơ, xác minh minh chứng hoặc quản trị thành viên.

### Brian Admin

Admin Brian không tự động trở thành TTCM của mọi Hub.

Quyền quản trị hệ thống và membership Hub phải tách biệt. Admin chỉ vào nghiệp vụ Hub khi:

- được thêm làm thành viên;
- hoặc có một cơ chế support/audit riêng, có log.

## RLS bắt buộc

Mọi bảng nghiệp vụ phải kiểm tra membership bằng `auth.uid()`.

Các nguyên tắc:

- Thành viên chỉ đọc dữ liệu của Hub mình thuộc về.
- Giáo viên chỉ cập nhật bản ghi thuộc quyền sở hữu hoặc được giao.
- TTCM chỉ thao tác trong Hub mà mình có role `leader`.
- Notification chỉ đọc được bởi `recipient_id = auth.uid()`.
- Không dùng anon access cho dữ liệu nghiệp vụ.
- Storage path phải chứa `hub_id` và được kiểm tra membership.

## Luồng thông báo

1. Hành động nghiệp vụ thành công.
2. Tạo notification cho đúng người nhận.
3. Brian notification badge hiển thị số chưa đọc.
4. Người dùng mở notification.
5. Điều hướng tới đúng tab và entity.
6. Ghi `read_at`.
7. Realtime chỉ dùng để làm mới badge/danh sách; database vẫn là nguồn sự thật.

## Cổng triển khai Phase 2.1

Chỉ bắt đầu tạo schema khi đã xác nhận:

- nguồn danh sách tài khoản thật;
- khóa chính người dùng là `auth.users.id` hay profile id;
- tên cột hiển thị tên giáo viên;
- cơ chế phân biệt admin/teacher hiện tại;
- bảng notification dùng chung có thể tái sử dụng hay cần namespace riêng;
- cách `currentUser` được truyền vào `ProfessionalHubApp`;
- quy tắc một người có thể thuộc nhiều Hub hay không.

## Trạng thái

- [x] Phase 1 UI đã đủ điều kiện khóa.
- [x] Không có đăng nhập riêng.
- [x] Không có giáo viên mẫu.
- [x] Baseline Brian build pass.
- [x] Đã thu thập bằng chứng auth/profile/schema.
- [ ] Chưa tạo bảng.
- [ ] Chưa tạo RLS.
- [ ] Chưa nối danh sách giáo viên.
- [ ] Chưa nối thông báo.
- [ ] Chưa merge.
- [ ] Chưa deploy Production.
