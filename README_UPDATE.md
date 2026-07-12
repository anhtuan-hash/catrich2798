# Brian English Studio V10.87.3 — AI Chat Composer Upgrade

Bản cập nhật update-only dành cho repository đã cài **V10.87.2 AI Chat Expanded Layout**.

## Nội dung đã chỉnh

- Tăng ô nhập Brian AI lên tối thiểu **104 px** trên desktop.
- Textarea tự tăng chiều cao theo nội dung đến **220 px**.
- Nút gửi nằm bên trong góc dưới bên phải ô nhập.
- Composer tối thiểu **160 px**, không còn bị ép thành một dòng mỏng.
- Thu gọn hàng `Tệp · Màn hình · Nói` thành các chip 32 px.
- Thu gọn toolbar `Sao chép · Dùng kết quả · Hành động · Gửi sang · Nghe`.
- Dòng hướng dẫn Enter/Shift+Enter nhỏ và gọn hơn.
- Toast khôi phục bản nháp giảm kích thước.
- Giữ nguyên panel rộng, nút mở rộng và mobile full-screen của V10.87.2.

## Dữ liệu được giữ nguyên

- Lịch sử hội thoại và các cuộc trò chuyện đã lưu.
- Bản nháp.
- Tệp đính kèm.
- Provider và API key.
- AI Governance.
- Launcher, Command Center và dữ liệu Supabase.
- Font cá nhân trong `public/fonts`.

## Yêu cầu

- Đã cài V10.87.2.
- Không cần SQL.
- Không cần Environment Variable mới.
- Không thêm dependency.
- Không chạy `npm install` nếu repository đang hoạt động bình thường.

## Cài đặt

Sao lưu repository:

```bash
git status
git add -A
git commit -m "Backup V10.87.2 before V10.87.3"
```

Chép gói update-only vào repository:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.87.3-ai-chat-composer-upgrade-update-only/ ./
node scripts/install-v10.87.3.mjs
```

Kiểm tra tổng hợp:

```bash
npm run verify:v10.87.3
```

Deploy:

```bash
git add -A
git commit -m "Upgrade Brian AI composer V10.87.3"
git push origin main
```

Khi Vercel báo **Ready**, tải lại bằng **Command + Shift + R**.

## Rollback

```bash
npm run rollback:v10.87.3
npm run build
npm test
npm run test:department
```

Rollback không xóa lịch sử hội thoại, bản nháp, provider hoặc API key.

## Asset mới

- `/bes-ai-chat-v10873.css`
- `/bes-ai-chat-v10873.js`

Installer sẽ gỡ tag runtime V10.87.2 khỏi `index.html` và thay bằng V10.87.3; các file cũ vẫn được giữ để rollback an toàn.
