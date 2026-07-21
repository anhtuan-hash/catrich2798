BRIAN ENGLISH STUDIO V12.40.9 — STABILITY & SPEED

Giữ nguyên giao diện:
- Trang chủ Avocado Raised #B2C248.
- Đủ ba tầng trạng thái, điều hướng và ứng dụng gần đây.
- Không đổi bố cục, màu nhận diện hoặc chức năng đã duyệt.

Tăng tốc website:
- CSS khởi động giảm từ khoảng 1,24 MB xuống 1,06 MB.
- CSS Ứng dụng, Cài đặt, Quản trị và Tổ chuyên môn chỉ tải khi mở đúng trang.
- Không còn tải trước mã Admin, Tổ chuyên môn, PDF và công cụ tài liệu ở trang đầu.
- Tổng JavaScript khởi động sau build: khoảng 735 KB thô / 219 KB gzip.
- Tiện ích nền tải theo hai giai đoạn để trang chính xuất hiện trước.
- Tự tải trước trang khi người dùng đưa chuột hoặc bàn phím tới liên kết.
- Giảm hiệu ứng xử lý GPU không cần thiết trên ba tầng cố định.

Tăng tốc và ổn định AI:
- Fast Free mở rộng sang hội thoại streaming, không chỉ nội dung JSON.
- Tự chọn model :free có độ trễ thấp từ danh mục OpenRouter.
- Tự chuyển về openrouter/free nếu model streaming ưu tiên lỗi trước token đầu tiên.
- Làm nóng tuyến văn bản và JSON sau khi đăng nhập.
- Cache trạng thái gateway 2 phút và token đăng nhập 20 giây.
- Ghi nhận thời gian tới token đầu tiên để chẩn đoán tốc độ.
- Không tự sử dụng model trả phí.

Cài đặt:
1. Đặt ZIP và CAI-V12.40.9.command trong Downloads.
2. Không giải nén ZIP.
3. Chạy: bash "$HOME/Downloads/CAI-V12.40.9.command"
