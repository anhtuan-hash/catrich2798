# Brian English Studio V11.4.2 — AI Lesson Integration Studio

V11.4.2 được tích hợp trực tiếp trên source thật V11.3.7, giữ nguyên Animated Home và bổ sung **AI Lesson Integration Studio** dành riêng cho giáo án Tiếng Anh THPT.

## Mở ứng dụng

- Trang chủ: lối tắt ghim **Tích hợp AI vào giáo án Tiếng Anh**.
- Trang Ứng dụng/Launcher: tìm `AI Lesson Integration Studio`.
- Route trực tiếp: `/#/tool/english-lesson-integration`.

## Cài đặt

```bash
npm ci
npm run verify:v11.4.2
npm run dev
```

Trước khi sử dụng đồng bộ cloud, chạy SQL theo thứ tự:

1. `supabase/brian_v11_4_2_preflight.sql`
2. `supabase/brian_v11_4_2_lesson_integration.sql`
3. `supabase/brian_v11_4_2_verify.sql`

## AI phía server — OpenRouter only

Toàn bộ website gọi gateway xác thực `/api/ai`. API key không xuất hiện trong mã frontend hoặc trình duyệt.

```env
OPENROUTER_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Model và hạn mức dùng chung do Admin quản lý tại `/#/ai-governance`. Chạy migration `supabase/brian_v11_6_7_openrouter_gateway.sql`.

## Kiến trúc tích hợp

- Dùng chung phiên đăng nhập và Supabase client của Brian.
- Module chạy trong Shadow DOM để tránh xung đột CSS.
- Dữ liệu local tách theo `user.id`.
- Connected Workflow gửi nội dung sang Lesson Architect, Worksheet Factory, Exam Studio, Activity Studio, Speaking Studio, Reading Studio và WordGraph Studio.
- Không cài service worker riêng cho module.

## Lưu ý về font cá nhân

Gói phát hành không chứa font. Khi thay toàn bộ source, giữ lại thư mục font riêng từ repository hiện tại của bạn tại `public/fonts/`.
