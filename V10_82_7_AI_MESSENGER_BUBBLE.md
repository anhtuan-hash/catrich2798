# V10.82.7 — Brian AI Messenger Bubble

## Mục tiêu

Thay khu vực AI hỗ trợ dạng drawer cũ bằng một bong bóng chat toàn hệ thống, có vị trí thu gọn ở góc dưới bên phải tương tự Facebook Messenger.

## Giao diện

- Bong bóng tròn cố định ở góc dưới bên phải.
- Chấm xanh biểu thị trợ lí đang hoạt động.
- Chấm đỏ xuất hiện cho đến lần mở đầu tiên.
- Hover hiển thị nhãn “Trò chuyện với Brian AI”.
- Khi mở, cửa sổ chat nổi có kích thước tối đa 410 × 650px.
- Điện thoại dùng cửa sổ gần toàn màn hình nhưng vẫn chừa lề 10px.
- Hỗ trợ giao diện sáng, tối và giảm chuyển động.
- Trình phát nhạc được dịch lên phía trên để không chồng lên bong bóng chat.

## Trò chuyện

- Gửi bằng Enter; Shift + Enter để xuống dòng.
- Hiển thị trạng thái AI đang nhập.
- Sao chép từng câu trả lời.
- Tạo cuộc trò chuyện mới.
- Mở nhanh trang cấu hình AI.
- Thu gọn bằng nút dấu trừ hoặc phím Escape.
- Có gợi ý câu hỏi nhanh theo từng trang.

## Nhận biết ngữ cảnh

Brian AI tự nhận biết:

- Trang hiện tại.
- Ứng dụng đang mở.
- Mô tả và nhiệm vụ chính của ứng dụng.
- Vai trò tài khoản đang đăng nhập.
- Ngôn ngữ giao diện.

Ví dụ tại Newsroom, trợ lí ưu tiên các tác vụ tóm tắt bài, giải thích từ vựng và tạo bài đọc. Tại không gian TTCM, trợ lí ưu tiên kế hoạch, thông báo, biên bản và báo cáo.

## Lưu lịch sử

- Lưu tối đa 60 tin nhắn gần nhất trong localStorage.
- Tách riêng lịch sử theo ID hoặc email tài khoản.
- Không lưu API key trong lịch sử chat.
- Có nút tạo cuộc trò chuyện mới để xóa luồng hiện tại.

## AI provider

Bong bóng chat dùng AI provider đã chọn trong trang Thiết lập. Cơ chế fallback giữa Gemini, OpenAI, OpenRouter, Groq, Mistral, Claude và endpoint tương thích OpenAI tiếp tục sử dụng hệ thống có sẵn.

Nếu chưa có API key, cửa sổ chat hiển thị cảnh báo và nút mở trang Thiết lập.

## Tệp thay đổi

- `src/components/UniversalAIAssist.jsx`
- `src/main.jsx`
- `src/index.css`
- `scripts/smoke-test.mjs`
- `package.json`
- `package-lock.json`

## Cơ sở dữ liệu

Không cần SQL Supabase mới và không cần Environment Variable mới.
