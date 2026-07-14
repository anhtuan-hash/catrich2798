# Brian English Studio V12.10.0

## Workspace Navigation & Unified Activity Center

Đây là **full source hoàn chỉnh** được phát triển tiếp từ V12.9.0.

## Thay đổi chính

### 1. Điều hướng theo tám không gian

Thanh điều hướng cấp cao không còn liệt kê hàng loạt route riêng lẻ. Nó sử dụng tám nhóm thống nhất:

- Giảng dạy
- Đánh giá
- Nội dung & Kĩ năng
- Quản lí
- Học liệu
- Không gian AI
- Trò chơi & Lớp học
- Hệ thống

Mỗi mục tự kiểm tra quyền, trạng thái ẩn ứng dụng và số công cụ người dùng có thể mở.

### 2. Trung tâm hoạt động thống nhất

Trung tâm mới gom các luồng sau vào một drawer dùng chung:

- Thông báo
- Công việc
- Hàng đợi đồng bộ
- Lịch sử workspace và bản nháp
- Hoạt động Brian AI

Các tab chính: Tổng quan, Thông báo, Công việc, Đồng bộ, Lịch sử và AI.

### 3. Gỡ launcher giao diện trùng lặp

- Nút lịch sử của Global Autosave mở tab Lịch sử trong Activity Center.
- Sync Queue vẫn chạy nền nhưng không tạo thêm panel nổi độc lập.
- Nút thông báo trên thanh trạng thái mở Activity Center trước; bảng thông báo chi tiết vẫn được giữ cho các thao tác duyệt/nộp phức tạp.

### 4. Dữ liệu hoạt động

Activity Center lưu tối đa 120 mục theo từng tài khoản trong trình duyệt, hỗ trợ:

- localStorage
- CustomEvent
- BroadcastChannel
- Đồng bộ giữa các tab đang mở

Không cần chạy SQL mới.

## Yêu cầu

- Node.js 22.x
- npm 10.x
- Giữ nguyên `.env` và font cá nhân trong dự án chính

## Kiểm tra source độc lập

```bash
cd ~/Downloads/brian-english-studio-v12.10.0-workspace-navigation-activity-center-full-source
node -v
npm ci
npm run verify:v12.10.0
npm run audit:budget
npm run dev
```

## Chép vào dự án chính

```bash
cd ~/Documents/Brian-English-Studio-MAIN

git add -A
git commit -m "Backup before V12.10.0" || true
```

```bash
rsync -av --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='public/fonts/*.ttf' \
  --exclude='public/fonts/*.otf' \
  --exclude='public/fonts/*.woff' \
  --exclude='public/fonts/*.woff2' \
  --exclude='public/bes-fonts/*.ttf' \
  --exclude='public/bes-fonts/*.otf' \
  --exclude='public/bes-fonts/*.woff' \
  --exclude='public/bes-fonts/*.woff2' \
  ~/Downloads/brian-english-studio-v12.10.0-workspace-navigation-activity-center-full-source/ \
  ~/Documents/Brian-English-Studio-MAIN/
```

```bash
cd ~/Documents/Brian-English-Studio-MAIN
rm -rf node_modules
npm ci
npm run verify:v12.10.0
npm run audit:budget
```

## Deploy

```bash
git add -A
git commit -m "Add Workspace Navigation and Activity Center V12.10.0"
git pull --rebase origin main
git push origin main
```

Sau khi Vercel báo Ready, đóng tab cũ, mở lại website và nhấn `Command + Shift + R`.

## Kiểm tra trực quan sau deploy

1. Thanh điều hướng chỉ còn tám không gian lớn thay vì danh sách route dài.
2. Mỗi không gian mở đúng landing page và hiển thị trạng thái active.
3. Nút Hoạt động mở drawer với sáu tab.
4. Thông báo công việc xuất hiện trong tab Công việc.
5. Sync Queue không còn tạo panel nổi riêng.
6. Nút lịch sử bản nháp mở tab Lịch sử.
7. Hoạt động AI xuất hiện khi AI bắt đầu/kết thúc tác vụ.
8. Android, Apple và Brian Unified đều hiển thị đúng.

## Lưu ý font

Gói không chứa file font nhị phân. Lệnh `rsync` phía trên giữ lại font cá nhân đã có trong dự án chính.
