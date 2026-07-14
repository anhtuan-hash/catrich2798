# Brian English Studio V10.88.0-HF2

## AI Launcher Slot Restore

Hotfix xử lý tình trạng sau khi đóng Brian AI, góc phải dưới vẫn hiển thị nút nhạc nổi trong khi bong bóng chat không trở lại.

### Cơ chế sửa

1. Chỉ nhận diện điều khiển âm nhạc có kích thước nhỏ, `position: fixed` và nằm trong vùng góc phải dưới.
2. Không đụng đến công tắc **Nhạc nền** trên thanh điều hướng phía trên.
3. Tìm launcher Brian AI gốc bằng `aria-label`, `title`, id/class và ngữ nghĩa `Brian AI`, `chat`, `assistant`, `launcher`.
4. Đưa launcher gốc về một slot cố định cách cạnh phải và cạnh dưới 18 px.
5. Nếu launcher gốc không tồn tại trong DOM, tạo bong bóng chat dự phòng bằng SVG.
6. Khi bấm bong bóng dự phòng, hotfix ưu tiên kích hoạt launcher gốc hoặc nút **AI sẵn sàng**, sau đó phát sự kiện mở Brian AI.
7. Khi AI Chat phát sự kiện đóng, launcher tự hiện lại đúng vị trí.
8. MutationObserver tiếp tục áp dụng sau khi đổi route hoặc React render lại component.

### Phạm vi không bị tác động

- Công tắc Nhạc nền trên top bar
- Âm báo và đồng bộ live
- Lịch sử chat và draft
- Provider AI và API key
- Supabase
- Launcher/Command Center
- Font cá nhân

### Không yêu cầu

- SQL mới
- Environment Variable mới
- Dependency mới
- `npm install`
