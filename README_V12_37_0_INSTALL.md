# Brian English Studio V12.37.0 — AI Cloud Governance Sync

## Mục tiêu

Phase 6 đưa AI Governance từ trạng thái chỉ lưu trên từng trình duyệt sang cơ chế **local-first + Supabase cloud sync**.

- Request vẫn được kiểm tra và ghi cục bộ ngay lập tức.
- Khi có mạng, metadata an toàn được đẩy lên Supabase theo hàng đợi.
- Admin xem được báo cáo toàn hệ thống trong 14 ngày.
- Cấu hình Governance được đồng bộ giữa các thiết bị/tài khoản.
- Prompt, câu trả lời AI, file đính kèm, hình ảnh, API key, token và mật khẩu không được tải lên bảng telemetry.

## Bắt buộc chạy SQL một lần

1. Mở Supabase Dashboard của dự án Brian.
2. Mở **SQL Editor**.
3. Mở file:

   `supabase/brian_v12_37_ai_governance_cloud.sql`

4. Dán toàn bộ nội dung và bấm **Run**.
5. Có thể chạy `supabase/brian_v12_37_verify.sql` để xác minh.

## Sau khi triển khai code

Vào **Quản trị → AI Governance**, tại thẻ **AI Governance Cloud Sync**:

1. Bấm **Đồng bộ ngay**.
2. Trạng thái phải chuyển thành **Cloud sẵn sàng**.
3. Bấm **Tải cấu hình & báo cáo cloud** để xem số liệu tập trung.

## Cơ chế an toàn

Cloud chỉ lưu telemetry và provenance:

- Task, provider, model, transport.
- Số token ước tính.
- Thời gian xử lý.
- Fallback, retry, cache, timeout.
- Số dữ liệu đã che và output đã sửa.
- Tài khoản thực hiện và thời điểm.

Không lưu nội dung prompt hoặc kết quả AI.
