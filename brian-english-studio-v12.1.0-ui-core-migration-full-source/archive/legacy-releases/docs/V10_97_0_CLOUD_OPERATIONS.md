# V10.97.0 — Cloud Operations & Background Automation

## Mục tiêu

V10.97 chuyển bộ lập lịch V10.96 từ trình duyệt sang hàng đợi bền vững trên Supabase. Quy tắc tiếp tục chạy khi website/PWA đã đóng.

## Thành phần

- `automation_cloud_jobs`: durable queue, retry, dead-letter và approval state.
- `automation_delivery_log`: nhật ký thông báo, draft và digest.
- `automation_worker_heartbeats`: nhịp worker và trạng thái gần nhất.
- `automation_digest_preferences`: bản tin vận hành cá nhân.
- `bes_v1097_worker_tick()`: worker batch.
- Supabase Cron `bes-v1097-worker`: chạy mỗi 5 phút khi `pg_cron` khả dụng.

## An toàn

- Hành động `requires_approval=true` không chạy tự động.
- Admin/TTCM duyệt từ Cloud Operations.
- Giáo viên chỉ xem job và delivery của chính mình.
- Không lưu API key hoặc access token trong queue/log.

## Fallback

Nếu `pg_cron` không khả dụng, Admin/TTCM vẫn có thể nhấn **Chạy worker ngay**. Migration và UI không làm mất quy tắc V10.96.
