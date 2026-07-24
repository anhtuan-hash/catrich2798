import React, { useEffect, useMemo, useState } from 'react';
import './TeachingMethodsHub.css';
import './TeachingMethodsHubContent.css';

const METHODS = [
  {
    id: 'clt', icon: 'CL', color: '#0b57d0', title: 'Communicative Language Teaching', titleVi: 'Dạy học ngôn ngữ giao tiếp', category: 'communication',
    summary: 'Tổ chức việc học quanh giao tiếp có ý nghĩa, trong đó học sinh phải trao đổi thông tin, thương lượng ý nghĩa và đạt một mục đích giao tiếp cụ thể.',
    theory: 'CLT xem năng lực giao tiếp là mục tiêu trung tâm: người học không chỉ biết quy tắc mà còn biết lựa chọn ngôn ngữ phù hợp với người nghe, mục đích và bối cảnh. Bài học vẫn có thể dạy ngữ pháp và từ vựng, nhưng kiến thức ngôn ngữ được đặt trong chuỗi hoạt động tiếp nhận – chuẩn bị – tương tác – phản hồi. Độ trôi chảy và độ chính xác được phát triển theo từng giai đoạn, thay vì sửa mọi lỗi ngay khi học sinh đang nói.',
    principles: ['Giao tiếp phải có mục đích và khoảng trống thông tin thực sự.', 'Ngôn ngữ đầu vào, mẫu diễn đạt và chiến lược giao tiếp được scaffold trước hoạt động mở.', 'Học sinh có nhiều lượt nói hơn giáo viên và phải phản hồi ý kiến của bạn.', 'Phản hồi sau hoạt động ưu tiên lỗi cản trở ý nghĩa, sau đó mới tinh chỉnh độ chính xác.'],
    suitable: ['Luyện nói và nghe', 'Phát triển fluency', 'Lớp B1–C1', 'Chủ đề đời sống và học thuật'],
    notIdeal: ['Mục tiêu chỉ là ghi nhớ một quy tắc đơn lẻ trong thời gian rất ngắn.', 'Lớp chưa có ngôn ngữ nền tối thiểu mà không được cung cấp scaffolding.'],
    teacherRole: 'Thiết kế tình huống, cung cấp ngôn ngữ hỗ trợ, quan sát chiến lược giao tiếp, ghi lỗi có chọn lọc và điều phối phản hồi sau nhiệm vụ.',
    learnerRole: 'Chủ động diễn đạt, hỏi lại, xác nhận, thương lượng ý nghĩa, điều chỉnh thông điệp và phản hồi nội dung của người khác.',
    steps: ['Xác định một đầu ra giao tiếp quan sát được.', 'Kích hoạt kiến thức và tạo nhu cầu giao tiếp.', 'Cung cấp input, mẫu câu và chiến lược cần thiết.', 'Tổ chức tương tác theo cặp/nhóm với khoảng trống thông tin.', 'Cho học sinh đổi bạn hoặc lặp nhiệm vụ để cải thiện fluency.', 'Phản hồi nội dung trước, ngôn ngữ sau và cho cơ hội sửa.'],
    lessonFlow: [['Khởi động', '5 phút', 'Tạo bối cảnh, nêu vấn đề hoặc lựa chọn cần giải quyết.'], ['Chuẩn bị ngôn ngữ', '8 phút', 'Khai thác mẫu diễn đạt, từ khóa và chiến lược hỏi lại/xác nhận.'], ['Nhiệm vụ giao tiếp', '15 phút', 'Học sinh trao đổi thông tin hoặc ra quyết định theo cặp/nhóm.'], ['Báo cáo', '8 phút', 'Nhóm trình bày quyết định, so sánh phương án hoặc phản hồi chéo.'], ['Language clinic', '7 phút', 'Giáo viên dùng lỗi thật để sửa, nâng cấp diễn đạt và cho luyện lại.']],
    activities: ['Information gap', 'Role-play có mục tiêu', 'Opinion line', 'Find someone who', 'Problem-solving discussion'],
    sample: { topic: 'Planning a class trip', level: 'B1', objective: 'Học sinh đề xuất, hỏi thông tin, bày tỏ ưu tiên và thống nhất một kế hoạch chuyến đi.', sequence: ['Mỗi nhóm nhận ngân sách, lịch và sở thích khác nhau.', 'Học sinh đọc thẻ thông tin riêng, không cho bạn xem.', 'Các em hỏi–đáp để hoàn thiện bảng lựa chọn.', 'Nhóm thống nhất địa điểm và trình bày ba lý do.', 'Cả lớp bình chọn theo tiêu chí đã công bố.'], evidence: 'Bảng kế hoạch hoàn chỉnh, bản ghi checklist chiến lược giao tiếp và phần trình bày quyết định.' },
    differentiation: { support: 'Cung cấp sentence frames, word bank, vai trò rõ và thời gian rehearsal.', extension: 'Yêu cầu phản biện phương án khác, dùng hedging và giải quyết một tình huống phát sinh.', access: 'Cho phép ghi ý trước khi nói, dùng thẻ hình và ghép cặp hỗ trợ.' },
    assessment: 'Dùng rubric ngắn gồm: hoàn thành mục đích giao tiếp, độ rõ ý, khả năng duy trì tương tác, phản hồi người nghe và mức phù hợp của ngôn ngữ.',
    indicators: ['Học sinh trao đổi nhiều lượt thay vì đọc câu trả lời chuẩn bị sẵn.', 'Có bằng chứng hỏi lại, xác nhận hoặc sửa thông điệp.', 'Sản phẩm cuối phản ánh thông tin từ nhiều thành viên.', 'Lần thực hiện sau trôi chảy hoặc chính xác hơn lần đầu.'],
    misconceptions: ['CLT không có nghĩa bỏ ngữ pháp; ngữ pháp được dạy để hỗ trợ giao tiếp.', 'Hoạt động nói tự do không có đầu ra chưa chắc là giao tiếp có chất lượng.', 'Sửa lỗi liên tục trong lúc nói có thể phá vỡ fluency.'],
    caution: 'Không biến hoạt động thành “nói cho vui”. Mỗi nhiệm vụ cần mục đích, thông tin khác biệt, tiêu chí thành công và phần phản hồi ngôn ngữ sau hoạt động.',
    checklist: ['Mục tiêu có viết dưới dạng học sinh sẽ làm gì bằng tiếng Anh?', 'Mỗi người có thông tin hoặc vai trò cần thiết không?', 'Đã chuẩn bị ngôn ngữ hỗ trợ nhưng không viết sẵn toàn bộ câu trả lời?', 'Có cách thu bằng chứng giao tiếp của từng học sinh?', 'Có thời gian phản hồi và thực hiện lại?'],
    sources: ['British Council TeachingEnglish – Communicative approach', 'Canale & Swain – Communicative competence', 'Littlewood – Communicative Language Teaching']
  },
  {
    id: 'tblt', icon: 'TB', color: '#137333', title: 'Task-Based Language Teaching', titleVi: 'Dạy học dựa trên nhiệm vụ', category: 'communication',
    summary: 'Dùng một nhiệm vụ có kết quả rõ ràng làm trục bài học; học sinh huy động ngôn ngữ để hoàn thành việc, rồi mới phân tích và nâng cấp ngôn ngữ đã dùng.',
    theory: 'Trong TBLT, nhiệm vụ tạo ra một nhu cầu dùng tiếng Anh để đạt kết quả ngoài ngôn ngữ, chẳng hạn chọn phương án tốt nhất, lập lịch, giải quyết vấn đề hoặc tạo sản phẩm. Chu trình phổ biến gồm pre-task, task cycle, report và language focus. Giáo viên không cần dự đoán toàn bộ ngôn ngữ học sinh sẽ dùng, nhưng phải chuẩn bị input, tiêu chí sản phẩm và cách khai thác ngôn ngữ xuất hiện sau nhiệm vụ.',
    principles: ['Trọng tâm ban đầu là hoàn thành nhiệm vụ, không phải tái tạo một cấu trúc.', 'Nhiệm vụ có đầu ra quan sát được và nhiều cách diễn đạt hợp lệ.', 'Học sinh có giai đoạn planning trước khi báo cáo.', 'Language focus xuất phát từ nhu cầu hoặc dữ liệu ngôn ngữ thật của lớp.'],
    suitable: ['Tích hợp kĩ năng', 'Luyện nói/viết theo tình huống', 'Dự án ngắn', 'Lớp B1 trở lên'],
    notIdeal: ['Bài chỉ cần luyện chính xác một dạng cấu trúc mới chưa có input.', 'Nhiệm vụ quá phức tạp về kiến thức nền so với khả năng ngôn ngữ.'],
    teacherRole: 'Chọn nhiệm vụ vừa sức, làm rõ sản phẩm, cung cấp input, theo dõi quá trình, hỗ trợ theo nhu cầu và khai thác ngôn ngữ sau báo cáo.',
    learnerRole: 'Lập kế hoạch, phân công, thử cách diễn đạt, giải quyết trở ngại, tạo sản phẩm và phản tư về ngôn ngữ đã dùng.',
    steps: ['Xác định outcome và tiêu chí hoàn thành.', 'Pre-task: kích hoạt kiến thức, cho mẫu và làm rõ quy trình.', 'Task cycle: học sinh thực hiện nhiệm vụ trong thời gian giới hạn.', 'Planning: chọn nội dung và ngôn ngữ để báo cáo.', 'Report: trình bày, so sánh hoặc công bố sản phẩm.', 'Language focus: nhận diện, sửa và luyện các mẫu ngôn ngữ nổi bật.'],
    lessonFlow: [['Pre-task', '8 phút', 'Khám phá ví dụ, từ khóa và tiêu chí sản phẩm.'], ['Task', '15 phút', 'Nhóm giải quyết nhiệm vụ; giáo viên quan sát, không giảng giữa chừng.'], ['Planning', '7 phút', 'Nhóm chuẩn bị báo cáo và chỉnh cách diễn đạt.'], ['Report', '8 phút', 'Trình bày, gallery walk hoặc so sánh kết quả.'], ['Language focus', '7 phút', 'Phân tích collocation, cấu trúc, lỗi và luyện ngắn.']],
    activities: ['Lập kế hoạch chuyến đi', 'Giải quyết tình huống', 'Thiết kế poster', 'So sánh lựa chọn', 'Khảo sát và báo cáo'],
    sample: { topic: 'Choose an eco-friendly school project', level: 'B1–B2', objective: 'Học sinh phân tích dữ liệu, so sánh giải pháp và đề xuất một dự án khả thi.', sequence: ['Mỗi nhóm nhận ba đề xuất với chi phí, tác động và rủi ro.', 'Các thành viên đọc phần dữ liệu khác nhau.', 'Nhóm thống nhất tiêu chí và chấm điểm từng phương án.', 'Chuẩn bị pitch 90 giây kèm một biểu đồ.', 'Sau báo cáo, lớp phân tích ngôn ngữ so sánh và thuyết phục.'], evidence: 'Bảng quyết định, pitch, biểu đồ và bản sửa ngôn ngữ sau feedback.' },
    differentiation: { support: 'Giảm số phương án, cung cấp bảng tiêu chí và cụm từ so sánh.', extension: 'Thêm ràng buộc ngân sách hoặc phản biện câu hỏi từ hội đồng.', access: 'Cho phép đọc dữ liệu có biểu tượng, audio hoặc bản tóm tắt.' },
    assessment: 'Rubric gồm mức độ hoàn thành outcome, sử dụng bằng chứng, tính mạch lạc, hợp tác và chất lượng ngôn ngữ trong báo cáo.',
    indicators: ['Nhóm tạo được sản phẩm hoặc quyết định cụ thể.', 'Ngôn ngữ được dùng để xử lý thông tin, không chỉ điền chỗ trống.', 'Có giai đoạn planning giúp báo cáo tốt hơn task ban đầu.', 'Language focus liên hệ trực tiếp với ngôn ngữ học sinh vừa dùng.'],
    misconceptions: ['Một worksheet dài không tự động trở thành task.', 'TBLT không loại bỏ teaching input hoặc language focus.', 'Outcome không nên chỉ là “dùng đúng thì hiện tại hoàn thành”.'],
    caution: 'Nhiệm vụ phải có độ khó nhận thức và ngôn ngữ cân bằng. Nếu outcome mơ hồ, học sinh sẽ chia việc rời rạc hoặc chuyển sang tiếng Việt mà không cần dùng tiếng Anh.',
    checklist: ['Outcome có nhìn thấy hoặc nghe thấy được?', 'Học sinh có thực sự cần trao đổi để hoàn thành?', 'Input có đủ nhưng không giải sẵn nhiệm vụ?', 'Có planning và report?', 'Language focus có dựa trên dữ liệu thật?'],
    sources: ['British Council TeachingEnglish – Task-based learning', 'Jane Willis – A Framework for Task-Based Learning', 'Rod Ellis – Task-based Language Learning and Teaching']
  },
  {
    id: 'pbl', icon: 'PB', color: '#8430ce', title: 'Project-Based Learning', titleVi: 'Dạy học theo dự án', category: 'collaboration',
    summary: 'Tổ chức học tập trong nhiều buổi quanh một câu hỏi lớn, quá trình điều tra và một sản phẩm công khai có giá trị ngoài việc lấy điểm.',
    theory: 'PBL dùng dự án làm phương tiện để học kiến thức và kĩ năng cốt lõi, không phải phần trang trí sau khi đã học xong. Dự án chất lượng có driving question, inquiry kéo dài, tính xác thực, tiếng nói và lựa chọn của học sinh, phản hồi–chỉnh sửa, reflection và sản phẩm chia sẻ với người thật. Trong môn tiếng Anh, mục tiêu ngôn ngữ phải được lập kế hoạch song song với nội dung và năng lực hợp tác.',
    principles: ['Driving question đủ mở nhưng gắn mục tiêu chương trình.', 'Mỗi giai đoạn tạo bằng chứng học tập và có checkpoint.', 'Học sinh có lựa chọn thực chất về nội dung, vai trò hoặc hình thức sản phẩm.', 'Sản phẩm trải qua phản hồi, chỉnh sửa và công bố cho một đối tượng cụ thể.'],
    suitable: ['Unit theo chủ đề', 'Học sinh THPT', 'Tích hợp đọc–viết–nói', 'Đánh giá năng lực'],
    notIdeal: ['Thời lượng chỉ một tiết mà sản phẩm quá lớn.', 'Sản phẩm đẹp nhưng không buộc học sinh học kiến thức/ngôn ngữ cốt lõi.'],
    teacherRole: 'Thiết kế câu hỏi lớn, mốc tiến độ, mini-lesson, nguồn tin, rubric; tổ chức coaching và bảo đảm trách nhiệm cá nhân.',
    learnerRole: 'Đặt câu hỏi, nghiên cứu, phân công, tổng hợp nguồn, tạo bản nháp, nhận feedback, chỉnh sửa và trình bày sản phẩm.',
    steps: ['Xác định chuẩn kiến thức và driving question.', 'Thiết kế sản phẩm công khai, rubric và đối tượng tiếp nhận.', 'Lập timeline, vai trò, checkpoint và sản phẩm trung gian.', 'Tổ chức inquiry, mini-lesson ngôn ngữ và coaching.', 'Cho phản hồi đồng đẳng/chuyên gia và chỉnh sửa.', 'Công bố sản phẩm, tự đánh giá và reflection.'],
    lessonFlow: [['Launch', '1 tiết', 'Tình huống khởi động, driving question, sản phẩm mẫu và tiêu chí.'], ['Inquiry', '2–4 tiết', 'Đọc/nghe nguồn, ghi chú, phỏng vấn hoặc thu dữ liệu.'], ['Create', '2–3 tiết', 'Viết kịch bản, thiết kế sản phẩm và nhận mini-lesson theo nhu cầu.'], ['Critique & revise', '1–2 tiết', 'Feedback theo protocol và chỉnh sửa có minh chứng.'], ['Public product', '1 tiết', 'Trình bày, triển lãm, đăng tải hoặc gửi đến đối tượng thật.']],
    activities: ['Podcast học đường', 'Chiến dịch môi trường', 'Tạp chí số', 'Triển lãm văn hóa', 'Video hướng dẫn cộng đồng'],
    sample: { topic: 'A multicultural world podcast', level: 'B1–B2', objective: 'Học sinh nghiên cứu một vấn đề giao thoa văn hóa và sản xuất podcast 4–6 phút cho học sinh trong trường.', sequence: ['Khởi động bằng hai tình huống hiểu lầm văn hóa.', 'Nhóm chọn câu hỏi và phân vai researcher, scriptwriter, host, editor.', 'Đọc tối thiểu ba nguồn, lập source log và fact-check.', 'Viết kịch bản, thu bản nháp, nhận phản hồi theo rubric.', 'Chỉnh sửa, công bố và viết reflection cá nhân.'], evidence: 'Source log, kịch bản hai phiên bản, podcast cuối, peer feedback và reflection.' },
    differentiation: { support: 'Cung cấp source pack, template timeline, script frame và vai trò phù hợp năng lực.', extension: 'Yêu cầu phỏng vấn, dữ liệu sơ cấp hoặc phiên bản song ngữ có chú giải.', access: 'Cho lựa chọn sản phẩm audio, video, infographic thuyết minh hoặc bài viết số.' },
    assessment: 'Tách điểm kiến thức, ngôn ngữ, inquiry, chất lượng sản phẩm, hợp tác và reflection; dùng minh chứng cá nhân để tránh điểm nhóm che khuất đóng góp.',
    indicators: ['Học sinh giải thích được mối liên hệ giữa sản phẩm và kiến thức cốt lõi.', 'Có bằng chứng sử dụng và đánh giá nguồn.', 'Bản cuối khác rõ bản nháp nhờ feedback.', 'Mỗi thành viên có minh chứng đóng góp cá nhân.'],
    misconceptions: ['Làm poster sau bài học chưa chắc là PBL.', 'PBL không đồng nghĩa giáo viên rút lui hoàn toàn.', 'Tự do lựa chọn không thay thế mục tiêu và tiêu chí chung.'],
    caution: 'Giữ phạm vi đủ nhỏ, thiết kế checkpoint và dạy kĩ năng quản lí dự án. Không để phần trang trí, quay dựng hoặc công nghệ lấn át mục tiêu tiếng Anh.',
    checklist: ['Driving question có thật sự thúc đẩy inquiry?', 'Sản phẩm yêu cầu dùng kiến thức/ngôn ngữ cốt lõi?', 'Có timeline và sản phẩm trung gian?', 'Rubric có tách quá trình và cá nhân?', 'Có người tiếp nhận sản phẩm ngoài giáo viên?'],
    sources: ['PBLWorks – Gold Standard PBL', 'Thomas – A Review of Research on Project-Based Learning', 'Larmer, Mergendoller & Boss – Setting the Standard for PBL']
  },
  {
    id: 'cooperative', icon: 'CO', color: '#e37400', title: 'Cooperative Learning', titleVi: 'Học tập hợp tác', category: 'collaboration',
    summary: 'Thiết kế hoạt động nhóm có sự phụ thuộc tích cực, trách nhiệm cá nhân, tương tác hỗ trợ và cơ chế để mọi học sinh tham gia.',
    theory: 'Học tập hợp tác khác làm việc nhóm thông thường ở cấu trúc trách nhiệm. Nhóm chỉ thành công khi các thành viên cần nhau nhưng từng cá nhân vẫn phải chứng minh việc học. Vai trò, lượt nói, tài nguyên và sản phẩm được thiết kế để tránh một học sinh làm thay cả nhóm. Giáo viên đồng thời dạy nội dung, ngôn ngữ hợp tác và kĩ năng xã hội.',
    principles: ['Sự phụ thuộc tích cực: mỗi thành viên giữ một phần nguồn lực hoặc vai trò.', 'Trách nhiệm cá nhân: có sản phẩm hoặc kiểm tra riêng.', 'Tương tác hỗ trợ trực tiếp và sử dụng ngôn ngữ hợp tác.', 'Nhóm phản tư về cách làm việc, không chỉ kết quả.'],
    suitable: ['Lớp đông', 'Ôn tập', 'Đọc hiểu', 'Phát triển peer support'],
    notIdeal: ['Nhiệm vụ có thể hoàn thành nhanh bởi một người.', 'Giáo viên chỉ chia nhóm mà không dạy quy trình và vai trò.'],
    teacherRole: 'Chọn cấu trúc, tạo phụ thuộc tích cực, dạy câu nói hợp tác, theo dõi mức tham gia và kiểm tra cá nhân ngẫu nhiên.',
    learnerRole: 'Thực hiện vai trò, giải thích cho bạn, lắng nghe, đặt câu hỏi, kiểm tra hiểu và chịu trách nhiệm về phần học của mình.',
    steps: ['Xác định mục tiêu nội dung và kĩ năng hợp tác.', 'Chọn cấu trúc nhóm phù hợp.', 'Phân vai, nguồn lực và tiêu chí trách nhiệm cá nhân.', 'Dạy/nghiệm thu ngôn ngữ hợp tác.', 'Tổ chức nhiệm vụ và quan sát bằng checklist.', 'Kiểm tra cá nhân, tổng kết nội dung và group processing.'],
    lessonFlow: [['Chuẩn bị', '7 phút', 'Mô hình hóa vai trò, câu nói và tiêu chí thành công.'], ['Chuyên gia', '10 phút', 'Mỗi học sinh học một phần thông tin.'], ['Nhóm ghép', '15 phút', 'Thành viên dạy lại và hoàn thiện sản phẩm chung.'], ['Kiểm tra cá nhân', '8 phút', 'Quiz, oral check hoặc viết tóm tắt không nhìn tài liệu.'], ['Group processing', '5 phút', 'Nhóm tự đánh giá điều gì hiệu quả và cần thay đổi.']],
    activities: ['Jigsaw reading', 'Think–Pair–Share', 'Numbered Heads Together', 'Round Robin', 'Peer teaching'],
    sample: { topic: 'Jigsaw reading: climate action', level: 'B1–B2', objective: 'Học sinh tổng hợp bốn giải pháp khí hậu và đề xuất kế hoạch cho trường.', sequence: ['Mỗi thành viên đọc một văn bản khác nhau.', 'Nhóm chuyên gia thống nhất ba ý và cách giải thích.', 'Trở về nhóm ghép để dạy lại phần của mình.', 'Nhóm hoàn thiện bảng so sánh và xếp hạng giải pháp.', 'Giáo viên gọi ngẫu nhiên một thành viên trình bày.'], evidence: 'Phiếu chuyên gia, bảng nhóm, câu trả lời cá nhân và checklist mức tham gia.' },
    differentiation: { support: 'Văn bản nhiều mức, vai trò facilitator/reader/recorder, question stems.', extension: 'Yêu cầu đánh giá độ tin cậy nguồn và phản biện xếp hạng.', access: 'Dùng audio, sơ đồ, từ khóa và thời gian đọc linh hoạt.' },
    assessment: 'Kết hợp sản phẩm nhóm với kiểm tra cá nhân, quan sát ngôn ngữ hợp tác và tự đánh giá đóng góp.',
    indicators: ['Tất cả thành viên có lượt nói và phần việc rõ.', 'Học sinh giải thích cho nhau thay vì chỉ chia đáp án.', 'Bất kì thành viên nào cũng có thể trình bày sản phẩm chung.', 'Nhóm nêu được một điều cần cải thiện trong lần sau.'],
    misconceptions: ['Ngồi theo nhóm không đồng nghĩa học tập hợp tác.', 'Chấm một điểm chung duy nhất làm giảm trách nhiệm cá nhân.', 'Vai trò chỉ có ý nghĩa khi gắn với hành động cụ thể.'],
    caution: 'Luân phiên vai trò và kiểm tra cá nhân để tránh học sinh mạnh thống trị. Không nhóm cố định học sinh theo nhãn “giỏi/yếu” trong thời gian dài.',
    checklist: ['Nhóm có cần mọi thành viên để hoàn thành?', 'Mỗi người có minh chứng cá nhân?', 'Đã dạy câu nói hợp tác?', 'Có cách quan sát mức tham gia?', 'Có group processing cuối hoạt động?'],
    sources: ['Johnson, Johnson & Holubec – Cooperative Learning in the Classroom', 'Kagan – Cooperative Learning Structures', 'Gillies – Cooperative Learning: Review of Research and Practice']
  },
  {
    id: 'flipped', icon: 'FL', color: '#0f766e', title: 'Flipped Classroom', titleVi: 'Lớp học đảo ngược', category: 'personalization',
    summary: 'Chuyển phần tiếp nhận kiến thức nền ra trước giờ học và dùng thời gian trên lớp cho thực hành, coaching, sửa lỗi và phân hóa.',
    theory: 'Flipped classroom không đơn giản là xem video ở nhà. Mô hình có giá trị khi nội dung trước lớp ngắn, thiết yếu, có cơ chế kiểm tra hiểu; dữ liệu đó được dùng để thay đổi hoạt động trên lớp. Học sinh chưa hoàn thành vẫn cần một lối vào bài học, còn thời gian trực tiếp phải dành cho hoạt động có giá trị hơn việc nghe giảng lại.',
    principles: ['Pre-class content ngắn, truy cập được và gắn câu hỏi.', 'Hoạt động trên lớp phụ thuộc vào dữ liệu chuẩn bị.', 'Có cơ chế hỗ trợ học sinh chưa chuẩn bị hoặc thiếu thiết bị.', 'Nội dung có thể xem lại và học sinh được hướng dẫn cách tự học.'],
    suitable: ['Ngữ pháp nền', 'Writing process', 'Lớp có LMS', 'Bài học cần nhiều luyện tập'],
    notIdeal: ['Chỉ chuyển nguyên bài giảng dài thành video.', 'Không có cách kiểm tra và sử dụng dữ liệu trước lớp.'],
    teacherRole: 'Thiết kế micro-content, kiểm tra hiểu, phân nhóm theo dữ liệu và coaching trong giờ học.',
    learnerRole: 'Chuẩn bị theo nhịp riêng, ghi câu hỏi, tự kiểm tra và dùng giờ học để áp dụng, sửa và mở rộng.',
    steps: ['Chọn phần kiến thức nên học trước.', 'Tạo micro-content 5–10 phút kèm transcript/slide.', 'Gắn 2–5 câu kiểm tra hiểu và một câu hỏi khó.', 'Phân tích dữ liệu trước giờ học.', 'Thiết kế các nhánh hoạt động trên lớp.', 'Cho củng cố, reflection và cơ hội xem lại.'],
    lessonFlow: [['Trước lớp', '8–12 phút', 'Video/reading ngắn + quiz + câu hỏi của học sinh.'], ['Check-in', '5 phút', 'Dùng dữ liệu để sửa hiểu lầm phổ biến.'], ['Workshop', '20 phút', 'Bài tập ứng dụng, station hoặc coaching theo nhóm.'], ['Production', '12 phút', 'Viết/nói/sản phẩm có phản hồi.'], ['Exit ticket', '5 phút', 'Chứng minh mức hiểu và chọn nội dung cần xem lại.']],
    activities: ['Video + 3 câu kiểm tra', 'Interactive note', 'Error clinic trên lớp', 'Workshop viết', 'Station support'],
    sample: { topic: 'Present perfect for experiences', level: 'B1', objective: 'Học sinh dùng present perfect và past simple để phỏng vấn và viết profile trải nghiệm.', sequence: ['Trước lớp: video 7 phút và quiz phân biệt hai thì.', 'Đầu giờ: phân tích ba lỗi phổ biến từ dữ liệu.', 'Nhóm hỗ trợ ôn timeline; nhóm sẵn sàng làm interview task.', 'Học sinh phỏng vấn ba bạn và viết profile.', 'Peer check theo checklist rồi sửa câu.'], evidence: 'Quiz trước lớp, phiếu phỏng vấn, profile và exit ticket.' },
    differentiation: { support: 'Transcript, tốc độ phát linh hoạt, phiên bản audio, station ôn lại với giáo viên.', extension: 'Nhiệm vụ phỏng vấn sâu, viết narrative hoặc giải thích lựa chọn thì.', access: 'Cho tải nội dung, bản in và thời gian hoàn thành thay thế.' },
    assessment: 'Dùng quiz pre-class để chẩn đoán; trên lớp đánh giá sản phẩm ứng dụng, phản hồi sửa bài và exit ticket.',
    indicators: ['Dữ liệu trước lớp dẫn đến nhóm hoặc nhiệm vụ khác nhau.', 'Thời gian trên lớp chủ yếu là thực hành và feedback.', 'Học sinh chưa chuẩn bị vẫn có lối vào nhưng phải hoàn thành kiến thức nền.', 'Nội dung trước lớp ngắn và có thể truy cập lại.'],
    misconceptions: ['Flipped không đồng nghĩa mọi bài đều có video.', 'Không nên dùng giờ học để giảng lại toàn bộ pre-class content.', 'Hoàn thành video không chứng minh đã hiểu.'],
    caution: 'Bảo đảm công bằng thiết bị và khối lượng homework. Pre-class content phải ngắn, có mục đích và thay đổi thực sự cách dùng thời gian trên lớp.',
    checklist: ['Nội dung nào thật sự cần học trước?', 'Có transcript/bản thay thế?', 'Quiz có chẩn đoán hiểu lầm?', 'Kế hoạch trên lớp thay đổi theo dữ liệu?', 'Có phương án cho người chưa chuẩn bị?'],
    sources: ['Flipped Learning Network – Four Pillars of F-L-I-P', 'Bergmann & Sams – Flip Your Classroom', 'TeachingEnglish resources on flipped learning']
  },
  {
    id: 'blended', icon: 'BL', color: '#1a73e8', title: 'Blended Learning', titleVi: 'Dạy học kết hợp', category: 'personalization',
    summary: 'Kết nối hoạt động trực tiếp và hoạt động số thành một hành trình thống nhất, mỗi môi trường đảm nhận phần mà nó làm tốt nhất.',
    theory: 'Blended learning không phải cộng thêm bài online vào bài học trực tiếp. Giáo viên thiết kế dòng học tập có sự liên kết: hoạt động số có thể cung cấp luyện tập thích ứng, dữ liệu tiến độ và cơ hội học theo nhịp; thời gian trực tiếp ưu tiên tương tác, giải thích, coaching và cộng tác. Học sinh cần hiểu mục đích của từng môi trường và cách dữ liệu chuyển từ phần này sang phần khác.',
    principles: ['Một mục tiêu và tiêu chí xuyên suốt hai môi trường.', 'Hoạt động online và trực tiếp bổ sung, không lặp lại.', 'Dữ liệu số được dùng để ra quyết định dạy học.', 'Người học có mức kiểm soát phù hợp về thời gian, đường học hoặc tốc độ.'],
    suitable: ['Luyện tập phân hóa', 'Homework có phản hồi', 'Kho học liệu số', 'Theo dõi tiến độ'],
    notIdeal: ['Chỉ số hóa worksheet mà không thay đổi trải nghiệm học.', 'Công cụ nhiều hơn mục tiêu hoặc tạo tải nhận thức không cần thiết.'],
    teacherRole: 'Thiết kế hành trình, chọn công cụ tối giản, phân tích dữ liệu và tạo các điểm kết nối rõ giữa online–offline.',
    learnerRole: 'Quản lí tiến độ, lựa chọn tài nguyên phù hợp, sử dụng feedback số và mang kết quả vào tương tác trực tiếp.',
    steps: ['Xác định mục tiêu, sản phẩm và dữ liệu cần thu.', 'Chọn phần phù hợp cho online và trực tiếp.', 'Thiết kế điểm chuyển tiếp giữa hai môi trường.', 'Chuẩn bị hướng dẫn, thời hạn và hỗ trợ kĩ thuật.', 'Theo dõi dữ liệu và coaching.', 'Đánh giá tính hiệu quả của từng thành phần.'],
    lessonFlow: [['Online input', '10 phút', 'Đọc/nghe có điều khiển và kiểm tra hiểu.'], ['Direct instruction', '8 phút', 'Giải thích điểm khó dựa trên dữ liệu.'], ['Collaborative practice', '15 phút', 'Thảo luận, peer feedback hoặc task.'], ['Personalized practice', '10 phút', 'Bài luyện theo mức hoặc lựa chọn.'], ['Portfolio update', '5 phút', 'Lưu minh chứng và reflection.']],
    activities: ['Quiz thích ứng', 'Forum phản hồi', 'Luyện nghe tự chọn tốc độ', 'Workshop trực tiếp', 'Portfolio số'],
    sample: { topic: 'Academic vocabulary for environment', level: 'B1–B2', objective: 'Học sinh nhận diện, dùng và tự theo dõi 12 collocations học thuật.', sequence: ['Online: flashcards có retrieval và đoạn nghe ngắn.', 'Dữ liệu chia nhóm cần support về nghĩa/collocation.', 'Trực tiếp: jigsaw reading và concept map.', 'Online: viết đoạn 120 từ, nhận feedback tự động về từ mục tiêu.', 'Trên lớp: peer review và cập nhật portfolio.'], evidence: 'Dữ liệu luyện tập, concept map, đoạn viết hai phiên bản và vocabulary log.' },
    differentiation: { support: 'Đường học ngắn hơn, video giải thích, hint và coaching trực tiếp.', extension: 'Nguồn nâng cao, nhiệm vụ transfer hoặc tự tạo quiz cho bạn.', access: 'Tài liệu tải xuống, thiết bị dùng chung và lựa chọn offline tương đương.' },
    assessment: 'Kết hợp dữ liệu hoàn thành với sản phẩm thực, conference ngắn, peer feedback và minh chứng tiến bộ trong portfolio.',
    indicators: ['Hoạt động online chuẩn bị hoặc mở rộng cho hoạt động trực tiếp.', 'Dữ liệu được dùng để phân nhóm hoặc điều chỉnh.', 'Học sinh biết mình đang ở đâu trong hành trình.', 'Số công cụ ít nhưng vai trò từng công cụ rõ.'],
    misconceptions: ['Có LMS không đồng nghĩa đã blended learning.', 'Online và offline không nên giao hai lần cùng một việc.', 'Dữ liệu click/hoàn thành không tự động phản ánh hiểu sâu.'],
    caution: 'Giữ hệ sinh thái công cụ đơn giản, bảo vệ dữ liệu học sinh và luôn có phương án tiếp cận khi mạng hoặc thiết bị không ổn định.',
    checklist: ['Mỗi môi trường làm tốt điều gì?', 'Điểm nối online–offline có rõ?', 'Dữ liệu nào thực sự giúp quyết định?', 'Học sinh có lựa chọn phù hợp?', 'Có phương án offline và hỗ trợ kĩ thuật?'],
    sources: ['Christensen Institute – Blended Learning models', 'Blended Learning Universe', 'Horn & Staker – Blended']
  },
  {
    id: 'differentiation', icon: 'DI', color: '#b3261e', title: 'Differentiated Instruction', titleVi: 'Dạy học phân hóa', category: 'personalization',
    summary: 'Giữ mục tiêu cốt lõi chung nhưng điều chỉnh mức hỗ trợ, đường tiếp cận, quá trình hoặc cách thể hiện kết quả dựa trên dữ liệu người học.',
    theory: 'Phân hóa không phải soạn một giáo án riêng cho từng em. Giáo viên dùng dữ liệu về readiness, interest và learning profile để tạo 2–3 đường học linh hoạt. Có thể phân hóa nội dung, quá trình, sản phẩm và môi trường, nhưng tiêu chí cốt lõi cần minh bạch. Nhóm là tạm thời và thay đổi theo nhiệm vụ, tránh gắn nhãn cố định.',
    principles: ['Mục tiêu bắt buộc và tiêu chí thành công chung.', 'Quyết định dựa trên chẩn đoán, không dựa vào cảm tính.', 'Scaffolding khác nhau nhưng không hạ thấp kì vọng cốt lõi.', 'Nhóm linh hoạt và học sinh có quyền lựa chọn có cấu trúc.'],
    suitable: ['Lớp chênh lệch trình độ', 'Học sinh có nhu cầu khác nhau', 'Ôn tập', 'Kĩ năng đọc–viết'],
    notIdeal: ['Chia bài “dễ–khó” cố định theo nhãn học sinh.', 'Tạo quá nhiều phiên bản khiến giáo viên và học sinh mất định hướng.'],
    teacherRole: 'Chẩn đoán, xác định mục tiêu không thương lượng, thiết kế scaffold/lựa chọn và theo dõi việc chuyển nhóm.',
    learnerRole: 'Hiểu mục tiêu, chọn hoặc được gợi ý đường học, dùng hỗ trợ có trách nhiệm và chứng minh tiến bộ.',
    steps: ['Chẩn đoán nhanh kiến thức và nhu cầu.', 'Xác định mục tiêu cốt lõi và tiêu chí chung.', 'Chọn một chiều phân hóa ưu tiên.', 'Thiết kế 2–3 mức hỗ trợ hoặc lựa chọn.', 'Dùng nhóm linh hoạt và checkpoint.', 'Thu bằng chứng, cho học sinh chuyển đường học.'],
    lessonFlow: [['Diagnostic', '5 phút', 'Câu hỏi nhanh hoặc sản phẩm ngắn để phân nhóm tạm thời.'], ['Mini-lesson chung', '8 phút', 'Mục tiêu và chiến lược cốt lõi.'], ['Flexible groups', '20 phút', 'Cùng mục tiêu, scaffold/tài liệu/nhiệm vụ khác nhau.'], ['Share & compare', '8 phút', 'Nhóm chia sẻ chiến lược và học lẫn nhau.'], ['Common exit ticket', '5 phút', 'Cùng tiêu chí để đo mức đạt.']],
    activities: ['Tiered tasks', 'Choice board', 'Reading texts nhiều mức', 'Sentence frames', 'Extension challenge'],
    sample: { topic: 'Reading about climate solutions', level: 'A2–B2 mixed', objective: 'Học sinh xác định luận điểm, bằng chứng và đánh giá một giải pháp khí hậu.', sequence: ['Exit ticket trước xác định ba nhóm readiness.', 'Cùng xem infographic và học từ khóa cốt lõi.', 'Nhóm A dùng văn bản rút gọn + graphic organizer; nhóm B văn bản chuẩn; nhóm C thêm nguồn phản biện.', 'Tất cả tạo claim–evidence card cùng định dạng.', 'Học sinh làm exit ticket chung và có thể chuyển nhóm ở buổi sau.'], evidence: 'Graphic organizer, claim–evidence card và exit ticket chung.' },
    differentiation: { support: 'Chunking, audio, word bank, worked example, sentence frames và teacher table.', extension: 'Nguồn đối lập, câu hỏi transfer, hạn chế từ hoặc vai trò chuyên gia.', access: 'Lựa chọn đọc/nghe, thời gian linh hoạt, công cụ hỗ trợ và sản phẩm đa phương thức.' },
    assessment: 'Dùng tiêu chí chung nhưng thu minh chứng qua nhiều sản phẩm; so sánh tiến bộ với điểm xuất phát và điều chỉnh scaffold.',
    indicators: ['Mọi học sinh làm việc hướng tới cùng mục tiêu cốt lõi.', 'Scaffold được thêm hoặc rút dựa trên dữ liệu.', 'Nhóm thay đổi theo kĩ năng/nhiệm vụ.', 'Học sinh hiểu vì sao mình dùng một hỗ trợ cụ thể.'],
    misconceptions: ['Phân hóa không phải cá nhân hóa hoàn toàn.', 'Bài cho nhóm yếu không nên chỉ ít hơn và dễ hơn.', 'Learning styles không phải căn cứ duy nhất để chia nhóm.'],
    caution: 'Tránh gắn nhãn và tạo khoảng cách kì vọng. Bắt đầu phân hóa một yếu tố mỗi lần để giữ chất lượng và khả năng quản lí.',
    checklist: ['Mục tiêu chung là gì?', 'Dữ liệu chẩn đoán nào đang được dùng?', 'Scaffold khác nhau ở điểm nào?', 'Nhóm có thể thay đổi?', 'Exit ticket có cùng tiêu chí cốt lõi?'],
    sources: ['Carol Ann Tomlinson – How to Differentiate Instruction', 'Understood – Differentiated instruction', 'ASCD resources on differentiation']
  },
  {
    id: 'station', icon: 'SR', color: '#7c4dff', title: 'Station Rotation', titleVi: 'Luân chuyển trạm học tập', category: 'interaction',
    summary: 'Chia bài học thành các trạm có mục tiêu, thời lượng và sản phẩm ngắn để tăng hoạt động, phân hóa và thời gian coaching trực tiếp.',
    theory: 'Trong station rotation, học sinh luân chuyển theo lịch qua các trạm; ít nhất một trạm thường dùng học tập số trong mô hình blended, nhưng trạm cũng có thể hoàn toàn offline. Chất lượng phụ thuộc vào tính độc lập của nhiệm vụ, hướng dẫn rõ, nhịp chuyển và cách giáo viên thu sản phẩm. Trạm giáo viên nên dùng cho chẩn đoán, feedback hoặc dạy mục tiêu hẹp.',
    principles: ['Mỗi trạm có một mục tiêu và sản phẩm ngắn.', 'Nhiệm vụ đủ độc lập để giáo viên không phải giải thích lặp lại.', 'Thời gian và tín hiệu chuyển trạm được luyện trước.', 'Trạm tạo dữ liệu hoặc cơ hội support khác nhau.'],
    suitable: ['Lớp đông', 'Ôn tập nhiều kĩ năng', 'Dạy phân hóa', 'Tiết 45–90 phút'],
    notIdeal: ['Mỗi trạm cần giáo viên hướng dẫn liên tục.', 'Di chuyển tốn thời gian hơn hoạt động học.'],
    teacherRole: 'Thiết kế logistics, instruction card, tài liệu dự phòng; tập trung coaching tại một trạm và theo dõi sản phẩm các trạm khác.',
    learnerRole: 'Tự quản thời gian, đọc hướng dẫn, hoàn thành passport và hỗ trợ nhóm theo quy tắc.',
    steps: ['Chọn 3–5 mục tiêu/trạm.', 'Thiết kế nhiệm vụ tương đương về thời gian.', 'Viết instruction card và ví dụ sản phẩm.', 'Phân nhóm, sơ đồ di chuyển và tín hiệu.', 'Dạy thử quy trình trước nội dung.', 'Thu passport/sản phẩm và debrief.'],
    lessonFlow: [['Briefing', '5 phút', 'Nhắc quy trình, nhóm, hướng di chuyển.'], ['Trạm 1', '9 phút', 'Teacher clinic hoặc feedback.'], ['Trạm 2', '9 phút', 'Listening/reading độc lập.'], ['Trạm 3', '9 phút', 'Collaborative practice hoặc game.'], ['Trạm 4', '9 phút', 'Production/extension.'], ['Debrief', '4 phút', 'Exit ticket và xử lí lỗi chung.']],
    activities: ['Teacher clinic', 'Vocabulary station', 'Listening station', 'Peer feedback', 'Game/retrieval station'],
    sample: { topic: 'Unit review: Environment', level: 'B1', objective: 'Học sinh ôn từ vựng, đọc, nghe và viết câu đề xuất trong một tiết 45 phút.', sequence: ['Trạm giáo viên: sửa lỗi câu điều kiện.', 'Trạm nghe: chọn ý chính và chi tiết.', 'Trạm từ vựng: retrieval cards + collocation sort.', 'Trạm viết: tạo ba đề xuất cho trường.', 'Cuối giờ: passport và exit ticket chung.'], evidence: 'Station passport, phiếu nghe, sản phẩm viết và ghi chú teacher clinic.' },
    differentiation: { support: 'Mã màu trạm, instruction card có hình, worked example và buddy role.', extension: 'Challenge card ở mỗi trạm hoặc trạm chuyên gia.', access: 'Giảm số lần di chuyển, cho trạm cố định hoặc vật liệu số truy cập tại chỗ.' },
    assessment: 'Passport trạm, sản phẩm mini, checklist hoàn thành, quan sát ở trạm giáo viên và exit ticket chung.',
    indicators: ['Học sinh bắt đầu trạm trong vòng một phút.', 'Sản phẩm mỗi trạm đủ ngắn để kiểm tra.', 'Giáo viên có thời gian coaching thay vì xử lí logistics.', 'Nhiệm vụ các trạm liên kết với cùng mục tiêu bài học.'],
    misconceptions: ['Nhiều góc hoạt động không tự động thành station rotation.', 'Trạm không nên chỉ là các worksheet giống nhau.', 'Công nghệ không bắt buộc nếu mục tiêu không cần.'],
    caution: 'Đặt trạm ồn xa trạm cần tập trung, chuẩn bị nhiệm vụ dự phòng và giảm đồ dùng phức tạp. Lần đầu nên bắt đầu với ba trạm.',
    checklist: ['Mỗi trạm có mục tiêu/sản phẩm?', 'Thời lượng có tương đương?', 'Hướng dẫn có tự giải thích?', 'Đã luyện quy trình chuyển?', 'Có passport và debrief?'],
    sources: ['Blended Learning Universe – Station Rotation', 'Horn & Staker – Blended', 'Catlin Tucker – Station Rotation resources']
  },
  {
    id: 'gbl', icon: 'GB', color: '#5b2a86', title: 'Game-Based Learning', titleVi: 'Dạy học dựa trên trò chơi', category: 'interaction',
    summary: 'Đặt mục tiêu học tập bên trong luật chơi, quyết định và phản hồi; học sinh phải dùng kiến thức hoặc tiếng Anh để tiến bộ trong game.',
    theory: 'Game-based learning khác gamification. GBL dùng một game hoặc hệ thống game làm môi trường học, còn gamification thêm điểm, huy hiệu hoặc bảng xếp hạng vào hoạt động có sẵn. Một game giáo dục tốt tạo vòng lặp hành động–phản hồi–điều chỉnh, có quyết định có ý nghĩa, luật dễ hiểu và debrief để chuyển trải nghiệm thành kiến thức.',
    principles: ['Mỗi hành động trong game gắn trực tiếp với hành vi học tập.', 'Phản hồi nhanh nhưng giải thích được.', 'Luật đơn giản hơn nội dung cần học.', 'Có debrief và cơ hội transfer sau chơi.'],
    suitable: ['Ôn tập', 'Từ vựng', 'Speaking practice', 'Retrieval practice'],
    notIdeal: ['Cạnh tranh làm tăng lo âu hoặc loại trừ.', 'Điểm thưởng che lấp mục tiêu và chất lượng câu trả lời.'],
    teacherRole: 'Thiết kế luật, cân bằng thử thách, bảo đảm công bằng, quan sát chiến lược và dẫn dắt debrief.',
    learnerRole: 'Ra quyết định, thử chiến lược, giải thích lựa chọn, hợp tác hoặc cạnh tranh lành mạnh và phản tư.',
    steps: ['Xác định hành vi học tập cần lặp.', 'Chọn cơ chế chơi phù hợp.', 'Viết luật và điều kiện thắng ngắn gọn.', 'Thử nghiệm độ khó và thời gian.', 'Tổ chức chơi với feedback tức thì.', 'Debrief: chiến lược, lỗi, kiến thức và transfer.'],
    lessonFlow: [['Tutorial', '5 phút', 'Chơi thử một lượt và kiểm tra luật.'], ['Round 1', '8 phút', 'Khám phá game, giáo viên thu dữ liệu lỗi.'], ['Feedback pause', '5 phút', 'Giải thích chiến lược/ngôn ngữ quan trọng.'], ['Round 2', '10 phút', 'Chơi lại với điều kiện hoặc cấp độ mới.'], ['Debrief & transfer', '10 phút', 'Giải thích đáp án và áp dụng vào nhiệm vụ không game.']],
    activities: ['Team race', 'Mystery box', 'Information quest', 'Vocabulary auction', 'Escape challenge'],
    sample: { topic: 'Vocabulary auction: collocations', level: 'B1–B2', objective: 'Học sinh nhận diện và giải thích collocation đúng trong chủ đề giáo dục.', sequence: ['Mỗi đội có ngân sách 100 điểm.', 'Các đội đấu giá 12 câu, gồm câu đúng và sai.', 'Muốn mua phải giải thích hoặc đề xuất sửa.', 'Sau mỗi vòng, giáo viên mở bằng chứng corpus/example.', 'Đội dùng năm collocation đã mua để viết đoạn ngắn.'], evidence: 'Bảng quyết định, lời giải thích, câu sửa và đoạn viết transfer.' },
    differentiation: { support: 'Thẻ gợi ý, thời gian thảo luận nhóm và mức cược thấp.', extension: 'Yêu cầu giải thích register, tạo distractor hoặc dẫn chứng corpus.', access: 'Chế độ hợp tác cả lớp, không loại người chơi và lựa chọn trả lời viết.' },
    assessment: 'Dùng dữ liệu lựa chọn, chất lượng giải thích, exit ticket và nhiệm vụ transfer; không dùng điểm thắng thua làm điểm học tập duy nhất.',
    indicators: ['Muốn tiến bộ trong game phải dùng kiến thức mục tiêu.', 'Học sinh nhận feedback và đổi chiến lược.', 'Không có học sinh bị loại khỏi quá trình học.', 'Debrief làm rõ vì sao đáp án/chiến lược hiệu quả.'],
    misconceptions: ['Kahoot có điểm chưa chắc là GBL sâu.', 'Game nhanh không luôn tốt hơn game cần suy nghĩ.', 'Cạnh tranh không phải cơ chế duy nhất; có thể dùng cooperative games.'],
    caution: 'Không để tốc độ, may rủi hoặc bảng xếp hạng lấn át độ chính xác và an toàn tâm lí. Luôn có phương án tham gia cho học sinh ít nói.',
    checklist: ['Hành động game có đúng hành vi học?', 'Feedback có giải thích?', 'Luật có thể hiểu trong hai phút?', 'Mọi người có vai trò?', 'Có debrief và transfer?'],
    sources: ['James Paul Gee – What Video Games Have to Teach Us', 'Plass, Homer & Kinzer – Foundations of Game-Based Learning', 'TeachingEnglish game-based learning resources']
  },
  {
    id: 'inquiry', icon: 'IQ', color: '#00639b', title: 'Inquiry-Based Learning', titleVi: 'Dạy học khám phá – truy vấn', category: 'inquiry',
    summary: 'Bắt đầu từ câu hỏi, dữ liệu hoặc vấn đề; học sinh tìm, đánh giá bằng chứng và xây dựng kết luận bằng tiếng Anh.',
    theory: 'Inquiry-based learning chuyển trọng tâm từ nhận câu trả lời sang xây dựng hiểu biết. Mức inquiry có thể từ có hướng dẫn mạnh đến mở; với người học ngoại ngữ, guided inquiry thường hiệu quả hơn vì nguồn, câu hỏi, ngôn ngữ học thuật và graphic organizer được scaffold. Quá trình inquiry tạo mục đích thật cho đọc, nghe, nói và viết.',
    principles: ['Câu hỏi thúc đẩy điều tra, không có một đáp án chép lại.', 'Kết luận phải dựa trên bằng chứng.', 'Nguồn và công cụ ghi bằng chứng phù hợp trình độ.', 'Học sinh trình bày, phản biện và điều chỉnh kết luận.'],
    suitable: ['Đọc hiểu học thuật', 'Critical thinking', 'Chủ đề xã hội', 'Project mini'],
    notIdeal: ['Câu hỏi quá rộng và nguồn không giới hạn.', 'Học sinh thiếu kĩ năng đọc nguồn nhưng không có scaffold.'],
    teacherRole: 'Thiết kế câu hỏi, lựa chọn nguồn, dạy kĩ năng bằng chứng và tổ chức conference để đẩy tư duy.',
    learnerRole: 'Đặt câu hỏi phụ, đọc nguồn, ghi bằng chứng, so sánh quan điểm, xây claim và phản tư.',
    steps: ['Đưa hiện tượng hoặc câu hỏi kích thích.', 'Thu câu hỏi học sinh và thu hẹp inquiry question.', 'Cung cấp/định hướng nguồn đáng tin cậy.', 'Dạy cách ghi claim–evidence–reasoning.', 'Cho nhóm xây và kiểm tra kết luận.', 'Trình bày, phản biện và sửa kết luận.'],
    lessonFlow: [['Engage', '7 phút', 'Quan sát dữ liệu/hình ảnh và đặt câu hỏi.'], ['Investigate', '15 phút', 'Đọc/nghe nguồn theo nhóm với organizer.'], ['Construct', '10 phút', 'Tạo claim và chọn evidence.'], ['Discuss', '8 phút', 'Gallery walk hoặc mini debate.'], ['Reflect', '5 phút', 'Sửa claim và ghi câu hỏi còn lại.']],
    activities: ['Source comparison', 'Evidence hunt', 'Claim–Evidence–Reasoning', 'Mini debate', 'Question formulation'],
    sample: { topic: 'Should our school reduce single-use plastic?', level: 'B1–B2', objective: 'Học sinh dùng dữ liệu và nguồn ngắn để đưa khuyến nghị có bằng chứng.', sequence: ['Quan sát ảnh rác nhựa và dữ liệu tiêu thụ của trường.', 'Nhóm tạo câu hỏi và chọn câu hỏi trung tâm.', 'Đọc ba nguồn có quan điểm khác nhau.', 'Hoàn thiện CER organizer và kiểm tra độ tin cậy.', 'Trình bày recommendation, nhận câu hỏi và sửa kết luận.'], evidence: 'Question board, source notes, CER organizer và recommendation cuối.' },
    differentiation: { support: 'Nguồn đã chunk, từ khóa, audio, question stems và CER frame.', extension: 'Thêm nguồn mâu thuẫn, phân tích bias hoặc đề xuất cách thu dữ liệu sơ cấp.', access: 'Cho sản phẩm nói, viết hoặc infographic có thuyết minh.' },
    assessment: 'Đánh giá chất lượng câu hỏi, lựa chọn bằng chứng, mối liên hệ claim–evidence–reasoning, độ tin cậy nguồn và ngôn ngữ học thuật.',
    indicators: ['Học sinh phân biệt được ý kiến và bằng chứng.', 'Kết luận thay đổi khi có dữ liệu mới.', 'Nguồn được trích dẫn hoặc ghi nhận.', 'Câu hỏi học sinh trở nên cụ thể và sâu hơn.'],
    misconceptions: ['Inquiry không đồng nghĩa để học sinh tự tìm mọi thứ trên Internet.', 'Sản phẩm sáng tạo không thay thế bằng chứng.', 'Giáo viên vẫn cần dạy trực tiếp kĩ năng và kiến thức đúng lúc.'],
    caution: 'Giới hạn nguồn, dạy media literacy và tránh chủ đề vượt quá độ trưởng thành hoặc an toàn của học sinh.',
    checklist: ['Câu hỏi có thể điều tra?', 'Nguồn có phù hợp và đa chiều?', 'Đã dạy cách ghi evidence?', 'Có protocol phản biện?', 'Học sinh có sửa kết luận?'],
    sources: ['National Research Council – Inquiry and the National Science Education Standards', 'British Council resources on inquiry and critical thinking', 'Claim–Evidence–Reasoning instructional framework']
  },
  {
    id: 'clil', icon: 'CI', color: '#137333', title: 'Content and Language Integrated Learning', titleVi: 'Tích hợp nội dung và ngôn ngữ (CLIL)', category: 'inquiry',
    summary: 'Dạy một nội dung có giá trị qua tiếng Anh đồng thời lập mục tiêu rõ cho ngôn ngữ cần hiểu, cần dùng và cần phát triển.',
    theory: 'CLIL cân bằng Content, Communication, Cognition và Culture. Giáo viên không chỉ dịch bài môn học sang tiếng Anh mà thiết kế lại input, độ khó nhận thức, ngôn ngữ chức năng và scaffold. Cần phân biệt language of learning (từ/cấu trúc cốt lõi), language for learning (ngôn ngữ thực hiện nhiệm vụ) và language through learning (ngôn ngữ nảy sinh khi học).',
    principles: ['Hai bộ mục tiêu: nội dung và ngôn ngữ.', 'Input trực quan, multimodal và được chunk.', 'Nhiệm vụ yêu cầu tư duy chứ không chỉ chép thông tin.', 'Đánh giá tách độ hiểu nội dung và cách diễn đạt.'],
    suitable: ['STEM bằng tiếng Anh', 'Global issues', 'Học sinh khá/giỏi', 'Dự án liên môn'],
    notIdeal: ['Nội dung quá khó và chỉ giảm bằng cách dịch.', 'Đánh giá ngôn ngữ làm che khuất mức hiểu nội dung.'],
    teacherRole: 'Phân tích nhu cầu ngôn ngữ, thiết kế graphic organizer, scaffold khái niệm và phối hợp mục tiêu nội dung–ngôn ngữ.',
    learnerRole: 'Xử lí khái niệm, dùng ngôn ngữ chức năng để phân loại/giải thích/lập luận và tự xây vocabulary notebook.',
    steps: ['Xác định mục tiêu nội dung và ngôn ngữ.', 'Phân tích cognitive demand và từ/cấu trúc cần thiết.', 'Chọn input đa phương thức vừa sức.', 'Dạy language of/for learning.', 'Tổ chức nhiệm vụ tư duy và tương tác.', 'Đánh giá hai chiều và reflection.'],
    lessonFlow: [['Activate', '5 phút', 'Kích hoạt khái niệm qua hình/hiện tượng.'], ['Input', '10 phút', 'Video/text chunked với organizer.'], ['Language focus', '8 phút', 'Từ khóa và chức năng giải thích nguyên nhân–kết quả.'], ['Cognitive task', '15 phút', 'Phân loại, mô hình hóa hoặc giải thích.'], ['Output', '10 phút', 'Poster, explanation hoặc report.']],
    activities: ['Explain a process', 'Label and classify', 'Cause–effect poster', 'Mini experiment report', 'Concept map'],
    sample: { topic: 'The greenhouse effect', level: 'B1–B2', objective: 'Học sinh giải thích quá trình hiệu ứng nhà kính bằng sơ đồ và ngôn ngữ nguyên nhân–kết quả.', sequence: ['Dự đoán từ ảnh nhiệt độ Trái Đất.', 'Xem video 3 phút và hoàn thiện sequence diagram.', 'Học các cụm cause, trap, absorb, lead to, as a result.', 'Nhóm sắp xếp thẻ quá trình và giải thích cho bạn.', 'Tạo infographic và thuyết minh 90 giây.'], evidence: 'Sequence diagram, explanation oral và infographic có nhãn.' },
    differentiation: { support: 'Hình ảnh, bilingual glossary, sentence frames và rehearsal.', extension: 'Phân biệt natural/enhanced greenhouse effect, đọc biểu đồ hoặc phản biện misconception.', access: 'Audio description, text chunk và sản phẩm multimodal.' },
    assessment: 'Rubric hai phần: độ chính xác khái niệm và khả năng dùng ngôn ngữ chức năng; cho phép lỗi nhỏ không làm sai ý nội dung.',
    indicators: ['Học sinh dùng tiếng Anh để thao tác với khái niệm.', 'Mục tiêu ngôn ngữ xuất phát từ nhiệm vụ nội dung.', 'Graphic organizer giảm tải nhưng không giảm tư duy.', 'Đánh giá cho biết riêng mức hiểu nội dung và mức diễn đạt.'],
    misconceptions: ['CLIL không phải dạy môn học bằng tiếng Anh y nguyên.', 'Dịch toàn bộ không phải scaffold duy nhất.', 'Từ vựng chuyên môn không đủ; cần language functions.'],
    caution: 'Không đánh đồng khó ngôn ngữ với khó nội dung. Phối hợp với giáo viên môn học và kiểm tra độ chính xác khái niệm.',
    checklist: ['Có hai bộ mục tiêu?', 'Cognitive demand có vừa sức?', 'Language of/for learning đã rõ?', 'Input có multimodal?', 'Rubric tách nội dung và ngôn ngữ?'],
    sources: ['British Council TeachingEnglish – CLIL', 'Coyle, Hood & Marsh – CLIL', 'The 4Cs Framework for CLIL']
  },
  {
    id: 'formative', icon: 'FA', color: '#c26401', title: 'Formative Assessment', titleVi: 'Đánh giá vì sự tiến bộ', category: 'assessment',
    summary: 'Thu bằng chứng học tập trong quá trình dạy và dùng bằng chứng đó để thay đổi hành động của giáo viên hoặc học sinh ngay bước tiếp theo.',
    theory: 'Một hoạt động chỉ mang tính formative khi thông tin thu được dẫn đến hành động. Chu trình gồm làm rõ mục tiêu và tiêu chí, eliciting evidence, diễn giải bằng chứng, feedback có thể hành động, self/peer assessment và thời gian để học sinh sửa. Điểm số đơn lẻ thường không chỉ cho học sinh bước tiếp theo.',
    principles: ['Mục tiêu và tiêu chí thành công được hiểu rõ.', 'Câu hỏi/nhiệm vụ làm lộ tư duy, không chỉ kiểm tra nhớ.', 'Feedback hướng đến hành động cụ thể.', 'Học sinh có thời gian dùng feedback và chứng minh tiến bộ.'],
    suitable: ['Mọi bài học', 'Writing/Speaking', 'Theo dõi tiến bộ', 'Lớp phân hóa'],
    notIdeal: ['Thu nhiều dữ liệu nhưng không điều chỉnh dạy.', 'Feedback dài, muộn hoặc chỉ khen/chê.'],
    teacherRole: 'Thiết kế câu hỏi chẩn đoán, diễn giải lỗi, quyết định dạy lại/đi tiếp và tạo cơ hội sửa.',
    learnerRole: 'Hiểu tiêu chí, tự đánh giá, dùng feedback, đặt mục tiêu nhỏ và nộp lại minh chứng.',
    steps: ['Làm rõ learning intention và success criteria.', 'Thu bằng chứng từ mọi học sinh.', 'Phân loại lỗi/mức hiểu thay vì chỉ đếm đúng sai.', 'Chọn một next step có tác động cao.', 'Cho feedback ngắn và thời gian sửa.', 'Thu bằng chứng lần hai và điều chỉnh.'],
    lessonFlow: [['Clarify', '5 phút', 'Phân tích mẫu và đồng xây tiêu chí.'], ['Elicit', '10 phút', 'Câu hỏi hinge, mini whiteboard hoặc task ngắn.'], ['Respond', '8 phút', 'Dạy lại/phân nhóm theo bằng chứng.'], ['Practice & feedback', '15 phút', 'Thực hành, peer/self assessment có protocol.'], ['Improve', '7 phút', 'Sửa sản phẩm và exit ticket.']],
    activities: ['Exit ticket', 'Mini whiteboard', 'Traffic light', 'Peer feedback protocol', 'Error analysis'],
    sample: { topic: 'Argumentative paragraph', level: 'B1–B2', objective: 'Học sinh viết đoạn có claim, reason, evidence và cohesive devices.', sequence: ['So sánh hai đoạn mẫu và rút success criteria.', 'Viết claim + reason trên mini whiteboard.', 'Giáo viên dùng lỗi để mini-lesson về evidence.', 'Học sinh viết đoạn, peer feedback theo hai tiêu chí.', 'Sửa bằng màu khác và ghi next step cá nhân.'], evidence: 'Bản nháp, feedback, bản sửa và next-step note.' },
    differentiation: { support: 'Worked example, checklist rút gọn, conference ngắn và câu gợi ý.', extension: 'Yêu cầu counterargument, varied cohesion hoặc feedback như editor.', access: 'Feedback audio, kí hiệu nhất quán và thời gian sửa linh hoạt.' },
    assessment: 'Lưu chuỗi minh chứng trước–sau, dùng hinge questions, exit tickets và conference; điểm tổng kết tách khỏi vòng luyện formative.',
    indicators: ['Giáo viên thay đổi bài dạy dựa trên bằng chứng.', 'Feedback nêu bước tiếp theo chứ không chỉ nhận xét chung.', 'Học sinh sửa sản phẩm ngay trong bài học.', 'Tiêu chí được dùng để tự/đồng đánh giá.'],
    misconceptions: ['Quiz thường xuyên chưa chắc là formative.', 'Cho điểm kèm nhận xét có thể khiến học sinh chỉ nhìn điểm.', 'Feedback nhiều không bằng feedback đúng lúc và dùng được.'],
    caution: 'Không thu dữ liệu quá mức. Chọn vài bằng chứng gắn quyết định cụ thể và xây văn hóa xem lỗi là thông tin để học.',
    checklist: ['Mục tiêu/tiêu chí đã rõ?', 'Bằng chứng đến từ mọi học sinh?', 'Tôi sẽ làm gì với từng kiểu phản hồi?', 'Feedback có next step?', 'Có thời gian sửa và kiểm tra lại?'],
    sources: ['Black & Wiliam – Inside the Black Box', 'Education Endowment Foundation – Teacher Feedback', 'Wiliam – Embedded Formative Assessment']
  },
  {
    id: 'retrieval', icon: 'RP', color: '#8e4e00', title: 'Retrieval Practice', titleVi: 'Luyện tập truy hồi', category: 'assessment',
    summary: 'Củng cố trí nhớ bằng việc chủ động lấy kiến thức ra khỏi trí nhớ, có phản hồi và lặp lại theo khoảng cách, thay vì chỉ đọc lại.',
    theory: 'Retrieval practice tạo cơ hội nhớ lại trong điều kiện rủi ro thấp. Hiệu quả tăng khi câu hỏi được giãn cách, trộn nội dung cũ–mới và có phản hồi chính xác. Trong môn tiếng Anh, truy hồi có thể áp dụng cho từ vựng, cấu trúc, ý chính, quy trình viết và chiến lược đọc. Mục đích là tăng khả năng truy cập và transfer, không biến mọi lần nhớ lại thành bài kiểm tra lấy điểm.',
    principles: ['Nhớ lại trước khi nhìn đáp án hoặc tài liệu.', 'Rủi ro thấp, mọi học sinh đều tham gia.', 'Feedback đúng và nhanh sau nỗ lực nhớ.', 'Spacing, interleaving và cumulative review.'],
    suitable: ['Từ vựng', 'Ngữ pháp', 'Ôn thi', 'Mở đầu/kết thúc tiết học'],
    notIdeal: ['Dùng như kiểm tra áp lực cao hằng ngày.', 'Chỉ hỏi kiến thức rời rạc mà không có transfer.'],
    teacherRole: 'Chọn kiến thức cốt lõi, thiết kế lịch giãn cách, thu lỗi phổ biến và kết nối truy hồi với ứng dụng sâu.',
    learnerRole: 'Cố gắng nhớ trước khi kiểm tra, sửa lỗi, theo dõi mục chưa chắc và dùng chiến lược spacing.',
    steps: ['Chọn 3–7 mục tiêu cốt lõi.', 'Tạo prompt buộc nhớ lại không nhìn.', 'Cho mọi học sinh trả lời đồng thời.', 'Cung cấp feedback và giải thích ngắn.', 'Trộn nội dung cũ–mới và tăng khoảng cách.', 'Thêm nhiệm vụ transfer hoặc giải thích.'],
    lessonFlow: [['Cumulative warm-up', '5 phút', '5 câu từ bài hôm qua, tuần trước và tháng trước.'], ['Feedback', '4 phút', 'So sánh đáp án, sửa và đánh dấu độ chắc chắn.'], ['New learning', '20 phút', 'Học nội dung mới.'], ['Interleaved practice', '10 phút', 'Trộn mục mới với kiến thức cũ.'], ['Exit retrieval', '5 phút', 'Brain dump hoặc explain from memory.']],
    activities: ['Brain dump', 'Low-stakes quiz', 'Flash recall', 'Cumulative warm-up', 'Explain from memory'],
    sample: { topic: 'Twelve tenses and academic vocabulary', level: 'B1–B2', objective: 'Học sinh truy hồi dấu hiệu, cách dùng và ví dụ của các thì qua lịch giãn cách.', sequence: ['Ngày 1: brain dump sáu thì đã học.', 'Ngày 3: trộn câu chọn thì với collocations.', 'Ngày 7: giải thích khác biệt hai thì từ memory.', 'Ngày 14: cloze text cumulative.', 'Sau feedback, học sinh cập nhật error log và tự tạo ba prompt.'], evidence: 'Response sheets, confidence rating, error log và kết quả theo thời gian.' },
    differentiation: { support: 'Cue nhẹ, số mục ít hơn, response format đa dạng và extra retrieval round.', extension: 'Giải thích vì sao, tạo ví dụ mới, interleaving và transfer trong văn bản.', access: 'Trả lời nói/viết, thời gian chờ, không yêu cầu tốc độ cao.' },
    assessment: 'Theo dõi tỉ lệ nhớ lại và lỗi lặp theo thời gian; dùng dữ liệu để lên lịch ôn, không lấy mọi hoạt động làm điểm chính thức.',
    indicators: ['Học sinh trả lời trước khi nhìn tài liệu.', 'Nội dung cũ xuất hiện lại sau khoảng cách tăng dần.', 'Feedback sửa misconception ngay.', 'Có chuyển từ nhớ lại sang giải thích hoặc ứng dụng.'],
    misconceptions: ['Retrieval không phải chỉ flashcards.', 'Cảm giác khó khi nhớ lại không có nghĩa học kém.', 'Đọc lại ngay trước quiz có thể tạo ảo tưởng thành thạo.'],
    caution: 'Giữ môi trường rủi ro thấp, không công khai xếp hạng và luôn cung cấp đáp án đúng. Truy hồi không thay thế việc dạy hiểu sâu.',
    checklist: ['Prompt có buộc nhớ trước khi nhìn?', 'Mọi học sinh trả lời?', 'Feedback có ngay?', 'Nội dung có được giãn cách/trộn?', 'Có bước transfer hoặc giải thích?'],
    sources: ['RetrievalPractice.org – Retrieval Practice Guide', 'Roediger & Karpicke – Test-enhanced learning', 'Agarwal & Bain – Powerful Teaching']
  }
];

