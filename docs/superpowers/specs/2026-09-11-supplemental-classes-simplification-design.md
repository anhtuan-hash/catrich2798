# Học bổ sung — Thiết kế đơn giản hóa theo lớp học

Ngày: 2026-09-11

## 1. Bối cảnh

Luồng Học bổ sung hiện tại đang để lộ quá nhiều khái niệm kỹ thuật cho người dùng: hồ sơ học sinh dùng chung, liên kết học sinh chính thức, nhóm dài ngày, thành viên theo khoảng hiệu lực và buổi phát sinh. Cấu trúc này làm thao tác tạo một lớp, thêm người học và điểm danh trở nên khó hiểu.

Trong cơ sở dữ liệu hiện tại, Học bổ sung đã có hệ dữ liệu riêng gồm `bes_supplemental_students`, `bes_supplemental_groups`, `bes_supplemental_group_memberships`, `bes_supplemental_sessions` và `bes_supplemental_session_participants`. `bes_supplemental_groups` đã chứa phần lớn thông tin cần thiết của một lớp dài hạn và các buổi học định kỳ đã được sinh từ lịch của nhóm. Vì vậy thay đổi này sẽ giữ dữ liệu/ID/lịch sử hiện có, nhưng đổi mô hình sản phẩm từ “nhóm + buổi phát sinh” sang một khái niệm duy nhất mà người dùng nhìn thấy: **Lớp học bổ sung**.

Hệ Phụ đạo/Bồi dưỡng hiện có đã có các quy tắc tốt về quản lý lớp, trạng thái học sinh và lưu ảnh chụp lịch sử điểm danh. Học bổ sung sẽ bám theo cùng trải nghiệm và quy tắc nghiệp vụ, nhưng không nhập các bảng dữ liệu hiện có vào `bes_extra_*` trong lần thay đổi này vì việc đó tạo rủi ro không cần thiết đối với lịch sử đang tồn tại.

## 2. Mục tiêu

1. Giao diện Học bổ sung chỉ xoay quanh lớp học, không buộc người dùng hiểu “nhóm dài ngày”, “buổi phát sinh” hay “liên kết học sinh chính thức”.
2. Cho phép tạo và sửa lớp thủ công với các thông tin thực tế cần dùng để dạy và điểm danh.
3. Cho phép thêm/quản lý học sinh thủ công theo từng lớp, gồm trạng thái **Đang học** và **Ngừng học**.
4. Cho phép thêm/xóa nhiều giáo viên thủ công trên từng lớp. Giáo viên này chỉ là thông tin phụ trách, không sinh quyền truy cập.
5. Điểm danh và lịch sử Học bổ sung có hành vi nhất quán với Phụ đạo/Bồi dưỡng: danh sách tại thời điểm điểm danh, Có mặt/Vắng/Đi trễ, lý do vắng khi áp dụng, minh chứng, lịch sử và báo cáo.
6. Giữ toàn bộ lịch sử điểm danh và dữ liệu cũ khi học sinh ngừng học hoặc lớp bị xóa khỏi danh sách hoạt động.
7. Khóa quyền Học bổ sung ở backend: **chỉ Admin đã được duyệt và đúng tài khoản Nguyễn Thị Hồng Thắm** được xem, tạo, sửa, xóa, điểm danh hoặc xem lịch sử Học bổ sung.

## 3. Không thuộc phạm vi

- Không cấp quyền Học bổ sung cho giáo viên chỉ vì họ được ghi tên trong lớp.
- Không cấp quyền dựa trên các quyền Điểm danh chung như `attendance:manage`, `attendance:quick`, `attendance:history`, `attendance:report` hoặc `route:attendance`.
- Không xây màn hình cấu hình để Admin cấp quyền Học bổ sung cho tài khoản khác.
- Không tiếp tục cung cấp giao diện tạo “Buổi phát sinh”.
- Không tiếp tục cung cấp giao diện “Liên kết với học sinh chính thức”.
- Không xóa vật lý các bản ghi cũ chỉ để làm sạch mô hình dữ liệu.
- Không thay toàn bộ engine Phụ đạo/Bồi dưỡng hoặc gộp dữ liệu Học bổ sung vào `bes_extra_*` trong thay đổi này.

