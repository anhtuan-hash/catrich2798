# V10.71 — Homeroom Academic Calendar

## Nội dung mới

- Cấu hình ngày bắt đầu và kết thúc năm học.
- Cấu hình ngày bắt đầu, mốc giữa kỳ và ngày kết thúc của Học kỳ I.
- Cấu hình ngày bắt đầu, mốc giữa kỳ và ngày kết thúc của Học kỳ II.
- Tự đồng bộ các khoảng tính Giữa kỳ I, Cuối kỳ I, Giữa kỳ II, Cuối kỳ II và Cả năm.
- Kiểm tra lỗi ngày, khoảng thời gian nằm ngoài năm học và hai học kỳ bị chồng lấn.
- Nút điền nhanh theo nhãn năm học của lớp.
- Khi lưu, nhãn năm học và `academicTerms` được cập nhật đồng bộ trong workspace.
- Không cần migration SQL mới; dữ liệu nằm trong `conductSettings.academicCalendar`.
