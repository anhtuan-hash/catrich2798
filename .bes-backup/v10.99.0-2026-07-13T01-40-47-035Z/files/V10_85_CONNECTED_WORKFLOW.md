# V10.85.0 — Connected Workflow

## Mục tiêu

V10.85.0 chuyển Brian English Studio từ một tập hợp ứng dụng độc lập thành một hệ thống có luồng dữ liệu liên thông. Bản này tập trung vào năm lớp nền tảng: Workspace Tabs, Content Transfer Hub, Version History, Offline Sync Queue và Configuration Migration.

## 1. Workspace Tabs

Sau khi người dùng mở từ hai trang hoặc ứng dụng trở lên, thanh tab làm việc xuất hiện ngay dưới shell điều hướng.

### Tính năng

- Tự thêm trang hoặc ứng dụng đang mở vào workspace.
- Chuyển tab mà không cần quay về Launcher.
- Ghim tab để tránh đóng nhầm.
- Đóng tab thường.
- Kéo thả để đổi thứ tự.
- Giới hạn tối đa 12 tab.
- Tự loại tab cũ chưa ghim khi vượt giới hạn.
- Lưu riêng theo tài khoản trong trình duyệt.
- Đồng bộ giữa các tab trình duyệt bằng `BroadcastChannel` và sự kiện `storage`.

### Giới hạn

Workspace Tabs lưu trạng thái điều hướng, không giữ nguyên toàn bộ DOM của ứng dụng đã rời khỏi. Nội dung biểu mẫu được bảo vệ bằng Global Autosave và Version History.

## 2. Content Transfer Hub

Nút **Gửi sang** nằm ở góc dưới bên trái. Khi mở, hệ thống lấy theo thứ tự:

1. Văn bản người dùng đang bôi chọn.
2. Giá trị trong các ô biểu mẫu đang hiển thị.
3. Nội dung văn bản của trang hiện tại.

### Ứng dụng đích hiện hỗ trợ

- Worksheet Factory
- Exam Studio
- WordGraph Studio
- TextLab Activities
- Lesson Architect
- Thư viện

Dữ liệu chuyển được lưu theo cấu trúc gồm loại nội dung, tiêu đề, ứng dụng nguồn, ứng dụng đích, nội dung, metadata và thời điểm tạo.

## 3. Transfer Inbox

Khi vào ứng dụng đích, một thanh **Nội dung được gửi tới** xuất hiện phía trên workspace.

Người dùng có thể:

- Dùng nội dung.
- Bỏ qua.
- Xem nguồn và độ dài nội dung.

Worksheet Factory có adapter riêng: nội dung được đưa trực tiếp vào vùng nguồn và giữ nguyên tiêu đề nguồn.

Các ứng dụng chưa có adapter riêng vẫn nhận nội dung bằng sự kiện toàn hệ thống và cơ chế điền vùng nhập chính.

## 4. Brian AI trong Connected Workflow

Mỗi câu trả lời của Brian AI có thêm nút **Gửi sang…**. Nút này đóng cửa sổ chat và mở Content Transfer Hub với toàn bộ câu trả lời AI làm dữ liệu nguồn.

## 5. Autosave 2.0 và Version History

Mỗi lần autosave tạo một phiên bản khi nội dung thực sự thay đổi.

### Quy tắc

- Tối đa 20 phiên bản cho mỗi tài khoản và route.
- Giới hạn dung lượng mỗi phiên bản để tránh làm đầy `localStorage`.
- Giới hạn tổng dung lượng lịch sử khoảng 2,8 triệu ký tự cho mỗi route.
- Không lưu mật khẩu hoặc file input.
- Cho phép khôi phục từng phiên bản.
- Cho phép xóa từng phiên bản hoặc xóa toàn bộ lịch sử.

Version History hiện là local-first trên thiết bị. Chưa đồng bộ lịch sử bản nháp lên Supabase trong bản này.

## 6. Offline Sync Queue

Khi người dùng chuyển nội dung trong lúc mất mạng, thao tác vẫn được lưu trên thiết bị và được đưa vào hàng đợi.

Hệ thống:

- Hiển thị số mục đang chờ mạng.
- Kiểm tra lại khi trình duyệt trực tuyến.
- Đánh dấu hoàn tất khi nội dung chuyển vẫn tồn tại.
- Cho phép xóa từng mục khỏi hàng đợi.

Bản này chỉ dùng hàng đợi cho tác vụ local-first đã có handler. Nó không giả lập việc upload cloud khi chưa có API đích tương ứng.

## 7. Configuration Migration Engine

Trước khi React render, hệ thống:

- Kiểm tra cấu hình Launcher V3.
- Sao lưu raw data cũ.
- Chuyển sang schema V4.
- Gắn `schemaVersion`, `updatedAt` và `migratedAt`.
- Ghi báo cáo migration.
- Không để cấu hình lỗi làm trắng trang.

Launcher cloud hiện tại vẫn dùng bảng `bes_launcher_settings`; không cần thay đổi SQL.

## 8. System Health Center

Trung tâm trạng thái bổ sung:

- Kết quả Configuration Migration.
- Số Workspace Tabs đang mở.
- Số nội dung liên ứng dụng đang chờ dùng.
- Số tác vụ đang chờ đồng bộ.
- Báo cáo runtime mang version `10.85.0`.

## 9. Kiểm thử

- Production build: chạy bằng Vite.
- Smoke checks: 171 kiểm tra.
- Department runtime: Admin, TTCM, Teacher.
- Không thêm dependency production mới.

## 10. Cập nhật

Không cần chạy SQL Supabase hoặc thêm Environment Variable mới.