## 4. Mô hình quyền bắt buộc

### 4.1 Danh tính được phép

Backend tạo một hàm kiểm tra duy nhất, ví dụ `private.bes_require_supplemental_manager()` hoặc hàm boolean tương đương. Quyền chỉ hợp lệ khi profile đã được duyệt và thỏa một trong hai điều kiện:

- `role` là `admin` hoặc `administrator`; hoặc
- `profiles.id = '4c89bfa1-9e3f-4965-a082-99f6e974f5ba'`, là profile hiện tại của tài khoản Nguyễn Thị Hồng Thắm (`username = 'hongtham'`).

Việc nhận diện ngoại lệ Nguyễn Thị Hồng Thắm phải dùng **UUID profile ổn định**, không so sánh `full_name`, tên hiển thị, email hoặc tên giáo viên trong lớp.

### 4.2 Quy tắc từ chối

- Giáo viên thông thường luôn bị từ chối dù có quyền Điểm danh chung.
- Giáo viên được thêm vào danh sách giáo viên của lớp Học bổ sung vẫn bị từ chối.
- Tài khoản chưa được duyệt bị từ chối, kể cả khi role là Admin.
- Các RPC đọc lịch sử/báo cáo Học bổ sung cũng phải dùng cùng kiểm tra chặt chẽ; không có khái niệm “reader” rộng hơn manager.
- Các RPC Học bổ sung không được dựa riêng vào `private.bes_attendance_access_decision()` hiện tại vì quyết định toàn cục này có các lối cho quyền Điểm danh/Báo cáo chung. Học bổ sung phải kiểm tra quyền riêng trước mọi thao tác đọc/ghi/điểm danh.
- Nếu lịch sử/báo cáo Điểm danh tổng hợp dùng một RPC chung cho nhiều loại lớp, các hàng `activity_type = supplemental` phải bị loại khỏi kết quả đối với người không có quyền Học bổ sung.

Frontend chỉ dùng cùng quy tắc để ẩn/hiện tab và nút. Backend/RLS/RPC mới là nguồn quyết định cuối cùng; việc gọi RPC trực tiếp từ DevTools bằng tài khoản không hợp lệ vẫn phải trả lỗi quyền, ưu tiên SQLSTATE `42501`.

## 5. Trải nghiệm người dùng mới

### 5.1 Trang chính Học bổ sung

Màn hình mở trực tiếp vào **Danh sách lớp học bổ sung**. Phần đầu có nút **+ Tạo lớp học bổ sung**. Mỗi thẻ lớp hiển thị tối thiểu:

- Tên lớp
- Môn học
- Khối
- Phòng học
- Lịch học/khung giờ
- Giáo viên phụ trách
- Số học sinh đang học
- Trạng thái lớp

Các hành động chính: **Quản lý**, **Điểm danh**, **Lịch sử**, **Xóa lớp**.

Không còn thanh điều hướng “Học sinh / Nhóm dài ngày / Buổi phát sinh”. Không còn danh sách hồ sơ học sinh toàn cục ở tầng đầu.

### 5.2 Tạo/Sửa lớp

Biểu mẫu lớp gồm:

- Tên lớp — bắt buộc
- Môn học — bắt buộc
- Khối — bắt buộc
- Phòng học — tùy chọn
- Từ ngày / đến ngày — bắt buộc khi lớp có lịch định kỳ
- Một hoặc nhiều thứ học trong tuần — bắt buộc khi lớp có lịch định kỳ
- Giờ bắt đầu / giờ kết thúc — bắt buộc khi lớp có lịch định kỳ
- Ghi chú — tùy chọn
- Trạng thái hoạt động

