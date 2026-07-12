# Brian English Studio V10.86.0 — AI Action & Governance

## Điểm mới

- Brian AI có nút **Thực hiện có kiểm soát** trên mỗi câu trả lời.
- Hệ thống phân tích kết quả và đề xuất kế hoạch hành động an toàn.
- Có thể đưa kết quả vào ứng dụng hiện tại, sao chép, hoặc chuyển sang Worksheet Factory, Exam Studio, WordGraph, Lesson Architect và Thư viện.
- Mọi thao tác thay đổi ngữ cảnh đều yêu cầu xác nhận theo cấu hình Admin.
- Không hỗ trợ hành động phá hủy dữ liệu, gửi email, duyệt hồ sơ, thay đổi quyền hoặc xuất bản đề tự động.
- Trang Admin `#/ai-governance` quản lý xác nhận, chuyển liên ứng dụng, tự mở đích và giới hạn kế hoạch.
- Mỗi hành động hoàn tất phát sự kiện audit `bes-ai-action-completed` để các module nhật ký có thể tiếp nhận.

## Ghi chú

Cấu hình Governance đang lưu cục bộ theo trình duyệt. Phiên bản này không cần migration SQL. Cơ chế quyền phía server của từng ứng dụng vẫn là lớp kiểm soát cuối cùng.
