import React, { useEffect, useMemo, useRef, useState } from 'react';
import { spreadsheetToTextSafe } from '../utils/safeSpreadsheet.js';
import { callAI, extractJson } from '../utils/gemini.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { addBankItems, addHistoryEntry, loadBank, loadHistory } from '../utils/library.js';
import { createTransfer, pendingTransferFor, updateTransfer, TRANSFER_APPLY_EVENT } from '../utils/contentTransfer.js';
import {
  WORKSHEET_ACTIVITY_TYPES,
  auditWorksheet,
  buildWorksheetPrompt,
  extractKeywords,
  generateOfflineWorksheet,
  normalizeWorksheet,
  shuffleWorksheet,
  splitSourceUnits,
  worksheetMcqBankItems,
  worksheetToDocxBlob,
  worksheetToHtml,
  worksheetToPlainText,
} from '../utils/worksheetFactory.js';
import './WorksheetFactory.css';

const APP_VERSION = '2.1';
const PROJECT_SCHEMA = 'bes-worksheet-project/2.0';
const TRANSFER_SCHEMA = 'bes-worksheet-pack/2.0';

const WORKFLOW = [
  ['source', '01', 'Nguồn', 'Source'],
  ['intelligence', '02', 'Phân tích', 'Analyse'],
  ['learner', '03', 'Đối tượng', 'Learners'],
  ['blueprint', '04', 'Blueprint', 'Blueprint'],
  ['generate', '05', 'AI tạo', 'Generate'],
  ['editor', '06', 'Biên tập', 'Edit'],
  ['publish', '07', 'Xuất bản', 'Publish'],
];

const BUILD_MODES = [
  { id: 'source-to-worksheet', icon: '⇥', title: 'Source to Worksheet', titleVi: 'Nguồn thành worksheet', desc: 'Turn a document, passage or list into structured activities.', descVi: 'Chuyển tài liệu, bài đọc hoặc danh sách thành hoạt động có cấu trúc.' },
  { id: 'topic-to-worksheet', icon: '✦', title: 'Topic to Worksheet', titleVi: 'Chủ đề thành worksheet', desc: 'Generate a new worksheet from a topic, level and objective.', descVi: 'Tạo worksheet mới từ chủ đề, trình độ và mục tiêu.' },
  { id: 'refine-existing', icon: '✎', title: 'Existing Worksheet Refiner', titleVi: 'Tinh chỉnh worksheet cũ', desc: 'Repair, level, diversify and redesign an existing worksheet.', descVi: 'Sửa lỗi, đổi độ khó, đa dạng và thiết kế lại worksheet cũ.' },
  { id: 'item-bank', icon: '▤', title: 'Item Bank Composer', titleVi: 'Ghép từ Item Bank', desc: 'Compose a worksheet from approved questions in the ecosystem.', descVi: 'Ghép worksheet từ các câu hỏi đã duyệt trong hệ sinh thái.' },
  { id: 'batch', icon: '⧉', title: 'Batch Worksheet Generator', titleVi: 'Tạo worksheet hàng loạt', desc: 'Create variants for classes, levels, units or support needs.', descVi: 'Tạo nhiều phiên bản theo lớp, trình độ, Unit hoặc nhu cầu hỗ trợ.' },
];

const SOURCE_FACETS = [
  ['vocabulary', 'Vocabulary', 'Từ vựng'],
  ['grammar', 'Grammar', 'Ngữ pháp'],
  ['reading', 'Reading passage', 'Bài đọc'],
  ['questions', 'Existing questions', 'Câu hỏi có sẵn'],
  ['examples', 'Examples', 'Ví dụ'],
  ['teacherNotes', 'Teacher notes', 'Ghi chú giáo viên'],
  ['oldAnswers', 'Old answer key', 'Đáp án cũ'],
];

const AI_TASKS = [
  { id: 'analyse', icon: '⌕', title: 'Analyse source', titleVi: 'Phân tích nguồn', descVi: 'Nhận diện chủ đề, CEFR, từ vựng, ngữ pháp và nội dung có thể dùng.' },
  { id: 'blueprint', icon: '▦', title: 'Build blueprint', titleVi: 'Lập blueprint', descVi: 'Phân bố hoạt động, số câu, điểm, thời lượng và độ khó.' },
  { id: 'generate', icon: '✦', title: 'Generate sections', titleVi: 'Tạo từng phần', descVi: 'Tạo tuần tự từng activity để tránh thiếu câu hoặc đứt JSON.' },
  { id: 'transform', icon: '⇄', title: 'Transform activity', titleVi: 'Chuyển đổi hoạt động', descVi: 'Đổi dạng bài, ngữ cảnh hoặc mức độ của phần đang chọn.' },
  { id: 'differentiate', icon: '≋', title: 'Differentiate', titleVi: 'Phân hóa', descVi: 'Tạo bản hỗ trợ, bản chuẩn hoặc bản nâng cao.' },
  { id: 'answers', icon: '✓', title: 'Check answers', titleVi: 'Kiểm tra đáp án', descVi: 'Rà soát đáp án, phương án nhiễu và câu có thể mơ hồ.' },
  { id: 'duplicates', icon: '◎', title: 'Remove duplicates', titleVi: 'Loại câu trùng', descVi: 'Phát hiện câu trùng và content-word repetition.' },
  { id: 'custom', icon: '⌁', title: 'Custom request', titleVi: 'Yêu cầu riêng', descVi: 'Giao một nhiệm vụ chuyên môn cụ thể cho AI.' },
];

const DESTINATIONS = [
  { id: 'lesson-architect', route: '#/tool/lesson-architect', icon: 'LA', label: 'Lesson Architect', desc: 'Objectives, practice, homework and evidence.' },
  { id: 'grammar-builder', route: '#/tool/grammar-builder', icon: 'GB', label: 'Grammar Builder', desc: 'Grammar items, error patterns and explanations.' },
  { id: 'reading-studio', route: '#/tool/reading-studio', icon: 'RS', label: 'Reading Studio', desc: 'Reading passages, cloze and graphic organisers.' },
  { id: 'writing-studio', route: '#/tool/writing-studio', icon: 'WS', label: 'Writing Studio', desc: 'Planning sheets, checklists and peer review.' },
  { id: 'pronunciation-coach', route: '#/tool/pronunciation-coach', icon: 'PC', label: 'Pronunciation Coach', desc: 'Word lists, stress and minimal-pair practice.' },
  { id: 'exam-studio', route: '#/tool/exam-studio', icon: 'EX', label: 'Exam Studio', desc: 'Approved items, blueprint and answer key.' },
  { id: 'activity-studio', route: '#/tool/activity-studio', icon: 'AS', label: 'Activity Studio', desc: 'Matching, sorting, quiz and team challenge.' },
  { id: 'english-lesson-integration', route: '#/tool/english-lesson-integration', icon: 'EL', label: 'AI Lesson Integration', desc: 'Place the worksheet in a lesson activity.' },
];

const LAYOUTS = [
  ['clean-academic', 'Clean Academic'],
  ['modern-saas', 'Modern SaaS Worksheet'],
  ['soft-editorial', 'Soft Editorial'],
  ['exam-format', 'Exam Format'],
  ['minimal-print', 'Minimal Black & White'],
  ['colour-classroom', 'Colour Classroom'],
  ['dyslexia-friendly', 'Dyslexia-friendly'],
  ['compact', 'Compact Printing'],
];

const SAMPLE_SOURCE = `Artificial intelligence is changing education by helping teachers differentiate materials, provide faster feedback and analyse learning patterns. Effective use still requires clear objectives, careful checking and respect for student privacy. AI should support professional judgement rather than replace it. Students also need guidance to use digital tools responsibly while continuing to develop independent thinking.`;


const SOURCE_INPUT_MODES = [
  { id: 'manual', icon: '✎', label: 'Dán / Upload', desc: 'Dùng văn bản, file hoặc worksheet có sẵn.' },
  { id: 'keywords', icon: '✦', label: 'Từ khóa → AI', desc: 'Nhập từ khóa để AI viết nội dung nguồn mới.' },
  { id: 'item-bank', icon: '▤', label: 'Item Bank', desc: 'Nạp câu hỏi đã được duyệt.' },
  { id: 'transfer', icon: '⇥', label: 'Transfer Inbox', desc: 'Nhận nội dung từ ứng dụng khác.' },
];

const SOURCE_CONTENT_TYPES = [
  ['reading-passage', 'Bài đọc thông tin'],
  ['exam-passage', 'Đoạn đọc kiểu đề thi THPT'],
  ['contextual-text', 'Ngữ cảnh luyện từ vựng – ngữ pháp'],
  ['dialogue', 'Hội thoại tình huống'],
  ['mini-case', 'Tình huống / mini case study'],
  ['vocabulary-context', 'Bài đọc giàu từ vựng mục tiêu'],
];

const SOURCE_LENGTHS = [
  ['short', '150–200 từ', 180, 560, 150, 210],
  ['medium', '250–350 từ', 300, 900, 250, 370],
  ['long', '400–550 từ', 480, 1350, 400, 580],
  ['extended', '600–800 từ', 700, 1900, 600, 840],
];

function uid(prefix = 'wf') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeText(value = '') { return String(value ?? '').trim(); }
function safeFileName(value = 'worksheet') {
  return safeText(value || 'worksheet').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'worksheet';
}
function countWords(value = '') { return safeText(value) ? safeText(value).split(/\s+/).length : 0; }
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function downloadText(content, filename, mime = 'text/plain;charset=utf-8') { downloadBlob(new Blob([content], { type: mime }), filename); }
function scopedKey(currentUser) { return `bes-worksheet-factory-v2:${String(currentUser?.id || currentUser?.email || 'guest').replace(/[^a-z0-9@._-]+/gi, '-')}`; }
function stripHtml(html = '') { return new DOMParser().parseFromString(html, 'text/html').body?.innerText || ''; }

function cleanGeneratedSource(value = '') {
  return safeText(value)
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^#+\s*/gm, '')
    .trim();
}
function keywordList(value = '') {
  return [...new Set(String(value).split(/[\n,;|]+/).map((item) => safeText(item)).filter(Boolean))].slice(0, 24);
}

async function readPptxText(arrayBuffer) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
  const chunks = [];
  for (const fileName of slides.slice(0, 80)) {
    const xml = await zip.file(fileName)?.async('text');
    if (!xml) continue;
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const lines = [...doc.getElementsByTagNameNS('*', 't')].map((node) => node.textContent || '').filter(Boolean);
    if (lines.length) chunks.push(lines.join('\n'));
  }
  return chunks.join('\n\n');
}
async function readSourceFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const buffer = await file.arrayBuffer();
  if (extension === 'pdf') return readPdfTextFromBuffer(buffer, { maxPages: 60, maxChars: 150000 });
  if (extension === 'docx') return readDocxTextFromBuffer(buffer);
  if (extension === 'pptx') return readPptxText(buffer);
  if (['xlsx', 'xls'].includes(extension)) return spreadsheetToTextSafe(buffer, { maxSheets: 12, maxRows: 4000 });
  const raw = await file.text();
  if (['html', 'htm'].includes(extension)) return stripHtml(raw);
  return raw;
}

