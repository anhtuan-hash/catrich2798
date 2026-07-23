# PHASE 1.4 — PRODUCTION UI CLEANUP

## Vấn đề của Phase 1.3

- Khối kiểm tra Drawer/Modal/Toast/Loading xuất hiện như nội dung thật.
- Menu kiểm tra nổi rời khỏi dòng.
- Các nút kiểm tra quá lớn.
- Nhãn GVCN/Visual parity gây nhiễu.
- Footer xuất hiện quá gần vì nội dung chính quá ngắn.
- Giao diện mang cảm giác bản thử nghiệm thay vì ứng dụng hoàn chỉnh.

## Thay đổi

- Xóa toàn bộ giao diện kiểm tra khỏi màn hình mặc định.
- Xóa menu ba chấm giả khỏi Tổng quan.
- Xóa Drawer, Modal, Toast và Loading giả khỏi component chính.
- Giữ lại cấu trúc UI tham chiếu GVCN:
  - hero;
  - tabs;
  - stat cards;
  - overview grid;
  - panels;
  - empty states;
  - account/access panel.
- Tổng quan mới gồm:
  - bốn chỉ số;
  - Hoạt động gần đây;
  - Lịch sắp tới;
  - Tài khoản và quyền truy cập.
- Tăng chiều cao nội dung để footer nằm đúng nhịp trang.
- Không hiển thị thuật ngữ Phase/Visual parity trên UI.
- Không dữ liệu giáo viên mẫu.

## Giới hạn

- Chưa nối Supabase.
- Chưa có membership hoặc RLS.
- Chưa merge hoặc deploy Production.
