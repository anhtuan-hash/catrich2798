# Brian English Studio V10.82.5 — SmartID Identity

## Tính năng mới

SmartID Identity được tích hợp thành ứng dụng riêng tại:

```text
Ứng dụng → SmartID Identity
#/tool/smart-id
```

Ứng dụng được chuyển từ bản TSX độc lập sang React/Vite hiện tại của Brian English Studio, dùng chung:

- tài khoản đăng nhập;
- phân quyền ứng dụng;
- font cá nhân toàn hệ thống;
- thanh điều hướng và dark mode;
- khóa Gemini đã lưu trong **Cài đặt AI**;
- chỉ báo AI toàn màn hình của hệ thống.

## Quy trình sử dụng

1. Tải ảnh JPG, PNG hoặc WEBP, hoặc chụp trực tiếp bằng camera.
2. Ảnh được tối ưu về cạnh tối đa 1800 px để xử lý ổn định.
3. Gemini phân tích ánh sáng, vị trí đầu, độ rõ khuôn mặt và nền.
4. Chọn kích thước ảnh, nền, trang phục và phong cách.
5. Nhập yêu cầu bổ sung rồi tạo ảnh AI.
6. Xuất ảnh đơn đúng tỉ lệ ở 300 DPI hoặc tờ in 10 × 15 cm ở 300/600 DPI.

## Gemini

- Phân tích ảnh: `gemini-2.5-flash`.
- Chỉnh sửa ảnh ưu tiên: `gemini-3.1-flash-image`.
- Fallback: `gemini-2.5-flash-image`.
- Không có API key cứng trong source.
- Ứng dụng đọc khóa Gemini theo đúng tài khoản đang đăng nhập.

SmartID chỉ yêu cầu AI tạo ảnh chân dung rời, không yêu cầu tạo giấy tờ, con dấu, số hiệu, mã QR hoặc phù hiệu chính thức.

## Giao diện

- Nội dung nằm trong rail tối đa 1440 px, không kéo thẻ sát hai viền.
- Hero Material-inspired mới, có minh họa khung ảnh thẻ.
- Workspace desktop hai cột; tablet/mobile tự chuyển thành một cột.
- Camera và tờ in mở bằng modal riêng.
- Hỗ trợ dark mode.

## File chính

```text
src/pages/SmartIdStudio.jsx
src/pages/SmartIdStudio.css
src/pages/ToolPage.jsx
src/data/apps.js
src/data/designProfiles.js
src/components/FlatAppIcon.jsx
src/pages/WebApps.jsx
```

## Kiểm tra

```text
npm run build          ✓
npm test               ✓ 122/122 smoke checks
npm run test:department ✓ admin / TTCM / teacher
```

Không cần chạy SQL Supabase và không cần thêm Environment Variable mới.
