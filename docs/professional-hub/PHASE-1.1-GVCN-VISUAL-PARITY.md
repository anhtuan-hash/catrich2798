# PHASE 1.1 — GVCN VISUAL PARITY

## Mục tiêu

Thay các thành phần Tổng quan tùy biến của skeleton bằng đúng họ component và bố cục của ứng dụng Giáo viên chủ nhiệm.

## Component family được dùng trực tiếp

- `hr-page`
- `hr-hero`
- `hr-tabs`
- `hr-panel`
- `hr-stat-grid`
- `hr-stat`
- `hr-tab-stack`
- `hr-overview-grid`
- `hr-quick-grid`
- `hr-compact-list`
- `hr-progress-panel`
- `hr-progress-row`
- `hr-empty`

## Trạng thái đã bổ sung

- Tổng quan dùng stat-card family GVCN.
- Overview grid và progress panel.
- Empty state.
- Loading skeleton.
- Toast.
- Drawer.
- Modal.
- Menu ba chấm hàng cuối mở lên trên để không bị cắt.
- Escape đóng drawer/modal.
- Nhãn accessibility riêng biệt.
- Responsive desktop và iPad.
- Reduced-motion.

## Giới hạn Phase 1.1

- Chưa nối Supabase.
- Chưa tạo schema hoặc RLS.
- Chưa có membership.
- Chưa dùng danh sách giáo viên.
- Không có giáo viên hoặc hồ sơ mẫu.
- Các nút Drawer/Modal/Toast/Loading chỉ phục vụ kiểm tra visual parity.
- Chưa merge và chưa deploy Production.

## Cổng duyệt

- [ ] Tổng quan đối chiếu baseline GVCN.
- [ ] Stat cards đúng tỷ lệ GVCN.
- [ ] Drawer đúng kích thước và overlay.
- [ ] Modal đúng hierarchy.
- [ ] Menu hàng cuối không bị cắt.
- [ ] Toast không che điều hướng.
- [ ] iPad ngang.
- [ ] iPad dọc.
- [ ] Brian shell không bị ảnh hưởng.
