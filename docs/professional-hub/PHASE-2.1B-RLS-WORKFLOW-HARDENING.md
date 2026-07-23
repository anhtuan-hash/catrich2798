# PHASE 2.1B — RLS & WORKFLOW HARDENING

## Phạm vi

Gia cố migration của Hub Chuyên môn trước khi chạy trên Supabase thật.

Migration Phase 2.1B:

`supabase/migrations/20260723132208_professional_hub_rls_hardening.sql`

Migration này chưa được áp dụng vào Supabase.

## Thay đổi bảo mật

### Giáo viên

- Chỉ đọc phân công của chính mình.
- Chỉ đọc kế hoạch, hồ sơ và minh chứng thuộc sở hữu của mình.
- Chỉ cập nhật tiến độ, ghi chú và trạng thái nộp của phân công.
- Không thể thay người nhận, Hub hoặc nhiệm vụ của một phân công.
- Không thể tự đặt nhiệm vụ thành hoàn tất.
- Không thể tự duyệt kế hoạch, hồ sơ hoặc minh chứng.
- Chỉ được sửa bản nháp hoặc bản cần chỉnh sửa.
- Sau khi nộp, phải chờ TTCM phản hồi.

### TTCM

- Đọc toàn bộ dữ liệu nghiệp vụ trong Hub mình quản lý.
- Duyệt nội dung đã được giáo viên nộp.
- Không thể tự duyệt nội dung do chính mình sở hữu.
- Không thể xóa TTCM cuối cùng khỏi Hub.
- Không thể chuyển membership sang Hub hoặc tài khoản khác.
- Quản lý thành viên bằng trạng thái thay vì xóa vật lý.

### Thông báo

Người nhận chỉ được thay đổi trường:

```text
read_at
```

Không thể sửa tiêu đề, nội dung, người gửi, người nhận hoặc entity.

### Tính toàn vẹn thành viên

Các đối tượng sau phải là thành viên đang hoạt động trong đúng Hub:

- người nhận nhiệm vụ;
- chủ sở hữu kế hoạch;
- chủ sở hữu hồ sơ;
- chủ sở hữu minh chứng;
- người nhận thông báo;
- chủ trì và thư ký cuộc họp.

### Xóa dữ liệu

Không cho client xóa vật lý:

- membership;
- kế hoạch;
- hồ sơ;
- minh chứng.

Các đối tượng này sử dụng trạng thái hoặc lưu trữ để giữ lịch sử.

## Nhật ký kiểm toán

Đã bổ sung:

`professional_hub_audit_log`

Ghi lịch sử thay đổi cho:

- thành viên;
- nhiệm vụ;
- phân công nhiệm vụ;
- kế hoạch;
- hồ sơ;
- cuộc họp;
- minh chứng.

Chỉ TTCM của đúng Hub được đọc nhật ký. Client không được tự ghi, sửa hoặc xóa nhật ký.

## Cổng trước khi áp dụng Supabase

- [x] Không có anonymous access.
- [x] Không có giáo viên mẫu.
- [x] Không dùng app Tổ chuyên môn cũ.
- [x] Khóa tự duyệt.
- [x] Khóa chỉnh dữ liệu người khác.
- [x] Khóa thay đổi notification ngoài read_at.
- [x] Bảo vệ TTCM cuối cùng.
- [x] Bổ sung audit log.
- [ ] Chưa chạy migration trên Supabase.
- [ ] Chưa kiểm thử bằng hai tài khoản thật.
- [ ] Chưa kiểm thử service-role provisioning.
- [ ] Chưa nối giao diện.
- [ ] Chưa merge.
- [ ] Chưa deploy Production.
