# V11.3.6 Test Report

## Kiểm tra đã thực hiện

- Launcher Gallery contract: 16/16 đạt.
- Release guard: đạt.
- JavaScript syntax cho launcher preferences và release scripts: đạt.
- Cấu hình launcher schema 5: đạt.
- Lưu và đồng bộ `launcherStyle`: đạt bằng kiểm tra hợp đồng source.
- Launcher tròn: đạt bằng kiểm tra component/CSS contract.
- Hộp nước và hiệu ứng nổi: đạt bằng kiểm tra component/CSS contract.
- Lưới thẻ 4/3/2/1 cột: đạt bằng kiểm tra CSS contract.
- Reduced motion: đạt.
- Không có registry npm nội bộ: đạt.
- Không cần SQL: đạt.
- Installer từ V11.3.5: đạt.
- Verify installer: 12/12 đạt.
- Rollback về V11.3.5: đạt.

## Giới hạn kiểm tra

Full Vite production build chưa thể chạy trong môi trường đóng gói vì thư mục dependency hiện có không chứa Vite executable và môi trường không tải được npm package. Cần chạy `npm run verify:v11.3.6` trên máy phát triển trước khi push Production.
