const EXAM_BANK = [
  {
    question: 'By the time the teacher arrived, the students _____ the discussion.',
    options: ['had already started', 'already start', 'have already started', 'were already start'],
    answer: 'A',
    explanation: 'Past Perfect shows an action completed before another past action.',
  },
  {
    question: 'If schools _____ more digital resources, students could practise independently.',
    options: ['provided', 'provide', 'had provided', 'will provide'],
    answer: 'A',
    explanation: 'The second conditional uses if + Past Simple and would/could + infinitive.',
  },
  {
    question: 'The project, _____ was completed last week, has received positive feedback.',
    options: ['which', 'who', 'where', 'whose'],
    answer: 'A',
    explanation: 'Which introduces a non-defining relative clause referring to a thing.',
  },
  {
    question: 'Students are encouraged _____ reliable sources before sharing information online.',
    options: ['to check', 'checking', 'check', 'checked'],
    answer: 'A',
    explanation: 'Encourage + object + to-infinitive is the correct pattern.',
  },
  {
    question: 'Hardly _____ the presentation when the internet connection failed.',
    options: ['had she begun', 'she had begun', 'did she begin', 'she began'],
    answer: 'A',
    explanation: 'Hardly at the beginning requires inversion with the Past Perfect.',
  },
  {
    question: 'The new policy aims to make education more _____ for students in remote areas.',
    options: ['accessible', 'access', 'accessibly', 'accessibility'],
    answer: 'A',
    explanation: 'An adjective is required after make + object + complement.',
  },
  {
    question: 'Many teenagers prefer online courses because they can learn at their own _____.',
    options: ['pace', 'step', 'speeding', 'motion'],
    answer: 'A',
    explanation: 'At one’s own pace is the natural collocation.',
  },
  {
    question: 'The lecturer suggested that every student _____ a reflective journal.',
    options: ['keep', 'keeps', 'kept', 'is keeping'],
    answer: 'A',
    explanation: 'Suggest that + subject + bare infinitive is a formal subjunctive structure.',
  },
  {
    question: 'Despite _____ limited time, the team produced a detailed report.',
    options: ['having', 'have', 'to have', 'had'],
    answer: 'A',
    explanation: 'Despite is followed by a noun phrase or gerund.',
  },
  {
    question: 'The more carefully students revise, _____ they are likely to perform.',
    options: ['the better', 'better', 'the best', 'more better'],
    answer: 'A',
    explanation: 'The correlative comparative pattern is the + comparative, the + comparative.',
  },
  {
    question: 'Not until the final paragraph _____ the writer’s main argument.',
    options: ['did I understand', 'I understood', 'had I understand', 'I had understood'],
    answer: 'A',
    explanation: 'Not until at the beginning triggers subject–auxiliary inversion.',
  },
  {
    question: 'The campaign was designed to raise public _____ of climate-related risks.',
    options: ['awareness', 'aware', 'awaring', 'awarely'],
    answer: 'A',
    explanation: 'Raise awareness is the correct noun collocation.',
  },
  {
    question: 'When I called Mai, she _____ for her speaking test.',
    options: ['was practising', 'practised', 'has practised', 'had practise'],
    answer: 'A',
    explanation: 'Past Continuous describes an action in progress at a specific past moment.',
  },
  {
    question: 'The article provides evidence _____ supports the researcher’s conclusion.',
    options: ['that', 'what', 'where', 'whom'],
    answer: 'A',
    explanation: 'That introduces a defining relative clause referring to evidence.',
  },
  {
    question: 'Students should avoid _____ personal information on unfamiliar websites.',
    options: ['sharing', 'to share', 'share', 'shared'],
    answer: 'A',
    explanation: 'Avoid is followed by a gerund.',
  },
  {
    question: 'The teacher asked us whether we _____ the assignment the previous night.',
    options: ['had completed', 'completed', 'have completed', 'would complete'],
    answer: 'A',
    explanation: 'Reported speech commonly backshifts the earlier action to Past Perfect.',
  },
  {
    question: 'Neither the students nor their teacher _____ satisfied with the first draft.',
    options: ['was', 'were', 'be', 'have been'],
    answer: 'A',
    explanation: 'With neither…nor, agreement normally follows the nearer subject: teacher.',
  },
  {
    question: 'The workshop was cancelled _____ the speaker became ill unexpectedly.',
    options: ['because', 'although', 'despite', 'unless'],
    answer: 'A',
    explanation: 'Because introduces the reason for the cancellation.',
  },
  {
    question: 'Having _____ the data, the group began writing the conclusion.',
    options: ['analysed', 'analyse', 'analysing', 'been analyse'],
    answer: 'A',
    explanation: 'Having + past participle expresses a completed action before the main action.',
  },
  {
    question: 'A balanced study plan can help learners remain motivated and avoid _____.',
    options: ['burnout', 'breakdowning', 'fallout', 'drop-offing'],
    answer: 'A',
    explanation: 'Burnout is the natural noun for exhaustion caused by prolonged stress.',
  },
];

function clean(value = '') {
  return String(value || '').trim();
}

function inferCount(instruction = '') {
  const text = clean(instruction);
  const match = text.match(/(?:gồm|tạo|soạn|with|create)?\s*(\d{1,3})\s*(?:câu|questions?|items?)/i);
  if (!match) return 10;
  return Math.min(20, Math.max(5, Number.parseInt(match[1], 10) || 10));
}

