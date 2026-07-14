# V11.3.5 — Work Submission Archive to Resource Library

## Mục tiêu

Cho phép Admin/TTCM lưu trực tiếp tệp giáo viên đã nộp từ Trung tâm công việc vào Kho học liệu dùng chung mà không phải tải xuống máy rồi tải lên lại.

## Quyền truy cập

- Chỉ `admin` và `department_head` được gọi API lưu học liệu.
- Giáo viên chỉ tiếp tục xem và nộp tệp như trước.
- Tệp nguồn vẫn nằm trong bucket riêng tư `work-hub-submissions`.
- Bản sao lưu trữ được đưa vào Google Drive của Kho học liệu.

## Dữ liệu được lưu

- Tên tài liệu.
- Danh mục học liệu.
- Năm học.
- Khối.
- Unit/chủ đề.
- Mô tả và từ khóa.
- Người nộp gốc.
- Công việc nguồn.
- Mã checksum SHA-256.
- Liên kết Google Drive.
- Trạng thái `approved`.

## Chống trùng

Nếu cùng một tệp đã tồn tại trong `resource_items` với cùng checksum, hệ thống không tạo bản sao Google Drive mới. Phản hồi công việc được liên kết với học liệu đã có.

## Đánh dấu trong phản hồi

Mỗi attachment sau khi lưu có thêm:

```text
library_resource_id
library_title
library_category
library_drive_file_id
archived_to_library_at
archived_by
```

Nhờ đó giao diện hiển thị `Đã lưu vào Kho học liệu` và không cho lưu lặp lại.