Các trường lịch hiện có của `bes_supplemental_groups` được tái sử dụng. Có thể bổ sung trường `note` và thông tin archive nếu schema hiện tại chưa có.

### 5.3 Học sinh trong lớp

Mỗi lớp có tab/khối **Học sinh** riêng. Thêm học sinh thủ công với:

- Họ và tên — bắt buộc
- Lớp chính khóa — tùy chọn
- Mã học sinh — tùy chọn

Mỗi dòng học sinh hiển thị trạng thái **Đang học** hoặc **Ngừng học** và có các hành động phù hợp: sửa thông tin, chuyển sang Ngừng học, kích hoạt lại; thao tác xóa phải tuân theo quy tắc lịch sử ở mục 7.

Việc thêm học sinh từ giao diện mới tạo/đảm bảo một bản ghi `bes_supplemental_students` và một membership của lớp trong cùng thao tác nghiệp vụ. Người dùng không nhìn thấy hai khái niệm này.

Không hiển thị `source_type`, `official_key`, `linked_official_key`, “Học sinh chính thức” hoặc nút liên kết. Dữ liệu legacy liên quan các trường này vẫn được giữ để không phá lịch sử.

### 5.4 Giáo viên trong lớp

Mỗi lớp có danh sách nhiều giáo viên phụ trách. Mỗi giáo viên tối thiểu có:

- Họ và tên — bắt buộc
- Email — tùy chọn

Dữ liệu giáo viên chỉ dùng để mô tả lớp/báo cáo, **không bao giờ được dùng làm điều kiện cấp quyền**. Nếu hệ thống lưu `teacher_id` khi khớp được profile thì đây vẫn chỉ là metadata.

Nên bổ sung bảng chuẩn hóa kiểu `bes_supplemental_group_teachers` để hỗ trợ nhiều giáo viên, tương tự mô hình giáo viên nhiều người của lớp Phụ đạo/Bồi dưỡng. Các cột giáo viên đơn hiện tại trên `bes_supplemental_groups` được giữ trong giai đoạn tương thích; dữ liệu cũ được backfill thành giáo viên đầu tiên của lớp hoặc được đọc qua lớp tương thích.

### 5.5 Điểm danh

Nút **Điểm danh** mở luồng điểm danh của lớp đã chọn. Danh sách điểm danh được lấy từ học sinh **Đang học** có hiệu lực vào ngày của buổi học. Khi bắt đầu/khóa danh sách, hệ thống lưu snapshot học sinh vào session participants để các thay đổi về sau không sửa ngược lịch sử.

Trạng thái điểm danh phải bám hành vi hiện tại của hệ Điểm danh: **Có mặt / Vắng / Đi trễ**, cùng lý do/ghi chú vắng nếu các RPC hiện hành yêu cầu. Minh chứng ảnh, ghi chú buổi học, trạng thái xác nhận/hủy và các quy tắc audit hiện hữu được tái sử dụng thay vì tạo một engine song song.

Giáo viên được ghi trong lớp không được mở điểm danh. Chỉ hai nhóm danh tính tại mục 4 được thao tác.

### 5.6 Lịch sử

Lịch sử của một lớp hiển thị các buổi đã xác nhận/hủy và danh sách học sinh snapshot tại thời điểm đó. Học sinh đã Ngừng học hoặc lớp đã archive vẫn xuất hiện đầy đủ trong lịch sử cũ.

## 6. Chiến lược dữ liệu và tương thích

### 6.1 Giữ schema hiện tại làm nền

Không đổi khóa chính và không chuyển dữ liệu sang `bes_extra_*`. `bes_supplemental_groups` trở thành thực thể **Lớp học bổ sung** ở tầng sản phẩm. Tên bảng “groups” có thể tiếp tục tồn tại nội bộ để tránh migration phá vỡ; API/UI mới dùng thuật ngữ class/lớp.

