# Weekly Practice: chuyển HTML khỏi Supabase Storage

## Kiến trúc mới

- `weekly_practice_items` vẫn lưu metadata, trạng thái, thời gian mở và mã Google Drive.
- File HTML mới được tải lên Google Drive qua `/api/google-drive-upload`.
- Học sinh nhận file qua `/api/weekly-practice-file`.
- Gateway kiểm tra bài đã công bố và còn thời hạn trước khi trả file.
- Vercel CDN cache file; trình duyệt tiếp tục lưu bản raw HTML trong Cache Storage theo `id + updated_at`.
- Runtime bridge vẫn được chèn tại máy học sinh nên tiến độ riêng không bị đóng băng trong cache.

## Chuyển file cũ

Khi TTCM/Admin mở bảng quản lý, tối đa 24 file legacy mỗi lượt được chuyển tự động:

1. Server đọc object cũ bằng service role.
2. Upload sang thư mục Worksheet trên Google Drive.
3. Cập nhật `storage_bucket = google-drive` và `storage_path = Drive file ID`.
4. Chỉ sau khi metadata cập nhật thành công mới xóa object cũ.

Nếu một lượt chưa chuyển hết, mở lại bảng quản lý để chạy lượt tiếp theo.

## SQL khuyến nghị

Chạy migration:

`supabase/migrations/20260730090000_weekly_practice_google_drive_v4.sql`

Migration không thay đổi cấu trúc bảng. Nó đổi giá trị mặc định và khóa quyền upload/read trực tiếp ở bucket `weekly-practice`. Vì vậy việc deploy code có thể thực hiện trước; chạy SQL sau khi xác nhận API hoạt động.

## Phần vẫn ở Supabase Storage

Bucket `weekly-practice-proofs` vẫn lưu ảnh xác nhận học sinh. Đây là dữ liệu nộp bài, không phải file HTML được phát công khai và không nằm trong luồng egress lớn đã xử lý.
