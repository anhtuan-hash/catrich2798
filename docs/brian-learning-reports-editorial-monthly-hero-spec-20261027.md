# BRIAN REPORTS — HERO ĐỒNG BỘ BÁO CÁO CHUYÊN MÔN THÁNG

**Phiên bản:** 1.0 — 27/10/2026  
**Phạm vi:** `/#/tool/brian-team` → Bồi dưỡng & Phụ đạo. Không thay đổi hệ thống Điểm danh, Supabase, phân quyền, lịch giao báo cáo.

## 1. Nguồn tham chiếu bắt buộc
- Lấy **hero “Báo cáo công việc tháng 10”** của khu vực Báo cáo chuyên môn tháng làm mẫu thị giác chính, không sử dụng bản hero “dashboard nổi 3 thẻ” đã thử nghiệm.
- Đồng nhất DNA: nền giấy ivory (#fffcf7), hình oval xanh pastel phía dưới phải, nền peach phía trên phải, chữ xanh navy đậm kiểu editorial, chữ số tháng màu cam, câu viết nghiêng màu xanh, tấm giấy nghiêng có huy hiệu xanh, đường chân mảnh màu coral.
- Tỉ lệ, cỡ chữ, mật độ chi tiết và padding phải tương ứng hero mẫu, nhưng bố cục phản hồi trên điện thoại.
- Không thay đổi/ghi đè ảnh hay CSS của hero Báo cáo chuyên môn tháng. CSS phải scope theo `.blr-shell .blr-editorial-hero`.

## 2. Nội dung chính
- Eyebrow nhỏ có biểu tượng sparkles, chữ `BRIAN REPORTS`.
- Tiêu đề chia thành hai dòng:
  `Bồi dưỡng &`
  `Phụ đạo tháng 10`.
- Chỉ số tháng được tính từ state `heroPeriod`, thể hiện bằng span màu coral `#df6044`. Năm và tháng được hiển thị ở điều khiển tháng riêng, ví dụ `Tháng 10/2026`.
- Subtitle: `Đồng hành · Bồi dưỡng · Nâng cao chất lượng học tập`.
- Bên phải: giấy nghiêng trên oval peach, huy hiệu tròn và câu viết nghiêng `Mỗi giờ dạy đều tạo nên sự tiến bộ!`, chi tiết hình sách + check thuộc nội dung báo cáo.
- Không nhồi thẻ KPI ảo vào hero. Các KPI dữ liệu thật hiện bên dưới hero đã có.

## 3. Tương tác tháng báo cáo
- Khi tháng hiện hành là 2026-10, title hiển thị chính xác `10`; khi chuyển năm title cập nhật tháng và chip hiển thị năm đầy đủ.
- Month input `type=month` vẫn là input được điều khiển; nhấn vào chip để chọn tháng (không che input bằng phần tử không nhấn được).
- Hai nút trước/sau gọi helper `shiftReportPeriod` (2026-12 → 2027-01; 2026-01 → 2025-12).
- Mọi thay đổi tháng phải dùng `updateHeroPeriod`, TTCM chuyển sang Tổng hợp tổ tháng tương ứng và đồng bộ `LearningReportsManagerDashboard`; không chạy API giao báo cáo hoặc tạo sự kiện.
- Để không nhầm lẫn, điều khiển chỉ ghi `Tháng báo cáo`, không đại diện cho tháng được giao mới; giao báo cáo vẫn do người dùng quyết định.
- Dùng ARIA labels tiếng Việt, `:focus-visible`, disabled thật nếu cần.

## 4. Bố cục & style
- Desktop >=1100px: hero 2 cột 60/40; trái typography lớn 43–55px, hai dòng; phải minh hoạ thoáng, câu slogan và thẻ nghiêng.
- Laptop 760–1099px: title 37–49px, hình nhỏ tương ứng, đảm bảo đọc tháng rõ ràng.
- Mobile <=760px: layout một cột, art giảm/hide tùy màn hình; month chip vẫn thao tác được; padding 20–24px; tuyệt đối không tràn ngang.
- Bề mặt: border 1px `#eadccd`, radius 20px, shadow 0 8px 24px rất nhẹ. Không dùng remote font, chỉ hệ font đã có trên website, serif fallback.
- `prefers-reduced-motion`: không xoay/chuyển động liên tục, chỉ hiệu ứng hover nhẹ dưới điều kiện phù hợp.

## 5. Ba nút điều hướng
- `Báo cáo giáo viên`, `Tổng hợp tổ`, `Thống kê tháng` dùng cùng độ cao (44px), border-radius (12px), font-weight (750), icon 16px, padding ngang (16px).
- Trạng thái được chọn cùng background, border và indicator. Không CSS ngoại lệ khiến nút đầu đậm hơn/có gạch dưới khác.
- Giữ role tablist/tab và aria-selected, bàn phím truy cập được.

## 6. Phạm vi bảo vệ
- Giữ tất cả giao báo cáo thông minh, 2 loại HSG/Phụ đạo, phân biệt GV thực dạy, nghiệp vụ Điểm danh, đồng hồ hạn nộp, xóa hàng loạt có bảo vệ, CSV/PDF, thống kê, duyệt.
- Không thay đổi data model, Supabase RLS, database migration, dependency hoặc chức năng Báo cáo chuyên môn tháng.
- Tái sử dụng icon Lucide sẵn có; không gọi API ảnh/mất phí.

## 7. Kiểm thử, phát hành
1. Static/spec tests: title động và chip tháng, stylesheet scoped, decorative aria-hidden, tab parity, responsive và reduced motion.
2. Pure functions: validate month, rollover năm, academic year.
3. CI hiện có cho smart assignment, báo cáo, security, song ngữ, parse JSX.
4. Vercel Preview phải `Success`; merge PR và xác minh production; không gửi/xóa báo cáo thật trong kiểm thử.