function estimateCefr(source = '') {
  const words = safeText(source).toLowerCase().match(/[a-z'-]+/g) || [];
  if (!words.length) return 'B1';
  const average = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const complex = words.filter((word) => word.length >= 9).length / words.length;
  if (average >= 6.5 || complex >= 0.19) return 'C1';
  if (average >= 5.5 || complex >= 0.12) return 'B2';
  if (average >= 4.7) return 'B1';
  return 'A2';
}

function detectSourceType(source = '', name = '') {
  const text = `${name}\n${source}`.toLowerCase();
  if (/answer key|đáp án|correct answer/.test(text)) return 'worksheet-with-key';
  if (/question\s*\d|câu\s*\d|a\.|b\.|c\.|d\./.test(text)) return 'existing-worksheet';
  if (/objectives|procedures|warm-up|lesson plan|giáo án/.test(text)) return 'lesson-plan';
  if (/transcript|speaker|audio|listening/.test(text)) return 'transcript';
  if (source.split(/\n+/).filter(Boolean).length > 15 && source.split(/\n+/).filter((line) => line.trim().split(/\s+/).length <= 5).length > 8) return 'vocabulary-list';
  if (source.length >= 1200) return 'reading-passage';
  return 'mixed-source';
}

function offlineSourceIntelligence(source = '', sourceName = '') {
  const units = splitSourceUnits(source);
  const keywords = extractKeywords(source, 20);
  const grammar = [];
  const rules = [
    [/\b(has|have|had)\s+\w+(ed|en)\b/i, 'Perfect aspects'],
    [/\b(is|are|was|were|be|been)\s+\w+ed\b/i, 'Passive voice'],
    [/\b(if|unless|provided that)\b/i, 'Conditionals'],
    [/\bwho|which|that|whose|where\b/i, 'Relative clauses'],
    [/\bshould|must|might|could|can|may\b/i, 'Modal verbs'],
    [/\bto\s+\w+|\w+ing\b/i, 'Verb patterns'],
  ];
  rules.forEach(([pattern, label]) => { if (pattern.test(source)) grammar.push(label); });
  const type = detectSourceType(source, sourceName);
  const skills = type === 'reading-passage' ? ['Reading', 'Vocabulary', 'Grammar in context'] : type === 'vocabulary-list' ? ['Vocabulary', 'Word formation'] : type === 'existing-worksheet' ? ['Assessment', 'Revision'] : ['Vocabulary', 'Grammar', 'Reading'];
  const issues = [];
  if (/�|\u0000/.test(source)) issues.push('Possible OCR or encoding errors');
  if (countWords(source) < 80) issues.push('Source is short; AI may need to create additional context');
  if (countWords(source) > 7000) issues.push('Source is long; select only the relevant facets');
  const recommended = type === 'vocabulary-list'
    ? ['matching', 'vocabulary_context', 'word_formation', 'collocation_matching']
    : type === 'existing-worksheet'
      ? ['multiple_choice', 'error_correction', 'editing_task', 'reflection_exit_ticket']
      : ['reading_comprehension', 'multiple_choice', 'gap_fill', 'true_false'];
  return {
    sourceType: type,
    topic: keywords.slice(0, 4).join(' · ') || sourceName || 'General English',
    level: estimateCefr(source),
    keywords,
    grammar: grammar.length ? grammar : ['Grammar in context'],
    skills,
    units: units.slice(0, 12),
    existingQuestionCount: (source.match(/(?:question|câu)\s*\d+/gi) || []).length,
    issues,
    recommendedTypes: recommended,
    wordCount: countWords(source),
    characterCount: source.length,
    analysedAt: Date.now(),
  };
}

function buildDefaultBlueprint(intelligence, mode = 'source-to-worksheet') {
  const types = intelligence?.recommendedTypes?.length ? intelligence.recommendedTypes : ['multiple_choice', 'gap_fill', 'reading_comprehension', 'reflection_exit_ticket'];
  const modeTypes = mode === 'item-bank' ? ['multiple_choice', 'gap_fill', 'error_correction'] : mode === 'batch' ? ['multiple_choice', 'gap_fill', 'sentence_transformation', 'cloze'] : types;
  return [...new Set(modeTypes)].slice(0, 6).map((type, index) => ({
    id: uid('plan'), type, count: index === 0 ? 8 : 6, points: index === 0 ? 2 : 1, difficulty: index === 0 ? 'B1-B2' : 'B2', status: 'planned', generated: false,
  }));
}

function defaultProject() {
  const intelligence = offlineSourceIntelligence(SAMPLE_SOURCE, 'AI in Education — sample');
  return {
    schema: PROJECT_SCHEMA,
    id: uid('project'),
    title: 'AI in Education — Structured Learning Pack',
    stage: 'source',
    status: 'draft',
    mode: 'source-to-worksheet',
    sourceName: 'AI in Education — sample',
    sourceInputMode: 'manual',
    sourceKind: 'text',
    sourceText: SAMPLE_SOURCE,
    sourceKeywords: '',
    sourceGeneration: {
      contentType: 'reading-passage',
      length: 'medium',
      tone: 'Học thuật, rõ ràng và phù hợp học sinh THPT',
      language: 'English',
      instruction: 'Nội dung có bố cục mạch lạc, giàu ngữ cảnh và phù hợp để tạo nhiều dạng bài.',
      engine: 'manual',
      provider: '',
      model: '',
      generatedAt: null,
    },
    sourceFacets: ['vocabulary', 'grammar', 'reading', 'questions'],
    intelligence,
    learner: { grade: '12', level: 'B2', book: 'Global Success', unit: '', topic: 'AI in Education', minutes: 45, useCase: 'In-class practice', grouping: 'Individual / pairs', language: 'English + Vietnamese instructions', notes: 'Lớp có chênh lệch trình độ; ưu tiên ngữ cảnh rõ và thời lượng khả thi.' },
    blueprint: buildDefaultBlueprint(intelligence),
    qualityRules: ['no-duplicates', 'one-answer', 'source-grounded', 'explanations', 'balanced-thinking', 'time-fit'],
    answerMode: 'explanations-bilingual',
    answerPosition: 'teacher-edition',
    layout: 'clean-academic',
    worksheet: null,
    versions: [],
    selectedActivityId: '',
    selectedItemId: '',
    batch: { variants: 1, levels: ['B2'], classNames: [] },
    customInstruction: 'Không trùng câu; phương án nhiễu hợp lí; bám sát nội dung nguồn và mục tiêu THPT.',
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

function normalizeProject(raw) {
  const base = defaultProject();
  if (!raw || typeof raw !== 'object') return base;
  const project = { ...base, ...raw, learner: { ...base.learner, ...(raw.learner || {}) }, batch: { ...base.batch, ...(raw.batch || {}) }, sourceGeneration: { ...base.sourceGeneration, ...(raw.sourceGeneration || {}) } };
  project.sourceInputMode = raw.sourceInputMode || (raw.sourceKind === 'item-bank' ? 'item-bank' : raw.sourceKind === 'transfer' ? 'transfer' : 'manual');
  project.sourceKeywords = safeText(raw.sourceKeywords || '');
  project.sourceFacets = Array.isArray(raw.sourceFacets) ? raw.sourceFacets : base.sourceFacets;
  project.blueprint = Array.isArray(raw.blueprint) ? raw.blueprint : base.blueprint;
  project.qualityRules = Array.isArray(raw.qualityRules) ? raw.qualityRules : base.qualityRules;
  project.versions = Array.isArray(raw.versions) ? raw.versions.slice(0, 20) : [];
  project.worksheet = raw.worksheet ? normalizeWorksheet(raw.worksheet, { language: 'vi' }) : null;
  return project;
}

function difficultyCounts(blueprint = []) {
  const total = blueprint.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1;
  const weights = { A2: 0, B1: 0, B2: 0, C1: 0 };
  blueprint.forEach((item) => {
    const label = String(item.difficulty || 'B2');
    if (label.includes('A2')) weights.A2 += item.count;
    if (label.includes('B1')) weights.B1 += item.count;
    if (label.includes('B2')) weights.B2 += item.count;
    if (label.includes('C1')) weights.C1 += item.count;
  });
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Math.round((value / total) * 100)]));
}

function activityLabel(type, language = 'vi') {
  const item = WORKSHEET_ACTIVITY_TYPES.find((entry) => entry.id === type);
  return language === 'vi' ? item?.labelVi || type : item?.label || type;
}

function mergeActivities(currentWorksheet, activities, project, language) {
  return normalizeWorksheet({
    ...(currentWorksheet || {}),
    id: currentWorksheet?.id || uid('worksheet'),
    title: project.title,
    subtitle: `${project.learner.level} · Grade ${project.learner.grade} · ${project.learner.topic || project.intelligence.topic}`,
    level: project.learner.level,
    audience: `Grade ${project.learner.grade}`,
    topic: project.learner.topic || project.intelligence.topic,
    estimatedMinutes: project.learner.minutes,
    teacherNotes: language === 'vi' ? 'Giáo viên cần kiểm tra và duyệt từng hoạt động trước khi xuất bản.' : 'Review and approve each activity before publishing.',
    activities,
  }, { language });
}

function detailedAudit(project, worksheet) {
  const base = worksheet ? auditWorksheet(worksheet) : { score: 0, totalItems: 0, activityCount: 0, exactDuplicates: [], nearDuplicates: [], missingAnswers: [], invalidOptions: [], passed: false };
  const source = safeText(project.sourceText).toLowerCase();
  const items = worksheet?.activities?.flatMap((activity) => activity.items || []) || [];
  let aligned = 0;
  items.forEach((item) => {
    const tokens = extractKeywords(`${item.prompt} ${item.answer}`, 8).map((word) => word.toLowerCase());
    if (!tokens.length || tokens.some((token) => source.includes(token))) aligned += 1;
  });
  const sourceAlignment = items.length ? Math.round((aligned / items.length) * 100) : 0;
  const expectedItems = project.blueprint.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const countAccuracy = expectedItems ? Math.max(0, 100 - Math.abs(expectedItems - items.length) * 4) : 100;
  const estimatedPages = Math.max(1, Math.ceil((items.length + (worksheet?.activities?.length || 0) * 2) / 12));
  const issues = [];
  base.exactDuplicates.forEach(([a, b]) => issues.push({ level: 'error', title: `Câu ${a} và ${b} trùng hoàn toàn`, action: 'Viết lại hoặc xóa một câu.' }));
  base.nearDuplicates.slice(0, 8).forEach(([a, b]) => issues.push({ level: 'warning', title: `Câu ${a} và ${b} gần giống nhau`, action: 'Thay ngữ cảnh hoặc cấu trúc câu.' }));
  if (base.missingAnswers.length) issues.push({ level: 'error', title: `${base.missingAnswers.length} câu thiếu đáp án`, action: 'Bổ sung đáp án trước khi xuất.' });
  if (base.invalidOptions.length) issues.push({ level: 'error', title: `${base.invalidOptions.length} câu có options chưa hợp lệ`, action: 'Kiểm tra phương án và đáp án đúng.' });
  if (sourceAlignment < 65 && items.length) issues.push({ level: 'warning', title: 'Một số câu chưa bám rõ nguồn', action: 'Chạy Source alignment hoặc viết lại phần liên quan.' });
  if (estimatedPages > 6) issues.push({ level: 'info', title: `Worksheet ước tính ${estimatedPages} trang`, action: 'Cân nhắc Compact Printing hoặc giảm số câu.' });
  const score = Math.round(base.score * 0.62 + sourceAlignment * 0.22 + countAccuracy * 0.16);
  return { ...base, score, sourceAlignment, countAccuracy, expectedItems, estimatedPages, issues, printReady: score >= 82 && !base.missingAnswers.length && !base.invalidOptions.length };
}

function downloadProject(project) { downloadText(JSON.stringify(project, null, 2), `${safeFileName(project.title)}.worksheet-project.json`, 'application/json;charset=utf-8'); }

function Metric({ icon, label, value }) { return <div className="wf2-metric"><i>{icon}</i><div><span>{label}</span><strong title={String(value)}>{value}</strong></div></div>; }

function CardHeading({ number, kicker, title, description, action }) {
  return <header className="wf2-card-heading"><span className="wf2-card-number">{number}</span><div><small>{kicker}</small><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action ? <div className="wf2-card-action">{action}</div> : null}</header>;
}

