# Brian English Studio V10.93.0 — Consolidated Release

V10.93.0 hợp nhất các bản V10.90.1, V10.91, V10.92 và V10.93 thành một lần nâng cấp duy nhất trên chính source V10.90.0-HF3 đã được cung cấp.

## Thành phần chính

- Runtime Core dùng trực tiếp Supabase client trong `src/utils/supabase.js`.
- Work Hub và Knowledge Hub chuyển thành React module native; không còn bridge/key-capture HF1–HF3.
- Brian AI Workspace cho dự án nhiều nguồn và lưu lịch sử.
- Teaching Content Factory tạo worksheet, activity, cloze, matching, flashcard và nội dung tương tác.
- Assessment Core gồm ngân hàng câu hỏi, blueprint, tạo đề, nhiều mã đề và xuất dữ liệu.
- Platform Control, version manifest, module registry và release metadata được nâng lên 10.93.0.

## Cài bản update-only

Giải nén gói cập nhật, sau đó chạy installer từ chính thư mục đã giải nén:

```bash
node ~/Downloads/brian-english-studio-v10.93.0-consolidated-update-only/install-v10.93.0.mjs \
  ~/brian-v10-81-3-deploy
```

Installer sao lưu các file bị thay thế trước khi chép payload và gỡ các bridge cũ.

## Supabase

Chạy lần lượt trong SQL Editor:

1. `supabase/brian_v10_93_preflight.sql`
2. `supabase/brian_v10_93_consolidated_migration.sql`
3. `supabase/brian_v10_93_verify.sql`

Migration là additive và chạy trong transaction. Tuy nhiên vẫn cần sao lưu database trước khi chạy trên Production.

## Kiểm tra

```bash
cd ~/brian-v10-81-3-deploy
npm run verify:v10.93
```

## Deploy

```bash
git add -A
git commit -m "Upgrade Brian English Studio to V10.93.0"
git push origin main
```

Khi Vercel báo Ready, đăng xuất/đăng nhập lại rồi nhấn `Command + Shift + R`.

## Rollback source

```bash
node ~/Downloads/brian-english-studio-v10.93.0-consolidated-update-only/rollback-v10.93.0.mjs \
  ~/brian-v10-81-3-deploy
```

Rollback source không tự hoàn tác database. Các bảng V10.93 mới có thể được giữ lại an toàn vì không thay thế dữ liệu cũ.

## Font cá nhân

Gói update-only không chạm vào thư mục font hiện có. Gói full-source không chứa file font; hãy giữ hoặc chép lại font cá nhân tại đường dẫn dự án đang sử dụng.
