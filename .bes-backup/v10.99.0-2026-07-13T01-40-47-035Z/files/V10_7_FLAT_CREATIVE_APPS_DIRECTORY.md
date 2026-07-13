# V10.7 — Flat Creative Apps Directory

## Mục tiêu

Bỏ giao diện Apps kiểu Windows 8 Start Screen màu xanh và thay bằng phong cách tương đương trang chủ: flat website collage, nền ấm, typography lớn, các app hiển thị như cửa sổ website riêng.

## Thay đổi chính

- Trang `/apps` dùng cùng hệ thiết kế với homepage.
- Xoá nội dung/nhãn Windows 8.1 Start Screen ở trang Apps.
- Mỗi ứng dụng là một card dạng cửa sổ có browser chrome, icon line phẳng, màu nhận diện riêng.
- Card có kích cỡ đa dạng: feature, hero, wide, tall, normal.
- VI / EN được áp dụng cho tiêu đề, mô tả, menu, group, trạng thái, CTA trên trang Apps.
- Giữ hiệu ứng mở ứng dụng dạng Flat Window Launch Transition: card nén nhẹ rồi phóng từ đúng vị trí click ra toàn màn hình.
- Giữ kiểm tra quyền truy cập và nút yêu cầu quyền với tài khoản bị giới hạn.

## Kiểm thử

- `npm run build`: passed.
- `npm test`: 22/22 smoke checks passed.
