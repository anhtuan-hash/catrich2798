# Brian English Studio V11.3.6 — Launcher Gallery

## Phạm vi

Bản phát hành này chỉ điều chỉnh trang **Ứng dụng** và cấu hình launcher. Không thay đổi Supabase schema, quyền tài khoản, Kho học liệu hoặc Trung tâm công việc.

## Giao diện thẻ ứng dụng

- Các thẻ được đưa vào lưới đều hàng và đều cột.
- Chiều cao, khoảng cách, vùng tiêu đề, biểu tượng, mô tả và nút mở được chuẩn hóa.
- Desktop dùng 4 cột ở chế độ thoáng và 5 cột ở chế độ gọn.
- Tablet dùng 2–3 cột; điện thoại dùng 1 cột.
- Nội dung dài được giới hạn số dòng để không làm vỡ hàng.

## Tùy biến launcher

Admin mở **Ứng dụng → Tùy biến launcher** và chọn một trong hai kiểu:

### Launcher tròn

Tối đa sáu ứng dụng đã ghim được bố trí quanh tâm launcher. Mỗi biểu tượng mở trực tiếp ứng dụng tương ứng.

### Hộp nước

Các ứng dụng đã ghim nổi trong một hộp nước mềm mại, có sóng, bong bóng và chuyển động nhẹ. Thiết bị bật `prefers-reduced-motion` sẽ tự tắt chuyển động.

Kiểu launcher được lưu trong cấu hình launcher hiện có và đồng bộ qua `bes_launcher_settings`. Không cần migration mới vì dữ liệu được lưu trong cột JSON config.

## Tương thích

- Giữ nguyên ẩn ứng dụng theo Admin Vault.
- Giữ nguyên kéo thả, ghim, nhóm, mật độ và thanh điều hướng.
- Giữ nguyên âm báo, badge động và Work Hub V11.3.5.
- Không ghi đè font cá nhân, `.env` hoặc `.git`.
