# Dashboard tháng 11 · Scrapbook

Lớp trình bày cho `#/dashboard`, dựa trên mockup giấy xếp lớp: nền kem,
nhãn pastel, mép giấy xé, lời chào viết tay, lịch dạng sổ và khung ảnh tin tức.
Nội dung, lịch, bộ lọc, tin tức, người dùng và Hero đã công bố vẫn là các
component và nguồn dữ liệu hiện có.

## Bật và tắt

Trong **Cài đặt → Điều hướng**, Admin đã duyệt có công tắc
**Dashboard tháng 11 · Scrapbook**. Công tắc mặc định tắt, độc lập với
chủ đề tháng 11/Halloween của Trang chủ. Tắt hoặc rời Dashboard sẽ gỡ
thuộc tính kích hoạt, để stylesheet gốc tiếp tục hoạt động.

Khi bật, lớp scrapbook được ưu tiên hơn Halloween trên navbar/footer
Dashboard. Không sửa công tắc Halloween hay tháng 11 của các trang khác.
Khi tắt, navbar/footer quay lại cấu hình giao diện đã có của website.

## Triển khai

1. Áp dụng migration `supabase/migrations/20261102170000_dashboard_scrapbook_theme.sql`
   vào đúng dự án Supabase đang dùng. Migration chỉ bổ sung một cột boolean
   và một RPC có kiểm tra Admin đã duyệt; không cập nhật dữ liệu học tập.
2. Triển khai mã frontend bằng quy trình Vercel hiện có.
3. Mở Cài đặt → Điều hướng bằng tài khoản Admin, bật công tắc và mở Dashboard.
   Nếu migration chưa được áp dụng, công tắc bị vô hiệu hóa và hiện lỗi tải
   cấu hình; giao diện gốc vẫn dùng được.
4. Kiểm tra trên hai phiên: bật/tắt ở phiên Admin và kiểm tra phiên còn lại.
   Realtime cập nhật ngay khi có sự kiện; polling dự phòng chạy mỗi 30 giây
   trong tab đang hiển thị. Focus/online/visibility/storage cũng tải lại cấu hình.

Không dùng localStorage làm nguồn quyết định bật theme khi khởi động; cần
máy chủ xác nhận. Lỗi lưu giữ nguyên trạng thái đã xác nhận, và phản hồi cũ
không được ghi đè lựa chọn mới hơn.

## Kiểm tra

```sh
node --test scripts/test-dashboard-scrapbook.mjs
node --test scripts/test-november-theme.mjs scripts/test-dashboard-hero-name-lines.mjs scripts/test-dashboard-minimal-hero.mjs scripts/test-dashboard-newsroom-editorial-20261023.mjs scripts/test-global-dashboard-footer-v13.mjs
npm run build
```

Các kiểm tra theme bao gồm ON/OFF, lỗi RPC, đọc chậm, realtime cũ,
đồng bộ giữa tab, dọn listener, tab ẩn, thiếu migration, storage bị chặn,
phạm vi CSS và tài nguyên ảnh/font.

Kiểm tra hình ảnh cần thực hiện trên trình duyệt tại 1440, 1024, 768 và
390 px: tên tiếng Việt dài, ảnh/video Hero tùy chỉnh, lịch rỗng/nhiều sự kiện,
bộ lọc/tìm kiếm, đổi kênh tin tức, mở bài đọc và footer. Xác nhận bàn phím,
reduced motion, chuyển route và OFF khôi phục bố cục ban đầu.

Migration đã được áp dụng vào production `catrich27` (`xpkbgqdlfonsinriggmj`)
ngày 03/11/2026. Đã kiểm tra RPC bằng vai trò `authenticated`: Admin đã duyệt
bật/tắt thành công; thiếu danh tính hoặc tài khoản thường bị từ chối.
Các thay đổi thử nghiệm đã rollback, giữ Dashboard OFF và giữ nguyên cấu hình
Trang chủ. Đọc cột mới qua REST bằng publishable key cũng thành công.

Thẻ quản trị dùng grid bên trong để không bị CSS flex của Settings portal ghi đè,
và thích ứng theo chiều rộng drawer. Khi máy chủ phục hồi, thông báo lỗi tải cũ
được xóa. Kiểm thử trình duyệt dùng component thật với máy chủ giả lập:
`node scripts/test-dashboard-scrapbook-admin-browser.mjs`, chạy trong GitHub
Actions vì Chromium của môi trường cục bộ không khởi động được.

Bản build production và các bài kiểm tra theme/Halloween liên quan đã qua.
`scripts/test-dashboard-hero-cms.mjs` cũ vẫn thất bại ở yêu cầu
`editorial-today-chip` đã bị bỏ khỏi Dashboard trước thay đổi này; cùng lỗi
được tái hiện trên commit gốc `934c9b557758a564ed1c3201b2b89bf050235cbb`.
Các kiểm tra Hero hiện hành (`test-dashboard-minimal-hero.mjs` và
`test-dashboard-hero-name-lines.mjs`) đều qua.
