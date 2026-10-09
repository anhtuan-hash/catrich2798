# BRIAN Assessment Studio — Teacher-operated 12-module beta (No AI)

## Mục tiêu
Đánh giá học sinh theo công cụ/rubric rõ ràng, thống kê dựa trên dữ liệu thực,
ghi nhật ký điều chỉnh và lập hồ sơ minh chứng. **Không sử dụng AI** cho chấm,
xây dựng nội dung, phân tích, hay viết nhận xét trong Assessment Studio.

## Phạm vi hiện thực
Tất cả 12 công cụ đã có form để giáo viên **tạo bài và nhập/chấm kết quả đã thực hiện**:
| Mã | Sản phẩm | Cơ chế đánh giá |
|---|---|---|
| speaking | SpeakScale | 5 tiêu chí rubric do giáo viên chọn rõ từng điểm 0–4 |
| diagnostic | DiagnosticScan | Trắc nghiệm A–D, tự chấm đáp án và phân tích từng chủ điểm |
| exit | ExitTicket | 1–3 MCQ cuối tiết, lưu thêm nhận xét/phản hồi |
| error | ErrorClinic | Câu sửa lỗi, giáo viên nhập đáp án thực tế và chấm Đạt/Chưa đạt |
| vocabulary | VocabCheck | MCQ về từ vựng/collocations/word forms |
| reading | ReadProof | MCQ + mã đoạn chứng minh P1, P2...; 1 điểm đáp án, 1 điểm dẫn chứng |
| listening | ListenCheck | MCQ kèm liên kết http/https tới tài liệu nghe hợp pháp |
| writing | WriteRubric | Bài viết + chấm thủ công 4 tiêu chí + nhận xét |
| rewrite | RewriteLab | Sentence transformation; giáo viên duyệt và chấm từng câu |
| self | CanDo Check | Học sinh tự đánh giá thang 1–4; **không phải điểm năng lực khách quan** |
| peer | PeerRubric | Rubric đồng đẳng, yêu cầu ghi người đánh giá và tiêu chí |
| project | ProjectMark | Rubric 4 tiêu chí, yêu cầu tên/mô tả sản phẩm |

### Điều chưa có trong phiên bản này
- **Chưa có cổng trực tuyến cho học sinh tự đăng nhập và làm bài**, gửi bản ghi âm
  hoặc chấm rubric đồng đẳng trực tiếp; giáo viên nhập/chuyển kết quả đã thu thập.
- Chưa đồng bộ roster từ Homeroom, chưa có tải lên file minh chứng gốc.
- Chưa có lịch sử thay đổi không thể sửa/xóa; cần bổ sung audit trail và khóa hồ sơ
  trước khi coi đây là kho minh chứng chính thức phục vụ thẩm định.
- PDF hiện do trình duyệt in từ HTML báo cáo; không phải dịch vụ phát hành PDF có chữ ký số.
- Chưa có dữ liệu sử dụng trong lớp hoặc chứng minh mức tiến bộ thực tế.
- Không tuyên bố bản beta đáp ứng toàn bộ tiêu chí thi đua nếu thiếu hồ sơ triển khai thật.

## Luồng sử dụng giáo viên
1. Đăng nhập người dùng có quyền **Assessment Core**.
2. Mở URL hash **#/assessment-studio** từ menu Đánh giá hoặc Ngân hàng câu hỏi.
3. Chọn một trong 12 công cụ, nhập tên đợt, lớp, mục tiêu, câu hỏi / rubric tương ứng.
4. Tổ chức bài đánh giá với học sinh. Giáo viên nhập bài làm, chấm hoặc chọn rubric
   theo kết quả quan sát thật. **Không có điểm mặc định**: cần chọn điểm từng tiêu chí.
5. Nhập mã học sinh ổn định, tên học sinh, kết quả; xem thống kê. Với MCQ và ReadProof có thể dán **hàng loạt tối đa 80 dòng** từ Excel, xem trước dữ liệu, sau đó mới xác nhận lưu.
6. Tạo Teaching Adjustment Record và ghi ngày, biện pháp đã thực hiện, nguồn minh chứng.
7. Tạo bài đánh giá sau và liên kết vào nhật ký; ghép theo **mã học sinh** để so sánh.
8. Xuất CSV nội bộ (có tên) hoặc PDF báo cáo **ẩn tên mặc định**. PDF gồm công cụ,
   đáp án/rubric, kết quả, biện pháp, so sánh trước–sau và giới hạn chứng cứ.

## Mẫu nhập
- MCQ: mỗi dòng gồm Question | A | B | C | D | Correct (A–D) | Topic.
- ReadProof: mỗi dòng gồm Question | A | B | C | D | Correct | Skill | Evidence P1;
  đoạn đọc phân cách bằng **một dòng trống**; mã P1, P2 tự tăng.
- ErrorClinic / RewriteLab: mỗi dòng gồm Task | Sample Answer | Topic.
- CanDo Check: mỗi dòng là một phát biểu I can.
- Speaking, Writing, Project, Peer: rubric cố định để tiết kiệm công xây dựng.
- Nhập hàng loạt (MCQ): Mã HS | Họ tên | Chuỗi đáp án. ReadProof: thêm cột mã dẫn chứng. Dán trực tiếp từ Excel dạng Tab hoặc ngăn cách ký tự |; mọi dòng phải hợp lệ trước khi bấm Lưu.

## Cơ sở dữ liệu — bước triển khai thủ công bắt buộc
Không chạy bất cứ lệnh migration nào trên production trước khi backup và kiểm duyệt.

**Dự án chưa áp dụng MVP trước đó**:
1. Sao lưu Supabase, xem xét chính sách xử lý dữ liệu cá nhân.
2. Chạy **supabase/brian_assessment_studio_mvp.sql**.
3. Chạy tiếp **supabase/brian_assessment_studio_expand_12.sql**.
4. Xác minh RLS, ba bảng và chính sách owner-only, kiểm tra role teacher/admin.
5. Kiểm tra người dùng A không thể đọc, sửa hoặc tạo bản ghi cho giáo viên B.

**Dự án đã chạy migration MVP 3 công cụ**:
- Chỉ chạy migration mở rộng **supabase/brian_assessment_studio_expand_12.sql**
  sau khi sao lưu và kiểm tra dữ liệu hiện có. Constraint chứng minh trạng thái
  yêu cầu ngày thực hiện và ghi chú; dữ liệu legacy thiếu hai thông tin này có thể
  khiến migration dừng để người quản trị rà soát.

## Kiểm thử
- Node unit tests: node --test tests/assessment-studio.test.mjs
- UI/build smoke: npx vite build
- GitHub CI: Assessment Studio (No AI) và Frontend Build.
- Kiểm thử chưa thay thế thử nghiệm phân quyền với hai tài khoản riêng,
  kiểm tra dữ liệu thật, sử dụng trên điện thoại và trải nghiệm trong lớp.

## Định hướng sau beta
- Cổng học sinh có xác thực, chỉ xem bài được giao, không tiết lộ đáp án.
- Tích hợp danh sách lớp có phân quyền, lưu bài làm trực tuyến, tiếp nhận file.
- File minh chứng theo storage bucket riêng, chính sách lưu/xóa minh bạch.
- Audit log append-only, đóng băng hồ sơ và quyền tạo bản sửa có lý do.
- Các chức năng trên vẫn không dùng AI, LLM hay dịch vụ chấm tự động bằng AI.