function buildExamDraft(instruction = '') {
  const count = inferCount(instruction);
  const selected = EXAM_BANK.slice(0, count);
  const questions = selected.map((item, index) => {
    const options = item.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join('\n');
    return `**Question ${index + 1}.** ${item.question}\n${options}`;
  }).join('\n\n');
  const key = selected.map((item, index) => `${index + 1}.${item.answer}`).join(' · ');
  const explanations = selected.map((item, index) => `${index + 1}. ${item.explanation}`).join('\n');
  return `# BẢN KHỞI TẠO ĐỀ THI THPT – BỘ MÁY NỘI BỘ\n\n> OpenRouter hiện không đủ credit cho một phản hồi dài. Brian đã tạo một bộ câu hỏi khởi đầu có thể chỉnh sửa và tiếp tục mở rộng khi AI thật sẵn sàng.\n\n## 1. Blueprint đề xuất\n\n- Mục tiêu: luyện ngữ pháp và từ vựng trong ngữ cảnh THPT.\n- Mức độ: B1–B2, có một số cấu trúc vận dụng cao.\n- Số câu trong bản khởi tạo: ${selected.length}.\n- Dạng bài: Multiple choice.\n- Khuyến nghị mở rộng: thêm cloze text, sentence arrangement và reading comprehension trong các lượt tiếp theo.\n\n## 2. Questions\n\n${questions}\n\n## 3. Answer key\n\n${key}\n\n## 4. Explanations\n\n${explanations}\n\n## 5. Cách tiếp tục\n\n- Chỉnh trực tiếp câu hỏi trong ô kết quả.\n- Chuyển sang Exam Studio để ghép ma trận và mã đề.\n- Khi có provider khác hoặc thêm credit, chạy lại với chế độ **Theo từng phần** để tạo đủ số lượng lớn.`;
}

function extractSentences(sourceText = '', limit = 8) {
  return clean(sourceText)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 25)
    .slice(0, limit);
}

function buildSourceDraft(instruction = '', sourceText = '') {
  const sentences = extractSentences(sourceText);
  const evidence = sentences.length
    ? sentences.map((sentence, index) => `${index + 1}. ${sentence}`).join('\n')
    : 'Chưa có đủ văn bản nguồn để trích xuất nội dung cụ thể.';
  return `# BẢN LÀM VIỆC NỘI BỘ\n\n## Yêu cầu\n\n${clean(instruction) || 'Chưa có yêu cầu cụ thể.'}\n\n## Nội dung chính nhận diện từ nguồn\n\n${evidence}\n\n## Kế hoạch xử lý\n\n1. Xác định mục tiêu đầu ra và đối tượng học sinh.\n2. Chia nội dung thành các phần nhỏ có thể kiểm tra.\n3. Tạo bản nháp ngắn cho từng phần.\n4. Giáo viên rà soát trước khi xuất bản hoặc gửi sang ứng dụng khác.\n\n## Ghi chú\n\nĐây là chế độ nội bộ dự phòng, giúp tiếp tục làm việc khi provider AI hết credit hoặc tạm thời không khả dụng.`;
}

function buildGenericDraft(mode = 'create', instruction = '', sourceText = '') {
  const sourceSummary = extractSentences(sourceText, 5);
  return `# BẢN NHÁP DỰ PHÒNG CỦA BRIAN\n\n## 1. Mục tiêu\n\n${clean(instruction) || 'Tạo một tài liệu dạy học tiếng Anh có cấu trúc rõ ràng.'}\n\n## 2. Chế độ làm việc\n\n${mode}\n\n## 3. Nguồn đã nhận\n\n${sourceSummary.length ? sourceSummary.map((item) => `- ${item}`).join('\n') : '- Chưa có tài liệu nguồn hoặc nguồn đang trống.'}\n\n## 4. Khung đầu ra đề xuất\n\n- Mục tiêu học tập.\n- Nội dung trọng tâm.\n- Hoạt động từ dễ đến khó.\n- Sản phẩm học tập.\n- Kiểm tra và phản hồi.\n- Đáp án hoặc tiêu chí đánh giá khi phù hợp.\n\n## 5. Bước tiếp theo\n\nChỉnh nội dung trong ô kết quả, thêm nguồn nếu cần, hoặc chuyển sang provider khác trong Cài đặt AI để tạo phiên bản chuyên sâu hơn.`;
}

export function isProviderCapacityError(error) {
  const message = clean(error?.message || error).toLowerCase();
  return error?.code === 'AI_PROVIDER_CREDIT_LIMIT'
    || /requires more credits|insufficient credits|can only afford|credit balance|quota exceeded|billing/i.test(message);
}

export function friendlyAiWorkspaceError(error) {
  const message = clean(error?.message || error);
  if (isProviderCapacityError(error)) return 'Nhà cung cấp AI hiện không đủ credit cho phản hồi dài. Brian có thể tự giảm độ dài, thử provider dự phòng hoặc dùng bộ máy nội bộ.';
  if (/rate limit|too many requests|429/i.test(message)) return 'Nhà cung cấp AI đang giới hạn tần suất. Hãy thử lại sau ít phút hoặc dùng provider dự phòng.';
  if (/network|failed to fetch|load failed/i.test(message)) return 'Không thể kết nối nhà cung cấp AI. Kiểm tra mạng hoặc tiếp tục bằng bộ máy nội bộ.';
  return message || 'AI chưa thể xử lý yêu cầu này.';
}

export function buildWorkspaceLocalFallback({ mode = 'create', instruction = '', sourceText = '' } = {}) {
  const text = clean(instruction).toLowerCase();
  if (/đề\s*(thi|kiểm tra)|thpt|exam|test\b|multiple choice|trắc nghiệm/.test(text)) return buildExamDraft(instruction);
  if (clean(sourceText)) return buildSourceDraft(instruction, sourceText);
  return buildGenericDraft(mode, instruction, sourceText);
}
