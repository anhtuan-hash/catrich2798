# Brian English Studio V12.26.0 — OpenRouter Stability Repair

## Sửa lỗi chính

- Kiểm tra kết nối provider chỉ xin tối đa 48 output tokens thay vì bị AI Governance nâng lên 2.200 tokens.
- Cấu hình OpenRouter cũ dùng `openai/gpt-4o-mini` được chuyển một lần sang `openrouter/free` để tránh lỗi credit lặp lại.
- Khi model trả phí trên OpenRouter báo thiếu credit, hệ thống thử `openrouter/free` trước khi chuyển provider khác.
- Lỗi HTTP từ provider giữ lại status code để bộ định tuyến phân loại chính xác.
- Không cần chạy SQL.

## Cài đặt

Dùng bản Update Only và lệnh trong `INSTALL-V12.26.0-ONE-COMMAND.txt`.
