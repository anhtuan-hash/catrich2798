# Cập nhật Brian English Studio lên V10.83.2

Bản hotfix này xử lý tình trạng trang `#/apps` chỉ còn nền trắng sau khi triển khai V10.83.1. Không cần chạy thêm SQL vì migration launcher V10.83.1 vẫn được giữ nguyên.

## 1. Chép gói cập nhật

Giải nén `brian-english-studio-v10.83.2-launcher-blank-screen-hotfix-update-only.zip`, mở Terminal tại thư mục gốc của repository đang deploy và chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.83.2-launcher-blank-screen-hotfix-update-only/ ./
```

## 2. Kiểm tra

```bash
npm ci
npm run build
npm test
npm run test:department
```

Kết quả dự kiến:

```text
Production build: thành công
151/151 smoke checks: passed
Admin runtime: passed
TTCM runtime: passed
Teacher runtime: passed
```

## 3. Triển khai

```bash
git add -A
git commit -m "Fix launcher blank screen V10.83.2"
git push origin main
```

Khi Vercel báo **Ready**, mở trang bằng URL có tham số làm mới một lần:

```text
https://esl-pek.vercel.app/?v=10832#/apps
```

Sau đó có thể dùng lại URL thông thường.

## 4. Trường hợp trình duyệt vẫn giữ cấu hình lỗi

Bản V10.83.2 sẽ tự hiển thị màn hình khôi phục thay vì để trắng. Chọn **Khôi phục launcher mặc định**. Cách thủ công trong Console:

```js
localStorage.removeItem('bes-launcher-config-v3');
location.reload();
```

Lệnh trên chỉ xóa bố cục launcher trên trình duyệt, không xóa tài khoản, học liệu, bài kiểm tra hoặc dữ liệu Supabase.
