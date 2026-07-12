# Brian English Studio V10.87.1 — Command Center Visual Harmony

Bản cập nhật giao diện dành cho repository đã cài **V10.87.0 Launcher & Command Center**.

## Mục tiêu

- Khắc phục thẻ ứng dụng bị tối, nút trắng hoặc màu sắc bị lệch do CSS toàn site ghi đè.
- Làm giao diện gọn hơn, cân đối hơn và hài hòa với nền Metro xanh đậm của Brian English Studio.
- Giữ nguyên toàn bộ ứng dụng đã ghim, nhóm tùy chỉnh, thứ tự và lịch sử gần đây của V10.87.0.

## Nội dung thay đổi

- Header xanh navy thống nhất, thanh tìm kiếm sáng và dễ đọc.
- Sidebar thu gọn, trạng thái đang chọn dùng vạch cyan thay vì mảng màu quá lớn.
- Card chuyển thành nền trắng, viền xám xanh nhẹ, không còn khung navy nặng.
- Mỗi nhóm ứng dụng có màu nhấn riêng: tài nguyên, giảng dạy, kỹ năng, kiểm tra, chuyên môn và quản trị.
- Nút ghim/ẩn nhỏ hơn và chỉ nổi bật khi rê chuột hoặc dùng bàn phím.
- Tối ưu mật độ hiển thị: 3 cột desktop, 2 cột tablet, 1 cột mobile.
- Cách ly button/input của Command Center khỏi CSS toàn site.
- Không dùng `prefers-color-scheme: dark`, tránh việc macOS Dark Mode làm Command Center đổi màu ngoài ý muốn.
- Cải thiện focus, tương phản, scrollbar và reduced motion.

## Yêu cầu

- Đã cài V10.87.0.
- Không cần SQL.
- Không cần Environment Variable mới.
- Không thêm dependency.
- Không chạy `npm install` nếu repository hiện tại đã hoạt động.

## Cài đặt

Sao lưu repository:

```bash
git status
git add -A
git commit -m "Backup V10.87.0 before V10.87.1"
```

Chép gói update-only vào repository:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.87.1-command-center-visual-harmony-update-only/ ./
node scripts/install-v10.87.1.mjs
```

Kiểm tra:

```bash
npm run verify:v10.87.1
```

Hoặc chạy riêng:

```bash
npm run test:command-center
npm run release:guard
npm run build
npm test
npm run test:department
```

Deploy:

```bash
git add -A
git commit -m "Optimize Command Center UI V10.87.1"
git push origin main
```

Khi Vercel báo Ready, tải lại bằng **Command + Shift + R**.

## Rollback

```bash
npm run rollback:v10.87.1
npm run build
npm test
npm run test:department
```

Rollback không xóa dữ liệu Launcher cá nhân trong localStorage.

## Lưu ý về cache

V10.87.1 dùng asset mới:

- `/bes-command-center-v10871.css`
- `/bes-command-center-v10871.js`

Do đó trình duyệt không tiếp tục dùng CSS V10.87.0 đã cache.
