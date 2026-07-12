# Cập nhật Brian English Studio lên V10.87.0

## 1. Sao lưu repository hiện tại

Mở Terminal tại thư mục dự án đang deploy:

```bash
git status
git add -A
git commit -m "Backup before V10.87.0"
```

Nếu Git báo không có thay đổi để commit, tiếp tục bước 2.

## 2. Chép gói update-only

Giải nén file:

```text
brian-english-studio-v10.87.0-release-security-performance-update-only.zip
```

Tại thư mục gốc repository, chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.87.0-release-security-performance-update-only/ ./
```

## 3. Chạy migration Supabase

Mở:

```text
Supabase → SQL Editor → New query
```

Dán toàn bộ nội dung file:

```text
supabase/release_settings_v10_87.sql
```

Sau đó bấm **Run**.

Migration tạo bảng `bes_release_settings`, RLS Admin-write/authenticated-read, dữ liệu Feature Flag mặc định và Supabase Realtime.

Site vẫn khởi động được nếu chưa chạy migration, nhưng Feature Flags chỉ lưu cục bộ và không đồng bộ giữa thiết bị.

## 4. Cài đặt và kiểm tra

```bash
npm ci
npm run build
npm test
npm run test:department
npm run audit:performance
npm run release:guard
```

Kết quả chuẩn của source phát hành:

```text
Production build: thành công
Smoke tests: 191/191 passed
Department runtime: Admin/TTCM/Teacher passed
Release Guard: 24/24 passed
```

Release Guard hiện cảnh báo stylesheet legacy khoảng 1.07 MB. Đây là cảnh báo hiệu suất, không phải lỗi build.

## 5. Triển khai

```bash
git add -A
git commit -m "Add release security and performance controls V10.87.0"
git push origin main
```

Khi Vercel báo **Ready**, tải lại bằng:

```text
Command + Shift + R   (macOS)
Ctrl + Shift + R      (Windows)
```

## 6. Mở Update Center

Đăng nhập bằng tài khoản Admin rồi mở:

```text
#/updates
```

Trang này cho phép bật/tắt tính năng theo nhóm người dùng, tạo snapshot, rollback, xem audit metadata và tải lại bản mới an toàn.

## 7. Environment Variables

Không có Environment Variable mới bắt buộc.

Endpoint `/api/ai` tiếp tục sử dụng `OPENAI_API_KEY` hiện có khi được cấu hình. Các biến sau chỉ là tùy chọn:

```text
AI_MAX_OUTPUT_TOKENS
AI_REQUEST_TIMEOUT_MS
AI_RATE_LIMIT_PER_MINUTE
OPENAI_ALLOWED_MODELS
```

## 8. Lưu ý

- Giữ tài khoản chính ở vai trò `admin`.
- Không chép đè hoặc đóng gói lại font cá nhân.
- Audit log của bản này lưu cục bộ trên từng thiết bị.
- Upload Gateway đã áp dụng cho Kho học liệu/Google Drive; các uploader cũ khác chưa được chuyển toàn bộ.
- Không xóa `.env.local` hiện tại của repository.
