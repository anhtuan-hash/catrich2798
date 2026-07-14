import { parseMcqFromText } from './library.js';

const ANSWERS = ['A', 'B', 'C', 'D'];

export const SPECIALIZED_TOOL_SLUGS = ['exam-studio'];

export const EXAM_TYPE_OPTIONS = [
  { id: 'quick-review', label: 'Ôn tập nhanh', labelEn: 'Quick review', icon: 'QR', desc: 'Kiểm tra nhanh sau bài.' },
  { id: 'fifteen-minute', label: 'Kiểm tra 15 phút', labelEn: '15-minute test', icon: '15', desc: 'Ngắn, rõ trọng tâm.' },
  { id: 'period-test', label: 'Kiểm tra 1 tiết', labelEn: 'Period test', icon: '45', desc: 'Nhiều phần, có đáp án.' },
  { id: 'mixed-thpt', label: 'Đề THPT', labelEn: 'THPT test', icon: 'TH', desc: 'Grammar, vocab, cloze, reading.' },
  { id: 'hsg-practice', label: 'Đề luyện HSG', labelEn: 'Excellent student training', icon: 'HS', desc: 'Vận dụng cao, đọc sâu.' },
  { id: 'homework', label: 'Bài tập về nhà', labelEn: 'Homework pack', icon: 'HW', desc: 'Có đáp án, tự luyện.' },
  { id: 'online-interactive', label: 'Bài luyện online', labelEn: 'Online interactive test', icon: 'ON', desc: 'Tối ưu HTML tương tác.' },
];

export const SKILL_OPTIONS = [
  { id: 'grammar', label: 'Grammar' },
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'reading', label: 'Reading' },
  { id: 'listening', label: 'Listening' },
  { id: 'writing', label: 'Writing' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'mixed-skills', label: 'Mixed Skills' },
  { id: 'thpt-format', label: 'THPT Format' },
];

