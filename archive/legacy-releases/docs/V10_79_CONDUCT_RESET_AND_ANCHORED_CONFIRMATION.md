# Brian English Studio V10.79

## Sửa reset dữ liệu tuần

- Loại bỏ hộp `window.confirm` khỏi quy trình reset.
- Xác nhận reset được hiển thị ngay trong hộp thao tác với checkbox bắt buộc.
- Sau khi reset, tuần được đánh dấu đã mở thủ công để cơ chế khóa tự động không khóa lại ngay.
- Xóa đúng vi phạm, điểm cộng và bản tổng kết của tuần đang chọn.
- Giữ sự kiện reset trong nhật ký tuần.

## Hộp xác nhận hủy ghi nhận

- Render qua React Portal trực tiếp vào `document.body` để không bị lệch bởi vùng cuộn hoặc hiệu ứng transform của trang.
- Hộp xác nhận xuất hiện cạnh nút “Hủy ghi nhận” vừa nhấn.
- Tự chuyển lên phía trên nếu phía dưới nút không đủ chỗ.
- Trên điện thoại, hộp xác nhận chuyển thành bottom sheet luôn nằm trong màn hình.
