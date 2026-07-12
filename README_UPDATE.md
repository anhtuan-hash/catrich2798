# Cập nhật lên V10.84.0

## 1. Giải nén gói update-only

Giải nén file:

```text
brian-english-studio-v10.84.0-stability-unified-shell-update-only.zip
```

## 2. Mở Terminal tại repository đang deploy

Kiểm tra đúng thư mục bằng:

```bash
pwd
ls
```

Thư mục phải có `package.json`, `src`, `api` và `vite.config.js`.

## 3. Chép bản cập nhật

```bash
rsync -av ~/Downloads/brian-english-studio-v10.84.0-stability-unified-shell-update-only/ ./
```

## 4. Kiểm tra

```bash
npm ci
npm run build
npm test
npm run test:department
```

Kết quả mong đợi:

```text
Production build: success
All 163 smoke checks passed
Admin runtime: passed
TTCM runtime: passed
Teacher runtime: passed
```

## 5. Deploy

```bash
git add -A
git commit -m "Add Stability and Unified Shell V10.84.0"
git push origin main
```

Sau khi Vercel báo **Ready**, tải lại trang bằng:

```text
Command + Shift + R
```

## Supabase

Không cần chạy SQL mới và không cần thêm Environment Variable.
