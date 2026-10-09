/**
 * BRIAN Assessment Studio catalogue.
 * "ready" = teacher-operated workflow: construct task, record real student work,
 * score deterministically / with human rubric, analyse, preserve adjustment note.
 * This DOES NOT imply a student-facing online test portal.
 */
export const MODULES = [
  { id: 'speaking', name: 'SpeakScale', subtitle: 'Speaking Assessment Rubric', engine: 'rubric', status: 'ready', description: 'Giáo viên chấm bài nói theo 5 tiêu chí.' },
  { id: 'diagnostic', name: 'DiagnosticScan', subtitle: 'Diagnostic Assessment', engine: 'quiz', status: 'ready', description: 'Trắc nghiệm chẩn đoán theo chủ điểm.' },
  { id: 'exit', name: 'ExitTicket', subtitle: 'End-of-Lesson Assessment', engine: 'quiz', status: 'ready', description: 'Kiểm tra nhanh và ghi nhận phản hồi cuối tiết.' },
  { id: 'error', name: 'ErrorClinic', subtitle: 'Error Correction Assessment', engine: 'manual', status: 'ready', description: 'Giáo viên duyệt và chấm từng câu sửa lỗi.' },
  { id: 'vocabulary', name: 'VocabCheck', subtitle: 'Vocabulary Assessment', engine: 'quiz', status: 'ready', description: 'Trắc nghiệm word forms, collocations, từ vựng.' },
  { id: 'reading', name: 'ReadProof', subtitle: 'Reading Evidence Assessment', engine: 'reading', status: 'ready', description: 'Chấm cả đáp án và vị trí dẫn chứng.' },
  { id: 'listening', name: 'ListenCheck', subtitle: 'Listening Assessment', engine: 'quiz', status: 'ready', description: 'Bài nghe, đáp án và thống kê kỹ năng.' },
  { id: 'writing', name: 'WriteRubric', subtitle: 'Writing Assessment', engine: 'rubric', status: 'ready', description: 'Bài viết, nhận xét và bảng tiêu chí.' },
  { id: 'rewrite', name: 'RewriteLab', subtitle: 'Sentence Transformation', engine: 'manual', status: 'ready', description: 'Chấm thủ công các câu viết lại.' },
  { id: 'self', name: 'CanDo Check', subtitle: 'Self-Assessment', engine: 'scale', status: 'ready', description: 'Ghi mức tự đánh giá theo phát biểu I can.' },
  { id: 'peer', name: 'PeerRubric', subtitle: 'Peer Assessment', engine: 'rubric', status: 'ready', description: 'Ghi phiếu đánh giá đồng đẳng có người đánh giá.' },
  { id: 'project', name: 'ProjectMark', subtitle: 'Performance Assessment', engine: 'rubric', status: 'ready', description: 'Rubric sản phẩm dự án, thuyết trình, debate.' },
];
export const RUBRICS = Object.freeze({
  speaking: ['Pronunciation', 'Fluency', 'Vocabulary', 'Grammar', 'Content'],
  writing: ['Task Achievement', 'Organization', 'Vocabulary', 'Grammar'],
  peer: ['Preparation', 'Participation', 'Communication', 'Responsibility'],
  project: ['Content', 'Language Use', 'Delivery', 'Collaboration'],
});
export const SELF_STATEMENTS = [
  'I can explain the main idea of a short text.',
  'I can use the target vocabulary in context.',
  'I can respond to simple questions.',
  'I can identify and correct my own grammar mistakes.',
];
export const LETTERS = ['A','B','C','D'];
export const moduleFor = kind => MODULES.find(item => item.id === kind) || null;
export const isQuiz = kind => moduleFor(kind)?.engine === 'quiz';
export const isRubric = kind => moduleFor(kind)?.engine === 'rubric';
export const isManual = kind => moduleFor(kind)?.engine === 'manual';
export const isReading = kind => kind === 'reading';
export const isScale = kind => kind === 'self';
export const isQuestionBased = kind => ['quiz','manual','reading'].includes(moduleFor(kind)?.engine);
