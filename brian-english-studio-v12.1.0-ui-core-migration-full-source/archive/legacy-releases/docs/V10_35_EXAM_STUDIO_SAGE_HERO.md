# V10.35 — Exam Studio Sage Hero

## Thay đổi giao diện

- Dựng lại hero Exam Studio bằng React/CSS theo mockup đã duyệt; không dùng ảnh chụp làm nền.
- Minh hoạ mới mô tả đề kiểm tra, checklist, MCQ, Cloze, Word Form, Preview và Export.
- Chuyển toàn bộ bảng `Tóm tắt realtime` thành thanh ngang ngay dưới hero.
- Đưa khu làm việc về một cột toàn chiều rộng sau khi bỏ rail tóm tắt bên trái.
- Đổi nền riêng của Exam Studio từ tím nhạt sang bảng màu sage, cream và slate blue.
- Thiết kế lại ba thẻ trạng thái trong hero và stepper bốn bước theo hướng SaaS trưởng thành.
- Các thẻ `Upload / paste` và `Draft / Preview` trong hero liên kết trực tiếp tới bước tương ứng.
- Bố cục responsive cho desktop, tablet và mobile.

## Kiểm tra

- `npm run build`: đạt.
- `npm test`: 22/22 smoke tests đạt.
