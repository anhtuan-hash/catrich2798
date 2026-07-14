# V10.82.6 · Vietnam Tax Studio

## Tích hợp

- Thêm thẻ **Tính thuế TNCN 2026** tại trang Ứng dụng.
- Route: `#/tool/vietnam-tax`.
- Giao diện đồng bộ Brian English, khung nội dung tối đa 1320px, không kéo thẻ sát hai viền.
- Không thêm dependency mới.

## Chức năng

- Nhập lương Gross, số người phụ thuộc, vùng lương tối thiểu và mức lương đóng bảo hiểm.
- Tính BHXH, BHYT, BHTN phía người lao động.
- So sánh biểu thuế 7 bậc trước 01/07/2026 với biểu thuế 5 bậc từ 01/07/2026.
- Dùng mức giảm trừ 2026: 15,5 triệu đồng cho bản thân và 6,2 triệu đồng/người phụ thuộc; có tùy chọn xem mức lịch sử.
- Hiển thị lương Net, thuế giảm, thu nhập tính thuế, bảng từng bậc và đường mô phỏng mức giảm thuế.
- In báo cáo và xuất CSV.
- Responsive, dark mode và song ngữ Việt/Anh.

## Lưu ý pháp lý

Công cụ là mô phỏng tham khảo, không thay thế tư vấn thuế hoặc kết quả quyết toán của cơ quan thuế. Những khoản miễn giảm, phụ cấp, thu nhập không chịu thuế và trường hợp đặc biệt có thể làm kết quả thực tế khác với mô phỏng.

## Nguồn gốc

Tích hợp và phát triển từ dự án mã nguồn mở **Vietnam Tax Calculator** của Viet Vu Danh; phần giao diện, logic 2026 và cơ chế tích hợp đã được điều chỉnh cho Brian English Studio.
