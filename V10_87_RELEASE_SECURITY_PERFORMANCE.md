# Brian English Studio V10.87.0

## Release, Security & Performance

Ngày phát hành: **12/07/2026**

V10.87.0 bổ sung một lớp kiểm soát phát hành dành cho Admin, tăng cường bảo vệ API AI và pipeline tải file, đồng thời thêm kiểm tra bắt buộc trước khi triển khai.

## 1. Trung tâm cập nhật và phát hành

Đường dẫn dành riêng cho Admin:

```text
#/updates
```

Trang này hiển thị:

- phiên bản, commit và môi trường đang chạy;
- trạng thái các Feature Flag;
- điểm khôi phục cấu hình;
- lớp bảo vệ AI và upload;
- audit log metadata trên thiết bị;
- thao tác xóa cache và tải lại phiên bản mới an toàn.

Tài khoản chính `anhtuan@pek.edu.vn` tiếp tục giữ vai trò `admin`.

## 2. Feature Flags và rollback

Các tính năng có thể được bật theo bốn mức:

```text
Tắt
Chỉ Admin
Admin + TTCM
Tất cả
```

Các flag hiện có:

- Launcher tùy biến;
- Workspace Tabs;
- chuyển nội dung giữa ứng dụng;
- Brian AI Bubble;
- AI Actions;
- Voice Mode;
- Newsroom Reader Mode;
- Upload Security Gateway.

Mỗi lần thay đổi tạo một snapshot cục bộ trước khi lưu. Admin có thể quay lại tối đa 12 điểm gần nhất mà không cần deploy lại frontend.

Sau khi chạy migration `supabase/release_settings_v10_87.sql`, cấu hình được lưu tại bảng `bes_release_settings` và cập nhật qua Supabase Realtime cho các tài khoản đang đăng nhập. Nếu bảng chưa tồn tại hoặc Supabase mất kết nối, site dùng cấu hình cục bộ an toàn thay vì làm trang bị trắng.

## 3. Release Guard

Lệnh mới:

```bash
npm run release:guard
```

Release Guard kiểm tra:

- phiên bản package;
- route quan trọng;
- quyền Admin của Update Center;
- navigation;
- Feature Flags và rollback;
- migration Supabase;
- AI Gateway;
- Upload Gateway;
- manifest phiên bản;
- production build;
- giới hạn kích thước asset;
- chunk lazy của Release Center.

Lệnh kiểm tra tổng hợp:

```bash
npm run verify
```

## 4. AI Gateway được tăng cường

Endpoint `api/ai.js` có thêm:

- kiểm tra same-origin;
- giới hạn kích thước request;
- giới hạn request theo cửa sổ thời gian;
- timeout và AbortController;
- giới hạn output token;
- danh sách mode được phép;
- tùy chọn giới hạn model;
- request ID và rate-limit headers.

Các biến môi trường tùy chọn:

```text
AI_MAX_OUTPUT_TOKENS
AI_REQUEST_TIMEOUT_MS
AI_RATE_LIMIT_PER_MINUTE
OPENAI_ALLOWED_MODELS
```

Không có biến nào trong số này là bắt buộc. Endpoint tiếp tục dùng `OPENAI_API_KEY` hiện có khi được cấu hình.

**Giới hạn hiện tại:** V10.87.0 tăng cường endpoint server hiện có; một số luồng AI lịch sử sử dụng provider do người dùng cấu hình trong trình duyệt chưa được chuyển hoàn toàn sang server gateway.

## 5. Upload Security Gateway

Pipeline tải file của Kho học liệu và Google Drive được bổ sung:

- allowlist phần mở rộng;
- giới hạn dung lượng theo loại;
- đối chiếu MIME và phần mở rộng;
- chặn file thực thi;
- đổi sang tên file an toàn;
- kiểm tra magic bytes cho PDF, PNG, JPEG, GIF và OOXML;
- kiểm tra cả phía client và server trước khi upload Drive.

Giới hạn mặc định:

| Loại | Dung lượng tối đa |
|---|---:|
| Ảnh | 12 MB |
| PDF/DOCX/PPTX/XLSX | 30 MB |
| Audio | 80 MB |
| Video | 300 MB |

**Giới hạn hiện tại:** Gateway đã được tích hợp vào pipeline Kho học liệu/Google Drive. Các màn hình upload cũ khác sẽ được chuyển dần sang gateway chung ở các phiên bản sau.

## 6. Audit log metadata

Hệ thống ghi tối đa 500 sự kiện gần nhất trên thiết bị, gồm:

- route được mở;
- Feature Flag được thay đổi;
- rollback;
- yêu cầu tải lại an toàn;
- các sự kiện quản trị phát qua audit bridge.

Bộ lọc tự loại bỏ metadata có tên liên quan tới:

```text
password, token, secret, API key, prompt, content, body, answer
```

Audit log có thể lọc, tải JSON hoặc xóa trong Update Center.

**Giới hạn hiện tại:** audit log toàn site của V10.87.0 lưu cục bộ theo thiết bị; chưa phải audit trail bất biến lưu trên server.

## 7. Hiệu suất và code splitting

Release Center được lazy-load và có stylesheet riêng:

```text
ReleaseCenter.css: 8.38 KB
ReleaseCenter.js: khoảng 11 KB
```

Production build tiếp tục chia các ứng dụng lớn thành chunk độc lập.

Kết quả audit hiện tại:

```text
Main CSS: 1070.2 KB raw / 154.26 KB gzip
Largest JS: vendor-misc 512.8 KB raw
```

Release Guard vẫn cho phép build nhưng đưa ra cảnh báo đối với main CSS lớn. Việc tách hoàn toàn stylesheet legacy khoảng 1.07 MB chưa hoàn tất trong phiên bản này và cần tiếp tục ở đợt Performance Architecture tiếp theo.

## 8. Manifest phiên bản

File công khai:

```text
public/version.json
```

Ứng dụng có thể đọc manifest để hiển thị phiên bản và yêu cầu migration. V10.87.0 đặt:

```json
{
  "version": "10.87.0",
  "requiresSql": true,
  "requiresEnv": false
}
```

## 9. Kết quả kiểm tra

```text
Production build: thành công
Smoke tests: 191/191 passed
Department runtime: Admin passed
Department runtime: TTCM passed
Department runtime: Teacher passed
Release Guard: 24/24 passed
```

Cảnh báo không chặn phát hành:

```text
Large CSS chunk: index.css khoảng 1070.2 KB
```
