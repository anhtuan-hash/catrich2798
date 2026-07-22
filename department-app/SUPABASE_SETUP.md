# Kích hoạt Supabase cho ứng dụng Tổ chuyên môn

Bản hiện tại hoạt động theo hai chế độ:

- **Cục bộ:** mặc định, kể cả khi Brian đã có sẵn `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. Dữ liệu tiếp tục lưu bằng `localStorage`.
- **Supabase:** chỉ bật khi có đủ cấu hình và `VITE_DEPARTMENT_CLOUD_ENABLED=true`.

Cơ chế bật có chủ đích giúp bản Tổ chuyên môn không tự chuyển sang chế độ cloud trước khi migration, thành viên và phiên đăng nhập đã sẵn sàng.

## 1. Tạo cấu trúc dữ liệu

Mở Supabase Dashboard → **SQL Editor**, dán và chạy toàn bộ nội dung:

```text
supabase/department-schema.sql
```

Migration tạo:

- `public.departments`
- `public.department_members`
- `public.department_entities`
- hàm `department_replace_collection(...)`
- Row Level Security cho TTCM và giáo viên
- bucket riêng tư `department-files`

## 2. Tạo Tổ Tiếng Anh

Chạy trong SQL Editor:

```sql
insert into public.departments (name, code)
values ('Tổ Tiếng Anh', 'ENGLISH')
returning id;
```

Sao chép UUID được trả về. Đây là `VITE_DEPARTMENT_ID`.

## 3. Lấy UUID tài khoản TTCM

Vào **Authentication → Users**, tìm tài khoản Brian của TTCM và sao chép `User UID`.

Gán quyền TTCM:

```sql
insert into public.department_members (
  department_id,
  user_id,
  role,
  display_name,
  email
)
values (
  '<DEPARTMENT_UUID>',
  '<AUTH_USER_UUID>',
  'department_head',
  'Nguyễn Anh Tuấn',
  '<EMAIL_TAI_KHOAN>'
);
```

## 4. Gán quyền giáo viên

Mỗi giáo viên cần có tài khoản trong Supabase Authentication. Thêm giáo viên bằng:

```sql
insert into public.department_members (
  department_id,
  user_id,
  role,
  display_name,
  email
)
values (
  '<DEPARTMENT_UUID>',
  '<TEACHER_AUTH_USER_UUID>',
  'teacher',
  '<TEN_GIAO_VIEN>',
  '<EMAIL_GIAO_VIEN>'
);
```

Quyền hiện tại:

| Vai trò | Đọc dữ liệu | Tạo/sửa/xóa | Duyệt/xác minh | Đồng bộ collection |
|---|---:|---:|---:|---:|
| `admin` | Có | Có | Có | Có |
| `department_head` | Có | Có | Có | Có |
| `teacher` | Có | Chưa bật | Không | Không |
| `viewer` | Có | Không | Không | Không |

Giai đoạn đầu đặt giáo viên ở chế độ chỉ xem để tránh ghi đè collection của toàn tổ. Quyền nộp hồ sơ và minh chứng cá nhân sẽ được mở theo từng bản ghi ở giai đoạn kế tiếp.

## 5. Cấu hình biến môi trường

Sao chép `.env.example` thành `.env.local`:

```bash
cp .env.example .env.local
```

Trong lúc vẫn kiểm tra bản local, giữ:

```env
VITE_DEPARTMENT_CLOUD_ENABLED=false
```

Sau khi migration, Tổ Tiếng Anh và thành viên đã được tạo đầy đủ, điền:

```env
VITE_DEPARTMENT_CLOUD_ENABLED=true
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_DEPARTMENT_ID=<DEPARTMENT_UUID>
```

Cả bốn giá trị đều bắt buộc để bật cloud. Chỉ dùng **anon key** ở frontend. Không dùng `service_role` key.

## 6. Phiên đăng nhập

Ứng dụng tìm phiên đăng nhập theo thứ tự:

1. `window.__BRIAN_SUPABASE_SESSION__`
2. `brian-department-session`
3. `brian-supabase-session`
4. khóa chuẩn `sb-<project-ref>-auth-token` của Supabase
5. `VITE_DEPARTMENT_DEV_ACCESS_TOKEN` — chỉ dành cho localhost

Khi ứng dụng được tích hợp cùng origin với Brian, nó sẽ tự dùng phiên Supabase hiện có.

## 7. Kiểm tra bản local trước khi bật cloud

```bash
rm -rf dist test-results playwright-report
npm run build
npm run test:e2e
npm run dev
```

Kết quả Playwright cần là:

```text
15 passed
```

Góc trái phía dưới phải hiển thị:

```text
TTCM · Cục bộ
```

## 8. Kiểm tra sau khi bật cloud

Đổi:

```env
VITE_DEPARTMENT_CLOUD_ENABLED=true
```

Sau đó khởi động lại hoàn toàn:

```bash
rm -rf dist
npm run build
npm run dev
```

Các trạng thái có thể xuất hiện:

- `TTCM · Supabase`: đã kết nối và có quyền quản trị.
- `Giáo viên · Supabase`: đã kết nối, chế độ chỉ xem.
- `TTCM · Cục bộ`: cloud chưa bật hoặc chưa đủ bốn biến cấu hình.
- `Chưa đăng nhập · Chỉ xem`: cloud đã bật nhưng chưa nhận được phiên Brian.
- `Chưa được cấp quyền · Chỉ xem`: tài khoản chưa có trong `department_members`.

## 9. Không đưa bí mật lên GitHub

Không commit các tệp sau:

```text
.env
.env.local
.env.*.local
```

Không lưu `service_role` key hoặc access token thật trong mã nguồn, issue, PR hoặc ảnh chụp màn hình.
