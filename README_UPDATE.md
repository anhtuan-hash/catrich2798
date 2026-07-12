# Cập nhật Brian English Studio lên V10.83.0

## Cách 1 — Gói Update Only

1. Giải nén `brian-english-studio-v10.83.0-worksheet-factory-update-only.zip`.
2. Mở Terminal tại repository Brian English Studio đang deploy.
3. Sao chép đè các tệp cập nhật:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.83.0-worksheet-factory-update-only/ ./
```

4. Kiểm tra:

```bash
npm ci
npm run build
npm test
npm run test:department
```

5. Triển khai:

```bash
git add -A
git commit -m "Add Worksheet Factory V10.83.0"
git push origin main
```

## Cách 2 — Full Source

Giải nén source đầy đủ vào một thư mục mới, bổ sung lại file font cá nhân hiện có của dự án vào `public/fonts`, sau đó chạy:

```bash
npm ci
npm run build
npm test
npm run test:department
```

## Lưu ý

- Không cần SQL Supabase mới.
- Không cần Environment Variable mới.
- App sử dụng AI provider/API key đã cấu hình trong Cài đặt.
- Không chép đè hoặc xóa font cá nhân đang có trong `public/fonts`.
