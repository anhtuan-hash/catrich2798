# HỢP ĐỒNG GIAO DIỆN GVCN → HUB CHUYÊN MÔN

Ngày khóa: 23/07/2026 08:56:22

## 1. Yêu cầu khóa tuyệt đối

Hub Chuyên môn phải tham chiếu trực tiếp **100% ứng dụng Giáo viên chủ nhiệm** về:

- app shell nằm trong Brian;
- vùng header nội bộ;
- hero;
- thẻ thống kê;
- thanh tab;
- bộ lọc;
- bảng và danh sách;
- drawer;
- modal;
- menu ba chấm;
- toast;
- loading, empty và error state;
- typography;
- khoảng cách;
- border, radius và shadow;
- responsive;
- hover, focus, active và disabled state;
- chuyển động và hành vi bàn phím.

Không được nhìn rồi dựng “gần giống”. Phải đối chiếu trực tiếp mã nguồn và baseline GVCN.

## 2. Định danh Hub mới

```text
Tên hiển thị: Hub Chuyên môn
App ID: professional-hub
Route: #/tool/professional-hub
Thư mục: src/apps/professional-hub/
CSS namespace: .professional-hub-*
```

## 3. Kiến trúc bắt buộc

- Ứng dụng React native trực tiếp trong Brian.
- Không iframe.
- Không microfrontend.
- Không HTML entry riêng.
- Không Vite multi-page.
- Không Vercel project riêng.
- Không đăng nhập riêng.
- Không header hoặc footer thay thế Brian.
- Không tự bật fullscreen/focus mode.

## 4. Tệp GVCN phát hiện trong repository

- `src/components/FlatAppIcon.jsx`
- `src/components/GlobalCommandPalette.jsx`
- `src/components/HomeroomConductTab.jsx`
- `src/components/HomeroomPhase2Tabs.jsx`
- `src/components/HomeroomPhase3Tabs.jsx`
- `src/components/homeroom/HomeroomCommunicationTabs.jsx`
- `src/components/homeroom/HomeroomCoreTabs.jsx`
- `src/data/appVisibilityRegistry.js`
- `src/data/designProfiles.js`
- `src/data/homeroom.js`
- `src/data/homeroomAcademicPlan.js`
- `src/data/homeroomConduct.js`
- `src/main.jsx`
- `src/pages/HomeroomPortal.jsx`
- `src/pages/HomeroomWorkspace.jsx`
- `src/pages/WebApps.jsx`
- `src/styles/homeroom-complete.css`
- `src/styles/homeroom-regular-gradebook-v1167.css`
- `src/utils/dashboardAggregator.js`
- `src/utils/homeroomConduct.js`
- `src/utils/homeroomOfflineTools.js`
- `src/utils/homeroomPhase2.js`
- `src/utils/homeroomPhase3.js`
- `src/utils/homeroomStore.js`

## 5. Component GVCN phát hiện

- `HomeroomConductTab`
- `HomeroomPortal`
- `HomeroomWorkspace`

## 6. CSS GVCN phát hiện

- `src/styles/legacy/05-connected-platform.css`
- `src/styles/v1159.css`
- `src/styles/work-dashboard-luxury-v1167.css`
- `src/styles/work-dashboard-v1167.css`

## 7. Responsive rule phát hiện

- `@media (max-width: 1050px)`
- `@media (max-width: 1179px)`
- `@media (max-width: 420px)`
- `@media (max-width: 699px)`
- `@media (max-width: 720px)`
- `@media (max-width: 899px)`
- `@media (max-width: 999px)`
- `@media (max-width:1180px)`
- `@media (max-width:760px)`
- `@media (min-width: 1121px)`
- `@media (min-width: 1440px)`
- `@media (min-width: 1501px)`
- `@media (prefers-reduced-motion: reduce)`
- `@media(max-width:1050px)`
- `@media(max-width:1080px)`
- `@media(max-width:1100px)`
- `@media(max-width:1120px)`
- `@media(max-width:1180px)`
- `@media(max-width:1280px)`
- `@media(max-width:1320px)`
- `@media(max-width:1500px)`
- `@media(max-width:580px)`
- `@media(max-width:620px)`
- `@media(max-width:650px)`
- `@media(max-width:680px)`
- `@media(max-width:700px)`
- `@media(max-width:720px)`
- `@media(max-width:760px)`
- `@media(max-width:820px)`
- `@media(max-width:980px)`
- `@media(prefers-reduced-motion:reduce)`

## 8. Bảng ánh xạ UI bắt buộc

| Giáo viên chủ nhiệm | Hub Chuyên môn | Điều kiện |
|---|---|---|
| App shell | ProfessionalHubShell | Giữ Brian shell |
| Header GVCN | Header Hub | Cùng chiều cao, padding, typography |
| Hero lớp | Hero tổ chuyên môn | Cùng tỷ lệ và responsive |
| Thẻ thống kê | Chỉ số chuyên môn | Cùng component family |
| Thanh phân khu | 8 tab Hub | Cùng active/hover/focus |
| Danh sách học sinh | Danh sách nghiệp vụ | Cùng mật độ và hành động |
| Drawer học sinh | Drawer bản ghi | Cùng width và overlay |
| Modal GVCN | Modal Hub | Cùng hierarchy và footer |
| Menu hàng cuối | Menu hành động Hub | Không bị cắt |
| Empty/loading/error | Trạng thái Hub | Cùng pattern |

## 9. Tài khoản và phân quyền

- Giáo viên lấy từ tài khoản Brian thật.
- Không hard-code giáo viên.
- Vai trò nghiệp vụ: TTCM và Giáo viên.
- Quyền được bảo vệ bằng membership và Supabase RLS.
- Giáo viên không render công cụ quản trị.
- Admin Brian chỉ khởi tạo/hỗ trợ/audit.

## 10. Thông báo

- Dùng Activity Center chung của Brian.
- Không có chuông hoặc drawer thông báo riêng.
- Deep-link mở đúng tab và drawer.
- Trạng thái “đã đọc” tách khỏi “đã xử lý”.
- Có realtime và `dedupe_key`.

## 11. Dữ liệu và tệp

- Không localStorage làm database chính.
- Không dữ liệu mẫu trong Production.
- Supabase + RLS + private Storage.
- Tệp chỉ cấp signed URL sau kiểm tra quyền.
- Mọi phê duyệt, trả sửa và xóa đều có audit log.

## 12. Baseline trực quan

Ảnh baseline được lưu cục bộ tại:

```text
docs/professional-hub/audit-evidence/private-baseline/
```

Ảnh không được push vì có thể chứa dữ liệu học sinh. Git chỉ lưu metadata viewport và SHA-256.

## 13. Cổng sang Phase 1

- [ ] Desktop Tổng quan.
- [ ] iPad ngang.
- [ ] iPad dọc.
- [ ] Drawer.
- [ ] Modal.
- [ ] Menu ba chấm hàng cuối.
- [ ] Empty/loading/error hoặc ghi SKIP.
- [ ] Manifest SHA-256.
- [ ] Không commit ảnh học sinh.
- [ ] Chưa thêm runtime Hub vào Production.

Chỉ sau khi hoàn thành cổng trên mới được dựng skeleton `professional-hub`.