`bes_supplemental_group_memberships` tiếp tục là quan hệ học sinh–lớp. `effective_from`/`effective_until` được dùng để biểu diễn Đang học/Ngừng học. `bes_supplemental_sessions` và `bes_supplemental_session_participants` tiếp tục lưu lịch và snapshot điểm danh.

### 6.2 Dữ liệu legacy

- Các group cũ được hiển thị như lớp học bổ sung.
- Membership cũ được hiển thị như học sinh của lớp.
- Session `kind = recurring` tiếp tục là các buổi định kỳ.
- Session `kind = adhoc` đã tồn tại vẫn được giữ và vẫn phải xem được trong lịch sử; giao diện mới chỉ bỏ chức năng tạo adhoc mới.
- Hồ sơ official/linked đã tồn tại vẫn được giữ và có thể tham gia lịch sử; giao diện mới không cho tạo/liên kết thêm theo mô hình cũ.
- Proof path, checked-by snapshot, attendance status và các participant snapshot không thay đổi khóa hoặc bị xóa.

### 6.3 Thêm nhiều giáo viên

Bổ sung bảng liên kết giáo viên theo lớp, có `group_id`, `teacher_id` tùy chọn, `teacher_name`, `teacher_email`, thứ tự hiển thị và audit fields. Backfill giáo viên đơn hiện có sang bảng mới. Trong giai đoạn tương thích, các trường `teacher_*` trên group/session vẫn được duy trì như snapshot/giáo viên chính để các báo cáo và lịch cũ không gãy.

## 7. Xóa, Ngừng học và bảo toàn lịch sử

### 7.1 Học sinh

- **Ngừng học** đóng membership bằng `effective_until`/trạng thái tương đương và lý do tùy chọn.
- Học sinh Ngừng học không xuất hiện trong roster của buổi tương lai.
- Các participant/snapshot của buổi cũ không bị sửa hoặc xóa.
- **Kích hoạt lại** tạo lại/khôi phục khoảng membership mới mà không chỉnh sửa quá khứ.
- “Xóa” một học sinh đã có lịch sử được thực thi như ngừng học/ẩn khỏi lớp, không xóa vật lý bản ghi lịch sử.

### 7.2 Lớp

Nút **Xóa lớp** trong giao diện là thao tác archive an toàn: lớp không còn xuất hiện trong danh sách hoạt động và không sinh buổi tương lai, nhưng lịch sử vẫn truy cập được trong chế độ đã lưu trữ. Schema có thể dùng `active = false` kết hợp `archived_at`/`archived_by` để audit rõ ràng.

Không cascade delete attendance history. Hard delete không thuộc phạm vi thay đổi này.

## 8. API/RPC hướng lớp học

Frontend mới không tiếp tục gọi API theo mô hình “student registry / group / adhoc session” một cách trực tiếp. Có thể giữ bảng/RPC cũ bên dưới để tương thích, nhưng adapter mới phải cung cấp một bề mặt nghiệp vụ theo lớp, ví dụ:

- `bes_list_supplemental_classes`
- `bes_upsert_supplemental_class`
- `bes_archive_supplemental_class`
- `bes_list_supplemental_class_members`
- `bes_upsert_supplemental_class_member`
- `bes_set_supplemental_class_member_status`
- `bes_set_supplemental_class_teachers`
- các RPC begin/confirm/cancel/proof/history hiện có được điều chỉnh để nhận class/session tương ứng

Tên RPC cuối cùng có thể khác nếu implementation giữ facade ở JavaScript, nhưng **giao diện frontend phải là class-centric** và mọi RPC được gọi đều phải chạy kiểm tra quyền riêng Học bổ sung trước khi đọc/ghi.

Các RPC legacy liên quan `linkSupplementalStudent` và tạo adhoc session không được frontend mới sử dụng. Chúng có thể được giữ tạm để migration an toàn, nhưng phải tiếp tục được khóa bằng cùng quyền Học bổ sung nếu còn callable.

