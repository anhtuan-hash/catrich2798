# Brian English Studio V10.88.0-HF1

## AI Chat Close Cleanup

Hotfix xử lý lỗi panel Brian AI đã thu gọn nhưng lớp layout V10.87.3 vẫn giữ `display:flex`, kích thước, backdrop-filter hoặc vùng paint của panel. Kết quả là trang còn một dải mờ sau khi bong bóng chat đã đóng.

### Cơ chế sửa

1. Nhận diện thao tác đóng/thu gọn từ nhãn nút và các biểu tượng `−`, `×`.
2. Gắn lifecycle `closing` ngay ở pha capture trước khi UI gốc chạy animation.
3. CSS đặt panel thành `display:none`, tắt `backdrop-filter`, `box-shadow`, `filter` và pointer events.
4. Sau 220 ms, JavaScript gỡ toàn bộ tag layout, role tag, input wrapper và nút mở rộng do runtime thêm.
5. Khôi phục các inline style của textarea trước khi trả quyền điều khiển cho component gốc.
6. Theo dõi `class`, `style`, `hidden`, `aria-hidden`, `data-state`, `data-open` và `data-visible` để xử lý cả trường hợp đóng bằng state React, phím Escape hoặc event riêng.
7. Phát sự kiện `resize` sau cleanup để nút launcher tự căn lại vị trí.

### Dữ liệu không bị tác động

- Lịch sử chat
- Bản nháp
- Provider AI
- API key
- Tệp đính kèm
- AI Governance
- Supabase
- Launcher và Command Center

### Không yêu cầu

- SQL mới
- Environment Variable mới
- Dependency mới
- `npm install`
