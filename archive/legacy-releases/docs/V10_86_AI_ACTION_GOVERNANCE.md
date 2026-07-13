# Brian English Studio V10.86.0 — AI Action & Governance

## Mục tiêu

V10.86.0 nâng Brian AI từ một cửa sổ trò chuyện thành trợ lý có thể đề xuất và thực hiện các thao tác an toàn giữa những ứng dụng đang có. Phiên bản này đồng thời bổ sung một trung tâm quản trị AI để Admin theo dõi hạn mức, tác vụ, provider và nhật ký hoạt động trên thiết bị đang sử dụng.

## 1. AI Action Engine

Trong mỗi câu trả lời của Brian AI, nút **Hành động** mở danh sách thao tác phù hợp với ngữ cảnh hiện tại.

Các đích đang hỗ trợ:

- Dùng nội dung trong ứng dụng hiện tại.
- Gửi sang Worksheet Factory.
- Gửi sang Exam Studio.
- Gửi sang WordGraph Studio.
- Gửi sang TextLab Activities.
- Lưu vào Thư viện cá nhân.

Luồng thao tác:

1. AI tạo kết quả.
2. Người dùng chọn **Hành động**.
3. Hệ thống hiển thị mục tiêu và bản xem trước.
4. Người dùng xác nhận **Thực hiện**.
5. Nội dung được chuyển bằng Connected Workflow của V10.85.0.

Các thao tác làm thay đổi dữ liệu không được thực hiện ngầm. Phiên bản này không tự gửi email, thay đổi quyền, duyệt hồ sơ, xóa dữ liệu hoặc xuất bản đề thi.

## 2. Trung tâm quản trị AI

Đường dẫn dành cho Admin:

```text
#/ai-governance
```

Admin có thể:

- Tạm dừng hoặc bật lại các yêu cầu AI.
- Bật/tắt AI Action Engine.
- Yêu cầu xác nhận trước khi thực hiện hành động.
- Đặt giới hạn số yêu cầu mỗi ngày.
- Đặt ngân sách token ước tính mỗi ngày.
- Đặt trần output token chung.
- Bật/tắt từng đích hành động.
- Cấu hình output token theo nhóm tác vụ.
- Xem thống kê provider/model.
- Xem bảng sử dụng 14 ngày gần đây.
- Lọc nhật ký thành công, lỗi và hành động.
- Xuất báo cáo JSON.
- Đặt lại bộ đếm, nhật ký hoặc cấu hình.

## 3. Quản trị tập trung ở lớp AI dùng chung

Mọi ứng dụng gọi qua `callAI()` đều dùng cùng một lớp kiểm soát:

- Kiểm tra AI có đang bị tạm dừng không.
- Kiểm tra hạn mức yêu cầu trong ngày.
- Kiểm tra ngân sách token ước tính.
- Giới hạn output token theo hồ sơ tác vụ.
- Ghi provider, model, thời lượng và trạng thái yêu cầu.
- Giữ nguyên cơ chế provider fallback hiện có.

Các ứng dụng không gọi qua `callAI()` sẽ không tự động được thống kê bởi lớp này.

## 4. Nhật ký và quyền riêng tư

Nhật ký có thể ghi:

- Tài khoản đang sử dụng.
- Ứng dụng/route nguồn.
- Provider và model.
- Thời gian xử lý.
- Token ước tính.
- Kết quả thành công hoặc lỗi.
- Hành động liên ứng dụng đã xác nhận.

Nội dung đầy đủ của prompt và câu trả lời không được đưa vào nhật ký quản trị. Hệ thống chỉ giữ metadata cần thiết cho việc chẩn đoán và thống kê.

## 5. Phạm vi đồng bộ của V10.86.0

Cấu hình, hạn mức và audit log của AI Governance hiện được lưu cục bộ theo tài khoản trên **trình duyệt/thiết bị đang dùng**. Chúng áp dụng cho toàn bộ ứng dụng trong phiên bản Brian English Studio trên thiết bị đó, nhưng chưa đồng bộ qua Supabase sang thiết bị khác.

Không cần chạy SQL migration và không cần Environment Variable mới.

## 6. System Health Center

Trang `#/qa` có thêm:

- Trạng thái AI Governance.
- Số yêu cầu AI trong ngày.
- Số hành động đã thực hiện.
- Truy cập nhanh tới `#/ai-governance` cho Admin.
- Báo cáo runtime phiên bản 10.86.0.

## 7. Tương thích

V10.86.0 giữ lại toàn bộ tính năng của V10.85.0:

- Workspace Tabs.
- Content Transfer Hub.
- Version History.
- Offline Sync Queue.
- Configuration Migration Engine.

Migration cấu hình được mở rộng để chuẩn hóa schema của AI Governance trước khi sử dụng.

## 8. Kiểm tra đã chạy

```text
npm run build
npm test
npm run test:department
npm run audit:performance
```

Kết quả chức năng:

- Production build thành công.
- 179/179 smoke checks đạt.
- Runtime Admin, TTCM và giáo viên đạt.

Performance audit hiện vẫn chỉ ra stylesheet toàn site lớn hơn 1 MB. Đây là điểm cần tiếp tục xử lý ở phiên bản tối ưu hiệu suất sau, không phải lỗi chặn triển khai V10.86.0.
