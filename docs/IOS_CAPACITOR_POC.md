# Brian English Studio — iOS Capacitor POC

Nhánh này chuẩn bị một bản thử nghiệm đóng gói Brian thành ứng dụng iOS bằng Capacitor, tách biệt hoàn toàn khỏi `main`.

## Mục tiêu

- Giữ nguyên ứng dụng Vite + React hiện tại.
- Đóng gói thư mục build `dist` thành ứng dụng iOS.
- Giảm cảm giác tải lại như PWA khi chuyển ứng dụng qua lại.
- Tạo nền tảng để bổ sung lưu trạng thái, thông báo, camera, chia sẻ tệp và Face ID sau này.

## Yêu cầu

- Node.js 22.x và npm 10.x.
- Máy Mac có Xcode để tạo/chạy simulator hoặc cài lên iPhone.
- CocoaPods theo yêu cầu của phiên bản Xcode/Capacitor đang dùng.

## Chạy thử

```bash
npm install
node scripts/setup-ios-capacitor.mjs
npm run ios:open
```

Script sẽ:

1. Cài `@capacitor/core`, `@capacitor/cli` và `@capacitor/ios`.
2. Thêm các lệnh `ios:setup`, `ios:sync`, `ios:open`, `ios:run` vào `package.json`.
3. Build Brian vào `dist`.
4. Tạo thư mục dự án Xcode `ios/` hoặc đồng bộ lại nếu đã tồn tại.

## Kiểm tra trên iPhone Simulator

1. Mở dự án bằng `npm run ios:open`.
2. Trong Xcode, chọn một iPhone Simulator.
3. Nhấn Run.
4. Đăng nhập, mở một module, chuyển sang ứng dụng khác rồi quay lại Brian.
5. Kiểm tra route, trạng thái đăng nhập, dữ liệu đã tải và vị trí giao diện.

## Phạm vi của POC

Bản thử nghiệm này mới tạo lớp vỏ iOS. Nó chưa cam kết rằng mọi trạng thái React sẽ tự phục hồi sau khi iOS chấm dứt tiến trình. Để xử lý triệt để, bước kế tiếp là lưu có chọn lọc route, tab, bản nháp và dữ liệu gần nhất vào IndexedDB/localStorage; không lưu khóa bí mật hoặc dữ liệu nhạy cảm chưa mã hóa.

## Cập nhật sau khi sửa web

```bash
npm run ios:sync
npm run ios:open
```

## Hoàn tác

Chỉ cần không hợp nhất nhánh này vào `main`. Website đang chạy không bị thay đổi.
