# Brian English Studio V10.83.3 — Global Command Center

## Tổng quan

V10.83.3 nâng cấp khả năng tìm kiếm và mở ứng dụng trên toàn hệ thống, đồng thời giữ nguyên các lớp phục hồi trang trắng từ V10.83.2.

Phiên bản này không thêm bảng Supabase, không yêu cầu Environment Variable mới và không thay đổi dữ liệu hiện có.

## 1. Tìm nhanh toàn hệ thống

Nhấn một trong các cách sau để mở Command Palette:

- `Command + K` trên macOS.
- `Ctrl + K` trên Windows/Linux.
- Phím `/` khi con trỏ không nằm trong ô nhập liệu.
- Nút `⌕ ⌘K` trên thanh điều hướng.
- Nút **Tìm nhanh toàn hệ thống** trong trang Ứng dụng.

Command Palette tìm được:

- Các trang hệ thống.
- Toàn bộ ứng dụng mà tài khoản đang có quyền truy cập.
- Ứng dụng đã ghim.
- Ứng dụng mở gần đây.
- Ứng dụng được sử dụng thường xuyên.
- Các lệnh nhanh.

Kết quả được xếp hạng theo tên, từ khóa, mô tả và mức độ phù hợp. Các ứng dụng không được cấp quyền không xuất hiện trong danh sách.

## 2. Lệnh nhanh

Command Palette cung cấp các lệnh:

- Mở Brian AI.
- Hỏi Brian AI về trang hiện tại.
- Chuyển chế độ sáng/tối.
- Mở trình tùy biến Launcher.
- Mở trang Cài đặt.

Lệnh **Hỏi AI về trang hiện tại** mở bong bóng Brian AI và điền sẵn yêu cầu phân tích ngữ cảnh trang.

## 3. Lịch sử sử dụng theo tài khoản

Hệ thống ghi lại cục bộ theo từng tài khoản:

- Ứng dụng/trang mở gần nhất.
- Số lần sử dụng.
- Thời điểm sử dụng gần nhất.

Dữ liệu này chỉ dùng để sắp xếp mục **Gần đây** và **Dùng thường xuyên**. Không chứa nội dung tài liệu, mật khẩu hoặc dữ liệu biểu mẫu.

## 4. Trang Ứng dụng được nâng cấp

Trang `#/apps` có thêm:

- Ô tìm kiếm ứng dụng theo tên, chức năng hoặc nhóm.
- Thanh **Mở gần đây**.
- Nút mở Command Palette.
- Hai chế độ hiển thị:
  - **Thoáng**: thẻ lớn, dễ quan sát.
  - **Gọn**: hiển thị nhiều ứng dụng hơn trên cùng màn hình.
- Bộ lọc nhóm vẫn hoạt động đồng thời với tìm kiếm.
- Bố cục tiếp tục nằm trong khung trung tâm tối đa 1360px, không kéo thẻ sát hai viền màn hình.

## 5. Brian AI kết nối với hệ thống lệnh

Bong bóng Brian AI lắng nghe sự kiện mở từ toàn hệ thống:

- Có thể mở từ Command Palette.
- Có thể nhận prompt điền sẵn.
- Vẫn giữ file đính kèm, ảnh chụp màn hình, lịch sử hội thoại, giọng nói và nút **Dùng kết quả trong ứng dụng** từ V10.83.1.

## 6. Khả năng phục hồi

V10.83.3 giữ nguyên:

- Error Boundary cấp ứng dụng.
- Error Boundary cho Launcher, Navigation, Brian AI và Command Palette.
- Tự phục hồi khi Vite chunk cũ còn trong cache.
- Chuẩn hóa cấu hình Launcher lỗi.
- Boot watchdog thay trang trắng bằng màn hình phục hồi.

## 7. Tệp thay đổi chính

- `src/components/GlobalCommandPalette.jsx`
- `src/utils/appUsage.js`
- `src/components/GlobalFlatNavigation.jsx`
- `src/components/UniversalAIAssist.jsx`
- `src/pages/WebApps.jsx`
- `src/main.jsx`
- `src/index.css`
- `scripts/smoke-test.mjs`
- `package.json`
- `package-lock.json`

## 8. Kết quả kiểm tra

```text
Production build: passed
157/157 smoke checks: passed
Department runtime — Admin: passed
Department runtime — TTCM: passed
Department runtime — Teacher: passed
```