export const QUESTION_FORMAT_GROUPS = [
  {
    id: 'mcq',
    title: 'Trắc nghiệm',
    desc: 'Các dạng chọn đáp án, matching, cloze, reading/listening MCQ.',
    formats: [
      { id: 'mcq-4', label: 'Multiple Choice 4 options', kind: 'Grammar MCQ' },
      { id: 'mcq-5', label: 'Multiple Choice 5 options', kind: 'Multiple Choice' },
      { id: 'true-false', label: 'True / False', kind: 'True / False' },
      { id: 'tfng', label: 'True / False / Not Given', kind: 'True/False/Not Given' },
      { id: 'ynng', label: 'Yes / No / Not Given', kind: 'Yes/No/Not Given' },
      { id: 'matching', label: 'Matching', kind: 'Matching' },
      { id: 'heading-matching', label: 'Heading Matching', kind: 'Heading Matching' },
      { id: 'sentence-matching', label: 'Sentence Matching', kind: 'Sentence Matching' },
      { id: 'information-matching', label: 'Information Matching', kind: 'Information Matching' },
      { id: 'cloze', label: 'Cloze Test', kind: 'Cloze' },
      { id: 'mc-cloze', label: 'Multiple-choice Cloze', kind: 'Multiple-choice Cloze' },
      { id: 'grammar-gap-mcq', label: 'Grammar Gap-fill', kind: 'Grammar MCQ' },
      { id: 'vocab-gap-mcq', label: 'Vocabulary Gap-fill', kind: 'Vocabulary in context' },
      { id: 'word-formation-mcq', label: 'Word Formation', kind: 'Word formation' },
      { id: 'error-identification', label: 'Error Identification', kind: 'Error correction' },
      { id: 'error-correction-mcq', label: 'Error Correction MCQ', kind: 'Error correction' },
      { id: 'transformation-mcq', label: 'Sentence Transformation MCQ', kind: 'Sentence transformation' },
      { id: 'syn-ant', label: 'Synonym / Antonym', kind: 'Vocabulary in context' },
      { id: 'collocation', label: 'Collocation Choice', kind: 'Collocation' },
      { id: 'pronunciation', label: 'Pronunciation', kind: 'Pronunciation' },
      { id: 'stress', label: 'Stress', kind: 'Stress' },
      { id: 'odd-one-out', label: 'Odd One Out', kind: 'Odd One Out' },
      { id: 'sequencing', label: 'Sequencing', kind: 'Sequencing' },
      { id: 'reordering', label: 'Reordering Sentences', kind: 'Reordering' },
      { id: 'reading-mcq', label: 'Reading Comprehension MCQ', kind: 'Reading detail' },
      { id: 'listening-mcq', label: 'Listening Comprehension MCQ', kind: 'Listening MCQ' },
      { id: 'image-mcq', label: 'Image-based MCQ', kind: 'Image-based MCQ' },
      { id: 'situation-response', label: 'Situation Response', kind: 'Situation Response' },
      { id: 'dialogue-completion', label: 'Dialogue Completion', kind: 'Dialogue Completion' },
      { id: 'function-matching', label: 'Function Matching', kind: 'Function Matching' },
    ],
  },
  {
    id: 'short-response',
    title: 'Tự luận ngắn',
    desc: 'Điền từ, sửa lỗi, trả lời ngắn, viết lại câu.',
    formats: [
      { id: 'short-answer', label: 'Short Answer', kind: 'Short answer' },
      { id: 'fill-blank', label: 'Fill in the Blank', kind: 'Open gap-fill' },
      { id: 'open-gapfill', label: 'Open Gap-fill', kind: 'Open gap-fill' },
      { id: 'word-form-open', label: 'Word Form Open Answer', kind: 'Word formation open' },
      { id: 'verb-form-open', label: 'Verb Form Open Answer', kind: 'Verb form open' },
      { id: 'sentence-completion', label: 'Sentence Completion', kind: 'Sentence completion' },
      { id: 'information-completion', label: 'Information Completion', kind: 'Information completion' },
      { id: 'table-completion', label: 'Table Completion', kind: 'Table completion' },
      { id: 'summary-completion', label: 'Summary Completion', kind: 'Summary completion' },
      { id: 'note-completion', label: 'Note Completion', kind: 'Note completion' },
      { id: 'one-word-answer', label: 'One-word Answer', kind: 'One-word answer' },
      { id: 'two-three-word', label: 'Two-to-three-word Answer', kind: 'Short answer' },
      { id: 'correct-mistake', label: 'Correct the Mistake', kind: 'Correct the mistake' },
      { id: 'rewrite', label: 'Rewrite the Sentence', kind: 'Rewrite' },
      { id: 'paraphrase', label: 'Paraphrase', kind: 'Paraphrase' },
      { id: 'translation-sentence', label: 'Translation Sentence', kind: 'Translation' },
      { id: 'explain-choice', label: 'Explain the Choice', kind: 'Explain the choice' },
      { id: 'give-evidence', label: 'Give Evidence from Text', kind: 'Evidence from text' },
    ],
  },
  {
    id: 'extended-response',
    title: 'Tự luận dài',
    desc: 'Writing, essay, email, report, summary, speaking script.',
    formats: [
      { id: 'paragraph-writing', label: 'Paragraph Writing', kind: 'Paragraph writing' },
      { id: 'essay-writing', label: 'Essay Writing', kind: 'Essay writing' },
      { id: 'opinion-paragraph', label: 'Opinion Paragraph', kind: 'Opinion paragraph' },
      { id: 'adv-disadv', label: 'Advantages / Disadvantages Essay', kind: 'Advantages/disadvantages essay' },
      { id: 'problem-solution', label: 'Problem / Solution Essay', kind: 'Problem/solution essay' },
      { id: 'email-writing', label: 'Letter / Email Writing', kind: 'Email writing' },
      { id: 'report-writing', label: 'Report Writing', kind: 'Report writing' },
      { id: 'story-completion', label: 'Story Completion', kind: 'Story completion' },
      { id: 'summary-writing', label: 'Summary Writing', kind: 'Summary writing' },
      { id: 'reading-response', label: 'Reading Response', kind: 'Reading response' },
      { id: 'argumentative-response', label: 'Argumentative Response', kind: 'Argumentative response' },
      { id: 'speaking-script', label: 'Speaking Script', kind: 'Speaking script' },
      { id: 'presentation-outline', label: 'Presentation Outline', kind: 'Presentation outline' },
    ],
  },
  {
    id: 'interactive',
    title: 'Tương tác online',
    desc: 'Dùng khi muốn xuất HTML offline hoặc mở test tương tác.',
    formats: [
      { id: 'timed-quiz', label: 'Timed Quiz', kind: 'Timed quiz' },
      { id: 'one-question-mode', label: 'One-question-at-a-time Test', kind: 'One-question mode' },
      { id: 'live-classroom', label: 'Live Classroom Quiz', kind: 'Live classroom quiz' },
      { id: 'team-battle', label: 'Team Battle', kind: 'Team battle' },
      { id: 'flashcard-quiz', label: 'Flashcard Quiz', kind: 'Flashcard quiz' },
      { id: 'drag-drop-matching', label: 'Drag and Drop Matching', kind: 'Drag/drop matching' },
      { id: 'click-correct', label: 'Click the Correct Answer', kind: 'Click correct answer' },
      { id: 'typing-race', label: 'Typing Race', kind: 'Typing race' },
      { id: 'cloze-race', label: 'Cloze Race', kind: 'Cloze race' },
      { id: 'word-form-challenge', label: 'Word Formation Challenge', kind: 'Word formation challenge' },
      { id: 'listening-locked', label: 'Listening with Locked Replay', kind: 'Listening locked replay' },
      { id: 'reading-timer', label: 'Reading Timer Mode', kind: 'Reading timer mode' },
      { id: 'exit-ticket', label: 'Exit Ticket', kind: 'Exit ticket' },
      { id: 'self-paced', label: 'Self-paced Practice', kind: 'Self-paced practice' },
    ],
  },
];

export const SOURCE_MODE_OPTIONS = [
  { id: 'paste', label: 'Upload / Paste text' },
  { id: 'ai-topic', label: 'AI Keyword Generator' },
];

export const SPECIALIZED_TOOL_CONFIGS = {
  'exam-studio': {
    tone: 'purple',
    icon: 'EX',
    title: 'Exam Studio',
    titleVi: 'Exam Studio',
    headline: 'Tạo đề từ file, text hoặc AI. Hỗ trợ trắc nghiệm, tự luận, preview sạch và xuất HTML tương tác.',
    inputLabel: 'Nội dung / mục tiêu kiểm tra',
    sample: 'Create 30 English questions testing Past Simple vs Past Continuous, level B2-C1, THPT-oriented, including MCQ, cloze and error correction, with answer key and English explanations.',
    primaryAction: 'Tạo đề',
    deliverables: ['Student version', 'Teacher key', 'Answer key', 'Google Form text', 'Interactive HTML', 'Question bank JSON'],
    workflow: ['Chọn loại bài kiểm tra và dạng câu hỏi', 'Upload/dán text hoặc nhập yêu cầu cho AI', 'Preview sạch và chỉnh từng câu', 'Xuất DOC/PDF/Google Form/HTML tương tác'],
  },
};

export function getSpecializedConfig(slug) {
  return SPECIALIZED_TOOL_CONFIGS[slug] || null;
}

export function isSpecializedTool(slug) {
  return SPECIALIZED_TOOL_SLUGS.includes(slug);
}

export function allQuestionFormats() {
  return QUESTION_FORMAT_GROUPS.flatMap((group) => group.formats.map((format) => ({ ...format, groupId: group.id, groupTitle: group.title })));
}

