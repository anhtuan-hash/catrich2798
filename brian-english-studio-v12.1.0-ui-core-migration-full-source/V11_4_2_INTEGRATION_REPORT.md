# V11.4.2 Integration Report

## Baseline

- Source đầu vào: Brian English Studio V11.3.7 do người dùng cung cấp.
- Phương thức: merge trực tiếp trên source thật, không sử dụng route patch phỏng đoán.
- Phiên bản đầu ra: 11.4.2.

## Điểm tích hợp

### Route và điều hướng

- Route: `#/tool/english-lesson-integration`.
- Route được đăng ký trực tiếp trong `src/pages/ToolPage.jsx`.
- App được đăng ký trong `src/data/apps.js`.
- Design profile được đăng ký trong `src/data/designProfiles.js`.
- Lối tắt được ghim trên `src/pages/Home.jsx` mà không thay đổi cụm 12 thẻ Animated Home.

### Shell và xác thực

- Wrapper: `src/pages/EnglishLessonIntegrationStudio.jsx`.
- Dùng `currentUser`, ngôn ngữ, theme và phiên Supabase hiện tại của Brian.
- Module được mount trong Shadow DOM.
- Dữ liệu local được định danh theo tài khoản đang đăng nhập.

### Connected Workflow

- Adapter: `src/components/LessonIntegrationBridgeAdapter.jsx`.
- Runtime bridge: `public/bes-elis-v1142/bridge-runtime.js`.
- Payload được chuyển vào Transfer Inbox hiện hữu của Brian, không tự động ghi đè nội dung ứng dụng đích.

### AI và dữ liệu

- Server endpoint: `api/lesson-ai.mjs`.
- Hỗ trợ OpenAI/Gemini, xác thực Supabase JWT, origin allowlist, timeout, request size và rate limiting.
- Bảng mới: `public.bes_lesson_integration_projects`.
- RLS: chủ sở hữu CRUD; admin/TTCM/department leader đọc phục vụ chuyên môn.

### Cách ly hệ thống

- Không thêm service worker riêng.
- Không thêm dependency host mới.
- Module biên dịch sẵn và lazy-load từ `public/bes-elis-v1142/`.
- Animated Home V11.3.7 và bốn app mới được giữ nguyên.

## Release forms

- Full merged source: intended for replacing or creating the working repository. Private font and environment files are excluded.
- Native update-only installer: intended for applying the merge to the exact V11.3.7 repository supplied by the user while preserving existing private font and environment files.
