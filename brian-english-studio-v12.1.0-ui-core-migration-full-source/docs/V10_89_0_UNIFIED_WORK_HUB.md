# V10.89.0 Unified Work Hub

## Kiến trúc

### Giao diện

- Global update-only runtime, không phụ thuộc cấu trúc React hiện tại.
- Route `#/work-hub` mở một workspace toàn màn hình.
- Tự phát hiện Supabase client đang tồn tại; nếu client không được expose, runtime đọc session và public config từ bundle đã build rồi dùng PostgREST.
- Không đọc hoặc sử dụng Service Role Key.

### Cơ sở dữ liệu

| Bảng | Chức năng |
|---|---|
| `work_hub_items` | Công việc, lịch, hồ sơ và trạng thái quy trình |
| `work_hub_comments` | Phản hồi và ghi chú |
| `work_hub_activity` | Nhật ký bất biến do trigger tạo |
| `work_hub_notifications` | Thông báo riêng theo người dùng |

### RLS

- Admin/TTCM: xem và quản lý toàn bộ.
- Người tạo/chủ trì: xem và chỉnh sửa công việc của mình.
- Người được giao: xem công việc và chỉ thay đổi trạng thái hợp lệ.
- Người theo dõi: xem nội dung liên quan.
- Công việc toàn tổ chỉ Admin/TTCM có thể xuất bản.

### Trạng thái

```text
draft
assigned
accepted
in_progress
submitted
changes_requested
approved
completed
archived
cancelled
```

### RPC

- `work_hub_my_context()`
- `work_hub_people()`
- `work_hub_dashboard()`
- `work_hub_transition_item()`

## Giới hạn của V10.89.0

- Tệp đính kèm được chuẩn bị ở schema nhưng giao diện đầu tiên tập trung vào quy trình, phản hồi và phê duyệt.
- Lịch 14 ngày là lịch nội bộ; đồng bộ Google Calendar dự kiến ở bản sau.
- Polling 30 giây được dùng khi Supabase client không được expose cho runtime.
