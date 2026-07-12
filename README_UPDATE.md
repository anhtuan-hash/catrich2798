# Brian English Studio V10.90.0-HF1
## Supabase Runtime Bridge

### Lỗi được sửa

Kho học liệu thông minh hiển thị:

> Không tìm thấy Supabase client. Hãy mở lại sau khi ứng dụng đăng nhập hoàn tất.

Tài khoản vẫn đăng nhập bình thường và migration đã chạy, nhưng Smart Knowledge V10.90.0 chỉ tìm Supabase client qua các biến toàn cục như `window.supabaseClient`. Trong bản Brian English Studio hiện tại, Supabase client được Vite đóng bên trong module nên không xuất hiện trên `window`.

### Cách hotfix hoạt động

- Không thay đổi database và không cần chạy thêm SQL.
- Không thêm dependency.
- Nạp một runtime bridge trước Smart Knowledge.
- Ưu tiên dùng Supabase client gốc khi ứng dụng có công khai client.
- Nếu client gốc không được công khai, bridge:
  - đọc phiên đăng nhập từ khóa `sb-...-auth-token`;
  - lấy URL dự án từ project reference;
  - tái sử dụng cấu hình mà Work Hub đã phát hiện;
  - hoặc đọc public URL/anon key từ bundle Vite cùng origin;
  - truy cập Supabase qua REST với JWT hiện tại và RLS hiện có.
- Realtime không bị giả lập sai; nếu không có client gốc, Smart Knowledge tiếp tục dùng polling dự phòng đã có.
- Tự thử kết nối lại khi tab được focus, trình duyệt online, session thay đổi hoặc ứng dụng phát sự kiện đăng nhập.

## Cài đặt

Tại repository V10.90.x:

```bash
git status
git add -A
git commit -m "Backup V10.90 before Supabase bridge hotfix" || true

rsync -av \
  ~/Downloads/brian-english-studio-v10.90.0-hf1-supabase-runtime-bridge-update-only/ \
  ./

node scripts/install-v10.90.0-hf1.mjs
npm run verify:v10.90.0-hf1
```

Sau khi kiểm tra đạt:

```bash
git add -A
git commit -m "Fix Smart Knowledge Supabase runtime connection"
git push origin main
```

Khi Vercel báo Ready, đăng xuất và đăng nhập lại một lần, sau đó nhấn:

```text
Command + Shift + R
```

## Kiểm tra

Mở:

```text
#/knowledge-hub
```

Kết quả đúng:

- Không còn banner “Không tìm thấy Supabase client”.
- Bộ đếm tài liệu lớn hơn 0 nếu tài khoản có quyền đọc.
- Tài liệu từ `resource_items` xuất hiện.
- Yêu thích, gần đây, metadata và bộ sưu tập hoạt động.

Có thể mở DevTools Console và chạy:

```js
window.BESSupabaseBridge.report()
```

Trạng thái thường là:

```js
{
  mode: "native" // hoặc "rest"
  hasSession: true,
  hasConfig: true
}
```

`mode: "rest"` là bình thường: nó có nghĩa là ứng dụng không công khai Supabase client, nên bridge đang dùng REST an toàn với JWT và RLS hiện tại.

## Rollback

```bash
npm run rollback:v10.90.0-hf1
npm run build
npm test
npm run test:department
```
