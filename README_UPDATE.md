# Cập nhật Brian English Studio lên V10.83.3

V10.83.3 bổ sung Global Command Palette, tìm kiếm ứng dụng, lịch sử mở gần đây, chế độ thẻ gọn/thoáng và lệnh mở Brian AI theo ngữ cảnh.

Không cần chạy thêm SQL Supabase và không cần thêm Environment Variable mới.

## 1. Chép gói cập nhật

Giải nén `brian-english-studio-v10.83.3-command-center-update-only.zip`, mở Terminal tại thư mục gốc của repository đang deploy và chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.83.3-command-center-update-only/ ./
```

## 2. Kiểm tra

```bash
npm ci
npm run build
npm test
npm run test:department
```

Kết quả đã kiểm tra:

```text
Production build: thành công
157/157 smoke checks: passed
Admin runtime: passed
TTCM runtime: passed
Teacher runtime: passed
```

## 3. Triển khai

```bash
git add -A
git commit -m "Add global command center V10.83.3"
git push origin main
```

Khi Vercel báo **Ready**, mở lại trang bằng:

```text
https://esl-pek.vercel.app/?v=10833#/apps
```

Sau lần mở đầu tiên, có thể dùng lại URL thông thường.

## 4. Cách sử dụng

- `Command + K`: mở tìm kiếm nhanh trên macOS.
- `Ctrl + K`: mở tìm kiếm nhanh trên Windows/Linux.
- `/`: mở tìm kiếm khi không nhập văn bản.
- Nhập tên ứng dụng rồi nhấn `Enter`.
- Dùng phím `↑` và `↓` để chọn kết quả.

## 5. Ghi chú dữ liệu

Danh sách ứng dụng gần đây được lưu theo tài khoản trong trình duyệt. Bản cập nhật không xóa dữ liệu Launcher, Supabase, thư viện, đề thi hoặc hồ sơ hiện có.
