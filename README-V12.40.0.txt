BRIAN ENGLISH STUDIO V12.40.0 — OPENROUTER PRODUCTION RUNTIME

Mục tiêu
- Chỉ dùng OpenRouter nhưng không còn gọi API trực tiếp từ trình duyệt.
- Một OPENROUTER_API_KEY đặt trên Vercel phục vụ toàn website.
- Định tuyến model theo loại nhiệm vụ, streaming cho tác vụ văn bản, structured JSON cho tác vụ dữ liệu.
- Giảm lỗi do retry chồng tầng, timeout ngắn, token cap thấp và circuit breaker toàn provider.

Bắt buộc sau khi cài code
1. Vercel → Project → Settings → Environment Variables.
2. Thêm OPENROUTER_API_KEY cho Production, Preview và Development.
3. Redeploy bản mới nhất.
4. Mở Cài đặt → OpenRouter Production Gateway → Kiểm tra gateway thật.

Biến môi trường tùy chọn
OPENROUTER_MODEL=openrouter/auto
OPENROUTER_MODEL_FAST=openrouter/auto
OPENROUTER_MODEL_STANDARD=openrouter/auto
OPENROUTER_MODEL_QUALITY=openrouter/auto
OPENROUTER_MODEL_JSON=openrouter/auto
OPENROUTER_MODEL_LONG=openrouter/auto
OPENROUTER_MODEL_VISION=openrouter/auto
OPENROUTER_IMAGE_MODEL=bytedance-seed/seedream-4.5
OPENROUTER_DATA_COLLECTION=deny
AI_AUTH_MODE=supabase

Không đặt OPENROUTER_API_KEY trong VITE_*, localStorage hoặc source code.
Không cần chạy SQL mới.
