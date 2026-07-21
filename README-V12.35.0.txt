BRIAN ENGLISH STUDIO V12.35.0
UNIFIED AI RUNTIME RESILIENCE — PHASE 4

Nâng cấp chính:
- Hàng đợi request AI và giới hạn số request chạy đồng thời.
- Timeout tập trung bằng AbortController.
- Retry lỗi tạm thời với exponential backoff.
- Gộp request đang chạy trùng nhau.
- Cache ngắn hạn an toàn cho tác vụ phù hợp; không cache dữ liệu đã được Privacy Filter che.
- Circuit breaker tạm ngắt provider đang lỗi liên tục.
- Text AI, Vision và SmartID media dùng chung runtime phía trình duyệt.
- AI Governance có bảng trạng thái và cấu hình runtime trực tiếp.
- Audit ghi queue wait, retry, timeout, cache, de-duplication và circuit status.

Kiểm tra đã chạy:
- npm run test:v12.35.0: đạt
- npm run build: đạt
- npm test: 188/188 đạt
- npm run test:department: Admin, TTCM và giáo viên đạt

Không cần chạy SQL.
