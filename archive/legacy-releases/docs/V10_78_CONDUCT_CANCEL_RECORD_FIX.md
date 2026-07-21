# V10.78 — Sửa nút Hủy ghi nhận rèn luyện

- Thay `window.prompt()` bằng hộp thoại xác nhận nằm trong ứng dụng.
- Không còn yêu cầu nhập lý do khi hủy ghi nhận.
- Sau khi xác nhận, bản ghi chuyển sang trạng thái `cancelled` thay vì bị xóa vĩnh viễn.
- Bảng điểm tuần được tính lại ngay sau khi lưu.
- Hiển thị indicator trong lúc xử lý và thông báo thành công/cảnh báo/lỗi rõ ràng.
- Nhật ký thay đổi vẫn giữ người thao tác, thời gian và trạng thái trước khi hủy.
- Chặn thao tác khi tuần đang khóa và đưa ra thông báo trực quan.
- Hỗ trợ giao diện tối và màn hình nhỏ.
