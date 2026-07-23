# PHASE 1.2 — VISUAL STABILIZATION

## Trạng thái đã pass

- Drawer.
- Modal.
- Loading skeleton.
- Toast.
- Menu ba chấm.

## Lỗi phát hiện từ ảnh review

1. Stat cards bị ép nội dung thành cột hẹp.
2. Quick-action buttons bị chia cột và chồng chữ.
3. Account panel bị dải nền tím của `hr-progress-row`.
4. Menu hàng cuối đặt anchor sai cột và tràn khỏi khung trái.
5. Toast cần tránh thanh tiện ích nổi bên phải.

## Sửa đổi

- Khóa stat cards về flex-column.
- Khóa quick grid về 2 cột desktop, 1 cột iPad hẹp.
- Làm sạch nền và transform cũ trong account panel.
- Khóa menu ở cột phải và mở lên trên.
- Điều chỉnh drawer/modal cho iPad.
- Dời toast khỏi thanh tiện ích.
- Mọi rule chỉ nằm trong `.professional-hub-page`.

## Giới hạn

- Chưa nối Supabase.
- Chưa có membership hoặc RLS.
- Không dữ liệu giáo viên giả.
- Không merge hoặc deploy Production.
