# Cập nhật Brian English Studio lên V10.86.1 Stability Guard

Bản này được thiết kế để cài trực tiếp lên **V10.86.0 ổn định**.

## Nguyên tắc an toàn

- Không thay dependency.
- Không thay `package-lock.json`.
- Không đổi Vite.
- Không cần SQL Supabase.
- Không cần Environment Variable mới.
- Không chép đè hoặc đóng gói font cá nhân.
- Tự sao lưu `package.json` và `index.html` trước khi chỉnh.

## 1. Sao lưu Git

```bash
git status
git add -A
git commit -m "Backup stable V10.86 before V10.86.1"
```

## 2. Chép gói update-only

Giải nén file:

```text
brian-english-studio-v10.86.1-stability-guard-update-only.zip
```

Tại thư mục gốc repository đang deploy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.86.1-stability-guard-update-only/ ./
node scripts/install-v10.86.1.mjs
```

## 3. Kiểm tra

```bash
npm run release:guard
npm run project:doctor
npm run build
npm test
npm run test:department
```

Hoặc chạy kiểm tra tổng hợp:

```bash
npm run verify:stability
```

## 4. Deploy

```bash
git add -A
git commit -m "Add Stability Guard V10.86.1"
git push origin main
```

Sau khi Vercel báo Ready, tải lại cứng:

```text
Command + Shift + R
```

## 5. Công cụ phục hồi trong trình duyệt

Mở Console và dùng:

```js
BES_STABILITY.report()
BES_STABILITY.exportReport()
BES_STABILITY.showRecovery()
```

Khi app không khởi động hoặc bị màn hình trắng, Stability Guard tự hiển thị bảng phục hồi gồm:

- Tải lại an toàn.
- Xuất báo cáo lỗi.
- Khôi phục riêng cấu hình Launcher.
- Đóng bảng phục hồi.

Khôi phục Launcher chỉ cách ly cấu hình Launcher cục bộ; không xóa tài khoản, học liệu, bài kiểm tra hoặc dữ liệu Supabase.

## 6. Rollback

```bash
npm run rollback:v10.86.1
```

Sau đó chạy lại:

```bash
npm run build
npm test
npm run test:department
```
