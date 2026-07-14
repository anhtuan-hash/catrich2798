# Brian English Studio V10.87.3 — AI Chat Composer Upgrade

## Mục tiêu

Khắc phục phần ô nhập liệu Brian AI vẫn quá thấp sau V10.87.2, đặc biệt khi thanh công cụ Tệp, Màn hình, Nói và nút gửi cùng chiếm không gian phía dưới.

## Thay đổi

- Ô nhập tối thiểu 104 px trên desktop và tối đa 220 px.
- Tự tăng chiều cao theo số dòng; chỉ bật thanh cuộn khi vượt giới hạn.
- Nút gửi được đặt bên trong góc dưới bên phải ô nhập.
- Composer tối thiểu 160 px và không bị co lại bởi vùng hội thoại.
- Thanh Tệp, Màn hình, Nói được thu gọn thành hàng chip 32 px.
- Toolbar Sao chép, Dùng kết quả, Hành động, Gửi sang và Nghe dùng ít chiều cao hơn.
- Dòng hướng dẫn Enter/Shift+Enter được thu nhỏ.
- Draft recovery toast giảm còn tối đa 360 px.
- Giữ nguyên panel rộng, chế độ mở rộng và mobile full-screen của V10.87.2.

## Cơ chế tương thích

Runtime chỉ gắn thuộc tính dữ liệu vào cửa sổ có tiêu đề Brian AI và composer. Không di chuyển node React và không chỉnh dữ liệu hội thoại. Autosize dùng sự kiện `input`, `change`, `focus` và tự tính lại khi resize.

## Không thay đổi

- Không thêm dependency.
- Không sửa `package-lock.json`.
- Không cần SQL.
- Không cần Environment Variable.
- Không thay lịch sử chat, bản nháp, provider, API key hoặc AI Governance.
- Không ghi đè font cá nhân.
