# Brian English Studio V10.82.4 — Newsroom Reader Mode

## Thay đổi chính

### Trình đọc toàn màn hình

- Thay popup nổi bằng một không gian đọc toàn màn hình, nền đặc và không còn nhìn thấy danh sách tin phía sau.
- Thanh công cụ cố định phía trên gồm: quay lại dòng tin, lưu bài, nghe bài, tăng/giảm cỡ chữ, nền sáng/tối, mở bài gốc và đóng.
- Tiến độ đọc hiển thị ở cạnh trên cùng và trong thẻ trạng thái bên phải.
- Khung bài chính rộng tối đa khoảng 900px, căn giữa, cỡ chữ 15–28px và line-height tối ưu cho bài dài.
- Nút “Về đầu bài” xuất hiện khi đã cuộn xuống.

### Bố cục đọc chuyên nghiệp

- Header bài gồm chuyên mục, ngày đăng, thời gian đọc, tiêu đề, sapo, tác giả/nguồn và ảnh đại diện.
- Nội dung hỗ trợ heading, quote, danh sách và ảnh kèm chú thích.
- Desktop có cột phụ cố định gồm:
  - Trạng thái tải toàn văn và phần trăm đã đọc.
  - Mục lục tự động từ tiêu đề phụ trong bài.
  - Các bài liên quan cùng nguồn hoặc chuyên mục.
- Trên iPad/điện thoại, cột phụ tự ẩn và bài đọc chuyển sang bố cục một cột toàn chiều rộng.
- Reader có dark mode độc lập, không làm thay đổi theme chung của app.

### Đọc báo trên thanh điều hướng

- Nút `Đọc báo` luôn xuất hiện trên thanh điều hướng với mọi tài khoản đã đăng nhập.
- Không còn phụ thuộc vào quyền riêng `tool:news-reader` để hiển thị hoặc mở trang Newsroom.
- Route trực tiếp giữ nguyên: `#/news`.

## File đã thay đổi

- `src/pages/NewsReader.jsx`
- `src/index.css`
- `src/components/GlobalFlatNavigation.jsx`
- `src/utils/permissions.js`
- `package.json`
- `package-lock.json`
- `scripts/smoke-test.mjs`

## Kiểm tra

- Production build: đạt.
- Smoke checks: 116/116 đạt.
- Department runtime: Admin, TTCM và Teacher đều đạt.
- Không cần chạy thêm SQL Supabase.
- Không cần thêm Environment Variable.
