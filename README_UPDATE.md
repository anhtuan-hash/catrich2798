# Cập nhật Brian English Studio lên V10.87.0

Bản này bổ sung **Launcher cá nhân và Command Center toàn site** trên nền **V10.86.1 Stability Guard**.

## Tính năng chính

- Mở Command Center bằng `Ctrl/Command + K`.
- Tìm ứng dụng, trang, route và công cụ trên toàn hệ thống.
- Thanh ứng dụng đã ghim hiển thị trên mọi trang.
- Ghim, ẩn, kéo thả sắp xếp và tạo nhóm ứng dụng.
- Lịch sử trang mở gần đây.
- Tự phát hiện route nội bộ từ giao diện hiện tại.
- Xuất/nhập cấu hình Launcher cá nhân.
- Đồng bộ cấu hình giữa các tab trình duyệt.

## Nguyên tắc an toàn

- Không thay dependency.
- Không thay `package-lock.json`.
- Không cần SQL Supabase.
- Không cần Environment Variable mới.
- Không ghi đè `bes-launcher-config-v4`.
- Không chép đè hoặc đóng gói font cá nhân.
- Có backup và rollback tự động.

## 1. Xác nhận đang ở V10.86.1

Tại repository đang deploy:

```bash
git status
cat package.json | grep '"version"'
```

Phiên bản nên là:

```text
10.86.1
```

Nếu chưa cài V10.86.1, hãy cài gói Stability Guard trước.

## 2. Sao lưu Git

```bash
git add -A
git commit -m "Backup V10.86.1 before V10.87"
```

Nếu Git báo không có thay đổi thì có thể tiếp tục.

## 3. Chép gói update-only

Giải nén:

```text
brian-english-studio-v10.87.0-launcher-command-center-update-only.zip
```

Tại thư mục gốc repository:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.87.0-launcher-command-center-update-only/ ./
node scripts/install-v10.87.0.mjs
```

## 4. Kiểm tra

Chạy lần lượt:

```bash
npm run test:command-center
npm run release:guard
npm run build
npm test
npm run test:department
```

Hoặc chạy tổng hợp:

```bash
npm run verify:v10.87
```

Trong một số môi trường CI không cho Chromium chạy headless, `test:command-center` sẽ hoàn tất kiểm tra tĩnh và ghi cảnh báo bỏ qua browser smoke test. Trên máy có Chrome/Chromium hoạt động bình thường, script sẽ chạy thêm bài kiểm tra trình duyệt.

## 5. Deploy

```bash
git add -A
git commit -m "Add Launcher and Command Center V10.87.0"
git push origin main
```

Khi Vercel báo **Ready**, tải lại cứng:

```text
Command + Shift + R
```

## 6. Sử dụng

- Nhấn `Command + K` trên macOS hoặc `Ctrl + K` trên Windows.
- Vào **Sắp xếp** để ghim, ẩn, đổi nhóm và kéo thả ứng dụng.
- Vào **Cài đặt** để tắt thanh ghim, xuất/nhập cấu hình hoặc khôi phục mặc định.
- Mở trang **Ứng dụng** ít nhất một lần để Command Center quét thêm các route hiện có.

Console API:

```js
BES_COMMAND_CENTER.open()
BES_COMMAND_CENTER.report()
BES_COMMAND_CENTER.rediscover()
```

## 7. Rollback

```bash
npm run rollback:v10.87.0
npm run build
npm test
npm run test:department
```

Rollback mã nguồn không xóa cấu hình cục bộ của Command Center. Khi cần xóa riêng cấu hình mới, mở Console và chạy:

```js
Object.keys(localStorage)
  .filter(key => key.startsWith('bes-command-center-v10870'))
  .forEach(key => localStorage.removeItem(key));
location.reload();
```

Lệnh trên không xóa Launcher V4, tài khoản, học liệu, bài kiểm tra hoặc dữ liệu Supabase.
