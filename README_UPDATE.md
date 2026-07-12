# Cập nhật Brian English Studio lên V10.86.0

## 1. Sao lưu repository hiện tại

Mở Terminal tại thư mục dự án đang deploy và tạo commit sao lưu trước khi chép bản cập nhật.

```bash
git status
git add -A
git commit -m "Backup before V10.86.0"
```

Nếu không có thay đổi chưa commit, Git có thể báo không có gì để commit.

## 2. Chép gói update-only

Giải nén file `brian-english-studio-v10.86.0-ai-action-governance-update-only.zip` trong thư mục Downloads, sau đó chạy tại thư mục gốc repository:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.86.0-ai-action-governance-update-only/ ./
```

## 3. Cài đặt và kiểm tra

```bash
npm ci
npm run build
npm test
npm run test:department
```

Có thể chạy thêm báo cáo hiệu suất:

```bash
npm run audit:performance
```

## 4. Triển khai

```bash
git add -A
git commit -m "Add AI Action and Governance V10.86.0"
git push origin main
```

Khi Vercel báo **Ready**, tải lại bằng `Command + Shift + R` trên macOS hoặc `Ctrl + Shift + R` trên Windows.

## 5. Mở Trung tâm quản trị AI

Đăng nhập bằng tài khoản Admin `anhtuan@pek.edu.vn`, sau đó mở:

```text
#/ai-governance
```

Trang này chỉ dành cho Admin. Vai trò của tài khoản chính vẫn giữ là `admin`, không đổi thành `ttcm`.

## 6. Lưu ý

- Không cần chạy SQL Supabase.
- Không cần thêm Environment Variable.
- Không chép đè hoặc đóng gói lại font cá nhân.
- Cấu hình hạn mức và audit log hiện lưu cục bộ theo tài khoản trên từng trình duyệt/thiết bị.
- Khi AI bị tạm dừng, Admin có thể bật lại tại `#/ai-governance`.
