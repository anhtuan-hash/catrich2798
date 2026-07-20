import React, { useEffect, useMemo, useRef, useState } from 'react';
import { callAI } from '../utils/gemini.js';
import { buildStandaloneHtml, buildTeacherText, parseActivity, slugify as activitySlugify } from '../utils/activityEngine.js';
import { addHistoryEntry, addQuestionsFromTextToBank, exportAsHtml, exportAsWord, parseMcqFromText, slugify as librarySlugify } from '../utils/library.js';

const EXAM_PROFILES = [
  {
    id: 'thpt-2025',
    label: 'THPT 2025',
    labelVi: 'TN THPT 2025',
    desc: 'Vietnam high-school graduation style: notices/flyers, ordering, gap information and reading comprehension.',
    descVi: 'Định hướng đề tốt nghiệp THPT từ 2025: thông báo/tờ rơi, sắp xếp, điền thông tin và đọc hiểu.',
    defaults: ['notice-flyer', 'reorder-text', 'info-gap', 'main-idea', 'detail', 'inference', 'vocab-context', 'vocab-synonym', 'vocab-antonym', 'reference'],
  },
  {
    id: 'ielts',
    label: 'IELTS Reading',
    labelVi: 'IELTS Reading',
    desc: 'Academic reading with matching, T/F/NG, completion and MCQ tasks.',
    descVi: 'Đọc học thuật với matching, True/False/Not Given, completion và MCQ.',
    defaults: ['tfng', 'matching-headings', 'matching-information', 'sentence-completion', 'summary-completion', 'detail', 'inference'],
  },
  {
    id: 'toefl',
    label: 'TOEFL iBT',
    labelVi: 'TOEFL iBT',
    desc: 'Factual, negative factual, inference, vocabulary, reference, rhetoric and prose-summary tasks.',
    descVi: 'Câu hỏi factual, negative factual, inference, vocabulary, reference, rhetoric và prose summary.',
    defaults: ['detail', 'negative-factual', 'inference', 'vocab-context', 'reference', 'purpose-tone', 'summary'],
  },
  {
    id: 'cambridge',
    label: 'Cambridge B2/C1',
    labelVi: 'Cambridge B2/C1',
    desc: 'Multiple choice, gapped text, multiple matching and detail inference tasks.',
    descVi: 'Multiple choice, gapped text, multiple matching và suy luận chi tiết.',
    defaults: ['main-idea', 'detail', 'inference', 'gapped-text', 'multiple-matching', 'vocab-context'],
  },
  {
    id: 'toeic',
    label: 'TOEIC Reading',
    labelVi: 'TOEIC Reading',
    desc: 'Notices, emails, ads, single/double passages and workplace reading.',
    descVi: 'Thông báo, email, quảng cáo, đoạn đơn/kép và văn bản công việc.',
    defaults: ['notice-flyer', 'detail', 'inference', 'vocab-context', 'purpose-tone'],
  },
  {
    id: 'school',
    label: 'School Test',
    labelVi: 'Đề kiểm tra lớp',
    desc: 'Flexible classroom reading test for grade 6-12 or gifted practice.',
    descVi: 'Dạng linh hoạt cho kiểm tra lớp, ôn THPT hoặc bồi dưỡng học sinh giỏi.',
    defaults: ['main-idea', 'detail', 'inference', 'vocab-context', 'vocab-synonym', 'vocab-antonym', 'reference', 'summary'],
  },
];

const QUESTION_TYPES = [
  { id: 'main-idea', label: 'Main idea / Best title', labelVi: 'Ý chính / tiêu đề' },
  { id: 'detail', label: 'Detail / Factual information', labelVi: 'Chi tiết / thông tin đúng' },
  { id: 'negative-factual', label: 'Negative factual / NOT true', labelVi: 'Thông tin KHÔNG đúng' },
  { id: 'inference', label: 'Inference', labelVi: 'Suy luận' },
  { id: 'vocab-context', label: 'Vocabulary in context', labelVi: 'Từ vựng trong ngữ cảnh' },
  { id: 'vocab-synonym', label: 'Word synonym', labelVi: 'Đồng nghĩa từ' },
  { id: 'vocab-antonym', label: 'Word antonym', labelVi: 'Trái nghĩa từ' },
  { id: 'sentence-equivalent', label: 'Sentence equivalence', labelVi: 'Đồng nghĩa câu' },
  { id: 'reference', label: 'Reference / pronoun reference', labelVi: 'Quy chiếu đại từ' },
  { id: 'purpose-tone', label: 'Purpose / tone / attitude', labelVi: 'Mục đích / giọng điệu' },
  { id: 'summary', label: 'Summary / prose summary', labelVi: 'Tóm tắt nội dung' },
  { id: 'tfng', label: 'True / False / Not Given', labelVi: 'True / False / Not Given' },
  { id: 'matching-headings', label: 'Matching headings', labelVi: 'Nối tiêu đề đoạn' },
  { id: 'matching-information', label: 'Matching information', labelVi: 'Nối thông tin' },
  { id: 'multiple-matching', label: 'Multiple matching', labelVi: 'Multiple matching' },
  { id: 'sentence-completion', label: 'Sentence completion', labelVi: 'Hoàn thành câu' },
  { id: 'summary-completion', label: 'Summary / note / table completion', labelVi: 'Điền tóm tắt / bảng / ghi chú' },
  { id: 'gapped-text', label: 'Gapped text', labelVi: 'Điền câu vào đoạn' },
  { id: 'notice-flyer', label: 'Notice / flyer / announcement', labelVi: 'Thông báo / tờ rơi' },
  { id: 'info-gap', label: 'Information gap completion', labelVi: 'Điền khuyết thông tin' },
  { id: 'reorder-text', label: 'Ordering conversation / letter / paragraph', labelVi: 'Sắp xếp hội thoại / thư / đoạn' },
];


