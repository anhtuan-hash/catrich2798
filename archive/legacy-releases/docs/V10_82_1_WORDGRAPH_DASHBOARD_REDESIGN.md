# Brian English Studio V10.82.1 — WordGraph Dashboard Redesign

## Mục tiêu

Thiết kế lại WordGraph Studio theo mockup đã duyệt, đồng thời giữ nguyên toàn bộ chức năng AI, kéo thả node, auto layout, chỉnh outline và xuất SVG/PNG/HTML/Mermaid.

## Thay đổi giao diện

- Dùng một khung nội dung trung tâm `max-width: 1320px`, không để thẻ chạm hai viền màn hình.
- Hero chia hai phần cân đối:
  - Bảng minh họa WordGraph bên trái.
  - Tiêu đề, mô tả và bốn nút thao tác bên phải.
- Thanh trạng thái AI và mẹo nhanh nằm ngay dưới hero.
- Bổ sung bảng điều khiển bốn thẻ:
  - Tạo sơ đồ.
  - Mẫu nhanh.
  - Cấu trúc từ.
  - Lịch sử gần đây.
- Các mẫu nhanh và cấu trúc từ đều tương tác được, tự đưa người dùng tới ô AI và điền prompt phù hợp.
- Lịch sử gần đây đọc dữ liệu thật từ thư viện tài khoản, không dùng dữ liệu minh họa.
- Khu vực AI và canvas vẫn hiển thị hai cột trên desktop, tự chuyển một cột trên màn hình nhỏ.
- Hero, dashboard, canvas và outline đều có khoảng cách an toàn với hai viền màn hình.

## Tương tác mới

- `Tạo nhanh` và `Tạo mới`: làm sạch workspace và focus vào ô yêu cầu AI.
- `Nhập từ danh sách`: cuộn tới trường nhập danh sách từ và focus tự động.
- `Mind map kéo thả`: cuộn tới canvas.
- `Auto layout`: chuyển về Tree layout và tự sắp xếp lại node.
- `Mẫu nhanh`: điền prompt tương ứng.
- `Cấu trúc từ`: điền prompt theo nhóm node.
- `Lịch sử gần đây`: mở lại output WordGraph đã tạo trước đó.

## Cơ sở dữ liệu

Không cần chạy SQL Supabase và không cần thêm Environment Variable.
