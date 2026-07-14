# Brian English Studio V10.87.2 — AI Chat Expanded Layout

## Mục tiêu

Khắc phục tình trạng cửa sổ Brian AI quá hẹp, vùng nội dung bị bóp và ô nhập liệu thiếu không gian trên desktop.

## Thay đổi

- Khung chat mặc định rộng 480–590 px tùy kích thước màn hình.
- Chiều cao tối đa 86% viewport, không tràn khỏi màn hình.
- Thêm nút mở rộng/thu gọn ngay trên header; chế độ mở rộng đạt tối đa 760 px.
- Vùng tin nhắn được gán `flex: 1` và cuộn độc lập.
- Ô nhập tối thiểu 72 px, tự cuộn khi nội dung dài.
- Composer tối thiểu 102 px để các nút Tệp, Màn hình, Nói không ép ô nhập.
- Trên điện thoại dưới 680 px, chat chuyển thành toàn màn hình.
- Hộp khôi phục bản nháp được thu thành toast nhỏ, tránh che footer và nội dung.
- Kích thước chat được lưu trong `localStorage` bằng key riêng `bes-ai-chat-layout-v10872`.

## Cơ chế tương thích

Bản cập nhật dùng một lớp runtime an toàn:

1. Tự phát hiện cửa sổ có tiêu đề Brian AI và composer.
2. Chỉ gắn thuộc tính dữ liệu lên đúng cửa sổ đã phát hiện.
3. CSS chỉ tác động các phần tử có thuộc tính V10.87.2.
4. Không sửa lịch sử chat, provider AI, API key, draft hoặc dữ liệu Supabase.

## Không thay đổi

- Không thêm dependency.
- Không sửa `package-lock.json`.
- Không cần SQL.
- Không cần Environment Variable.
- Không ghi đè Command Center V10.87.1.
- Không thay đổi font cá nhân.
