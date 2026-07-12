# Brian English Studio V10.88.1
## Resource Library Access Sync Fix — update-only

Bản này sửa đồng thời hai lỗi:

1. Tài liệu Admin đã duyệt không hiện trong tài khoản giáo viên.
2. Tài liệu giáo viên gửi chờ duyệt không hiện trong tài khoản Admin/TTCM.

## Nguyên nhân đã xác định

Dự án đã đi qua hai schema khác nhau:

- V10.80 dùng `owner_id`, `owner_name`, `owner_email`.
- Các bản V10.81 dùng `uploader_id`, `uploader_name`, `uploader_email`.

Một số policy RLS cũ vẫn kiểm tra `owner_id`, trong khi UI/API mới ghi `uploader_id`. Ngoài ra, policy hiển thị tài liệu đã duyệt V10.81.7 chỉ có hiệu lực khi file SQL thực sự được chạy trong Supabase; việc file nằm trong thư mục dự án không tự thay đổi database.

Helper nhận diện Admin cũng có thể sai khi `profiles` dùng `user_id` thay vì `id`, hoặc frontend nhận Admin bằng email nhưng PostgreSQL chỉ kiểm tra `profiles.role`.

## Những gì migration sửa

- Bổ sung và đồng bộ hai bộ cột `owner_*` và `uploader_*`.
- Chuẩn hóa `status` và `visibility` cũ.
- Tài liệu đã duyệt được coi là tài liệu dùng chung của tổ.
- Viết lại `resource_is_leader()` để nhận diện:
  - role trong JWT;
  - role trong `profiles` với `id`, `user_id` hoặc `profile_id`;
  - các alias Admin/TTCM;
  - tài khoản Admin chính `anhtuan@pek.edu.vn`.
- Hỗ trợ cả schema Drive cũ `user_id` và schema mới `owner_user_id`.
- Tạo lại RLS cho đọc, tải lên, sửa, xóa và phê duyệt.
- Giáo viên thấy mọi tài liệu `approved` và tài liệu chờ duyệt của chính mình.
- Admin/TTCM thấy toàn bộ trạng thái, bao gồm `pending`.
- Bật Realtime cho `resource_items` nếu chưa có.
- Không xóa bản ghi và không xóa file Google Drive.

## Cài vào repository

```bash
git status
git add -A
git commit -m "Backup before V10.88.1 resource library fix" || true

rsync -av \
  ~/Downloads/brian-english-studio-v10.88.1-resource-library-access-sync-fix-update-only/ \
  ./

node scripts/install-v10.88.1.mjs
npm run test:resource-library-access
```

## Bước bắt buộc: chạy migration Supabase

Mở:

```text
Supabase → SQL Editor → New query
```

Dán toàn bộ nội dung file:

```text
supabase/resource_library_v10_88_1_access_sync_fix.sql
```

Bấm **Run** một lần. File an toàn khi chạy lại.

Chỉ copy file vào repository hoặc push Vercel là chưa đủ; RLS nằm trong database Supabase.

## Kiểm tra database ngay sau khi Run

Ở cuối migration, Supabase sẽ trả về:

- tổng số tài liệu theo `status` và `visibility`;
- 30 tài liệu mới nhất cùng người gửi.

Kiểm tra tài khoản Admin trong SQL Editor:

```sql
select id, email, role, approved
from public.profiles
where lower(email) = 'anhtuan@pek.edu.vn';
```

Nếu bảng không có cột `approved`, bỏ cột đó khỏi câu lệnh kiểm tra.

## Kiểm tra giao diện

1. Đăng xuất cả hai trình duyệt.
2. Đăng nhập lại Admin và giáo viên để làm mới JWT/session.
3. Tài khoản giáo viên mở Kho học liệu:
   - phải thấy các file Admin đã duyệt;
   - vẫn thấy file `abc` của mình ở trạng thái Chờ duyệt.
4. Tài khoản Admin mở Kho học liệu:
   - phải thấy file `abc` trong danh sách Chờ duyệt;
   - bấm Duyệt.
5. Trong cửa sổ giáo viên, file vừa duyệt phải tự chuyển sang Đã duyệt hoặc hiện sau khi tải lại.

## Build và deploy

Sau khi migration chạy thành công:

```bash
npm run verify:v10.88.1

git add -A
git commit -m "Fix cross-account resource visibility and approval workflow V10.88.1"
git push origin main
```

Khi Vercel báo Ready, tải lại bằng `Command + Shift + R`.

## Rollback source local

```bash
node scripts/rollback-v10.88.1.mjs
```

Rollback source không tự khôi phục policy Supabase. Migration không xóa dữ liệu, vì vậy thông thường không cần rollback database.
