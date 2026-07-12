# Brian English Studio V10.87.2 — AI Chat Expanded Layout

Bản cập nhật update-only dành cho repository đã cài **V10.87.1 Command Center Visual Harmony**.

## Nội dung đã chỉnh

- Tăng khung Brian AI từ khoảng 392 px lên 480–590 px trên desktop.
- Tăng chiều cao đến 86% màn hình nhưng vẫn giữ khoảng cách an toàn.
- Thêm nút mở rộng/thu gọn trên header; chế độ mở rộng tối đa 760 px.
- Vùng hội thoại tự chiếm phần chiều cao còn lại và cuộn độc lập.
- Ô nhập tăng lên tối thiểu 72 px; composer không còn ép chật bởi các nút Tệp, Màn hình và Nói.
- Trên điện thoại, cửa sổ chat tự chuyển sang toàn màn hình.
- Hộp khôi phục bản nháp được thu gọn thành toast để không chắn nội dung.
- Nhớ trạng thái rộng/hẹp trên trình duyệt hiện tại.

## Dữ liệu được giữ nguyên

- Lịch sử hội thoại.
- Các cuộc trò chuyện đã lưu.
- Bản nháp.
- Tệp đính kèm.
- Provider và API key đã cấu hình.
- AI Governance.
- Command Center và Launcher.
- Dữ liệu Supabase.

## Yêu cầu

- Đã cài V10.87.1.
- Không cần SQL.
- Không cần Environment Variable mới.
- Không thêm dependency.
- Không chạy `npm install` nếu repository đang hoạt động bình thường.

## Cài đặt

Sao lưu repository:

```bash
git status
git add -A
git commit -m "Backup V10.87.1 before V10.87.2"
```

Chép gói update-only vào repository:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.87.2-ai-chat-expanded-layout-update-only/ ./
node scripts/install-v10.87.2.mjs
```

Kiểm tra tổng hợp:

```bash
npm run verify:v10.87.2
```

Hoặc chạy riêng:

```bash
npm run test:ai-chat
npm run test:command-center
npm run release:guard
npm run build
npm test
npm run test:department
```

Deploy:

```bash
git add -A
git commit -m "Expand Brian AI chat layout V10.87.2"
git push origin main
```

Khi Vercel báo **Ready**, tải lại bằng **Command + Shift + R**.

## Rollback

```bash
npm run rollback:v10.87.2
npm run build
npm test
npm run test:department
```

Rollback không xóa lịch sử hội thoại hoặc bản nháp của Brian AI.

## Lưu ý

V10.87.2 dùng asset mới:

- `/bes-ai-chat-v10872.css`
- `/bes-ai-chat-v10872.js`

Vì vậy trình duyệt không tiếp tục dùng lớp kích thước chat cũ đã cache.
