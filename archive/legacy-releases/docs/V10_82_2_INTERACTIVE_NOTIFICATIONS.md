# V10.82.2 — Thông báo tương tác trực tiếp

Bản cập nhật chuyển Trung tâm thông báo từ danh sách liên kết sang bảng xử lý trực tiếp.

## Tương tác mới

- Nhấn một thông báo để mở chi tiết ngay trong panel, không tự rời trang.
- TTCM/Admin duyệt hoặc từ chối yêu cầu quyền ngay tại thông báo.
- TTCM/Admin duyệt hồ sơ hoặc yêu cầu giáo viên chỉnh sửa, kèm ghi chú phản hồi.
- Giáo viên nộp hồ sơ theo thông báo của TTCM ngay trong panel: nhập tên, ghi chú và chọn file.
- TTCM/Admin đóng yêu cầu nộp hồ sơ trực tiếp.
- Mở file đính kèm, mở trang liên quan và đánh dấu đã đọc bằng nút riêng.
- Giáo viên gửi lại yêu cầu quyền đã bị từ chối ngay trong panel.
- Phản hồi thành công/lỗi hiển thị ngay trong bảng thông báo.

## Phân quyền

Mọi thao tác vẫn sử dụng các hàm Supabase và RLS hiện có. Giao diện chỉ hiện thao tác phù hợp với vai trò hiện tại; quyền được kiểm tra lại ở tầng dữ liệu.

## Cài đặt

Không cần chạy thêm SQL. Chép gói update-only vào repository V10.82.1, build và push lại Vercel.
