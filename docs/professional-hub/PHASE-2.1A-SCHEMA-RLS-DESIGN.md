# PHASE 2.1A — SCHEMA & RLS DESIGN

## Phạm vi

Phase này tạo migration và kiểm tra tĩnh cho Hub Chuyên môn mới.

Migration **chưa được áp dụng vào Supabase thật**.

## Migration

`supabase/migrations/20260723121044_professional_hub_core.sql`

## Bảng được thiết kế

1. `professional_hubs`
2. `professional_hub_members`
3. `professional_hub_tasks`
4. `professional_hub_task_assignees`
5. `professional_hub_plans`
6. `professional_hub_records`
7. `professional_hub_meetings`
8. `professional_hub_evidence`
9. `professional_hub_notifications`

## Tài khoản thật

Membership dùng trực tiếp:

```text
auth.users.id
```

Không lưu danh sách giáo viên mẫu và không tạo hệ thống đăng nhập riêng.

## Vai trò

- `leader`: TTCM
- `teacher`: Giáo viên

## Quy tắc khởi tạo Hub

Không cho client tự tạo Hub hoặc tự cấp quyền leader.

Hub và leader đầu tiên phải được tạo bằng một đường quản trị đáng tin cậy:

- service role;
- server action bảo vệ;
- hoặc công cụ Brian Admin có audit log.

## RLS

- Thành viên chỉ đọc Hub của mình.
- TTCM quản lý thành viên và nhiệm vụ trong Hub của mình.
- Giáo viên cập nhật tiến độ phân công của chính mình.
- Giáo viên tạo hồ sơ, kế hoạch và minh chứng thuộc sở hữu của mình.
- TTCM có thể duyệt và cập nhật dữ liệu trong Hub.
- Thông báo chỉ người nhận mới đọc hoặc đánh dấu đã đọc.
- Không có anonymous policy.

## Lưu ý workflow

RLS bảo vệ phạm vi dữ liệu và quyền sở hữu.

Các chuyển trạng thái nghiêm ngặt như:

- submitted → approved;
- submitted → needs_revision;
- submitted → verified;

sẽ được khóa thêm bằng RPC hoặc server-side service trong Phase sau.

## Kiểm tra

- [x] 9 bảng namespace riêng.
- [x] 9 bảng bật RLS.
- [x] Helper membership và role.
- [x] Không có dấu vết app Tổ chuyên môn cũ.
- [x] Không có giáo viên hard-code.
- [x] Migration bọc trong transaction.
- [ ] Chưa chạy trên Supabase.
- [ ] Chưa kiểm thử với hai tài khoản thật.
- [ ] Chưa nối giao diện.
- [ ] Chưa merge.
- [ ] Chưa deploy Production.
