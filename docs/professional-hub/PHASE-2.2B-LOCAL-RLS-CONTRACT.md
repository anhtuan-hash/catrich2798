# PHASE 2.2B — LOCAL MIGRATION AND RLS CONTRACT

## Mục tiêu

Dựng Supabase local trong thư mục tạm, áp toàn bộ migration từ đầu và
kiểm tra hợp đồng cấu trúc/RLS của Hub Chuyên môn bằng pgTAP.

## Cách phát hiện đối tượng

Bộ kiểm thử không phân tích câu lệnh `CREATE TABLE` bằng regex.
Sau khi migration được áp, PostgreSQL catalog là nguồn sự thật và tự
phát hiện:

- các bảng trong schema `professional_hub`; hoặc
- các bảng trong `public` có tên bắt đầu bằng `professional_hub`.

Số lượng từ verifier tĩnh chỉ là mức tối thiểu. Nếu migration hardening
bổ sung thêm bảng hợp lệ, runtime catalog có thể lớn hơn verifier mà
không phải lỗi.

## Kết quả

- Supabase CLI: `2.109.1`
- Core migration: `supabase/migrations/20260723121044_professional_hub_core.sql`
- Hardening migration: `supabase/migrations/20260723132208_professional_hub_rls_hardening.sql`
- Số bảng theo verifier: `9`
- Số khai báo RLS theo verifier: `9`
- pgTAP Result PASS: `True`
- Local lint có finding mang tên `professional_hub`:
  `False`
- Build Brian: `PASS`

## Hợp đồng đã kiểm tra

- [x] Runtime catalog có ít nhất số bảng theo verifier tĩnh.
- [x] Mọi bảng Hub phát hiện ở runtime đều bật RLS.
- [x] Mọi bảng Hub đều có ít nhất một policy.
- [x] Vai trò `anon` và `authenticated` không thể bypass RLS.
- [x] Không có policy mở bằng biểu thức `TRUE` thuần túy.
- [x] Có audit log.
- [x] Có các hàm nghiệp vụ Hub.
- [x] Anon/PUBLIC không được EXECUTE hàm `SECURITY DEFINER` của Hub.
- [x] Mọi hàm `SECURITY DEFINER` đều khóa `search_path`.

Quyền DML cấp cho vai trò API không tự động là lỗ hổng: PostgREST cần
quyền bảng và RLS mới là lớp quyết định bản ghi nào được phép truy cập.
Báo cáo pgTAP vẫn liệt kê các grant này để kiểm toán, nhưng không nhầm
chúng với quyền bypass RLS.

## Lỗi legacy ngoài phạm vi Hub

- Không có.

## Phạm vi an toàn

- [x] Chỉ dùng database local.
- [x] Không dùng dữ liệu Production.
- [x] Không chạy remote `db push`.
- [x] Không chạy remote reset.
- [x] Không chạy seed.
- [x] Local project được xóa sau kiểm thử.
- [x] Không lưu key, token hoặc database URL.

## Cổng tiếp theo

- [x] Migration dựng lại được trên local.
- [x] pgTAP contract test pass.
- [x] Build Brian pass.
- [ ] Chưa áp migration lên Supabase remote.
- [ ] Chưa tạo membership thật.
- [ ] Chưa kiểm thử persona TTCM/Giáo viên.
- [ ] Chưa nối giao diện với dữ liệu.
- [ ] Chưa merge.
- [ ] Chưa deploy Production.
