# Brian English Studio V10.90.0 — Smart Knowledge Library

## Cài đặt

```bash
git status
git add -A
git commit -m "Backup V10.89 before V10.90" || true

rsync -av ~/Downloads/brian-english-studio-v10.90.0-smart-knowledge-library-update-only/ ./
node scripts/install-v10.90.0.mjs
```

## Bắt buộc chạy SQL

Supabase → SQL Editor → New query, chạy toàn bộ:

`supabase/smart_knowledge_v10_90_0.sql`

Sau đó đăng xuất và đăng nhập lại Admin lẫn giáo viên.

## Kiểm tra

```bash
npm run verify:v10.90
# gồm cả kiểm tra tương thích Unified Work Hub
```

## Mở tính năng

- Route: `#/knowledge-hub`
- Phím tắt: `Command/Ctrl + Shift + L`
- Có thể tìm trong Command Center: **Kho học liệu thông minh**

## Rollback source

```bash
npm run rollback:v10.90.0
```

Rollback source không tự xóa các bảng SQL vì có thể làm mất metadata, bộ sưu tập và yêu thích.
