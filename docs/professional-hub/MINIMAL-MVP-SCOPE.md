# Hub Chuyên môn — Minimal MVP

## Phạm vi cố định

Hub Chuyên môn chỉ giải quyết hai luồng:

1. TTCM gửi thông báo, lịch họp, lịch làm việc hoặc yêu cầu nộp tài liệu đến giáo viên.
2. Giáo viên nhận thông báo, đánh dấu đã đọc và nộp file cho TTCM; TTCM xem, phản hồi và duyệt.

## Giao diện

Giao diện tham chiếu trực tiếp ứng dụng Giáo viên chủ nhiệm:

- hero và thẻ tài khoản;
- thanh tab dạng pill;
- card thống kê;
- danh sách công việc;
- drawer chi tiết;
- modal tạo nội dung;
- toast và loading strip.

## Chức năng TTCM

- Khởi tạo Hub bằng tài khoản Admin/TTCM.
- Thêm giáo viên bằng email tài khoản Brian.
- Gửi thông báo đến một số hoặc toàn bộ giáo viên.
- Tạo lịch họp và lịch làm việc.
- Tạo yêu cầu nộp tài liệu và đặt hạn.
- Xem trạng thái đã đọc/chưa đọc.
- Xem ai đã nộp/chưa nộp.
- Mở file, phản hồi, yêu cầu bổ sung hoặc duyệt.
- Gỡ giáo viên khỏi Hub.

## Chức năng giáo viên

- Nhận thông báo bằng Supabase Realtime.
- Xem badge chưa đọc.
- Đánh dấu đã đọc khi mở thông báo.
- Xem lịch họp và lịch làm việc.
- Nộp file tối đa 25 MB kèm ghi chú.
- Nộp lại khi TTCM cho phép.
- Xem phản hồi và trạng thái duyệt.

## Không xây dựng

- Kế hoạch nhiều cấp.
- Hồ sơ chuyên môn tổng hợp.
- Minh chứng.
- Báo cáo phức tạp.
- Sinh hoạt tổ riêng.
- Audit framework hoặc backup snapshot.
- Phê duyệt nhiều tầng.
- Dữ liệu hoặc giáo viên mẫu.

## Cổng triển khai

Nhánh này chỉ tạo mã nguồn, migration và Draft PR. Migration chưa được áp dụng lên Supabase remote; PR chưa được merge và chưa deploy Production.
