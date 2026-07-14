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

## AI phía server

Endpoint: `/api/lesson-ai`

OpenAI:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=...
AI_AUTH_MODE=supabase
```

Hoặc Gemini:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=...
AI_AUTH_MODE=supabase
```

Không có API key, ứng dụng vẫn hoạt động bằng bộ máy quy tắc nội bộ.

## Kiến trúc tích hợp

- Dùng chung phiên đăng nhập và Supabase client của Brian.
- Module chạy trong Shadow DOM để tránh xung đột CSS.
- Dữ liệu local tách theo `user.id`.
- Connected Workflow gửi nội dung sang Lesson Architect, Worksheet Factory, Exam Studio, Activity Studio, Speaking Studio, Reading Studio và WordGraph Studio.
- Không cài service worker riêng cho module.

## Lưu ý về font cá nhân

Gói phát hành không chứa font. Khi thay toàn bộ source, giữ lại thư mục font riêng từ repository hiện tại của bạn tại `public/fonts/`.