## 9. Luồng dữ liệu

1. Người dùng hợp lệ mở tab Học bổ sung → frontend tải danh sách lớp qua RPC đã kiểm tra quyền.
2. Tạo lớp → một transaction ghi thông tin lớp, giáo viên ban đầu và lịch định kỳ cần thiết.
3. Thêm học sinh → một transaction tạo/tái sử dụng hồ sơ supplemental phù hợp và membership lớp; không để trạng thái “có student nhưng chưa vào lớp” do lỗi giữa chừng.
4. Sửa lịch lớp → chỉ các session tương lai chưa freeze/chưa xác nhận được điều chỉnh hoặc tái sinh; session cũ giữ nguyên snapshot.
5. Bắt đầu điểm danh → freeze roster từ membership có hiệu lực trong ngày đó.
6. Xác nhận → ghi status/reason/note/proof theo transaction và cập nhật counts.
7. Ngừng học/archive → chỉ ảnh hưởng roster và lịch tương lai, không ảnh hưởng lịch sử đã freeze/xác nhận.

## 10. Validation, lỗi và đồng thời

- Tên lớp, môn, khối và thông tin lịch bắt buộc phải được validate cả frontend và backend.
- Ngày kết thúc không trước ngày bắt đầu; giờ bắt đầu khác giờ kết thúc; phải có ít nhất một thứ học nếu dùng lịch định kỳ.
- Thao tác trên lớp đã archive bị từ chối trừ một RPC khôi phục riêng nếu sau này sản phẩm cần; khôi phục không thuộc phạm vi hiện tại.
- Thay danh sách giáo viên và thay trạng thái membership phải chạy transaction để không có cập nhật một nửa.
- Bắt đầu/xác nhận attendance phải giữ các guard/idempotency hiện có để tránh double-submit.
- Lỗi quyền trả `42501` hoặc mã lỗi tương đương có thể nhận diện ổn định; frontend hiển thị thông báo ngắn gọn, không lộ chi tiết SQL.

## 11. Thay đổi frontend dự kiến

Các file chính:

- `src/supplementalLearningBootstrap.js`: thay màn hình quản trị hiện tại bằng class list + class detail; thay `isAdmin()` bằng kiểm tra “supplemental manager”; loại bỏ UI official-link, global student registry và adhoc creation.
- `src/attendance/supplementalLearningApi.js`: chuyển adapter sang các thao tác class/member/teacher; giữ attendance/history helpers cần thiết.
- `src/styles/SupplementalLearning.css`: thiết kế lại layout theo danh sách lớp và trang quản lý lớp, đồng thời giữ modal hiện tại không tạo nested backdrop.
- Các component/helper dùng chung của Attendance có thể được trích dùng nếu giúp Học bổ sung có cùng hành vi với Phụ đạo/Bồi dưỡng mà không tạo phụ thuộc vòng.

## 12. Migration/backend dự kiến

Tạo migration mới sau các migration Học bổ sung 2026-09-11 hiện tại. Migration phải:

1. Thêm/đổi helper quyền Học bổ sung theo mục 4 và khóa toàn bộ RPC supplemental bằng helper này.
2. Siết các RPC lịch sử/báo cáo tổng hợp để không lộ activity supplemental cho tài khoản khác.
3. Bổ sung bảng nhiều giáo viên và các trường lớp còn thiếu như note/archive audit nếu cần.
4. Backfill giáo viên cũ mà không xóa cột hoặc session cũ.
5. Bổ sung RPC/facade class-centric hoặc các RPC transaction hỗ trợ lớp/member/teacher.
6. Giữ RLS và revoke quyền trực tiếp trên bảng; client thao tác qua RPC có kiểm soát.
7. Không xóa dữ liệu legacy.

## 13. Kiểm thử chấp nhận

### Phân quyền

