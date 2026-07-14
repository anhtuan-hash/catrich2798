# V12.10.0 Test Report

## Kết quả

- Structural verifier: **22/22 PASS**
- Activity runtime tests: **10/10 PASS**
- Production build: **PASS**
- Vite modules transformed: **312**
- Smoke tests: **179/179 PASS**
- Department runtime — Admin: **PASS**
- Department runtime — TTCM: **PASS**
- Department runtime — Teacher: **PASS**
- Performance budget: **PASS**
- E2E contract checks: **5/5 PASS**
- Development server: **PASS**
- Local HTTP response: **200 OK**
- Served application version: **12.10.0**

## Hợp đồng đã kiểm tra

- Navigation dùng tám workspace từ registry chung.
- Workspace bị ẩn hoặc không có quyền không được hiển thị sai.
- Activity Center có sáu tab: overview, notifications, work, sync, history và AI.
- Hoạt động được giới hạn tối đa 120 mục theo tài khoản.
- localStorage, CustomEvent và BroadcastChannel có mặt.
- Autosave history được chuyển về Activity Center.
- Sync indicator hỗ trợ chế độ headless.
- Status notification launcher chuyển về Activity Center.
- Activity CSS được tải sau Workspace Core và trước Overlay Core.
- Brian Unified, Material 3 và Apple có adapter CSS.

## Cảnh báo

Build phát cảnh báo đường dẫn font cá nhân không có trong môi trường đóng gói. Đây là chủ ý: gói không phân phối font nhị phân. Khi cài vào dự án chính, cần giữ nguyên font hiện có.

Chưa chạy visual-regression bằng trình duyệt thật với tài khoản production. Cần kiểm tra trực quan một lần sau khi deploy lên Vercel.
