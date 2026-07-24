import React, { useMemo, useState } from 'react';
import '../styles/TeachingMethodsHubGoogle.css';

const METHODS = [
  {
    id: 'clt', icon: '💬', tone: 'blue', category: 'communication', title: 'Communicative Language Teaching', short: 'Dạy ngôn ngữ để giao tiếp có mục đích.',
    theory: 'CLT xem năng lực giao tiếp là đích đến chính. Học sinh sử dụng tiếng Anh để trao đổi ý nghĩa, thương lượng thông tin và phản hồi trong tình huống gần với đời sống.',
    when: 'Phù hợp với bài nói, nghe, chức năng ngôn ngữ, hội thoại và giai đoạn vận dụng sau khi đã cung cấp đầu vào.',
    steps: ['Tạo nhu cầu giao tiếp rõ ràng', 'Cung cấp mẫu ngôn ngữ vừa đủ', 'Cho học sinh tương tác theo cặp/nhóm', 'Phản hồi về hiệu quả giao tiếp rồi mới sửa lỗi chọn lọc'],
    activities: ['Information gap', 'Role-play có mục tiêu', 'Find someone who…', 'Problem-solving discussion'],
    caution: 'Không biến hoạt động giao tiếp thành đọc thuộc hội thoại; nhiệm vụ phải có khoảng trống thông tin hoặc lựa chọn thật.'
  },
  {
    id: 'tblt', icon: '✓', tone: 'green', category: 'inquiry', title: 'Task-Based Language Teaching', short: 'Học qua nhiệm vụ có sản phẩm đầu ra cụ thể.',
    theory: 'TBLT tổ chức bài học quanh một nhiệm vụ có kết quả xác định. Ngôn ngữ là công cụ giúp người học hoàn thành nhiệm vụ, sau đó giáo viên mới tập trung hóa kiến thức ngôn ngữ cần thiết.',
    when: 'Dùng tốt khi muốn tích hợp nhiều kỹ năng, tăng tính tự chủ và kiểm tra khả năng vận dụng ngôn ngữ trong ngữ cảnh.',
    steps: ['Pre-task: tạo bối cảnh và mục tiêu', 'Task cycle: thực hiện – chuẩn bị báo cáo – báo cáo', 'Language focus: phân tích ngôn ngữ xuất hiện', 'Practice: củng cố điểm ngôn ngữ trọng tâm'],
    activities: ['Lập kế hoạch chuyến đi', 'So sánh và chọn phương án', 'Thiết kế poster tuyên truyền', 'Giải quyết một tình huống trường học'],
    caution: 'Nhiệm vụ phải có đích đến rõ, không chỉ là “thảo luận về chủ đề”.'
  },
  {
    id: 'pbl', icon: '◆', tone: 'purple', category: 'inquiry', title: 'Project-Based Learning', short: 'Tạo sản phẩm dài hơi từ câu hỏi thực tiễn.',
    theory: 'PBL giúp học sinh nghiên cứu một vấn đề có ý nghĩa, hợp tác, ra quyết định và tạo sản phẩm công khai. Tiếng Anh được sử dụng xuyên suốt để tìm hiểu, giao tiếp và trình bày.',
    when: 'Phù hợp với unit review, chủ đề liên môn, hoạt động trải nghiệm hoặc chuỗi bài từ hai tiết trở lên.',
    steps: ['Đặt driving question', 'Xác định sản phẩm và tiêu chí', 'Phân vai – lập tiến độ – thu thập dữ liệu', 'Tạo bản nháp và nhận phản hồi', 'Công bố sản phẩm và tự đánh giá'],
    activities: ['Podcast về môi trường địa phương', 'Digital magazine', 'School campaign', 'Mini research poster'],
    caution: 'Cần rubric rõ và checkpoint ngắn; tránh để một học sinh làm hết sản phẩm.'
  },
  {
    id: 'cooperative', icon: '◎', tone: 'teal', category: 'collaboration', title: 'Cooperative Learning', short: 'Hợp tác có trách nhiệm cá nhân và phụ thuộc tích cực.',
    theory: 'Học nhóm hiệu quả cần nhiều hơn việc ngồi cùng nhau. Mỗi thành viên phải có vai trò, trách nhiệm cá nhân, cơ hội tương tác và mục tiêu chung.',
    when: 'Dùng để đọc hiểu, luyện từ vựng, tổng hợp thông tin, ôn tập hoặc xử lý nhiệm vụ phức hợp.',
    steps: ['Tạo nhóm và giao vai trò', 'Chia nhiệm vụ có phụ thuộc lẫn nhau', 'Theo dõi mức tham gia từng cá nhân', 'Nhóm tổng hợp sản phẩm', 'Cá nhân kiểm tra lại kiến thức'],
    activities: ['Jigsaw reading', 'Think–Pair–Share', 'Numbered Heads Together', 'Gallery walk'],
    caution: 'Luôn có bước kiểm tra cá nhân để tránh “đi nhờ” kết quả của nhóm.'
  },
  {
    id: 'flipped', icon: '▶', tone: 'orange', category: 'differentiation', title: 'Flipped Classroom', short: 'Tiếp nhận đầu vào trước, dùng giờ học để luyện tập sâu.',
    theory: 'Mô hình đảo ngược chuyển phần tiếp nhận kiến thức cơ bản ra ngoài lớp học; thời gian trực tiếp được dành cho thực hành, phản hồi và hỗ trợ phân hóa.',
    when: 'Phù hợp với lý thuyết ngữ pháp, hướng dẫn kỹ năng, video ngắn hoặc lớp có hệ thống học liệu số ổn định.',
    steps: ['Giao đầu vào ngắn, có câu hỏi kiểm tra', 'Kiểm tra nhanh đầu giờ', 'Tổ chức nhiệm vụ vận dụng theo mức độ', 'Phản hồi trực tiếp', 'Cho cơ hội học lại phần đầu vào'],
    activities: ['Video + retrieval quiz', 'Station rotation', 'Workshop sửa bài', 'Peer coaching'],
    caution: 'Video không nên dài; luôn có phương án thay thế cho học sinh không truy cập được ở nhà.'
  },
  {
    id: 'clil', icon: '▤', tone: 'indigo', category: 'communication', title: 'CLIL', short: 'Học nội dung và ngôn ngữ trong cùng một nhiệm vụ.',
    theory: 'Content and Language Integrated Learning kết hợp nội dung, giao tiếp, nhận thức và văn hóa. Người học vừa hiểu một chủ đề vừa phát triển ngôn ngữ cần để xử lý chủ đề đó.',
    when: 'Phù hợp với chủ đề khoa học, môi trường, lịch sử, văn hóa và các bài đọc giàu thông tin.',
    steps: ['Xác định content objective', 'Xác định language objective', 'Thiết kế scaffold từ hình ảnh, từ khóa, sentence frames', 'Cho học sinh xử lý nội dung', 'Đánh giá cả hiểu biết và ngôn ngữ'],
    activities: ['Explain a process', 'Compare data', 'Create an infographic', 'Mini content presentation'],
    caution: 'Không để độ khó nội dung và ngôn ngữ cùng tăng quá cao; cần scaffold rõ.'
  },
  {
    id: 'tpr', icon: '↗', tone: 'red', category: 'communication', title: 'Total Physical Response', short: 'Gắn ngôn ngữ với hành động và phản ứng cơ thể.',
    theory: 'TPR giúp người học liên kết đầu vào ngôn ngữ với vận động, giảm áp lực phải nói ngay và tăng khả năng ghi nhớ qua trải nghiệm đa giác quan.',
    when: 'Hiệu quả với lớp nhỏ tuổi, người mới học, mệnh lệnh, từ vựng hành động và hướng dẫn quy trình.',
    steps: ['Giáo viên làm mẫu và nói', 'Cả lớp phản ứng bằng hành động', 'Giảm dần việc làm mẫu', 'Học sinh điều khiển bạn', 'Chuyển sang nói hoặc viết ngắn'],
    activities: ['Simon Says', 'Action sequence', 'Classroom commands', 'Mime and guess'],
    caution: 'Dùng như một cầu nối sang giao tiếp, không kéo dài toàn bộ tiết học.'
  },
  {
    id: 'formative', icon: '◉', tone: 'amber', category: 'assessment', title: 'Formative Assessment', short: 'Thu thập bằng chứng học tập để điều chỉnh ngay.',
    theory: 'Đánh giá vì sự tiến bộ diễn ra trong quá trình học. Giáo viên làm rõ mục tiêu, thu thập bằng chứng, phản hồi có thể hành động và cho học sinh cơ hội cải thiện.',
    when: 'Có thể dùng ở mọi bài học, đặc biệt tại điểm chuyển giai đoạn hoặc trước khi kết thúc tiết.',
    steps: ['Nêu learning intention và success criteria', 'Dùng câu hỏi kiểm tra hiểu', 'Phân tích lỗi hoặc khoảng trống', 'Phản hồi ngắn, cụ thể', 'Cho học sinh sửa và chứng minh tiến bộ'],
    activities: ['Exit ticket', 'Mini whiteboards', 'Traffic-light check', 'Error analysis'],
    caution: 'Không chỉ thu thập câu trả lời; phải dùng thông tin đó để thay đổi bước dạy tiếp theo.'
  }
];

