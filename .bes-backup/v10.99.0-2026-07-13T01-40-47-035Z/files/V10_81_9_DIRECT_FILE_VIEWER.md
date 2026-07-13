# Brian English Studio V10.81.9

## Trình xem file trực tiếp trong Kho học liệu

### Định dạng được hỗ trợ

- **PDF**: mở trực tiếp trong iframe PDF của trình duyệt.
- **DOCX**: chuyển đổi và dựng trang Word ngay trong app bằng Mammoth; hình ảnh nhúng được giữ lại.
- **XLSX / XLS**: hiển thị từng sheet, bảng cuộn ngang/dọc và phân trang 100 dòng.
- **PPTX**: dựng slide trực tiếp từ cấu trúc Open XML, gồm chữ, hình ảnh và hình khối cơ bản; có danh sách slide, nút trước/sau và zoom.
- **MP4 / video**: phát trực tiếp trong app, hỗ trợ byte range để tua video.
- **MP3 / audio**: phát trực tiếp trong app, hỗ trợ byte range để tua âm thanh.
- Ảnh và file văn bản tiếp tục được mở trong trình xem chung.

### Bảo mật

- File gốc vẫn nằm trong Google Drive của TTCM/Admin.
- Giáo viên không cần được chia sẻ quyền trực tiếp trên Google Drive.
- App tạo liên kết xem ngắn hạn 15 phút, ký bằng bí mật máy chủ hiện có.
- API kiểm tra lại người dùng, trạng thái duyệt và quyền xem trước khi phát file.
- DOCX, XLSX và PPTX được dựng trong trình duyệt sau khi tải qua API có xác thực; không gửi file sang dịch vụ Office bên ngoài.
- DOCX được hiển thị trong iframe sandbox.

### Hiệu năng

- PDF, MP4, MP3 và ảnh dùng phiên xem có chữ ký thay vì tải toàn bộ file thành Blob.
- API hỗ trợ `Range`, `Content-Range` và `Accept-Ranges`, giúp video/audio có thể phát và tua.
- Excel chỉ render sheet và trang đang xem; mỗi trang 100 dòng, tối đa 60 cột trên màn hình.
- PowerPoint chỉ dựng slide đang chọn cùng thumbnail nhẹ.

### Giới hạn PowerPoint

PPTX được dựng trực tiếp bằng Open XML, vì vậy chữ, hình ảnh và hình khối cơ bản được hiển thị. Các thành phần sau có thể khác file gốc hoặc chỉ hiển thị dạng nội dung đơn giản:

- animation và transition;
- SmartArt;
- chart nhúng;
- video/audio nhúng trong slide;
- font không có trên thiết bị;
- hiệu ứng 3D hoặc shape phức tạp.

### File thay đổi

- `src/pages/ResourceLibrary.jsx`
- `src/features/resource-library/ResourceFileViewer.jsx`
- `src/features/resource-library/resourceLibraryCategories.css`
- `src/features/resource-library/index.js`
- `api/google-drive-file.js`
- `api/google-drive-preview-session.js`
- `api/_resourcePreviewToken.js`
- `package.json`
- `package-lock.json`
- `scripts/smoke-test.mjs`
- `src/pages/WordGraphStudio.jsx` — giữ lại lỗi trắng trang đã sửa ở V10.81.8.

### Kiểm tra

- `npm run build`: thành công.
- `npm test`: **103 smoke checks passed**.
- API preview token: ký và xác minh thành công.
- Không cần chạy thêm SQL Supabase.