export function createDefaultExamProject() {
  return {
    examType: '',
    sourceMode: 'paste',
    topic: '',
    sourceText: '',
    aiRequirement: '',
    aiBrief: '',
    questionCount: 20,
    level: 'B2-C1',
    purpose: '',
    skill: '',
    codes: 1,
    duration: 15,
    selectedFormats: [],
    shuffleQuestions: true,
    shuffleOptions: true,
    includeExplanations: true,
    contentLanguage: 'en',
    explanationLanguage: 'en',
    includeRubric: true,
    interactiveOneByOne: false,
    interactiveTimer: true,
    interactiveShowAnswers: true,
    nb: 25,
    th: 35,
    vd: 30,
    vdc: 10,
    recognizedQuestions: [],
  };
}

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function extractField(text, label, fallback = '') {
  const match = String(text || '').match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
  return match?.[1]?.trim() || fallback;
}

function numberFromAny(text, fallback) {
  const found = Number(String(text || '').match(/(\d{1,3})\s*(?:câu|questions?|items?)?/i)?.[1]);
  return Number.isFinite(found) && found > 0 ? found : fallback;
}

function inferLevel(text, fallback = 'B2-C1') {
  return String(text || '').match(/\b(A2|B1-B2|B1|B2-C1|B2|C1|C2)\b/i)?.[1]?.toUpperCase() || fallback;
}

function inferPurpose(text, fallback = 'Kiểm tra 15 phút') {
  const lower = String(text || '').toLowerCase();
  if (/thpt|tốt nghiệp|tot nghiep/.test(lower)) return 'Đề THPT';
  if (/hsg|học sinh giỏi|hoc sinh gioi/.test(lower)) return 'Đề luyện HSG';
  if (/1 tiết|45/.test(lower)) return 'Kiểm tra 1 tiết';
  if (/15/.test(lower)) return 'Kiểm tra 15 phút';
  if (/homework|bài tập về nhà|bai tap ve nha/.test(lower)) return 'Bài tập về nhà';
  return fallback;
}

function inferTopic(text, fallback = 'English revision') {
  const explicit = extractField(text, 'Topic', '') || extractField(text, 'Chủ điểm', '') || extractField(text, 'Chủ đề', '') || extractField(text, 'Chu diem', '') || extractField(text, 'Chu de', '');
  if (explicit) return explicit;
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  const afterCreate = raw.match(/(?:kiểm tra|ôn tập|tạo|create|test|practice)\s+(.+?)(?:,|\.| level| gồm| có đáp án|$)/i)?.[1];
  return clean(afterCreate || raw.split(/[\n.]/)[0] || fallback).slice(0, 90);
}

function inferFormats(text, fallback = ['mcq-4', 'cloze', 'error-correction-mcq']) {
  const lower = String(text || '').toLowerCase();
  const formats = [];
  if (/mcq|trắc nghiệm|multiple choice/.test(lower)) formats.push('mcq-4');
  if (/cloze|điền từ|dien tu/.test(lower)) formats.push('cloze');
  if (/word form|word formation|từ loại|tu loai/.test(lower)) formats.push('word-formation-mcq');
  if (/error|sửa lỗi|sua loi/.test(lower)) formats.push('error-correction-mcq');
  if (/reading|đọc hiểu|doc hieu/.test(lower)) formats.push('reading-mcq');
  if (/listening|nghe/.test(lower)) formats.push('listening-mcq');
  if (/rewrite|viết lại|viet lai/.test(lower)) formats.push('rewrite');
  if (/short answer|tự luận ngắn|tu luan ngan/.test(lower)) formats.push('short-answer');
  if (/essay|paragraph|writing|viết đoạn|viet doan/.test(lower)) formats.push('paragraph-writing');
  return formats.length ? [...new Set(formats)] : fallback;
}

function topicFrom(input, fallback = 'English revision') {
  return inferTopic(input, fallback);
}

function fromLegacyInput(input) {
  const base = createDefaultExamProject();
  const brief = analyzeExamRequirement(input, base);
  return {
    ...base,
    ...brief.projectPatch,
    sourceText: extractField(input, 'Content', '') || extractField(input, 'Sections', '') || input || base.sourceText,
    aiRequirement: input || base.aiRequirement,
    aiBrief: brief.briefText,
  };
}

export function analyzeExamRequirement(requirement, currentProject = createDefaultExamProject()) {
  const text = String(requirement || '').trim();
  const questionCount = Math.max(5, Math.min(numberFromAny(text, currentProject.questionCount || 30), 120));
  const level = inferLevel(text, currentProject.level || 'B2-C1');
  const purpose = inferPurpose(text, currentProject.purpose || 'Kiểm tra 15 phút');
  const topic = inferTopic(text, currentProject.topic || 'English revision');
  const selectedFormats = inferFormats(text, currentProject.selectedFormats || ['mcq-4']);
  const skill = /reading|đọc/i.test(text) ? 'reading' : /vocab|word|từ vựng|tu vung/i.test(text) ? 'vocabulary' : /listening|nghe/i.test(text) ? 'listening' : 'grammar';
  const examType = purpose.includes('THPT') ? 'mixed-thpt' : purpose.includes('HSG') ? 'hsg-practice' : purpose.includes('1 tiết') ? 'period-test' : purpose.includes('15') ? 'fifteen-minute' : currentProject.examType;
  const brief = {
    topic,
    level,
    purpose,
    questionCount,
    skill,
    selectedFormats,
    sections: selectedFormats.map((id) => allQuestionFormats().find((format) => format.id === id)?.label).filter(Boolean),
    output: 'Bản học sinh, bản giáo viên, đáp án, giải thích, Google Form text và HTML tương tác.',
    notes: text || 'Giáo viên có thể chỉnh brief trước khi tạo bằng AI.',
  };
  const briefText = [
    `Chủ điểm: ${brief.topic}`,
    `Level: ${brief.level}`,
    `Mục tiêu: ${brief.purpose}`,
    `Số câu: ${brief.questionCount}`,
    `Nhóm kỹ năng: ${brief.skill}`,
    `Dạng câu: ${brief.sections.join(', ') || 'Multiple Choice'}`,
    `Đầu ra: ${brief.output}`,
    `Ghi chú: ${brief.notes}`,
  ].join('\n');
  return {
    brief,
    briefText,
    projectPatch: { topic, level, purpose, questionCount, skill, selectedFormats, examType, aiBrief: briefText, sourceMode: 'ai-topic' },
  };
}

