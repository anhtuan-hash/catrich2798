# V10.6 — Flat Creative Teaching OS

## Thay đổi chính

- Chốt hướng thiết kế trang chủ theo phong cách **Flat Creative Teaching OS** thay cho Windows 8 Start Screen.
- Chuẩn hoá chuyển đổi ngôn ngữ **VI / EN** ở cấp hệ thống:
  - cập nhật `document.lang`, `document.title`, `data-language`;
  - trang chủ, menu ghim, thanh điều hướng, app card và mô tả app đổi ngôn ngữ đồng bộ;
  - các app đang dùng `language` prop tiếp tục đổi nội dung theo cùng trạng thái.
- Mỗi thẻ app có màu nhận diện riêng:
  - Lesson Architect: cam đất `#E86D1F`
  - Exam Studio: xanh navy `#123C69`
  - Game Hub: tím đậm `#5B2A86`
  - WordGraph Studio: xanh lá `#2E9E5D`
  - Reading Studio: vàng mù tạt `#D99A1E`
  - Speaking Studio: cyan `#00A6A6`
  - TextCare Fixer: đỏ gạch `#B8332A`
  - Department Workspace: xanh tím `#3B4CCA`
- Thêm bộ icon line-art phẳng dùng chung cho homepage, app cards và Apps page.
- Làm lại các app cards theo cùng tinh thần flat website collage: màu riêng, viền đậm, icon vẽ tay, ít bóng nặng.
- Retune hiệu ứng mở app thành **Flat Window Launch Transition**:
  - nén card trước khi mở;
  - lấy đúng vị trí và kích thước card được click;
  - card phóng từ vị trí thật ra toàn màn hình;
  - route chỉ đổi sau khi animation che màn hình.

## Kiểm thử

- `npm run build`
- `npm test`
