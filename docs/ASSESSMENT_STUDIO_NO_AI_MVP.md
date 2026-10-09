# BRIAN Assessment Studio — MVP 1 (No AI)

## Phạm vi bàn giao
- 12 sản phẩm trong danh mục; 3 công cụ có chức năng nhập, chấm và lưu dữ liệu thật: DiagnosticScan, SpeakScale, ExitTicket.
- Teaching Adjustment Tracker: ghi kế hoạch, trạng thái thực hiện, ngày, minh chứng và kết quả đánh giá lại.
- Phân tích kết quả theo chủ điểm/tiêu chí, xuất CSV, in hồ sơ minh chứng bằng Print → Save as PDF.
- Chấm điểm theo đáp án cố định hoặc rubric; không sử dụng AI.
- Các mục còn lại hiển thị "Dự kiến" và chưa sử dụng được.
- Chưa có cổng học sinh tự làm bài trực tuyến trong bản MVP.

## Địa chỉ
Sau khi merge, triển khai và đăng nhập tài khoản có quyền Assessment Core, truy cập #/assessment-studio.
Desktop có nút Đánh giá. Desktop và mobile có lối vào từ trang #/assessment-core.

## Cấu hình trước khi sử dụng
1. Sao lưu cơ sở dữ liệu Supabase.
2. Quản trị viên rà soát và chạy tệp supabase/brian_assessment_studio_mvp.sql trong Supabase SQL Editor đúng dự án.
3. Xác nhận ba bảng bes_assessments, bes_assessment_results, bes_assessment_adjustments đã bật Row Level Security.
4. Đăng nhập giáo viên có quyền route:assessment-core; tạo bài thử và kiểm thử quyền.
5. Chỉ nhập dữ liệu học sinh thật sau khi xác nhận điều kiện bảo mật, mục đích và quy trình xử lý thông tin theo quy định nhà trường.

Nếu chưa áp dụng SQL, giao diện báo lỗi, không chuyển sang dữ liệu giả hoặc localStorage.

## Quy trình
1. Tạo bài đánh giá: tên, lớp, mục tiêu, loại công cụ.
2. Diagnostic và Exit: mỗi dòng theo mẫu: Question | Option A | Option B | Option C | Option D | B | Grammar topic. Đáp án A–D. Diagnostic tối đa 50; Exit tối đa 3.
3. Speaking: năm tiêu chí, mỗi tiêu chí 0–4 điểm.
4. Tổ chức kiểm tra trong lớp; giáo viên nhập kết quả thực tế vào giao diện. Đây chưa phải cổng làm bài trực tuyến.
5. Xem phân tích kết quả theo chủ điểm/tiêu chí.
6. Tạo nhật ký điều chỉnh. Trạng thái Đã thực hiện yêu cầu ngày và nội dung minh chứng; trạng thái Đã đánh giá lại yêu cầu kết quả.
7. Xuất CSV hoặc chọn in hồ sơ rồi Save as PDF trong trình duyệt.

## Bảo mật và giới hạn
- Ba bảng có RLS, chỉ chủ sở hữu dữ liệu được phép truy cập.
- Không mở quyền ghi anon.
- Hồ sơ chỉ tổng hợp kết quả đã lưu; kế hoạch không được giả làm hoạt động đã thực hiện.
- Bản MVP chưa dùng chung danh sách lớp Homeroom, chưa có người học tự làm bài, chưa có đánh giá đồng đẳng hay chấm Writing.
- Chưa có upload bằng chứng gốc, chức năng khóa/audit chỉnh sửa, hoặc so sánh thống kê tự động trước–sau. Không dùng bản MVP làm hệ thống lưu trữ hồ sơ cuối cùng trước khi kiểm toán.

## Kiểm thử
- node --test tests/assessment-studio.test.mjs
- npx vite build
- Quy trình GitHub Actions Assessment Studio (No AI) chạy khi có pull request liên quan.

## Lộ trình tiếp
- Thí điểm hai công cụ khác nhau, thu minh chứng thực tế.
- Tích hợp roster an toàn, khóa phiên bản và audit log, đánh giá trước–sau.
- Mở thêm những module còn lại theo lộ trình, luôn giữ điều kiện No AI Integration.
