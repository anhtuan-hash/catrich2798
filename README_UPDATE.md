# Cập nhật V10.82.4

Từ Terminal của VS Code, đứng trong thư mục repository đang deploy và chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.82.4-newsroom-reader-mode-update-only/ ./
npm ci
npm run build
npm test
npm run test:department
git add -A
git commit -m "Add full-screen Newsroom Reader Mode V10.82.4"
git push origin main
```

Không dùng `--delete`. Không cần chạy SQL Supabase.
