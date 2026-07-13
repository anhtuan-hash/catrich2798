# V10.88.0 Platform Control Center — Technical Notes

## Architecture

V10.88.0 được triển khai như một lớp runtime độc lập để không phải sửa sâu các component hiện hữu khi source repository đầy đủ không có trong môi trường đóng gói.

### Runtime API

```js
window.BES_PLATFORM_CONTROL.open()
window.BES_PLATFORM_CONTROL.close()
window.BES_PLATFORM_CONTROL.toggle()
window.BES_PLATFORM_CONTROL.report()
window.BES_PLATFORM_CONTROL.runDiagnostics()
window.BES_PLATFORM_CONTROL.getFlag('platform.module_kill_switch')
window.BES_PLATFORM_CONTROL.listModules()
```

### Storage keys

```text
bes-platform-control-v10880
bes-platform-disabled-modules-v10880
```

Các key này độc lập với:

```text
bes-launcher-config-v4
bes-command-center-v10870
```

### Runtime events

```text
bes-platform-control-ready
bes-platform-flags-changed
bes-platform-channel-changed
```

## Module kill switch

Kill switch chỉ chặn điều hướng ở lớp runtime khi flag `platform.module_kill_switch` đang bật. Nó không xóa route, component, dữ liệu hoặc cấu hình Supabase.

## Release safety

Installer:

1. Xác nhận repository root.
2. Kiểm tra phiên bản hỗ trợ.
3. Tạo backup timestamped.
4. Gắn đúng một CSS tag và một JS tag.
5. Không thay đổi package-lock.
6. Sinh build manifest.
7. Lập chỉ mục migration SQL.
8. Ghi state phục vụ rollback.

## Known boundary

Không có source repository đầy đủ nên V10.88.0 chưa thể:

- Ghi feature flags vào Supabase để đồng bộ đa thiết bị.
- Tắt module server-side cho toàn bộ tài khoản.
- Đọc deployment history trực tiếp từ Vercel.
- Xác minh migration đã thực sự chạy trong database.

Các chức năng trên nên được triển khai ở V10.88.1 sau khi có source và schema thật.
