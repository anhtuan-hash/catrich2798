# Brian English Studio V10.81.8 — WordGraph runtime fix

## Lỗi đã sửa

WordGraph Studio bị trắng trang ngay khi mở vì giao diện đọc `graph.nodes.length`, trong khi bộ dựng dữ liệu WordGraph trả về cấu trúc `graph.clusters`. Trình duyệt phát sinh lỗi runtime `Cannot read properties of undefined (reading 'length')`, làm toàn bộ mô-đun lazy bị dừng render.

## Thay đổi

- Thay truy cập `graph.nodes.length` bằng `visibleNodeCount` được tính an toàn từ:
  - 1 node trung tâm;
  - số node từ vựng;
  - tổng số node nhánh.
- Chống lỗi khi `clusters` hoặc `groups` không phải mảng.
- Thêm smoke check để lỗi này không quay lại.
- Không thay đổi Supabase, Google Drive hay dữ liệu người dùng.

## Kiểm tra

- Production build thành công.
- SSR render WordGraph thành công.
- Smoke tests thành công.
