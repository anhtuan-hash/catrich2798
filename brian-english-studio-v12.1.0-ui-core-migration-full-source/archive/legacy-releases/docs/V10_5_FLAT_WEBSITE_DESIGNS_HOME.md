# V10.5 — Flat Website Designs Homepage

## Mục tiêu
Thiết kế lại trang chủ theo ảnh tham chiếu: nền màu ấm, typography lớn, các cửa sổ website/app chồng lớp, giao diện phẳng nhưng có độ nổi nhẹ bằng viền đậm và bóng offset.

## Thay đổi chính
- Thay trang Start Screen dạng Windows 8 tile bằng homepage kiểu flat website collage.
- Thêm thanh định hướng ghim cố định ở đầu trang.
- Các app chính được hiển thị thành browser-window cards:
  - Lesson Architect
  - Exam Studio
  - Game Hub
  - WordGraph Studio
  - Reading Studio
  - Speaking Studio
  - TextCare Fixer
  - Department Workspace
- Giữ tên ứng dụng thật, icon line phù hợp từng app.
- App mở bằng hiệu ứng cửa sổ phóng ra toàn màn hình từ đúng vị trí click.
- Responsive: desktop dùng bố cục collage; tablet/mobile chuyển thành lưới cửa sổ gọn.

## Kiểm tra
- `npm run build`: thành công.
- `npm test`: 22/22 smoke tests pass.

## Lưu ý font
Gói phát hành không đính kèm file font cá nhân. Đặt font riêng vào `public/fonts` nếu muốn dùng đúng font cá nhân trên máy của bạn.
