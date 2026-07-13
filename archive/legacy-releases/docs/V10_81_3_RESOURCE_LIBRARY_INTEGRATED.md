# Brian English Studio V10.81.3 — Kho học liệu tích hợp hoàn chỉnh

Bản này được ghép trực tiếp từ source V10.80.1 và migration V10.81.2 đã chạy trên Supabase.

## Đã triển khai

- 12 thẻ phân loại luôn hiển thị, kể cả danh mục trống.
- Chọn thẻ để lọc và mở tài liệu ngay trong ứng dụng.
- Bộ lọc khối lớp, năm học, tìm kiếm, sắp xếp mới/cũ/phổ biến.
- Form upload có bộ chọn thẻ trực quan, năm học và Unit/chủ đề.
- Supabase Realtime làm mới thẻ và danh sách khi có thay đổi.
- File mới vào `00_CHO_DUYET`; khi admin duyệt sẽ chuyển vào đúng thư mục danh mục.
- API tự tạo thư mục danh mục còn thiếu trên Drive, nên không bắt buộc kết nối lại Drive.
- API `/api/google-drive-file` cho phép giáo viên đã đăng nhập xem PDF, ảnh, audio, video và text ngay trong app mà không cần được chia sẻ quyền Drive trực tiếp.
- Tải xuống cũng đi qua API có kiểm tra phiên đăng nhập và quyền truy cập.
- Dữ liệu local V10.80 được tự động chuyển sang key V10.81; alias danh mục cũ được chuẩn hóa.

## Trước khi deploy

Migration `supabase/resource_library_v10_81_2_full_fixed.sql` đã được chạy thì không cần chạy lại.

Kiểm tra các biến môi trường Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_OAUTH_STATE_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI` (nếu đang dùng URI cố định)
- `APP_URL`

## Kiểm tra sau deploy

1. Mở Kho học liệu và xác nhận đủ 12 thẻ.
2. Giáo viên tải một PDF, chọn thẻ Worksheet.
3. Admin vào tab Chờ duyệt và bấm Duyệt.
4. Xác nhận file được chuyển vào `03_WORKSHEET_PHIEU_HOC_TAP`.
5. Đăng nhập tài khoản giáo viên khác, mở PDF bằng nút **Xem trong app**.
6. Kiểm tra tải xuống và bộ lọc khối/năm học.
