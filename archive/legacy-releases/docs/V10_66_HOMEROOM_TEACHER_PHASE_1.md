# Brian English Studio V10.66 — Giáo viên chủ nhiệm, Giai đoạn 1

## Đã triển khai

- Thẻ **Giáo viên chủ nhiệm** trong trang Ứng dụng.
- Mục **Chủ nhiệm** trên thanh điều hướng toàn hệ thống.
- Phân quyền `route:homeroom` trong trang Quản trị.
- Dữ liệu tách theo tài khoản giáo viên và lớp chủ nhiệm.
- Đồng bộ Supabase, có local fallback khi chưa cấu hình cloud.

## Các phân hệ

1. **Tổng quan**
   - Sĩ số, chuyên cần hôm nay, số học sinh vắng, công việc trong tuần.
   - Học sinh cần lưu ý, lịch sắp tới, tiến độ hoàn thiện hồ sơ.
2. **Học sinh**
   - Thêm, sửa, xóa, tìm kiếm, đánh dấu mức hỗ trợ.
   - Thông tin học sinh, phụ huynh, địa chỉ và ghi chú.
   - Xuất danh sách CSV.
3. **Điểm danh**
   - Có mặt, đi trễ, vắng phép, vắng không phép, về sớm.
   - Lưới điểm danh nhanh và lịch sử 14 ngày.
4. **Lịch công việc**
   - Thêm lịch thủ công, phân loại, đối tượng, địa điểm, trạng thái.
   - AI đọc file để nhập hàng loạt.
5. **Sinh hoạt lớp**
   - AI tạo nội dung dựa trên chuyên cần, lịch tuần và học sinh cần theo dõi.
   - Lưu kế hoạch/biên bản để mở lại.
6. **Phụ huynh**
   - AI soạn tin theo học sinh, chủ đề, kênh và giọng điệu.
   - Lưu lịch sử trao đổi, kết quả và ngày theo dõi lại.
7. **Hồ sơ & báo cáo**
   - AI tổng hợp báo cáo từ dữ liệu thật của lớp.
   - Lưu hồ sơ, tải TXT và sao lưu toàn bộ dữ liệu JSON.
8. **AI GVCN**
   - Đọc PDF, DOCX, XLSX, XLS, CSV, TXT, MD, HTML.
   - Nhận diện danh sách học sinh, lịch công việc, điểm danh, danh bạ/liên hệ phụ huynh.
   - Xem trước trước khi thêm tất cả vào lớp.

## Cài đặt Supabase

Chạy một lần file sau trong Supabase SQL Editor:

```text
supabase/homeroom_workspace_v10_66.sql
```

Bảng `public.bes_homeroom_workspaces` dùng RLS:

- giáo viên chỉ đọc/sửa dữ liệu của chính mình;
- admin đã duyệt có thể hỗ trợ dữ liệu toàn hệ thống;
- dữ liệu được lưu dưới dạng workspace JSON theo tài khoản và mã workspace.
