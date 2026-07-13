# Brian English Studio V10.84.0
## Stability & Unified Shell

Phiên bản này tập trung nâng cấp lõi toàn site thay vì bổ sung thêm một ứng dụng độc lập.

## 1. Global Auto Save

- Theo dõi các trường `input`, `textarea`, `select` và vùng `contenteditable` trong ứng dụng đang mở.
- Không lưu mật khẩu, file input hoặc nội dung trong Brian AI/Command Palette.
- Lưu bản nháp cục bộ sau khoảng 1,8 giây không thao tác và kiểm tra định kỳ mỗi 15 giây.
- Bản nháp tách riêng theo tài khoản và route.
- Khi quay lại trang có bản nháp trong vòng 7 ngày, hệ thống hiển thị nút **Khôi phục** hoặc **Bỏ bản nháp**.
- Thanh trạng thái nhỏ cho biết: có thay đổi, đang lưu, đã lưu hoặc lỗi lưu cục bộ.

## 2. Responsive Navigation

- Thanh điều hướng tự thu gọn khi màn hình không đủ rộng.
- Nút **Thêm** mở drawer điều hướng nhanh.
- Drawer có Trang chủ, Ứng dụng, các mục đã chọn, Thư viện, Kho học liệu, Thùng rác và Cài đặt.
- Tài khoản Admin có thêm Trạng thái hệ thống và Quản trị.
- Mobile hiển thị drawer gần toàn màn hình, không làm co hoặc tràn chữ trên thanh điều hướng.

## 3. System Health Center

Route:

```text
#/qa
```

Kiểm tra:

- Trạng thái online/offline.
- Khả năng đọc và ghi localStorage.
- Ước lượng dung lượng browser storage.
- Cấu hình AI provider.
- Cấu hình và phản hồi Supabase Auth.
- API Newsroom RSS.
- Thời gian tải trang.
- Số mục trong thùng rác.
- Nhật ký lỗi runtime gần đây.

Có thể tải báo cáo JSON để phục vụ chẩn đoán.

## 4. Global Runtime Recovery

- Ghi nhận lỗi React Error Boundary.
- Ghi nhận `window.error` và `unhandledrejection`.
- Hiển thị banner khi mất mạng hoặc khi hệ thống vừa chặn lỗi.
- Lưu tối đa 40 lỗi gần nhất trên thiết bị.
- Màn hình phục hồi có lối mở Trung tâm trạng thái hệ thống.
- Giữ nguyên lớp chống màn hình trắng và stale Vite chunk từ V10.83.2.

## 5. Thùng rác 30 ngày

Route:

```text
#/trash
```

- Các nội dung bị xóa trong Thư viện, Prompt Studio và Ngân hàng câu hỏi được đưa vào thùng rác trước.
- Có thể khôi phục từng mục.
- Có thể xóa vĩnh viễn từng mục hoặc toàn bộ.
- Dữ liệu hết hạn được tự động dọn sau 30 ngày.
- Thùng rác tách riêng theo tài khoản.

Lưu ý: phiên bản này tích hợp bộ khôi phục trực tiếp cho dữ liệu Teacher Library. Các module dữ liệu chuyên biệt sẽ được nối thêm adapter trong các phiên bản tiếp theo.

## 6. Unified Design System

Các token dùng chung:

```css
--bes-content-max: 1360px;
--bes-content-pad: clamp(14px, 3vw, 34px);
--bes-card-gap: 20px;
--bes-radius-sm: 12px;
--bes-radius-md: 18px;
--bes-radius-lg: 28px;
```

- Các page tiêu chuẩn được đặt trong content rail tối đa 1360px.
- Không kéo card sát hai viền màn hình.
- Hỗ trợ light/dark mode.
- Hỗ trợ mật độ Compact/Standard/Comfortable.
- Focus ring thống nhất cho điều khiển bàn phím.

## Kiểm tra

```text
Production build: passed
Smoke tests: 163/163 passed
Department runtime: Admin/TTCM/Teacher passed
```

## Database

Không cần migration Supabase mới. Auto Save, runtime diagnostics và Trash Center sử dụng bộ nhớ cục bộ theo tài khoản. Dữ liệu thư viện được khôi phục trở lại cơ chế đồng bộ Supabase hiện có.