function ChoiceCard({ active, icon, title, description, onClick }) {
  return <button type="button" className={`wf2-choice ${active ? 'active' : ''}`} onClick={onClick}><i>{icon}</i><span><strong>{title}</strong><small>{description}</small></span><b>{active ? '✓' : ''}</b></button>;
}

function Workflow({ stage, setStage, hasWorksheet }) {
  return <nav className="wf2-workflow" aria-label="Worksheet Factory workflow">{WORKFLOW.map(([id, number, vi]) => {
    const disabled = ['editor', 'publish'].includes(id) && !hasWorksheet;
    return <button key={id} type="button" disabled={disabled} className={stage === id ? 'active' : ''} onClick={() => !disabled && setStage(id)}><i>{number}</i><span>{vi}</span></button>;
  })}</nav>;
}

function SourceCard({ project, patch, onFile, fileBusy, pendingTransfer, applyTransfer, onLoadItemBank, onGenerateFromKeywords, busy, hasApiKey, providerName }) {
  const fileRef = useRef(null);
  const mode = project.sourceInputMode || 'manual';
  const generation = project.sourceGeneration || {};
  const keywords = keywordList(project.sourceKeywords);
  const setMode = (nextMode) => patch({ sourceInputMode: nextMode, sourceKind: nextMode === 'item-bank' ? 'item-bank' : nextMode === 'transfer' ? 'transfer' : nextMode === 'keywords' ? 'keywords' : project.sourceKind === 'ai-keywords' ? 'text' : project.sourceKind });
  const patchGeneration = (change) => patch({ sourceGeneration: { ...generation, ...change } });

  return <section className="wf2-card wf2-source-card" id="wf2-source"><CardHeading number="01" kicker="SOURCE & INPUT" title="Nguồn & Input" description="Chọn cách cung cấp nguồn: dán tài liệu, tải file, nhập từ khóa để AI viết nội dung hoặc lấy từ hệ sinh thái." />
    <div className="wf2-source-mode-tabs">{SOURCE_INPUT_MODES.map((item) => <button type="button" key={item.id} className={mode === item.id ? 'active' : ''} onClick={() => setMode(item.id)}><i>{item.icon}</i><span><strong>{item.label}</strong><small>{item.desc}</small></span>{mode === item.id ? <b>✓</b> : null}</button>)}</div>

    {pendingTransfer ? <div className="wf2-transfer"><div><strong>Nội dung từ {pendingTransfer.sourceTitle}</strong><span>{pendingTransfer.title}</span></div><button type="button" onClick={applyTransfer}>Dùng nội dung</button><button type="button" onClick={() => patch({ pendingTransferDismiss: true })}>Bỏ qua</button></div> : null}

    {mode === 'manual' ? <div className="wf2-source-panel">
      <div className="wf2-source-actions"><select value={project.sourceKind === 'ai-keywords' ? 'text' : project.sourceKind} onChange={(event) => patch({ sourceKind: event.target.value })}><option value="text">Văn bản / bài đọc</option><option value="vocabulary">Danh sách từ</option><option value="worksheet">Worksheet cũ</option><option value="lesson-plan">Giáo án</option><option value="topic">Chỉ nhập chủ đề</option></select><button type="button" onClick={() => fileRef.current?.click()}>{fileBusy ? 'Đang đọc…' : '↑ Upload DOCX / PDF / PPTX / XLSX'}</button><input ref={fileRef} hidden type="file" accept=".docx,.pdf,.pptx,.xlsx,.xls,.txt,.md,.csv,.json,.html,.htm" onChange={(event) => onFile(event.target.files?.[0])} /></div>
    </div> : null}

    {mode === 'keywords' ? <div className="wf2-keyword-source">
      <header><div><span className="wf2-ai-source-badge">✦ AI SOURCE WRITER</span><h3>Nhập từ khóa, AI tạo nội dung nguồn</h3><p>AI chỉ viết phần nội dung nền. Worksheet và câu hỏi vẫn được tạo ở các bước sau.</p></div><span className={hasApiKey ? 'ready' : 'not-ready'}>{hasApiKey ? `● ${providerName} sẵn sàng` : '○ Chưa có API key'}</span></header>
      <label className="wf2-field"><span>Từ khóa / ý chính <b>*</b></span><textarea rows={4} value={project.sourceKeywords} onChange={(event) => patch({ sourceKeywords: event.target.value })} placeholder="Ví dụ: climate resilience, renewable energy, urban flooding, individual responsibility" /><small>{keywords.length}/24 từ khóa · có thể ngăn cách bằng dấu phẩy hoặc xuống dòng</small></label>
      <div className="wf2-form-grid two wf2-keyword-options"><label className="wf2-field"><span>Dạng nội dung</span><select value={generation.contentType} onChange={(event) => patchGeneration({ contentType: event.target.value })}>{SOURCE_CONTENT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="wf2-field"><span>Độ dài</span><select value={generation.length} onChange={(event) => patchGeneration({ length: event.target.value })}>{SOURCE_LENGTHS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="wf2-field"><span>Giọng văn</span><select value={generation.tone} onChange={(event) => patchGeneration({ tone: event.target.value })}><option>Học thuật, rõ ràng và phù hợp học sinh THPT</option><option>Thân thiện, dễ hiểu nhưng vẫn ở mức B2–C1</option><option>Trang trọng theo phong cách đề thi THPT</option><option>Tự nhiên, giàu ngữ cảnh và có tính gợi mở</option></select></label><label className="wf2-field"><span>Ngôn ngữ nguồn</span><select value={generation.language} onChange={(event) => patchGeneration({ language: event.target.value })}><option>English</option><option>English with short Vietnamese glossary</option><option>Bilingual English–Vietnamese</option></select></label></div>
      <label className="wf2-field"><span>Yêu cầu bổ sung</span><textarea rows={3} value={generation.instruction} onChange={(event) => patchGeneration({ instruction: event.target.value })} placeholder="Ví dụ: không lặp từ khóa quá nhiều, có ví dụ thực tế, tránh dữ kiện cần cập nhật theo thời gian…" /></label>
      <div className="wf2-keyword-generate-row"><div><strong>Đầu ra dự kiến</strong><span>Grade {project.learner.grade} · {project.learner.level} · {SOURCE_CONTENT_TYPES.find(([id]) => id === generation.contentType)?.[1]}</span></div>{!hasApiKey ? <button type="button" className="wf2-provider-link" onClick={() => { window.location.hash = '#/settings'; }}>Mở AI Provider Hub</button> : null}<button type="button" className="wf2-primary" onClick={onGenerateFromKeywords} disabled={busy || !keywords.length || !hasApiKey}>{busy ? 'AI đang viết nguồn…' : '✦ AI tạo nội dung nguồn'}</button></div>
      {generation.engine === 'ai' && project.sourceKind === 'ai-keywords' ? <div className="wf2-source-provenance"><span>✓ Nội dung do AI tạo</span><b>{generation.provider || providerName}</b><small>{generation.model || ''}</small></div> : null}
    </div> : null}

    {mode === 'item-bank' ? <div className="wf2-source-special"><i>▤</i><div><h3>Nguồn từ Item Bank</h3><p>Nạp tối đa 120 câu đã duyệt để tái cấu trúc thành worksheet mới.</p></div><button type="button" onClick={onLoadItemBank}>Nạp Item Bank</button></div> : null}
    {mode === 'transfer' ? <div className="wf2-source-special"><i>⇥</i><div><h3>Transfer Inbox</h3><p>Nội dung được gửi từ Lesson Architect, Reading Studio hoặc ứng dụng khác sẽ xuất hiện tại đây.</p></div>{pendingTransfer ? <button type="button" onClick={applyTransfer}>Dùng nội dung đang chờ</button> : <span>Chưa có nội dung đang chờ</span>}</div> : null}

    <div className="wf2-source-editor">
      <label className="wf2-field"><span>Tên nguồn</span><input value={project.sourceName} onChange={(event) => patch({ sourceName: event.target.value })} placeholder="Ví dụ: Unit 3 — Environment and Climate" /></label>
      <label className="wf2-field"><span>Nội dung nguồn</span><textarea data-transfer-target="primary" rows={12} value={project.sourceText} onChange={(event) => patch({ sourceText: event.target.value, sourceGeneration: { ...generation, engine: project.sourceKind === 'ai-keywords' ? 'ai-edited' : generation.engine } })} placeholder={mode === 'keywords' ? 'Nội dung do AI tạo sẽ xuất hiện tại đây để thầy chỉnh sửa trước khi phân tích.' : 'Dán văn bản, câu hỏi, từ vựng hoặc ghi chú tại đây…'} /></label>
    </div>
    <footer className="wf2-card-footer"><div className="wf2-inline-actions"><button type="button" onClick={() => patch({ sourceText: SAMPLE_SOURCE, sourceName: 'AI in Education — sample', sourceInputMode: 'manual', sourceKind: 'text', intelligence: offlineSourceIntelligence(SAMPLE_SOURCE, 'AI in Education — sample') })}>Dùng sample</button><button type="button" onClick={() => patch({ sourceText: '', sourceName: '', sourceKeywords: '', sourceKind: mode === 'keywords' ? 'keywords' : 'text', intelligence: offlineSourceIntelligence('', ''), sourceGeneration: { ...generation, engine: 'manual', generatedAt: null } })}>Xóa nguồn</button></div><span>{countWords(project.sourceText).toLocaleString()} từ · {project.sourceText.length.toLocaleString()} ký tự</span></footer>
  </section>;
}
function SourceIntelligenceCard({ project, patch, analyseSource, busy }) {
  const intel = project.intelligence || {};
  return <section className="wf2-card" id="wf2-intelligence"><CardHeading number="02" kicker="SOURCE INTELLIGENCE" title="Phân tích nguồn thông minh" description="Chọn đúng phần được phép sử dụng thay vì lấy toàn bộ file một cách mù quáng." action={<button type="button" onClick={analyseSource} disabled={busy}>✦ {busy ? 'Đang phân tích…' : 'AI phân tích'}</button>} />
    <div className="wf2-intel-overview"><Metric icon="▣" label="Loại nguồn" value={intel.sourceType || '—'} /><Metric icon="A+" label="CEFR ước tính" value={intel.level || '—'} /><Metric icon="#" label="Từ" value={(intel.wordCount || 0).toLocaleString()} /><Metric icon="?" label="Câu hỏi sẵn có" value={intel.existingQuestionCount || 0} /></div>
    <div className="wf2-intel-columns"><div><h3>Chủ đề & từ khóa</h3><p className="wf2-intel-topic">{intel.topic || 'Chưa phân tích'}</p><div className="wf2-chips">{(intel.keywords || []).slice(0, 12).map((item) => <span key={item}>{item}</span>)}</div></div><div><h3>Grammar & kỹ năng</h3><div className="wf2-chips accent">{[...(intel.grammar || []), ...(intel.skills || [])].slice(0, 10).map((item) => <span key={item}>{item}</span>)}</div>{intel.issues?.length ? <ul className="wf2-intel-issues">{intel.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="wf2-ok">✓ Không phát hiện lỗi nguồn nghiêm trọng.</p>}</div></div>
    <h3>Nội dung được phép sử dụng</h3><div className="wf2-facet-grid">{SOURCE_FACETS.map(([id, en, vi]) => <label key={id} className={project.sourceFacets.includes(id) ? 'active' : ''}><input type="checkbox" checked={project.sourceFacets.includes(id)} onChange={() => patch({ sourceFacets: project.sourceFacets.includes(id) ? project.sourceFacets.filter((item) => item !== id) : [...project.sourceFacets, id] })} /><span>{vi}</span><small>{en}</small></label>)}</div>
  </section>;
}

function LearnerCard({ project, patchLearner }) {
  const learner = project.learner;
  return <section className="wf2-card" id="wf2-learner"><CardHeading number="03" kicker="LEARNER & OBJECTIVES" title="Đối tượng & mục tiêu" description="Cấu hình worksheet theo đúng lớp, thời lượng, mục tiêu và điều kiện sử dụng." />
    <div className="wf2-form-grid two"><label className="wf2-field"><span>Khối</span><select value={learner.grade} onChange={(e) => patchLearner({ grade: e.target.value })}><option>10</option><option>11</option><option>12</option></select></label><label className="wf2-field"><span>CEFR</span><select value={learner.level} onChange={(e) => patchLearner({ level: e.target.value })}><option>A2</option><option>B1</option><option>B2</option><option>B2-C1</option><option>C1</option></select></label><label className="wf2-field"><span>Bộ sách</span><select value={learner.book} onChange={(e) => patchLearner({ book: e.target.value })}><option>Global Success</option><option>Bright</option><option>Friends Global</option><option>i-Learn Smart World</option><option>Tự biên soạn</option></select></label><label className="wf2-field"><span>Unit / chủ đề</span><input value={learner.unit} onChange={(e) => patchLearner({ unit: e.target.value })} placeholder="Unit 3 / Environment" /></label><label className="wf2-field"><span>Thời lượng</span><input type="number" min="10" max="180" value={learner.minutes} onChange={(e) => patchLearner({ minutes: Number(e.target.value) || 45 })} /></label><label className="wf2-field"><span>Mục đích sử dụng</span><select value={learner.useCase} onChange={(e) => patchLearner({ useCase: e.target.value })}><option>In-class practice</option><option>Homework</option><option>Quick assessment</option><option>THPT exam practice</option><option>Remediation</option><option>Gifted students</option></select></label><label className="wf2-field"><span>Hình thức</span><select value={learner.grouping} onChange={(e) => patchLearner({ grouping: e.target.value })}><option>Individual</option><option>Pairs</option><option>Groups</option><option>Individual / pairs</option><option>Whole class</option></select></label><label className="wf2-field"><span>Ngôn ngữ</span><select value={learner.language} onChange={(e) => patchLearner({ language: e.target.value })}><option>English only</option><option>English + Vietnamese instructions</option><option>Bilingual</option></select></label></div>
    <label className="wf2-field"><span>Đặc điểm lớp học</span><textarea rows={4} value={learner.notes} onChange={(e) => patchLearner({ notes: e.target.value })} /></label>
  </section>;
}

function BuildModeCard({ project, patch }) {
  return <section className="wf2-card" id="wf2-mode"><CardHeading number="00" kicker="BUILD MODE" title="Chọn cơ chế tạo" description="Mỗi chế độ thay đổi cách phân tích, blueprint và đầu ra." />
    <div className="wf2-choice-grid">{BUILD_MODES.map((mode) => <ChoiceCard key={mode.id} active={project.mode === mode.id} icon={mode.icon} title={mode.titleVi} description={mode.descVi} onClick={() => patch({ mode: mode.id, blueprint: buildDefaultBlueprint(project.intelligence, mode.id) })} />)}</div>
  </section>;
}

function BlueprintCard({ project, patch, rebuildBlueprint, runTask, busy }) {
  const blueprint = project.blueprint || [];
  const totalItems = blueprint.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const totalPoints = blueprint.reduce((sum, item) => sum + Number(item.count || 0) * Number(item.points || 0), 0);
  const distribution = difficultyCounts(blueprint);
  const updatePlan = (id, change) => patch({ blueprint: blueprint.map((item) => item.id === id ? { ...item, ...change } : item) });
  const addPlan = () => patch({ blueprint: [...blueprint, { id: uid('plan'), type: 'multiple_choice', count: 5, points: 1, difficulty: project.learner.level, status: 'planned', generated: false }] });
  return <section className="wf2-card" id="wf2-blueprint"><CardHeading number="05" kicker="WORKSHEET BLUEPRINT" title="Thiết kế cấu trúc đầu ra" description="Kiểm soát số phần, số câu, điểm, độ khó và trạng thái tạo." action={<div className="wf2-inline-actions"><button type="button" onClick={rebuildBlueprint}>↻ Đề xuất lại</button><button type="button" onClick={() => runTask('blueprint')} disabled={busy}>✦ AI blueprint</button></div>} />
    <div className="wf2-blueprint-metrics"><Metric icon="≡" label="Số phần" value={blueprint.length} /><Metric icon="#" label="Số câu" value={totalItems} /><Metric icon="★" label="Tổng điểm" value={totalPoints} /><Metric icon="◷" label="Thời lượng" value={`${project.learner.minutes} phút`} /></div>
    <div className="wf2-plan-table"><div className="wf2-plan-head"><span>Dạng bài</span><span>Số câu</span><span>Điểm/câu</span><span>Độ khó</span><span>Trạng thái</span><span /></div>{blueprint.map((plan, index) => <div className="wf2-plan-row" key={plan.id}><select value={plan.type} onChange={(e) => updatePlan(plan.id, { type: e.target.value, generated: false, status: 'planned' })}>{WORKSHEET_ACTIVITY_TYPES.map((type) => <option key={type.id} value={type.id}>{activityLabel(type.id)}</option>)}</select><input type="number" min="1" max="30" value={plan.count} onChange={(e) => updatePlan(plan.id, { count: Math.max(1, Number(e.target.value) || 1) })} /><input type="number" min="0" max="10" step="0.25" value={plan.points} onChange={(e) => updatePlan(plan.id, { points: Number(e.target.value) || 0 })} /><select value={plan.difficulty} onChange={(e) => updatePlan(plan.id, { difficulty: e.target.value })}><option>A2</option><option>B1</option><option>B1-B2</option><option>B2</option><option>B2-C1</option><option>C1</option></select><span className={`wf2-status ${plan.status}`}>{plan.status === 'teacher-approved' ? 'Đã duyệt' : plan.generated ? 'AI Draft' : 'Planned'}</span><button type="button" aria-label={`Xóa phần ${index + 1}`} onClick={() => patch({ blueprint: blueprint.filter((item) => item.id !== plan.id) })}>×</button></div>)}</div>
    <button type="button" className="wf2-add-row" onClick={addPlan}>＋ Thêm hoạt động</button>
    <div className="wf2-difficulty"><h3>Phân bố độ khó</h3>{Object.entries(distribution).filter(([, value]) => value).map(([level, value]) => <div key={level}><span>{level}</span><b>{value}%</b><i><u style={{ width: `${value}%` }} /></i></div>)}</div>
    {project.mode === 'batch' ? <div className="wf2-batch-settings"><h3>Batch variants</h3><div className="wf2-form-grid two"><label className="wf2-field"><span>Số phiên bản</span><input type="number" min="2" max="12" value={project.batch.variants} onChange={(event) => patch({ batch: { ...project.batch, variants: Math.max(2, Math.min(12, Number(event.target.value) || 2)) } })} /></label><label className="wf2-field"><span>Mã lớp / tên phiên bản</span><input value={project.batch.classNames.join(', ')} onChange={(event) => patch({ batch: { ...project.batch, classNames: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="12A1, 12A2, Support" /></label></div><div className="wf2-chips accent">{['A2','B1','B2','C1'].map((level) => <button type="button" key={level} className={project.batch.levels.includes(level) ? 'active' : ''} onClick={() => patch({ batch: { ...project.batch, levels: project.batch.levels.includes(level) ? project.batch.levels.filter((item) => item !== level) : [...project.batch.levels, level] } })}>{level}</button>)}</div></div> : null}
    <div className="wf2-blueprint-options"><label className="wf2-field"><span>Loại đáp án</span><select value={project.answerMode} onChange={(e) => patch({ answerMode: e.target.value })}><option value="key-only">Chỉ đáp án</option><option value="explanations">Đáp án + giải thích</option><option value="explanations-bilingual">Giải thích song ngữ</option></select></label><label className="wf2-field"><span>Vị trí đáp án</span><select value={project.answerPosition} onChange={(e) => patch({ answerPosition: e.target.value })}><option value="teacher-edition">Teacher edition riêng</option><option value="end">Cuối tài liệu</option><option value="after-item">Sau từng câu</option></select></label><label className="wf2-field"><span>Yêu cầu chuyên môn</span><textarea rows={3} value={project.customInstruction} onChange={(e) => patch({ customInstruction: e.target.value })} /></label></div>
    <h3>Quy tắc chất lượng</h3><div className="wf2-rule-grid">{[['no-duplicates','Không trùng câu'],['one-answer','Chỉ một đáp án đúng'],['source-grounded','Bám nguồn'],['explanations','Có giải thích'],['balanced-thinking','Cân bằng tư duy'],['time-fit','Phù hợp thời lượng'],['content-words','Giảm lặp content words'],['different-contexts','Đa dạng bối cảnh']].map(([id,label]) => <label key={id} className={project.qualityRules.includes(id) ? 'active' : ''}><input type="checkbox" checked={project.qualityRules.includes(id)} onChange={() => patch({ qualityRules: project.qualityRules.includes(id) ? project.qualityRules.filter((item) => item !== id) : [...project.qualityRules, id] })} /><span>{label}</span></label>)}</div>
  </section>;
}

function AiCopilotCard({ project, runTask, selectedTask, setSelectedTask, busy, hasApiKey, providerName, aiMessage }) {
  return <section className="wf2-card" id="wf2-ai"><CardHeading number="06" kicker="AI WORKSHEET COPILOT" title="AI theo tác vụ chuyên môn" description="Không dùng một prompt chung. Chọn đúng tác vụ và phạm vi AI được phép thay đổi." />
    <div className="wf2-ai-provider"><span className={hasApiKey ? 'ready' : 'local'}>● {hasApiKey ? 'AI thật đang bật' : 'Bộ máy nội bộ sẵn sàng'}</span><strong>{providerName || 'Brian Local Engine'}</strong></div>
    <div className="wf2-ai-grid">{AI_TASKS.map((task) => <button type="button" key={task.id} className={selectedTask === task.id ? 'active' : ''} onClick={() => setSelectedTask(task.id)}><i>{task.icon}</i><span><strong>{task.titleVi}</strong><small>{task.descVi}</small></span><b>{selectedTask === task.id ? '✓' : ''}</b></button>)}</div>
    {selectedTask === 'custom' ? <label className="wf2-field"><span>Yêu cầu riêng</span><textarea id="wf2-custom-ai-request" rows={4} placeholder="Ví dụ: Chuyển phần 2 thành cloze text B2, giữ nguyên chủ đề môi trường…" /></label> : null}
    <button type="button" className="wf2-primary wide" onClick={() => runTask(selectedTask)} disabled={busy}>{busy ? 'Đang xử lý…' : `✦ Chạy ${AI_TASKS.find((item) => item.id === selectedTask)?.titleVi || 'AI Copilot'}`}</button>
    {aiMessage ? <p className="wf2-ai-message">{aiMessage}</p> : null}
  </section>;
}

function Editor({ project, patch, audit, approveActivity, runTask, busy }) {
  const worksheet = project.worksheet;
  const activities = worksheet?.activities || [];
  const selected = activities.find((activity) => activity.id === project.selectedActivityId) || activities[0];
  const selectedIndex = activities.findIndex((activity) => activity.id === selected?.id);
  const updateWorksheet = (next) => patch({ worksheet: normalizeWorksheet(next, { language: 'vi' }), updatedAt: Date.now() });
  const updateActivity = (change) => updateWorksheet({ ...worksheet, activities: activities.map((activity) => activity.id === selected.id ? { ...activity, ...change } : activity) });
  const updateItem = (id, change) => updateActivity({ items: selected.items.map((item) => item.id === id ? { ...item, ...change } : item) });
  const moveActivity = (direction) => {
    if (selectedIndex < 0) return;
    const target = selectedIndex + direction;
    if (target < 0 || target >= activities.length) return;
    const next = [...activities]; [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]];
    updateWorksheet({ ...worksheet, activities: next });
  };
  if (!worksheet) return null;
  return <section className="wf2-workbench" id="wf2-editor"><header className="wf2-workbench-head"><div><span>07 · WORKSHEET EDITOR</span><h2>Biên tập, dàn trang và kiểm định</h2><p>Kéo logic theo section, sửa câu hỏi, đáp án và xem readiness trước khi xuất.</p></div><div><button type="button" onClick={() => patch({ worksheet: shuffleWorksheet(worksheet) })}>⇆ Xáo trộn</button><button type="button" onClick={() => patch({ stage: 'preview' })}>▤ A4 Preview</button><button type="button" onClick={() => runTask('answers')} disabled={busy}>✦ AI kiểm tra</button></div></header>
    <div className="wf2-editor-layout"><aside className="wf2-section-nav"><header><strong>{activities.length} phần</strong><span>{audit.totalItems} câu</span></header>{activities.map((activity, index) => <button type="button" key={activity.id} className={selected?.id === activity.id ? 'active' : ''} onClick={() => patch({ selectedActivityId: activity.id })}><i>{index + 1}</i><span><strong>{activity.title}</strong><small>{activity.items.length} items · {activityLabel(activity.type)}</small></span><b>{project.blueprint.find((plan) => plan.type === activity.type)?.status === 'teacher-approved' ? '✓' : ''}</b></button>)}</aside>
      <main className="wf2-editor-main">{selected ? <><div className="wf2-activity-toolbar"><button type="button" onClick={() => moveActivity(-1)}>↑</button><button type="button" onClick={() => moveActivity(1)}>↓</button><select value={selected.type} onChange={(e) => updateActivity({ type: e.target.value })}>{WORKSHEET_ACTIVITY_TYPES.map((type) => <option key={type.id} value={type.id}>{activityLabel(type.id)}</option>)}</select><button type="button" onClick={() => approveActivity(selected)}>✓ Duyệt phần</button><button type="button" onClick={() => runTask('transform')} disabled={busy}>✦ AI viết lại</button></div><input className="wf2-activity-title" value={selected.title} onChange={(e) => updateActivity({ title: e.target.value })} /><textarea className="wf2-activity-instructions" rows={2} value={selected.instructions} onChange={(e) => updateActivity({ instructions: e.target.value })} />{selected.passage ? <textarea className="wf2-passage" rows={7} value={selected.passage} onChange={(e) => updateActivity({ passage: e.target.value })} /> : null}<div className="wf2-item-list">{selected.items.map((item, index) => <article key={item.id} className={project.selectedItemId === item.id ? 'active' : ''} onClick={() => patch({ selectedItemId: item.id })}><header><span>{String(index + 1).padStart(2, '0')}</span><div><b>{project.learner.level}</b><b>{activityLabel(selected.type)}</b><b>{item.answer ? 'Có đáp án' : 'Thiếu đáp án'}</b></div><button type="button" onClick={(event) => { event.stopPropagation(); updateActivity({ items: selected.items.filter((entry) => entry.id !== item.id) }); }}>×</button></header><label><span>Câu hỏi / prompt</span><textarea rows={3} value={item.prompt} onChange={(e) => updateItem(item.id, { prompt: e.target.value })} /></label>{item.options?.length ? <div className="wf2-options">{item.options.map((option, optionIndex) => <label key={`${item.id}-${optionIndex}`}><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(e) => updateItem(item.id, { options: item.options.map((entry, i) => i === optionIndex ? e.target.value : entry) })} /></label>)}</div> : null}<div className="wf2-item-answer"><label><span>Đáp án</span><input value={item.answer} onChange={(e) => updateItem(item.id, { answer: e.target.value })} /></label><label><span>Giải thích</span><textarea rows={2} value={item.explanation} onChange={(e) => updateItem(item.id, { explanation: e.target.value })} /></label></div><footer><button type="button" onClick={() => updateActivity({ items: [...selected.items, { ...item, id: uid('item') }] })}>⧉ Nhân bản</button><button type="button" onClick={() => runTask('transform', { itemId: item.id })}>✦ Biến thể</button></footer></article>)}</div><button type="button" className="wf2-add-item" onClick={() => updateActivity({ items: [...selected.items, { id: uid('item'), prompt: 'New question', options: [], answer: '', explanation: '' }] })}>＋ Thêm câu hỏi</button></> : null}</main>
      <aside className="wf2-audit-panel"><div className="wf2-score-ring" style={{ '--score': audit.score }}><strong>{audit.score}</strong><span>Quality</span></div><div className="wf2-audit-stats"><div><span>Source alignment</span><b>{audit.sourceAlignment}%</b></div><div><span>Blueprint accuracy</span><b>{audit.countAccuracy}%</b></div><div><span>Estimated pages</span><b>{audit.estimatedPages}</b></div><div><span>Print readiness</span><b>{audit.printReady ? 'Ready' : 'Review'}</b></div></div><h3>Cần xử lý</h3>{audit.issues.length ? <div className="wf2-issue-list">{audit.issues.map((issue, index) => <article key={`${issue.title}-${index}`} className={issue.level}><strong>{issue.title}</strong><span>{issue.action}</span></article>)}</div> : <p className="wf2-ok">✓ Worksheet đã vượt qua các kiểm tra chính.</p>}<button type="button" className="wf2-primary wide" onClick={() => patch({ stage: 'publish' })}>Tiếp tục xuất bản →</button></aside>
    </div>
  </section>;
}

function A4Preview({ project, patch, teacherVersion, setTeacherVersion }) {
  const html = worksheetToHtml(project.worksheet, { teacherVersion, language: 'vi', standalone: false });
  return <section className="wf2-preview"><header><div><span>A4 PREVIEW</span><h2>Xem trước bản in</h2></div><div><button type="button" className={!teacherVersion ? 'active' : ''} onClick={() => setTeacherVersion(false)}>Student</button><button type="button" className={teacherVersion ? 'active' : ''} onClick={() => setTeacherVersion(true)}>Teacher</button><button type="button" onClick={() => patch({ stage: 'editor' })}>← Quay lại Editor</button></div></header><div className={`wf2-paper layout-${project.layout}`} dangerouslySetInnerHTML={{ __html: html }} /></section>;
}

function VersionModal({ project, patch, onClose, onSave }) {
  return <div className="wf2-modal-overlay" role="dialog" aria-modal="true"><section className="wf2-modal"><header><div><span>VERSION HISTORY</span><h2>Lịch sử phiên bản</h2><p>Lưu và khôi phục tối đa 20 phiên bản worksheet.</p></div><button type="button" onClick={onClose}>×</button></header><div className="wf2-version-list"><button type="button" className="wf2-primary" onClick={onSave}>＋ Lưu phiên bản hiện tại</button>{project.versions.length ? project.versions.map((version) => <article key={version.id}><div><strong>{version.title}</strong><span>{new Date(version.createdAt).toLocaleString('vi-VN')}</span></div><p>{version.worksheet?.activities?.length || 0} phần · {version.worksheet?.activities?.reduce((sum, activity) => sum + (activity.items?.length || 0), 0) || 0} câu</p><button type="button" onClick={() => { patch({ worksheet: version.worksheet, blueprint: version.blueprint || project.blueprint, stage: 'editor' }); onClose(); }}>Khôi phục</button></article>) : <p className="wf2-empty">Chưa có phiên bản nào được lưu.</p>}</div></section></div>;
}

function PublishCard({ project, patch, audit, exportActions, sendTo }) {
  return <section className="wf2-card full" id="wf2-publish"><CardHeading number="09" kicker="PUBLISH & CONNECTED WORKFLOW" title="Dàn trang, xuất bản và kết nối" description="Chỉ bản đã kiểm định và giáo viên phê duyệt mới được xem là hoàn chỉnh." action={<span className={`wf2-publish-state ${project.status}`}>{project.status}</span>} />
    <div className="wf2-publish-layout"><div><h3>Layout template</h3><div className="wf2-layout-grid">{LAYOUTS.map(([id, label]) => <button type="button" key={id} className={project.layout === id ? 'active' : ''} onClick={() => patch({ layout: id })}><i>{id === 'exam-format' ? 'EX' : id === 'compact' ? 'CP' : 'WF'}</i><span>{label}</span><b>{project.layout === id ? '✓' : ''}</b></button>)}</div><h3>Xuất tài liệu</h3><div className="wf2-export-grid"><button type="button" onClick={() => exportActions.docx(false)}><i>DOC</i><span><strong>Student DOCX</strong><small>Phiếu sạch để học sinh làm bài.</small></span></button><button type="button" onClick={() => exportActions.docx(true)}><i>KEY</i><span><strong>Teacher DOCX</strong><small>Đáp án, giải thích và teacher notes.</small></span></button><button type="button" onClick={() => exportActions.html(false)}><i>HTML</i><span><strong>Interactive HTML</strong><small>Mở trong trình duyệt hoặc in PDF.</small></span></button><button type="button" onClick={exportActions.json}><i>JSON</i><span><strong>Project backup</strong><small>Khôi phục và tiếp tục biên tập.</small></span></button>{project.mode === 'batch' ? <button type="button" onClick={exportActions.batchZip}><i>ZIP</i><span><strong>Batch variants</strong><small>Tạo các mã A/B/C… và phiên bản theo level.</small></span></button> : null}<button type="button" onClick={exportActions.saveLibrary}><i>LIB</i><span><strong>Teacher Library</strong><small>Lưu bản đã duyệt vào kho học liệu.</small></span></button><button type="button" onClick={exportActions.addBank}><i>QB</i><span><strong>Item Bank</strong><small>Đưa câu hỏi phù hợp vào ngân hàng.</small></span></button></div></div><div><div className="wf2-readiness"><div className="wf2-score-ring" style={{ '--score': audit.score }}><strong>{audit.score}</strong><span>Quality</span></div><div><h3>{audit.printReady ? 'Sẵn sàng xuất bản' : 'Cần xem lại trước khi xuất'}</h3><p>{audit.totalItems} câu · {audit.activityCount} phần · khoảng {audit.estimatedPages} trang</p><button type="button" onClick={() => patch({ status: 'teacher-approved' })}>✓ Giáo viên phê duyệt</button></div></div><h3>Kết nối ứng dụng</h3><div className="wf2-destination-grid">{DESTINATIONS.map((destination) => <button type="button" key={destination.id} onClick={() => sendTo(destination)}><i>{destination.icon}</i><span><strong>{destination.label}</strong><small>{destination.desc}</small></span><b>→</b></button>)}</div></div></div>
  </section>;
}


function WorksheetHero({ project, patch, blueprintItems, auditScore, lastUpdated, setShowVersions }) {
  const recommendedStage = project.worksheet
    ? 'editor'
    : project.blueprint?.length
      ? 'generate'
      : project.sourceText
        ? 'intelligence'
        : 'source';

  return (
    <section className="wf3-hero" aria-labelledby="wf3-title">
      <button type="button" className="wf3-back" aria-label="Quay lại danh sách ứng dụng" onClick={() => { window.location.hash = '#/apps'; }}>←</button>

      <div className="wf3-hero-copy">
        <div className="wf3-title-row">
          <span className="wf3-app-icon" aria-hidden="true">WF</span>
          <div>
            <div className="wf3-title-line">
              <h1 id="wf3-title">Worksheet Factory</h1>
              <span className="wf3-version-pill">V{APP_VERSION}</span>
            </div>
            <p className="wf3-subtitle">Structured Learning Pack Workbench</p>
          </div>
        </div>

        <p className="wf3-description">Tạo bộ tài liệu học tập có cấu trúc chuyên nghiệp với AI hỗ trợ — từ nguồn đến xuất bản, nhanh chóng và hiệu quả.</p>

        <label className="wf3-project-field">
          <span>Dự án hiện tại</span>
          <input aria-label="Tên dự án" value={project.title} onChange={(event) => patch({ title: event.target.value })} />
        </label>

        <div className="wf3-stat-strip" aria-label="Trạng thái dự án">
          <div className="wf3-stat is-save"><i>●</i><span><strong>Tự động lưu</strong><small>Đã lưu gần đây</small></span></div>
          <div className="wf3-stat is-questions"><i>▤</i><span><strong>{blueprintItems} câu hỏi</strong><small>{auditScore}/100 chất lượng</small></span></div>
          <div className="wf3-stat is-level"><i>A+</i><span><strong>Grade {project.learner.grade} · {project.learner.level}</strong><small>CEFR mục tiêu</small></span></div>
          <div className="wf3-stat is-time"><i>◷</i><span><strong>{project.learner.minutes} phút</strong><small>Thời lượng</small></span></div>
          <button type="button" className="wf3-stat is-version" onClick={() => setShowVersions(true)}><i>◫</i><span><strong>Phiên bản</strong><small>{lastUpdated}</small></span></button>
        </div>

        <div className="wf3-hero-actions">
          <button type="button" className="wf3-action-primary" onClick={() => patch({ stage: recommendedStage })}><span>✦</span> Tiếp tục thiết kế <b>→</b></button>
          <button type="button" onClick={() => patch({ stage: 'blueprint' })}><span>▦</span> Blueprint</button>
          <button type="button" onClick={() => patch({ stage: 'generate' })}><span>✦</span> AI Copilot</button>
          <button type="button" onClick={() => patch({ stage: 'publish' })} disabled={!project.worksheet}><span>↗</span> Xuất bản</button>
        </div>
      </div>

      <div className="wf3-hero-art" aria-hidden="true">
        <span className="wf3-orbit orbit-one" />
        <span className="wf3-orbit orbit-two" />
        <div className="wf3-floating-card wf3-ai-card"><strong>AI</strong><small>Copilot</small></div>
        <div className="wf3-floating-card wf3-chart-card"><b>◔</b><i /><i /><i /></div>
        <div className="wf3-floating-card wf3-image-card"><span>◒</span></div>
        <div className="wf3-sheet">
          <div className="wf3-sheet-head"><span>Worksheet</span><b>WF</b></div>
          <div className="wf3-sheet-line wide" />
          <div className="wf3-sheet-question"><i>✓</i><span /></div>
          <div className="wf3-sheet-question"><i>✓</i><span /></div>
          <div className="wf3-sheet-question"><i>✓</i><span /></div>
          <div className="wf3-sheet-question"><i>✓</i><span /></div>
          <div className="wf3-sheet-footer"><span /><b /></div>
        </div>
        <div className="wf3-brain-orb"><span>✦</span><b>AI</b></div>
        <div className="wf3-platform" />
      </div>
    </section>
  );
}

export default function WorksheetFactory({ language = 'vi', apiKey = '', aiModel = '', hasApiKey = false, aiSummary = {}, currentUser = null }) {
  const storageKey = useMemo(() => scopedKey(currentUser), [currentUser?.id, currentUser?.email]);
  const [project, setProject] = useState(defaultProject);
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [selectedTask, setSelectedTask] = useState('analyse');
  const [aiMessage, setAiMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [teacherVersion, setTeacherVersion] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (saved) setProject(normalizeProject(saved)); else setProject(defaultProject()); } catch { setProject(defaultProject()); }
  }, [storageKey]);
  useEffect(() => { const timer = window.setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify(project)); } catch { /* optional local save */ } }, 250); return () => window.clearTimeout(timer); }, [project, storageKey]);
  useEffect(() => {
    setPendingTransfer(pendingTransferFor(currentUser, 'worksheet-factory'));
    const handler = (event) => { const item = event.detail; if (item?.target === 'worksheet-factory') setPendingTransfer(item); };
    window.addEventListener(TRANSFER_APPLY_EVENT, handler);
    return () => window.removeEventListener(TRANSFER_APPLY_EVENT, handler);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const onAiUseResult = (event) => {
      const detail = event.detail || {};
      if (detail.toolSlug !== 'worksheet-factory' || !safeText(detail.text)) return;
      const sourceText = safeText(detail.text);
      setProject((current) => normalizeProject({ ...current, sourceText, sourceName: 'Kết quả từ Brian AI', sourceInputMode: 'manual', sourceKind: 'ai-result', intelligence: offlineSourceIntelligence(sourceText, 'Kết quả từ Brian AI'), stage: 'source', updatedAt: Date.now() }));
      setNotice('Đã đưa kết quả AI vào Source & Input.');
      detail.markHandled?.();
    };
    const onContentTransfer = (event) => {
      const detail = event.detail || {};
      if (detail.target !== 'worksheet-factory' || !safeText(detail.content)) return;
      const sourceText = safeText(detail.content);
      setProject((current) => normalizeProject({ ...current, sourceText, sourceName: safeText(detail.title) || 'Nội dung được chuyển tới', sourceInputMode: 'transfer', sourceKind: 'transfer', intelligence: offlineSourceIntelligence(sourceText, detail.title || ''), stage: 'source', updatedAt: Date.now() }));
      setNotice(`Đã nhận nội dung từ ${detail.sourceTitle || 'ứng dụng khác'}.`);
    };
    window.addEventListener('bes-ai-use-result', onAiUseResult);
    window.addEventListener('bes-content-transfer-apply', onContentTransfer);
    return () => {
      window.removeEventListener('bes-ai-use-result', onAiUseResult);
      window.removeEventListener('bes-content-transfer-apply', onContentTransfer);
    };
  }, []);

  const patch = (change) => setProject((current) => normalizeProject({ ...current, ...change, updatedAt: Date.now() }));
  const patchLearner = (change) => setProject((current) => normalizeProject({ ...current, learner: { ...current.learner, ...change }, updatedAt: Date.now() }));
  const audit = useMemo(() => detailedAudit(project, project.worksheet), [project]);
  const providerName = aiSummary?.providerName || (hasApiKey ? 'AI Provider' : 'Brian Local Engine');
  const blueprintItems = project.blueprint.reduce((sum, item) => sum + Number(item.count || 0), 0);

  const setStage = (stage) => patch({ stage });
  const applyTransfer = () => {
    if (!pendingTransfer) return;
    patch({ sourceText: pendingTransfer.content || '', sourceName: pendingTransfer.title || 'Transfer Inbox', sourceInputMode: 'transfer', sourceKind: 'transfer', intelligence: offlineSourceIntelligence(pendingTransfer.content || '', pendingTransfer.title || '') });
    updateTransfer(currentUser, pendingTransfer.id, { status: 'applied', appliedAt: Date.now() });
    setPendingTransfer(null); setNotice('Đã nhận nội dung từ Transfer Inbox.');
  };

  const loadItemBankSource = () => {
    const items = loadBank().slice(0, 120);
    if (!items.length) { setNotice('Item Bank hiện chưa có câu hỏi.'); return; }
    const text = items.map((item, index) => {
      const options = Array.isArray(item.options) ? item.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join('\n') : '';
      return `Question ${index + 1}. ${item.question}${options ? `\n${options}` : ''}\nAnswer: ${item.answer || ''}\nExplanation: ${item.explanation || ''}`;
    }).join('\n\n');
    patch({ sourceText: text, sourceName: `Item Bank — ${items.length} approved items`, sourceInputMode: 'item-bank', sourceKind: 'item-bank', intelligence: offlineSourceIntelligence(text, 'Item Bank') });
    setNotice(`Đã nạp ${items.length} câu từ Item Bank.`);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setFileBusy(true); setNotice('');
    try {
      const content = await readSourceFile(file);
      if (!safeText(content)) throw new Error('Không đọc được nội dung chữ trong file.');
      const clipped = content.slice(0, 150000);
      patch({ sourceText: clipped, sourceName: file.name, sourceInputMode: 'manual', sourceKind: file.name.split('.').pop()?.toLowerCase() || 'file', intelligence: offlineSourceIntelligence(clipped, file.name) });
      setNotice(`Đã đọc ${file.name}.`);
    } catch (error) { setNotice(error?.message || 'Không thể đọc file.'); }
    finally { setFileBusy(false); }
  };

  const generateSourceFromKeywords = async () => {
    const keywords = keywordList(project.sourceKeywords);
    if (!keywords.length) { setNotice('Hãy nhập ít nhất một từ khóa hoặc ý chính.'); return; }
    if (!hasApiKey) { setNotice('Chưa có API key. Hãy cấu hình provider trước khi dùng AI tạo nội dung nguồn.'); return; }
    const generation = project.sourceGeneration || {};
    const lengthProfile = SOURCE_LENGTHS.find(([id]) => id === generation.length) || SOURCE_LENGTHS[1];
    const [, lengthLabel, targetWords, maxTokens, minWords, maxWords] = lengthProfile;
    setBusy(true); setAiMessage('AI đang tạo nội dung nguồn từ từ khóa…'); setNotice('');
    try {
      const prompt = `Create one original English teaching source text for Worksheet Factory.\n\nKEYWORDS / IDEAS:\n${keywords.map((item) => `- ${item}`).join('\n')}\n\nTARGET:\n- Grade: ${project.learner.grade}\n- CEFR: ${project.learner.level}\n- Content type: ${SOURCE_CONTENT_TYPES.find(([id]) => id === generation.contentType)?.[1] || generation.contentType}\n- Required length: ${minWords}-${maxWords} words. Aim for about ${targetWords} words and never finish below ${minWords} words.\n- Tone: ${generation.tone}\n- Output language: ${generation.language}\n- Topic / Unit: ${project.learner.topic || project.learner.unit || keywords.slice(0, 3).join(', ')}\n- Additional instruction: ${generation.instruction || 'Use coherent paragraphs, meaningful context and stable facts.'}\n\nRULES:\n1. Return only the source content, without markdown fences, title labels, worksheet questions, answer keys or analysis.\n2. Integrate the keywords naturally; do not repeat them mechanically.\n3. Keep vocabulary and sentence complexity appropriate for the stated CEFR.\n4. Use stable educational information; avoid time-sensitive statistics or fabricated citations.\n5. Make the text rich enough for vocabulary, grammar, reading and critical-thinking activities.\n6. Write 3-6 coherent paragraphs. Do not summarize or stop early before reaching the required word range.`;
      const aiOptions = {
        apiKey,
        model: aiModel,
        systemInstruction: 'You are the Source Writer inside Worksheet Factory. Write only the requested teaching source. Never generate worksheet questions in this step. Respect the requested word range.',
        temperature: 0.55,
        maxOutputTokens: maxTokens,
        governanceProfile: 'worksheet',
      };
      const raw = await callAI({ ...aiOptions, prompt, loadingLabel: 'Worksheet Factory đang viết nội dung nguồn…' });
      let sourceText = cleanGeneratedSource(raw);
      let actualWords = countWords(sourceText);

      if (actualWords < minWords) {
        setAiMessage(`Bản đầu mới có ${actualWords}/${minWords} từ. AI đang mở rộng nội dung…`);
        const expansionPrompt = `Rewrite and expand the draft below into one complete English teaching source of ${minWords}-${maxWords} words (aim for ${targetWords}). Preserve its useful facts and topic, add coherent development and examples, and return the full revised text only. Do not add questions, headings, notes or markdown.\n\nDRAFT (${actualWords} words):\n${sourceText}`;
        const expandedRaw = await callAI({
          ...aiOptions,
          maxOutputTokens: Math.max(maxTokens, 1100),
          prompt: expansionPrompt,
          loadingLabel: 'Worksheet Factory đang mở rộng nội dung nguồn…',
        });
        const expandedText = cleanGeneratedSource(expandedRaw);
        if (countWords(expandedText) > actualWords) sourceText = expandedText;
        actualWords = countWords(sourceText);
      }

      if (actualWords < minWords) {
        const missingWords = minWords - actualWords;
        setAiMessage(`Nội dung còn thiếu khoảng ${missingWords} từ. AI đang viết tiếp…`);
        const continuationPrompt = `Continue the source text below with approximately ${missingWords + 40} additional words. Continue naturally from the final sentence, add new relevant development, and return only the continuation. Do not repeat the existing text, do not add a title, and do not add worksheet questions.\n\nEXISTING SOURCE:\n${sourceText}`;
        const continuationRaw = await callAI({
          ...aiOptions,
          maxOutputTokens: Math.max(420, Math.min(900, missingWords * 3)),
          prompt: continuationPrompt,
          loadingLabel: 'Worksheet Factory đang hoàn thiện độ dài nguồn…',
        });
        const continuation = cleanGeneratedSource(continuationRaw);
        if (countWords(continuation) >= 20) sourceText = `${sourceText.trim()}\n\n${continuation.trim()}`;
        actualWords = countWords(sourceText);
      }

      if (actualWords < minWords) throw new Error(`AI chỉ tạo ${actualWords} từ, thấp hơn mức tối thiểu ${minWords} từ. Hãy thử lại hoặc chọn model khác.`);
      const sourceName = `${keywords.slice(0, 4).join(' · ')} — AI source`;
      const intelligence = offlineSourceIntelligence(sourceText, sourceName);
      patch({
        sourceText,
        sourceName,
        sourceInputMode: 'keywords',
        sourceKind: 'ai-keywords',
        intelligence,
        learner: { ...project.learner, topic: project.learner.topic || keywords.slice(0, 3).join(' / ') },
        sourceGeneration: { ...generation, engine: 'ai', provider: providerName, model: aiModel, generatedAt: Date.now(), requestedRange: `${minWords}-${maxWords}`, actualWords },
        stage: 'source',
      });
      setAiMessage(`AI đã tạo ${actualWords} từ từ ${keywords.length} từ khóa. Hãy chỉnh sửa nguồn rồi chạy “AI phân tích”.`);
      setNotice(`Đã tạo nội dung nguồn bằng AI (${actualWords} từ; yêu cầu ${minWords}-${maxWords} từ).`);
    } catch (error) {
      setAiMessage(`Không thể tạo nội dung nguồn: ${error?.message || 'AI provider không phản hồi.'}`);
      setNotice('AI chưa tạo được nguồn. Nội dung cũ được giữ nguyên để tránh mất dữ liệu.');
    } finally { setBusy(false); }
  };

  const analyseSource = async () => {
    setBusy(true); setAiMessage('');
    const fallback = offlineSourceIntelligence(project.sourceText, project.sourceName);
    if (!hasApiKey) { patch({ intelligence: fallback, learner: { ...project.learner, level: fallback.level, topic: fallback.topic }, blueprint: buildDefaultBlueprint(fallback, project.mode), stage: 'intelligence' }); setAiMessage('Đã phân tích bằng Source Intelligence nội bộ.'); setBusy(false); return; }
    try {
      const raw = await callAI({ apiKey, model: aiModel, maxOutputTokens: 1400, temperature: 0.2, responseMimeType: 'application/json', validation: { kind: 'json', requiredFields: ['sourceType', 'topic', 'level', 'keywords', 'recommendedTypes'] }, loadingLabel: 'Worksheet Factory đang phân tích nguồn…', prompt: `Analyse this English teaching source. Return strict JSON only with keys sourceType, topic, level, keywords (max 16), grammar (max 8), skills (max 6), existingQuestionCount, issues (max 6), recommendedTypes (use only these ids: ${WORKSHEET_ACTIVITY_TYPES.map((type) => type.id).join(', ')}). Source name: ${project.sourceName}. Source:\n${project.sourceText.slice(0, 24000)}` });
      const parsed = extractJson(raw) || {};
      const intelligence = { ...fallback, ...parsed, keywords: Array.isArray(parsed.keywords) ? parsed.keywords : fallback.keywords, grammar: Array.isArray(parsed.grammar) ? parsed.grammar : fallback.grammar, skills: Array.isArray(parsed.skills) ? parsed.skills : fallback.skills, issues: Array.isArray(parsed.issues) ? parsed.issues : fallback.issues, recommendedTypes: Array.isArray(parsed.recommendedTypes) ? parsed.recommendedTypes.filter((type) => WORKSHEET_ACTIVITY_TYPES.some((entry) => entry.id === type)) : fallback.recommendedTypes, analysedAt: Date.now() };
      patch({ intelligence, learner: { ...project.learner, level: intelligence.level || project.learner.level, topic: intelligence.topic || project.learner.topic }, blueprint: buildDefaultBlueprint(intelligence, project.mode), stage: 'intelligence' });
      setAiMessage('AI đã phân tích nguồn và đề xuất cấu trúc phù hợp.');
    } catch (error) { patch({ intelligence: fallback, blueprint: buildDefaultBlueprint(fallback, project.mode) }); setAiMessage(`AI chưa phản hồi; đã dùng phân tích nội bộ. ${error?.message || ''}`); }
    finally { setBusy(false); }
  };

  const rebuildBlueprint = () => patch({ blueprint: buildDefaultBlueprint(project.intelligence, project.mode), stage: 'blueprint' });

  const generatePlanActivity = async (plan) => {
    const input = { sourceText: project.sourceText || project.learner.topic, sourceName: project.sourceName, title: project.title, topic: project.learner.topic || project.intelligence.topic, level: plan.difficulty || project.learner.level, audience: `Grade ${project.learner.grade}`, activityTypes: [plan.type], itemsPerActivity: plan.count, language, includeExplanations: project.answerMode !== 'key-only', avoidRepeatedContentWords: project.qualityRules.includes('content-words') || project.qualityRules.includes('no-duplicates'), customInstruction: `${project.customInstruction}\nUse only these approved source facets: ${project.sourceFacets.join(', ')}. The activity is worth ${plan.points} point(s) per item.` };
    if (!hasApiKey) return generateOfflineWorksheet(input).activities[0];
    try {
      const raw = await callAI({ apiKey, model: aiModel, prompt: buildWorksheetPrompt(input), systemInstruction: 'You are Worksheet Factory V2. Return strict valid JSON only. Produce exactly one requested activity with correct answers and concise explanations. Never include markdown fences.', temperature: 0.35, responseMimeType: 'application/json', validation: { kind: 'json', requiredFields: ['activities'], collectionKey: 'activities.0.items', expectedCount: plan.count, detectDuplicates: true, validateMcq: ['multiple_choice', 'vocabulary_context', 'reading_comprehension'].includes(plan.type) }, maxOutputTokens: Math.min(3200, Math.max(900, plan.count * 180)), loadingLabel: `Đang tạo ${activityLabel(plan.type)}…` });
      const normalized = normalizeWorksheet(extractJson(raw), { language });
      if (normalized.activities[0]?.items?.length) return normalized.activities[0];
      throw new Error('AI returned no valid activity.');
    } catch { return generateOfflineWorksheet(input).activities[0]; }
  };

  const generateSections = async () => {
    setBusy(true); setAiMessage('Đang tạo từng section…');
    try {
      const generated = [];
      for (let index = 0; index < project.blueprint.length; index += 1) {
        const plan = project.blueprint[index];
        setAiMessage(`Đang tạo phần ${index + 1}/${project.blueprint.length}: ${activityLabel(plan.type)}…`);
        const activity = await generatePlanActivity(plan);
        generated.push({ ...activity, id: activity.id || uid('activity') });
        setProject((current) => normalizeProject({ ...current, worksheet: mergeActivities(current.worksheet, generated, current, language), blueprint: current.blueprint.map((entry) => entry.id === plan.id ? { ...entry, generated: true, status: 'ai-draft' } : entry), selectedActivityId: generated[0]?.id || '', stage: 'generate', updatedAt: Date.now() }));
      }
      const worksheet = mergeActivities(null, generated, project, language);
      patch({ worksheet, selectedActivityId: generated[0]?.id || '', stage: 'editor', status: 'ai-generated', blueprint: project.blueprint.map((plan) => ({ ...plan, generated: true, status: 'ai-draft' })) });
      setAiMessage('Đã tạo đủ các phần và chuyển sang Worksheet Editor.');
    } finally { setBusy(false); }
  };

  const runTask = async (task, context = {}) => {
    setSelectedTask(task); setAiMessage('');
    if (task === 'analyse') return analyseSource();
    if (task === 'blueprint') { rebuildBlueprint(); setAiMessage('Đã lập blueprint từ Source Intelligence và mục tiêu lớp học.'); return; }
    if (task === 'generate') return generateSections();
    if (!project.worksheet) { setAiMessage('Hãy tạo worksheet trước khi chạy tác vụ này.'); return; }
    if (task === 'duplicates') {
      const audited = auditWorksheet(project.worksheet);
      const duplicateIndexes = new Set(audited.exactDuplicates.flatMap((pair) => pair.slice(1)));
      let itemIndex = 0;
      const activities = project.worksheet.activities.map((activity) => ({ ...activity, items: activity.items.filter(() => { itemIndex += 1; return !duplicateIndexes.has(itemIndex); }) }));
      patch({ worksheet: mergeActivities(project.worksheet, activities, project, language) }); setAiMessage(`Đã loại ${duplicateIndexes.size} câu trùng hoàn toàn.`); return;
    }
    if (task === 'answers') { setAiMessage(audit.invalidOptions.length || audit.missingAnswers.length ? `Cần sửa ${audit.missingAnswers.length} đáp án thiếu và ${audit.invalidOptions.length} câu có options chưa hợp lệ.` : 'Đáp án và options đã vượt qua kiểm tra nội bộ.'); return; }
    if (task === 'differentiate') {
      const next = normalizeWorksheet({ ...project.worksheet, title: `${project.worksheet.title} — Supported`, teacherNotes: `${project.worksheet.teacherNotes}\nDifferentiation: add word banks, sentence starters and reduce item load where needed.` }, { language });
      patch({ worksheet: next }); setAiMessage('Đã tạo hướng phân hóa và ghi chú trong teacher edition.'); return;
    }
    if (task === 'transform') {
      const activity = project.worksheet.activities.find((entry) => entry.id === project.selectedActivityId) || project.worksheet.activities[0];
      if (!activity) return;
      setBusy(true);
      try {
        const plan = { id: uid('plan'), type: activity.type, count: activity.items.length, points: 1, difficulty: project.learner.level };
        const replacement = await generatePlanActivity(plan);
        const activities = project.worksheet.activities.map((entry) => entry.id === activity.id ? { ...replacement, id: activity.id } : entry);
        patch({ worksheet: mergeActivities(project.worksheet, activities, project, language) }); setAiMessage('Đã viết lại activity đang chọn.');
      } finally { setBusy(false); }
      return;
    }
    if (task === 'custom') {
      const request = document.getElementById('wf2-custom-ai-request')?.value?.trim();
      if (!request) { setAiMessage('Nhập yêu cầu cụ thể trước khi chạy.'); return; }
      setAiMessage(`Đã ghi nhận yêu cầu: ${request}. Hãy chọn activity rồi dùng “AI viết lại” để áp dụng theo phạm vi an toàn.`);
    }
  };

  const approveActivity = (activity) => patch({ blueprint: project.blueprint.map((plan) => plan.type === activity.type ? { ...plan, status: 'teacher-approved' } : plan), status: project.blueprint.every((plan) => plan.type === activity.type || plan.status === 'teacher-approved') ? 'teacher-approved' : project.status });
  const saveVersion = () => patch({ versions: [{ id: uid('version'), title: `Phiên bản ${new Date().toLocaleString('vi-VN')}`, createdAt: Date.now(), worksheet: project.worksheet, blueprint: project.blueprint }, ...project.versions].slice(0, 20) });

  const exportActions = {
    docx: async (teacher) => { if (!project.worksheet) return; const blob = await worksheetToDocxBlob(project.worksheet, { teacherVersion: teacher, language }); downloadBlob(blob, `${safeFileName(project.title)}-${teacher ? 'teacher' : 'student'}.docx`); setNotice('Đã xuất DOCX.'); },
    html: (teacher) => { if (!project.worksheet) return; downloadText(worksheetToHtml(project.worksheet, { teacherVersion: teacher, language }), `${safeFileName(project.title)}-${teacher ? 'teacher' : 'student'}.html`, 'text/html;charset=utf-8'); setNotice('Đã xuất HTML.'); },
    json: () => downloadProject(project),
    batchZip: async () => {
      if (!project.worksheet) return;
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const variants = Math.max(2, Math.min(12, Number(project.batch.variants) || 2));
      const levels = project.batch.levels.length ? project.batch.levels : [project.learner.level];
      for (let index = 0; index < variants; index += 1) {
        const code = String.fromCharCode(65 + index);
        const level = levels[index % levels.length];
        const label = project.batch.classNames[index] || `Mã ${code}`;
        const variant = shuffleWorksheet({ ...project.worksheet, title: `${project.worksheet.title} — ${label}`, subtitle: `${project.worksheet.subtitle || ''} · ${level}` });
        zip.file(`${safeFileName(project.title)}-${code}-student.html`, worksheetToHtml(variant, { teacherVersion: false, language }));
        zip.file(`${safeFileName(project.title)}-${code}-teacher.html`, worksheetToHtml(variant, { teacherVersion: true, language }));
      }
      zip.file('README.txt', `Worksheet Factory V2 batch pack\nVariants: ${variants}\nLevels: ${levels.join(', ')}\nGenerated: ${new Date().toISOString()}`);
      downloadBlob(await zip.generateAsync({ type: 'blob' }), `${safeFileName(project.title)}-batch-variants.zip`);
      setNotice(`Đã xuất ${variants} phiên bản trong gói ZIP.`);
    },
    saveLibrary: () => { if (!project.worksheet) return; addHistoryEntry({ kind: 'worksheet-pack', toolSlug: 'worksheet-factory', toolTitle: 'Worksheet Factory V2', sourceApp: 'worksheet-factory', sourceAppTitle: 'Worksheet Factory', title: project.title, content: worksheetToPlainText(project.worksheet, { teacherVersion: true, language }), tags: ['worksheet', project.learner.level, project.mode, project.learner.topic], metadata: { schema: TRANSFER_SCHEMA, projectId: project.id, auditScore: audit.score, status: project.status, layout: project.layout }, activityData: { type: 'worksheet-factory-v2', project } }); setNotice('Đã lưu vào Teacher Library.'); },
    addBank: () => { if (!project.worksheet) return; const items = worksheetMcqBankItems(project.worksheet, { level: project.learner.level, source: project.title }); addBankItems(items); setNotice(`Đã thêm ${items.length} câu vào Item Bank.`); },
  };

  const sendTo = (destination) => {
    if (!project.worksheet) return;
    const transfer = createTransfer(currentUser, { target: destination.id, type: 'worksheet-pack', title: project.title, sourceApp: 'worksheet-factory', sourceTitle: 'Worksheet Factory V2', content: worksheetToPlainText(project.worksheet, { teacherVersion: true, language }), metadata: { schema: TRANSFER_SCHEMA, projectId: project.id, mode: project.mode, level: project.learner.level, grade: project.learner.grade, topic: project.learner.topic, auditScore: audit.score, status: project.status, blueprint: project.blueprint, worksheet: project.worksheet } });
    if (!transfer) return;
    patch({ status: 'published' }); setNotice(`Đã gửi sang ${destination.label}.`); window.setTimeout(() => { window.location.hash = destination.route; }, 350);
  };

  const libraryCount = useMemo(() => loadHistory().filter((item) => item.sourceApp === 'worksheet-factory').length, [notice]);
  const bankCount = useMemo(() => loadBank().length, [notice]);
  const lastUpdated = new Date(project.updatedAt || Date.now()).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  return <div className="wf2-page bui-workbench" data-ui="workbench" data-workbench="worksheet-factory" data-stage={project.stage}>
    <WorksheetHero project={project} patch={patch} blueprintItems={blueprintItems} auditScore={audit.score} lastUpdated={lastUpdated} setShowVersions={setShowVersions} />
    {pendingTransfer ? <aside className="wf2-global-transfer"><div><strong>Nội dung từ {pendingTransfer.sourceTitle}</strong><span>{pendingTransfer.title}</span></div><button type="button" onClick={applyTransfer}>Dùng nội dung</button><button type="button" onClick={() => { updateTransfer(currentUser, pendingTransfer.id, { status: 'dismissed' }); setPendingTransfer(null); }}>Bỏ qua</button></aside> : null}
    <section className="wf2-summary bui-workbench-metrics"><Metric icon="▣" label="Nguồn" value={project.sourceName || project.intelligence.sourceType} /><Metric icon="A+" label="Lớp / CEFR" value={`Grade ${project.learner.grade} · ${project.learner.level}`} /><Metric icon="≡" label="Hoạt động" value={`${project.blueprint.length} phần · ${blueprintItems} câu`} /><Metric icon="◷" label="Thời lượng" value={`${project.learner.minutes} phút`} /><Metric icon="▤" label="Cập nhật" value={lastUpdated} /></section>
    <Workflow stage={project.stage} setStage={setStage} hasWorksheet={Boolean(project.worksheet)} />
    {notice ? <div className="wf2-notice"><span>✓</span>{notice}<button type="button" onClick={() => setNotice('')}>×</button></div> : null}

    {project.stage === 'source' || project.stage === 'intelligence' || project.stage === 'learner' || project.stage === 'blueprint' || project.stage === 'generate' ? <div className="wf2-setup-grid bui-workbench-canvas">
      <BuildModeCard project={project} patch={patch} />
      <SourceCard project={project} patch={patch} onFile={handleFile} fileBusy={fileBusy} pendingTransfer={pendingTransfer} applyTransfer={applyTransfer} onLoadItemBank={loadItemBankSource} onGenerateFromKeywords={generateSourceFromKeywords} busy={busy} hasApiKey={hasApiKey} providerName={providerName} />
      <SourceIntelligenceCard project={project} patch={patch} analyseSource={analyseSource} busy={busy} />
      <LearnerCard project={project} patchLearner={patchLearner} />
      <BlueprintCard project={project} patch={patch} rebuildBlueprint={rebuildBlueprint} runTask={runTask} busy={busy} />
      <AiCopilotCard project={project} runTask={runTask} selectedTask={selectedTask} setSelectedTask={setSelectedTask} busy={busy} hasApiKey={hasApiKey} providerName={providerName} aiMessage={aiMessage} />
      <section className="wf2-card full wf2-generate-cta"><div><span>WORKSHEET PRODUCTION PIPELINE</span><h2>Phân tích → Blueprint → Tạo từng phần → Audit</h2><p>Hệ thống tạo tuần tự từng activity để giữ đủ số câu, đáp án và cấu trúc đã duyệt.</p></div><button type="button" className="wf2-primary" onClick={generateSections} disabled={busy || !project.blueprint.length}>{busy ? aiMessage || 'Đang tạo…' : `✦ Tạo ${project.blueprint.length} phần / ${blueprintItems} câu`}</button></section>
    </div> : null}

    {project.stage === 'editor' ? <Editor project={project} patch={patch} audit={audit} approveActivity={approveActivity} runTask={runTask} busy={busy} /> : null}
    {project.stage === 'preview' && project.worksheet ? <A4Preview project={project} patch={patch} teacherVersion={teacherVersion} setTeacherVersion={setTeacherVersion} /> : null}
    {project.stage === 'publish' && project.worksheet ? <PublishCard project={project} patch={patch} audit={audit} exportActions={exportActions} sendTo={sendTo} /> : null}

    {showVersions ? <VersionModal project={project} patch={patch} onClose={() => setShowVersions(false)} onSave={saveVersion} /> : null}
    <footer className="wf2-footer"><span>Teacher Library: {libraryCount}</span><span>Item Bank: {bankCount}</span><span>{hasApiKey ? `${providerName} sẵn sàng` : 'Local engine sẵn sàng'}</span><button type="button" onClick={downloadProject}>Tải backup dự án</button></footer>
  </div>;
}