export function recognizeExamQuestionsFromText(text, project = createDefaultExamProject()) {
  const mcq = parseMcqFromText(text, { level: project.level, topic: project.topic, source: 'Exam Studio paste/upload' });
  const questions = mcq.map((item, index) => {
    const answerLetter = String(item.answer || '').toUpperCase();
    const correctIndex = ANSWERS.indexOf(answerLetter) >= 0 ? ANSWERS.indexOf(answerLetter) : 0;
    return {
      id: `recognized-${index + 1}`,
      no: index + 1,
      kind: 'Recognized MCQ',
      band: bandFor(index * 17, project),
      stem: item.question,
      options: (item.options || []).slice(0, 4).map((option, optionIndex) => ({ key: ANSWERS[optionIndex], text: option, isCorrect: optionIndex === correctIndex })),
      answer: ANSWERS[correctIndex] || 'A',
      explanation: item.explanation || 'Câu hỏi được nhận dạng từ nội dung giáo viên cung cấp. Có thể dùng AI để bổ sung giải thích.',
      sourceFocus: project.topic,
      formatId: 'mcq-4',
    };
  });
  const linesCount = String(text || '').split(/\r?\n/).filter((line) => line.trim()).length;
  const diagnostics = [
    `Đã đọc ${linesCount} dòng nội dung.`,
    `Phát hiện ${questions.length} câu trắc nghiệm có thể chuẩn hoá.`,
  ];
  if (!questions.length) diagnostics.push('Chưa nhận dạng được câu hỏi rõ ràng; hãy kiểm tra cách đánh số câu và phương án A-D, hoặc dùng AI để chuẩn hoá.');
  const missingAnswers = questions.filter((q) => !q.answer).length;
  if (missingAnswers) diagnostics.push(`${missingAnswers} câu thiếu đáp án.`);
  return { questions, diagnostics, detectedCount: questions.length };
}

