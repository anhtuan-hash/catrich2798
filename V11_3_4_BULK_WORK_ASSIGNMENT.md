# Brian English Studio V11.3.4 — Bulk Work Assignment & Safe Delete

## Giao việc hàng loạt

Admin/TTCM có ba chế độ:

- **Tự thực hiện**: tạo một công việc cho chính mình.
- **Chọn nhiều người**: tìm kiếm và đánh dấu nhiều giáo viên.
- **Cả tổ**: chọn toàn bộ tài khoản giáo viên thuộc tổ hiện tại; nếu hồ sơ chưa có thông tin tổ, ứng dụng dùng danh sách giáo viên khả dụng.

Mỗi người nhận được **một bản ghi công việc riêng**, nhờ đó trạng thái, hạn nộp, phản hồi và tệp nộp được theo dõi độc lập. Các bản ghi trong cùng một lần giao có `assignment_batch_id` chung trong `metadata`.

## Thông báo

Trigger V11.3.3 tiếp tục gửi thông báo Realtime riêng tới từng giáo viên. Hotfix âm báo và badge động cũng được giữ nguyên.

## Xoá công việc

Admin/TTCM có thể:

- Xoá một công việc đã giao.
- Xoá toàn bộ đợt giao hàng loạt.

Trước khi xoá bản ghi, ứng dụng tìm và xoá tệp nộp trong bucket riêng tư `work-hub-submissions`. Sau đó Supabase xoá công việc; phản hồi, hoạt động và thông báo liên quan được xoá theo quan hệ cascade.

RLS chỉ cấp quyền DELETE cho Admin/TTCM/department leader.
