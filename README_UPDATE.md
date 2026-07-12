# Cập nhật lên V10.85.0

## 1. Giải nén gói update-only

Tên thư mục sau khi giải nén:

```text
brian-english-studio-v10.85.0-connected-workflow-update-only
```

## 2. Mở repository hiện đang deploy trong VS Code

Terminal phải đứng tại thư mục có `package.json` và `.git`.

## 3. Chép bản cập nhật

```bash
rsync -av ~/Downloads/brian-english-studio-v10.85.0-connected-workflow-update-only/ ./
```

## 4. Cài và kiểm tra

```bash
npm ci
npm run build
npm test
npm run test:department
```

Kết quả mong đợi:

```text
Production build: success
All 171 smoke checks passed
Admin runtime: passed
TTCM runtime: passed
Teacher runtime: passed
```

## 5. Triển khai

```bash
git add -A
git commit -m "Add Connected Workflow V10.85.0"
git push origin main
```

## 6. Sau khi Vercel báo Ready

Tải lại cứng:

```text
Command + Shift + R
```

## Lưu ý

- Không cần chạy SQL mới.
- Không cần Environment Variable mới.
- Cấu hình Launcher V3 được sao lưu và tự chuyển sang V4 trong lần mở đầu tiên.
- Workspace Tabs, phiên bản bản nháp, nội dung chuyển và sync queue hiện được lưu local-first theo tài khoản.