function keywordsFrom(project) {
  const seed = `${project.topic || ''} ${project.sourceText || ''} ${project.aiRequirement || ''}`;
  const common = new Set('topic level purpose content questions codes sections exam type the and with from this that when while into about teacher student lesson test english grammar form answer tạo kiểm tra câu level gồm đáp án giải thích'.split(' '));
  const words = seed
    .replace(/[^A-Za-zÀ-ỹ0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !common.has(word.toLowerCase()));
  const unique = [];
  for (const word of words) {
    const normalized = word.toLowerCase();
    if (!unique.some((item) => item.toLowerCase() === normalized)) unique.push(word);
    if (unique.length >= 24) break;
  }
  return unique.length ? unique : ['context', 'meaning', 'grammar', 'vocabulary', 'coherence', 'accuracy'];
}

function pick(arr, index) {
  return arr[index % arr.length];
}

function bandFor(index, project) {
  const total = Math.max(1, Number(project.nb) + Number(project.th) + Number(project.vd) + Number(project.vdc));
  const position = (index % 100) / 100 * total;
  if (position < Number(project.nb)) return 'NB';
  if (position < Number(project.nb) + Number(project.th)) return 'TH';
  if (position < Number(project.nb) + Number(project.th) + Number(project.vd)) return 'VD';
  return 'VDC';
}

function selectedFormatObjects(project) {
  const formats = allQuestionFormats();
  const selected = (project.selectedFormats || []).map((id) => formats.find((format) => format.id === id)).filter(Boolean);
  if (selected.length) return selected;
  return ['mcq-4', 'cloze', 'word-formation-mcq'].map((id) => formats.find((format) => format.id === id)).filter(Boolean);
}

function needsReadingPassage(project) {
  const haystack = [
    project?.skill,
    project?.topic,
    project?.purpose,
    project?.aiBrief,
    project?.aiRequirement,
    ...(project?.selectedFormats || []),
  ].join(' ').toLowerCase();
  return /reading|passage|comprehension|đọc|doc|reading-mcq|heading-matching|information-matching|give-evidence|summary-completion|reading-response|reading-timer/.test(haystack);
}

function fallbackPassages(project) {
  if (Array.isArray(project.passages) && project.passages.length) return project.passages;
  if (!needsReadingPassage(project)) return [];
  const topic = clean(project.topic || project.aiRequirement || 'modern learning').slice(0, 80) || 'modern learning';
  return [{
    id: 'passage-1',
    title: `${topic} — Reading Passage`,
    text: `In recent years, ${topic.toLowerCase()} has become an important topic in schools and communities. Many learners encounter it through classroom discussions, online materials, and real-life situations. Supporters argue that understanding this topic helps students think more critically, use language more accurately, and connect new knowledge with familiar experiences. However, teachers often need to guide students carefully because the topic may include details, examples, and viewpoints that are easy to confuse. A good reading task should therefore encourage learners to identify main ideas, locate specific information, infer meaning from context, and evaluate the writer's purpose. When students practise these skills regularly, they become more confident readers and can respond to exam questions more effectively.`,
  }];
}

function normalizePassages(project, questions = []) {
  const map = new Map();
  fallbackPassages(project).forEach((passage, index) => {
    const id = passage.id || `passage-${index + 1}`;
    map.set(id, { id, title: passage.title || `Reading Passage ${index + 1}`, text: passage.text || '' });
  });
  questions.forEach((question) => {
    if (question.passageText) {
      const id = question.passageId || `passage-${map.size + 1}`;
      if (!map.has(id)) map.set(id, { id, title: question.passageTitle || 'Reading Passage', text: question.passageText });
    }
  });
  return Array.from(map.values()).filter((passage) => clean(passage.text).length > 40);
}

function passageMarkdown(passages) {
  if (!passages?.length) return '';
  return passages.map((passage, index) => `## Reading Passage ${index + 1}: ${passage.title || 'Untitled'}\n\n${passage.text}`).join('\n\n');
}

function kindFor(project, index) {
  const selected = selectedFormatObjects(project);
  return pick(selected, index)?.kind || 'Grammar MCQ';
}

function optionSet(correct, i, kind) {
  const distractorPools = {
    'Grammar MCQ': ['used the wrong tense', 'does not match the time signal', 'breaks the verb pattern'],
    Cloze: ['does not fit the discourse', 'is grammatically possible but contextually weak', 'changes the meaning'],
    'Multiple-choice Cloze': ['breaks text cohesion', 'has the wrong register', 'does not fit the sentence logic'],
    'Word formation': ['wrong part of speech', 'wrong suffix', 'wrong negative form'],
    'Error correction': ['no error', 'wrong connector', 'wrong verb agreement'],
    'Reading detail': ['not stated in the text', 'contradicts the text', 'too general'],
    'Listening MCQ': ['not mentioned in the recording', 'contradicts the speaker', 'only partly correct'],
    'Vocabulary in context': ['too informal', 'wrong collocation', 'different register'],
    Collocation: ['make a wrong collocation', 'use an unnatural phrase', 'change the intended meaning'],
    Pronunciation: ['has a different vowel sound', 'has a different final sound', 'has a different consonant cluster'],
    Stress: ['places stress on the wrong syllable', 'does not follow the stress pattern', 'has weak stress'],
  };
  const distractors = distractorPools[kind] || ['distractor one', 'distractor two', 'distractor three'];
  const correctIndex = i % 4;
  return ANSWERS.map((key, optionIndex) => ({
    key,
    text: optionIndex === correctIndex ? correct : distractors[(optionIndex + i) % distractors.length],
    isCorrect: optionIndex === correctIndex,
  }));
}

function isOpenResponseKind(kind) {
  return /Short answer|Open|Rewrite|Paraphrase|Translation|Evidence|Completion|Paragraph|Essay|Email|Report|Summary|Response|Script|Outline|Writing|Correct the mistake/i.test(kind);
}

function makeQuestion(project, index, keywords) {
  const no = index + 1;
  const topic = clean(project.topic || 'the target lesson');
  const keyword = pick(keywords, index);
  const format = pick(selectedFormatObjects(project), index) || { id: 'mcq-4', label: 'Multiple Choice 4 options', kind: 'Grammar MCQ' };
  const kind = format.kind;
  const band = bandFor(index * 17, project);
  let stem = '';
  let correct = '';
  let explanation = '';
  let sampleAnswer = '';
  let rubric = '';

  if (kind === 'Grammar MCQ') {
    stem = `In the context of ${topic}, choose the option that best completes the sentence: The students _____ the task when the teacher gave extra instructions.`;
    correct = 'were completing';
    explanation = 'The past continuous fits an action in progress interrupted by another past action.';
  } else if (/Cloze/.test(kind)) {
    stem = `Choose the best word to complete the cloze sentence about ${keyword}: Effective learners review new language regularly; _____, they can retrieve it faster in exams.`;
    correct = 'therefore';
    explanation = 'Therefore signals a result and keeps the logic of the sentence clear.';
  } else if (/Word formation/.test(kind)) {
    stem = `Use the correct form of the word in brackets: The activity encouraged greater learner _____ in group work. (PARTICIPATE)`;
    correct = 'participation';
    explanation = 'A noun is needed after the adjective greater and before the prepositional phrase.';
  } else if (/Error|Correct the mistake/.test(kind)) {
    stem = `Identify or correct the mistake: While the class discussed ${keyword}, the teacher was explained the rule again.`;
    correct = 'was explaining';
    explanation = 'The active past continuous should be was explaining, not was explained.';
  } else if (/Reading|Evidence|Information|Summary|Note|Table/.test(kind)) {
    stem = `Read a short passage about ${topic}. What information is directly supported about ${keyword}?`;
    correct = 'The information is stated explicitly in the passage.';
    explanation = 'Detail/evidence questions must be answered from explicit textual information.';
  } else if (/Listening/.test(kind)) {
    stem = `Listen to a short classroom conversation about ${topic}. What does the speaker mainly suggest about ${keyword}?`;
    correct = 'Learners should connect the rule with context before choosing an answer.';
    explanation = 'The answer should match the speaker’s main message, not isolated words.';
  } else if (/Rewrite/.test(kind)) {
    stem = `Rewrite the sentence using the word given so that the meaning stays the same: The phone rang while I was cooking dinner. (WHEN)`;
    correct = 'I was cooking dinner when the phone rang.';
    sampleAnswer = correct;
    explanation = 'The sentence keeps the interrupted-action meaning.';
  } else if (/Paragraph|Essay|Email|Report|Writing|Response|Script|Outline/.test(kind)) {
    stem = `Write a ${kind.toLowerCase()} about ${topic}. Include at least two accurate examples related to ${keyword}.`;
    correct = 'Sample answer depends on student response.';
    sampleAnswer = `Students should produce a coherent response about ${topic}, using accurate vocabulary and grammar.`;
    rubric = 'Task response 3 pts · Vocabulary 2 pts · Grammar 2 pts · Coherence 2 pts · Mechanics 1 pt.';
    explanation = 'Use the rubric to score content, accuracy and coherence.';
  } else if (/Pronunciation/.test(kind)) {
    stem = `Choose the word whose underlined sound is different in a set related to ${topic}.`;
    correct = 'Option with a different vowel or consonant sound';
    explanation = 'Pronunciation questions check sound contrast, not meaning.';
  } else if (/Stress/.test(kind)) {
    stem = `Choose the word that has a different stress pattern from the others.`;
    correct = 'Option with a different primary stress position';
    explanation = 'Stress questions check primary stress placement.';
  } else {
    stem = `Answer the question about ${topic}: How does ${keyword} help learners complete the task accurately?`;
    correct = 'It helps learners choose an answer that fits both grammar and meaning.';
    sampleAnswer = correct;
    explanation = 'The response should connect the focus word with task accuracy.';
  }

  const open = isOpenResponseKind(kind);
  const options = open ? [] : optionSet(correct, index, kind);
  return {
    id: `q-${no}`,
    no,
    kind,
    formatId: format.id,
    formatLabel: format.label,
    band,
    stem: `${no}. ${stem}`,
    options,
    answer: open ? correct : (options.find((item) => item.isCorrect)?.key || 'A'),
    explanation,
    sampleAnswer,
    rubric,
    sourceFocus: keyword,
  };
}

function buildQuestions(project) {
  const passages = normalizePassages(project);
  const attachPassage = (q) => {
    if (!passages.length || q.passageId || q.passageText) return q;
    const passage = passages[0];
    return { ...q, passageId: passage.id, passageTitle: passage.title, passageText: passage.text, kind: /reading/i.test(q.kind || '') ? q.kind : 'Reading Comprehension MCQ', formatId: q.formatId || 'reading-mcq' };
  };
  if (Array.isArray(project.recognizedQuestions) && project.recognizedQuestions.length) {
    return project.recognizedQuestions.map((q, index) => attachPassage({ ...q, no: index + 1, id: q.id || `recognized-${index + 1}` }));
  }
  const safeCount = Math.max(3, Math.min(Number(project.questionCount) || 20, 120));
  const keywords = keywordsFrom(project);
  return Array.from({ length: safeCount }, (_, index) => attachPassage(makeQuestion(project, index, keywords)));
}

function optionText(options) {
  return (options || []).map((option) => `${option.key}. ${option.text}`).join('\n');
}

function rotatedQuestions(questions, codeIndex) {
  if (!questions.length) return [];
  const shift = codeIndex % questions.length;
  return [...questions.slice(shift), ...questions.slice(0, shift)].map((q, index) => ({ ...q, no: index + 1 }));
}

function rotateOptions(question, codeIndex) {
  if (!(question.options || []).length) return question;
  const shift = codeIndex % 4;
  const original = question.options || [];
  const rotated = [...original.slice(shift), ...original.slice(0, shift)].map((option, index) => ({ ...option, key: ANSWERS[index] }));
  return { ...question, options: rotated, answer: rotated.find((option) => option.isCorrect)?.key || question.answer };
}

function questionsForCode(questions, project, codeIndex) {
  const ordered = project.shuffleQuestions ? rotatedQuestions(questions, codeIndex) : questions.map((q, index) => ({ ...q, no: index + 1 }));
  return ordered.map((question) => (project.shuffleOptions ? rotateOptions(question, codeIndex) : question));
}

function buildMatrix(questions) {
  const map = new Map();
  for (const q of questions) {
    const key = q.kind;
    if (!map.has(key)) map.set(key, { kind: key, count: 0, bands: { NB: 0, TH: 0, VD: 0, VDC: 0 } });
    const row = map.get(key);
    row.count += 1;
    row.bands[q.band] = (row.bands[q.band] || 0) + 1;
  }
  return [...map.values()];
}

function answerDistribution(questions) {
  return ANSWERS.reduce((acc, key) => {
    acc[key] = questions.filter((q) => q.answer === key).length;
    return acc;
  }, {});
}

function qualityReport(project, questions) {
  const stems = questions.map((q) => q.stem.toLowerCase());
  const duplicates = stems.length - new Set(stems).size;
  const missingAnswer = questions.filter((q) => !q.answer).length;
  const optionIssues = questions.filter((q) => (q.options || []).length > 0 && (q.options || []).length < 4).length;
  const distribution = answerDistribution(questions.filter((q) => (q.options || []).length));
  const values = Object.values(distribution);
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  const warnings = [];
  if (duplicates) warnings.push(`${duplicates} câu có stem trùng hoặc quá giống nhau.`);
  if (optionIssues) warnings.push(`${optionIssues} câu trắc nghiệm chưa đủ 4 phương án.`);
  if (missingAnswer) warnings.push(`${missingAnswer} câu thiếu đáp án hoặc sample answer.`);
  if (max - min > Math.ceil(Math.max(1, questions.length) * 0.25)) warnings.push('Phân bố đáp án A/B/C/D chưa cân bằng, nên đảo/kiểm tra lại đáp án.');
  if (!clean(project.sourceText) && project.sourceMode === 'paste') warnings.push('Nguồn dữ liệu còn trống, nên dán nội dung hoặc upload file trước khi nhận dạng.');
  return {
    score: Math.max(65, 100 - duplicates * 6 - optionIssues * 8 - missingAnswer * 8 - warnings.length * 4),
    duplicates,
    optionIssues,
    missingAnswer,
    distribution,
    warnings,
    checks: [
      { label: 'Có câu hỏi được tách thành từng card', ok: questions.length > 0 },
      { label: 'Có đáp án hoặc sample answer', ok: missingAnswer === 0 },
      { label: 'Có giải thích / rubric giáo viên', ok: Boolean(project.includeExplanations || project.includeRubric) },
      { label: 'Có ma trận dạng câu hỏi', ok: buildMatrix(questions).length > 0 },
      { label: 'Sẵn sàng preview và xuất file', ok: questions.length > 0 },
    ],
  };
}

function matrixMarkdown(matrix) {
  const head = '| Dạng câu | Số câu | NB | TH | VD | VDC |\n|---|---:|---:|---:|---:|---:|';
  const body = matrix.map((row) => `| ${row.kind} | ${row.count} | ${row.bands.NB || 0} | ${row.bands.TH || 0} | ${row.bands.VD || 0} | ${row.bands.VDC || 0} |`).join('\n');
  return `${head}\n${body}`;
}

function studentQuestionText(q) {
  const stem = q.stem.replace(/^\d+\.\s*/, `${q.no}. `);
  const opts = (q.options || []).length ? `\n${optionText(q.options)}` : '\n\nAnswer: ........................................................................';
  return `${stem}${opts}`;
}

function teacherQuestionText(q) {
  const answer = (q.options || []).length ? q.answer : (q.sampleAnswer || q.answer);
  const rubric = q.rubric ? `\nRubric: ${q.rubric}` : '';
  return `${studentQuestionText(q)}\nAnswer: ${answer || ''}${q.explanation ? `\nExplanation: ${q.explanation}` : ''}${rubric}`;
}

function studentMarkdownForCode(questions, codeNumber, project, passages = []) {
  const passageText = passageMarkdown(passages);
  return `# ENGLISH TEST — Code ${codeNumber}

**Topic:** ${project.topic}

**Time:** ${project.duration} minutes

${passageText ? `${passageText}

` : ''}${questions.map(studentQuestionText).join('\n\n')}`;
}

function teacherMarkdownForCode(questions, codeNumber, project, passages = []) {
  const key = questions.map((q) => `${q.no}.${(q.options || []).length ? q.answer : 'Open'}`).join('   ');
  const passageText = passageMarkdown(passages);
  return `# TEACHER KEY — Code ${codeNumber}

${passageText ? `${passageText}

` : ''}## Answer key
${key}

## Detailed key
${questions.map(teacherQuestionText).join('\n\n')}`;
}

function answersOnlyMarkdown(questions) {
  return questions.map((q) => `${q.no}. ${(q.options || []).length ? q.answer : (q.sampleAnswer || q.answer || 'Open response')}`).join('\n');
}

function explanationsMarkdown(questions) {
  return questions.map((q) => `${q.no}. ${q.explanation || q.rubric || 'No explanation yet.'}`).join('\n');
}

function googleFormText(questions, project, passages = []) {
  const passageText = passageMarkdown(passages);
  const questionText = questions.map((q) => `${q.no}. ${q.stem.replace(/^\d+\.\s*/, '')}
${(q.options || []).length ? optionText(q.options) : 'Short answer / paragraph response'}
Answer: ${(q.options || []).length ? q.answer : (q.sampleAnswer || q.answer || '')}${project.includeExplanations ? `
Explanation: ${q.explanation || q.rubric || ''}` : ''}`).join('\n\n');
  return `${passageText ? `${passageText}\n\n` : ''}${questionText}`;
}

function bankJson(questions, project, passages = []) {
  return JSON.stringify({
    source: 'Brian English Studio Exam Studio V9.5.2',
    topic: project.topic,
    level: project.level,
    purpose: project.purpose,
    selectedFormats: project.selectedFormats,
    passages,
    questions,
  }, null, 2);
}

function escapeScriptJson(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function interactiveHtml(title, questions, project, passages = []) {
  const quizQuestions = questions.map((q) => ({
    no: q.no,
    stem: q.stem.replace(/^\d+\.\s*/, ''),
    options: q.options || [],
    answer: q.answer,
    explanation: q.explanation || q.rubric || '',
    passageId: q.passageId || '',
    passageTitle: q.passageTitle || '',
    open: !(q.options || []).length,
  }));
  const quizPassages = passages;
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body{margin:0;font-family:Inter,Arial,sans-serif;background:#eef6ff;color:#102040}.wrap{max-width:980px;margin:0 auto;padding:28px}.card{background:#fff;border:1px solid #dbeafe;border-radius:0;padding:22px;margin:16px 0;box-shadow:none}h1{margin:0 0 8px}.muted{color:#64748b}.option{display:block;width:100%;text-align:left;margin:8px 0;padding:12px 14px;border:1px solid #dbeafe;border-radius:0;background:#f8fbff;cursor:pointer}.option.selected{border-color:#2563eb;background:#dbeafe}.top{position:sticky;top:0;background:#eef6ff;padding:12px 0;z-index:2}.btn{border:0;border-radius:0;padding:12px 18px;background:#2563eb;color:white;font-weight:700;cursor:pointer}.score{font-size:26px;font-weight:900;color:#075985}.explain{background:#f1f5f9;border-radius:0;padding:12px;margin-top:10px;display:none}.done .explain{display:block}@media(max-width:700px){.wrap{padding:16px}.card{padding:16px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><button class="btn" onclick="submitQuiz()">Nộp bài / Submit</button> <span id="timer" class="muted"></span></div>
  <section class="card"><h1>${title}</h1><p class="muted">Chủ điểm: ${project.topic} · Level: ${project.level} · Thời gian: ${project.duration} phút</p><p id="result" class="score"></p></section>
  <main id="quiz"></main>
</div>
<script>
const passages=${escapeScriptJson(quizPassages)};
const questions=${escapeScriptJson(quizQuestions)};
const answers={};
let seconds=${Math.max(1, Number(project.duration) || 15)}*60;
function render(){document.getElementById('quiz').innerHTML=(passages.length?'<section class="card"><h2>Reading Passage</h2>'+passages.map(p=>'<h3>'+p.title+'</h3><p>'+p.text+'</p>').join('')+'</section>':'')+questions.map(q=>'<section class="card q" id="q'+q.no+'"><h2>Câu '+q.no+'</h2><p>'+q.stem+'</p>'+ (q.open?'<textarea rows="4" style="width:100%;border:1px solid #dbeafe;border-radius:0;padding:12px" placeholder="Nhập câu trả lời..."></textarea>':q.options.map(o=>'<button class="option" onclick="choose('+q.no+',\\''+o.key+'\\',this)">'+o.key+'. '+o.text+'</button>').join('')) + '<div class="explain"><b>Đáp án:</b> '+(q.open?'Tự luận':q.answer)+'<br><b>Giải thích:</b> '+q.explanation+'</div></section>').join('')}
function choose(no,key,el){answers[no]=key;el.parentElement.querySelectorAll('.option').forEach(b=>b.classList.remove('selected'));el.classList.add('selected')}
function submitQuiz(){let total=questions.filter(q=>!q.open).length;let correct=questions.filter(q=>!q.open&&answers[q.no]===q.answer).length;document.body.classList.add('done');document.querySelectorAll('.q').forEach(el=>el.classList.add('done'));document.getElementById('result').textContent='Score: '+correct+'/'+total}
function tick(){const m=Math.floor(seconds/60),s=seconds%60;document.getElementById('timer').textContent='Thời gian còn lại: '+m+':'+String(s).padStart(2,'0');if(seconds>0){seconds--;setTimeout(tick,1000)}}
render();tick();
</script>
</body>
</html>`;
}

export function buildExamOutputFromQuestions(projectInput, questionsInput) {
  const project = { ...createDefaultExamProject(), ...(projectInput || {}) };
  const rawQuestions = (questionsInput || buildQuestions(project)).map((q, index) => ({ ...q, no: index + 1, id: q.id || `q-${index + 1}` }));
  const passages = normalizePassages(project, rawQuestions);
  const questions = rawQuestions.map((q) => {
    if (!passages.length || q.passageText) return q;
    if (needsReadingPassage(project) || /reading/i.test(q.kind || q.formatId || q.formatLabel || '')) {
      const passage = passages[0];
      return { ...q, passageId: q.passageId || passage.id, passageTitle: q.passageTitle || passage.title, passageText: q.passageText || passage.text };
    }
    return q;
  });
  const codes = Math.max(1, Math.min(Number(project.codes) || 1, 12));
  const codeSets = Array.from({ length: codes }, (_, index) => {
    const codeNumber = 101 + index;
    const codeQuestions = questionsForCode(questions, project, index);
    return {
      codeNumber,
      questions: codeQuestions,
      studentMarkdown: studentMarkdownForCode(codeQuestions, codeNumber, project, passages),
      teacherMarkdown: teacherMarkdownForCode(codeQuestions, codeNumber, project, passages),
      answersMarkdown: answersOnlyMarkdown(codeQuestions),
      explanationsMarkdown: explanationsMarkdown(codeQuestions),
      googleFormText: googleFormText(codeQuestions, project, passages),
    };
  });
  const matrix = buildMatrix(questions);
  const quality = qualityReport(project, questions);
  const firstCode = codeSets[0];
  const title = `Exam Studio — ${project.topic || 'Assessment draft'}`;
  const matrixText = matrixMarkdown(matrix);
  const qualityText = quality.checks.map((check) => `- ${check.ok ? '✓' : '⚠'} ${check.label}`).join('\n');
  const warningText = quality.warnings.length ? quality.warnings.map((item) => `- ⚠ ${item}`).join('\n') : '- ✓ Chưa phát hiện lỗi lớn trong bản nháp.';
  const codeText = codeSets.map((code) => `## Mã đề ${code.codeNumber}\n\n${code.studentMarkdown}\n\n${code.teacherMarkdown}`).join('\n\n---\n\n');
  const html = interactiveHtml(title, firstCode?.questions || questions, project, passages);
  return {
    title,
    project,
    questions,
    passages,
    matrix,
    quality,
    codeSets,
    studentMarkdown: firstCode?.studentMarkdown || '',
    teacherMarkdown: firstCode?.teacherMarkdown || '',
    answersMarkdown: firstCode?.answersMarkdown || '',
    explanationsMarkdown: firstCode?.explanationsMarkdown || '',
    googleFormText: firstCode?.googleFormText || '',
    bankJson: bankJson(questions, project, passages),
    interactiveHtml: html,
    stats: [
      { label: 'Questions', value: questions.length },
      { label: 'Codes', value: codes },
      { label: 'Quality', value: `${quality.score}%` },
      { label: 'Formats', value: selectedFormatObjects(project).length },
    ],
    cards: ['Preview ready', 'Teacher key ready', 'Interactive HTML ready'],
    markdown: `# ${title}\n\n## 1. Blueprint\n- Level: ${project.level}\n- Purpose: ${project.purpose}\n- Exam type: ${EXAM_TYPE_OPTIONS.find((item) => item.id === project.examType)?.label || project.examType}\n- Question formats: ${selectedFormatObjects(project).map((item) => item.label).join(', ')}\n- Codes: ${codes}\n- Shuffle questions: ${project.shuffleQuestions ? 'Yes' : 'No'}\n- Shuffle options: ${project.shuffleOptions ? 'Yes' : 'No'}\n\n## 2. Matrix\n${matrixText}\n\n## 3. Quality report\nScore: ${quality.score}%\n\n${qualityText}\n\n### Warnings\n${warningText}\n\n## 4. Generated draft\n${codeText}\n\n## 5. Google Form text\n${firstCode?.googleFormText || ''}`,
    generatedAt: new Date().toISOString(),
  };
}

export function generateExamWorkflowOutput(projectInput) {
  const project = typeof projectInput === 'string' ? fromLegacyInput(projectInput) : { ...createDefaultExamProject(), ...(projectInput || {}) };
  return buildExamOutputFromQuestions(project);
}

export function generateSpecializedOutput(slug, input) {
  const safeSlug = SPECIALIZED_TOOL_SLUGS.includes(slug) ? slug : 'exam-studio';
  const output = generateExamWorkflowOutput(input || getSpecializedConfig(safeSlug)?.sample || '');
  return { ...output, slug: safeSlug, generatedAt: new Date().toISOString() };
}
