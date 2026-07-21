# Brian English Studio V12.18.0 — Global 16:9 Widescreen Canvas

Phiên bản này áp dụng bố cục màn hình rộng cho toàn bộ website:

- mọi route dùng khung trình bày 16:9 trên desktop;
- nội dung kéo gần ra hai viền với gutter chỉ khoảng 10–22 px;
- gỡ giới hạn chiều rộng cũ 1180/1360/1520/1540 px;
- thanh trạng thái, điều hướng, workspace tabs và footer cùng thẳng hàng;
- trang Ứng dụng tự tăng 5 → 6 → 7 → 8 cột trên màn hình rộng;
- tablet và mobile vẫn giữ lề an toàn;
- trang dài tiếp tục cuộn tự nhiên, không cắt nội dung.

## Kiểm tra

```bash
npm ci
npm run verify:v12.18.0
npm run dev
```

Không cần chạy SQL mới.
