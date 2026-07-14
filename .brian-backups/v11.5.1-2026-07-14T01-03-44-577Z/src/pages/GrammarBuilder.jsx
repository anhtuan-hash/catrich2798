import React, { useEffect, useMemo, useRef, useState } from 'react';
import { callAI, extractJson } from '../utils/gemini.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { addHistoryEntry, addQuestionsFromTextToBank, exportAsHtml, exportAsWord } from '../utils/library.js';
import { createTransfer, TRANSFER_APPLY_EVENT } from '../utils/contentTransfer.js';
import { getActiveAiConfig, getProviderInfo } from '../utils/aiProviders.js';
import './GrammarBuilder.css';

const BUILD_MODES = [
  { id: 'mini-lesson', icon: '▤', title: 'Mini Lesson', titleVi: 'Mini Lesson', desc: 'Theory, examples, common errors and controlled practice.', descVi: 'Lí thuyết, ví dụ, lỗi thường gặp và luyện tập có kiểm soát.' },
  { id: 'practice-set', icon: '✎', title: 'Practice Set', titleVi: 'Bộ luyện tập', desc: 'A structured set of exercises with keys and explanations.', descVi: 'Bộ bài luyện có cấu trúc, đáp án và giải thích.' },
  { id: 'thpt-exam', icon: '◎', title: 'THPT Exam Practice', titleVi: 'Luyện đề THPT', desc: 'Exam-style grammar in context with plausible distractors.', descVi: 'Ngữ pháp trong ngữ cảnh, bám dạng đề và nhiễu hợp lí.' },
  { id: 'diagnostic', icon: '⌁', title: 'Diagnostic Test', titleVi: 'Bài chẩn đoán', desc: 'Find error patterns and generate a remediation route.', descVi: 'Phát hiện nhóm lỗi và tạo lộ trình phụ đạo.' },
  { id: 'revision-pack', icon: '↻', title: 'Revision Pack', titleVi: 'Gói tổng ôn', desc: 'Mixed grammar from foundation to high application.', descVi: 'Ngữ pháp hỗn hợp từ nền tảng đến vận dụng cao.' },
  { id: 'interactive', icon: '◇', title: 'Interactive Activity', titleVi: 'Hoạt động tương tác', desc: 'Turn grammar into games, sorting, error hunts and races.', descVi: 'Chuyển ngữ pháp thành game, phân loại, săn lỗi và thi đua.' },
];

const GRAMMAR_DOMAIN_GROUPS = [
  {
    label: 'Tenses, aspects and time',
    options: [
      'Tenses and aspects — overview', 'Present Simple', 'Present Continuous', 'Present Perfect',
      'Present Perfect Continuous', 'Past Simple', 'Past Continuous', 'Past Perfect',
      'Past Perfect Continuous', 'Future forms', 'Future Continuous', 'Future Perfect',
      'Narrative tenses', 'Tense consistency', 'Time clauses', 'Mixed tenses',
    ],
  },
  {
    label: 'Common grammar contrasts',
    options: [
      'Past Simple vs Past Continuous', 'Present Perfect vs Past Simple',
      'Present Perfect Simple vs Present Perfect Continuous', 'Will vs Be going to',
      'Gerund vs Infinitive', 'Must vs Have to', 'Should vs Ought to',
      'Used to vs Be used to vs Get used to', 'Despite vs Although',
      'Because vs Because of', 'Another vs Other vs The other', 'Active vs Passive',
      'Defining vs Non-defining relative clauses', 'First vs Second Conditional',
      'Second vs Third Conditional', 'Few vs A few; Little vs A little',
      'So vs Such; Too vs Enough',
    ],
  },
  {
    label: 'Verb forms and verb patterns',
    options: [
      'Gerunds and infinitives', 'Bare infinitive', 'Verb patterns with objects', 'Causative structures',
      'Verbs of perception', 'Participles and participle clauses', 'Perfect infinitives and gerunds',
      'Verb form in context', 'Phrasal verbs', 'Multi-word verbs',
    ],
  },
  {
    label: 'Modal verbs and stance',
    options: [
      'Modal verbs — overview', 'Ability and possibility', 'Permission and requests', 'Advice and recommendation',
      'Obligation, necessity and prohibition', 'Deduction and speculation', 'Past modals',
      'Modal perfect forms', 'Degrees of certainty',
    ],
  },
  {
    label: 'Voice, clauses and complex sentences',
    options: [
      'Passive voice', 'Causative passive', 'Conditionals', 'Mixed conditionals', 'Wishes and regrets',
      'Relative clauses', 'Reduced relative clauses', 'Reported speech', 'Reporting verbs',
      'Noun clauses', 'Adverb clauses', 'Purpose, result and concession clauses', 'Participle clauses',
      'Reduced clauses', 'Subjunctive structures', 'Inversion', 'Cleft sentences and emphasis',
    ],
  },
  {
    label: 'Nouns, determiners and comparison',
    options: [
      'Articles and determiners', 'Countable and uncountable nouns', 'Quantifiers', 'Pronouns and reference',
      'Possessives', 'Demonstratives', 'Another, other and the other', 'Comparatives and superlatives',
      'Comparison structures', 'Noun phrases and modification',
    ],
  },
  {
    label: 'Sentence structure and accuracy',
    options: [
      'Subject–verb agreement', 'Word order', 'Questions and question tags', 'Negation',
      'Parallel structures', 'Coordination and subordination', 'Sentence combination',
      'Conjunctions and linking devices', 'Prepositions', 'Prepositional phrases',
      'Adjective and adverb position', 'Reference and cohesion', 'Grammar punctuation',
    ],
  },
  {
    label: 'Exam and integrated grammar',
    options: [
      'Sentence transformation', 'Error identification and correction', 'Grammar cloze',
      'Grammar in reading context', 'Grammar in writing', 'THPT exam grammar',
      'Advanced B2–C1 grammar', 'Mixed grammar',
    ],
  },
];

const GRAMMAR_DOMAINS = GRAMMAR_DOMAIN_GROUPS.flatMap((group) => group.options);

const FORMATS = [
  { id: 'mcq', label: 'Multiple Choice', short: 'MCQ' },
  { id: 'gap-fill', label: 'Gap Filling', short: 'Gap Fill' },
  { id: 'error-correction', label: 'Error Correction', short: 'Error' },
  { id: 'verb-form', label: 'Verb Form', short: 'Verb Form' },
  { id: 'transformation', label: 'Sentence Transformation', short: 'Transform' },
  { id: 'combination', label: 'Sentence Combination', short: 'Combine' },
  { id: 'arrangement', label: 'Sentence Arrangement', short: 'Arrange' },
  { id: 'cloze', label: 'Cloze Text', short: 'Cloze' },
  { id: 'dialogue', label: 'Contextual Dialogue', short: 'Dialogue' },
  { id: 'editing', label: 'Grammar Editing', short: 'Editing' },
];

const PURPOSES = [
  'Học trên lớp', 'Bài tập về nhà', 'Kiểm tra nhanh', 'Ôn thi tốt nghiệp THPT',
  'Bồi dưỡng học sinh khá giỏi', 'Phụ đạo học sinh mất căn bản', 'Luyện tập 1:1',
];

const CONTEXTS = [
  'Environment', 'Education', 'Technology', 'A multicultural world', 'Careers',
  'Social issues', 'School life', 'Community', 'Health and lifestyle', 'Custom topic',
];

const CONSTRAINTS = [
  { id: 'no-duplicate', label: 'Không trùng câu' },
  { id: 'no-content-repeat', label: 'Hạn chế lặp content words' },
  { id: 'no-name-repeat', label: 'Không lặp tên riêng' },
  { id: 'varied-context', label: 'Không lặp bối cảnh' },
  { id: 'shuffle-options', label: 'Xáo trộn đáp án' },
  { id: 'plausible-distractors', label: 'Nhiễu phải hợp lí' },
  { id: 'single-answer', label: 'Chỉ một đáp án đúng' },
  { id: 'thpt-aligned', label: 'Bám định dạng THPT' },
  { id: 'american-english', label: 'Anh–Mỹ' },
];

const AI_TASKS = [
  { id: 'blueprint', icon: '▦', title: 'Lập blueprint', desc: 'Phân bố phần, dạng bài, độ khó và trọng tâm.' },
  { id: 'draft', icon: '✦', title: 'Tạo bản nháp', desc: 'Sinh bộ câu hỏi có metadata, đáp án và giải thích.' },
  { id: 'validate', icon: '✓', title: 'Kiểm tra đáp án', desc: 'Rà soát tính đúng, câu mơ hồ và chất lượng nhiễu.' },
  { id: 'harder', icon: '↗', title: 'Tăng độ khó', desc: 'Nâng cấp câu hỏi nhưng giữ đúng mục tiêu ngữ pháp.' },
  { id: 'differentiate', icon: '≋', title: 'Phân hóa', desc: 'Tạo hỗ trợ, word bank và biến thể theo năng lực.' },
  { id: 'variants', icon: '⧉', title: 'Tạo biến thể', desc: 'Tạo mã A/B/C/D hoặc phiên bản dễ–khó.' },
  { id: 'ambiguous', icon: '!', title: 'Tìm câu mơ hồ', desc: 'Đánh dấu câu thiếu ngữ cảnh hoặc có nhiều đáp án.' },
  { id: 'diagnose', icon: '⌁', title: 'Chẩn đoán lỗi', desc: 'Phân tích bài làm và tạo lộ trình phụ đạo.' },
  { id: 'custom', icon: '⌘', title: 'Yêu cầu riêng', desc: 'Chỉnh đúng phần được yêu cầu bằng hội thoại.' },
];

const WORKFLOW_STEPS = [
  ['01', 'Mục đích'], ['02', 'Trọng tâm'], ['03', 'Đối tượng'], ['04', 'Blueprint'],
  ['05', 'AI tạo'], ['06', 'Kiểm định'], ['07', 'Xuất bản'],
];

const DESTINATIONS = [
  { id: 'lesson-plan-ai', route: '#/tool/lesson-plan-ai', icon: 'LA', label: 'Lesson Architect', desc: 'Đưa mục tiêu, presentation, practice và assessment vào giáo án.' },
  { id: 'exam-studio', route: '#/tool/exam-studio', icon: 'EX', label: 'Exam Studio', desc: 'Ghép item thành đề, tạo mã đề và ma trận.' },
  { id: 'worksheet-factory', route: '#/tool/worksheet-factory', icon: 'WF', label: 'Worksheet Factory', desc: 'Dàn trang bản học sinh và bản giáo viên.' },
  { id: 'textlab-activities', route: '#/tool/textlab-activities', icon: 'AC', label: 'Activity Studio', desc: 'Chuyển bài thành sorting, error hunt và game.' },
  { id: 'reading-studio', route: '#/tool/reading-studio', icon: 'RS', label: 'Reading Studio', desc: 'Tạo bài đọc chứa cấu trúc mục tiêu.' },
  { id: 'writing-studio', route: '#/tool/writing-studio', icon: 'WS', label: 'Writing Studio', desc: 'Tạo guided writing, checklist và model answer.' },
  { id: 'speaking-studio', route: '#/tool/speaking-studio', icon: 'SS', label: 'Speaking Studio', desc: 'Tạo role-play và sentence frames.' },
  { id: 'english-lesson-integration', route: '#/tool/english-lesson-integration', icon: 'EL', label: 'AI Lesson Integration', desc: 'Chèn Grammar Pack vào giáo án đang chỉnh sửa.' },
];

