# V10.81.9 Direct File Viewer — Update Only

Bản này bổ sung trình xem trực tiếp DOCX, PPTX, PDF, XLSX, MP4 và MP3 cho Kho học liệu; đồng thời giữ bản sửa WordGraph V10.81.8.

## Cập nhật dự án hiện tại

Giải nén gói update-only vào Downloads, mở repository hiện tại bằng VS Code và chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.81.9-direct-file-viewer-update-only/ ./
npm ci
npm run build
npm test
git add -A
git commit -m "Add direct resource file viewer V10.81.9"
git push origin main
```

Vercel sẽ tự deploy. Sau khi trạng thái **Ready**, mở app và nhấn `Command + Shift + R`.

## Không cần làm

- Không chạy thêm SQL Supabase.
- Không chia sẻ thư mục Google Drive cho giáo viên.
- Không thêm Environment Variable mới; phiên xem dùng bí mật máy chủ đã có.
- Không xóa `.env.local`, `.git` hoặc font cá nhân của dự án hiện tại.
