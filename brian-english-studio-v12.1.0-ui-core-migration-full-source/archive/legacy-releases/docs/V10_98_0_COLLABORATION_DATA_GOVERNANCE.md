# V10.98.0 — Collaboration & Data Governance

## Mục tiêu

V10.98 bổ sung lớp cộng tác và quản trị dữ liệu dùng chung cho Brian English Studio. Phiên bản này không thay thế Work Hub, Resource Library hay Assessment Core; nó kết nối các module đó bằng không gian dự án, lịch sử phiên bản, audit log, snapshot và thùng rác 30 ngày.

## Route mới

- `#/collaboration-hub`: Không gian cộng tác.
- `#/data-governance`: Audit, backup, khôi phục, thùng rác và quyền ngoại lệ.

## Collaboration Hub

- Tạo không gian cho dự án, kế hoạch tổ, nghiên cứu bài học, biên soạn đề, học liệu, chủ nhiệm và sự kiện.
- Thành viên theo vai trò: owner, manager, editor, member, viewer.
- Thảo luận theo chủ đề, phản hồi và nhắc tên.
- Realtime Presence qua Supabase channel.
- Phiên bản nội dung tăng tuần tự; khôi phục luôn tạo một phiên bản mới để không ghi đè lịch sử.
- Local fallback khi database chưa cài migration.

## Data Governance

- Audit log theo người dùng, hành động, đối tượng và module.
- Permission override có mức quyền và thời điểm hết hạn.
- Snapshot theo phạm vi collaboration, work, knowledge, assessment hoặc automation.
- Xem trước trước khi khôi phục.
- Thùng rác cloud 30 ngày.
- Resource Library chuyển sang xóa mềm: file Google Drive không bị xóa ngay.
- Xóa vĩnh viễn và khôi phục chỉ dành cho Admin/TTCM theo RLS.

## Database

Migration tạo:

- `collaboration_spaces`
- `collaboration_members`
- `collaboration_threads`
- `collaboration_comments`
- `content_versions`
- `permission_overrides`
- `audit_events`
- `backup_snapshots`
- `backup_items`
- `deleted_items`

Migration bổ sung `deleted_at` và `deleted_by` vào `resource_items` khi bảng này tồn tại.

## Giới hạn có chủ ý

- Presence chỉ hiển thị khi các tài khoản đang mở cùng không gian.
- Restore chỉ upsert các bảng nằm trong danh sách hỗ trợ; không chạy SQL động tùy ý.
- Xóa mềm Resource Library chưa xóa file Drive. Khi Admin/TTCM xác nhận xóa vĩnh viễn trong Data Governance, file mới được chuyển vào thùng rác Google Drive và bản ghi mới được đánh dấu `purged`.
- Snapshot lớn bị giới hạn bởi số bản ghi tải từ mỗi bảng để tránh vượt payload trình duyệt.
