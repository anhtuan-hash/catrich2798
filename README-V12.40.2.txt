BRIAN ENGLISH STUDIO V12.40.2 — OPENROUTER FREE-FIRST RECOVERY

Mục tiêu
- Khôi phục tính năng tạo nội dung AI khi tài khoản OpenRouter không còn đủ credit cho openrouter/auto.
- Giữ nguyên giao diện, ứng dụng, quyền người dùng, Supabase/Firebase và các chức năng hiện có.
- Chỉ sử dụng OpenRouter; mặc định không gọi model trả phí.

Cấu hình Vercel bắt buộc
1. Mở Vercel → Project Settings → Environment Variables.
2. Đặt OPENROUTER_API_KEY cho Production (và Preview nếu bạn dùng Preview).
3. Redeploy dự án sau khi thay đổi biến môi trường.

Chế độ mặc định
- Website gửi tác vụ văn bản tới openrouter/free.
- OPENROUTER_BILLING_MODE cũ sẽ không tự bật model trả phí.
- Muốn chủ động cho phép auto/paid, máy chủ phải có đồng thời:
  OPENROUTER_BILLING_MODE=auto hoặc paid
  OPENROUTER_ALLOW_PAID_MODE=true

Lưu ý về gói miễn phí
- Tuyến miễn phí có quota và giới hạn tốc độ do OpenRouter áp dụng.
- Model được chọn có thể thay đổi giữa các lần gọi.
- Nếu báo không có model phù hợp, hãy kiểm tra Privacy Settings của tài khoản OpenRouter; website không tự nới cài đặt riêng tư ở cấp tài khoản.
- Nút “Kiểm tra gateway thật” trong Settings chỉ dùng một yêu cầu nhỏ để tiết kiệm quota.

Bảo mật
- Không đặt API key trong biến VITE_*, source code hoặc localStorage.
- API key chỉ nằm trong OPENROUTER_API_KEY ở phía máy chủ Vercel.

Kiểm thử bản sửa
- npm run test:v12.40.2
- npm run build
- npm test
- npm run test:department
