# V10.90.0 — Smart Knowledge Library

## Mục tiêu

Nâng Kho học liệu thành trung tâm tri thức có tìm kiếm, metadata, vòng đời,
bộ sưu tập, yêu thích, tìm kiếm đã lưu và hàng chờ lập chỉ mục AI.

## Route

- `#/knowledge-hub`
- Alias: `#/smart-library`, `#/knowledge-library`
- Phím tắt: `Command/Ctrl + Shift + L`

## Kiến trúc dữ liệu

- `resource_items`: dữ liệu và file hiện có, không bị thay thế.
- `resource_smart_metadata`: metadata mở rộng và chỉ mục tìm kiếm.
- `resource_collections`: bộ sưu tập cá nhân hoặc dùng chung của tổ.
- `resource_collection_items`: tài liệu trong bộ sưu tập.
- `resource_user_state`: yêu thích và lịch sử mở.
- `resource_saved_searches`: truy vấn và bộ lọc đã lưu.
- `resource_index_jobs`: hàng chờ AI, chưa tự gọi provider.

## Lưu ý

V10.90.0 tạo nền tảng AI-ready nhưng không tự gửi file ra nhà cung cấp AI.
Việc lập embedding hoặc tóm tắt tự động cần worker/server action và chính sách chi phí
ở phiên bản tiếp theo.
