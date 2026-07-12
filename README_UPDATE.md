# Cập nhật V10.82.0 vào dự án đang chạy

1. Giải nén `brian-english-studio-v10.82-newsroom-reader-update-only.zip`.
2. Mở repository đang deploy bằng VS Code.
3. Trong Terminal của VS Code, chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.82-newsroom-reader-update-only/ ./
```

4. Kiểm tra:

```bash
npm ci
npm run build
npm test
```

5. Commit và push:

```bash
git add -A
git commit -m "Add Newsroom Reader V10.82"
git push origin main
```

6. Khi Vercel báo `Ready`, mở ứng dụng và nhấn `Command + Shift + R`.

Không chạy thêm SQL Supabase. Không cần thêm Environment Variable.
