# Brian English Studio V10.86.1 — Stability Guard

## Mục tiêu

V10.86.1 củng cố V10.86.0 trước khi tiếp tục phát triển Launcher, AI và workflow. Bản này không thêm module nghiệp vụ mới mà bổ sung lớp bảo vệ chạy độc lập với React để ứng dụng vẫn có thể tự phục hồi khi bundle chính gặp lỗi.

## Thành phần đã triển khai

### 1. Runtime Error Capture

- Bắt `window.error` và `unhandledrejection`.
- Lưu tối đa 40 lỗi gần nhất trong localStorage.
- Loại bỏ trường nhạy cảm như token, API key, password, prompt, content và answer khỏi metadata.
- Phát sự kiện `bes-runtime-error-recorded` để System Health có thể tiếp nhận ở bản sau.

### 2. Stale Chunk Recovery

- Bắt sự kiện `vite:preloadError`.
- Tải lại một lần với tham số cache-busting.
- Nếu vẫn lỗi, hiển thị bảng phục hồi thay vì để trắng trang.

### 3. Blank-Screen Watchdog

- Kiểm tra root sau 12 giây.
- Chỉ hiển thị overlay khi root gần như trống và không có thành phần giao diện có ý nghĩa.
- Không phủ lên ứng dụng khi app đã render bình thường.

### 4. Safe Launcher Recovery

- Chỉ xử lý ba khóa cấu hình Launcher cục bộ.
- Sao lưu mỗi khóa sang tên `-quarantine-<timestamp>` trước khi xóa khóa hoạt động.
- Không đụng dữ liệu Supabase, thư viện, đề thi hoặc hồ sơ.

### 5. Diagnostic Report

Báo cáo JSON gồm:

- phiên bản Stability Guard;
- route hiện tại;
- trạng thái online;
- khả năng đọc/ghi localStorage;
- tình trạng JSON của các cấu hình hệ thống quan trọng;
- lỗi runtime gần đây;
- thao tác phục hồi gần nhất.

### 6. Release Guard

Kiểm tra trước deploy:

- package và manifest đúng phiên bản;
- guard đã được nạp bằng `defer`;
- không có Git conflict marker;
- không lộ Supabase service-role key trong source;
- không dùng AI secret dạng `VITE_*`;
- route nền tảng `#/qa` và `#/ai-governance` vẫn còn;
- manifest không yêu cầu SQL hoặc ENV mới.

### 7. Project Doctor

- Kiểm tra cấu trúc repository.
- Liệt kê asset lớn hơn 1 MB.
- cảnh báo stylesheet lớn để chuẩn bị cho Performance Architecture.
- xuất báo cáo tại `reports/v10.86.1-project-doctor.json`.

## Khả năng tương thích

- Nền: V10.86.0.
- Không thêm npm dependency.
- Không thay package-lock.
- Không thay Vite.
- Không cần migration Supabase.
- Không cần biến môi trường mới.
- Có rollback tự động từ `.bes-backup`.
