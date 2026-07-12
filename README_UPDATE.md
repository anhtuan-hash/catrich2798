# Brian English Studio V10.90.0-HF2
## Work Hub RPC Compatibility — update-only

### Lỗi được sửa

Trung tâm công việc hiển thị:

```text
client.rpc is not a function
```

V10.90.0-HF1 tạo Supabase Runtime Bridge để các module có thể dùng
PostgREST khi Supabase client gốc không được công khai. Bridge HF1 đã có
`from()` nhưng chưa có `rpc()`. Unified Work Hub nhìn thấy bridge như một
Supabase client rồi gọi các RPC:

- `work_hub_my_context`
- `work_hub_people`
- `work_hub_dashboard`
- `work_hub_transition_item`

Do bridge thiếu `rpc()`, trang dừng trước khi tải dữ liệu.

### Nội dung hotfix

- Bổ sung `rpc()` vào Supabase Runtime Bridge.
- RPC tự chuyển tới Supabase client gốc khi có.
- Nếu không có client gốc, RPC dùng PostgREST:
  `/rest/v1/rpc/<function>`.
- Work Hub chỉ nhận client có đủ `from()`, `auth.getSession()` và `rpc()`.
- Work Hub tự kết nối lại khi Runtime Bridge báo sẵn sàng.
- Đổi tên asset để tránh trình duyệt dùng cache cũ.
- Không thay đổi database, RLS hoặc dữ liệu.
- Không cần chạy lại SQL.
- Không thêm dependency và không sửa `package-lock.json`.

## Cài đặt

Tại repository V10.90.x:

```bash
git status
git add -A
git commit -m "Backup V10.90 before Work Hub RPC hotfix" || true
```

Chép gói:

```bash
rsync -av \
  ~/Downloads/brian-english-studio-v10.90.0-hf2-work-hub-rpc-compatibility-update-only/ \
  ./
```

Chạy installer:

```bash
node scripts/install-v10.90.0-hf2.mjs
```

Kiểm tra:

```bash
npm run verify:v10.90.0-hf2
```

Deploy:

```bash
git add -A
git commit -m "Fix Work Hub RPC compatibility V10.90.0-HF2"
git push origin main
```

Khi Vercel báo Ready:

1. Đăng xuất rồi đăng nhập lại.
2. Nhấn `Command + Shift + R`.
3. Mở `#/work-hub`.

## Kết quả đúng

- Không còn dòng `client.rpc is not a function`.
- Trạng thái kết nối chuyển sang đồng bộ hoặc polling.
- Admin/TTCM thấy danh sách giáo viên.
- Nhiệm vụ và dashboard được tải.
- Chuyển trạng thái công việc hoạt động.

Có thể kiểm tra trong Console:

```js
window.BESSupabaseBridge.report()
window.BES_WORK_HUB.report()
```

Bridge có thể báo `mode: "native"` hoặc `mode: "rest"`; cả hai đều hợp lệ.

## Rollback

```bash
npm run rollback:v10.90.0-hf2
npm run build
npm test
npm run test:department
```

Rollback chỉ khôi phục source; dữ liệu Work Hub được giữ nguyên.
