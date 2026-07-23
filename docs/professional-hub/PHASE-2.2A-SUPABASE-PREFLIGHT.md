# PHASE 2.2A — SUPABASE LINKED-PROJECT PREFLIGHT

## Mục tiêu

Kiểm tra an toàn trước khi áp dụng migration Hub Chuyên môn.

Phase này không chạy `db push` thật.

## Công cụ

- Supabase CLI: `2.109.1`
- Core migration: `supabase/migrations/20260723121044_professional_hub_core.sql`
- RLS hardening migration: `supabase/migrations/20260723132208_professional_hub_rls_hardening.sql`

## Kiểm tra đã hoàn thành

- [x] Supabase CLI nằm trong devDependencies.
- [x] Đã tạo `supabase/config.toml`.
- [x] Đã tạo `supabase/.gitignore`.
- [x] `supabase/.temp/project-ref` không được Git theo dõi.
- [x] Các secret dùng `env(...)`, không ghi literal.
- [x] Đã đọc migration history local/remote.
- [x] Đã chạy `db push --dry-run --linked`.
- [x] Đã chạy remote lint ở mức error.
- [x] Build toàn bộ Brian đã pass.
- [x] Không lưu token, password hoặc database URL vào báo cáo.

## Kết quả migration

- Migration history đọc được: `True`
- Dry-run hoàn tất: `True`
- Core timestamp xuất hiện trong dry-run: `True`
- Hardening timestamp xuất hiện trong dry-run: `True`
- Migration đã được áp dụng: `False`

## Kết quả remote lint

Remote schema hiện có `7` finding mức error ước tính.

Các hàm được báo lỗi:

- `public.submit_homeroom_portal_response`
- `public.get_homeroom_portal`
- `public.acknowledge_homeroom_notice`
- `public.bes_v1099_current_role`
- `public.bes_v1099_create_snapshot`
- `public.bes_v1099_restore_snapshot`
- `public.bes_v1133_is_leader`

Các thông báo lỗi:

- `function digest(text, unknown) does not exist`
- `column \`

SQLSTATE: `42883`, `42703`

Finding liên quan `professional_hub`: `False`

Các lỗi trên nằm trong schema remote hiện tại. Migration Hub Chuyên môn
chưa được áp dụng, và output không chứa tên `professional_hub`, nên chúng
được ghi nhận là lỗi tồn đọng ngoài phạm vi Phase 2.2A, không bị che giấu.

## Cổng triển khai

- [x] Không chạy `supabase db push`.
- [x] Không reset remote.
- [x] Không chạy seed.
- [x] Không tạo dữ liệu mẫu.
- [x] Không phát hiện lỗi lint mang tên `professional_hub`.
- [ ] Chưa sửa các hàm BES cũ đang bị remote lint báo lỗi.
- [ ] Chưa áp dụng migration Hub Chuyên môn.
- [ ] Chưa tạo Hub và membership thật.
- [ ] Chưa kiểm thử bằng TTCM/Giáo viên thật.
- [ ] Chưa nối giao diện.
- [ ] Chưa merge.
- [ ] Chưa deploy Production.
