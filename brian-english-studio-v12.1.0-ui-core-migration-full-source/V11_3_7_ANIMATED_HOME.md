# Brian English Studio V11.3.7 — Animated Home App Constellation

## Phạm vi

Bản này chỉ nâng cấp trang chủ và bổ sung bốn thẻ ứng dụng tiếng Anh. Không thay đổi Supabase schema, quyền tài khoản, dữ liệu Work Hub hoặc cấu hình launcher.

## Cụm thẻ chuyển động

Trang chủ sử dụng một scene có chiều sâu với 12 thẻ:

1. Lesson Architect
2. Exam Studio
3. TextCare Fixer
4. Speaking Studio
5. Reading Studio
6. WordGraph Studio
7. Worksheet Factory
8. Game Hub
9. Listening Lab
10. Grammar Builder
11. Writing Studio
12. Pronunciation Coach

Lesson Architect là thẻ trung tâm. Các thẻ còn lại chuyển động nhẹ theo nhiều quỹ đạo khác nhau để tạo cảm giác nổi, trôi và xoay quanh trung tâm.

## Tương tác

- Di chuyển chuột trong vùng hero để tạo parallax theo độ sâu của từng thẻ.
- Hover hoặc focus sẽ tạm dừng chuyển động của thẻ đang chọn và đưa thẻ lên lớp trên cùng.
- Nhấn vào thẻ để mở đúng ứng dụng.
- Thẻ bị Admin ẩn vẫn không xuất hiện trên trang chủ.

## Hiệu suất và khả năng tiếp cận

- Motion Full: chuyển động đầy đủ.
- Motion Lite: chuyển động chậm và nhẹ hơn.
- Motion Off: tắt animation và parallax.
- `prefers-reduced-motion: reduce`: tự tắt chuyển động.
- Tablet và điện thoại: tự chuyển sang lưới tĩnh 2 cột hoặc 1 cột.

## Ứng dụng mới

Bốn ứng dụng mới được thêm vào App Directory và hệ thống quyền:

- Listening Lab
- Grammar Builder
- Writing Studio
- Pronunciation Coach

Các ứng dụng này sử dụng khung AI Tool hiện có, do đó không cần dependency hoặc migration mới.
