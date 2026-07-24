# Ứng dụng website do giáo viên đề xuất

- Giáo viên mở trang Ứng dụng và chọn **Thêm ứng dụng**.
- Yêu cầu được lưu trong `permission_requests` với loại `external-app` và trạng thái `pending`.
- TTCM/Admin xem trước website, kiểm tra chính sách iframe, sau đó duyệt hoặc từ chối.
- Khi duyệt, website được lưu vào `ai_website_settings.tools` với `kind: external-app`.
- Thẻ đã duyệt xuất hiện trong Cửa sổ ứng dụng sáng tạo.
- Website chạy trong iframe full-screen nội bộ, không cấp quyền tự mở tab mới.
- Các website đặt `X-Frame-Options` hoặc CSP `frame-ancestors` chặn Brian sẽ được cảnh báo trước khi duyệt.
