# V12.12.0 Test Report — Universal Search Index

## Phạm vi

- Universal Search Index runtime.
- Tích hợp phạm vi Nội dung vào UICommandCenter.
- Quyền truy cập tài liệu.
- Deep link tới Library, Resource Library và Activity Center.
- Build production, smoke tests và Department runtime.

## Kết quả

| Hạng mục | Kết quả |
|---|---:|
| Structural verifier | 22/22 PASS |
| Universal Search runtime tests | 18/18 PASS |
| Production build | PASS |
| Vite modules transformed | 315 |
| Smoke tests | 179/179 PASS |
| Department Admin | PASS |
| Department TTCM | PASS |
| Department Teacher | PASS |
| Performance budget | PASS |
| Development server | PASS |
| Local HTTP response | 200 OK |
| Served version | 12.12.0 |

## Các hợp đồng đã xác nhận

- Có sáu phạm vi: All, Apps, Pages, Workspaces, Actions và Content.
- Tiền tố `~` mở tìm kiếm nội dung.
- `Command/Ctrl + Shift + F` mở trực tiếp Content scope.
- Chỉ mục bao gồm History, Prompts, Question Bank, Resource Library và Activity Center.
- Chỉ mục bị giới hạn 720 mục và 6.000 ký tự tìm kiếm cho mỗi mục.
- Tài liệu đã xóa bị loại bỏ.
- Tài liệu private của người khác bị loại bỏ với giáo viên thường.
- Admin/TTCM vẫn nhìn thấy nội dung theo quyền quản lí.
- Kết quả mở đúng tab/mục bằng deep link.
- Ô tìm kiếm tiếp tục được khóa `writing-mode: horizontal-tb` và `min-width: 0`.
- Brian Unified, Material 3 và Apple adapter được giữ nguyên.
- Không cần migration SQL.
- Không chứa font nhị phân.

## Kiểm thử trình duyệt

Máy chủ Vite đã trả về HTTP 200 và đúng `version.json`. Chromium trong môi trường đóng gói bị chính sách hệ thống chặn truy cập localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`), nên chưa có visual-regression screenshot tự động. Cần xác nhận trực quan một lần sau deploy bằng tài khoản thật.

## Cảnh báo build

Vite báo các URL font cá nhân không tồn tại trong môi trường đóng gói. Đây là dự kiến vì font không được đưa vào ZIP. Lệnh `rsync` trong hướng dẫn bảo toàn font đang có của dự án production.
