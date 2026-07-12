# Cập nhật V10.81.5 vào dự án đang chạy

Không chạy thêm SQL.

Trong VS Code, mở Terminal tại thư mục dự án GitHub hiện đang deploy rồi chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.81.5-interactive-folders-update-only/ ./
npm ci
npm run build
git add -A
git commit -m "Fix interactive resource folders V10.81.5"
git push origin main
```

Sau khi Vercel báo Ready, mở app và nhấn Command + Shift + R.