const CATEGORIES = [
  ['all', 'Tất cả'], ['communication', 'Giao tiếp & nhiệm vụ'], ['collaboration', 'Hợp tác & dự án'],
  ['personalization', 'Cá nhân hóa'], ['interaction', 'Tương tác lớp học'], ['inquiry', 'Khám phá & tích hợp'], ['assessment', 'Đánh giá vì tiến bộ']
];

const GOALS = [
  ['speaking', 'Tăng tương tác nói', ['clt', 'tblt', 'cooperative', 'gbl']],
  ['mixed', 'Lớp chênh lệch trình độ', ['differentiation', 'station', 'blended', 'flipped']],
  ['project', 'Tạo sản phẩm/dự án', ['pbl', 'tblt', 'clil', 'inquiry']],
  ['retention', 'Ghi nhớ lâu', ['retrieval', 'formative', 'station', 'gbl']],
  ['autonomy', 'Tăng tự chủ', ['flipped', 'blended', 'inquiry', 'pbl']]
];

function copyMethod(method) {
  const flow = method.lessonFlow.map(([stage, time, action]) => `- ${stage} (${time}): ${action}`).join('\n');
  const sample = method.sample;
  const value = `${method.titleVi} (${method.title})\n\nTÓM TẮT\n${method.summary}\n\nLÝ THUYẾT\n${method.theory}\n\nNGUYÊN LÝ CỐT LÕI\n- ${method.principles.join('\n- ')}\n\nPHÙ HỢP KHI\n- ${method.suitable.join('\n- ')}\n\nKHÔNG NÊN ƯU TIÊN KHI\n- ${method.notIdeal.join('\n- ')}\n\nVAI TRÒ GIÁO VIÊN\n${method.teacherRole}\n\nVAI TRÒ HỌC SINH\n${method.learnerRole}\n\nQUY TRÌNH\n${method.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nGỢI Ý NHỊP BÀI HỌC\n${flow}\n\nHOẠT ĐỘNG GỢI Ý\n- ${method.activities.join('\n- ')}\n\nVÍ DỤ MINH HỌA\nChủ đề: ${sample.topic}\nTrình độ: ${sample.level}\nMục tiêu: ${sample.objective}\n${sample.sequence.map((item, index) => `${index + 1}. ${item}`).join('\n')}\nMinh chứng: ${sample.evidence}\n\nPHÂN HÓA\n- Hỗ trợ: ${method.differentiation.support}\n- Mở rộng: ${method.differentiation.extension}\n- Tiếp cận: ${method.differentiation.access}\n\nĐÁNH GIÁ\n${method.assessment}\n\nDẤU HIỆU TRIỂN KHAI TỐT\n- ${method.indicators.join('\n- ')}\n\nHIỂU LẦM THƯỜNG GẶP\n- ${method.misconceptions.join('\n- ')}\n\nLƯU Ý\n${method.caution}\n\nCHECKLIST\n- ${method.checklist.join('\n- ')}\n\nCƠ SỞ THAM KHẢO\n- ${method.sources.join('\n- ')}`;
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const area = document.createElement('textarea'); area.value = value; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
  return Promise.resolve();
}

