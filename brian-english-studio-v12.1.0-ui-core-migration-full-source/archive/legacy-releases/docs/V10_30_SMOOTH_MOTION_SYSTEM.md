# Brian English Studio V10.30 — Smooth Motion System

## Đã thay đổi

- Hợp nhất chuyển trang thành một hiệu ứng duy nhất thay vì chạy đồng thời tile launch, loader, indicator và page flip.
- Chuyển hướng sớm khi lớp màu đang phủ màn hình để nội dung mới được render phía dưới mà không nhấp nháy.
- Chỉ animate `transform` và `opacity` cho chuyển trang; loại bỏ border, shadow và filter trong lúc phóng tile.
- Thêm chuyển động vào trang mới theo hướng fade + translate rất nhẹ.
- Tự động bỏ animation khi người dùng bật `prefers-reduced-motion` hoặc thiết bị được nhận diện ở chế độ hiệu năng thấp.
- Chuẩn hóa thời lượng và easing cho button, navigation, card và app window.
- Loader chỉ xuất hiện khi có tác vụ tải thực sự, không còn tự bật ở mọi lần đổi route.

## Nhịp chuyển động mới

- Phản hồi nhấn: 140 ms
- Chuyển UI thông thường: 220 ms
- Tile mở ứng dụng: 520 ms ở Full, 380 ms ở Lite
- Nội dung trang xuất hiện: 320 ms ở Full, 240 ms ở Lite
