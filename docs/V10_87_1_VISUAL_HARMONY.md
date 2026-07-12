# V10.87.1 Visual Harmony — Technical Notes

## Nguyên nhân giao diện V10.87.0 hiển thị chưa đồng nhất

Command Center được chèn vào toàn site, trong khi nhiều ứng dụng con có quy tắc CSS chung cho `button`, `input`, card và chế độ dark. Các quy tắc đó có thể tải sau stylesheet của Command Center và làm nút đổi nền, tăng padding, mất bo góc hoặc tạo card tối không đúng thiết kế.

## Giải pháp V10.87.1

1. Dùng selector có phạm vi `#bes-command-overlay`, `#bes-command-dock` và `#bes-command-trigger`.
2. Reset control cục bộ, sau đó áp dụng lại kích thước và trạng thái bằng selector cụ thể.
3. Không phụ thuộc Dark Mode của hệ điều hành; Command Center sử dụng bảng màu riêng ổn định.
4. Giữ nguyên storage key `bes-command-center-v10870`, do đó không làm mất cấu hình của người dùng.
5. Tách asset sang `v10871` để tránh cache cũ.
6. Thêm `data-bescc-tone` cho card để phân màu theo nhóm mà không thay đổi route hoặc dữ liệu.

## Bảng màu

- Navy: cấu trúc, header và trạng thái chính.
- Blue: ứng dụng giảng dạy và hành động chính.
- Cyan: tài nguyên và điểm nhấn điều hướng.
- Violet: kỹ năng.
- Amber: kiểm tra.
- Green: chuyên môn và học sinh.
- Red: quản trị hoặc cảnh báo.

## Breakpoints

- Trên 1040 px: 3 cột.
- 621–1040 px: 2 cột.
- Dưới 620 px: 1 cột.
- Dưới 820 px: sidebar chuyển thành thanh điều hướng ngang.

## Không thay đổi

- Không thay route.
- Không thay Launcher V4.
- Không thay Supabase.
- Không thay quyền Admin/Teacher.
- Không thêm package.
