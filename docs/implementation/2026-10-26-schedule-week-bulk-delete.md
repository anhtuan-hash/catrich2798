# ESL Brian — Xóa nhanh lịch làm việc theo tuần

## Chức năng
- Trong **Lịch làm việc dùng chung**, Admin/TTCM có nút **Xóa theo tuần** ở Desktop và Mobile/nhúng Dashboard.
- Chọn tuần bằng nút trước/sau; tuần tính **Thứ Hai 00:00 → Thứ Hai tuần sau 00:00** theo múi giờ `Asia/Ho_Chi_Minh` (+07:00).
- Danh sách xem trước tải **trực tiếp từ Supabase** bằng bộ lọc `item_type='schedule'`, `due_at >= week.startAt`, `due_at < week.endAt`; phân trang đến 4.000 bản ghi (lớn hơn giới hạn này bị chặn để tránh xóa thiếu).
- Mặc định chỉ chọn mục nhập từ CSV/XLSX (`schedule_import_id`, `schedule_source_file`, `schedule_imported_at`), không tự chọn mục được thêm thủ công. Có thể bật **Bao gồm mục thêm thủ công** để xóa nếu cố ý.
- Có checkbox từng dòng, **Chọn tất cả / Bỏ chọn** và đếm số mục. Bắt buộc nhập `XOA` mới mở nút xóa. Chưa nhập thì không làm thay đổi dữ liệu.
- Trước khi xóa thực, đọc lại tập mục hiện tại và đối chiếu `id`, `title`, `due_at`, `schedule_import_id`; nếu có thay đổi thì chặn và yêu cầu mở lại màn hình rà soát.
- Xóa thành từng nhóm tối đa 40 ID với ràng buộc `item_type='schedule'` và khoảng thời gian chính xác. Kiểm tra số hàng xóa thực tế. Hiển thị tình trạng xóa một phần nếu lỗi giữa các nhóm; không báo thành công toàn bộ giả.
- Đồng bộ cache, phát sự kiện cập nhật schedule; lưu audit `schedule.week_bulk_deleted` với số lượng, tuần và ID mục bị xóa.
- **Không xóa mục giao việc (`item_type='task'`)**, mục ngoài tuần, hay bảng `bes_events`, `bes_event_recipients`, `bes_event_receipts`. Các sự kiện thông báo đã xuất bản được giữ độc lập.

## An toàn và phân quyền
- Nút chỉ dành cho Admin/TTCM; Supabase RLS hiện có tiếp tục là lớp thực thi quyền xóa.
- Không phát sinh AI/API hoặc dịch vụ trả phí.
- Xóa thật là vĩnh viễn, không có Undo; modal cảnh báo rõ ràng và bắt nhập xác nhận.
- Nếu mạng lỗi, chưa đăng nhập hoặc quyền Supabase bị từ chối, không xóa dữ liệu bằng cache cục bộ.

## Kiểm thử
`node scripts/test-work-schedule-week-bulk-delete.mjs`, được gắn vào lệnh `npm run build` trước khi Vercel Preview/Production được triển khai. Các trường hợp: tuần bắc qua tháng/năm, biên múi giờ, lọc loại việc, không xóa manual mặc định, đối chiếu thay đổi giữa xem trước và xóa, không đụng tới sự kiện.

## Giới hạn
- Xóa theo **tuần diễn ra sự kiện**, không phải tuần tải file. Nếu một file chứa nhiều tuần, mỗi tuần được xét riêng.
- Các bản nháp/sự kiện trong Event Manager không bị xóa theo lịch, để tránh mất thông báo đã phát hành. Người quản trị có thể xử lý riêng nếu cần.