const SAMPLE_ITEMS = [
  {
    id: 'sample-mcq', section: 'Part 1', format: 'mcq', formatLabel: 'Multiple Choice', level: 'B2', cognitive: 'Application',
    grammarPoint: 'Past Simple vs Past Continuous', context: 'School Life', status: 'ai-draft', locked: false,
    stem: 'While the students ______ the experiment, the fire alarm suddenly rang.',
    options: ['conducted', 'were conducting', 'had conducted', 'have conducted'], answer: 'B',
    explanation: 'The action was in progress when a shorter past event interrupted it.',
    pattern: 'while + Past Continuous; interrupting event + Past Simple', commonError: 'Using Past Simple for both simultaneous and interrupting actions.',
  },
  {
    id: 'sample-verb', section: 'Part 1', format: 'verb-form', formatLabel: 'Verb Form', level: 'B2–C1', cognitive: 'Controlled Practice',
    grammarPoint: 'Gerund and Infinitive', context: 'Community', status: 'teacher-approved', locked: false,
    stem: 'The school encourages students ______ part in community projects.',
    options: [], answer: 'to take', explanation: 'The pattern is encourage + object + to-infinitive.',
    pattern: 'encourage + object + to-infinitive', commonError: 'encourage students taking',
  },
  {
    id: 'sample-error', section: 'Part 2', format: 'error-correction', formatLabel: 'Error Correction', level: 'C1', cognitive: 'High Application',
    grammarPoint: 'Subject–Verb Agreement', context: 'Education', status: 'ai-audited', locked: false,
    stem: 'The number of students participating in online courses have increased significantly.',
    options: [], answer: 'have → has', explanation: 'The head noun is “number”, so the singular verb “has” is required.',
    pattern: 'the number of + plural noun + singular verb', commonError: 'Agreeing the verb with the nearest plural noun.',
  },
  {
    id: 'sample-transform', section: 'Part 2', format: 'transformation', formatLabel: 'Sentence Transformation', level: 'B2', cognitive: 'Application',
    grammarPoint: 'Inversion', context: 'Social Issues', status: 'needs-review', locked: false,
    stem: 'She did not realise how serious the situation was until she spoke to the principal. (Only)',
    options: [], answer: 'Only after she had spoken to the principal did she realise how serious the situation was.',
    explanation: 'Use Only after + clause + auxiliary inversion in the main clause.',
    pattern: 'Only after + clause + auxiliary + subject + verb', commonError: 'Forgetting inversion after the fronted negative expression.',
  },
  {
    id: 'sample-cloze', section: 'Part 3', format: 'cloze', formatLabel: 'Cloze Text', level: 'B2–C1', cognitive: 'Application',
    grammarPoint: 'Mixed Grammar', context: 'Environment', status: 'ai-draft', locked: false,
    stem: 'Many schools have introduced recycling programmes, ______ students to take greater responsibility for the environment.',
    options: ['encourage', 'encouraged', 'encouraging', 'to encourage'], answer: 'C',
    explanation: 'The present participle introduces a result of the preceding clause.',
    pattern: 'main clause, V-ing result clause', commonError: 'Choosing an infinitive without a clear purpose relationship.',
  },
];

function uid(prefix = 'gb') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeToken(value) {
  return String(value || 'guest').toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}

function projectStorageKey(user) {
  return `bes-grammar-builder-v1147-project:${safeToken(user?.id || user?.email || 'guest')}`;
}