- Admin đã duyệt: thấy tab Học bổ sung và thực hiện được toàn bộ chức năng.
- Nguyễn Thị Hồng Thắm, profile UUID `4c89bfa1-9e3f-4965-a082-99f6e974f5ba`: thấy tab và thực hiện được toàn bộ chức năng dù role hiện tại là teacher.
- Giáo viên thường: không thấy tab và RPC trực tiếp trả permission denied.
- Giáo viên có `attendance:quick`, `attendance:manage`, `attendance:history`, `attendance:report` hoặc `route:attendance`: vẫn không có quyền Học bổ sung nếu không phải hai trường hợp được phép.
- Giáo viên được ghi tên trong lớp: vẫn không có quyền.
- Profile chưa approved: không có quyền.

### Quản lý lớp

- Tạo lớp mới đầy đủ thông tin.
- Sửa tên/môn/khối/phòng/lịch mà không làm thay đổi lịch sử buổi cũ.
- Thêm/xóa nhiều giáo viên metadata.
- Archive lớp: ngừng buổi tương lai, giữ lịch sử.

### Học sinh

- Thêm học sinh thủ công vào đúng lớp.
- Sửa thông tin học sinh theo quy tắc snapshot: chỉ roster tương lai đổi, lịch sử cũ giữ nguyên.
- Ngừng học: học sinh biến khỏi roster tương lai nhưng còn trong lịch sử cũ.
- Kích hoạt lại: học sinh trở lại roster tương lai, không viết lại quá khứ.

### Điểm danh

- Roster chỉ gồm membership có hiệu lực tại ngày buổi học.
- Có mặt/Vắng/Đi trễ và lý do/ghi chú hoạt động như hệ Điểm danh hiện tại.
- Freeze/confirm không bị thay đổi khi sau đó sửa hồ sơ học sinh hoặc lớp.
- Minh chứng và lịch sử vẫn đọc được.
- Không regression các lớp Phụ đạo/Bồi dưỡng.

### Tương thích dữ liệu

- Group cũ hiển thị thành lớp.
- Session recurring cũ vẫn hiện đúng.
- Session adhoc cũ vẫn hiện trong lịch sử nhưng không còn nút tạo mới.
- Official-linked student cũ vẫn giữ dữ liệu/history, nhưng không còn UI liên kết.
- Số lượng session/participant/proof trước và sau migration không bị giảm do migration.

### UI

- Không còn các nhãn “Nhóm dài ngày”, “Buổi phát sinh”, “Liên kết với học sinh chính thức”.
- Luồng chính là **Danh sách lớp → Quản lý lớp → Học sinh/Giáo viên → Điểm danh/Lịch sử**.
- Không xuất hiện modal lồng modal/backdrop mới.

## 14. Triển khai an toàn

Thứ tự rollout:

1. Migration quyền + schema/facade tương thích, không xóa dữ liệu.
2. Kiểm tra backfill, quyền truy cập và số lượng lịch sử trên môi trường kiểm thử/production-like.
3. Frontend/API class-centric.
4. Chạy test phân quyền, CRUD, attendance và regression Phụ đạo/Bồi dưỡng.
5. Sau khi xác nhận production ổn định mới cân nhắc dọn code/RPC legacy ở một thay đổi riêng; không dọn phá hủy trong scope này.

## 15. Tiêu chí hoàn thành

Thay đổi được xem là hoàn thành khi người dùng được phép có thể tạo một lớp Học bổ sung, nhập thông tin lớp, giáo viên và học sinh hoàn toàn thủ công, quản lý trạng thái học sinh, điểm danh và xem lịch sử bằng một luồng dễ hiểu; mọi dữ liệu lịch sử cũ vẫn còn; và bất kỳ tài khoản nào ngoài Admin đã duyệt hoặc profile Nguyễn Thị Hồng Thắm nói trên đều không thể đọc hoặc thao tác dữ liệu Học bổ sung kể cả khi gọi RPC trực tiếp.