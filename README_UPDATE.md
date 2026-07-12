# Cập nhật Brian English Studio lên V10.83.1

Phiên bản này bổ sung **Launcher tùy biến dành cho Admin** và nâng cấp **Brian AI Messenger Bubble** với file, ảnh chụp màn hình, ngữ cảnh trang, lịch sử nhiều cuộc trò chuyện, dùng kết quả trong ứng dụng và chế độ giọng nói.

## Cách 1 — Gói Update Only

1. Giải nén `brian-english-studio-v10.83.1-launcher-ai-upgrade-update-only.zip`.
2. Mở Terminal tại repository Brian English Studio đang deploy.
3. Sao chép đè các tệp cập nhật:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.83.1-launcher-ai-upgrade-update-only/ ./
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
git commit -m "Add custom launcher and advanced Brian AI V10.83.1"
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

## Cách sử dụng Launcher

1. Đăng nhập tài khoản Admin.
2. Mở **Ứng dụng**.
3. Chọn **Tùy biến launcher**.
4. Kéo thả thẻ; chọn ghim, ẩn, thêm vào thanh điều hướng hoặc đổi nhóm.
5. Chọn **Lưu thay đổi**.

Trang chủ và trang Ứng dụng luôn được giữ lại trên thanh điều hướng. Sau khi chạy migration Supabase, cấu hình được đồng bộ toàn hệ thống và cập nhật Realtime; `localStorage` chỉ là cache dự phòng.

## Cách sử dụng Brian AI nâng cao

- Kéo file vào cửa sổ chat hoặc bấm **Tệp**.
- Bấm **Màn hình** để chụp tab/cửa sổ/màn hình sau khi trình duyệt xin quyền.
- Bấm biểu tượng lịch sử để mở các cuộc trò chuyện cũ.
- Bấm **Dùng kết quả trong ứng dụng** dưới câu trả lời AI.
- Bấm biểu tượng micro trên header để bật Voice Mode.

## Bước bắt buộc cho Launcher đồng bộ toàn hệ thống

Mở **Supabase → SQL Editor**, dán toàn bộ nội dung file sau và bấm **Run**:

```text
supabase/launcher_settings_v10_83_1.sql
```

Migration tạo bảng cấu hình launcher, RLS chỉ cho Admin ghi, cho người dùng đã đăng nhập đọc và bật Supabase Realtime. Khi chưa chạy migration, launcher vẫn hoạt động bằng cache local nhưng chưa đồng bộ giữa thiết bị/tài khoản.

## Lưu ý

- Cần chạy migration Supabase ở trên đúng một lần.
- Không cần Environment Variable mới.
- AI dùng provider/API key đã cấu hình trong **Cài đặt**.
- Mỗi file tối đa 12 MB; tối đa 5 file trong một lượt gửi.
- Speech Recognition tùy thuộc trình duyệt.
- Không chép đè hoặc xóa font cá nhân đang có trong `public/fonts`.
