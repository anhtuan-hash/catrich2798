import React, { useEffect, useMemo, useState } from 'react';
import './TeachingMethodsHub.css';

const METHODS = [
  {
    id: 'clt', icon: 'CL', color: '#0b57d0', title: 'Communicative Language Teaching', titleVi: 'Dạy học ngôn ngữ giao tiếp', category: 'communication',
    summary: 'Đặt việc sử dụng ngôn ngữ có ý nghĩa làm trung tâm; độ trôi chảy và khả năng tương tác được phát triển song song với độ chính xác.',
    theory: 'CLT xem năng lực giao tiếp là mục tiêu chính của việc học ngôn ngữ. Học sinh học bằng cách thương lượng ý nghĩa, xử lý khoảng trống thông tin và phản hồi trong những tình huống gần với giao tiếp thực tế.',
    suitable: ['Luyện nói và nghe', 'Phát triển fluency', 'Lớp B1–C1', 'Chủ đề đời sống và học thuật'],
    steps: ['Xác định mục tiêu giao tiếp cụ thể.', 'Tạo tình huống có khoảng trống thông tin.', 'Cho học sinh chuẩn bị ngôn ngữ cần thiết.', 'Tổ chức tương tác theo cặp/nhóm.', 'Phản hồi sau hoạt động, ưu tiên lỗi ảnh hưởng ý nghĩa.'],
    activities: ['Information gap', 'Role-play có mục tiêu', 'Opinion line', 'Find someone who', 'Problem-solving discussion'],
    assessment: 'Checklist hoàn thành nhiệm vụ, mức độ rõ ý, khả năng duy trì tương tác và sử dụng chiến lược giao tiếp.',
    caution: 'Không biến hoạt động giao tiếp thành nói tự do thiếu mục tiêu; cần scaffolding từ vựng, cấu trúc và mẫu diễn đạt.'
  },
  {
    id: 'tblt', icon: 'TB', color: '#137333', title: 'Task-Based Language Teaching', titleVi: 'Dạy học dựa trên nhiệm vụ', category: 'communication',
    summary: 'Tổ chức bài học quanh một nhiệm vụ có sản phẩm rõ ràng thay vì bắt đầu từ một điểm ngữ pháp riêng lẻ.',
    theory: 'TBLT dùng nhiệm vụ thực tế hoặc mô phỏng thực tế làm đơn vị thiết kế. Ngôn ngữ được huy động để đạt kết quả, sau đó giáo viên giúp học sinh chú ý đến hình thức ngôn ngữ xuất hiện trong quá trình thực hiện.',
    suitable: ['Tích hợp kĩ năng', 'Luyện thi nói/viết', 'Dự án ngắn', 'Lớp có trình độ tương đối đồng đều'],
    steps: ['Pre-task: kích hoạt kiến thức và làm rõ sản phẩm.', 'Task cycle: thực hiện nhiệm vụ theo nhóm.', 'Planning: chuẩn bị báo cáo kết quả.', 'Report: trình bày hoặc chia sẻ sản phẩm.', 'Language focus: phân tích và luyện ngôn ngữ nổi bật.'],
    activities: ['Lập kế hoạch chuyến đi', 'Giải quyết tình huống', 'Thiết kế poster', 'So sánh lựa chọn', 'Khảo sát và báo cáo'],
    assessment: 'Rubric gồm mức độ hoàn thành nhiệm vụ, tính phù hợp nội dung, độ rõ ràng và chất lượng sử dụng ngôn ngữ.',
    caution: 'Nhiệm vụ phải có đầu ra quan sát được; tránh đặt tên “task” cho một chuỗi bài tập điền từ không có mục tiêu giao tiếp.'
  },
  {
    id: 'pbl', icon: 'PB', color: '#a142f4', title: 'Project-Based Learning', titleVi: 'Dạy học theo dự án', category: 'collaboration',
    summary: 'Học sinh giải quyết một câu hỏi lớn qua nhiều buổi và tạo ra sản phẩm có thể chia sẻ với người khác.',
    theory: 'PBL kết hợp inquiry, hợp tác, lựa chọn của người học và sản phẩm công khai. Trong lớp tiếng Anh, ngôn ngữ vừa là công cụ nghiên cứu vừa là phương tiện trình bày sản phẩm.',
    suitable: ['Unit theo chủ đề', 'Học sinh THPT', 'Tích hợp đọc–viết–nói', 'Đánh giá năng lực'],
    steps: ['Đặt driving question.', 'Xác định sản phẩm và tiêu chí.', 'Chia vai trò, mốc tiến độ.', 'Nghiên cứu và tạo bản nháp.', 'Phản hồi–chỉnh sửa.', 'Trình bày sản phẩm và reflection.'],
    activities: ['Podcast học đường', 'Chiến dịch môi trường', 'Tạp chí số', 'Triển lãm văn hóa', 'Video hướng dẫn cộng đồng'],
    assessment: 'Rubric tách điểm quá trình, ngôn ngữ, chất lượng sản phẩm, hợp tác và tự đánh giá.',
    caution: 'Giữ phạm vi đủ nhỏ, có checkpoint và minh chứng đóng góp cá nhân để tránh một vài học sinh làm toàn bộ.'
  },
  {
    id: 'cooperative', icon: 'CO', color: '#e37400', title: 'Cooperative Learning', titleVi: 'Học tập hợp tác', category: 'collaboration',
    summary: 'Thiết kế sự phụ thuộc tích cực, trách nhiệm cá nhân và tương tác hỗ trợ trong nhóm.',
    theory: 'Học tập hợp tác khác “làm việc nhóm” thông thường ở chỗ mỗi thành viên có vai trò, sản phẩm chung và trách nhiệm cá nhân. Cấu trúc hoạt động giúp mọi học sinh phải tham gia.',
    suitable: ['Lớp đông', 'Ôn tập', 'Đọc hiểu', 'Phát triển peer support'],
    steps: ['Chọn cấu trúc hợp tác phù hợp.', 'Chia nhóm và vai trò rõ ràng.', 'Giao nhiệm vụ có sự phụ thuộc tích cực.', 'Kiểm tra trách nhiệm cá nhân.', 'Tổng kết cả nội dung lẫn kĩ năng hợp tác.'],
    activities: ['Jigsaw reading', 'Think–Pair–Share', 'Numbered Heads Together', 'Round Robin', 'Peer teaching'],
    assessment: 'Phiếu vai trò, kiểm tra ngẫu nhiên cá nhân, tự đánh giá đóng góp và sản phẩm nhóm.',
    caution: 'Không để học sinh mạnh thống trị. Hãy dùng thời gian phát biểu, vai trò luân phiên và sản phẩm cá nhân ngắn.'
  },
  {
    id: 'flipped', icon: 'FL', color: '#0f766e', title: 'Flipped Classroom', titleVi: 'Lớp học đảo ngược', category: 'personalization',
    summary: 'Chuyển phần tiếp nhận kiến thức cơ bản ra ngoài lớp và dành giờ học cho luyện tập có hướng dẫn.',
    theory: 'Mô hình đảo ngược không chỉ là “xem video ở nhà”. Giá trị chính nằm ở việc tái phân bổ thời gian: nội dung đầu vào ngắn, có kiểm tra; thời gian trên lớp dùng cho ứng dụng, sửa lỗi và hỗ trợ phân hóa.',
    suitable: ['Ngữ pháp nền', 'Writing process', 'Lớp có LMS', 'Bài học cần nhiều luyện tập'],
    steps: ['Tạo micro-content 5–10 phút.', 'Gắn câu hỏi kiểm tra hiểu.', 'Dùng dữ liệu để phân nhóm trên lớp.', 'Tổ chức hoạt động ứng dụng.', 'Cho phép xem lại và bổ sung.'],
    activities: ['Video + 3 câu kiểm tra', 'Interactive note', 'Error clinic trên lớp', 'Workshop viết', 'Station support'],
    assessment: 'Exit ticket, quiz đầu giờ, sản phẩm ứng dụng và dữ liệu hoàn thành nội dung trước lớp.',
    caution: 'Luôn có phương án cho học sinh thiếu thiết bị hoặc chưa chuẩn bị; nội dung trước lớp phải ngắn và thật cần thiết.'
  },
  {
    id: 'blended', icon: 'BL', color: '#1a73e8', title: 'Blended Learning', titleVi: 'Dạy học kết hợp', category: 'personalization',
    summary: 'Kết hợp có chủ đích hoạt động trực tiếp và hoạt động số, mỗi môi trường đảm nhận phần phù hợp nhất.',
    theory: 'Blended learning là thiết kế một hành trình thống nhất, không phải cộng thêm bài online. Hoạt động số hỗ trợ luyện tập, phản hồi và tự chủ; hoạt động trực tiếp ưu tiên tương tác, giải thích và coaching.',
    suitable: ['Luyện tập phân hóa', 'Homework có phản hồi', 'Kho học liệu số', 'Theo dõi tiến độ'],
    steps: ['Xác định mục tiêu và dữ liệu cần thu.', 'Phân chia phần trực tiếp/online.', 'Tạo liên kết rõ giữa hai môi trường.', 'Theo dõi tiến độ.', 'Điều chỉnh dựa trên dữ liệu.'],
    activities: ['Quiz thích ứng', 'Forum phản hồi', 'Luyện nghe tự chọn tốc độ', 'Workshop trực tiếp', 'Portfolio số'],
    assessment: 'Kết hợp dữ liệu hoàn thành, sản phẩm trên lớp, phản hồi đồng đẳng và bài đánh giá ngắn.',
    caution: 'Không để học sinh làm hai lần cùng một việc; mỗi hoạt động phải có lý do rõ vì sao đặt online hoặc trực tiếp.'
  },
  {
    id: 'differentiation', icon: 'DI', color: '#b3261e', title: 'Differentiated Instruction', titleVi: 'Dạy học phân hóa', category: 'personalization',
    summary: 'Điều chỉnh nội dung, quá trình, sản phẩm hoặc mức hỗ trợ dựa trên mức sẵn sàng và nhu cầu học sinh.',
    theory: 'Phân hóa không đồng nghĩa soạn một bài riêng cho từng học sinh. Giáo viên dùng cùng mục tiêu cốt lõi nhưng tạo nhiều đường tiếp cận, mức scaffolding và cách thể hiện kết quả.',
    suitable: ['Lớp chênh lệch trình độ', 'Học sinh có nhu cầu khác nhau', 'Ôn tập', 'Kĩ năng đọc–viết'],
    steps: ['Chẩn đoán nhanh đầu vào.', 'Xác định mục tiêu bắt buộc.', 'Thiết kế 2–3 mức hỗ trợ hoặc lựa chọn.', 'Dùng nhóm linh hoạt.', 'Đánh giá theo cùng tiêu chí cốt lõi.'],
    activities: ['Tiered tasks', 'Choice board', 'Reading texts nhiều mức', 'Sentence frames', 'Extension challenge'],
    assessment: 'Cùng một rubric cốt lõi, bổ sung tiêu chí cá nhân hóa và minh chứng tiến bộ so với điểm xuất phát.',
    caution: 'Tránh gắn nhãn cố định “yếu/giỏi”. Nhóm cần linh hoạt theo nhiệm vụ và dữ liệu mới.'
  },
  {
    id: 'station', icon: 'SR', color: '#7c4dff', title: 'Station Rotation', titleVi: 'Luân chuyển trạm học tập', category: 'interaction',
    summary: 'Chia bài học thành các trạm ngắn để tăng hoạt động, phân hóa và phản hồi trực tiếp.',
    theory: 'Mỗi trạm có mục tiêu, hướng dẫn, thời lượng và sản phẩm rõ. Học sinh luân chuyển qua các hình thức như giáo viên hướng dẫn, luyện tập hợp tác, hoạt động số và tự học.',
    suitable: ['Lớp đông', 'Ôn tập nhiều kĩ năng', 'Dạy phân hóa', 'Tiết 45–90 phút'],
    steps: ['Chọn 3–5 trạm.', 'Viết instruction card.', 'Chuẩn bị tín hiệu chuyển trạm.', 'Dạy quy trình trước khi bắt đầu.', 'Thu sản phẩm ngắn ở mỗi trạm.'],
    activities: ['Teacher clinic', 'Vocabulary station', 'Listening station', 'Peer feedback', 'Game/retrieval station'],
    assessment: 'Passport trạm, sản phẩm mini, checklist hoàn thành và quan sát tại trạm giáo viên.',
    caution: 'Giảm thời gian di chuyển, chuẩn bị nhiệm vụ dự phòng và đặt trạm ồn xa trạm cần tập trung.'
  },
  {
    id: 'gbl', icon: 'GB', color: '#5b2a86', title: 'Game-Based Learning', titleVi: 'Dạy học dựa trên trò chơi', category: 'interaction',
    summary: 'Dùng luật chơi, quyết định và phản hồi để tạo trải nghiệm học tập, không chỉ dùng điểm thưởng trang trí.',
    theory: 'Game-based learning đặt kiến thức/kĩ năng bên trong cơ chế chơi. Người học phải dùng ngôn ngữ để tiến bộ, giải quyết thử thách hoặc ra quyết định. Gamification chỉ bổ sung yếu tố game cho hoạt động vốn có.',
    suitable: ['Ôn tập', 'Từ vựng', 'Speaking practice', 'Retrieval practice'],
    steps: ['Xác định hành vi học tập cần lặp.', 'Chọn cơ chế chơi phù hợp.', 'Giữ luật đơn giản.', 'Tạo phản hồi tức thì.', 'Debrief sau trò chơi.'],
    activities: ['Team race', 'Mystery box', 'Information quest', 'Vocabulary auction', 'Escape challenge'],
    assessment: 'Dùng dữ liệu trả lời, phiếu exit ticket và phần giải thích sau đáp án thay vì chỉ nhìn điểm thắng thua.',
    caution: 'Không để tốc độ lấn át độ chính xác hoặc gây loại trừ học sinh; luôn có vai trò cho mọi thành viên.'
  },
  {
    id: 'inquiry', icon: 'IQ', color: '#00639b', title: 'Inquiry-Based Learning', titleVi: 'Dạy học khám phá – truy vấn', category: 'inquiry',
    summary: 'Bắt đầu từ câu hỏi, dữ liệu hoặc vấn đề để học sinh tìm bằng chứng, hình thành và bảo vệ kết luận.',
    theory: 'Inquiry-based learning chuyển trọng tâm từ giáo viên cung cấp câu trả lời sang học sinh xây dựng hiểu biết qua câu hỏi, nguồn thông tin và lập luận. Trong lớp tiếng Anh, quá trình này tạo nhu cầu đọc, nói và viết có mục đích.',
    suitable: ['Đọc hiểu học thuật', 'Critical thinking', 'Chủ đề xã hội', 'Project mini'],
    steps: ['Đặt câu hỏi mở vừa sức.', 'Cung cấp nguồn hoặc dữ liệu.', 'Hướng dẫn cách ghi bằng chứng.', 'Cho học sinh xây dựng kết luận.', 'Trình bày, phản biện và reflection.'],
    activities: ['Source comparison', 'Evidence hunt', 'Claim–Evidence–Reasoning', 'Mini debate', 'Question formulation'],
    assessment: 'Đánh giá chất lượng câu hỏi, bằng chứng, lập luận và cách sử dụng ngôn ngữ học thuật.',
    caution: 'Cần giới hạn nguồn và scaffold câu hỏi; inquiry hoàn toàn mở có thể quá tải với người học ngôn ngữ.'
  },
  {
    id: 'clil', icon: 'CI', color: '#137333', title: 'Content and Language Integrated Learning', titleVi: 'Tích hợp nội dung và ngôn ngữ (CLIL)', category: 'inquiry',
    summary: 'Dạy một nội dung môn học hoặc chủ đề thực qua tiếng Anh, đồng thời thiết kế mục tiêu ngôn ngữ cụ thể.',
    theory: 'CLIL cân bằng bốn thành tố: Content, Communication, Cognition và Culture. Giáo viên không chỉ dịch nội dung sang tiếng Anh mà phải giảm tải nhận thức, dạy ngôn ngữ chức năng và hỗ trợ học sinh xử lý khái niệm.',
    suitable: ['STEM bằng tiếng Anh', 'Global issues', 'Học sinh khá/giỏi', 'Dự án liên môn'],
    steps: ['Xác định mục tiêu nội dung và ngôn ngữ.', 'Chọn input trực quan, vừa sức.', 'Dạy language of/for/through learning.', 'Tổ chức nhiệm vụ tư duy.', 'Đánh giá cả hiểu nội dung và cách diễn đạt.'],
    activities: ['Explain a process', 'Label and classify', 'Cause–effect poster', 'Mini experiment report', 'Concept map'],
    assessment: 'Rubric hai phần: độ chính xác nội dung và khả năng sử dụng ngôn ngữ chức năng.',
    caution: 'Không đánh đồng khó ngôn ngữ với khó nội dung; cần hình ảnh, graphic organizer và sentence frames.'
  },
  {
    id: 'formative', icon: 'FA', color: '#c26401', title: 'Formative Assessment', titleVi: 'Đánh giá vì sự tiến bộ', category: 'assessment',
    summary: 'Thu thập bằng chứng học tập liên tục để điều chỉnh dạy và giúp học sinh biết bước tiếp theo.',
    theory: 'Đánh giá thường xuyên chỉ có giá trị formative khi thông tin được sử dụng để thay đổi hành động. Trọng tâm là mục tiêu rõ, tiêu chí thành công, eliciting evidence, feedback có thể hành động và self/peer assessment.',
    suitable: ['Mọi bài học', 'Writing/Speaking', 'Theo dõi tiến bộ', 'Lớp phân hóa'],
    steps: ['Nêu mục tiêu và tiêu chí.', 'Thu bằng chứng trong quá trình học.', 'Diễn giải lỗi và mức hiểu.', 'Đưa feedback ngắn, cụ thể.', 'Cho thời gian sửa và chứng minh tiến bộ.'],
    activities: ['Exit ticket', 'Mini whiteboard', 'Traffic light', 'Peer feedback protocol', 'Error analysis'],
    assessment: 'Lưu minh chứng theo mục tiêu, so sánh bản nháp–bản sửa và ghi next step thay vì chỉ cho điểm.',
    caution: 'Feedback quá dài hoặc chỉ khen/chê không giúp cải thiện; ưu tiên 1–2 bước tiếp theo có thể thực hiện.'
  },
  {
    id: 'retrieval', icon: 'RP', color: '#8e4e00', title: 'Retrieval Practice', titleVi: 'Luyện tập truy hồi', category: 'assessment',
    summary: 'Củng cố trí nhớ bằng việc chủ động lấy kiến thức ra khỏi trí nhớ thay vì chỉ đọc lại.',
    theory: 'Truy hồi có khoảng cách và phản hồi giúp học lâu hơn. Trong tiếng Anh, có thể truy hồi từ vựng, cấu trúc, ý chính hoặc chiến lược; hoạt động nên rủi ro thấp và lặp lại theo thời gian.',
    suitable: ['Từ vựng', 'Ngữ pháp', 'Ôn thi', 'Mở đầu/kết thúc tiết học'],
    steps: ['Chọn kiến thức cốt lõi.', 'Yêu cầu nhớ lại không nhìn tài liệu.', 'Cho phản hồi ngay.', 'Trộn nội dung cũ–mới.', 'Lặp lại sau khoảng thời gian tăng dần.'],
    activities: ['Brain dump', 'Low-stakes quiz', 'Flash recall', 'Cumulative warm-up', 'Explain from memory'],
    assessment: 'Theo dõi tỉ lệ nhớ lại theo thời gian và lỗi lặp; không dùng mọi lần truy hồi để lấy điểm chính thức.',
    caution: 'Cần phản hồi đúng và tránh biến hoạt động thành kiểm tra gây áp lực; retrieval không thay thế việc hiểu sâu.'
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
  const value = `${method.titleVi} (${method.title})\n\nLÝ THUYẾT\n${method.theory}\n\nPHÙ HỢP KHI\n- ${method.suitable.join('\n- ')}\n\nQUY TRÌNH\n${method.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nHOẠT ĐỘNG GỢI Ý\n- ${method.activities.join('\n- ')}\n\nĐÁNH GIÁ\n${method.assessment}\n\nLƯU Ý\n${method.caution}`;
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const area = document.createElement('textarea'); area.value = value; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
  return Promise.resolve();
}

export default function TeachingMethodsHub({ language = 'vi' }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [goal, setGoal] = useState('');
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bes-teaching-method-favorites') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (!selected) return undefined;
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
      if (needle && !`${method.title} ${method.titleVi} ${method.summary} ${method.activities.join(' ')}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [category, goal, query]);

  const openMethod = (method) => setSelected(method);
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
          <p>Thư viện thực hành dành cho giáo viên: hiểu lý thuyết cốt lõi, chọn đúng phương pháp và triển khai thành hoạt động cụ thể trong lớp.</p>
          <div className="tmh-hero-actions">
            <button type="button" className="tmh-button primary" onClick={() => document.querySelector('#tmh-library')?.scrollIntoView({ behavior: 'smooth' })}>Khám phá phương pháp</button>
            <button type="button" className="tmh-button" onClick={() => document.querySelector('#tmh-selector')?.scrollIntoView({ behavior: 'smooth' })}>Chọn theo mục tiêu</button>
          </div>
          <div className="tmh-hero-chips"><span>{METHODS.length} phương pháp</span><span>{CATEGORIES.length - 1} nhóm chuyên môn</span><span>Không dùng AI</span></div>
        </div>
        <div className="tmh-hero-visual" aria-hidden="true">
          <div className="tmh-visual-orbit"><span>CLT</span><span>TBLT</span><span>PBL</span><span>CLIL</span></div>
          <div className="tmh-visual-card main"><small>LESSON DESIGN</small><strong>Goal → Method → Activity</strong><i>✓</i></div>
          <div className="tmh-visual-card side"><b>01</b><span>Lý thuyết</span></div>
          <div className="tmh-visual-card side second"><b>02</b><span>Hướng dẫn</span></div>
        </div>
      </header>

      <section className="tmh-principles" aria-label="Nguyên tắc lựa chọn">
        {[['01', 'Bắt đầu từ mục tiêu', 'Chọn phương pháp sau khi đã xác định học sinh cần làm được gì.'], ['02', 'Thiết kế bằng chứng', 'Xác định sản phẩm hoặc hành vi cho thấy học sinh đã đạt mục tiêu.'], ['03', 'Scaffold vừa đủ', 'Chuẩn bị ngôn ngữ, mẫu và công cụ hỗ trợ trước khi tăng độ mở.'], ['04', 'Phản hồi để tiến bộ', 'Dùng dữ liệu trong hoạt động để điều chỉnh bước dạy tiếp theo.']].map(([number, title, text]) => (
          <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></article>
        ))}
      </section>

      <section className="tmh-selector" id="tmh-selector">
        <div className="tmh-section-heading"><div><span className="tmh-section-kicker">BỘ CHỌN NHANH</span><h2>Bạn muốn cải thiện điều gì?</h2><p>Chọn một mục tiêu để thu hẹp các phương pháp phù hợp nhất.</p></div>{goal ? <button type="button" onClick={() => setGoal('')}>Xóa lựa chọn</button> : null}</div>
        <div className="tmh-goal-grid">
          {GOALS.map(([id, label, ids], index) => <button type="button" key={id} className={goal === id ? 'is-active' : ''} onClick={() => setGoal(goal === id ? '' : id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong><small>{ids.length} phương pháp gợi ý</small></button>)}
        </div>
      </section>

      <section className="tmh-library" id="tmh-library">
        <div className="tmh-library-toolbar">
          <div><span className="tmh-section-kicker">THƯ VIỆN PHƯƠNG PHÁP</span><h2>{visible.length} nội dung đang hiển thị</h2></div>
          <label className="tmh-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm phương pháp, hoạt động hoặc mục tiêu…" /></label>
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
              <footer><button type="button" onClick={() => openMethod(method)}>Xem lý thuyết & hướng dẫn</button><button type="button" className="copy" onClick={() => handleCopy(method)}>{copied === method.id ? 'Đã copy ✓' : 'Copy khung'}</button></footer>
            </article>
          ))}
        </div>
        {!visible.length ? <div className="tmh-empty"><span>⌕</span><h3>Không tìm thấy phương pháp phù hợp</h3><p>Hãy đổi từ khóa, nhóm phương pháp hoặc mục tiêu đã chọn.</p></div> : null}
      </section>

      <section className="tmh-implementation">
        <div className="tmh-section-heading"><div><span className="tmh-section-kicker">KHUNG TRIỂN KHAI</span><h2>Từ phương pháp đến một tiết dạy</h2><p>Dùng quy trình năm bước này để tránh chọn phương pháp chỉ vì “trông hấp dẫn”.</p></div></div>
        <div className="tmh-process">
          {[['1', 'Mục tiêu', 'Viết đầu ra quan sát được.'], ['2', 'Bằng chứng', 'Xác định sản phẩm hoặc hành vi cần thu.'], ['3', 'Phương pháp', 'Chọn cấu trúc phù hợp với mục tiêu.'], ['4', 'Hoạt động', 'Thiết kế instruction, thời gian và scaffolding.'], ['5', 'Phản hồi', 'Dùng dữ liệu để sửa và dạy tiếp.']].map(([n, title, text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      {selected ? (
        <div className="tmh-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <aside className="tmh-drawer" role="dialog" aria-modal="true" aria-labelledby="tmh-drawer-title">
            <header style={{ '--method-color': selected.color }}><div><span>{selected.icon}</span><div><small>{selected.title}</small><h2 id="tmh-drawer-title">{selected.titleVi}</h2></div></div><button type="button" onClick={() => setSelected(null)} aria-label="Đóng">×</button></header>
            <div className="tmh-drawer-scroll">
              <section className="tmh-theory"><span>LÝ THUYẾT CỐT LÕI</span><p>{selected.theory}</p></section>
              <section><h3>Phù hợp khi</h3><div className="tmh-suitable-grid">{selected.suitable.map((item) => <span key={item}>✓ {item}</span>)}</div></section>
              <section><h3>Quy trình triển khai</h3><ol>{selected.steps.map((step) => <li key={step}><span>{step}</span></li>)}</ol></section>
              <section><h3>Hoạt động gợi ý</h3><div className="tmh-activity-list">{selected.activities.map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, '0')}</b>{item}</span>)}</div></section>
              <section className="tmh-note assessment"><h3>Đánh giá</h3><p>{selected.assessment}</p></section>
              <section className="tmh-note caution"><h3>Lưu ý khi áp dụng</h3><p>{selected.caution}</p></section>
            </div>
            <footer><button type="button" className="tmh-button" onClick={() => toggleFavorite(selected.id)}>{favorites.includes(selected.id) ? '★ Đã lưu' : '☆ Lưu phương pháp'}</button><button type="button" className="tmh-button primary" onClick={() => handleCopy(selected)}>{copied === selected.id ? 'Đã copy ✓' : 'Copy toàn bộ hướng dẫn'}</button></footer>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
