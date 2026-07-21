# V11.3.5 Test Report

## Kiểm tra tĩnh

- Feature contract: 15/15 đạt.
- JavaScript API syntax: đạt.
- JavaScript utility syntax: đạt.
- JSX/TS parser cho `WorkHub.jsx`: đạt.
- Release guard: đạt.
- Registry nội bộ npm: không có.
- Font cá nhân: không được đưa vào gói cập nhật.

## Luồng cần kiểm tra trên Production

1. Giáo viên nộp một file DOCX hoặc PDF trong Trung tâm công việc.
2. Admin/TTCM mở phản hồi và nhấn `Lưu vào Kho học liệu`.
3. Chọn danh mục và lưu.
4. Xác nhận giao diện hiện `Đã lưu vào Kho học liệu`.
5. Mở Kho học liệu và tìm thấy tài liệu ở trạng thái đã duyệt.
6. Kiểm tra file mở được từ Google Drive.
7. Nhấn lưu lại cùng file và xác nhận hệ thống tái sử dụng học liệu cũ thay vì tạo bản sao.

## Giới hạn xác nhận

Không thể kiểm thử trực tiếp Google Drive và Supabase Production trong môi trường đóng gói. Cần chạy migration và kiểm thử bằng hai tài khoản thật sau khi deploy.