const CATEGORIES = [
  ['all', 'Tất cả'], ['communication', 'Giao tiếp'], ['collaboration', 'Hợp tác'], ['inquiry', 'Nhiệm vụ & dự án'], ['assessment', 'Đánh giá'], ['differentiation', 'Phân hóa']
];

function MethodCard({ method, selected, onSelect }) {
  return (
    <button type="button" className={`tmh-method-card is-${method.tone}${selected ? ' is-selected' : ''}`} onClick={() => onSelect(method.id)}>
      <span className="tmh-method-icon" aria-hidden="true">{method.icon}</span>
      <span className="tmh-method-copy"><strong>{method.title}</strong><small>{method.short}</small></span>
      <span className="tmh-method-arrow" aria-hidden="true">›</span>
    </button>
  );
}

export default function TeachingMethodsHub({ language = 'vi' }) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('clt');
  const selected = METHODS.find((item) => item.id === selectedId) || METHODS[0];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return METHODS.filter((item) => (category === 'all' || item.category === category)
      && (!needle || `${item.title} ${item.short} ${item.theory} ${item.activities.join(' ')}`.toLowerCase().includes(needle)));
  }, [category, query]);

  return (
    <main className="tmh-page" data-language={language}>
      <section className="tmh-hero">
        <div className="tmh-hero-copy">
          <span className="tmh-kicker">ENGLISH HUB · ACTIVE PEDAGOGY</span>
          <h1>Phương pháp giảng dạy tiếng Anh</h1>
          <p>Thư viện lý thuyết, quy trình triển khai và hoạt động mẫu giúp giáo viên chuyển từ “biết phương pháp” sang thiết kế được một tiết học tích cực.</p>
          <div className="tmh-hero-actions">
            <button type="button" className="tmh-button primary" onClick={() => document.querySelector('.tmh-library')?.scrollIntoView({ behavior: 'smooth' })}>Khám phá phương pháp</button>
            <button type="button" className="tmh-button" onClick={() => document.querySelector('.tmh-detail')?.scrollIntoView({ behavior: 'smooth' })}>Xem hướng dẫn</button>
          </div>
        </div>
        <div className="tmh-hero-visual" aria-hidden="true">
          <div className="tmh-board"><span>PLAN</span><b>ENGAGE</b><em>REFLECT</em></div>
          <i className="tmh-orbit one">💬</i><i className="tmh-orbit two">✓</i><i className="tmh-orbit three">◆</i>
          <div className="tmh-people"><span /><span /><span /></div>
        </div>
      </section>

      <section className="tmh-stat-strip" aria-label="Tổng quan thư viện">
        <article><span>8</span><div><strong>Phương pháp cốt lõi</strong><small>Từ giao tiếp đến đánh giá</small></div></article>
        <article><span>4</span><div><strong>Thành phần mỗi hướng dẫn</strong><small>Lý thuyết · quy trình · hoạt động · lưu ý</small></div></article>
        <article><span>100%</span><div><strong>Không dùng AI</strong><small>Nội dung tra cứu ổn định, dùng ngay</small></div></article>
      </section>

      <section className="tmh-library">
        <header className="tmh-section-head">
          <div><span>THƯ VIỆN PHƯƠNG PHÁP</span><h2>Chọn theo mục tiêu bài học</h2></div>
          <label className="tmh-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm phương pháp, hoạt động hoặc mục tiêu…" /></label>
        </header>
        <div className="tmh-chips">{CATEGORIES.map(([id, label]) => <button type="button" key={id} className={category === id ? 'is-active' : ''} onClick={() => setCategory(id)}>{label}</button>)}</div>

        <div className="tmh-workspace">
          <div className="tmh-method-list">
            {filtered.length ? filtered.map((method) => <MethodCard key={method.id} method={method} selected={method.id === selectedId} onSelect={setSelectedId} />) : <div className="tmh-empty">Không tìm thấy phương pháp phù hợp.</div>}
          </div>

          <article className={`tmh-detail is-${selected.tone}`}>
            <header>
              <span className="tmh-detail-icon" aria-hidden="true">{selected.icon}</span>
              <div><small>PHƯƠNG PHÁP ĐANG CHỌN</small><h2>{selected.title}</h2><p>{selected.short}</p></div>
            </header>
            <div className="tmh-detail-grid">
              <section><span>01</span><div><h3>Nền tảng lý thuyết</h3><p>{selected.theory}</p></div></section>
              <section><span>02</span><div><h3>Khi nào nên dùng?</h3><p>{selected.when}</p></div></section>
              <section className="wide"><span>03</span><div><h3>Quy trình triển khai</h3><ol>{selected.steps.map((step) => <li key={step}>{step}</li>)}</ol></div></section>
              <section><span>04</span><div><h3>Hoạt động mẫu</h3><ul>{selected.activities.map((activity) => <li key={activity}>{activity}</li>)}</ul></div></section>
              <section className="tmh-caution"><span>!</span><div><h3>Lưu ý thiết kế</h3><p>{selected.caution}</p></div></section>
            </div>
          </article>
        </div>
      </section>

      <section className="tmh-planner">
        <div><span>KHUNG ÁP DỤNG NHANH</span><h2>Từ phương pháp đến một hoạt động trên lớp</h2><p>Dùng bốn câu hỏi này trước khi đưa bất kỳ phương pháp nào vào giáo án.</p></div>
        <div className="tmh-planner-steps">
          {[['1', 'Mục tiêu', 'Học sinh phải làm được gì bằng tiếng Anh?'], ['2', 'Bằng chứng', 'Sản phẩm hoặc hành vi nào chứng minh đã đạt?'], ['3', 'Tương tác', 'Ai nói, ai nghe, ai phản hồi và trong bao lâu?'], ['4', 'Điều chỉnh', 'Dữ liệu nào giúp giáo viên quyết định bước tiếp theo?']].map(([n, title, text]) => <article key={n}><span>{n}</span><strong>{title}</strong><p>{text}</p></article>)}
        </div>
      </section>
    </main>
  );
}
