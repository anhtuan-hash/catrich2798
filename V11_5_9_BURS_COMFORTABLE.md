# Brian English Studio V11.5.9 — BURS Comfortable

## Mục tiêu

BURS (Brian Unified Readability System) chuẩn hóa cỡ chữ, card, form control, khoảng cách và responsive trên toàn bộ Brian English Studio. Bản Comfortable ưu tiên khả năng đọc khi dạy học, dùng laptop, máy chiếu, tablet và điện thoại.

## Hợp đồng typography

- Nội dung có ý nghĩa: tối thiểu 13 px.
- Button, input, textarea, select: tối thiểu 14 px; mặc định 16 px.
- Body: 16–17 px.
- Option title: 18 px.
- Card title: 26–34 px bằng `clamp()`.
- Page title: 36–64 px bằng `clamp()`.
- Line-height nội dung: 1.55–1.72.
- Toàn bộ CSS nguồn đã loại bỏ khai báo font-size từ 1–12 px.

## Card system

Các panel và card chính dùng chung:

- Radius: 18–30 px theo cấp độ.
- Shadow mềm.
- Viền màu trung tính theo accent ứng dụng.
- Padding dùng token co giãn.
- Selected state dùng tint nhẹ, viền rõ và dấu kiểm.
- Vùng chạm tối thiểu 44 px.

## A+ toàn hệ thống

Các mức 100%, 110%, 120% và 130% tiếp tục được giữ. BURS dùng `rem` và token nên cỡ chữ, control, padding và khoảng cách đều tăng đồng bộ. Sự kiện `bes:font-scale-changed` kích hoạt quét lại các trang lazy-loaded và module nhúng.

## Shadow DOM

Readability guard tự phát hiện Shadow DOM mở và chèn stylesheet BURS. AI Lesson Integration Studio vì vậy dùng cùng mức chữ tối thiểu, control và breakpoints với phần còn lại của hệ thống.

## Responsive

- 1440+: container tối đa 1560 px, 2 card/hàng, workbench 68/32.
- 1180–1439: 2 card/hàng, không ép 3 panel.
- 900–1179: layout phức tạp chuyển 1 cột khi cần.
- 700–899: metric 2 cột, review xuống dưới.
- Dưới 700: 1 card/hàng, controls tối thiểu 46 px.
- 390–420: metric 1 cột khi không đủ chiều rộng.

## Phạm vi áp dụng

- Shell, navigation, tabs, utility rail và modal.
- Grammar Builder, Writing Studio, Pronunciation Coach.
- Worksheet Factory, SmartID, Vietnam Tax Studio.
- Provider Hub, Settings, AI Governance, AI Workspace.
- Department, Homeroom, Library, Resource Library, Admin.
- Các lớp giao diện legacy V10.93–V11.54.
- AI Lesson Integration Studio trong Shadow DOM.

## Không thay đổi

- Không thay Supabase schema.
- Không thay API key hoặc `.env`.
- Không thay nội dung DOCX/PDF xuất ra.
- Không thêm Vercel Function.
- Listening Lab vẫn bị gỡ theo V11.5.5.
