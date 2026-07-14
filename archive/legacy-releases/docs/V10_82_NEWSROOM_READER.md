# Brian English Studio V10.82.0 — Newsroom Reader

## Tính năng mới

Thêm thẻ **Newsroom – Đọc báo** trong trang **Ứng dụng**.

### Tin giáo dục Việt Nam

- Mới nhất
- Chính sách
- Phương pháp
- Học đường
- Nguồn RSS: Báo Giáo dục & Thời đại và Tuổi Trẻ

### English News

- Top stories
- Education
- Science
- Learning English
- Nguồn RSS: BBC News, The Guardian và VOA Learning English

## Trải nghiệm đọc

- Danh sách bài cập nhật tự động qua API cùng domain của ứng dụng.
- Tìm kiếm theo tiêu đề, tóm tắt, nội dung và nguồn.
- Lọc theo tòa soạn.
- Bản đọc tập trung ngay trong ứng dụng.
- Điều chỉnh cỡ chữ.
- Nghe bài bằng Speech Synthesis của trình duyệt.
- Lưu bài trên thiết bị.
- Nút mở bài gốc và ghi nguồn rõ ràng.
- Cache 10 phút tại trình duyệt và cache server 5 phút để hạn chế gọi nguồn quá nhiều.
- Giao diện desktop, tablet, mobile và dark mode.

## Kỹ thuật

- API mới: `api/news-feed.js`
- Trang mới: `src/pages/NewsReader.jsx`
- Không yêu cầu Supabase migration.
- Không yêu cầu Environment Variable mới.
- Không yêu cầu API key trả phí.
- Không thay đổi Kho học liệu, Google Drive hoặc trình xem file V10.81.9.

## Kiểm tra

- Production build: thành công.
- Smoke tests: 109/109 passed.
