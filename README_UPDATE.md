# Brian English Studio V10.89.0
## Unified Work Hub — update-only

V10.88.1 đã được chốt sau khi Kho học liệu hiển thị đúng giữa tài khoản Admin và giáo viên. V10.89.0 triển khai **Trung tâm công việc thống nhất** cho toàn hệ thống.

## Tính năng

- Hộp việc chung cho nhiệm vụ, lịch, phê duyệt và thông báo.
- Chu trình: Nháp → Đã giao → Tiếp nhận → Đang thực hiện → Đã nộp → Cần chỉnh sửa → Đã duyệt → Hoàn thành → Lưu trữ.
- Bảng tiến độ theo trạng thái.
- Lịch công việc 14 ngày, phân màu theo mức ưu tiên.
- Hàng chờ phê duyệt dành cho Admin/TTCM.
- Phản hồi và ghi chú trên từng công việc.
- Nhật ký thay đổi trạng thái.
- Thông báo riêng cho từng người dùng.
- Supabase Realtime; tự chuyển sang polling khi runtime không cung cấp client Realtime.
- Phân quyền RLS: giáo viên chỉ thấy công việc liên quan; Admin/TTCM quản lý toàn bộ.
- Tích hợp Command Center và route `#/work-hub`.
- Phím tắt: `Command/Ctrl + Shift + W`.
- Nâng Platform Control Center lên runtime V10.89.0 để Version Registry không báo lệch.

## Không thay đổi

- Không thay dependency.
- Không chạy `npm install` nếu repository hiện hoạt động bình thường.
- Không thay `package-lock.json`.
- Không cần Environment Variable mới.
- Không xoá nhiệm vụ, hồ sơ, tài liệu hoặc dữ liệu V10.88.
- Giữ nguyên Brian AI, Launcher, Command Center, Kho học liệu và font cá nhân.

## Cài đặt

### 1. Sao lưu Git

```bash
git status
git add -A
git commit -m "Backup completed V10.88.1 before V10.89.0" || true
```

### 2. Chép gói vào repository

```bash
rsync -av \
  ~/Downloads/brian-english-studio-v10.89.0-unified-work-hub-update-only/ \
  ./
```

Không dùng `--delete`.

### 3. Chạy installer

```bash
node scripts/install-v10.89.0.mjs
```

Installer hỗ trợ trực tiếp:

- V10.88.0
- V10.88.1

### 4. Bắt buộc chạy SQL

Mở:

```text
Supabase → SQL Editor → New query
```

Dán toàn bộ file:

```text
supabase/work_hub_v10_89_0.sql
```

Bấm **Run**. File an toàn khi chạy lại và không xoá dữ liệu hiện có.

Kết quả cuối phải hiện bốn bảng:

- `work_hub_items`
- `work_hub_comments`
- `work_hub_activity`
- `work_hub_notifications`

### 5. Đăng nhập lại

Đăng xuất rồi đăng nhập lại tài khoản Admin và giáo viên để làm mới JWT/RLS.

### 6. Kiểm tra source

```bash
npm run verify:v10.89
```

Hoặc chạy riêng:

```bash
npm run test:work-hub
npm run build
npm test
npm run test:department
npm run platform:doctor
npm run release:guard:v10.89
```

### 7. Deploy

```bash
git add -A
git commit -m "Add Unified Work Hub V10.89.0"
git push origin main
```

Khi Vercel báo Ready, tải lại bằng:

```text
Command + Shift + R
```

## Mở Trung tâm công việc

- Command Center → **Trung tâm công việc**
- Route: `#/work-hub`
- Phím tắt: `Command + Shift + W` trên macOS hoặc `Ctrl + Shift + W` trên Windows
- Trên màn hình rộng, nút **Công việc** được đặt cạnh Tổ chuyên môn.

## Kiểm tra hai vai trò

### Admin/TTCM

1. Tạo một nhiệm vụ.
2. Chọn giáo viên thực hiện.
3. Đặt hạn và bấm **Đã giao**.
4. Xác nhận nhiệm vụ xuất hiện trong tài khoản giáo viên.
5. Sau khi giáo viên nộp, mở **Chờ phê duyệt**.
6. Bấm **Yêu cầu sửa** hoặc **Phê duyệt**.

### Giáo viên

1. Mở Hộp việc.
2. Tiếp nhận nhiệm vụ.
3. Chuyển sang Đang thực hiện.
4. Thêm phản hồi.
5. Bấm **Nộp sản phẩm**.
6. Xác nhận phản hồi của Admin/TTCM hiển thị trong chi tiết công việc.

## Rollback source

```bash
npm run rollback:v10.89.0
npm run build
npm test
npm run test:department
```

Rollback chỉ khôi phục source. Bốn bảng Work Hub trong Supabase được giữ nguyên để không mất dữ liệu.
