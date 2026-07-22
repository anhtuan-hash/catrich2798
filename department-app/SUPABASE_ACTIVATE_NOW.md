# Kích hoạt Supabase ngay cho Tổ chuyên môn

Tài khoản TTCM được cấu hình sẵn: `anhtuanpek@gmail.com`.

Department ID cố định:

```text
00000000-0000-0000-0000-000000000001
```

## Trong Supabase SQL Editor

Chạy theo đúng thứ tự:

1. `supabase/department-schema.sql`
2. `supabase/department-bootstrap.sql`
3. `supabase/department-verify.sql`

Bootstrap sẽ:

- tạo hoặc cập nhật `Tổ Tiếng Anh` với mã `ENGLISH`;
- tìm tài khoản `anhtuanpek@gmail.com` trong `auth.users`;
- gán tài khoản này vai trò `department_head`;
- không tạo bản ghi thành viên trùng khi chạy lại.

Kết quả verify phải có:

- các kiểm tra bảng/RPC/bucket đều là `true`;
- `department_id = 00000000-0000-0000-0000-000000000001`;
- `role = department_head`;
- `email = anhtuanpek@gmail.com`;
- `membership_active = true`.

## Trên máy Mac

Sau khi ba file SQL đã chạy thành công:

```bash
cd ~/Documents/Brian-Department-Workspace
git pull origin feature/department-standalone-microfrontend
cd department-app
npm run cloud:enable
npm run build
npm run dev
```

Script `cloud:enable` chỉ bật cloud khi `.env.local` hoặc environment đã có cả:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Script không in anon key ra Terminal và tự đặt quyền file `.env.local` về `0600`.

Khi thành công, giao diện hiển thị `TTCM · Supabase`.

## Không dùng

- Không dùng `service_role` ở frontend.
- Không commit `.env.local`.
- Không gửi access token hoặc anon key qua ảnh chụp màn hình.
