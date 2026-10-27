# BRIAN REPORTS — SPEC KỸ THUẬT TỔNG HỢP HSG / PHỤ ĐẠO

Ngày ban hành: 27/10/2026. Hai chương trình độc lập: Bồi dưỡng HSG (gifted) và Phụ đạo (remedial). Mỗi chương trình có 3 màn hình con: Báo cáo giáo viên, Tổng hợp tổ, Thống kê tháng/năm học.

## 1. Luồng và quyền
- TTCM có quyền chuyên môn hợp lệ và sở hữu tổ được truy cập cả ba màn hình. GV thường chỉ xem, sửa và gửi báo cáo được giao.
- Mọi thao tác kiểm tra quyền tại Supabase RPC dựa trên auth.uid, quyền can_manage_brian_team và quyền sở hữu department_team_workspaces. Không tin role hay department gửi từ trình duyệt.
- Bảng hạn nộp mới chỉ grant SELECT cho tài khoản đăng nhập; RLS giới hạn đúng tổ và giáo viên đã được giao, không grant write trực tiếp.
- Không có AI, không chỉnh sửa dữ liệu Điểm danh gốc.

## 2. Tổng hợp tổ theo tháng
Bộ điều khiển gồm loại báo cáo, năm học, tháng (từ tháng 8 đến tháng 7), làm mới, đặt hạn và xóa hạn. Hạn được quản lý riêng theo TTCM + tổ + loại báo cáo + tháng, không ghi đè cột due_at bất biến của báo cáo. Giáo viên nhìn thấy hạn hiệu lực, TTCM nhìn đồng hồ đếm ngược. Đặt hạn phải ở tương lai, khi xóa hạn phải hỏi xác nhận và hủy sự kiện hạn nộp đã phát hành; khi đặt lại hạn sự kiện được cập nhật. Không sửa dữ liệu nộp/duyệt.

Các KPI:
- GV được giao (distinct teacher_id), số báo cáo được giao;
- Đã nộp (submitted/revision/approved), duyệt, cần sửa, bản nháp, tỷ lệ đã gửi;
- Số lớp có hoạt động đã chốt (distinct class_id), số buổi dạy (distinct session id), số tiết dạy thực tế (giữ giá trị lẻ);
- Tổng lượt phải tham gia, có mặt, vắng và đi trễ; chuyên cần = 100 × có mặt / phải tham gia (không trung bình các tỷ lệ lớp);
- Số báo cáo có kiến nghị; với HSG thêm số kiểm tra/thi thử, báo cáo có thành tích; với Phụ đạo thêm số học sinh tiến bộ và đạt mục tiêu theo số GV tự báo cáo.

Bảng theo giáo viên: tên, trạng thái, số buổi và tiết của chính GV đó, lượt có mặt, tỷ lệ chuyên cần, kiến nghị, xem báo cáo. CSV có UTF-8 BOM, chặn formula injection. Khi không có nhiệm vụ phải hiển thị thông báo chưa giao, không suy diễn 0% tham gia.

## 3. Thống kê tháng và năm học
- Năm học từ 01/08 năm bắt đầu đến 31/07 năm sau; thứ tự 12 tháng T8, T9, T10, T11, T12, T1, T2, T3, T4, T5, T6, T7.
- Hero, thẻ KPI tổng năm, lưới 12 tháng gồm số nộp, duyệt, nháp, cần sửa, tiến độ, số buổi, tiết.
- Tháng chưa giao hiển thị Chưa giao.
- Nhấp vào thẻ tháng chuyển sang Tổng hợp tổ của đúng tháng.
- Biểu đồ so sánh số buổi thực dạy và bảng kết quả theo giáo viên, CSV năm học.

## 4. Quy tắc nguồn dữ liệu
- Nguồn báo cáo: bes_learning_report_tasks.
- Nguồn thực dạy: bes_extra_attendance_sessions chỉ lấy session_status completed, ràng buộc mã lớp cùng tên GV thực dạy từ bes_learning_report_class_bindings (không ghép cả lớp cho 2 GV).
- Một mã buổi điểm danh chỉ tính một lần kể cả khi có nhiều nhiệm vụ; không coi tổng lượt có mặt là số học sinh duy nhất.
- Báo cáo đã duyệt dùng attendance_snapshot cố định; bản nháp, đã nộp hoặc cần sửa dùng Điểm danh hiện hành đã chốt.
- Chỉ RPC quản lý đọc dữ liệu liên quan TTCM/tổ được phân quyền, không trả tên HS, mã HS, ghi chú cá nhân, không sửa lớp hay điểm danh.

## 5. Kiểm thử bắt buộc
- HSG và phụ đạo hoàn toàn tách biệt.
- Cùng một lớp 2 giáo viên: không cộng trùng, chỉ nhận tiết và buổi của người thực dạy.
- Không đếm đôi session id, tiết lẻ không bị làm tròn.
- Chuyên cần được tính bằng tổng có mặt / tổng lượt phải tham gia.
- Thống kê đủ 12 tháng qua ranh giới năm, tháng không giao phân biệt với 0%.
- TTCM sai tổ / GV không thể thao tác RPC quản lý.
- Hạn nộp đặt, xóa và thiết lập lại không thay đổi bản báo cáo, sự kiện/hiệu lực đồng nhất.
- Các báo cáo đã duyệt vẫn dùng snapshot.
- CI kiểm tra JavaScript, JSX, quy tắc thống kê, song ngữ, Vercel Preview/Production.

## 6. Triển khai
Migration bổ sung bảng deadline overrides có RLS và 2 RPC có kiểm quyền, client service xử lý hạn hiệu lực, thành phần Dashboard hiển thị tổng hợp và 12 tháng, biểu đồ, bảng GV và CSV. Không làm gián đoạn Monthly Reports, Focus, Board, Supabase hiện có. GitHub PR riêng, kiểm thử rồi mới merge.
