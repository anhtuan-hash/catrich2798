# Brian English Studio V10.90.0-HF3

## Supabase Key Capture & Cache Repair

Hotfix này sửa lỗi `Invalid API key` trong Unified Work Hub.

### Nguyên nhân

HF1/HF2 có nhánh fallback dùng access token của người dùng làm header `apikey` khi
không tìm thấy publishable/anon key. Supabase chấp nhận access token ở
`Authorization`, nhưng không chấp nhận nó như một API key, nên trả về
`Invalid API key`.

### Cách sửa

- Chèn Key Capture trước Vite main module.
- Bắt public `apikey` từ request Supabase hợp lệ của ứng dụng chính.
- Chỉ chấp nhận `sb_publishable_...` hoặc JWT có `role=anon`.
- Không bao giờ dùng access token làm `apikey`.
- Xóa cache HF1/HF2 sai.
- Khi gặp 401 `Invalid API key`, tự làm sạch cache, bắt lại key và thử lại một lần.
- Không cần SQL, dependency hoặc Environment Variable mới.

## Cài đặt

```bash
rsync -av ~/Downloads/brian-english-studio-v10.90.0-hf3-supabase-key-capture-update-only/ ./
node scripts/install-v10.90.0-hf3.mjs
npm run verify:v10.90.0-hf3
```

Sau khi đạt:

```bash
git add -A
git commit -m "Fix Supabase public key discovery V10.90.0-HF3"
git push origin main
```

Khi Vercel Ready, đóng toàn bộ tab Brian English Studio, mở lại, đăng nhập và
nhấn `Command + Shift + R`.

## Kiểm tra Console

```js
window.BESSupabaseKeyCapture.report()
window.BESSupabaseBridge.report()
```

Kết quả đúng cần có:

- `captured: true`
- `keyType: "publishable"` hoặc `"anon-jwt"`
- `hasConfig: true`
- `lastError: ""`

Không hiển thị giá trị key trong report.
