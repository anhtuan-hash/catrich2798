# V10.70 · Xét kết quả rèn luyện theo tuần

## Chức năng mới trong thẻ Chủ nhiệm

- Mỗi học sinh bắt đầu tuần với 100 điểm.
- Ghi nhận vi phạm theo danh mục Quyết định 95/QĐ-PEK của Trường Trung – Tiểu học Pétrus Ký.
- Hiển thị đồng thời điểm thi đua chính thức của trường và mức trừ quy đổi cho thang 100 điểm cá nhân.
- Tự tính điểm còn lại và xếp mức Tốt, Khá, Đạt, Chưa đạt.
- Tổng hợp trung bình theo tháng, giữa học kỳ, cuối học kỳ và cả năm.
- Cho phép cấu hình ngưỡng xếp loại và ngày bắt đầu/kết thúc từng giai đoạn.
- Đồng bộ đi trễ và vắng không phép từ dữ liệu điểm danh, có chống ghi nhận trùng.
- Hỗ trợ trạng thái chờ xác nhận, xác nhận và hủy ghi nhận có lưu nhật ký.
- Gắn cờ các vi phạm nghiêm trọng cần GVCN xem xét thủ công.
- Có ô nhập “Vi phạm khác” cùng số điểm trừ tối thiểu 5 điểm.
- Có danh mục nội quy bổ sung để lưu các quy định mới trong tương lai, hỗ trợ kích hoạt hoặc tạm ẩn.
- Đính kèm toàn văn PDF Quyết định 95/QĐ-PEK để mở, tải và xem trực tiếp trong ứng dụng.

## Lưu trữ

Dữ liệu rèn luyện được lưu trong payload workspace hiện có:

- `conductRecords`
- `conductCustomRules`
- `conductSettings`

Không cần chạy thêm migration SQL vì bảng `bes_homeroom_workspaces` đã lưu payload JSON theo tài khoản và lớp.