function vaultStorageKey(user) {
  return `bes-grammar-builder-v1147-vault:${safeToken(user?.id || user?.email || 'guest')}`;
}

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function defaultProject() {
  return {
    id: uid('project'),
    title: 'Past Tenses — Contextual Grammar Pack',
    mode: 'practice-set',
    domain: 'Tenses and aspects — overview',
    focusRequest: 'Past Simple vs Past Continuous; prioritise while + Past Continuous and when + Past Simple.',
    grade: '12',
    level: 'B2',
    book: 'Global Success',
    unit: 'Unit 1: Life Stories We Admire',
    topic: 'School life',
    customTopic: '',
    purpose: 'Học trên lớp',
    learnerNotes: 'Lớp có chênh lệch trình độ; ưu tiên ngữ cảnh rõ và thời lượng 45 phút.',
    sourceText: '',
    sourceName: '',
    questionCount: 20,
    sectionCount: 3,
    formats: ['mcq', 'verb-form', 'error-correction', 'transformation'],
    difficulty: { B1: 20, B2: 55, C1: 25 },
    answerMode: 'Đáp án kèm giải thích song ngữ',
    answerPlacement: 'Đáp án tập trung cuối tài liệu',
    constraints: ['no-duplicate', 'no-content-repeat', 'plausible-distractors', 'single-answer', 'thpt-aligned', 'american-english'],
    customInstruction: 'Ưu tiên tính khả thi trong 45 phút, bám mục tiêu ngôn ngữ và dùng ngữ cảnh tự nhiên.',
    blueprint: {
      sections: [
        { id: uid('sec'), title: 'Part 1 — Controlled Practice', format: 'Multiple Choice & Verb Form', count: 8, focus: 'Form and meaning' },
        { id: uid('sec'), title: 'Part 2 — Error Analysis', format: 'Error Correction & Transformation', count: 6, focus: 'Common learner errors' },
        { id: uid('sec'), title: 'Part 3 — Grammar in Context', format: 'Cloze & Editing', count: 6, focus: 'Contextual application' },
      ],
      notes: 'Move from controlled recognition to contextual application.',
      approved: false,
    },
    items: SAMPLE_ITEMS,
    status: 'draft',
    aiNotes: '',
    auditNotes: '',
    aiValidation: null,
    versions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function grammarFocus(project) {
  const domain = String(project?.domain || 'Mixed grammar').trim();
  const specific = String(project?.focusRequest || project?.contrast || '').trim();
  if (!specific || specific.toLowerCase() === domain.toLowerCase()) return domain;
  return `${domain} — ${specific}`;
}

function grammarPoint(project) {
  return String(project?.focusRequest || project?.contrast || project?.domain || 'Mixed grammar').trim();
}

function normalizeProject(raw = {}) {
  const base = defaultProject();
  const migratedFocus = String(raw.focusRequest || raw.contrast || '').trim();
  const legacyDomainMap = {
    'Tenses and aspects': 'Tenses and aspects — overview',
    'Modal verbs': 'Modal verbs — overview',
    'Comparisons': 'Comparison structures',
  };
  const domain = legacyDomainMap[raw.domain] || raw.domain || base.domain;
  return {
    ...base,
    ...raw,
    domain: GRAMMAR_DOMAINS.includes(domain) ? domain : base.domain,
    focusRequest: migratedFocus || base.focusRequest,
    items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : base.items,
  };
}

function normalizeOptions(value) {
  if (Array.isArray(value)) return value.map((item) => String(item?.text ?? item ?? '').trim()).filter(Boolean).slice(0, 6);
  return String(value || '').split(/\n|\|/).map((item) => item.trim()).filter(Boolean).slice(0, 6);
}

function normalizeStatus(value) {
  const raw = String(value || '').toLowerCase().replace(/\s+/g, '-');
  if (['ai-draft', 'ai-audited', 'needs-review', 'teacher-approved', 'published'].includes(raw)) return raw;
  return 'ai-draft';
}

function normalizeItem(raw, index = 0, fallback = {}) {
  const format = String(raw?.format || raw?.type || fallback.format || 'mcq').toLowerCase().replace(/\s+/g, '-');
  const formatData = FORMATS.find((entry) => entry.id === format || entry.label.toLowerCase() === format.replace(/-/g, ' '));
  return {
    id: String(raw?.id || uid('item')),
    section: String(raw?.section || fallback.section || `Part ${Math.floor(index / 8) + 1}`),
    format: formatData?.id || format,
    formatLabel: String(raw?.formatLabel || formatData?.label || fallback.formatLabel || 'Grammar Item'),
    level: String(raw?.level || fallback.level || 'B2'),
    cognitive: String(raw?.cognitive || raw?.cognitiveLevel || fallback.cognitive || 'Application'),
    grammarPoint: String(raw?.grammarPoint || raw?.grammar || fallback.grammarPoint || 'Grammar'),
    context: String(raw?.context || fallback.context || 'General English'),
    status: normalizeStatus(raw?.status || fallback.status),
    locked: Boolean(raw?.locked || fallback.locked),
    stem: String(raw?.stem || raw?.question || fallback.stem || '').replace(/^\d+[).]\s*/, '').trim(),
    options: normalizeOptions(raw?.options ?? fallback.options),
    answer: String(raw?.answer ?? fallback.answer ?? '').trim(),
    explanation: String(raw?.explanation || raw?.rationale || fallback.explanation || '').trim(),
    pattern: String(raw?.pattern || raw?.grammarPattern || fallback.pattern || '').trim(),
    commonError: String(raw?.commonError || fallback.commonError || '').trim(),
    teacherNote: String(raw?.teacherNote || fallback.teacherNote || '').trim(),
    aiFlags: Array.isArray(raw?.aiFlags) ? raw.aiFlags.map(String) : [],
  };
}

function serializeProject(project, includeAnswers = true) {
  const sectionMap = new Map();
  (project.items || []).forEach((item) => {
    const section = item.section || 'Grammar Practice';
    if (!sectionMap.has(section)) sectionMap.set(section, []);
    sectionMap.get(section).push(item);
  });
  const lines = [
    `# ${project.title}`,
    '',
    `Mode: ${BUILD_MODES.find((entry) => entry.id === project.mode)?.title || project.mode}`,
    `Grade: ${project.grade} · CEFR: ${project.level} · Book: ${project.book}`,
    `Grammar focus: ${grammarFocus(project)}`,
    `Context: ${project.customTopic || project.topic} · Purpose: ${project.purpose}`,
    '',
  ];
  let number = 0;
  sectionMap.forEach((items, section) => {
    lines.push(`## ${section}`, '');
    items.forEach((item) => {
      number += 1;
      lines.push(`${number}. ${item.stem}`);
      if (item.options?.length) item.options.forEach((option, index) => lines.push(`${String.fromCharCode(65 + index)}. ${option}`));
      if (includeAnswers) {
        lines.push(`Answer: ${item.answer || '—'}`);
        if (item.explanation) lines.push(`Explanation: ${item.explanation}`);
        if (item.pattern) lines.push(`Pattern: ${item.pattern}`);
      }
      lines.push('');
    });
  });
  return lines.join('\n');
}

function normalizeStem(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function repeatedContentWords(items) {
  const stop = new Set(['the','a','an','to','of','in','on','at','for','with','and','or','but','is','are','was','were','be','been','being','that','which','who','when','while','if','as','students','student']);
  const counts = new Map();
  (items || []).forEach((item) => {
    const unique = new Set(normalizeStem(item.stem).split(' ').filter((word) => word.length > 4 && !stop.has(word)));
    unique.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()].filter(([, count]) => count >= Math.max(3, Math.ceil((items.length || 1) * 0.45))).sort((a, b) => b[1] - a[1]);
}

function auditProject(project) {
  const items = project.items || [];
  const exactMap = new Map();
  items.forEach((item) => {
    const key = normalizeStem(item.stem);
    if (!key) return;
    exactMap.set(key, [...(exactMap.get(key) || []), item.id]);
  });
  const duplicateGroups = [...exactMap.values()].filter((ids) => ids.length > 1);
  const invalidAnswers = items.filter((item) => {
    if (!item.answer) return true;
    if (item.options?.length) {
      const answer = item.answer.trim().toUpperCase();
      const letterIndex = answer.length === 1 ? answer.charCodeAt(0) - 65 : -1;
      const matchesText = item.options.some((option) => normalizeStem(option) === normalizeStem(item.answer));
      return !(letterIndex >= 0 && letterIndex < item.options.length) && !matchesText;
    }
    return false;
  });
  const ambiguous = items.filter((item) => {
    const options = item.options || [];
    const normalized = options.map(normalizeStem).filter(Boolean);
    return item.stem.trim().length < 24 || (options.length > 0 && new Set(normalized).size !== normalized.length) || item.aiFlags?.includes('ambiguous');
  });
  const missingExplanation = items.filter((item) => !item.explanation.trim());
  const missingMetadata = items.filter((item) => !item.level || !item.formatLabel || !item.grammarPoint);
  const repeatedWords = repeatedContentWords(items);
  const approved = items.filter((item) => ['teacher-approved', 'published'].includes(item.status)).length;
  const aiDraft = items.filter((item) => item.status === 'ai-draft').length;
  const levelCounts = items.reduce((acc, item) => ({ ...acc, [item.level]: (acc[item.level] || 0) + 1 }), {});
  const formatCounts = items.reduce((acc, item) => ({ ...acc, [item.formatLabel]: (acc[item.formatLabel] || 0) + 1 }), {});
  const grammarCounts = items.reduce((acc, item) => ({ ...acc, [item.grammarPoint]: (acc[item.grammarPoint] || 0) + 1 }), {});
  const penalties = duplicateGroups.length * 12 + invalidAnswers.length * 10 + ambiguous.length * 6 + missingExplanation.length * 3 + missingMetadata.length * 4 + Math.min(12, repeatedWords.length * 3);
  const score = Math.max(0, Math.min(100, 100 - penalties));
  return {
    score,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'E',
    duplicateGroups, invalidAnswers, ambiguous, missingExplanation, missingMetadata, repeatedWords,
    approved, aiDraft, total: items.length, levelCounts, formatCounts, grammarCounts,
    ready: items.length > 0 && score >= 80 && invalidAnswers.length === 0 && duplicateGroups.length === 0 && approved === items.length,
  };
}

function chipsForItem(item) {
  return [item.level, item.formatLabel, item.cognitive, item.context, statusLabel(item.status)].filter(Boolean).slice(0, 5);
}

function statusLabel(status) {
  return ({
    'ai-draft': 'AI Draft',
    'ai-audited': 'AI Audited',
    'needs-review': 'Needs Review',
    'teacher-approved': 'Teacher Approved',
    published: 'Published',
  })[status] || 'AI Draft';
}

function statusClass(status) {
  return `gb-status-${String(status || 'ai-draft')}`;
}

function buildAiSystemInstruction() {
  return `You are the Grammar Knowledge Engine inside Brian English Studio for Vietnamese upper-secondary English teachers. Produce accurate, natural, classroom-ready English grammar materials for Grades 10–12. Use Vietnamese only for concise teacher notes when useful. Never invent citations. Every item must have one defensible answer, enough context, a clear grammar target, CEFR metadata and a short explanation. Return strict JSON only with no markdown fences.`;
}

function blueprintPrompt(project) {
  const formats = project.formats.map((id) => FORMATS.find((entry) => entry.id === id)?.label || id).join(', ');
  return `Create a detailed grammar exercise blueprint.

PROJECT
Title: ${project.title}
Mode: ${project.mode}
Grammar domain: ${project.domain}
Specific focus / teacher request: ${project.focusRequest || '(use the selected domain broadly)' }
Grade: ${project.grade}
CEFR: ${project.level}
Book / unit: ${project.book} / ${project.unit}
Context: ${project.customTopic || project.topic}
Purpose: ${project.purpose}
Learner notes: ${project.learnerNotes}
Question count: ${project.questionCount}
Sections: ${project.sectionCount}
Formats: ${formats}
Difficulty distribution: B1 ${project.difficulty.B1}%, B2 ${project.difficulty.B2}%, C1 ${project.difficulty.C1}%
Answer mode: ${project.answerMode}; ${project.answerPlacement}
Constraints: ${project.constraints.join(', ')}
Teacher instruction: ${project.customInstruction}
Source: ${project.sourceText.slice(0, 10000) || '(none)'}

Return:
{
  "title": "...",
  "notes": "...",
  "sections": [
    {"title":"Part 1 — ...","format":"...","count":8,"focus":"...","difficulty":"..."}
  ],
  "recommendedPatterns": ["..."],
  "riskChecks": ["..."]
}
Ensure section counts add up to exactly ${project.questionCount}.`;
}

function itemJsonSchema(count) {
  return `{
  "title":"...",
  "teacherNotes":"...",
  "items":[
    {
      "section":"Part 1 — ...",
      "format":"mcq | gap-fill | error-correction | verb-form | transformation | combination | arrangement | cloze | dialogue | editing",
      "formatLabel":"Multiple Choice",
      "level":"B1 | B2 | B2–C1 | C1",
      "cognitive":"Recognition | Understanding | Application | High Application | Controlled Practice",
      "grammarPoint":"...",
      "context":"...",
      "status":"ai-draft",
      "stem":"English item without numbering",
      "options":["...","...","...","..."],
      "answer":"B or full answer",
      "explanation":"short accurate explanation",
      "pattern":"grammar pattern",
      "commonError":"typical Vietnamese learner error"
    }
  ]
}
The items array must contain exactly ${count} items.`;
}

function sectionDraftPrompt(project, section, count, existingStems = []) {
  const formats = project.formats.map((id) => FORMATS.find((entry) => entry.id === id)?.label || id).join(', ');
  return `Generate one section of a grammar item set.

PROJECT
Title: ${project.title}
Mode: ${project.mode}
Grammar focus: ${grammarFocus(project)}
Grade / CEFR: ${project.grade} / ${project.level}
Book / unit: ${project.book} / ${project.unit}
Context: ${project.customTopic || project.topic}
Purpose: ${project.purpose}
Learner notes: ${project.learnerNotes}
Allowed formats: ${formats}
Answer mode: ${project.answerMode}
Constraints: ${project.constraints.join(', ')}
Teacher instruction: ${project.customInstruction}
Source: ${project.sourceText.slice(0, 7000) || '(none)'}

SECTION
Title: ${section.title}
Format mix: ${section.format || formats}
Focus: ${section.focus || grammarPoint(project)}
Difficulty: ${section.difficulty || project.level}
Required item count: ${count}

STEMS ALREADY USED — do not repeat or paraphrase closely:
${existingStems.slice(-30).map((stem, index) => `${index + 1}. ${stem}`).join('\n') || '(none)'}

RULES
- Create exactly ${count} unique items for this section.
- English content must be natural, accurate and classroom-ready.
- MCQs require exactly four plausible options and exactly one defensible answer.
- Add enough context to prevent double answers.
- Vary names, settings, verbs and content words.
- Error-correction items contain one clear error only.
- Transformation items include the prompt word or constraint in the stem.
- Keep explanations concise and correct.

JSON SCHEMA
${itemJsonSchema(count)}`;
}

function batchItems(items, size = 7) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}
function validationPrompt(project) {
  return `Audit the following grammar item set. Do not rewrite the full set. Identify answer errors, ambiguity, weak distractors, unnatural English, CEFR mismatch, duplicate logic and missing context.

PROJECT TARGET
Grammar focus: ${grammarFocus(project)}
Grade/level: ${project.grade} / ${project.level}

ITEMS
${JSON.stringify(project.items, null, 2).slice(0, 90000)}

Return:
{
  "summary":"...",
  "score":0,
  "issues":[{"itemId":"...","severity":"critical|warning|note","code":"answer|ambiguity|distractor|language|cefr|duplicate|context","message":"...","suggestion":"..."}],
  "approvedItemIds":["..."],
  "needsReviewItemIds":["..."]
}`;
}

function diagnosticPrompt(project) {
  return `Analyze student grammar performance and create an actionable diagnostic report.

TARGET
Grade ${project.grade}; ${project.level}; ${grammarFocus(project)}.
Teacher notes: ${project.learnerNotes}
Student work / results / observations:
${project.sourceText.slice(0, 50000) || '(No student work supplied. Infer only from the teacher notes and clearly mark assumptions.)'}

Return strict JSON:
{
  "summary":"Vietnamese diagnostic summary",
  "errorPatterns":[{"label":"Present Perfect vs Past Simple","rate":42,"cause":"...","evidence":"...","priority":"high|medium|low"}],
  "learnerGroups":[{"name":"Nhóm 1","profile":"...","support":"..."}],
  "remediationPlan":[{"step":1,"focus":"...","activity":"...","duration":"..."}],
  "items":[
    {
      "section":"Remedial Practice",
      "format":"mcq",
      "formatLabel":"Multiple Choice",
      "level":"${project.level}",
      "cognitive":"Understanding",
      "grammarPoint":"${grammarPoint(project)}",
      "context":"${project.customTopic || project.topic}",
      "status":"ai-draft",
      "stem":"English remediation item",
      "options":["...","...","...","..."],
      "answer":"A",
      "explanation":"...",
      "pattern":"...",
      "commonError":"..."
    }
  ]
}
Create 5 remediation items.`;
}

function transformPrompt(project, task, items) {
  const instruction = {
    harder: 'Increase cognitive demand and contextual complexity while preserving the same grammar targets and single defensible answers.',
    differentiate: 'Create differentiated support. Add concise teacherNote fields with support for weaker learners and an extension for advanced learners. Keep the core answer unchanged.',
    variants: 'Create one high-quality variant for every supplied item. Change context and wording while testing the same grammar target. Do not copy content words unnecessarily.',
    ambiguous: 'Find and repair ambiguous, under-contextualised or double-answer items. Preserve good items unchanged.',
  }[task] || project.customInstruction;
  return `${instruction}

TARGET PROJECT
${grammarFocus(project)}; Grade ${project.grade}; ${project.level}.

ITEMS
${JSON.stringify(items, null, 2).slice(0, 90000)}

Return strict JSON:
${itemJsonSchema(items.length)}`;
}

function itemRewritePrompt(project, item, request = '') {
  return `Rewrite one grammar item only.
Target: ${grammarFocus(project)}; ${item.level}; ${item.formatLabel}; ${item.cognitive}.
Teacher request: ${request || 'Improve clarity, naturalness, distractors and pedagogical value without changing the core grammar target.'}
Current item:
${JSON.stringify(item, null, 2)}

Return strict JSON only:
{
  "item": {
    "section":"${item.section}",
    "format":"${item.format}",
    "formatLabel":"${item.formatLabel}",
    "level":"${item.level}",
    "cognitive":"${item.cognitive}",
    "grammarPoint":"${item.grammarPoint}",
    "context":"${item.context}",
    "status":"needs-review",
    "stem":"English item without numbering",
    "options":["option A","option B","option C","option D"],
    "answer":"B or full answer",
    "explanation":"short accurate explanation",
    "pattern":"grammar pattern",
    "commonError":"typical learner error",
    "teacherNote":"optional differentiation note"
  }
}`;
}
function normalizeAiItems(json, fallbackProject) {
  const rawItems = Array.isArray(json?.items) ? json.items : Array.isArray(json?.questions) ? json.questions : [];
  return rawItems.map((item, index) => normalizeItem(item, index, {
    level: fallbackProject.level,
    grammarPoint: grammarPoint(fallbackProject),
    context: fallbackProject.customTopic || fallbackProject.topic,
  })).filter((item) => item.stem);
}

function projectSnapshot(project) {
  const { versions, ...rest } = project;
  return JSON.parse(JSON.stringify(rest));
}

function SummaryMetric({ value, label, tone = '' }) {
  return <div className={`gb-summary-metric ${tone}`}><strong>{value}</strong><span>{label}</span></div>;
}

function SectionHeading({ number, eyebrow, title, description, action }) {
  return (
    <header className="gb-card-heading">
      <div className="gb-card-number">{number}</div>
      <div><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
      {action ? <div className="gb-card-heading-action">{action}</div> : null}
    </header>
  );
}

function SelectField({ label, value, onChange, children }) {
  return <label className={`gb-field ${String(value || '').trim() ? 'has-value' : ''}`}><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function TextField({ label, value, onChange, placeholder = '', multiline = false, rows = 3, ...props }) {
  const hasValue = String(value ?? '').trim().length > 0;
  return <label className={`gb-field ${hasValue ? 'has-value' : ''}`}><span>{label}</span>{multiline ? <textarea value={value} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} {...props} /> : <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} {...props} />}</label>;
}

function ItemEditor({ item, onChange, onClose }) {
  const update = (patch) => onChange({ ...item, ...patch });
  return (
    <aside className="gb-item-drawer" role="dialog" aria-modal="true" aria-label="Chỉnh sửa câu hỏi">
      <div className="gb-item-drawer-backdrop" onClick={onClose} />
      <section>
        <header><div><span>ITEM EDITOR</span><h3>{item.formatLabel}</h3></div><button type="button" onClick={onClose}>×</button></header>
        <div className="gb-drawer-scroll">
          <div className="gb-form-grid two">
            <TextField label="Section" value={item.section} onChange={(value) => update({ section: value })} />
            <SelectField label="Trạng thái" value={item.status} onChange={(value) => update({ status: value })}>
              <option value="ai-draft">AI Draft</option><option value="ai-audited">AI Audited</option><option value="needs-review">Needs Review</option><option value="teacher-approved">Teacher Approved</option><option value="published">Published</option>
            </SelectField>
            <SelectField label="Dạng bài" value={item.format} onChange={(value) => {
              const format = FORMATS.find((entry) => entry.id === value);
              update({ format: value, formatLabel: format?.label || value });
            }}>{FORMATS.map((format) => <option key={format.id} value={format.id}>{format.label}</option>)}</SelectField>
            <SelectField label="CEFR" value={item.level} onChange={(value) => update({ level: value })}><option>B1</option><option>B2</option><option>B2–C1</option><option>C1</option></SelectField>
            <TextField label="Grammar point" value={item.grammarPoint} onChange={(value) => update({ grammarPoint: value })} />
            <TextField label="Cognitive level" value={item.cognitive} onChange={(value) => update({ cognitive: value })} />
            <TextField label="Context" value={item.context} onChange={(value) => update({ context: value })} />
            <TextField label="Pattern" value={item.pattern} onChange={(value) => update({ pattern: value })} />
          </div>
          <TextField label="Question / prompt" value={item.stem} onChange={(value) => update({ stem: value })} multiline rows={5} />
          <TextField label="Options — mỗi dòng một phương án" value={(item.options || []).join('\n')} onChange={(value) => update({ options: normalizeOptions(value) })} multiline rows={5} />
          <TextField label="Answer" value={item.answer} onChange={(value) => update({ answer: value })} multiline rows={2} />
          <TextField label="Explanation" value={item.explanation} onChange={(value) => update({ explanation: value })} multiline rows={4} />
          <TextField label="Common learner error" value={item.commonError} onChange={(value) => update({ commonError: value })} multiline rows={3} />
          <TextField label="Teacher note / differentiation" value={item.teacherNote || ''} onChange={(value) => update({ teacherNote: value })} multiline rows={4} />
        </div>
        <footer><button type="button" className="gb-btn primary" onClick={onClose}>Lưu thay đổi</button></footer>
      </section>
    </aside>
  );
}

export default function GrammarBuilder({ language = 'vi', apiKey = '', aiModel = '', hasApiKey = false, currentUser }) {
  const vi = language === 'vi';
  const [project, setProject] = useState(() => {
    if (typeof window === 'undefined') return defaultProject();
    const saved = readJson(projectStorageKey(currentUser), null);
    return saved && Array.isArray(saved.items) ? normalizeProject(saved) : defaultProject();
  });
  const [activeStage, setActiveStage] = useState('setup');
  const [activeItemId, setActiveItemId] = useState(project.items[0]?.id || '');
  const [editingItemId, setEditingItemId] = useState('');
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aiTask, setAiTask] = useState('draft');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgressIndex, setAiProgressIndex] = useState(0);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [notice, setNotice] = useState('');
  const [showVault, setShowVault] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [vault, setVault] = useState(() => typeof window === 'undefined' ? [] : readJson(vaultStorageKey(currentUser), []));
  const fileInputRef = useRef(null);

  const audit = useMemo(() => auditProject(project), [project]);
  const providerConfig = useMemo(() => getActiveAiConfig(), [hasApiKey, apiKey, aiModel, aiLoading]);
  const providerInfo = useMemo(() => getProviderInfo(providerConfig?.provider), [providerConfig?.provider]);
  const activeItem = project.items.find((item) => item.id === activeItemId) || project.items[0] || null;
  const editingItem = project.items.find((item) => item.id === editingItemId) || null;

  const filteredItems = useMemo(() => project.items.filter((item) => {
    const haystack = `${item.stem} ${item.grammarPoint} ${item.context} ${item.formatLabel}`.toLowerCase();
    return (!query.trim() || haystack.includes(query.toLowerCase())) && (formatFilter === 'all' || item.format === formatFilter) && (statusFilter === 'all' || item.status === statusFilter);
  }), [project.items, query, formatFilter, statusFilter]);

  const aiProgress = useMemo(() => ({
    blueprint: ['Đang phân tích yêu cầu', 'Đang lập cấu trúc các phần', 'Đang cân bằng độ khó', 'Đang kiểm tra tổng số câu'],
    draft: ['Đang đọc blueprint', 'Đang tạo từng phần', 'Đang tạo phương án nhiễu', 'Đang kiểm tra đáp án', 'Đang gắn metadata'],
    validate: ['Đang kiểm tra đáp án', 'Đang tìm câu mơ hồ', 'Đang đánh giá CEFR', 'Đang kiểm tra trùng lặp'],
    harder: ['Đang phân tích mức tư duy', 'Đang tăng độ phức tạp', 'Đang bảo toàn mục tiêu', 'Đang kiểm tra đáp án'],
    differentiate: ['Đang phân tích nhu cầu học sinh', 'Đang tạo hỗ trợ', 'Đang tạo extension', 'Đang kiểm tra khả thi'],
    variants: ['Đang khóa mục tiêu ngữ pháp', 'Đang thay bối cảnh', 'Đang tạo biến thể', 'Đang kiểm tra trùng'],
    ambiguous: ['Đang quét ngữ cảnh', 'Đang so sánh phương án', 'Đang sửa câu mơ hồ', 'Đang xác minh đáp án'],
    diagnose: ['Đang đọc bài làm học sinh', 'Đang phân loại lỗi', 'Đang xác định nguyên nhân', 'Đang tạo lộ trình phụ đạo'],
    custom: ['Đang đọc yêu cầu riêng', 'Đang xác định phần cần sửa', 'Đang áp dụng thay đổi', 'Đang kiểm tra lại'],
  })[aiTask] || ['Đang xử lý'], [aiTask]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(projectStorageKey(currentUser), JSON.stringify({ ...project, updatedAt: Date.now() })); } catch { /* optional */ }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [project, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    if (!aiLoading) { setAiProgressIndex(0); return undefined; }
    const timer = window.setInterval(() => setAiProgressIndex((index) => Math.min(index + 1, aiProgress.length - 1)), 1450);
    return () => window.clearInterval(timer);
  }, [aiLoading, aiProgress.length]);

  useEffect(() => {
    const onTransfer = (event) => {
      const item = event?.detail;
      if (!item?.content) return;
      setProject((current) => ({ ...current, sourceText: item.content, sourceName: item.title || item.sourceTitle || 'Transferred content', updatedAt: Date.now() }));
      setNotice(vi ? `Đã nhận nội dung từ ${item.sourceTitle || 'ứng dụng khác'}.` : `Content received from ${item.sourceTitle || 'another app'}.`);
    };
    window.addEventListener(TRANSFER_APPLY_EVENT, onTransfer);
    return () => window.removeEventListener(TRANSFER_APPLY_EVENT, onTransfer);
  }, [vi]);

  const updateProject = (patch) => setProject((current) => ({ ...current, ...patch, updatedAt: Date.now() }));

  const toggleListValue = (field, value) => setProject((current) => {
    const list = Array.isArray(current[field]) ? current[field] : [];
    return { ...current, [field]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value], updatedAt: Date.now() };
  });

  const replaceItems = (items, extra = {}) => setProject((current) => ({ ...current, items: items.map(normalizeItem), ...extra, updatedAt: Date.now() }));

  const updateItem = (updated) => setProject((current) => ({
    ...current,
    items: current.items.map((item) => item.id === updated.id ? normalizeItem(updated) : item),
    updatedAt: Date.now(),
  }));

  const deleteItem = (id) => setProject((current) => ({ ...current, items: current.items.filter((item) => item.id !== id), updatedAt: Date.now() }));

  const duplicateItem = (item) => {
    const copy = { ...item, id: uid('item'), stem: `${item.stem} (variant)`, status: 'needs-review', locked: false };
    setProject((current) => ({ ...current, items: [...current.items, copy], updatedAt: Date.now() }));
    setActiveItemId(copy.id);
  };

  const createSample = () => {
    replaceItems(SAMPLE_ITEMS.map((item) => ({ ...item, id: uid('sample') })), { status: 'ai-generated' });
    setActiveStage('editor');
    setNotice(vi ? 'Đã tạo bộ sample đa dạng metadata để xem workflow.' : 'A metadata-rich sample set was created.');
  };

  const handleFile = async (file) => {
    if (!file) return;
    setAiError('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let text = '';
      if (ext === 'docx') text = await readDocxTextFromBuffer(await file.arrayBuffer());
      else if (ext === 'pdf') text = await readPdfTextFromBuffer(await file.arrayBuffer(), { maxPages: 60, maxChars: 160000 });
      else if (ext === 'json') {
        const parsed = JSON.parse(await file.text());
        if (parsed?.items) {
          setProject({ ...normalizeProject(parsed), id: uid('project'), updatedAt: Date.now() });
          setNotice(vi ? 'Đã nhập dự án Grammar Builder.' : 'Grammar Builder project imported.');
          return;
        }
        text = JSON.stringify(parsed, null, 2);
      } else text = await file.text();
      updateProject({ sourceText: text.slice(0, 180000), sourceName: file.name });
      setNotice(vi ? `Đã đọc ${file.name}.` : `${file.name} imported.`);
    } catch (error) {
      setAiError(error?.message || String(error));
    }
  };

  const callGrammarAi = async (prompt, task, maxOutputTokens = 2800) => {
    const raw = await callAI({
      apiKey,
      model: aiModel,
      prompt,
      systemInstruction: buildAiSystemInstruction(),
      temperature: task === 'validate' ? 0.2 : 0.55,
      responseMimeType: 'application/json',
      maxOutputTokens,
      governanceProfile: task === 'validate' ? 'document' : 'worksheet',
      loadingLabel: `Grammar Builder · ${task}`,
    });
    return extractJson(raw);
  };

  const runAi = async (task, options = {}) => {
    setAiTask(task);
    setAiError('');
    setAiResult('');
    setShowAiPanel(true);
    if (!hasApiKey && !String(apiKey || providerConfig?.apiKey || '').trim()) {
      setAiError(vi ? 'AI thật chưa được cấu hình. Mở Cài đặt → AI Provider, chọn provider/model và nhập API key.' : 'Real AI is not configured. Open Settings → AI Provider and add a provider/model/API key.');
      return;
    }
    const targetItems = options.items || (options.item ? [options.item] : project.items.filter((item) => !item.locked));
    setAiLoading(true);
    try {
      if (task === 'draft') {
        const configuredSections = (project.blueprint?.sections || []).filter((section) => Number(section.count) > 0);
        const sections = configuredSections.length ? configuredSections : [{ title: 'Grammar Practice', format: project.formats.join(', '), focus: grammarPoint(project), count: project.questionCount }];
        const generated = [];
        let remaining = Math.max(1, Number(project.questionCount) || 1);
        for (const section of sections) {
          if (remaining <= 0) break;
          const requested = Math.min(remaining, Math.max(1, Number(section.count) || 1));
          let sectionRemaining = requested;
          while (sectionRemaining > 0) {
            const count = Math.min(7, sectionRemaining);
            const json = await callGrammarAi(sectionDraftPrompt(project, section, count, generated.map((item) => item.stem)), 'draft', 2800);
            const batch = normalizeAiItems(json, project).slice(0, count).map((item) => ({ ...item, section: item.section || section.title }));
            if (!batch.length) throw new Error(vi ? `AI không tạo được item cho ${section.title}.` : `AI returned no items for ${section.title}.`);
            generated.push(...batch);
            sectionRemaining -= batch.length;
            remaining -= batch.length;
            if (batch.length < count) break;
          }
        }
        while (remaining > 0) {
          const count = Math.min(7, remaining);
          const fallbackSection = { title: `Part ${Math.max(1, sections.length)} — Additional Practice`, format: project.formats.join(', '), focus: grammarPoint(project) };
          const json = await callGrammarAi(sectionDraftPrompt(project, fallbackSection, count, generated.map((item) => item.stem)), 'draft', 2800);
          const batch = normalizeAiItems(json, project).slice(0, count);
          if (!batch.length) break;
          generated.push(...batch);
          remaining -= batch.length;
        }
        if (!generated.length) throw new Error(vi ? 'AI không trả về danh sách câu hỏi hợp lệ.' : 'AI did not return a valid item list.');
        replaceItems(generated.slice(0, project.questionCount), { status: 'ai-generated', aiNotes: `Generated in ${Math.ceil(generated.length / 7)} verified batches.` });
        setAiResult(vi ? `Đã tạo ${Math.min(generated.length, project.questionCount)} item theo blueprint bằng nhiều lượt kiểm soát.` : `${Math.min(generated.length, project.questionCount)} blueprint-aligned items generated in controlled batches.`);
        setActiveStage('editor');
        setShowAiPanel(false);
        return;
      }

      if (task === 'diagnose') {
        const json = await callGrammarAi(diagnosticPrompt(project), 'diagnose', 2800);
        const remediationItems = normalizeAiItems(json, project);
        if (remediationItems.length) {
          setProject((current) => ({ ...current, items: [...current.items, ...remediationItems.map((item) => ({ ...item, id: uid('remedial'), section: item.section || 'Remedial Practice', status: 'needs-review' }))], aiNotes: json.summary || current.aiNotes, status: 'diagnosed', updatedAt: Date.now() }));
        }
        const patterns = (json.errorPatterns || []).map((entry) => `• ${entry.label}: ${entry.rate ?? '—'}% — ${entry.cause || ''}`).join('\n');
        const plan = (json.remediationPlan || []).map((entry) => `${entry.step}. ${entry.focus}: ${entry.activity} (${entry.duration || ''})`).join('\n');
        setAiResult(`${json.summary || 'Diagnostic completed.'}\n\nERROR PATTERNS\n${patterns || '—'}\n\nREMEDIATION PLAN\n${plan || '—'}`);
        setActiveStage('editor');
        return;
      }

      if (['harder', 'differentiate', 'variants', 'ambiguous'].includes(task)) {
        const transformed = [];
        for (const batch of batchItems(targetItems, 7)) {
          const json = await callGrammarAi(transformPrompt(project, task, batch), task, 2800);
          transformed.push(...normalizeAiItems(json, project));
        }
        if (!transformed.length) throw new Error(vi ? 'AI không trả về danh sách item hợp lệ.' : 'AI returned no valid items.');
        if (task === 'variants') {
          setProject((current) => ({ ...current, items: [...current.items, ...transformed.map((item) => ({ ...item, id: uid('variant'), status: 'needs-review' }))], status: 'ai-generated', updatedAt: Date.now() }));
        } else {
          const transformedMap = new Map(transformed.map((item, index) => [targetItems[index]?.id, item]));
          setProject((current) => ({
            ...current,
            items: current.items.map((item) => {
              const replacement = transformedMap.get(item.id);
              return replacement ? { ...replacement, id: item.id, locked: item.locked, status: 'needs-review' } : item;
            }),
            status: 'revised',
            updatedAt: Date.now(),
          }));
        }
        setAiResult(vi ? `Đã xử lý ${transformed.length} item theo tác vụ ${AI_TASKS.find((entry) => entry.id === task)?.title || task}.` : `${transformed.length} items processed.`);
        setActiveStage('editor');
        setShowAiPanel(false);
        return;
      }

      let prompt = '';
      if (task === 'blueprint') prompt = blueprintPrompt(project);
      else if (task === 'validate') prompt = validationPrompt(project);
      else if (task === 'rewrite-item') prompt = itemRewritePrompt(project, options.item, options.request);
      else prompt = transformPrompt(project, task, targetItems);
      const json = await callGrammarAi(prompt, task, task === 'validate' ? 2400 : 2800);
      if (task === 'blueprint') {
        const sections = Array.isArray(json.sections) ? json.sections.map((section) => ({ id: uid('sec'), title: String(section.title || 'Part'), format: String(section.format || ''), count: Math.max(0, Number(section.count) || 0), focus: String(section.focus || ''), difficulty: String(section.difficulty || '') })) : [];
        updateProject({ title: json.title || project.title, blueprint: { sections, notes: json.notes || '', recommendedPatterns: json.recommendedPatterns || [], riskChecks: json.riskChecks || [], approved: false }, status: 'blueprint-ready' });
        setAiResult(vi ? 'AI đã lập blueprint. Hãy kiểm tra tổng số câu và bấm Duyệt blueprint.' : 'AI blueprint created. Review and approve it.');
        setShowBlueprint(true);
      } else if (task === 'validate') {
        const needs = new Set(Array.isArray(json.needsReviewItemIds) ? json.needsReviewItemIds : []);
        const approved = new Set(Array.isArray(json.approvedItemIds) ? json.approvedItemIds : []);
        const issueMap = new Map();
        (json.issues || []).forEach((issue) => {
          const current = issueMap.get(issue.itemId) || [];
          issueMap.set(issue.itemId, [...current, `${issue.severity || 'note'}: ${issue.message || ''}`]);
        });
        setProject((current) => ({
          ...current,
          items: current.items.map((item) => ({ ...item, status: needs.has(item.id) ? 'needs-review' : approved.has(item.id) ? 'ai-audited' : item.status, aiFlags: issueMap.get(item.id) || item.aiFlags || [] })),
          aiValidation: json,
          auditNotes: json.summary || '',
          status: 'audited',
          updatedAt: Date.now(),
        }));
        setAiResult(`${json.summary || 'AI audit completed.'}
Score: ${json.score ?? '—'}
Issues: ${(json.issues || []).length}`);
        setActiveStage('editor');
      } else if (task === 'rewrite-item') {
        const newItem = normalizeItem(json.item || json.items?.[0], 0, options.item);
        updateItem({ ...newItem, id: options.item.id, locked: options.item.locked, status: 'needs-review' });
        setAiResult(vi ? 'Đã viết lại câu đang chọn. Hãy duyệt trước khi phê duyệt.' : 'Selected item rewritten. Review it before approval.');
      } else {
        const items = normalizeAiItems(json, project);
        if (!items.length) throw new Error(vi ? 'AI không trả về danh sách câu hỏi hợp lệ.' : 'AI did not return a valid item list.');
        replaceItems(items, { title: json.title || project.title, aiNotes: json.teacherNotes || '', status: 'revised' });
        setAiResult(json.teacherNotes || (vi ? `Đã xử lý ${items.length} câu hỏi.` : `${items.length} items processed.`));
        setActiveStage('editor');
        setShowAiPanel(false);
      }
    } catch (error) {
      setAiError(error?.message || String(error));
    } finally {
      setAiLoading(false);
    }
  };
  const saveVersion = () => {
    const version = { id: uid('version'), label: `${project.status} · ${new Date().toLocaleString('vi-VN')}`, createdAt: Date.now(), snapshot: projectSnapshot(project) };
    setProject((current) => ({ ...current, versions: [version, ...(current.versions || [])].slice(0, 20), updatedAt: Date.now() }));
    setNotice(vi ? 'Đã lưu phiên bản.' : 'Version saved.');
  };

  const restoreVersion = (version) => {
    if (!version?.snapshot) return;
    setProject((current) => ({ ...current, ...version.snapshot, versions: current.versions || [], id: current.id, updatedAt: Date.now() }));
    setNotice(vi ? 'Đã khôi phục phiên bản.' : 'Version restored.');
  };

  const saveToVault = () => {
    const entry = { ...projectSnapshot(project), id: project.id || uid('project'), savedAt: Date.now(), auditScore: audit.score };
    const next = [entry, ...vault.filter((item) => item.id !== entry.id)].slice(0, 50);
    setVault(next);
    try { window.localStorage.setItem(vaultStorageKey(currentUser), JSON.stringify(next)); } catch { /* optional */ }
    addHistoryEntry({
      kind: 'grammar-project', sourceApp: 'grammar-builder', sourceAppTitle: 'Grammar Builder', toolSlug: 'grammar-builder', toolTitle: 'Grammar Builder',
      title: project.title, content: serializeProject(project, true), tags: [project.domain, project.level, project.mode],
      metadata: { projectId: project.id, auditScore: audit.score, status: project.status },
    });
    setNotice(vi ? 'Đã lưu vào Teacher Vault và Thư viện.' : 'Saved to Teacher Vault and Library.');
  };

  const loadVaultProject = (entry) => {
    setProject({ ...normalizeProject(entry), id: entry.id || uid('project'), updatedAt: Date.now() });
    setShowVault(false);
    setActiveStage('editor');
  };

  const approveAll = () => setProject((current) => ({ ...current, items: current.items.map((item) => ({ ...item, status: 'teacher-approved' })), status: 'teacher-approved', updatedAt: Date.now() }));

  const addToItemBank = () => {
    const text = serializeProject(project, true);
    const added = addQuestionsFromTextToBank(text, { source: 'Grammar Builder', level: project.level, topic: grammarFocus(project) });
    setNotice(vi ? `Đã thêm ${added.length} câu MCQ nhận diện được vào Item Bank.` : `${added.length} detected MCQs added to Item Bank.`);
  };

  const sendTo = (destination) => {
    const content = serializeProject(project, true);
    const transfer = createTransfer(currentUser, {
      target: destination.id,
      type: 'grammar-pack',
      title: project.title,
      sourceApp: 'grammar-builder',
      sourceTitle: 'Grammar Builder',
      content,
      metadata: {
        schema: 'bes-grammar-pack/1.0', projectId: project.id, mode: project.mode, domain: project.domain,
        grammarFocus: grammarFocus(project), domain: project.domain, focusRequest: project.focusRequest, level: project.level, grade: project.grade, auditScore: audit.score,
        status: project.status, itemCount: project.items.length, blueprint: project.blueprint,
      },
    });
    if (!transfer) return;
    updateProject({ status: 'published' });
    setNotice(vi ? `Đã gửi sang ${destination.label}.` : `Sent to ${destination.label}.`);
    window.setTimeout(() => { window.location.hash = destination.route; }, 350);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'grammar-project'}.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="gb-page" data-stage={activeStage} data-design="soft-editorial">
      <section className="gb-toolbar">
        <button type="button" className="gb-back" onClick={() => window.history.back()}>← {vi ? 'Quay lại' : 'Back'}</button>
        <div className="gb-project-title"><small>GRAMMAR BUILDER · V2.3</small><input value={project.title} onChange={(event) => updateProject({ title: event.target.value })} /></div>
        <div className="gb-toolbar-state"><span className="gb-autosave">● {vi ? 'Tự động lưu' : 'Autosaved'}</span><span>{project.items.length} items</span><span>{audit.score}/100</span></div>
        <div className="gb-toolbar-actions">
          <button type="button" onClick={() => setShowBlueprint(true)}>▦ Blueprint</button>
          <button type="button" onClick={() => setShowAuditDetails(true)}>✓ Audit</button>
          <button type="button" className="gb-ai-button" onClick={() => setShowAiPanel(true)}>✦ AI Copilot</button>
          <button type="button" onClick={saveVersion}>◷ Version</button>
          <button type="button" className="primary" onClick={() => setShowPublish(true)}>↗ Publish</button>
        </div>
      </section>

      {notice ? <div className="gb-notice" role="status">✓ {notice}<button type="button" onClick={() => setNotice('')}>×</button></div> : null}

      <section className="gb-hero">
        <div className="gb-hero-copy">
          <span className="gb-kicker">AI GRAMMAR PRODUCTION SYSTEM · ENGLISH THPT</span>
          <h1>Grammar Builder</h1>
          <p>{vi ? 'Thiết kế, kiểm định, tái sử dụng và phân phối học liệu ngữ pháp trong một workflow chuyên biệt.' : 'Design, audit, reuse and distribute grammar materials in one specialist workflow.'}</p>
          <div className="gb-hero-actions"><button type="button" className="gb-btn primary" onClick={() => { setActiveStage('setup'); document.querySelector('.gb-setup-grid')?.scrollIntoView({ behavior: 'smooth' }); }}>＋ Dự án mới</button><button type="button" className="gb-btn" onClick={() => setShowVault(true)}>▣ Teacher Vault <b>{vault.length}</b></button><button type="button" className="gb-btn" onClick={createSample}>◇ Xem sample</button></div>
        </div>
        <div className="gb-hero-visual" aria-hidden="true">
          <div className="gb-visual-grid" />
          <div className="gb-visual-book"><b>GB</b><span>Grammar<br />Builder</span></div>
          <div className="gb-visual-sheet"><i>✓</i><span /><i>✓</i><span /><i>✓</i><span /></div>
          <div className="gb-visual-chart"><span /><span /><span /><span /><b>↗</b></div>
          <div className="gb-visual-ai">AI</div>
          <div className="gb-visual-check">✓</div>
          <div className="gb-visual-pencil" />
        </div>
        <div className="gb-hero-status">
          <div><span>AI ENGINE</span><strong>{hasApiKey ? 'READY' : 'SETUP'}</strong></div>
          <p><b>{providerInfo?.label || 'AI Provider'}</b><span>{providerConfig?.model || aiModel || 'Chưa chọn model'}</span></p>
          <div className="gb-hero-score"><strong>{audit.score}</strong><span>Quality score</span></div>
        </div>
      </section>

      <nav className="gb-workflow" aria-label="Grammar Builder workflow">
        {WORKFLOW_STEPS.map(([number, label], index) => {
          const active = activeStage === 'setup' ? index < 4 : activeStage === 'editor' ? index <= 5 : true;
          return <button type="button" key={number} className={active ? 'active' : ''} aria-current={active ? 'step' : undefined} onClick={() => setActiveStage(index < 4 ? 'setup' : index < 6 ? 'editor' : 'publish')}><b>{number}</b><span>{label}</span></button>;
        })}
      </nav>

      {activeStage === 'setup' ? (
        <section className="gb-setup-grid">
          <article className="gb-card gb-card-mode">
            <SectionHeading number="01" eyebrow="BUILD MODE" title="Chọn mục đích tạo" description="Mỗi chế độ thay đổi logic blueprint và đầu ra." />
            <div className="gb-mode-grid">
              {BUILD_MODES.map((mode) => <button type="button" key={mode.id} className={project.mode === mode.id ? 'active' : ''} aria-pressed={project.mode === mode.id} onClick={() => updateProject({ mode: mode.id })}><i>{mode.icon}</i><strong>{vi ? mode.titleVi : mode.title}</strong><span>{vi ? mode.descVi : mode.desc}</span></button>)}
            </div>
          </article>

          <article className="gb-card gb-card-focus">
            <SectionHeading number="02" eyebrow="GRAMMAR FOCUS" title="Xác định trọng tâm" description="Chọn một miền ngữ pháp; dùng ô yêu cầu riêng khi cần phạm vi cụ thể hơn." />
            <SelectField label="Grammar domain" value={project.domain} onChange={(value) => updateProject({ domain: value })}>
              {GRAMMAR_DOMAIN_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.options.map((value) => <option key={value} value={value}>{value}</option>)}</optgroup>)}
            </SelectField>
            <TextField label="Yêu cầu cụ thể khác" value={project.focusRequest} onChange={(value) => updateProject({ focusRequest: value })} placeholder="Ví dụ: so sánh Past Simple và Past Continuous; không dùng đảo ngữ; ưu tiên ngữ cảnh kể chuyện…" multiline rows={6} />
            <div className="gb-domain-hints"><span>Gợi ý nhanh</span><div>{['Mixed tenses','Modal perfect forms','Reduced relative clauses','Inversion','Grammar cloze','THPT exam grammar'].map((value) => <button type="button" key={value} className={project.domain === value && !project.focusRequest ? 'active' : ''} aria-pressed={project.domain === value && !project.focusRequest} onClick={() => updateProject({ domain: value, focusRequest: '' })}>{value}</button>)}</div></div>
            <div className="gb-focus-summary"><span>TARGET</span><strong>{project.domain}</strong><p>{project.focusRequest || 'AI sẽ triển khai toàn bộ phạm vi của domain đã chọn.'}</p></div>
          </article>

          <article className="gb-card gb-card-learner">
            <SectionHeading number="03" eyebrow="LEARNER & CONTEXT" title="Đối tượng và ngữ cảnh" description="AI dùng thông tin này để điều chỉnh nội dung và độ khó." />
            <div className="gb-form-grid two">
              <SelectField label="Khối" value={project.grade} onChange={(value) => updateProject({ grade: value })}><option>10</option><option>11</option><option>12</option></SelectField>
              <SelectField label="CEFR" value={project.level} onChange={(value) => updateProject({ level: value })}><option>A2</option><option>B1</option><option>B2</option><option>B2–C1</option><option>C1</option></SelectField>
              <SelectField label="Bộ sách" value={project.book} onChange={(value) => updateProject({ book: value })}><option>Global Success</option><option>Bright</option><option>Friends Global</option><option>i-Learn Smart World</option><option>English Discovery</option><option>Tự biên soạn</option></SelectField>
              <TextField label="Unit / Lesson" value={project.unit} onChange={(value) => updateProject({ unit: value })} />
              <SelectField label="Ngữ cảnh" value={project.topic} onChange={(value) => updateProject({ topic: value })}>{CONTEXTS.map((value) => <option key={value}>{value}</option>)}</SelectField>
              <SelectField label="Mục đích sử dụng" value={project.purpose} onChange={(value) => updateProject({ purpose: value })}>{PURPOSES.map((value) => <option key={value}>{value}</option>)}</SelectField>
            </div>
            {project.topic === 'Custom topic' ? <TextField label="Chủ đề riêng" value={project.customTopic} onChange={(value) => updateProject({ customTopic: value })} /> : null}
            <TextField label="Đặc điểm lớp học" value={project.learnerNotes} onChange={(value) => updateProject({ learnerNotes: value })} multiline rows={4} />
          </article>

          <article className="gb-card gb-card-source">
            <SectionHeading number="04" eyebrow="SOURCE & INPUT" title="Nguồn tạo nội dung" description="Dán nội dung, tải tài liệu hoặc nhận từ ứng dụng khác." action={<button type="button" className="gb-link-btn" onClick={() => fileInputRef.current?.click()}>＋ Tải file</button>} />
            <input ref={fileInputRef} hidden type="file" accept=".docx,.pdf,.txt,.md,.json" onChange={(event) => handleFile(event.target.files?.[0])} />
            <textarea data-transfer-target="primary" className="gb-source-input" value={project.sourceText} onChange={(event) => updateProject({ sourceText: event.target.value })} placeholder="Dán nội dung sách giáo khoa, danh sách cấu trúc, bài làm học sinh hoặc yêu cầu chuyên môn…" rows={10} />
            <div className="gb-source-footer"><span>{project.sourceName || 'Manual input / Transfer Inbox'}</span><b>{project.sourceText.length.toLocaleString()} ký tự</b><button type="button" onClick={() => updateProject({ sourceText: '', sourceName: '' })}>Xóa nguồn</button></div>
          </article>

          <article className="gb-card gb-card-blueprint">
            <SectionHeading number="05" eyebrow="OUTPUT BLUEPRINT" title="Thiết kế cấu trúc đầu ra" description="Kiểm soát số câu, dạng bài, độ khó, đáp án và chống trùng." action={<button type="button" className="gb-link-btn" onClick={() => runAi('blueprint')}>✦ AI lập blueprint</button>} />
            <div className="gb-number-row">
              <label><span>Tổng số câu</span><input type="number" min="1" max="120" value={project.questionCount} onChange={(event) => updateProject({ questionCount: Math.max(1, Math.min(120, Number(event.target.value) || 1)) })} /></label>
              <label><span>Số phần</span><input type="number" min="1" max="10" value={project.sectionCount} onChange={(event) => updateProject({ sectionCount: Math.max(1, Math.min(10, Number(event.target.value) || 1)) })} /></label>
            </div>
            <div className="gb-subheading"><strong>Dạng bài</strong><span>{project.formats.length} dạng đã chọn</span></div>
            <div className="gb-chip-checks">{FORMATS.map((format) => <button type="button" key={format.id} className={project.formats.includes(format.id) ? 'active' : ''} aria-pressed={project.formats.includes(format.id)} onClick={() => toggleListValue('formats', format.id)}>{project.formats.includes(format.id) ? '✓ ' : ''}{format.short}</button>)}</div>
            <div className="gb-subheading"><strong>Phân bố độ khó</strong><span>{project.difficulty.B1 + project.difficulty.B2 + project.difficulty.C1}%</span></div>
            <div className="gb-difficulty-grid">{['B1','B2','C1'].map((level) => <label key={level}><span><b>{level}</b><em>{project.difficulty[level]}%</em></span><input type="range" min="0" max="100" step="5" value={project.difficulty[level]} onChange={(event) => updateProject({ difficulty: { ...project.difficulty, [level]: Number(event.target.value) } })} /></label>)}</div>
            <div className="gb-form-grid two">
              <SelectField label="Loại đáp án" value={project.answerMode} onChange={(value) => updateProject({ answerMode: value })}><option>Chỉ đáp án</option><option>Đáp án kèm giải thích</option><option>Đáp án kèm giải thích song ngữ</option><option>Phân tích vì sao phương án sai</option></SelectField>
              <SelectField label="Vị trí đáp án" value={project.answerPlacement} onChange={(value) => updateProject({ answerPlacement: value })}><option>Đáp án tập trung cuối tài liệu</option><option>Đáp án sau từng câu</option><option>Tạo riêng bản giáo viên</option></SelectField>
            </div>
            <div className="gb-subheading"><strong>Quy tắc chất lượng</strong></div>
            <div className="gb-constraint-grid">{CONSTRAINTS.map((entry) => <label key={entry.id} className={project.constraints.includes(entry.id) ? 'active' : ''}><input type="checkbox" checked={project.constraints.includes(entry.id)} onChange={() => toggleListValue('constraints', entry.id)} /><span>{entry.label}</span></label>)}</div>
          </article>

          <article className="gb-card gb-card-ai">
            <SectionHeading number="06" eyebrow="AI COPILOT" title="AI theo tác vụ chuyên môn" description="Không dùng một prompt chung. Chọn đúng thao tác cần AI thực hiện." />
            <div className="gb-ai-state"><span className={hasApiKey ? 'ready' : 'setup'}>{hasApiKey ? '● AI thật đang bật' : '○ Chưa cấu hình AI thật'}</span><strong>{providerInfo?.label || 'AI Provider'} · {providerConfig?.model || aiModel || 'No model'}</strong></div>
            <div className="gb-ai-task-grid">{AI_TASKS.map((task) => <button type="button" key={task.id} className={aiTask === task.id ? 'active' : ''} aria-pressed={aiTask === task.id} onClick={() => { setAiTask(task.id); setShowAiPanel(true); }}><i>{task.icon}</i><span><strong>{task.title}</strong><small>{task.desc}</small></span></button>)}</div>
            <TextField label="Yêu cầu riêng cho AI" value={project.customInstruction} onChange={(value) => updateProject({ customInstruction: value })} multiline rows={4} />
            <div className="gb-ai-run-row"><button type="button" className="gb-btn primary large" disabled={aiLoading} onClick={() => runAi(aiTask)}>{aiLoading ? `✦ ${aiProgress[aiProgressIndex]}` : `✦ Chạy ${AI_TASKS.find((task) => task.id === aiTask)?.title || 'AI Copilot'}`}</button><button type="button" className="gb-btn" onClick={createSample}>Dùng sample không AI</button></div>
            {aiError ? <div className="gb-error">{aiError}</div> : null}
          </article>

          <div className="gb-setup-footer">
            <div><strong>Thiết lập đã sẵn sàng</strong><span>{project.questionCount} câu · {project.formats.length} dạng · {project.grade} · {project.level}</span></div>
            <button type="button" className="gb-btn primary xl" onClick={() => runAi(project.blueprint?.approved ? 'draft' : 'blueprint')}>✦ {project.blueprint?.approved ? 'Tạo bản nháp bằng AI' : 'Lập và duyệt blueprint'}</button>
            <button type="button" className="gb-btn xl" onClick={() => setActiveStage('editor')}>Mở Content Editor →</button>
          </div>
        </section>
      ) : null}

      {activeStage === 'editor' ? (
        <section className="gb-editor-stage">
          <div className="gb-editor-main">
            <section className="gb-editor-header">
              <div><span className="gb-kicker">CARD 07 · CONTENT EDITOR</span><h2>Biên tập từng item</h2><p>Metadata thay đổi theo dạng bài; tối đa năm chip trên card, chi tiết mở trong drawer.</p></div>
              <div className="gb-editor-actions"><button type="button" onClick={() => setActiveStage('setup')}>← Thiết lập</button><button type="button" onClick={() => runAi('validate')}>✦ AI Audit</button><button type="button" onClick={approveAll}>✓ Duyệt tất cả</button><button type="button" className="primary" onClick={() => setShowPublish(true)}>Publish</button></div>
            </section>
            <div className="gb-filterbar">
              <label className="gb-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm câu, grammar point hoặc context…" /></label>
              <select value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}><option value="all">Tất cả dạng</option>{FORMATS.map((format) => <option key={format.id} value={format.id}>{format.label}</option>)}</select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="ai-draft">AI Draft</option><option value="ai-audited">AI Audited</option><option value="needs-review">Needs Review</option><option value="teacher-approved">Teacher Approved</option><option value="published">Published</option></select>
              <button type="button" onClick={() => setProject((current) => ({ ...current, items: [...current.items, normalizeItem({ id: uid('item'), section: 'New Section', format: 'mcq', formatLabel: 'Multiple Choice', level: current.level, cognitive: 'Application', grammarPoint: grammarPoint(current), context: current.customTopic || current.topic, status: 'needs-review', stem: 'New grammar item', options: ['Option A','Option B','Option C','Option D'], answer: 'A', explanation: '', pattern: '' })] }))}>＋ Thêm item</button>
            </div>

            <div className="gb-item-list">
              {filteredItems.length ? filteredItems.map((item, index) => (
                <article key={item.id} className={`gb-item-card ${activeItemId === item.id ? 'selected' : ''} ${item.locked ? 'locked' : ''}`} onClick={() => setActiveItemId(item.id)}>
                  <div className="gb-item-index"><span>{String(project.items.indexOf(item) + 1).padStart(2, '0')}</span><i>{item.format === 'mcq' ? 'A' : item.format === 'error-correction' ? '!' : item.format === 'transformation' ? '↔' : item.format === 'cloze' ? '…' : 'V'}</i></div>
                  <div className="gb-item-content">
                    <div className="gb-item-top"><div><small>{item.section}</small><h3>{item.stem}</h3></div><span className={`gb-item-status ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></div>
                    {item.options?.length ? <div className="gb-options-preview">{item.options.map((option, optionIndex) => <span key={`${item.id}-${optionIndex}`} className={String.fromCharCode(65 + optionIndex) === item.answer.toUpperCase() ? 'answer' : ''}><b>{String.fromCharCode(65 + optionIndex)}</b>{option}</span>)}</div> : <div className="gb-answer-preview"><b>Expected answer</b><span>{item.answer || 'Chưa có đáp án'}</span></div>}
                    <div className="gb-item-meta">{chipsForItem(item).map((chip, chipIndex) => <span key={`${chip}-${chipIndex}`} className={chipIndex === 4 ? statusClass(item.status) : ''}>{chip}</span>)}</div>
                    <div className="gb-item-summary"><span><b>Pattern:</b> {item.pattern || 'Chưa khai báo'}</span><span><b>Audit:</b> {item.aiFlags?.length ? `${item.aiFlags.length} cảnh báo` : 'Local checks passed'}</span></div>
                    {item.aiFlags?.length ? <div className="gb-item-flags">{item.aiFlags.slice(0, 2).map((flag) => <span key={flag}>! {flag}</span>)}</div> : null}
                  </div>
                  <div className="gb-item-actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => updateItem({ ...item, locked: !item.locked })}>{item.locked ? '🔒' : '🔓'}</button>
                    <button type="button" onClick={() => setEditingItemId(item.id)}>Sửa</button>
                    <button type="button" onClick={() => runAi('rewrite-item', { item })}>✦ AI</button>
                    <button type="button" onClick={() => duplicateItem(item)}>⧉</button>
                    <button type="button" onClick={() => updateItem({ ...item, status: 'teacher-approved' })}>✓</button>
                    <button type="button" className="danger" onClick={() => deleteItem(item.id)}>×</button>
                  </div>
                </article>
              )) : <div className="gb-empty"><strong>Không có item phù hợp bộ lọc.</strong><button type="button" onClick={() => { setQuery(''); setFormatFilter('all'); setStatusFilter('all'); }}>Xóa bộ lọc</button></div>}
            </div>
          </div>

          <aside className="gb-audit-card">
            <div className="gb-audit-head"><div><span>CARD 08 · QUALITY AUDIT</span><h2>Kiểm định chất lượng</h2></div><div className={`gb-audit-score ${audit.score >= 80 ? 'good' : audit.score >= 60 ? 'warn' : 'bad'}`}><strong>{audit.score}</strong><span>{audit.grade}</span></div></div>
            <div className="gb-audit-metrics">
              <SummaryMetric value={audit.total} label="Tổng item" />
              <SummaryMetric value={audit.approved} label="Đã duyệt" tone="good" />
              <SummaryMetric value={audit.invalidAnswers.length} label="Lỗi đáp án" tone={audit.invalidAnswers.length ? 'bad' : 'good'} />
              <SummaryMetric value={audit.ambiguous.length} label="Có thể mơ hồ" tone={audit.ambiguous.length ? 'warn' : 'good'} />
            </div>
            <div className="gb-audit-section"><header><strong>Quality gates</strong><span>{audit.ready ? 'READY' : 'REVIEW'}</span></header>
              <ul>
                <li className={audit.duplicateGroups.length ? 'fail' : 'pass'}><b>{audit.duplicateGroups.length ? '!' : '✓'}</b><span>Không trùng stem</span><em>{audit.duplicateGroups.length}</em></li>
                <li className={audit.invalidAnswers.length ? 'fail' : 'pass'}><b>{audit.invalidAnswers.length ? '!' : '✓'}</b><span>Đáp án hợp lệ</span><em>{audit.invalidAnswers.length}</em></li>
                <li className={audit.ambiguous.length ? 'warn' : 'pass'}><b>{audit.ambiguous.length ? '!' : '✓'}</b><span>Đủ ngữ cảnh</span><em>{audit.ambiguous.length}</em></li>
                <li className={audit.missingExplanation.length ? 'warn' : 'pass'}><b>{audit.missingExplanation.length ? '!' : '✓'}</b><span>Có giải thích</span><em>{audit.missingExplanation.length}</em></li>
                <li className={audit.repeatedWords.length ? 'warn' : 'pass'}><b>{audit.repeatedWords.length ? '!' : '✓'}</b><span>Content-word variety</span><em>{audit.repeatedWords.length}</em></li>
              </ul>
            </div>
            <div className="gb-audit-section"><header><strong>CEFR distribution</strong></header>{Object.entries(audit.levelCounts).map(([level, count]) => <div className="gb-bar-row" key={level}><span>{level}</span><i><b style={{ width: `${audit.total ? count / audit.total * 100 : 0}%` }} /></i><em>{count}</em></div>)}</div>
            <div className="gb-audit-section"><header><strong>Grammar coverage</strong></header><div className="gb-coverage-list">{Object.entries(audit.grammarCounts).slice(0, 5).map(([label, count]) => <span key={label}><b>{count}</b>{label}</span>)}</div></div>
            {project.auditNotes ? <div className="gb-ai-audit-note"><span>AI AUDIT</span><p>{project.auditNotes}</p></div> : null}
            <div className="gb-audit-actions"><button type="button" className="gb-btn primary" onClick={() => runAi('validate')}>✦ Chạy AI Audit</button><button type="button" className="gb-btn" onClick={() => setShowAuditDetails(true)}>Xem chi tiết</button></div>
          </aside>
        </section>
      ) : null}

      {activeStage === 'publish' ? (
        <section className="gb-publish-stage">
          <article className="gb-publish-card">
            <SectionHeading number="09" eyebrow="PUBLISH & CONNECTED WORKFLOW" title="Xuất bản và kết nối" description="Chỉ nên phân phối tài liệu đã được giáo viên kiểm tra và phê duyệt." action={<span className={`gb-readiness ${audit.ready ? 'ready' : ''}`}>{audit.ready ? 'READY TO PUBLISH' : 'TEACHER REVIEW REQUIRED'}</span>} />
            <div className="gb-publish-summary"><SummaryMetric value={project.items.length} label="Items" /><SummaryMetric value={audit.score} label="Quality" /><SummaryMetric value={audit.approved} label="Approved" /><SummaryMetric value={project.versions?.length || 0} label="Versions" /></div>
            <div className="gb-export-grid">
              <button type="button" onClick={() => exportAsWord(`${project.title} — Student`, serializeProject(project, false))}><i>W</i><span><strong>Bản học sinh</strong><small>DOC · Không đáp án</small></span></button>
              <button type="button" onClick={() => exportAsWord(`${project.title} — Teacher`, serializeProject(project, true))}><i>W+</i><span><strong>Bản giáo viên</strong><small>DOC · Đáp án & giải thích</small></span></button>
              <button type="button" onClick={() => exportAsHtml(project.title, serializeProject(project, true))}><i>H</i><span><strong>Interactive HTML</strong><small>Trang in và xem trên web</small></span></button>
              <button type="button" onClick={downloadJson}><i>J</i><span><strong>Project JSON</strong><small>Backup / import lại</small></span></button>
              <button type="button" onClick={saveToVault}><i>V</i><span><strong>Teacher Vault</strong><small>Lưu dự án đã duyệt</small></span></button>
              <button type="button" onClick={addToItemBank}><i>IB</i><span><strong>Item Bank</strong><small>Tách câu hỏi tái sử dụng</small></span></button>
            </div>
            <div className="gb-subheading large"><strong>Connected Workflow</strong><span>Gửi gói dữ liệu có cấu trúc, không sao chép thủ công</span></div>
            <div className="gb-destination-grid">{DESTINATIONS.map((destination) => <button type="button" key={destination.id} onClick={() => sendTo(destination)}><i>{destination.icon}</i><span><strong>{destination.label}</strong><small>{destination.desc}</small></span><b>→</b></button>)}</div>
            <div className="gb-publish-footer"><button type="button" className="gb-btn" onClick={() => setActiveStage('editor')}>← Quay lại biên tập</button><button type="button" className="gb-btn primary xl" onClick={() => { approveAll(); saveToVault(); updateProject({ status: 'published' }); }}>✓ Phê duyệt và lưu bản chính thức</button></div>
          </article>
        </section>
      ) : null}

      {editingItem ? <ItemEditor item={editingItem} onChange={updateItem} onClose={() => setEditingItemId('')} /> : null}

      {showAiPanel ? (
        <div className="gb-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !aiLoading) setShowAiPanel(false); }}>
          <section className="gb-modal gb-ai-modal" role="dialog" aria-modal="true">
            <header><div><span>AI COPILOT · GRAMMAR KNOWLEDGE ENGINE</span><h2>{AI_TASKS.find((task) => task.id === aiTask)?.title || (aiTask === 'rewrite-item' ? 'AI viết lại item' : 'AI Copilot')}</h2><p>{providerInfo?.label || 'AI Provider'} · {providerConfig?.model || aiModel || 'No model'}</p></div><button type="button" disabled={aiLoading} onClick={() => setShowAiPanel(false)}>×</button></header>
            <div className="gb-ai-modal-body">
              <div className="gb-ai-task-select">{AI_TASKS.map((task) => <button type="button" key={task.id} className={aiTask === task.id ? 'active' : ''} aria-pressed={aiTask === task.id} onClick={() => setAiTask(task.id)} disabled={aiLoading}><i>{task.icon}</i><span><strong>{task.title}</strong><small>{task.desc}</small></span></button>)}</div>
              <div className="gb-ai-context"><span>Ngữ cảnh hiện tại</span><strong>Grade {project.grade} · {project.level} · {grammarFocus(project)}</strong><p>{project.items.length} items · Audit {audit.score}/100 · {project.customTopic || project.topic}</p></div>
              <TextField label="Yêu cầu bổ sung" value={project.customInstruction} onChange={(value) => updateProject({ customInstruction: value })} multiline rows={5} />
              {aiLoading ? <div className="gb-ai-progress"><div className="gb-ai-spinner">✦</div><div><strong>{aiProgress[aiProgressIndex]}</strong><span>{aiProgress.map((step, index) => <i key={step} className={index <= aiProgressIndex ? 'active' : ''} />)}</span><p>Không đóng cửa sổ trong khi AI đang tạo dữ liệu có cấu trúc.</p></div></div> : null}
              {aiError ? <div className="gb-error large"><strong>AI chưa chạy được</strong><p>{aiError}</p><button type="button" onClick={() => window.location.hash = '#/settings'}>Mở Cài đặt AI</button></div> : null}
              {aiResult ? <div className="gb-ai-result"><span>KẾT QUẢ AI</span><pre>{aiResult}</pre></div> : null}
            </div>
            <footer><button type="button" className="gb-btn" onClick={() => setShowAiPanel(false)} disabled={aiLoading}>Đóng</button><button type="button" className="gb-btn primary xl" onClick={() => runAi(aiTask)} disabled={aiLoading}>{aiLoading ? `✦ ${aiProgress[aiProgressIndex]}` : `✦ Chạy ${AI_TASKS.find((task) => task.id === aiTask)?.title || 'AI'}`}</button></footer>
          </section>
        </div>
      ) : null}

      {showBlueprint ? (
        <div className="gb-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowBlueprint(false); }}>
          <section className="gb-modal gb-blueprint-modal"><header><div><span>EXERCISE BLUEPRINT</span><h2>{project.title}</h2><p>{project.blueprint?.sections?.reduce((sum, section) => sum + Number(section.count || 0), 0)} / {project.questionCount} items planned</p></div><button type="button" onClick={() => setShowBlueprint(false)}>×</button></header>
            <div className="gb-blueprint-list">{(project.blueprint?.sections || []).map((section, index) => <article key={section.id || index}><b>{String(index + 1).padStart(2, '0')}</b><div><input value={section.title} onChange={(event) => updateProject({ blueprint: { ...project.blueprint, sections: project.blueprint.sections.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) } })} /><span>{section.format}</span><p>{section.focus}</p></div><label><input type="number" min="0" max="120" value={section.count} onChange={(event) => updateProject({ blueprint: { ...project.blueprint, sections: project.blueprint.sections.map((item, itemIndex) => itemIndex === index ? { ...item, count: Number(event.target.value) || 0 } : item) } })} /><small>items</small></label></article>)}</div>
            <TextField label="Blueprint notes" value={project.blueprint?.notes || ''} onChange={(value) => updateProject({ blueprint: { ...project.blueprint, notes: value } })} multiline rows={4} />
            <footer><button type="button" className="gb-btn" onClick={() => runAi('blueprint')}>✦ Tạo lại</button><button type="button" className="gb-btn primary" onClick={() => { updateProject({ blueprint: { ...project.blueprint, approved: true }, status: 'blueprint-approved' }); setShowBlueprint(false); setNotice('Đã duyệt blueprint. Có thể tạo bản nháp bằng AI.'); }}>✓ Duyệt blueprint</button></footer>
          </section>
        </div>
      ) : null}

      {showVault ? (
        <div className="gb-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowVault(false); }}><section className="gb-modal gb-vault-modal"><header><div><span>TEACHER VAULT</span><h2>Dự án Grammar Builder</h2><p>{vault.length} dự án được lưu trên tài khoản này.</p></div><button type="button" onClick={() => setShowVault(false)}>×</button></header><div className="gb-vault-list">{vault.length ? vault.map((entry) => <article key={entry.id}><div><span>{entry.mode}</span><h3>{entry.title}</h3><p>{entry.domain} · {entry.level} · {(entry.items || []).length} items</p></div><strong>{entry.auditScore || 0}</strong><button type="button" onClick={() => loadVaultProject(entry)}>Mở</button><button type="button" className="danger" onClick={() => { const next = vault.filter((item) => item.id !== entry.id); setVault(next); window.localStorage.setItem(vaultStorageKey(currentUser), JSON.stringify(next)); }}>Xóa</button></article>) : <div className="gb-empty"><strong>Teacher Vault đang trống.</strong><p>Lưu dự án đã duyệt để tái sử dụng sau.</p></div>}</div><footer><button type="button" className="gb-btn primary" onClick={saveToVault}>＋ Lưu dự án hiện tại</button></footer></section></div>
      ) : null}

      {showAuditDetails ? (
        <div className="gb-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAuditDetails(false); }}><section className="gb-modal gb-audit-modal"><header><div><span>QUALITY AUDIT REPORT</span><h2>Điểm chất lượng {audit.score}/100</h2><p>Local audit kết hợp kết quả kiểm định AI khi có.</p></div><button type="button" onClick={() => setShowAuditDetails(false)}>×</button></header><div className="gb-audit-detail-grid"><article><strong>{audit.duplicateGroups.length}</strong><span>Duplicate groups</span><p>{audit.duplicateGroups.length ? 'Cần viết lại các stem trùng.' : 'Không phát hiện stem trùng tuyệt đối.'}</p></article><article><strong>{audit.invalidAnswers.length}</strong><span>Invalid answers</span><p>{audit.invalidAnswers.map((item) => item.stem).slice(0, 3).join(' · ') || 'Tất cả đáp án hiện hợp lệ.'}</p></article><article><strong>{audit.ambiguous.length}</strong><span>Ambiguity risks</span><p>{audit.ambiguous.map((item) => item.stem).slice(0, 3).join(' · ') || 'Không có cảnh báo ngữ cảnh.'}</p></article><article><strong>{audit.repeatedWords.length}</strong><span>Repeated content words</span><p>{audit.repeatedWords.map(([word, count]) => `${word} (${count})`).join(', ') || 'Content words đủ đa dạng.'}</p></article></div>{project.aiValidation?.issues?.length ? <div className="gb-ai-issues"><h3>AI findings</h3>{project.aiValidation.issues.map((issue, index) => <div key={`${issue.itemId}-${index}`}><span>{issue.severity}</span><strong>{issue.code}</strong><p>{issue.message}</p><small>{issue.suggestion}</small></div>)}</div> : null}<footer><button type="button" className="gb-btn" onClick={() => setShowAuditDetails(false)}>Đóng</button><button type="button" className="gb-btn primary" onClick={() => runAi('validate')}>✦ Chạy AI Audit</button></footer></section></div>
      ) : null}

      {showPublish ? <div className="gb-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPublish(false); }}><section className="gb-modal gb-publish-modal"><header><div><span>PUBLISH GATE</span><h2>{audit.ready ? 'Sẵn sàng xuất bản' : 'Cần giáo viên kiểm tra'}</h2><p>{audit.ready ? 'Tất cả item đã được duyệt và vượt quality gates.' : 'Bạn vẫn có thể xuất, nhưng nên xử lý các cảnh báo trước.'}</p></div><button type="button" onClick={() => setShowPublish(false)}>×</button></header><div className="gb-publish-gate"><SummaryMetric value={audit.score} label="Quality" /><SummaryMetric value={audit.approved} label={`Approved / ${audit.total}`} /><SummaryMetric value={audit.invalidAnswers.length} label="Answer errors" tone={audit.invalidAnswers.length ? 'bad' : 'good'} /><SummaryMetric value={audit.duplicateGroups.length} label="Duplicates" tone={audit.duplicateGroups.length ? 'bad' : 'good'} /></div><footer><button type="button" className="gb-btn" onClick={() => setShowPublish(false)}>Tiếp tục biên tập</button><button type="button" className="gb-btn primary" onClick={() => { setShowPublish(false); setActiveStage('publish'); }}>Mở Publish Center →</button></footer></section></div> : null}

      <div className="gb-version-dock"><span>Phiên bản</span>{(project.versions || []).slice(0, 3).map((version) => <button type="button" key={version.id} onClick={() => restoreVersion(version)}>{new Date(version.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</button>)}<button type="button" onClick={saveVersion}>＋</button></div>
    </div>
  );
}
