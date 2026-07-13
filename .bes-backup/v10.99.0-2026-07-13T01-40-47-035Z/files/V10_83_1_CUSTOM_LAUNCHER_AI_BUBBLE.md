# Brian English Studio V10.83.1 — Custom Launcher & Brian AI Bubble

## 1. Launcher tùy biến dành cho Admin

Trang **Ứng dụng** có thêm chế độ **Tùy biến launcher** và chỉ tài khoản `admin` mới nhìn thấy bộ điều khiển này.

Admin có thể:

- Kéo thả các thẻ để đổi thứ tự hiển thị.
- Ghim hoặc bỏ ghim ứng dụng ở khu vực truy cập nhanh.
- Ẩn các ứng dụng ít dùng; ứng dụng bị ẩn không xuất hiện với người dùng ở launcher.
- Đưa route hoặc một ứng dụng cụ thể lên thanh điều hướng toàn hệ thống.
- Tạo tối đa 16 nhóm ứng dụng, đặt tên và màu nhận diện.
- Chuyển từng thẻ sang nhóm phù hợp.
- Khôi phục cấu hình mặc định.

Trang chủ và trang Ứng dụng luôn được giữ trên thanh điều hướng để tránh mất lối điều hướng. Thanh điều hướng hỗ trợ tối đa 12 mục.

Cấu hình được lưu theo mô hình cloud-first: Admin ghi vào bảng `bes_launcher_settings`, các tài khoản đã đăng nhập được đọc cấu hình, và Supabase Realtime cập nhật launcher trên các thiết bị đang mở. `localStorage` được giữ làm cache và phương án dự phòng khi mạng hoặc Supabase tạm thời không khả dụng.

## 2. Brian AI Messenger nâng cao

Bong bóng AI vẫn thu gọn ở góc dưới bên phải theo kiểu Messenger và được nâng cấp thành cửa sổ làm việc đa phương thức.

### Tệp và ảnh

- Kéo thả trực tiếp tối đa 5 tệp vào cửa sổ chat.
- Chọn file từ máy.
- Dán ảnh từ clipboard.
- Chụp một cửa sổ, tab hoặc màn hình bằng Screen Capture API.
- Hỗ trợ ảnh, PDF, DOCX, PPTX, XLSX/XLS, TXT, Markdown, CSV, JSON và HTML.
- Giới hạn 12 MB cho mỗi tệp.
- Nội dung tài liệu được đọc trên trình duyệt trước khi gửi vào prompt.
- Ảnh được gửi theo định dạng multimodal phù hợp với Gemini, OpenAI-compatible/OpenRouter và Claude.

### Nhận biết trang hiện tại

Mỗi yêu cầu có thể sử dụng:

- route và ứng dụng đang mở;
- tiêu đề trang;
- văn bản đang được bôi chọn;
- phần nội dung hiện nhìn thấy;
- dữ liệu trong các ô nhập, textarea và select đang hiển thị;
- file hoặc ảnh đính kèm.

Dữ liệu mật khẩu không được thu thập vào ngữ cảnh.

### Lịch sử hội thoại

- Lưu tối đa 20 cuộc trò chuyện theo từng tài khoản.
- Mỗi cuộc trò chuyện giữ 60 tin nhắn gần nhất.
- Tạo, mở lại và xóa từng cuộc trò chuyện.
- Tự chuyển lịch sử cũ của V10.82.7 sang cấu trúc mới.

### Dùng kết quả trong ứng dụng

Mỗi câu trả lời có nút **Dùng kết quả trong ứng dụng**.

- Worksheet Factory nhận kết quả trực tiếp vào vùng nguồn nội dung.
- Ở các ứng dụng khác, trợ lý ưu tiên điền vào ô văn bản phù hợp đang hiển thị.
- Khi ứng dụng chưa có bộ tiếp nhận riêng, kết quả được sao chép và lưu tạm trong `sessionStorage`.

Sự kiện tích hợp dành cho các ứng dụng mới:

```js
window.addEventListener('bes-ai-use-result', (event) => {
  const { text, toolSlug, markHandled } = event.detail || {};
  // Đưa text vào state của ứng dụng.
  markHandled?.();
});
```

### Chế độ giọng nói

- Nhập lệnh bằng Speech Recognition.
- Khi bật Voice Mode, hệ thống tự gửi sau khi nhận xong câu nói.
- Câu trả lời được đọc lại bằng Speech Synthesis.
- Có thể dừng đọc bất kỳ lúc nào.
- Speech Recognition phụ thuộc hỗ trợ của trình duyệt; Chrome và Edge thường hỗ trợ tốt hơn Safari/Firefox.

## 3. Tệp chính đã thay đổi

- `src/utils/launcherPreferences.js`
- `src/pages/WebApps.jsx`
- `src/components/GlobalFlatNavigation.jsx`
- `src/components/UniversalAIAssist.jsx`
- `src/utils/gemini.js`
- `src/pages/WorksheetFactory.jsx`
- `src/main.jsx`
- `src/index.css`
- `scripts/smoke-test.mjs`
- `supabase/launcher_settings_v10_83_1.sql`

## 4. Triển khai

Cần chạy một lần migration `supabase/launcher_settings_v10_83_1.sql` để bật cấu hình launcher toàn hệ thống và Realtime. Không cần Environment Variable mới. Brian AI tiếp tục sử dụng provider/API key đã lưu trong **Cài đặt**.

## 5. Kiểm tra

- Production build: thành công.
- Smoke tests: 147/147.
- Department runtime: Admin, TTCM và Giáo viên đều vượt qua.
