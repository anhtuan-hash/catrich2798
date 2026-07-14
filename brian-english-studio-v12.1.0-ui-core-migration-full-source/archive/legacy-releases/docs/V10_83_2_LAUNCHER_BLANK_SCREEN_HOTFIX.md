# V10.83.2 — Launcher Blank-Screen Hotfix

## Hiện tượng

Sau khi triển khai V10.83.1, trang Ứng dụng có thể chỉ hiển thị nền trắng. Từ ảnh chụp màn hình không thể xác định duy nhất một lỗi console, vì vậy bản hotfix xử lý đồng thời hai nhóm nguyên nhân thường gặp: tệp JavaScript động bị trình duyệt giữ từ deployment cũ và cấu hình launcher local/cloud không đúng cấu trúc.

## Thay đổi

- Bổ sung `AppErrorBoundary` ở cấp toàn ứng dụng, trang launcher, thanh điều hướng và AI Messenger.
- Khi một tính năng lỗi, app hiển thị màn hình khôi phục thay vì xóa trắng toàn bộ giao diện.
- Bắt sự kiện `vite:preloadError` và tải lại có kiểm soát khi chunk cũ không còn tồn tại sau deployment.
- Thêm boot watchdog trong `index.html`; nếu bundle chính không khởi động trong 8 giây, người dùng nhận được nút tải lại và reset launcher.
- Chuẩn hóa launcher config từ localStorage và Supabase, kể cả khi JSON bị lưu dưới dạng chuỗi lồng nhau, mảng sai kiểu, nhóm null hoặc assignment không hợp lệ.
- Realtime launcher không còn phát lại sự kiện nội bộ dư thừa.
- AI Messenger dùng bộ đọc/ghi localStorage an toàn, tránh lỗi trong chế độ duyệt hạn chế.
- Không thay đổi dữ liệu học liệu, hồ sơ, bài kiểm tra hay cấu trúc Supabase.

## Kiểm tra

- Vite production build: passed.
- 151 smoke checks: passed.
- Department runtime: Admin, TTCM, Teacher passed.
- Runtime thử với launcher config hỏng: 19 thẻ render, không mở recovery screen, không phát sinh render error.

## SQL

Không có migration mới. Giữ nguyên `supabase/launcher_settings_v10_83_1.sql` nếu dự án chưa từng chạy migration launcher.
