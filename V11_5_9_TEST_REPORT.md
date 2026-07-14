# V11.5.9 Test Report

## Baseline

- Nâng cấp từ Brian English Studio V11.5.8.
- Release: BURS Comfortable — Unified Readability.
- Không cần SQL migration.

## Kết quả

- BURS feature checks: 17/17 PASS.
- Typography audit: 32 CSS files, 0 declarations từ 1–12 px.
- Responsive layout contracts: PASS cho họ breakpoint 1440 / 1280 / 1024 / 768 / 390.
- Vite production build: PASS.
- Performance budget: PASS.
- Smoke tests: 179/179 PASS.
- Department runtime: Admin / TTCM / Teacher PASS.
- Connected Workflow contracts: 5/5 PASS.
- Release guard: PASS.
- Vercel Functions: 12/12.
- npm audit: 0 vulnerabilities.

## Ghi chú kiểm thử

Môi trường build không có Chromium executable khả dụng, vì vậy không có screenshot regression tự động. Bố cục được kiểm tra bằng source contract, media-query contract, production build và runtime bootstrap. Sau deploy cần xác nhận trực quan một vòng ở các kích thước mục tiêu.

## Kiểm tra gói phát hành

- Update-only cài trên V11.5.8 sạch: PASS.
- `npm ci` sau cài đặt: PASS.
- `verify:v11.5.9` trên source cài từ gói: PASS.
- Rollback về V11.5.8: PASS.
- Full-source ZIP cài sạch: PASS.
- Full-source `test:v11.5.9` và production build: PASS.
- Preview homepage: HTTP 200.
- Production JavaScript asset: HTTP 200, `text/javascript`.
- Gói phát hành không chứa `.env`, font cá nhân hoặc `node_modules`.
