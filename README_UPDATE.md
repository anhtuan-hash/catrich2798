# Brian English Studio V10.88.0 — Platform Control Center

Bản cập nhật **update-only** tập trung vào quản trị phiên bản, module, feature flag và kiểm tra trước phát hành.

## Điểm quan trọng

V10.88.0 có thể cài trực tiếp trên:

- V10.86.1
- V10.87.0
- V10.87.1
- V10.87.2
- V10.87.3

Không cần cài tuần tự toàn bộ V10.87.x trước. Điều này xử lý trường hợp repository thực tế vẫn báo V10.86.1.

## Tính năng đã triển khai

### Platform Control Center

Mở bằng:

```text
Command + Shift + P
```

hoặc trên Windows/Linux:

```text
Ctrl + Shift + P
```

Nếu Command Center V10.87 đang tồn tại, installer tự đăng ký mục **Platform Control Center** trong nhóm Quản trị.

### Version Registry

Hiển thị:

- Phiên bản ứng dụng.
- Phiên bản trước khi cập nhật.
- Release name.
- Git commit và branch tại lúc cài.
- Thời gian cài.
- Node version.
- Số migration SQL đã lập chỉ mục.
- Yêu cầu SQL, Environment Variable và dependency.

### Module Registry

- 22 module mặc định được đăng ký.
- Tự phát hiện thêm route từ DOM.
- Theo dõi module, route, nhóm, vai trò, trạng thái và dependency.
- Tắt tạm module bằng runtime kill switch.
- Không xóa dữ liệu khi tắt module.
- Có nút bật lại toàn bộ module.

### Release Channels

- `stable`: sử dụng hằng ngày.
- `beta`: Admin/TTCM thử trước.
- `lab`: thử nghiệm tính năng nghiên cứu.

### Feature Flags

- Platform Control Center.
- Version Registry.
- Module Registry.
- Module Kill Switch.
- Deep Diagnostics.
- Lab Features.

Cấu hình được lưu riêng trong localStorage và không ghi đè Launcher V4.

### Migration Inventory

Installer tự quét thư mục `supabase/*.sql` và tạo:

```text
public/bes-migrations-v10.88.0.json
```

Mỗi migration có tên file, dung lượng, SHA-256 và thời gian sửa cuối.

### Pre-deploy Gate

Lệnh kiểm tra tổng hợp:

```bash
npm run verify:v10.88
```

Bao gồm:

- Build.
- Test nền.
- Department Test.
- Platform Control Test.
- Platform Doctor.
- Release Guard.

## Dữ liệu được giữ nguyên

- Launcher V4.
- Command Center V10.87 nếu đã cài.
- Brian AI và lịch sử chat.
- Provider và API key.
- Supabase.
- File SQL hiện có.
- Font cá nhân.
- `package-lock.json`.

## Không yêu cầu

- Không cần SQL mới.
- Không cần Environment Variable mới.
- Không thêm dependency.
- Không chạy `npm install` nếu repository đang hoạt động bình thường.

## Cài đặt

### 1. Sao lưu Git

```bash
git status
git add -A
git commit -m "Backup before V10.88.0"
```

Nếu Git báo `nothing to commit, working tree clean`, tiếp tục bước sau.

### 2. Chép gói cập nhật

```bash
rsync -av ~/Downloads/brian-english-studio-v10.88.0-platform-control-center-update-only/ ./
```

Không dùng `--delete`.

### 3. Chạy installer

```bash
node scripts/install-v10.88.0.mjs
```

### 4. Kiểm tra toàn bộ

```bash
npm run verify:v10.88
```

Có thể chạy riêng:

```bash
npm run test:platform-control
npm run platform:doctor
npm run release:guard
npm run build
npm test
npm run test:department
```

### 5. Deploy

Chỉ push khi tất cả kiểm tra đạt:

```bash
git status
git add -A
git commit -m "Add Platform Control Center V10.88.0"
git push origin main
```

Khi Vercel báo Ready, tải lại trang bằng:

```text
Command + Shift + R
```

## Rollback

```bash
npm run rollback:v10.88.0
npm run build
npm test
npm run test:department
```

Rollback khôi phục `package.json`, `index.html`, `version.json` và `package-lock.json` từ backup được installer tạo.

## Asset mới

- `/bes-platform-control-v10880.css`
- `/bes-platform-control-v10880.js`
- `/bes-release-v10.88.0.json`
- `/bes-modules-v10.88.0.json`
- `/bes-feature-flags-v10.88.0.json`
- `/bes-migrations-v10.88.0.json`
- `/bes-platform-build-v10.88.0.json`

## Ghi chú quyền truy cập

Platform Control Center chỉ mở đầy đủ khi runtime phát hiện vai trò `admin` hoặc `ttcm`. Giáo viên không được cung cấp quyền thay đổi channel, flag hoặc module.