const QUESTION_TYPE_TEMPLATES = {
  'main-idea': {
    vi: 'Ý chính / tiêu đề',
    exam: 'THPT / IELTS / TOEFL / Cambridge',
    stem: 'Which of the following best summarizes the passage? / What is the best title for the passage?',
    sample: 'Which of the following best serves as the title for the passage?\nA. The Risks of Replacing Teachers with AI\nB. How AI Is Changing Classroom Learning\nC. The History of Educational Technology\nD. Why Students Should Avoid Online Platforms\nAnswer: B\nHighlight: AI is transforming various sectors, and education is no exception.\nExplanation: The whole passage focuses on how AI affects learning and teaching.',
    rules: 'Answer must reflect the whole passage, not one detail. Distractors must be too narrow, too broad, or contradicted.'
  },
  detail: {
    vi: 'Chi tiết / thông tin đúng',
    exam: 'THPT / TOEFL / TOEIC / Cambridge',
    stem: 'According to paragraph X, which of the following is true about ...?',
    sample: 'According to paragraph 2, what can AI systems do for students?\nA. Replace all classroom teachers\nB. Analyze learning habits and personalize content\nC. Stop students from using technology\nD. Remove the need for assessment\nAnswer: B\nHighlight: AI systems can analyze students’ learning habits, strengths, and weaknesses.\nExplanation: This sentence directly supports option B.',
    rules: 'The correct answer must be explicitly stated or clearly paraphrased in the passage. Avoid outside knowledge.'
  },
  'negative-factual': {
    vi: 'Thông tin KHÔNG đúng',
    exam: 'THPT / TOEFL / TOEIC',
    stem: 'All of the following are mentioned in the passage EXCEPT ... / Which is NOT true?',
    sample: 'All of the following are mentioned as uses of AI in education EXCEPT _____.\nA. personalizing lessons\nB. automating grading\nC. managing schedules\nD. choosing students’ future careers\nAnswer: D\nHighlight: personalize learning experiences; automate grading; manage schedules\nExplanation: The passage mentions A, B, and C, but not D.',
    rules: 'Three options must be supported by the text; only one option must be not mentioned or false.'
  },
  inference: {
    vi: 'Suy luận',
    exam: 'THPT / TOEFL / Cambridge / IELTS',
    stem: 'It can be inferred from the passage that ...',
    sample: 'It can be inferred from the passage that the writer believes AI should be used _____.\nA. as a complete replacement for teachers\nB. with caution and proper human guidance\nC. only in universities\nD. without privacy rules\nAnswer: B\nHighlight: AI can be a valuable tool, but it should not replace traditional teaching methods.\nExplanation: The sentence implies a balanced and cautious use of AI.',
    rules: 'The answer must require a reasonable inference from evidence, not a direct copy and not a guess.'
  },
  'vocab-context': {
    vi: 'Từ vựng trong ngữ cảnh',
    exam: 'THPT / TOEFL / IELTS / Cambridge',
    stem: 'The word/phrase “...” in paragraph X is closest in meaning to ...',
    sample: 'The word “tailored” in paragraph 2 is closest in meaning to _____.\nA. expensive\nB. personalized\nC. traditional\nD. complicated\nAnswer: B\nHighlight: tailored educational content\nExplanation: In this context, “tailored” means designed for individual needs.',
    rules: 'Put the target word in quotation marks. Highlight the exact target phrase. Options must fit the same part of speech.'
  },
  'vocab-synonym': {
    vi: 'Đồng nghĩa từ',
    exam: 'THPT / TOEFL / TOEIC',
    stem: 'The word “...” is closest in meaning to ...',
    sample: 'The word “significant” in paragraph 2 is closest in meaning to _____.\nA. minor\nB. important\nC. recent\nD. simple\nAnswer: B\nHighlight: significant advantages\nExplanation: “Significant” means important or notable.',
    rules: 'Correct answer must be a true synonym in the passage context. Distractors should be same word class.'
  },
  'vocab-antonym': {
    vi: 'Trái nghĩa từ',
    exam: 'THPT / TOEIC / School tests',
    stem: 'The word “...” is OPPOSITE in meaning to ...',
    sample: 'The word “enhancing” in paragraph 1 is OPPOSITE in meaning to _____.\nA. improving\nB. limiting\nC. supporting\nD. developing\nAnswer: B\nHighlight: enhancing the learning experience\nExplanation: “Enhancing” means improving, so the opposite is limiting.',
    rules: 'Use OPPOSITE in uppercase. Highlight the exact target word/phrase. Only one option must be the opposite.'
  },
  'sentence-equivalent': {
    vi: 'Đồng nghĩa câu',
    exam: 'THPT / Cambridge / School tests',
    stem: 'Which sentence best paraphrases the sentence “...”?',
    sample: 'Which sentence best paraphrases the sentence “AI can assist teachers in administrative tasks”?\nA. AI can help teachers with non-teaching duties.\nB. AI can remove teachers from the classroom.\nC. AI can make students ignore homework.\nD. AI can prevent schools from using technology.\nAnswer: A\nHighlight: AI can assist teachers in administrative tasks\nExplanation: Option A keeps the meaning without adding or changing information.',
    rules: 'Quote the exact sentence. The correct option must preserve meaning, tense, and logic; distractors must distort one element.'
  },
  reference: {
    vi: 'Quy chiếu đại từ',
    exam: 'THPT / TOEFL / TOEIC',
    stem: 'The word “it/they/this/these” in paragraph X refers to ...',
    sample: 'The word “this” in paragraph 2 refers to _____.\nA. the use of AI to personalize learning\nB. students’ fear of technology\nC. the removal of teachers\nD. the need for final exams\nAnswer: A\nHighlight: This personalized approach\nExplanation: “This” refers back to AI-based personalized learning described before it.',
    rules: 'Use a real pronoun/reference word from the passage. Highlight the pronoun and include the antecedent in the explanation.'
  },
  'purpose-tone': {
    vi: 'Mục đích / giọng điệu',
    exam: 'THPT / TOEFL / TOEIC / Cambridge',
    stem: 'What is the author’s main purpose in paragraph X? / The writer’s attitude is best described as ...',
    sample: 'What is the writer’s attitude toward AI in education?\nA. completely negative\nB. cautiously positive\nC. indifferent\nD. humorous\nAnswer: B\nHighlight: Despite these benefits, there are concerns regarding the implementation of AI in education.\nExplanation: The writer presents benefits but also warns about concerns.',
    rules: 'Base the answer on wording and balance of ideas. Avoid extreme attitudes unless the passage clearly supports them.'
  },
  summary: {
    vi: 'Tóm tắt nội dung',
    exam: 'TOEFL / IELTS / Cambridge',
    stem: 'Which option best completes the summary of the passage?',
    sample: 'Which option best completes the summary of the passage?\nA. AI has no practical role in schools.\nB. AI can support personalized learning and administration, but it raises concerns.\nC. AI is useful only for students with special needs.\nD. AI should replace all traditional lessons.\nAnswer: B\nHighlight: personalized learning experiences; administrative tasks; concerns regarding the implementation of AI\nExplanation: Option B combines the major points of the passage.',
    rules: 'Correct summary must cover two or more major ideas. Distractors should omit or exaggerate key points.'
  },
  tfng: {
    vi: 'True / False / Not Given',
    exam: 'IELTS',
    stem: 'Do the following statements agree with the information in the passage?',
    sample: 'AI can help teachers reduce time spent on administrative work.\nA. True\nB. False\nC. Not Given\nAnswer: A\nHighlight: AI can automate grading, manage schedules, and even facilitate communication between teachers and parents.\nExplanation: The statement agrees with information in the passage.',
    rules: 'Use A True, B False, C Not Given. True = agrees, False = contradicts, Not Given = no information.'
  },
  'matching-headings': {
    vi: 'Nối tiêu đề đoạn',
    exam: 'IELTS / Cambridge',
    stem: 'Which heading best matches paragraph X?',
    sample: 'Which heading best matches paragraph 2?\nA. Privacy risks in schools\nB. Personalized learning through AI\nC. The cost of teacher training\nD. The history of online learning\nAnswer: B\nHighlight: provide personalized learning experiences\nExplanation: Paragraph 2 mainly explains how AI personalizes learning.',
    rules: 'Convert matching into one MCQ per paragraph. Correct heading must represent the whole paragraph, not one example.'
  },
  'matching-information': {
    vi: 'Nối thông tin',
    exam: 'IELTS',
    stem: 'Which paragraph contains the following information?',
    sample: 'Which paragraph mentions a concern about sensitive student data?\nA. Paragraph 1\nB. Paragraph 2\nC. Paragraph 3\nD. Paragraph 4\nAnswer: C\nHighlight: Privacy issues are at the forefront, as AI systems often require access to sensitive student data.\nExplanation: Paragraph 3 contains this information.',
    rules: 'Options should be paragraph labels. Highlight the exact evidence sentence.'
  },
  'multiple-matching': {
    vi: 'Multiple matching',
    exam: 'Cambridge B2/C1 / IELTS',
    stem: 'Which person/text/section mentions ...?',
    sample: 'Which section mentions that AI may reduce teachers’ paperwork?\nA. Section A\nB. Section B\nC. Section C\nD. Section D\nAnswer: B\nHighlight: reducing the administrative burden\nExplanation: Section B states that AI can reduce teachers’ administrative work.',
    rules: 'Use options as sections/people/texts. Each question asks for one matching item.'
  },
  'sentence-completion': {
    vi: 'Hoàn thành câu',
    exam: 'IELTS / Cambridge / THPT',
    stem: 'Complete the sentence. According to the passage, ...',
    sample: 'Complete the sentence. AI platforms can adapt lessons according to a student’s _____.\nA. progress\nB. parents\nC. classroom size\nD. final score only\nAnswer: A\nHighlight: adapt math lessons based on a student’s progress\nExplanation: The passage directly states “based on a student’s progress.”',
    rules: 'The completed sentence must be grammatically correct and directly supported by the passage.'
  },
  'summary-completion': {
    vi: 'Điền tóm tắt / bảng / ghi chú',
    exam: 'IELTS / THPT',
    stem: 'Complete the summary/table/notes with the best option.',
    sample: 'Complete the summary. AI can personalize learning and reduce teachers’ _____.\nA. creativity\nB. administrative burden\nC. subject knowledge\nD. classroom interaction\nAnswer: B\nHighlight: By reducing the administrative burden\nExplanation: The phrase in the passage completes the summary accurately.',
    rules: 'Convert completion into MCQ. The correct option must fit grammar and meaning.'
  },
  'gapped-text': {
    vi: 'Điền câu vào đoạn',
    exam: 'Cambridge B2/C1',
    stem: 'Which sentence best fits the gap?',
    sample: 'Which sentence best fits the gap after paragraph 2?\nA. This shows how AI can make learning more personal.\nB. Teachers should stop using digital tools.\nC. Schools were founded many centuries ago.\nD. Students rarely need feedback.\nAnswer: A\nHighlight: personalized learning experiences\nExplanation: Option A links back to the paragraph’s idea of personalization.',
    rules: 'The correct sentence must connect logically before and after the gap. Distractors must break cohesion.'
  },
  'notice-flyer': {
    vi: 'Thông báo / tờ rơi',
    exam: 'TN THPT 2025 / TOEIC',
    stem: 'What is the notice mainly about? / Who is the notice intended for?',
    sample: 'What is the purpose of the notice?\nA. To invite students to an AI workshop\nB. To announce a school holiday\nC. To introduce a new cafeteria menu\nD. To cancel all after-school clubs\nAnswer: A\nHighlight: Join our AI Learning Workshop this Friday\nExplanation: The notice invites students to attend the workshop.',
    rules: 'Use short authentic texts: notice, announcement, email, flyer, sign, message. Ask purpose, audience, detail, or action required.'
  },
  'info-gap': {
    vi: 'Điền khuyết thông tin',
    exam: 'TN THPT 2025 / IELTS / TOEIC',
    stem: 'Which option best fills the blank in the note/form/table?',
    sample: 'Complete the note. Workshop time: _____.\nA. 8:00 a.m.\nB. 10:30 a.m.\nC. 2:00 p.m.\nD. 5:30 p.m.\nAnswer: C\nHighlight: Time: 2:00 p.m. on Friday\nExplanation: The notice gives the exact time as 2:00 p.m.',
    rules: 'The blank must ask for concrete information such as time, place, fee, action, person, or purpose.'
  },
  'reorder-text': {
    vi: 'Sắp xếp hội thoại / thư / đoạn',
    exam: 'TN THPT 2025 / Cambridge',
    stem: 'Choose the correct order of the sentences to make a coherent paragraph/dialogue/email.',
    sample: 'Choose the correct order to make a coherent paragraph.\n(1) As a result, students receive tasks that match their level.\n(2) AI can analyze students’ strengths and weaknesses.\n(3) This makes learning more personalized.\nA. 2-1-3\nB. 1-2-3\nC. 3-2-1\nD. 2-3-1\nAnswer: A\nHighlight: analyze students’ strengths and weaknesses; receive tasks that match their level; learning more personalized\nExplanation: The ideas move from cause to result to conclusion.',
    rules: 'Use logical connectors and clear cohesion. Options must be plausible orders; only one is coherent.'
  }
};

function getTemplateForType(id) {
  return QUESTION_TYPE_TEMPLATES[id] || null;
}

function getTemplateBlock(typeIds = [], language = 'vi') {
  const list = typeIds.map((id) => ({ id, data: getTemplateForType(id) })).filter((item) => item.data);
  if (!list.length) return '';
  return list.map(({ id, data }, index) => `${index + 1}. TYPE ID: ${id}\nVietnamese name: ${data.vi}\nExam reference: ${data.exam}\nStandard stem pattern: ${data.stem}\nMODEL QUESTION TO IMITATE:\n${data.sample}\nQuality rule: ${data.rules}`).join('\n\n---\n\n');
}

const STRICT_READING_QUESTION_RULES = `STRICT QUALITY RULES FOR READING QUESTIONS:
1. Every selected question type must imitate its MODEL QUESTION pattern below.
2. Do not invent a vague stem. Use the standard stem style: "According to paragraph...", "The word ... is closest in meaning to...", "The word ... refers to...", "Which sentence best paraphrases...", etc.
3. For vocabulary, synonym, antonym, reference, and sentence equivalence, the target word/phrase/sentence MUST appear exactly in the passage and MUST be in quotation marks in the question.
4. Every question MUST include Highlight with exact wording copied from the passage.
5. Every question MUST include Explanation tied to the highlighted evidence.
6. Distractors must be plausible, same grammatical type, and not silly.
7. Avoid duplicate stems, duplicate answers, and answer-pattern bias.
8. The final output must remain parseable as MCQ: Question, A-D, Answer, Highlight, Explanation.`;

const WORD_COUNTS = [220, 300, 350, 450, 650, 800];

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function stripMarkdown(line = '') {
  return String(line).replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
}

