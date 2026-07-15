# Brian English Studio V12.34.0 — Unified AI Core Phase 3

## Nội dung chính

- Hợp nhất xử lý ảnh và vision vào `src/utils/aiMedia.js`.
- SmartID không còn tự gọi Gemini trực tiếp trong trang ứng dụng.
- Privacy Filter, Governance, Smart Routing, audit và provenance được áp dụng cho tác vụ vision/hình ảnh.
- `/api/ai` và Lesson AI dùng chung `server/unifiedAiProviderAdapter.js`.
- Chuẩn gateway mới: `bes-ai-core/1.0`.
- Metadata phản hồi xác định rõ `browser-direct`, `browser-unified` hoặc `server-gateway`.
- Không cần chạy SQL.

## Kiểm tra

```bash
npm run verify:v12.34.0
```

Lệnh trên chạy kiểm tra Phase 3, build production, 188 smoke checks và runtime Admin/TTCM/Teacher.