export default function TeachingMethodsHub() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [goal, setGoal] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [copied, setCopied] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bes-teaching-method-favorites') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (!selected) return undefined;
    setDrawerTab('overview');
    const close = (event) => { if (event.key === 'Escape') setSelected(null); };
    document.documentElement.classList.add('tmh-drawer-open');
    window.addEventListener('keydown', close);
    return () => { document.documentElement.classList.remove('tmh-drawer-open'); window.removeEventListener('keydown', close); };
  }, [selected]);

  useEffect(() => {
    try { localStorage.setItem('bes-teaching-method-favorites', JSON.stringify(favorites)); } catch { /* optional */ }
  }, [favorites]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const goalIds = GOALS.find(([id]) => id === goal)?.[2] || null;
    return METHODS.filter((method) => {
      if (category !== 'all' && method.category !== category) return false;
      if (goalIds && !goalIds.includes(method.id)) return false;
      const haystack = `${method.title} ${method.titleVi} ${method.summary} ${method.theory} ${method.activities.join(' ')} ${method.principles.join(' ')}`.toLowerCase();
      return !needle || haystack.includes(needle);
    });
  }, [category, goal, query]);

  const toggleFavorite = (id) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const handleCopy = async (method) => {
    await copyMethod(method);
    setCopied(method.id);
    window.setTimeout(() => setCopied(''), 1800);
  };

  return (
    <section className="tmh-page" aria-label="Hub phương pháp giảng dạy tiếng Anh">
      <header className="tmh-hero">
        <div className="tmh-hero-copy">
          <span className="tmh-eyebrow">ENGLISH HUB · PROFESSIONAL LEARNING</span>
          <h1>Phương pháp giảng dạy tiếng Anh</h1>
          <p>Thư viện chuyên môn từ lý thuyết đến thực hành: chọn đúng phương pháp, xem một cấu trúc bài dạy hoàn chỉnh và áp dụng ngay cho lớp THPT.</p>
          <div className="tmh-hero-actions">
            <button type="button" className="tmh-button primary" onClick={() => document.querySelector('#tmh-library')?.scrollIntoView({ behavior: 'smooth' })}>Khám phá phương pháp</button>
            <button type="button" className="tmh-button" onClick={() => document.querySelector('#tmh-selector')?.scrollIntoView({ behavior: 'smooth' })}>Chọn theo mục tiêu</button>
          </div>
          <div className="tmh-hero-chips"><span>{METHODS.length} phương pháp chuyên sâu</span><span>Ví dụ THPT cụ thể</span><span>Checklist triển khai</span></div>
        </div>
        <div className="tmh-hero-visual" aria-hidden="true">
          <div className="tmh-visual-orbit"><span>CLT</span><span>TBLT</span><span>PBL</span><span>CLIL</span></div>
          <div className="tmh-visual-card main"><small>LESSON DESIGN</small><strong>Goal → Method → Evidence</strong><i>✓</i></div>
          <div className="tmh-visual-card side"><b>01</b><span>Lý thuyết</span></div>
          <div className="tmh-visual-card side second"><b>02</b><span>Thực hành</span></div>
        </div>
      </header>

      <section className="tmh-principles" aria-label="Nguyên tắc lựa chọn">
        {[['01', 'Bắt đầu từ mục tiêu', 'Viết rõ học sinh cần làm được gì bằng tiếng Anh.'], ['02', 'Thiết kế bằng chứng', 'Xác định sản phẩm hoặc hành vi chứng minh mức đạt.'], ['03', 'Scaffold có chủ đích', 'Hỗ trợ vừa đủ rồi rút dần để tăng tự chủ.'], ['04', 'Phản hồi để tiến bộ', 'Dùng dữ liệu thật để điều chỉnh bước dạy tiếp theo.']].map(([number, title, text]) => (
          <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></article>
        ))}
      </section>

      <section className="tmh-selector" id="tmh-selector">
        <div className="tmh-section-heading"><div><span className="tmh-section-kicker">BỘ CHỌN NHANH</span><h2>Bạn muốn cải thiện điều gì?</h2><p>Chọn mục tiêu để thu hẹp những phương pháp phù hợp nhất với lớp học.</p></div>{goal ? <button type="button" onClick={() => setGoal('')}>Xóa lựa chọn</button> : null}</div>
        <div className="tmh-goal-grid">
          {GOALS.map(([id, label, ids], index) => <button type="button" key={id} className={goal === id ? 'is-active' : ''} onClick={() => setGoal(goal === id ? '' : id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong><small>{ids.length} phương pháp gợi ý</small></button>)}
        </div>
      </section>

      <section className="tmh-library" id="tmh-library">
        <div className="tmh-library-toolbar">
          <div><span className="tmh-section-kicker">THƯ VIỆN PHƯƠNG PHÁP</span><h2>{visible.length} nội dung đang hiển thị</h2></div>
          <label className="tmh-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm phương pháp, hoạt động, nguyên lý hoặc mục tiêu…" /></label>
        </div>
        <div className="tmh-category-row">
          {CATEGORIES.map(([id, label]) => <button type="button" key={id} className={category === id ? 'is-active' : ''} onClick={() => setCategory(id)}>{label}</button>)}
        </div>
        <div className="tmh-method-grid">
          {visible.map((method) => (
            <article key={method.id} className="tmh-method-card" style={{ '--method-color': method.color }}>
              <div className="tmh-method-head"><span>{method.icon}</span><button type="button" className={favorites.includes(method.id) ? 'is-favorite' : ''} onClick={() => toggleFavorite(method.id)} aria-label="Yêu thích">{favorites.includes(method.id) ? '★' : '☆'}</button></div>
              <div className="tmh-method-copy"><small>{method.title}</small><h3>{method.titleVi}</h3><p>{method.summary}</p></div>
              <div className="tmh-method-tags">{method.suitable.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div>
              <div className="tmh-card-depth"><span>{method.principles.length} nguyên lý</span><span>{method.steps.length} bước</span><span>1 ví dụ hoàn chỉnh</span></div>
              <footer><button type="button" onClick={() => setSelected(method)}>Mở hồ sơ chuyên môn</button><button type="button" className="copy" onClick={() => handleCopy(method)}>{copied === method.id ? 'Đã copy ✓' : 'Copy toàn bộ'}</button></footer>
            </article>
          ))}
        </div>
        {!visible.length ? <div className="tmh-empty"><span>⌕</span><h3>Không tìm thấy phương pháp phù hợp</h3><p>Hãy đổi từ khóa, nhóm phương pháp hoặc mục tiêu đã chọn.</p></div> : null}
      </section>

      <section className="tmh-implementation">
        <div className="tmh-section-heading"><div><span className="tmh-section-kicker">KHUNG TRIỂN KHAI</span><h2>Từ phương pháp đến một tiết dạy</h2><p>Dùng quy trình năm bước để giữ phương pháp phục vụ mục tiêu, thay vì chọn vì hình thức hấp dẫn.</p></div></div>
        <div className="tmh-process">
          {[['1', 'Mục tiêu', 'Viết đầu ra quan sát được.'], ['2', 'Bằng chứng', 'Chọn sản phẩm hoặc hành vi cần thu.'], ['3', 'Phương pháp', 'Chọn cấu trúc phù hợp mục tiêu và lớp.'], ['4', 'Hoạt động', 'Thiết kế instruction, thời gian và scaffold.'], ['5', 'Phản hồi', 'Dùng dữ liệu để sửa và dạy tiếp.']].map(([n, title, text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      {selected ? (
        <div className="tmh-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <aside className="tmh-drawer tmh-drawer-rich" role="dialog" aria-modal="true" aria-labelledby="tmh-drawer-title">
            <header style={{ '--method-color': selected.color }}><div><span>{selected.icon}</span><div><small>{selected.title}</small><h2 id="tmh-drawer-title">{selected.titleVi}</h2></div></div><button type="button" onClick={() => setSelected(null)} aria-label="Đóng">×</button></header>
            <nav className="tmh-drawer-tabs" aria-label="Nội dung phương pháp">
              {[['overview', 'Tổng quan'], ['design', 'Thiết kế bài dạy'], ['assessment', 'Đánh giá & phân hóa'], ['checklist', 'Checklist']].map(([id, label]) => <button type="button" key={id} className={drawerTab === id ? 'is-active' : ''} onClick={() => setDrawerTab(id)}>{label}</button>)}
            </nav>
            <div className="tmh-drawer-scroll">
              {drawerTab === 'overview' ? <>
                <section className="tmh-theory"><span>LÝ THUYẾT CỐT LÕI</span><p>{selected.theory}</p></section>
                <section><h3>Nguyên lý thiết kế</h3><div className="tmh-principle-detail-grid">{selected.principles.map((item, index) => <article key={item}><b>{String(index + 1).padStart(2, '0')}</b><p>{item}</p></article>)}</div></section>
                <section><h3>Phù hợp và giới hạn</h3><div className="tmh-fit-columns"><div><h4>Nên ưu tiên khi</h4>{selected.suitable.map((item) => <span key={item}>✓ {item}</span>)}</div><div className="not-ideal"><h4>Không nên ưu tiên khi</h4>{selected.notIdeal.map((item) => <span key={item}>— {item}</span>)}</div></div></section>
                <section><h3>Vai trò trong lớp học</h3><div className="tmh-role-grid"><article><span>GV</span><div><h4>Giáo viên</h4><p>{selected.teacherRole}</p></div></article><article><span>HS</span><div><h4>Học sinh</h4><p>{selected.learnerRole}</p></div></article></div></section>
              </> : null}

              {drawerTab === 'design' ? <>
                <section><h3>Quy trình triển khai</h3><ol>{selected.steps.map((step) => <li key={step}><span>{step}</span></li>)}</ol></section>
                <section><h3>Gợi ý nhịp bài học</h3><div className="tmh-lesson-flow">{selected.lessonFlow.map(([stage, time, action]) => <article key={stage}><span>{time}</span><div><h4>{stage}</h4><p>{action}</p></div></article>)}</div></section>
                <section><h3>Hoạt động gợi ý</h3><div className="tmh-activity-list">{selected.activities.map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, '0')}</b>{item}</span>)}</div></section>
                <section className="tmh-sample-lesson"><div className="tmh-sample-heading"><span>VÍ DỤ THPT</span><h3>{selected.sample.topic}</h3><div><b>{selected.sample.level}</b><p>{selected.sample.objective}</p></div></div><ol>{selected.sample.sequence.map((item) => <li key={item}><span>{item}</span></li>)}</ol><footer><b>Minh chứng cần thu</b><p>{selected.sample.evidence}</p></footer></section>
              </> : null}

              {drawerTab === 'assessment' ? <>
                <section className="tmh-note assessment"><h3>Đánh giá học tập</h3><p>{selected.assessment}</p></section>
                <section><h3>Phân hóa và tiếp cận</h3><div className="tmh-differentiation-grid"><article><span>Hỗ trợ</span><p>{selected.differentiation.support}</p></article><article><span>Mở rộng</span><p>{selected.differentiation.extension}</p></article><article><span>Tiếp cận</span><p>{selected.differentiation.access}</p></article></div></section>
                <section><h3>Dấu hiệu triển khai tốt</h3><div className="tmh-indicator-list">{selected.indicators.map((item) => <span key={item}>✓ {item}</span>)}</div></section>
                <section><h3>Hiểu lầm thường gặp</h3><div className="tmh-misconception-list">{selected.misconceptions.map((item) => <span key={item}>! {item}</span>)}</div></section>
                <section className="tmh-note caution"><h3>Lưu ý khi áp dụng</h3><p>{selected.caution}</p></section>
              </> : null}

              {drawerTab === 'checklist' ? <>
                <section className="tmh-checklist-section"><span className="tmh-section-kicker">TRƯỚC KHI DẠY</span><h3>Checklist triển khai</h3><div>{selected.checklist.map((item, index) => <label key={item}><input type="checkbox" /><span><b>{String(index + 1).padStart(2, '0')}</b>{item}</span></label>)}</div></section>
                <section><h3>Cơ sở tham khảo</h3><p className="tmh-reference-note">Các nguồn dưới đây giúp giáo viên đọc sâu hơn; nội dung trong Hub đã được diễn giải theo bối cảnh dạy tiếng Anh THPT.</p><div className="tmh-source-list">{selected.sources.map((item) => <span key={item}>↗ {item}</span>)}</div></section>
                <section className="tmh-copy-panel"><div><h3>Sao chép hồ sơ hoàn chỉnh</h3><p>Sao chép toàn bộ lý thuyết, quy trình, ví dụ, phân hóa và checklist để đưa vào giáo án hoặc sinh hoạt chuyên môn.</p></div><button type="button" className="tmh-button primary" onClick={() => handleCopy(selected)}>{copied === selected.id ? 'Đã copy ✓' : 'Copy toàn bộ nội dung'}</button></section>
              </> : null}
            </div>
            <footer><button type="button" className="tmh-button" onClick={() => toggleFavorite(selected.id)}>{favorites.includes(selected.id) ? '★ Đã lưu' : '☆ Lưu phương pháp'}</button><button type="button" className="tmh-button primary" onClick={() => handleCopy(selected)}>{copied === selected.id ? 'Đã copy ✓' : 'Copy hồ sơ chuyên môn'}</button></footer>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
