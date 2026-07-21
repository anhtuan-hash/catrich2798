# V10.4 — Fullscreen Metro Start Tile Density

## Mục tiêu
Chuẩn hoá lại trang Start để các tile phủ rộng hơn theo đúng cảm giác Windows 8 Start Screen, hạn chế khoảng trống lớn trên desktop.

## Thay đổi chính
- Tăng kích cỡ tile bằng `--tile-unit: clamp(...)` theo chiều cao viewport.
- Chuyển Start Screen desktop sang 4 hàng tile để phủ chiều cao màn hình tốt hơn.
- Giảm khoảng trống header, tối ưu padding toàn trang.
- Bố trí lại một số app quan trọng sang tile `large` / `wide` để màn hình đầy và có nhịp Metro rõ hơn.
- Tinh chỉnh Metro Tile Open Effect: tile nén nhẹ rồi mở rộng phủ màn hình nhanh, phẳng, ít fade, đúng cảm giác tile-to-app hơn.

## Kiểm tra
- `npm run build`: pass
- `npm test`: 22/22 smoke checks pass
