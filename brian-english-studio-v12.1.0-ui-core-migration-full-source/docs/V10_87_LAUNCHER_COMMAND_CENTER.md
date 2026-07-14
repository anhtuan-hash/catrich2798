# Brian English Studio V10.87.0 — Launcher & Command Center

## Mục tiêu

V10.87.0 bổ sung một lớp Launcher cá nhân và Command Center hoạt động trên toàn bộ website mà không thay đổi sâu Launcher V4 hiện có. Cách triển khai này giữ nguyên cấu hình Supabase của V10.83.1, cơ chế Connected Workflow của V10.85 và Stability Guard của V10.86.1.

## 1. Command Center toàn site

Mở bằng:

- `Ctrl + K` trên Windows.
- `Command + K` trên macOS.
- Nút **Command Center** ở cạnh phải màn hình.
- Nút **Thêm** trên thanh ứng dụng đã ghim.

Command Center tìm kiếm theo:

- Tên ứng dụng hoặc trang.
- Nhóm chức năng.
- Từ khóa.
- Route nội bộ.
- Tần suất sử dụng.

Hệ thống tự quét các liên kết nội bộ đang xuất hiện trên trang và ghi nhớ route đã phát hiện. Vì vậy, sau khi người dùng mở trang Ứng dụng một lần, danh mục tìm kiếm sẽ đầy đủ hơn.

## 2. Thanh ứng dụng đã ghim

Thanh truy cập nhanh xuất hiện ở cuối màn hình trên mọi route.

- Tối đa 6 mục hiển thị trực tiếp.
- Tự đánh dấu ứng dụng đang mở.
- Responsive cho desktop, tablet và điện thoại.
- Có thể tắt riêng trong Cài đặt Command Center.
- Không thay đổi thanh điều hướng gốc của ứng dụng.

## 3. Launcher cá nhân

Người dùng có thể:

- Ghim hoặc bỏ ghim ứng dụng.
- Ẩn mục khỏi Command Center cá nhân.
- Kéo thả để đổi thứ tự.
- Tạo nhóm mới.
- Chuyển ứng dụng sang nhóm khác.
- Xem lịch sử trang đã mở gần đây.
- Xuất cấu hình JSON.
- Nhập lại cấu hình JSON.
- Khôi phục cấu hình mặc định.

Trang chủ và trang Ứng dụng không thể bị ẩn để tránh mất đường quay lại hệ thống.

## 4. Phạm vi dữ liệu

Cấu hình V10.87.0 được lưu local-first theo tài khoản trình duyệt dưới key riêng:

```text
bes-command-center-v10870:<account-hash>
```

Danh mục route tự phát hiện được lưu tại:

```text
bes-command-center-catalog-v10870
```

Phiên bản này không ghi vào các key sau:

```text
bes-launcher-config-v3
bes-launcher-config-v4
bes-launcher-settings
```

Do đó Launcher V4, cấu hình Realtime và bảng `bes_launcher_settings` hiện có không bị thay đổi.

## 5. Đồng bộ trong trình duyệt

Khi mở nhiều tab của Brian English Studio:

- Cấu hình được cập nhật qua sự kiện `storage`.
- Trình duyệt hỗ trợ `BroadcastChannel` sẽ nhận thay đổi ngay.
- Mỗi tài khoản có không gian cấu hình riêng trên cùng thiết bị.

Phiên bản này chưa đồng bộ cấu hình Command Center mới qua Supabase sang thiết bị khác. Chức năng xuất/nhập JSON được cung cấp để sao lưu hoặc chuyển bố cục.

## 6. API tích hợp

Các module khác có thể gọi:

```js
BES_COMMAND_CENTER.open()
BES_COMMAND_CENTER.close()
BES_COMMAND_CENTER.toggle()
BES_COMMAND_CENTER.report()
BES_COMMAND_CENTER.exportConfig()
BES_COMMAND_CENTER.rediscover()
```

Đăng ký thêm route động:

```js
BES_COMMAND_CENTER.addRoute({
  id: 'my-tool',
  label: 'Công cụ của tôi',
  route: '#/tool/my-tool',
  group: 'Giảng dạy',
  icon: 'M',
  keywords: 'custom tool'
})
```

Các sự kiện toàn cục:

```text
bes-command-center-ready
bes-command-center-open
bes-command-center-navigate
```

## 7. An toàn triển khai

- Không thêm dependency.
- Không thay `package-lock.json`.
- Không yêu cầu SQL.
- Không yêu cầu Environment Variable.
- Không đóng gói hoặc chép đè font cá nhân.
- Installer tự sao lưu `package.json`, `index.html`, `public/version.json` và `package-lock.json`.
- Có script rollback riêng.
- V10.86.1 Stability Guard vẫn được giữ lại và nạp trước khi app gặp lỗi runtime.

## 8. Giới hạn có chủ đích

Để tránh lặp lại lỗi trắng trang ở Launcher trước đây, V10.87.0 không can thiệp trực tiếp vào DOM của lưới ứng dụng gốc và không tự ẩn card trong trang `#/apps`. Tính năng ẩn áp dụng trong Launcher cá nhân/Command Center mới. Việc hợp nhất hoàn toàn với Launcher gốc chỉ nên thực hiện sau khi có source V10.86 đầy đủ để chạy toàn bộ runtime test theo vai trò.
