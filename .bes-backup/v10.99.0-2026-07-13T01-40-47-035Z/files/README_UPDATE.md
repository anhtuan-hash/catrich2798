# Brian English Studio V10.98.0 — Collaboration & Data Governance

Cài từ V10.97.x.

1. Chạy installer update-only.
2. Chạy `supabase/brian_v10_98_preflight.sql` trong Supabase SQL Editor.
3. Chạy `supabase/brian_v10_98_collaboration_governance.sql`.
4. Chạy `supabase/brian_v10_98_verify.sql`.
5. Chạy `npm ci && npm run verify:v10.98`.
6. Commit và push nhánh `main`.

Route mới:

- `#/collaboration-hub`
- `#/data-governance`

Resource Library V10.98 dùng xóa mềm 30 ngày. File Google Drive không còn bị xóa ngay khi bấm Xóa tài liệu.
