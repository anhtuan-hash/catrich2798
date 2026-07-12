# Cập nhật V10.82.7 vào dự án đang chạy

Dùng gói `brian-english-studio-v10.82.7-ai-messenger-bubble-update-only.zip`.

Trong Terminal của VS Code, tại thư mục repository hiện tại:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.82.7-ai-messenger-bubble-update-only/ ./
npm ci
npm run build
npm test
npm run test:department
```

Sau đó:

```bash
git add -A
git commit -m "Add Brian AI Messenger bubble V10.82.7"
git push origin main
```

Sau khi Vercel báo **Ready**, tải lại mạnh bằng `Command + Shift + R`.

Bong bóng **Brian AI** xuất hiện ở góc dưới bên phải trên mọi trang đã đăng nhập. Trình phát nhạc được tự động dịch lên trên để hai nút không chồng nhau.

Không cần chạy SQL Supabase và không cần thêm Environment Variable. Bong bóng chat dùng AI provider hiện có trong **Thiết lập**.
