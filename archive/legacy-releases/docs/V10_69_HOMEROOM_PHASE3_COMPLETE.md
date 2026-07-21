# Brian English Studio V10.69 — Giáo viên chủ nhiệm, Giai đoạn 3 hoàn chỉnh

Giai đoạn 3 được triển khai đầy đủ theo ba đợt, tiếp tục sử dụng dữ liệu V10.66–V10.68 mà không xóa lớp hiện có.

## Đợt 1 — An toàn dữ liệu và vòng đời lớp

- Tạo, chuyển đổi và quản lý nhiều lớp theo năm học/học kỳ.
- Sao chép danh sách sang năm học mới; tùy chọn giữ hoặc làm sạch dữ liệu lịch sử.
- Lưu trữ, khôi phục và chuyển lớp học sinh thay cho xóa vĩnh viễn.
- Nhật ký thay đổi ghi người thao tác, nguồn thay đổi, thời gian và tóm tắt.
- Sao lưu tự động, sao lưu thủ công và khôi phục từng điểm phục hồi.
- PIN cổng phụ huynh/học sinh 6 chữ số, lưu bản băm SHA-256 trong snapshot công khai.
- Giới hạn số lần nhập sai, khóa tạm thời, hết hạn phiên và thu hồi toàn bộ mã truy cập.

## Đợt 2 — Nghiệp vụ chủ nhiệm thực tế

- Điểm danh theo ngày, buổi hoặc tiết; ghi chú và minh chứng.
- Chốt/khóa phiên điểm danh và tạo yêu cầu chỉnh sửa sau khi chốt.
- Hồ sơ sự việc, mức độ, biện pháp, người phối hợp, hạn theo dõi và kết quả.
- Kế hoạch hỗ trợ học sinh với mục tiêu, hành động, tiêu chí và tiến độ.
- Nhập điểm từ Excel/CSV, ánh xạ cột thủ công hoặc bằng AI.
- Ngưỡng cảnh báo học tập tùy chỉnh và khóa bảng điểm theo giai đoạn.
- Thông báo có lịch gửi, xác nhận đã đọc, tệp đính kèm nhỏ và phản hồi hai chiều từ cổng phụ huynh/học sinh.

## Đợt 3 — Hoàn thiện sử dụng

- Tìm kiếm toàn lớp: học sinh, lịch, hồ sơ, sự việc, nhận xét, liên hệ và thông báo.
- Nhắc việc có hạn, trạng thái quá hạn và liên kết trực tiếp tới phân hệ liên quan.
- Xem trước hồ sơ theo định dạng văn bản nhà trường.
- Xuất Word và in/lưu PDF cho báo cáo, biên bản và kế hoạch chủ nhiệm.
- Bố cục responsive cho desktop, tablet và điện thoại.
- Dashboard nhận diện các phiên điểm danh trong ngày và tóm tắt công việc cần xử lý.

## Supabase

Chạy theo thứ tự:

1. `supabase/homeroom_workspace_v10_66.sql`
2. `supabase/homeroom_phase2_v10_67.sql`
3. `supabase/homeroom_phase3_v10_69.sql`

Migration V10.69 bổ sung bảng audit, backup, portal lockout, phản hồi phụ huynh và các bảng dữ liệu chuẩn hóa sẵn cho mở rộng thống kê. Các RLS policy giới hạn dữ liệu cho chủ sở hữu lớp hoặc Admin đã duyệt.

## Kiểm tra

- Production build: đạt.
- Smoke tests: 60/60.
- Department runtime test: xem kết quả trong gói phát hành.
