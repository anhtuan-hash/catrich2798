# Brian English Studio V10.81.6

## Kho học liệu quy mô lớn và xóa tài liệu an toàn

### Tính năng mới

- TTCM/Admin có nút **Xóa** trên tài liệu đã duyệt.
- Xác nhận xóa xuất hiện ngay tại vị trí nút thao tác, tránh bấm nhầm.
- Khi xác nhận, bản ghi được xóa khỏi Supabase và file được chuyển vào **Thùng rác Google Drive** để còn khả năng khôi phục.
- API `/api/google-drive-delete` kiểm tra phiên đăng nhập và vai trò TTCM/Admin ở phía máy chủ.
- Mặc định hiển thị **Danh sách gọn** để thư mục 100+ file không tạo hàng trăm thẻ lớn.
- Phân trang 24 / 48 / 96 file mỗi trang; chỉ render trang đang xem.
- Có thể chuyển giữa **Danh sách gọn** và **Thẻ lớn**.
- Thanh điều khiển hiển thị phạm vi file hiện tại và các nút Đầu / Trước / Sau / Cuối.
- Bộ lọc, tìm kiếm, trạng thái duyệt và danh mục tiếp tục hoạt động trước khi phân trang.

### File thay đổi

- `src/pages/ResourceLibrary.jsx`
- `src/features/resource-library/resourceLibraryCategories.css`
- `api/google-drive-delete.js`
- `package.json`
- `package-lock.json`

### Cài đặt

Không cần chạy thêm SQL. Chép gói update-only vào repository hiện tại, chạy:

```bash
npm ci
npm run build
git add -A
git commit -m "Add scalable resource browser and TTCM delete V10.81.6"
git push origin main
```

Sau khi Vercel báo Ready, tải lại trang bằng `Command + Shift + R`.