function extractSection(text, starts, ends) {
  const raw = String(text || '').replace(/\r/g, '');
  const lines = raw.split('\n');
  const startIndex = lines.findIndex((line) => starts.some((s) => line.toLowerCase().includes(s)));
  if (startIndex < 0) return '';
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const lower = lines[i].toLowerCase();
    if (ends.some((e) => lower.includes(e))) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex + 1, endIndex).map(stripMarkdown).filter(Boolean).join('\n\n').trim();
}

function extractPassage(text) {
  const section = extractSection(text, ['## passage', '## đoạn văn', '## bài đọc', 'passage:'], ['## questions', '## câu hỏi', '## answer', '## đáp án', '## vocabulary']);
  if (section) return section;
  const raw = String(text || '');
  const beforeQuestions = raw.split(/\n\s*#{0,3}\s*(Questions|Câu hỏi|Reading Questions)/i)[0] || raw;
  return beforeQuestions.replace(/#\s*Reading Package.*$/gim, '').replace(/##\s*(Passage|Đoạn văn|Bài đọc)\s*/gi, '').trim();
}

function normalizeQuestions(questions, passage = '') {
  return (questions || []).map((q, i) => {
    const type = q.readingType || inferQuestionType(q.question || '');
    const highlightTerms = collectHighlightTerms(q, passage);
    return {
      ...q,
      id: q.id || `reading-q-${i}`,
      readingType: type,
      highlightTerms,
      answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : /^[A-D]$/i.test(q.answer || '') ? q.answer.toUpperCase().charCodeAt(0) - 65 : -1,
    };
  });
}

function cleanHighlightTerm(term = '') {
  return String(term)
    .replace(/^[-•*\s]+/, '')
    .replace(/^(?:P\d+|paragraph\s*\d+)[:.)-]\s*/i, '')
    .replace(/^(?:A|B|C|D)[.)]\s*/i, '')
    .replace(/^[\[({"'“”‘’]+|[\])}"'“”‘’.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeTerms(terms = []) {
  const seen = new Set();
  return terms
    .map(cleanHighlightTerm)
    .filter((term) => term.length >= 3 && term.length <= 160)
    .filter((term) => {
      const key = term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function splitHighlightTerms(value = '') {
  const raw = String(value || '').replace(/\([^)]*?paragraph[^)]*?\)/gi, ' ');
  const quoted = [...raw.matchAll(/["“”'‘’]([^"“”'‘’]{3,160})["“”'‘’]/g)].map((m) => m[1]);
  const plain = raw
    .replace(/^[^:]*:/, '')
    .split(/;|\||\n|,/g)
    .map(cleanHighlightTerm);
  return dedupeTerms([...quoted, ...plain]);
}

function inferQuestionType(question = '') {
  const q = String(question || '');
  const explicit = q.match(/\[\s*type\s*:\s*([^\]]+)\]/i);
  if (explicit) return cleanHighlightTerm(explicit[1]);
  const lower = q.toLowerCase();
  if (/synonym|closest in meaning|đồng nghĩa|gần nghĩa/.test(lower)) return /sentence|câu/.test(lower) ? 'Sentence synonym' : 'Synonym';
  if (/antonym|opposite|trái nghĩa/.test(lower)) return 'Antonym';
  if (/refer|reference|pronoun|đại từ|quy chiếu/.test(lower)) return 'Reference';
  if (/word|phrase|vocabulary|từ vựng/.test(lower)) return 'Vocabulary in context';
  return '';
}

function extractQuotedTerms(text = '') {
  return [...String(text || '').matchAll(/["“”'‘’]([^"“”'‘’]{3,160})["“”'‘’]/g)].map((m) => m[1]);
}

function termExistsInPassage(term, passage = '') {
  return String(passage || '').toLowerCase().includes(String(term || '').toLowerCase());
}

function collectHighlightTerms(question, passage = '') {
  const explicit = question.highlightTerms || question.highlights || question.highlight || '';
  const explicitTerms = Array.isArray(explicit) ? explicit : splitHighlightTerms(explicit);
  const quotedTerms = extractQuotedTerms(`${question.question || ''} ${question.explanation || ''}`);
  const candidates = dedupeTerms([...explicitTerms, ...quotedTerms]);
  const exact = candidates.filter((term) => termExistsInPassage(term, passage));
  return exact.length ? exact : candidates;
}

function parseReadingMcqFromText(text, meta = {}) {
  const base = parseMcqFromText(text, meta);
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const extras = {};
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const qMatch = line.match(/^(\d{1,3})[).]\s+(.+)/);
    if (qMatch && !/^\d{1,3}[).]\s*[A-D]\b/i.test(line)) {
      current = Number(qMatch[1]);
      const typeMatch = line.match(/\[\s*type\s*:\s*([^\]]+)\]/i);
      if (typeMatch) extras[current] = { ...(extras[current] || {}), readingType: cleanHighlightTerm(typeMatch[1]) };
      continue;
    }
    if (!current) continue;
    const highlightMatch = line.match(/^(?:highlight|target|evidence|text evidence|dẫn chứng|in đậm|đoạn cần tô)\s*[:\-–]\s*(.+)$/i);
    if (highlightMatch) {
      extras[current] = {
        ...(extras[current] || {}),
        highlightTerms: dedupeTerms([...(extras[current]?.highlightTerms || []), ...splitHighlightTerms(highlightMatch[1])]),
      };
      continue;
    }
    const typeMatch = line.match(/^(?:type|loại câu hỏi)\s*[:\-–]\s*(.+)$/i);
    if (typeMatch) extras[current] = { ...(extras[current] || {}), readingType: cleanHighlightTerm(typeMatch[1]) };
  }
  return base.map((q, index) => ({ ...q, ...(extras[index + 1] || {}) }));
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(textValue, terms = []) {
  const text = String(textValue || '');
  const cleanTerms = dedupeTerms(terms).filter((term) => termExistsInPassage(term, text));
  if (!cleanTerms.length) return text;
  const regex = new RegExp(`(${cleanTerms.sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    const isHit = cleanTerms.some((term) => part.toLowerCase() === term.toLowerCase());
    return isHit ? <mark className="reading-active-highlight" key={`${part}-${idx}`}><strong>{part}</strong></mark> : part;
  });
}

function makeReadingStandalone({ title, passage, questions, language }) {
  const safeTitle = title || 'Reading Practice';
  const data = JSON.stringify({ title: safeTitle, passage, questions, language }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${language === 'vi' ? 'vi' : 'en'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>
  :root{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#102145;background:#eef5fb}*{box-sizing:border-box}body{margin:0;overflow:hidden}.wrap{height:100dvh;display:flex;flex-direction:column;padding:12px;gap:10px}.top{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#fff;border-radius:0;padding:10px 12px;box-shadow:none;border:1px solid #b9d2e8}h1{font-size:22px;margin:0}.pill{border-radius:0;background:#0078d4;color:#fff;padding:10px 16px;font-weight:900;min-width:126px;text-align:center}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions button,.bottom button{border:0;border-radius:0;padding:10px 14px;background:#fff;color:#102145;font-weight:850;box-shadow:none;border:1px solid #b9d2e8;cursor:pointer}.actions button.primary,.bottom button.primary{background:#5b3df5;color:white}.exam{display:grid;grid-template-columns:minmax(360px,48%) minmax(420px,52%);gap:12px;flex:1;min-height:0}.passage,.questions{background:#fff;border-radius:0;box-shadow:none;border:1px solid #b9d2e8;overflow:auto}.passage{padding:26px 32px;font-size:18px;line-height:1.78}.questions{display:flex;flex-direction:column;min-height:0;padding:14px}.nav{display:flex;gap:6px;flex-wrap:wrap;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid #e6edf8}.nav button{width:34px;height:34px;border:1px solid #dce6f7;border-radius:0;background:#fff;font-weight:900;cursor:pointer}.nav button.active{background:#5b3df5;color:#fff}.nav button.done{border-color:#20b486}.qwrap{flex:1;min-height:0;overflow:auto}.question{border:1px solid #dbe7fb;border-radius:0;padding:20px;background:#fbfdff;min-height:100%}.question h2{font-size:20px;margin:0 0 14px}.option{display:grid;grid-template-columns:36px 1fr;gap:12px;align-items:center;width:100%;text-align:left;border:1px solid #dce6f7;border-radius:0;background:#fff;padding:14px;margin-top:10px;cursor:pointer}.option span{display:grid;place-items:center;width:32px;height:32px;border-radius:0;background:#f0edff;font-weight:900;color:#5b3df5}.option.chosen{border-color:#5b3df5;background:#f4f1ff}.option.ok{border-color:#20b486;background:#eafff7}.option.bad{border-color:#ff5f7a;background:#fff0f3}.bottom{display:flex;justify-content:space-between;gap:12px;align-items:center;padding-top:12px}.progress{flex:1;height:10px;background:#e9eef8;border-radius:0;overflow:hidden}.progress i{display:block;height:100%;background:#0078d4;width:0}.key{margin-top:14px;color:#465a7c}.reading-mark{background:#fff1a8;border-radius:0;padding:1px 4px;color:#102145}@media(max-width:900px){body{overflow:auto}.wrap{height:auto}.exam{grid-template-columns:1fr}.passage,.questions{max-height:none}.question{min-height:auto}}
</style>
</head>
<body>
<div class="wrap"><div class="top"><div><h1 id="title"></h1><small>${language === 'vi' ? 'Bố cục thi đọc hiểu trực tuyến' : 'Online reading test layout'}</small></div><div class="pill" id="score"></div><div class="actions"><button id="highlightBtn" onclick="showHighlight=!showHighlight;render()">${language === 'vi' ? 'Bật highlight' : 'Show highlight'}</button><button onclick="showKey=!showKey;render()">${language === 'vi' ? 'Đáp án' : 'Key'}</button><button onclick="answers={};showKey=false;focus=0;render()">${language === 'vi' ? 'Làm lại' : 'Reset'}</button></div></div><main class="exam"><section class="passage" id="passage"></section><section class="questions"><div class="nav" id="nav"></div><div class="qwrap" id="question"></div><div class="bottom"><button onclick="focus=Math.max(0,focus-1);render()">‹ ${language === 'vi' ? 'Trước' : 'Previous'}</button><div class="progress"><i id="bar"></i></div><button class="primary" onclick="focus=Math.min(DATA.questions.length-1,focus+1);render()">${language === 'vi' ? 'Tiếp' : 'Next'} ›</button></div></section></main></div>
<script>
const DATA=${data};let answers={};let showKey=false;let showHighlight=false;let focus=0;
function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function rx(s){return String(s||'').replace(new RegExp('[.*+?^\\$\\{\\}()|[\\]\\\\]','g'),'\\$&')}
function highlightHTML(text,terms){let html=esc(text);(terms||[]).filter(Boolean).sort((a,b)=>String(b).length-String(a).length).slice(0,8).forEach(t=>{const safe=esc(t);if(safe.length>2)html=html.replace(new RegExp('('+rx(safe)+')','gi'),'<mark class="reading-mark"><b>$1</b></mark>')});return html}
function optionClass(i,j,q){const chosen=answers[i]===j,ok=q.answerIndex===j,reveal=showKey||chosen;return (chosen?'chosen ':'')+(reveal&&ok?'ok ':'')+(chosen&&!ok?'bad ':'')}
function render(){const qs=DATA.questions||[];focus=Math.max(0,Math.min(focus,qs.length-1));const q=qs[focus]||{};document.getElementById('title').textContent=DATA.title;document.getElementById('passage').innerHTML=String(DATA.passage||'').split(/\n\n+/).map(p=>'<p>'+highlightHTML(p,showHighlight?(q.highlightTerms||[]):[])+'</p>').join('');document.getElementById('highlightBtn').textContent=showHighlight?'${language === 'vi' ? 'Tắt highlight' : 'Hide highlight'}':'${language === 'vi' ? 'Bật highlight' : 'Show highlight'}';const correct=Object.entries(answers).filter(([i,a])=>qs[+i]&&qs[+i].answerIndex===a).length;document.getElementById('score').textContent=correct+'/'+qs.length+' • '+Object.keys(answers).length+'/'+qs.length;document.getElementById('bar').style.width=(qs.length?((focus+1)/qs.length*100):0)+'%';document.getElementById('nav').innerHTML=qs.map((_,i)=>'<button class="'+(i===focus?'active ':'')+(answers[i]!==undefined?'done':'')+'" onclick="focus='+i+';render()">'+(i+1)+'</button>').join('');if(!qs[focus]){document.getElementById('question').innerHTML='<p>No questions.</p>';return;}document.getElementById('question').innerHTML='<article class="question"><small>${language === 'vi' ? 'Câu' : 'Question'} '+(focus+1)+' / '+qs.length+(q.readingType?' • '+esc(q.readingType):'')+'</small><h2>'+esc(q.question)+'</h2>'+(q.highlightTerms&&q.highlightTerms.length?(showHighlight?'<p class="key"><b>${language === 'vi' ? 'Đang tô' : 'Highlighting'}:</b> '+q.highlightTerms.map(esc).join('; ')+'</p>':'<p class="key muted"><button onclick="showHighlight=true;render()">${language === 'vi' ? 'Bật highlight khi cần xem dẫn chứng' : 'Show highlight if needed'}</button></p>'):'')+(q.options||[]).map((o,j)=>'<button class="option '+optionClass(focus,j,q)+'" onclick="answers['+focus+']='+j+';render()"><span>'+String.fromCharCode(65+j)+'</span><b>'+esc(o)+'</b></button>').join('')+((showKey||answers[focus]!==undefined)&&q.answerIndex>=0?'<p class="key"><b>${language === 'vi' ? 'Đáp án' : 'Answer'}:</b> '+String.fromCharCode(65+q.answerIndex)+'. '+esc((q.options||[])[q.answerIndex]||'')+(q.explanation?' — '+esc(q.explanation):'')+'</p>':'')+'</article>'}
render();
</script>
</body>
</html>`;
}

const READING_ACTIVITY_TEMPLATES = [
  {
    id: 'quiz',
    icon: '✅',
    titleVi: 'Reading Quiz',
    title: 'Reading Quiz',
    descVi: 'Biến câu hỏi đọc hiểu thành bài làm trực tiếp có chấm điểm.',
    desc: 'Turn reading MCQs into an auto-scored activity.',
  },
  {
    id: 'pairs',
    icon: '🔎',
    titleVi: 'Evidence Match',
    title: 'Evidence Match',
    descVi: 'Nối câu hỏi với dẫn chứng trong bài đọc.',
    desc: 'Match questions with text evidence.',
  },
  {
    id: 'match',
    icon: '🔗',
    titleVi: 'Vocabulary Match',
    title: 'Vocabulary Match',
    descVi: 'Nối từ vựng với nghĩa/giải thích.',
    desc: 'Match vocabulary with definitions.',
  },
  {
    id: 'box',
    icon: '🎁',
    titleVi: 'Open the Box',
    title: 'Open the Box',
    descVi: 'Mở hộp để hiện nhiệm vụ đọc hiểu.',
    desc: 'Open boxes to reveal reading tasks.',
  },
  {
    id: 'cards',
    icon: '💬',
    titleVi: 'Discussion Cards',
    title: 'Discussion Cards',
    descVi: 'Tạo thẻ thảo luận sau đọc.',
    desc: 'Create post-reading discussion cards.',
  },
  {
    id: 'sort',
    icon: '02',
    titleVi: 'Question Type Sort',
    title: 'Question Type Sort',
    descVi: 'Phân loại câu hỏi theo dạng đọc hiểu.',
    desc: 'Sort questions by reading type.',
  },
  {
    id: 'unjumble',
    icon: '🔀',
    titleVi: 'Sentence Builder',
    title: 'Sentence Builder',
    descVi: 'Xáo trộn câu trong bài đọc để học sinh sắp xếp.',
    desc: 'Unjumble sentences taken from the passage.',
  },
  {
    id: 'wordsearch',
    icon: '🔎',
    titleVi: 'Word Search',
    title: 'Word Search',
    descVi: 'Tạo bảng tìm từ từ ghi chú từ vựng.',
    desc: 'Create a wordsearch from vocabulary notes.',
  },
];

function cleanActivityCell(value = '') {
  return String(value || '')
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortCell(value = '', limit = 120) {
  const clean = cleanActivityCell(value);
  return clean.length > limit ? `${clean.slice(0, limit).trim()}...` : clean;
}

function answerLetter(question) {
  const index = typeof question?.answerIndex === 'number' && question.answerIndex >= 0 ? question.answerIndex : 0;
  return String.fromCharCode(65 + Math.min(index, 3));
}

function questionToActivityLine(question, index) {
  const options = [...(question.options || [])].slice(0, 4);
  while (options.length < 4) options.push(languageFallbackOption(options.length));
  return [
    `${index + 1}. ${cleanActivityCell(question.question)}`,
    ...options.map(cleanActivityCell),
    answerLetter(question),
    cleanActivityCell(question.explanation || ''),
  ].join(' | ');
}

function languageFallbackOption(index) {
  return ['Need more context', 'Not Given', 'None of the above', 'All of the above'][index] || 'Need context';
}

function extractVocabularySection(output = '') {
  const raw = String(output || '').replace(/\r/g, '');
  const match = raw.match(/(?:^|\n)\s*#{0,3}\s*(Vocabulary Notes|Từ vựng|Vocabulary)\s*\n([\s\S]*?)(?=\n\s*#{1,3}\s*(Summary Task|Answer Key|Đáp án|Questions|Câu hỏi)|$)/i);
  return match ? match[2].trim() : '';
}

function extractVocabularyEntries(output = '', passage = '') {
  const section = extractVocabularySection(output);
  const lines = section.split('\n').map((line) => line.replace(/\*\*/g, '').trim()).filter(Boolean);
  const entries = [];
  lines.forEach((line) => {
    const clean = line.replace(/^[-•*\s]*\d{0,2}[).]?\s*/, '').replace(/^[-•*]\s*/, '').trim();
    if (!clean || /^example\s*:/i.test(clean)) return;
    const m = clean.match(/^([A-Za-z][A-Za-z\s'-]{1,38})(?:\s*\([^)]*\))?\s*(?:[-–—:]|=)\s*(.+)$/);
    if (m) {
      const word = cleanActivityCell(m[1]).replace(/\s+/g, ' ').trim();
      const clue = cleanActivityCell(m[2].replace(/\s*[-–—]?\s*Example\s*:.*$/i, ''));
      if (word.length > 1 && clue.length > 2) entries.push({ word, clue });
    }
  });
  if (entries.length) return dedupeVocabEntries(entries).slice(0, 14);

  const words = String(passage || '')
    .replace(/[^A-Za-z\s'-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^[-']+|[-']+$/g, '').trim())
    .filter((word) => word.length >= 6 && !/^(however|therefore|because|people|should|would|could|about|which|their|there|these|those|students|teachers)$/i.test(word));
  const seen = new Set();
  return words.filter((word) => {
    const key = word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12).map((word) => ({ word, clue: 'Find this word in the reading passage and explain its meaning in context.' }));
}

function dedupeVocabEntries(entries = []) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = entry.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getPassageSentences(passage = '') {
  return String(passage || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 45 && s.length <= 190)
    .slice(0, 10);
}

function getEvidenceTerms(question, passage) {
  const normalized = normalizeQuestions([question], passage)[0] || question;
  const terms = normalized.highlightTerms || [];
  if (terms.length) return terms.join(' / ');
  return normalized.explanation || normalized.options?.[normalized.answerIndex] || 'Find the best evidence in the passage.';
}

function makeReadingActivityContent(templateId, { questions = [], passage = '', output = '', language = 'vi' }) {
  const normalizedQuestions = normalizeQuestions(questions, passage).filter((q) => q.question);
  const vocab = extractVocabularyEntries(output, passage);
  const sentences = getPassageSentences(passage);
  if (templateId === 'quiz') {
    if (!normalizedQuestions.length) return '';
    return normalizedQuestions.map(questionToActivityLine).join('\n');
  }
  if (templateId === 'pairs') {
    const pairs = normalizedQuestions.map((question, index) => `${shortCell(`${index + 1}. ${question.question}`, 105)} | ${shortCell(getEvidenceTerms(question, passage), 140)}`);
    return pairs.length ? pairs.join('\n') : vocab.map((entry) => `${entry.word} | ${entry.clue}`).join('\n');
  }
  if (templateId === 'match') {
    return vocab.map((entry) => `${entry.word} | ${entry.clue}`).join('\n');
  }
  if (templateId === 'wordsearch') {
    return vocab.map((entry) => `${entry.word.replace(/\s+/g, '').toUpperCase()} | ${entry.clue}`).join('\n');
  }
  if (templateId === 'cards') {
    const baseCards = [
      language === 'vi' ? 'Tóm tắt bài đọc trong 3 câu bằng tiếng Anh.' : 'Summarize the passage in three English sentences.',
      language === 'vi' ? 'Nêu ý chính của bài đọc và một dẫn chứng hỗ trợ.' : 'State the main idea and one supporting detail.',
      language === 'vi' ? 'Chọn 3 từ vựng quan trọng nhất và đặt câu mới.' : 'Choose three key words and make new sentences.',
      language === 'vi' ? 'Bạn đồng ý hay không đồng ý với ý chính của bài? Giải thích.' : 'Do you agree with the main idea? Explain.',
    ];
    const questionCards = normalizedQuestions.slice(0, 8).map((q, index) => `${language === 'vi' ? 'Giải thích vì sao câu' : 'Explain why question'} ${index + 1} ${language === 'vi' ? 'có đáp án đúng là' : 'has the correct answer'} ${answerLetter(q)}.`);
    return [...baseCards, ...questionCards].join('\n');
  }
  if (templateId === 'box') {
    const tasks = normalizedQuestions.slice(0, 10).map((q, index) => `${(index + 1) * 10} | ${language === 'vi' ? 'Tìm dẫn chứng cho câu' : 'Find evidence for question'} ${index + 1}: ${shortCell(q.question, 120)}`);
    return tasks.length ? tasks.join('\n') : [
      `10 | ${language === 'vi' ? 'Tìm ý chính của bài đọc.' : 'Find the main idea of the passage.'}`,
      `20 | ${language === 'vi' ? 'Tìm 3 từ vựng học thuật trong bài.' : 'Find three academic words in the passage.'}`,
      `30 | ${language === 'vi' ? 'Tóm tắt đoạn 1 trong một câu.' : 'Summarize paragraph 1 in one sentence.'}`,
    ].join('\n');
  }
  if (templateId === 'sort') {
    const groups = normalizedQuestions.reduce((acc, question, index) => {
      const type = cleanActivityCell(question.readingType || inferQuestionType(question.question) || 'General comprehension');
      if (!acc[type]) acc[type] = [];
      acc[type].push(`Q${index + 1}`);
      return acc;
    }, {});
    const lines = Object.entries(groups).map(([group, items]) => `${group} | ${items.join(', ')}`);
    return lines.length ? lines.join('\n') : 'Main idea | Q1, Q2\nDetail | Q3, Q4\nVocabulary | Q5, Q6';
  }
  if (templateId === 'unjumble') {
    return sentences.length ? sentences.join('\n') : (passage ? String(passage).split('\n').filter(Boolean).slice(0, 6).join('\n') : 'This reading passage helps students improve comprehension skills.');
  }
  return '';
}

function ReadingActivityMaker({ title, passage, questions, output, language, showToast }) {
  const [templateId, setTemplateId] = useState('quiz');
  const [activityContent, setActivityContent] = useState('');
  const [activityError, setActivityError] = useState('');
  const [activityReady, setActivityReady] = useState(null);
  const activeTemplate = READING_ACTIVITY_TEMPLATES.find((item) => item.id === templateId) || READING_ACTIVITY_TEMPLATES[0];
  const hasSource = Boolean(output || passage || questions?.length);

  useEffect(() => {
    if (!hasSource) return;
    setActivityContent(makeReadingActivityContent(templateId, { questions, passage, output, language }));
    setActivityReady(null);
    setActivityError('');
  }, [templateId, output, passage, questions, language, hasSource]);

  const buildActivity = () => {
    setActivityError('');
    if (!activityContent.trim()) {
      setActivityError(language === 'vi' ? 'Chưa có dữ liệu để tạo hoạt động. Hãy tạo Reading Package trước hoặc chọn hoạt động khác.' : 'No data available for this activity. Generate a Reading Package first or choose another activity.');
      return null;
    }
    const parsed = parseActivity(templateId, activityContent);
    if (!parsed.ok) {
      setActivityError(parsed.error || (language === 'vi' ? 'Không tạo được hoạt động.' : 'Could not create activity.'));
      return null;
    }
    const next = {
      title: `${title || 'Reading Studio'} · ${language === 'vi' ? activeTemplate.titleVi : activeTemplate.title}`,
      templateId,
      activity: parsed.data,
    };
    setActivityReady(next);
    showToast?.(language === 'vi' ? 'Đã tạo hoạt động tương tác trực tiếp.' : 'Interactive activity created.');
    return next;
  };

  const getReadyActivity = () => activityReady || buildActivity();

  const openActivity = () => {
    const ready = getReadyActivity();
    if (!ready) return;
    const html = buildStandaloneHtml(ready);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const downloadActivity = () => {
    const ready = getReadyActivity();
    if (!ready) return;
    const html = buildStandaloneHtml(ready);
    downloadFile(`${activitySlugify(ready.title)}.html`, html, 'text/html;charset=utf-8');
  };

  const copyTeacherText = async () => {
    const ready = getReadyActivity();
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(buildTeacherText(ready.title, ready.templateId, ready.activity));
      showToast?.(language === 'vi' ? 'Đã copy nội dung hoạt động.' : 'Activity text copied.');
    } catch {
      showToast?.(language === 'vi' ? 'Không copy được.' : 'Copy failed.');
    }
  };

  const activityStats = (() => {
    if (!activityReady?.activity) return '';
    const data = activityReady.activity;
    if (data.questions) return `${data.questions.length} ${language === 'vi' ? 'câu hỏi' : 'questions'}`;
    if (data.pairs) return `${data.pairs.length} ${language === 'vi' ? 'cặp' : 'pairs'}`;
    if (data.prompts) return `${data.prompts.length} ${language === 'vi' ? 'thẻ' : 'cards'}`;
    if (data.boxes) return `${data.boxes.length} ${language === 'vi' ? 'hộp' : 'boxes'}`;
    if (data.items) return `${data.items.length} ${language === 'vi' ? 'mục' : 'items'}`;
    if (data.sentences) return `${data.sentences.length} ${language === 'vi' ? 'câu' : 'sentences'}`;
    if (data.entries) return `${data.entries.length} ${language === 'vi' ? 'từ' : 'words'}`;
    return language === 'vi' ? 'Đã sẵn sàng' : 'Ready';
  })();

  return (
    <section className="panel reading-activity-maker reading-direct-activity-v20">
      <div className="preview-head reading-activity-head">
        <div>
          <span className="eyebrow">3. {language === 'vi' ? 'Hoạt động tương tác' : 'Interactive activity'}</span>
          <h2>{language === 'vi' ? 'Tạo hoạt động trực tiếp từ bài đọc' : 'Create an activity directly from the reading'}</h2>
          <p>{language === 'vi' ? 'Không cần rời Reading Studio. Chọn dạng hoạt động, hệ thống tự lấy bài đọc, câu hỏi, từ vựng và dẫn chứng để tạo game HTML.' : 'No need to leave Reading Studio. Choose an activity type and the system turns the passage, questions, vocabulary and evidence into an HTML game.'}</p>
        </div>
        <div className="reading-activity-actions preview-actions wrap-actions">
          <button onClick={buildActivity} disabled={!hasSource}>{language === 'vi' ? '⚡ Tạo hoạt động' : '⚡ Build activity'}</button>
          <button onClick={openActivity} disabled={!hasSource}>{language === 'vi' ? 'Mở chơi trực tiếp' : 'Play live'}</button>
          <button className="primary" onClick={downloadActivity} disabled={!hasSource}>HTML</button>
          <button onClick={copyTeacherText} disabled={!hasSource}>{language === 'vi' ? 'Copy nội dung' : 'Copy text'}</button>
        </div>
      </div>

      <div className="reading-activity-workspace">
        <div className="reading-activity-template-panel">
          <label>{language === 'vi' ? 'Chọn dạng hoạt động' : 'Activity type'}</label>
          <div className="reading-activity-template-grid">
            {READING_ACTIVITY_TEMPLATES.map((item) => (
              <button key={item.id} className={templateId === item.id ? 'active' : ''} onClick={() => setTemplateId(item.id)}>
                <span>{item.icon}</span>
                <strong>{language === 'vi' ? item.titleVi : item.title}</strong>
                <small>{language === 'vi' ? item.descVi : item.desc}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="reading-activity-content-panel">
          <div className="reading-activity-content-head">
            <div>
              <label>{language === 'vi' ? 'Dữ liệu hoạt động có thể chỉnh' : 'Editable activity data'}</label>
              <p>{language === 'vi' ? 'Có thể sửa nhanh trước khi mở chơi hoặc tải HTML.' : 'You can edit this before playing live or exporting HTML.'}</p>
            </div>
            <span>{activityReady ? `✓ ${activityStats}` : (language === 'vi' ? 'Chưa tạo' : 'Not built')}</span>
          </div>
          <textarea
            value={activityContent}
            onChange={(e) => { setActivityContent(e.target.value); setActivityReady(null); }}
            rows={10}
            placeholder={language === 'vi' ? 'Sau khi tạo Reading Package, dữ liệu hoạt động sẽ tự hiện ở đây...' : 'After generating a Reading Package, activity data will appear here...'}
          />
          <div className="reading-activity-hint">
            <strong>{language === 'vi' ? 'Cơ chế:' : 'How it works:'}</strong>{' '}
            {templateId === 'quiz' && (language === 'vi' ? 'Dùng câu hỏi MCQ đã tạo để làm bài chấm điểm.' : 'Uses the generated MCQs as an auto-scored quiz.')}
            {templateId === 'pairs' && (language === 'vi' ? 'Nối câu hỏi với dẫn chứng/highlight trong bài.' : 'Matches questions with evidence/highlights in the passage.')}
            {templateId === 'match' && (language === 'vi' ? 'Dùng Vocabulary Notes để nối từ với nghĩa.' : 'Uses Vocabulary Notes for term-definition matching.')}
            {templateId === 'box' && (language === 'vi' ? 'Tạo hộp nhiệm vụ đọc hiểu từ từng câu hỏi.' : 'Creates reading challenge boxes from each question.')}
            {templateId === 'cards' && (language === 'vi' ? 'Tạo thẻ thảo luận sau đọc.' : 'Creates post-reading discussion cards.')}
            {templateId === 'sort' && (language === 'vi' ? 'Cho học sinh phân loại Q1, Q2... theo dạng câu hỏi.' : 'Lets students sort Q1, Q2... by question type.')}
            {templateId === 'unjumble' && (language === 'vi' ? 'Lấy câu trong bài đọc để xáo trộn và sắp xếp lại.' : 'Uses passage sentences for unjumble practice.')}
            {templateId === 'wordsearch' && (language === 'vi' ? 'Lấy từ trong Vocabulary Notes để tạo bảng tìm từ.' : 'Uses Vocabulary Notes to create a wordsearch.')}
          </div>
          {activityError && <p className="error-box">⚠️ {activityError}</p>}
        </div>
      </div>
    </section>
  );
}


function ReadingLiveInteraction({ title, passage, questions, language }) {
  const [answers, setAnswers] = useState({});
  const [showReview, setShowReview] = useState(false);
  const [focusQuestion, setFocusQuestion] = useState(0);
  const [viewMode, setViewMode] = useState('focus');
  const [readingFont, setReadingFont] = useState(18);
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const normalized = useMemo(() => normalizeQuestions(questions, passage), [questions, passage]);
  const currentIndex = Math.min(Math.max(focusQuestion, 0), Math.max(normalized.length - 1, 0));
  const correct = Object.entries(answers).filter(([index, answerIndex]) => normalized[Number(index)]?.answerIndex === answerIndex).length;
  const answered = Object.keys(answers).length;
  const safePassage = passage || (language === 'vi' ? 'Chưa nhận diện được bài đọc. Hãy tạo lại bằng AI hoặc chỉnh prompt để có mục ## Passage.' : 'No passage detected. Regenerate or ask AI to include a ## Passage section.');
  const currentQuestion = normalized[currentIndex];
  const activeHighlightTerms = highlightEnabled ? (currentQuestion?.highlightTerms || []) : [];

  const downloadOffline = () => {
    const html = makeReadingStandalone({ title, passage: safePassage, questions: normalized, language });
    downloadFile(`${librarySlugify(title || 'reading-live')}.html`, html, 'text/html;charset=utf-8');
  };

  const openStandalone = () => {
    const html = makeReadingStandalone({ title, passage: safePassage, questions: normalized, language });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const fullscreen = async () => {
    const el = document.querySelector('.reading-live-shell');
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (el.requestFullscreen) await el.requestFullscreen();
  };

  const chooseAnswer = (index, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [index]: optionIndex }));
    setFocusQuestion(index);
  };

  const goTo = (index) => {
    setFocusQuestion(Math.min(Math.max(index, 0), normalized.length - 1));
  };

  const renderQuestionCard = (question, index, compact = false) => {
    if (!question) return null;
    const chosen = answers[index];
    return (
      <article className={`reading-question-card ${compact ? 'focus-card' : ''} ${focusQuestion === index ? 'focused' : ''}`} key={question.id} onMouseEnter={() => setFocusQuestion(index)}>
        <div className="question-topline">
          <span>{language === 'vi' ? 'Câu' : 'Question'} {index + 1} / {normalized.length}{question.readingType ? ` · ${question.readingType}` : ''}</span>
          {chosen !== undefined && <strong className={chosen === question.answerIndex ? 'good-text' : 'bad-text'}>{chosen === question.answerIndex ? '✓' : '×'}</strong>}
        </div>
        <h3>{question.question}</h3>
        {question.highlightTerms?.length ? (highlightEnabled ? <div className="question-highlight-tags"><span>{language === 'vi' ? 'Đang tô' : 'Highlight'}</span>{question.highlightTerms.map((term) => <button key={term} onClick={() => setFocusQuestion(index)}>{term}</button>)}</div> : <div className="question-highlight-tags muted"><span>{language === 'vi' ? 'Có gợi ý highlight' : 'Highlight available'}</span><button onClick={() => { setFocusQuestion(index); setHighlightEnabled(true); }}>{language === 'vi' ? 'Bật khi cần' : 'Show if needed'}</button></div>) : null}
        <div className="reading-options">
          {(question.options || []).map((option, optionIndex) => {
            const isChosen = chosen === optionIndex;
            const isCorrect = question.answerIndex === optionIndex;
            const reveal = showReview || isChosen;
            return (
              <button
                key={`${option}-${optionIndex}`}
                className={`reading-option ${isChosen ? 'chosen' : ''} ${reveal && isCorrect ? 'ok' : ''} ${isChosen && !isCorrect ? 'bad' : ''}`}
                onClick={() => chooseAnswer(index, optionIndex)}
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span>
                <b>{option}</b>
              </button>
            );
          })}
        </div>
        {(showReview || chosen !== undefined) && question.answerIndex >= 0 && (
          <p className="feedback-line">
            {language === 'vi' ? 'Đáp án' : 'Answer'}: {String.fromCharCode(65 + question.answerIndex)}. {question.options?.[question.answerIndex] || ''}
            {question.explanation ? ` — ${question.explanation}` : ''}
          </p>
        )}
      </article>
    );
  };

  if (!normalized.length) {
    return (
      <div className="empty-state">
        <p>{language === 'vi' ? 'Chưa nhận diện được câu hỏi trắc nghiệm để chơi trực tiếp.' : 'No interactive MCQs detected yet.'}</p>
      </div>
    );
  }

  return (
    <section className={`reading-live-shell reading-v36-live reading-${viewMode}`}>
      <div className="reading-live-toolbar metro-panel compact-toolbar">
        <div className="reading-toolbar-title">
          <span className="eyebrow">3. Live Interaction</span>
          <h2>{language === 'vi' ? 'Thi đọc hiểu trực tuyến' : 'Online reading test'}</h2>
        </div>
        <div className="reading-toolbar-actions">
          <div className="reading-score-pill compact-score">
            <strong>{correct}/{normalized.length}</strong>
            <span>{language === 'vi' ? 'đúng' : 'correct'} · {answered}/{normalized.length}</span>
          </div>
          <div className="preview-actions wrap-actions reading-actions-v24">
            <button onClick={() => setViewMode(viewMode === 'focus' ? 'all' : 'focus')}>{viewMode === 'focus' ? (language === 'vi' ? 'Xem tất cả' : 'All') : (language === 'vi' ? 'Một câu' : 'One-by-one')}</button>
            <button onClick={() => setReadingFont((v) => Math.max(15, v - 1))}>A−</button>
            <button onClick={() => setReadingFont((v) => Math.min(23, v + 1))}>A+</button>
            <button className={highlightEnabled ? 'active' : ''} onClick={() => setHighlightEnabled((v) => !v)}>{highlightEnabled ? (language === 'vi' ? 'Tắt highlight' : 'Hide highlight') : (language === 'vi' ? 'Bật highlight' : 'Show highlight')}</button>
            <button onClick={() => setShowReview((v) => !v)}>{showReview ? (language === 'vi' ? 'Ẩn đáp án' : 'Hide key') : (language === 'vi' ? 'Đáp án' : 'Key')}</button>
            <button onClick={() => { setAnswers({}); setShowReview(false); setFocusQuestion(0); }}>{language === 'vi' ? 'Làm lại' : 'Reset'}</button>
            <button onClick={fullscreen}>{language === 'vi' ? 'Toàn màn hình' : 'Fullscreen'}</button>
            <button onClick={openStandalone}>{language === 'vi' ? 'Mở riêng' : 'Open'}</button>
            <button className="primary" onClick={downloadOffline}>HTML</button>
          </div>
        </div>
      </div>

      <div className="reading-exam-layout reading-exam-layout-v24">
        <article className="reading-passage-panel metro-panel" style={{ '--reading-font': `${readingFont}px` }}>
          <div className="reading-panel-head">
            <span>{language === 'vi' ? 'Bài đọc' : 'Passage'}</span>
            <strong>{title}</strong>
          </div>
          <div className="reading-highlight-hint">
            <span>{highlightEnabled ? (language === 'vi' ? 'Đang tô dẫn chứng theo câu hỏi' : 'Evidence highlight is on') : (language === 'vi' ? 'Highlight đang tắt để tránh gợi ý đáp án' : 'Highlight is off to avoid giving hints')}</span>
            {highlightEnabled ? (activeHighlightTerms.length ? <strong>{activeHighlightTerms.join(' · ')}</strong> : <em>{language === 'vi' ? 'Câu này chưa có cụm cần tô.' : 'No target phrase detected for this question.'}</em>) : <button className="inline-highlight-toggle" onClick={() => setHighlightEnabled(true)}>{language === 'vi' ? 'Bật highlight khi cần xem dẫn chứng' : 'Turn on highlight when you need evidence'}</button>}
          </div>
          <div className="reading-passage-content">
            {safePassage.split(/\n\n+/).map((para, idx) => <p key={idx}>{renderHighlightedText(para, activeHighlightTerms)}</p>)}
          </div>
        </article>

        <aside className="reading-questions-panel metro-panel">
          <div className="reading-question-nav reading-question-nav-v24">
            {normalized.map((_, i) => (
              <button key={i} className={`${currentIndex === i ? 'active' : ''} ${answers[i] !== undefined ? 'done' : ''}`} onClick={() => goTo(i)}>{i + 1}</button>
            ))}
          </div>
          <div className="reading-question-list reading-question-list-v24">
            {viewMode === 'focus'
              ? renderQuestionCard(normalized[currentIndex], currentIndex, true)
              : normalized.map((question, index) => renderQuestionCard(question, index))}
          </div>
          {viewMode === 'focus' && (
            <div className="reading-bottom-nav">
              <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>‹ {language === 'vi' ? 'Trước' : 'Previous'}</button>
              <div className="reading-progress-track"><i style={{ width: `${((currentIndex + 1) / normalized.length) * 100}%` }} /></div>
              <button className="primary" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === normalized.length - 1}>{language === 'vi' ? 'Tiếp' : 'Next'} ›</button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}


export default function ReadingStudio({ tool, language, apiKey, aiModel, hasApiKey }) {
  const [instruction, setInstruction] = useState('Create a 350-word B2 reading passage about AI in education with 8 MCQs, vocabulary notes and a short summary task');
  const [sourceText, setSourceText] = useState('');
  const [level, setLevel] = useState('B2-C1');
  const [itemCount, setItemCount] = useState(8);
  const [wordCount, setWordCount] = useState(350);
  const [examProfile, setExamProfile] = useState('thpt-2025');
  const [questionTypes, setQuestionTypes] = useState(EXAM_PROFILES[0].defaults);
  const [showTemplateGuide, setShowTemplateGuide] = useState(true);
  const [includeVocab, setIncludeVocab] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [activeWorkflow, setActiveWorkflow] = useState('design');
  const controlRef = useRef(null);
  const outputRef = useRef(null);
  const questionRef = useRef(null);

  const toolTitle = language === 'vi' ? tool.titleVi || tool.title : tool.title;
  const toolDesc = language === 'vi' ? tool.descVi || tool.desc : tool.desc;
  const profile = EXAM_PROFILES.find((item) => item.id === examProfile) || EXAM_PROFILES[0];
  const selectedTypeLabels = QUESTION_TYPES.filter((t) => questionTypes.includes(t.id)).map((t) => language === 'vi' ? t.labelVi : t.label);
  const questions = useMemo(() => parseReadingMcqFromText(output, { source: toolTitle, level, topic: instruction.slice(0, 70) }), [output, toolTitle, level, instruction]);
  const passage = useMemo(() => extractPassage(output), [output]);

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const workflowCards = [
    {
      id: 'design',
      icon: '01',
      badge: language === 'vi' ? 'Khởi tạo' : 'Kick-off',
      title: language === 'vi' ? 'Thiết kế bài đọc' : 'Design passage',
      desc: language === 'vi' ? 'Chọn mẫu đề và cấu trúc bài đọc.' : 'Choose the exam profile and reading structure.',
      cta: language === 'vi' ? 'Thiết kế' : 'Design',
      tone: 'sky',
      action: () => {
        setActiveWorkflow('design');
        scrollToRef(controlRef);
      },
    },
    {
      id: 'question',
      icon: '02',
      badge: language === 'vi' ? 'Tương tác' : 'Interactive',
      title: language === 'vi' ? 'Chọn dạng câu hỏi' : 'Select question types',
      desc: language === 'vi' ? 'Bật các dạng câu hỏi và mẫu chuẩn.' : 'Toggle reading question types and models.',
      cta: language === 'vi' ? 'Chọn dạng' : 'Choose',
      tone: 'lilac',
      action: () => {
        setActiveWorkflow('question');
        scrollToRef(questionRef);
      },
    },
    {
      id: 'output',
      icon: '03',
      badge: language === 'vi' ? 'Kết quả AI' : 'AI output',
      title: language === 'vi' ? 'Reading package' : 'Reading package',
      desc: language === 'vi' ? 'Xem, sao chép và xuất bộ bài đọc.' : 'Review, copy, and export the reading pack.',
      cta: language === 'vi' ? 'Xem output' : 'View output',
      tone: 'peach',
      action: () => {
        setActiveWorkflow('output');
        scrollToRef(outputRef);
      },
    },
  ];

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2400);
  };

  const setProfile = (id) => {
    const next = EXAM_PROFILES.find((item) => item.id === id) || EXAM_PROFILES[0];
    setExamProfile(id);
    setQuestionTypes(next.defaults);
    if (id === 'thpt-2025') {
      setLevel('THPT');
      setItemCount(10);
      setWordCount(350);
    }
  };

  const toggleType = (id) => {
    setQuestionTypes((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const generate = async () => {
    setError('');
    if (!hasApiKey) {
      setError(language === 'vi' ? 'Chưa có AI provider. Vào Cài đặt để nhập API key.' : 'Missing AI provider. Add an API key in Settings.');
      return;
    }
    if (!instruction.trim() && !sourceText.trim()) {
      setError(language === 'vi' ? 'Nhập yêu cầu hoặc bài đọc nguồn trước.' : 'Enter an instruction or source passage first.');
      return;
    }
    setLoading(true);
    try {
      const systemInstruction = 'You are an expert English reading-test designer. Create valid, classroom-ready reading materials. Avoid duplicate questions. Keep every answer verifiable from the passage. Use clear section headings exactly as requested.';
      const selectedTemplateBlock = getTemplateBlock(questionTypes, language);
      const prompt = `Create a Brian English Studio Reading Package.\n\nLanguage of teacher support: ${language === 'vi' ? 'Vietnamese' : 'English'}\nLearner level: ${level}\nExam profile: ${profile.label} - ${profile.desc}\nPassage length: about ${wordCount} words unless source text is provided.\nNumber of interactive questions: ${itemCount}\nSelected reading question types: ${selectedTypeLabels.join('; ') || 'mixed reading comprehension'}\nTeacher request: ${instruction || '(none)'}\nSource passage / notes / vocabulary:\n${sourceText || '(none)'}\n\n${STRICT_READING_QUESTION_RULES}\n\nSTANDARD QUESTION MODELS YOU MUST IMITATE:\n${selectedTemplateBlock || 'Use standard reading comprehension MCQ patterns.'}\n\nIMPORTANT OUTPUT FORMAT:\n# Reading Package\n## Passage\nWrite the reading passage here. If source text is provided, improve or adapt it only if requested.\n\n## Questions\nCreate ${itemCount} interactive questions. All selected question types must be converted into clear multiple-choice format so the live online test can work. Use this exact format for every question:\n1. Question text [Type: question type]\nA. option\nB. option\nC. option\nD. option if needed\nAnswer: A/B/C/D\nHighlight: exact word, phrase, sentence, or evidence from the passage that should be bold/highlighted while the learner is answering. Use the EXACT wording from the passage.\nExplanation: one short explanation tied to the passage\n\nHighlight rules:\n- For reference/pronoun questions, Highlight must be the pronoun/reference word and, if helpful, the antecedent phrase.\n- For synonym, antonym, vocabulary-in-context, and sentence-equivalence questions, put the target word/phrase/sentence in quotation marks in the question and repeat the exact target in Highlight.\n- For detail/inference/main-idea questions, Highlight should be the most relevant evidence sentence or phrase.\n\nFor True/False/Not Given, use A. True B. False C. Not Given.\nFor matching or ordering tasks, convert each item into an MCQ with options.\n\n${includeVocab ? '## Vocabulary Notes\nList 6-10 useful words/phrases with meaning and example.\n' : ''}${includeSummary ? '## Summary Task\nCreate one short summary or post-reading task.\n' : ''}\n## Answer Key\nList answers only, e.g. 1A 2C 3B.`;
      const result = await callAI({ apiKey, model: aiModel, prompt, systemInstruction, temperature: 0.55 });
      setOutput(result);
      addHistoryEntry({
        kind: 'reading-output',
        toolSlug: 'reading-studio',
        toolTitle,
        title: instruction.slice(0, 90) || toolTitle,
        content: result,
        level,
        itemCount,
        tags: ['reading-studio', examProfile, level, ...questionTypes],
        model: aiModel,
        sourceApp: 'reading-studio',
        sourceAppTitle: toolTitle,
        templateId: 'quiz',
        activityData: {
          type: 'quiz',
          templateId: 'quiz',
          sourceApp: 'reading-studio',
          questions: parseMcqFromText(result, { source: toolTitle, level, topic: instruction.slice(0, 70) }),
        },
      });
      showToast(language === 'vi' ? 'Đã tạo Reading Package và lưu vào thư viện.' : 'Reading package generated and saved.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      showToast(language === 'vi' ? 'Đã copy.' : 'Copied.');
    } catch {
      showToast(language === 'vi' ? 'Không copy được.' : 'Copy failed.');
    }
  };

  const addToBank = () => {
    const added = addQuestionsFromTextToBank(output, { source: toolTitle, level, topic: instruction.slice(0, 70) });
    showToast(language === 'vi' ? `Đã thêm ${added.length} câu vào ngân hàng.` : `Added ${added.length} questions to bank.`);
  };

  return (
    <div className="page tool-page reading-studio-page reading-v28-page">
      <button className="back-btn reading-v28-back" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>

      <section className="tool-hero panel ai-hero reading-hero-v36">
        <div className="reading-v36-main">
          <div className="reading-v36-hero-art" aria-hidden="true">
            <div className="reading-v36-orbit orbit-a" />
            <div className="reading-v36-orbit orbit-b" />
            <div className="reading-v36-spark spark-a" />
            <div className="reading-v36-spark spark-b" />
            <div className="reading-v36-platform" />

            <div className="reading-v36-sheet reading-v36-sheet-back">
              <div className="reading-v36-sheet-icon">A</div>
              <i />
              <i />
              <i />
              <div className="reading-v36-sheet-thumb" />
            </div>

            <div className="reading-v36-book reading-v36-book-main">
              <div className="reading-v36-book-page left">
                <span className="reading-v36-book-title">Passage</span>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="reading-v36-book-page right">
                <div className="reading-v36-book-chart" />
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="reading-v36-mcq-card">
              <strong>MCQ</strong>
              <div className="reading-v36-mcq-row">A <i /></div>
              <div className="reading-v36-mcq-row active">B <i /></div>
              <div className="reading-v36-mcq-row">C <i /></div>
              <div className="reading-v36-mcq-row">D <i /></div>
            </div>

            <div className="reading-v36-chip chip-vocab">VOCAB</div>
            <div className="reading-v36-chip chip-summary">SUMMARY</div>

            <div className="reading-v36-result-card">
              <span>{language === 'vi' ? 'Kết quả' : 'Result'}</span>
              <strong>92%</strong>
              <div className="reading-v36-result-ring" />
            </div>
          </div>

          <div className="reading-v36-hero-copy">
            <span className="reading-v36-tag">Reading Studio • Interactive reading builder</span>
            <h1><span>{tool.icon}</span> {toolTitle}</h1>
            <p>{language === 'vi' ? 'Tạo bài đọc, MCQ, tóm tắt và từ vựng hỗ trợ nhanh chóng với AI thông minh.' : 'Build reading passages, MCQs, summaries, and vocabulary support with smart AI assistance.'}</p>
            <div className="reading-v36-cta-group">
              <button type="button" className="reading-v36-cta primary" onClick={() => { setActiveWorkflow('design'); scrollToRef(controlRef); }}>
                {language === 'vi' ? 'Bài đọc + MCQ' : 'Passage + MCQ'}
              </button>
              <button type="button" className="reading-v36-cta soft" onClick={() => { setActiveWorkflow('output'); scrollToRef(outputRef); }}>
                {language === 'vi' ? 'Tóm tắt & từ vựng' : 'Summary & vocabulary'}
              </button>
              <button type="button" className="reading-v36-cta warm" onClick={() => scrollToRef(outputRef)}>
                {language === 'vi' ? 'Xuất kết quả' : 'Export output'}
              </button>
            </div>
          </div>
        </div>

        <div className="reading-v36-summary-strip">
          <article className="reading-v36-summary-card">
            <div className="reading-v36-summary-icon ai">AI</div>
            <div>
              <strong>{language === 'vi' ? 'Hệ thống sẵn sàng' : 'AI ready'}</strong>
              <small>{hasApiKey ? 'API connected' : (language === 'vi' ? 'Cần API key' : 'Need API key')}</small>
            </div>
            <span className={`reading-v36-summary-dot ${hasApiKey ? 'is-on' : ''}`} />
          </article>
          <article className="reading-v36-summary-card">
            <div className="reading-v36-summary-icon profile">{questionTypes.length}</div>
            <div>
              <strong>{language === 'vi' ? profile.labelVi : profile.label}</strong>
              <small>{language === 'vi' ? 'Mẫu hiện tại' : 'Current profile'}</small>
            </div>
            <span className="reading-v36-summary-dot is-rose" />
          </article>
          <article className="reading-v36-summary-card">
            <div className="reading-v36-summary-icon count">{questionTypes.length}</div>
            <div>
              <strong>{questionTypes.length} {language === 'vi' ? 'dạng câu hỏi' : 'question types'}</strong>
              <small>{language === 'vi' ? 'Bộ dạng đang chọn' : 'Selected set'}</small>
            </div>
            <span className="reading-v36-summary-dot is-blue" />
          </article>
        </div>
      </section>

      <section className="reading-v28-flow-grid reading-v36-flow-grid">
        {workflowCards.map((card) => (
          <article
            key={card.id}
            className={`panel reading-v28-flow-card reading-v36-flow-card-card ${card.tone} ${activeWorkflow === card.id ? 'active' : ''}`}
          >
            <div className="reading-v36-flow-step" aria-hidden="true">{card.icon}</div>
            <div className="reading-v28-flow-copy">
              <span className="reading-v36-flow-badge">{card.badge}</span>
              <strong>{card.title}</strong>
              <p>{card.desc}</p>
            </div>
            <button type="button" className="reading-v36-flow-cta" onClick={card.action}>
              {card.cta} →
            </button>
          </article>
        ))}
      </section>

      <section className="reading-builder-grid reading-v28-builder-grid">
        <article className="panel builder-panel reading-control-panel reading-v28-control-panel" ref={controlRef}>
          <div className="reading-v28-panel-head">
            <div>
              <span className="eyebrow">1. {language === 'vi' ? 'Thiết kế bài đọc' : 'Design reading test'}</span>
              <h2>{language === 'vi' ? 'Tạo khung bài đọc cân đối' : 'Build a balanced reading pack'}</h2>
            </div>
            <button className="secondary" type="button" onClick={() => { setActiveWorkflow('design'); scrollToRef(controlRef); }}>
              {language === 'vi' ? 'Khu làm việc' : 'Workspace'}
            </button>
          </div>

          <label>{language === 'vi' ? 'Mẫu kì thi' : 'Exam profile'}</label>
          <div className="exam-profile-grid reading-v28-profile-grid">
            {EXAM_PROFILES.map((item) => (
              <button key={item.id} className={`exam-profile-card ${examProfile === item.id ? 'active' : ''}`} onClick={() => { setProfile(item.id); setActiveWorkflow('design'); }}>
                <strong>{language === 'vi' ? item.labelVi : item.label}</strong>
                <small>{language === 'vi' ? item.descVi : item.desc}</small>
              </button>
            ))}
          </div>

          <div ref={questionRef} />
          <label>{language === 'vi' ? 'Loại câu hỏi đọc hiểu' : 'Reading question types'}</label>
          <div className="question-type-grid reading-v28-question-grid">
            {QUESTION_TYPES.map((type) => (
              <button key={type.id} className={questionTypes.includes(type.id) ? 'active' : ''} onClick={() => { toggleType(type.id); setActiveWorkflow('question'); }}>
                {language === 'vi' ? type.labelVi : type.label}
              </button>
            ))}
          </div>

          <div className="reading-template-guide metro-panel reading-v28-template-guide">
            <div className="template-guide-head">
              <div>
                <strong>{language === 'vi' ? 'Mẫu câu hỏi chuẩn' : 'Standard question models'}</strong>
                <p>{language === 'vi' ? 'AI sẽ bị ràng buộc phải bắt chước các mẫu này.' : 'AI must imitate these models.'}</p>
              </div>
              <button className="secondary" onClick={() => setShowTemplateGuide((v) => !v)}>
                {showTemplateGuide ? (language === 'vi' ? 'Ẩn mẫu' : 'Hide') : (language === 'vi' ? 'Xem mẫu' : 'Show')}
              </button>
            </div>
            {showTemplateGuide && (
              <div className="template-example-grid reading-v28-template-grid">
                {questionTypes.slice(0, 6).map((typeId) => {
                  const data = getTemplateForType(typeId);
                  if (!data) return null;
                  return (
                    <details key={typeId} className="template-example-card">
                      <summary>
                        <span>{data.vi}</span>
                        <small>{data.exam}</small>
                      </summary>
                      <div>
                        <p><b>Stem:</b> {data.stem}</p>
                        <pre>{data.sample}</pre>
                        <p><b>{language === 'vi' ? 'Luật' : 'Rule'}:</b> {data.rules}</p>
                      </div>
                    </details>
                  );
                })}
                {questionTypes.length > 6 && <p className="template-more-note">+{questionTypes.length - 6} {language === 'vi' ? 'mẫu khác vẫn được đưa vào prompt AI.' : 'more models are still included in the AI prompt.'}</p>}
              </div>
            )}
          </div>

          <div className="reading-v28-input-grid">
            <div>
              <label>{language === 'vi' ? 'Bạn muốn tạo gì?' : 'What do you want to create?'}</label>
              <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={5} />
            </div>
            <div>
              <label>{language === 'vi' ? 'Bài đọc nguồn / ghi chú / từ vựng' : 'Source passage / notes / vocabulary'}</label>
              <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={8} placeholder={language === 'vi' ? 'Dán bài đọc có sẵn hoặc ghi chú ở đây...' : 'Paste an existing passage or notes here...'} />
            </div>
          </div>

          <div className="three-fields reading-v28-fields">
            <div>
              <label>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option>A2-B1</option>
                <option>B1-B2</option>
                <option>B2-C1</option>
                <option>C1</option>
                <option>THPT</option>
              </select>
            </div>
            <div>
              <label>{language === 'vi' ? 'Số câu' : 'Questions'}</label>
              <input type="number" min="1" max="40" value={itemCount} onChange={(e) => setItemCount(Number(e.target.value) || 1)} />
            </div>
            <div>
              <label>{language === 'vi' ? 'Số từ' : 'Words'}</label>
              <select value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))}>
                {WORD_COUNTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <div className="reading-toggle-row reading-v28-toggle-row">
            <button className={includeVocab ? 'active' : ''} onClick={() => setIncludeVocab(!includeVocab)}>{language === 'vi' ? 'Từ vựng' : 'Vocabulary'}</button>
            <button className={includeSummary ? 'active' : ''} onClick={() => setIncludeSummary(!includeSummary)}>{language === 'vi' ? 'Tóm tắt' : 'Summary'}</button>
          </div>

          <div className="hint-box reading-v28-hint">
            <strong>{language === 'vi' ? 'Mẹo:' : 'Tip:'}</strong>{' '}
            {language === 'vi' ? 'Chọn mẫu kì thi trước, sau đó bật/tắt loại câu hỏi. Live Interaction sẽ tự chia bài đọc bên trái, câu hỏi bên phải.' : 'Choose an exam profile first, then toggle question types. Live Interaction shows the passage left and questions right.'}
          </div>

          <div className="reading-v28-cta-row">
            <button className="primary" onClick={generate} disabled={loading}>{loading ? (language === 'vi' ? 'Đang tạo...' : 'Generating...') : (language === 'vi' ? '✨ Tạo Reading Package' : '✨ Generate Reading Package')}</button>
            {!hasApiKey && <button className="secondary" onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Nhập API key' : 'Add API key'}</button>}
          </div>
          {error && <p className="error-box">⚠️ {error}</p>}
        </article>

        <aside className="reading-v28-output-wrap" ref={outputRef}>
          <article className="panel preview-panel ai-output-panel reading-output-panel reading-v28-output-panel">
            <div className="preview-head reading-v28-output-head">
              <div>
                <span className="eyebrow">2. {language === 'vi' ? 'Kết quả AI' : 'AI output'}</span>
                <h2>{language === 'vi' ? 'Reading package' : 'Reading package'}</h2>
              </div>
              <div className="preview-actions wrap-actions reading-v28-actions">
                <button onClick={copyOutput} disabled={!output}>Copy</button>
                <button onClick={() => downloadFile(`${librarySlugify(toolTitle)}.txt`, output)} disabled={!output}>TXT</button>
                <button onClick={() => exportAsHtml(toolTitle, output)} disabled={!output}>HTML</button>
                <button onClick={() => exportAsWord(toolTitle, output)} disabled={!output}>Word .doc</button>
                <button onClick={addToBank} disabled={!output}>{language === 'vi' ? 'Ngân hàng' : 'Bank'}</button>
                <button onClick={() => window.print()} disabled={!output}>{language === 'vi' ? 'In' : 'Print'}</button>
              </div>
            </div>
            {output ? <pre className="ai-output compact-reading-output">{output}</pre> : <div className="empty-state"><p>{language === 'vi' ? 'Kết quả sẽ hiện ở đây.' : 'Output will appear here.'}</p></div>}
          </article>

          <article className="panel reading-v28-summary-panel">
            <span className="eyebrow">{language === 'vi' ? 'Tóm tắt nhanh' : 'Quick summary'}</span>
            <div className="reading-v28-summary-list">
              <div><strong>{language === 'vi' ? profile.labelVi : profile.label}</strong><small>{language === 'vi' ? 'Mẫu đề' : 'Exam profile'}</small></div>
              <div><strong>{itemCount}</strong><small>{language === 'vi' ? 'Câu hỏi' : 'Questions'}</small></div>
              <div><strong>{wordCount}</strong><small>{language === 'vi' ? 'Số từ mục tiêu' : 'Target words'}</small></div>
              <div><strong>{includeVocab ? 'ON' : 'OFF'}</strong><small>{language === 'vi' ? 'Từ vựng' : 'Vocabulary'}</small></div>
            </div>
          </article>
        </aside>
      </section>

      {output && (
        <ReadingActivityMaker title={toolTitle} passage={passage} questions={questions} output={output} language={language} showToast={showToast} />
      )}

      {output && (
        <ReadingLiveInteraction title={toolTitle} passage={passage} questions={questions} language={language} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
