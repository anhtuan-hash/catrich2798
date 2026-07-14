# Brian English Studio V10.83.0 — Worksheet Factory

## Mục tiêu

Worksheet Factory biến tài liệu nguồn hoặc một chủ đề thành phiếu học tập có thể biên tập, có bản học sinh, bản giáo viên, đáp án, giải thích, kiểm tra chất lượng và nhiều định dạng xuất.

## Vị trí

- Trang **Ứng dụng** → **Worksheet Factory**
- Route: `#/tool/worksheet-factory`
- Quyền động: `tool:worksheet-factory`

## Nguồn đầu vào

- Dán văn bản hoặc danh sách từ.
- Nhập chủ đề/yêu cầu để AI tự tạo nội dung.
- PDF.
- DOCX.
- PPTX.
- XLSX/XLS.
- TXT, Markdown, CSV, JSON và HTML.

Tài liệu được trích xuất chữ ngay trên trình duyệt. Ứng dụng giới hạn nội dung gửi AI để tránh yêu cầu quá lớn.

## 11 dạng bài

1. Multiple Choice
2. Gap Filling
3. Matching
4. Word Formation
5. Error Correction
6. Cloze Text
7. Reading Comprehension
8. True / False
9. Sentence Transformation
10. Vocabulary in Context
11. Ordering

## Quy trình bốn bước

1. **Nguồn:** tải file, dán văn bản hoặc nhập chủ đề.
2. **Cấu hình:** chọn preset, CEFR, đối tượng, dạng bài, số câu và yêu cầu riêng.
3. **Tạo phiếu:** dùng AI provider của tài khoản; nếu chưa có AI hoặc AI lỗi, app tạo bản nháp offline để giáo viên tiếp tục.
4. **Biên tập & xuất:** sửa trực tiếp mọi hoạt động, câu hỏi, phương án, đáp án và giải thích.

## Kiểm tra chất lượng

- Phát hiện câu trùng chính xác.
- Phát hiện câu gần trùng theo độ giống content words.
- Phát hiện câu thiếu đáp án.
- Kiểm tra MCQ thiếu phương án, phương án lặp hoặc đáp án không nằm trong phương án.
- Chấm điểm chất lượng 0–100.

## Xuất bản

- Word `.docx` thật, khổ A4.
- In hoặc Save as PDF qua trình duyệt.
- HTML dùng offline.
- JSON có cấu trúc.
- Sao chép văn bản.
- Bản học sinh hoặc bản giáo viên.

## Tích hợp hệ thống

- Lưu toàn bộ worksheet vào Thư viện cá nhân.
- Đưa câu MCQ/True-False/Reading MCQ vào Ngân hàng câu hỏi.
- Lịch sử và bản nháp được lưu theo tài khoản.
- Brian AI Messenger tự nhận biết người dùng đang ở Worksheet Factory.

## Tệp thay đổi chính

- `src/pages/WorksheetFactory.jsx`
- `src/pages/WorksheetFactory.css`
- `src/utils/worksheetFactory.js`
- `src/pages/ToolPage.jsx`
- `src/data/apps.js`
- `src/data/designProfiles.js`
- `src/components/FlatAppIcon.jsx`
- `src/pages/WebApps.jsx`
- `scripts/smoke-test.mjs`
- `package.json`
- `package-lock.json`

## Cơ sở dữ liệu

Không cần chạy SQL Supabase mới. Worksheet sử dụng Thư viện và Ngân hàng câu hỏi hiện có.
