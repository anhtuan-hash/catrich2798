# Brian English Studio V12.33.0 — Unified AI Core Phase 2

## Nội dung nâng cấp

V12.33.0 bổ sung hai lớp an toàn dùng chung trước và sau mọi yêu cầu đi qua `callAI()`:

- **Privacy Filter** che tên học sinh, email, số điện thoại, mã học sinh, số định danh, ngày sinh, địa chỉ và API secret trước khi dữ liệu rời trình duyệt.
- Các placeholder được giữ nguyên khi gọi provider và được **khôi phục cục bộ** sau khi output đã vượt qua kiểm định; giá trị gốc không được ghi vào audit.
- Có ba chế độ: che dữ liệu, chặn request nhạy cảm, hoặc tắt bộ lọc.
- Có tùy chọn buộc dùng Ollama/LM Studio/LocalAI cho request rủi ro cao và chặn ảnh nhạy cảm.
- **Output Guard** kiểm tra nội dung rỗng, JSON, trường bắt buộc, số lượng item, câu trùng, cấu trúc MCQ và độ dài.
- Output lỗi được gửi qua một lượt **AI Repair** trước khi chuyển provider fallback.
- Worksheet Factory, Grammar Builder và Speaking Studio đã khai báo hợp đồng đầu ra cụ thể.
- AI Governance hiển thị số dữ liệu đã che, lỗi kiểm định và output đã tự sửa.
- Metadata `callAIWithMeta()` nay có `privacy`, `validation`, `providerCalls` và trạng thái restore.

Không cần chạy SQL.
