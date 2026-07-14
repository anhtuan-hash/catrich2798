import React, { useEffect, useMemo, useRef, useState } from 'react';
import { callAI, extractJson } from '../utils/gemini.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { addHistoryEntry, exportAsHtml, exportAsWord } from '../utils/library.js';
import { createTransfer, listTransfers, updateTransfer, TRANSFER_APPLY_EVENT } from '../utils/contentTransfer.js';
import { getActiveAiConfig, getProviderInfo } from '../utils/aiProviders.js';
import './WritingStudio.css';

const BUILD_MODES = [
  { id: 'guided', icon: '⌁', title: 'Guided Writing', desc: 'Hướng dẫn từng bước với sentence frames, word bank và checklist.' },
  { id: 'process', icon: '↻', title: 'Process Writing', desc: 'Lập kế hoạch, viết nhiều bản nháp, phản hồi và chỉnh sửa.' },
  { id: 'exam', icon: '◷', title: 'Exam Writing', desc: 'Viết theo thời gian, số từ và rubric của bài thi.' },
  { id: 'model', icon: '◫', title: 'Model Analysis', desc: 'Phân tích cấu trúc, ngôn ngữ và chiến lược của bài mẫu.' },
  { id: 'feedback', icon: '✓', title: 'Feedback & Revision', desc: 'Chấm, phản hồi và hỗ trợ sửa một bài viết có sẵn.' },
  { id: 'diagnostic', icon: '⌁', title: 'Diagnostic Writing', desc: 'Phân loại lỗi và tạo kế hoạch phụ đạo cá nhân hóa.' },
];

const GENRES = [
  'Paragraph', 'Email / Letter', 'Opinion Essay', 'Discussion Essay', 'Problem–Solution Essay',
  'Cause–Effect Essay', 'Article', 'Report', 'Review', 'Story / Narrative', 'Proposal',
  'Blog Post', 'Social-media Post', 'Chart / Graph Description', 'THPT Writing Task', 'Custom Genre',
];

const PURPOSES = ['Inform', 'Explain', 'Persuade', 'Compare', 'Evaluate', 'Narrate', 'Recommend', 'Reflect'];
const AUDIENCES = ['Teacher', 'Classmates', 'School community', 'General readers', 'Formal organisation', 'Online readers', 'Examiner'];
const TONES = ['Neutral', 'Formal', 'Semi-formal', 'Academic', 'Persuasive', 'Reflective', 'Friendly', 'Critical'];
const WORKFLOW_STEPS = [
  ['01', 'Mục đích', 'ws-card-mode'], ['02', 'Nhiệm vụ', 'ws-card-task'], ['03', 'Đối tượng', 'ws-card-learner'],
  ['04', 'Tiêu chí', 'ws-card-rubric'], ['05', 'Lập kế hoạch', 'ws-card-planning'], ['06', 'Viết & sửa', 'ws-card-editor'], ['07', 'Xuất bản', 'ws-card-publish'],
];

const AI_TASKS = [
  { id: 'analyse-prompt', icon: '◎', title: 'Phân tích đề', desc: 'Xác định yêu cầu, đối tượng đọc, mục đích và rủi ro lạc đề.' },
  { id: 'ideas', icon: '✦', title: 'Gợi ý ý tưởng', desc: 'Tạo idea bank, luận điểm, dẫn chứng và phản biện.' },
  { id: 'outline', icon: '▦', title: 'Lập dàn ý', desc: 'Tạo cấu trúc mở bài, thân bài, ví dụ và kết luận.' },
  { id: 'language', icon: 'Aa', title: 'Language Toolkit', desc: 'Tạo từ vựng, collocations, linking devices và sentence frames.' },
  { id: 'model', icon: '▤', title: 'Phân tích bài mẫu', desc: 'Đánh dấu cấu trúc, cohesive devices và điểm có thể cải thiện.' },
  { id: 'feedback', icon: '✓', title: 'Chấm theo rubric', desc: 'Chấm từng tiêu chí, nêu điểm mạnh và ba ưu tiên sửa bài.' },
  { id: 'rewrite', icon: '✎', title: 'Viết lại vùng chọn', desc: 'Viết lại đúng phần được chọn, giữ nguyên ý và mục tiêu.' },
  { id: 'differentiate', icon: '≋', title: 'Phân hóa', desc: 'Tạo hỗ trợ cho học sinh yếu và nhiệm vụ mở rộng cho học sinh khá giỏi.' },
  { id: 'custom', icon: '⌘', title: 'Yêu cầu riêng', desc: 'Giao một nhiệm vụ chuyên môn cụ thể cho AI Writing Coach.' },
];

const PLANNING_TABS = [
  ['ideas', 'Idea Bank'], ['outline', 'Outline'], ['language', 'Language Toolkit'], ['model', 'Model Analysis'], ['support', 'Differentiation'],
];

const DEFAULT_RUBRIC = [
  { id: 'task', label: 'Task achievement', weight: 20, description: 'Trả lời đúng và đủ yêu cầu của đề.' },
  { id: 'organisation', label: 'Organisation', weight: 15, description: 'Bố cục thể loại rõ ràng, cân đối.' },
  { id: 'coherence', label: 'Coherence & cohesion', weight: 15, description: 'Ý phát triển logic, liên kết hiệu quả.' },
  { id: 'vocabulary', label: 'Vocabulary range', weight: 15, description: 'Từ vựng phù hợp, đa dạng và tự nhiên.' },
  { id: 'grammar', label: 'Grammar range & accuracy', weight: 20, description: 'Cấu trúc đa dạng, lỗi không cản trở giao tiếp.' },
  { id: 'register', label: 'Register & tone', weight: 10, description: 'Giọng văn phù hợp người đọc và mục đích.' },
  { id: 'mechanics', label: 'Mechanics', weight: 5, description: 'Chính tả, dấu câu và trình bày.' },
];

const DESTINATIONS = [
  { id: 'lesson-plan-ai', route: '#/tool/lesson-plan-ai', icon: 'LA', label: 'Lesson Architect', desc: 'Gửi stages, objectives, assessment và homework.' },
  { id: 'reading-studio', route: '#/tool/reading-studio', icon: 'RS', label: 'Reading Studio', desc: 'Gửi post-reading writing task hoặc model response.' },
  { id: 'grammar-builder', route: '#/tool/grammar-builder', icon: 'GB', label: 'Grammar Builder', desc: 'Gửi target grammar và lỗi thực tế của học sinh.' },
  { id: 'word2graph', route: '#/tool/word2graph', icon: 'WG', label: 'WordGraph Studio', desc: 'Gửi vocabulary, collocations và gaps cần bổ sung.' },
  { id: 'speaking-studio', route: '#/tool/speaking-studio', icon: 'SS', label: 'Speaking Studio', desc: 'Gửi pre-writing discussion hoặc presentation task.' },
  { id: 'worksheet-factory', route: '#/tool/worksheet-factory', icon: 'WF', label: 'Worksheet Factory', desc: 'Dàn trang planning sheet, peer review và rubric.' },
  { id: 'exam-studio', route: '#/tool/exam-studio', icon: 'EX', label: 'Exam Studio', desc: 'Gửi writing question, rubric và marking guide.' },
  { id: 'textlab-activities', route: '#/tool/textlab-activities', icon: 'AC', label: 'Activity Studio', desc: 'Tạo ordering, error hunt hoặc peer-review station.' },
  { id: 'english-lesson-integration', route: '#/tool/english-lesson-integration', icon: 'EL', label: 'AI Lesson Integration', desc: 'Chèn writing activity vào giáo án đang chỉnh sửa.' },
];

const STAGES = ['planning', 'first-draft', 'ai-reviewed', 'peer-reviewed', 'teacher-reviewed', 'revised', 'teacher-approved', 'published'];
const STAGE_LABELS = {
  planning: 'Planning', 'first-draft': 'First Draft', 'ai-reviewed': 'AI Reviewed', 'peer-reviewed': 'Peer Reviewed',
  'teacher-reviewed': 'Teacher Reviewed', revised: 'Revised', 'teacher-approved': 'Teacher Approved', published: 'Published',
};

function uid(prefix = 'ws') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function safeToken(value) {
  return String(value || 'guest').toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}
function projectKey(user) {
  return `bes-writing-studio-v1152-project:${safeToken(user?.id || user?.email || 'guest')}`;
}
function vaultKey(user) {
  return `bes-writing-studio-v1152-vault:${safeToken(user?.id || user?.email || 'guest')}`;
}
function readJson(key, fallback) {
  try { return JSON.parse(window.localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function lines(value) {
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}
function words(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean);
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60); const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function defaultProject() {
  return {
    id: uid('writing'), title: 'Technology in Education — Opinion Essay', mode: 'process', genre: 'Opinion Essay', customGenre: '',
    grade: '12', level: 'B2', book: 'Global Success', unit: 'Unit 5', topic: 'Technology in education',
    prompt: 'Some people believe artificial intelligence should be used widely in schools, while others think it may weaken independent thinking. Write an essay giving your opinion.',
    audience: 'Examiner', purpose: 'Persuade', tone: 'Academic', wordTarget: 250, timeLimit: 45,
    requiredGrammar: 'Conditionals; concession clauses; hedging language', learnerNotes: 'Mixed-ability class; provide sentence frames but keep the final draft independent.',
    sourceKind: 'task', sourceName: '', sourceText: '', taskAnalysis: null,
    rubricScale: '100', rubric: DEFAULT_RUBRIC,
    planning: {
      ideas: ['AI can provide immediate feedback', 'Students still need to evaluate AI suggestions', 'Teachers should set clear ethical rules'],
      outline: {
        introduction: 'Context + clear opinion that AI should support, not replace, independent thinking.',
        body1: 'Benefits: personalised feedback, accessibility and efficiency. Example: instant language suggestions.',
        body2: 'Risks: dependency, inaccurate output and reduced ownership. Counterargument + safeguards.',
        conclusion: 'Balanced adoption with teacher supervision and transparent AI use.',
      },
      vocabulary: ['personalised feedback', 'independent thinking', 'academic integrity', 'teacher supervision'],
      collocations: ['play a supporting role', 'exercise critical judgement', 'rely excessively on', 'verify information'],
      sentenceStarters: ['It is often argued that…', 'A major advantage is that…', 'Nevertheless, this benefit depends on…', 'In my view, …'],
      linkingDevices: ['To begin with', 'Moreover', 'Nevertheless', 'For example', 'Therefore', 'In conclusion'],
      grammarTargets: ['Although / While clauses', 'Second conditional', 'Modal verbs for recommendation'],
      commonErrors: ['Overusing “Nowadays”', 'Using informal contractions in an academic essay', 'Repeating “AI” in every sentence'],
      modelAnalysis: { structure: [], strengths: [], cohesion: [], vocabulary: [], grammar: [], improvements: [] },
    },
    differentiation: { support: [], core: [], stretch: [], sentenceFrames: [], wordBank: [] },
    modelText: '',
    draft: 'Artificial intelligence is becoming increasingly common in education. Although some people worry that it may reduce students’ ability to think independently, I believe it can be valuable when it is used as a support tool rather than a replacement for genuine learning.\n\nTo begin with, AI can give students immediate and personalised feedback. For example, a learner who is writing an essay can receive suggestions about organisation, vocabulary and grammar within seconds. This may help students recognise weaknesses that they would otherwise overlook.\n\nNevertheless, schools must prevent students from relying excessively on automated answers. If learners accepted every AI suggestion without checking it, they could lose ownership of their work and repeat inaccurate information. Teachers should therefore require students to explain which suggestions they accepted and why.\n\nIn conclusion, AI should be used in schools, but only under clear guidance. When students are taught to question, verify and revise AI output, technology can strengthen rather than weaken independent thinking.',
    feedback: { summary: '', strengths: [], priorities: [], scores: {}, comments: [], edits: [] },
    comments: [], versions: [], stage: 'first-draft', status: 'draft', customAiRequest: '', aiLog: [], updatedAt: Date.now(), createdAt: Date.now(),
  };
}

function projectText(project, teacher = true) {
  const rubric = project.rubric.map((item) => `- ${item.label} (${item.weight}%): ${item.description}`).join('\n');
  const planning = [
    'IDEA BANK', ...project.planning.ideas.map((item) => `- ${item}`), '', 'OUTLINE',
    `Introduction: ${project.planning.outline.introduction}`, `Body 1: ${project.planning.outline.body1}`,
    `Body 2: ${project.planning.outline.body2}`, `Conclusion: ${project.planning.outline.conclusion}`, '',
    'LANGUAGE TOOLKIT', `Vocabulary: ${project.planning.vocabulary.join(', ')}`, `Collocations: ${project.planning.collocations.join(', ')}`,
    `Sentence starters: ${project.planning.sentenceStarters.join(' | ')}`, `Linking devices: ${project.planning.linkingDevices.join(', ')}`,
    `Target grammar: ${project.planning.grammarTargets.join(', ')}`,
  ].join('\n');
  const feedback = teacher ? [
    '', 'TEACHER / AI REVIEW', project.feedback.summary || '(not reviewed)',
    `Strengths: ${(project.feedback.strengths || []).join('; ') || '(none)'}`,
    `Priorities: ${(project.feedback.priorities || []).join('; ') || '(none)'}`,
  ].join('\n') : '';
  return `${project.title}\n\nWRITING TASK\nGenre: ${project.genre}\nLevel: ${project.level}\nAudience: ${project.audience}\nPurpose: ${project.purpose}\nTone: ${project.tone}\nWord target: ${project.wordTarget}\nTime: ${project.timeLimit} minutes\nPrompt: ${project.prompt}\nRequired grammar: ${project.requiredGrammar}\n\nSUCCESS CRITERIA\n${rubric}\n\n${planning}\n\nDRAFT\n${project.draft}${feedback}`;
}

function localAudit(project) {
  const draftWords = words(project.draft).length;
  const paragraphs = String(project.draft || '').split(/\n\s*\n/).filter((part) => part.trim()).length;
  const promptKeywords = words(project.prompt).filter((word) => word.length > 5).slice(0, 10);
  const matchedKeywords = promptKeywords.filter((word) => project.draft.toLowerCase().includes(word.toLowerCase())).length;
  const linkers = project.planning.linkingDevices.filter((item) => project.draft.toLowerCase().includes(item.toLowerCase())).length;
  const grammarTargets = project.planning.grammarTargets.filter((item) => {
    const token = item.split(/[ /]/)[0]; return token && project.draft.toLowerCase().includes(token.toLowerCase());
  }).length;
  const wordDistance = project.wordTarget ? Math.abs(draftWords - project.wordTarget) / project.wordTarget : 0;
  const metrics = [
    { id: 'task', label: 'Task response', score: clamp(50 + matchedKeywords * 7, 0, 100), detail: `${matchedKeywords}/${promptKeywords.length || 1} từ khóa đề xuất hiện` },
    { id: 'length', label: 'Word target', score: clamp(100 - wordDistance * 110, 0, 100), detail: `${draftWords}/${project.wordTarget} từ` },
    { id: 'structure', label: 'Structure', score: clamp(paragraphs * 22, 0, 100), detail: `${paragraphs} đoạn` },
    { id: 'cohesion', label: 'Cohesion', score: clamp(40 + linkers * 12, 0, 100), detail: `${linkers} linking devices mục tiêu` },
    { id: 'grammar', label: 'Target grammar', score: clamp(45 + grammarTargets * 18, 0, 100), detail: `${grammarTargets}/${project.planning.grammarTargets.length || 1} mục tiêu nhận diện` },
  ];
  const weightedAiScores = project.feedback?.scores || {};
  const rubricScore = project.rubric.reduce((sum, item) => sum + (Number(weightedAiScores[item.id]) || 0) * item.weight / 100, 0);
  const localScore = metrics.reduce((sum, item) => sum + item.score, 0) / metrics.length;
  return { metrics, score: Math.round(rubricScore || localScore), wordCount: draftWords, paragraphs };
}

function SectionHeader({ number, eyebrow, title, desc, action }) {
  return <header className="ws-card-head"><div className="ws-number">{number}</div><div><span>{eyebrow}</span><h2>{title}</h2><p>{desc}</p></div>{action ? <div className="ws-card-action">{action}</div> : null}</header>;
}

function ContextMetric({ icon, label, value }) {
  return <div className="ws-context-metric"><i>{icon}</i><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function Field({ label, children, className = '' }) {
  return <label className={`ws-field ${className}`}><span>{label}</span>{children}</label>;
}

function TextListEditor({ value, onChange, placeholder }) {
  return <textarea rows={8} value={(value || []).join('\n')} onChange={(event) => onChange(lines(event.target.value))} placeholder={placeholder} />;
}

function buildAiPrompt(taskId, project, selectedText = '') {
  const base = {
    mode: project.mode, genre: project.genre, level: project.level, grade: project.grade, topic: project.topic,
    audience: project.audience, purpose: project.purpose, tone: project.tone, wordTarget: project.wordTarget,
    prompt: project.prompt, requiredGrammar: project.requiredGrammar, learnerNotes: project.learnerNotes,
    source: String(project.sourceText || '').slice(0, 18000), draft: String(project.draft || '').slice(0, 18000), selectedText,
    rubric: project.rubric, planning: project.planning,
  };
  const taskRules = {
    'analyse-prompt': 'Analyse the writing task. Return taskAnalysis with taskType, audience, purpose, tone, contentRequirements, risks, and successChecklist.',
    ideas: 'Generate an idea bank. Return ideas as an array of concise but developed points with possible evidence or examples.',
    outline: 'Build a usable outline. Return outline with introduction, body1, body2, and conclusion as strings.',
    language: 'Create a language toolkit. Return language with vocabulary, collocations, sentenceStarters, linkingDevices, grammarTargets, and commonErrors arrays.',
    model: 'Analyse the supplied model/source text. Return modelAnalysis with structure, strengths, cohesion, vocabulary, grammar, and improvements arrays. If no source exists, create a short modelText and then analyse it.',
    feedback: 'Assess the draft using the rubric. Return feedback with summary, strengths, priorities, scores keyed by rubric criterion id (0-100), comments, and edits. Each edit contains before, after, reason.',
    rewrite: 'Rewrite only selectedText if provided, otherwise rewrite the weakest paragraph. Return rewrite with text, reason, and changes. Preserve the student’s meaning and do not replace the entire essay unnecessarily.',
    differentiate: 'Create differentiation. Return differentiation with support, core, stretch, sentenceFrames, and wordBank arrays.',
    custom: `Complete this custom coaching request: ${project.customAiRequest || 'Improve the selected part while preserving the writer’s voice.'}. Return customResult with summary, suggestions, and revisedText if relevant.`,
  };
  return `You are Brian Writing Coach, an expert in process writing for Vietnamese upper-secondary English learners. Support learning without silently replacing the student’s work. Be accurate, specific and classroom-ready.\n\nPROJECT DATA:\n${JSON.stringify(base, null, 2)}\n\nTASK:\n${taskRules[taskId]}\n\nReturn strict JSON only. Use English for writing content and concise Vietnamese for teacher-facing explanations when useful.`;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : item?.detail || item?.title || JSON.stringify(item)).filter(Boolean);
  return lines(value);
}

export default function WritingStudio({ language = 'vi', apiKey = '', aiModel = '', hasApiKey = false, currentUser }) {
  const [project, setProject] = useState(() => typeof window === 'undefined' ? defaultProject() : readJson(projectKey(currentUser), defaultProject()));
  const [vault, setVault] = useState(() => typeof window === 'undefined' ? [] : readJson(vaultKey(currentUser), []));
  const [activePlanningTab, setActivePlanningTab] = useState('ideas');
  const [activeStep, setActiveStep] = useState('01');
  const [aiLoading, setAiLoading] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [showAi, setShowAi] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [sourceType, setSourceType] = useState('task');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [pendingTransfer, setPendingTransfer] = useState(() => typeof window === 'undefined' ? null : listTransfers(currentUser, 'writing-studio').find((item) => item.status === 'pending') || null);
  const fileRef = useRef(null);
  const draftRef = useRef(null);
  const audit = useMemo(() => localAudit(project), [project]);
  const providerConfig = useMemo(() => getActiveAiConfig(), [hasApiKey, apiKey, aiModel, aiLoading]);
  const providerInfo = useMemo(() => getProviderInfo(providerConfig?.provider), [providerConfig?.provider]);
  const rubricWeight = project.rubric.reduce((sum, item) => sum + Number(item.weight || 0), 0);

  useEffect(() => {
    const saved = readJson(projectKey(currentUser), null);
    if (saved?.id) setProject(saved);
    setVault(readJson(vaultKey(currentUser), []));
    setPendingTransfer(listTransfers(currentUser, 'writing-studio').find((item) => item.status === 'pending') || null);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = { ...project, updatedAt: Date.now() };
      try { window.localStorage.setItem(projectKey(currentUser), JSON.stringify(next)); } catch { /* optional */ }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [project, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    const onApply = (event) => {
      const item = event.detail;
      if (!item || item.target !== 'writing-studio') return;
      setProject((current) => ({ ...current, sourceText: item.content || '', sourceName: item.title || 'Transfer Inbox', sourceKind: item.type || 'transfer', updatedAt: Date.now() }));
      setPendingTransfer(item);
    };
    window.addEventListener(TRANSFER_APPLY_EVENT, onApply);
    return () => window.removeEventListener(TRANSFER_APPLY_EVENT, onApply);
  }, []);

  const patch = (next) => setProject((current) => ({ ...current, ...(typeof next === 'function' ? next(current) : next), updatedAt: Date.now() }));
  const patchPlanning = (next) => patch((current) => ({ planning: { ...current.planning, ...next } }));

  const scrollToCard = (step, id) => {
    setActiveStep(step);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const loadSample = () => {
    setProject(defaultProject()); setElapsed(0); setSelectedText(''); setAiResult(null); setAiError('');
  };

  const handleFile = async (file) => {
    if (!file) return;
    setAiError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const buffer = await file.arrayBuffer();
      let text = '';
      if (extension === 'docx') text = await readDocxTextFromBuffer(buffer);
      else if (extension === 'pdf') text = await readPdfTextFromBuffer(buffer);
      else text = await file.text();
      patch({ sourceText: text.slice(0, 120000), sourceName: file.name, sourceKind: sourceType });
    } catch (error) { setAiError(error.message || 'Không thể đọc file.'); }
  };

  const applyTransfer = () => {
    if (!pendingTransfer) return;
    patch({ sourceText: pendingTransfer.content || '', sourceName: pendingTransfer.title || 'Transfer Inbox', sourceKind: pendingTransfer.type || 'transfer' });
    updateTransfer(currentUser, pendingTransfer.id, { status: 'applied', appliedAt: Date.now() });
    setPendingTransfer(null);
  };

  const captureSelection = () => {
    const node = draftRef.current;
    if (!node) return;
    setSelectedText(node.value.slice(node.selectionStart, node.selectionEnd));
  };

  const runAiTask = async (taskId) => {
    const keyAvailable = String(apiKey || providerConfig?.apiKey || '').trim();
    if (!keyAvailable) { setAiError('Chưa cấu hình API key trong Cài đặt AI của Brian.'); setShowAi(true); return; }
    if (taskId === 'custom' && !project.customAiRequest.trim()) { setAiError('Hãy nhập yêu cầu riêng trước khi chạy AI.'); setShowAi(true); return; }
    if (taskId === 'rewrite' && !selectedText.trim()) { setAiError('Hãy bôi đen một câu hoặc đoạn trong Draft Editor trước khi yêu cầu viết lại.'); setShowAi(true); return; }
    setAiLoading(taskId); setAiError(''); setAiResult(null); setShowAi(true);
    try {
      const raw = await callAI({
        apiKey, model: aiModel, prompt: buildAiPrompt(taskId, project, selectedText),
        systemInstruction: 'You are an expert process-writing coach. Return strict JSON. Never claim to detect AI authorship. Preserve student ownership and explain every proposed revision.',
        temperature: taskId === 'feedback' ? 0.25 : 0.55, responseMimeType: 'application/json', maxOutputTokens: 5200,
        governanceProfile: 'teacher-content-creation', loadingLabel: `Writing Coach · ${AI_TASKS.find((task) => task.id === taskId)?.title || taskId}`,
      });
      let parsed;
      try { parsed = extractJson(raw); } catch { parsed = { raw }; }
      setAiResult({ taskId, raw, parsed, createdAt: Date.now() });
      patch((current) => ({ aiLog: [{ id: uid('ai'), taskId, createdAt: Date.now(), provider: providerInfo?.label || providerConfig?.provider || '', model: providerConfig?.model || aiModel || '' }, ...(current.aiLog || [])].slice(0, 40) }));
    } catch (error) { setAiError(error.message || 'AI không phản hồi.'); }
    finally { setAiLoading(''); }
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    const { taskId, parsed } = aiResult;
    if (taskId === 'analyse-prompt') patch({ taskAnalysis: parsed.taskAnalysis || parsed.analysis || parsed });
    if (taskId === 'ideas') patchPlanning({ ideas: normalizeArray(parsed.ideas || parsed.ideaBank || parsed) });
    if (taskId === 'outline') patchPlanning({ outline: { ...project.planning.outline, ...(parsed.outline || parsed) } });
    if (taskId === 'language') {
      const value = parsed.language || parsed;
      patchPlanning({
        vocabulary: normalizeArray(value.vocabulary), collocations: normalizeArray(value.collocations),
        sentenceStarters: normalizeArray(value.sentenceStarters), linkingDevices: normalizeArray(value.linkingDevices),
        grammarTargets: normalizeArray(value.grammarTargets), commonErrors: normalizeArray(value.commonErrors),
      });
    }
    if (taskId === 'model') {
      const value = parsed.modelAnalysis || parsed.analysis || parsed;
      patchPlanning({ modelAnalysis: {
        structure: normalizeArray(value.structure), strengths: normalizeArray(value.strengths), cohesion: normalizeArray(value.cohesion || value.cohesiveDevices),
        vocabulary: normalizeArray(value.vocabulary || value.targetVocabulary), grammar: normalizeArray(value.grammar), improvements: normalizeArray(value.improvements),
      }});
      if (parsed.modelText) patch({ modelText: parsed.modelText });
    }
    if (taskId === 'feedback') patch({ feedback: parsed.feedback || parsed, stage: 'ai-reviewed' });
    if (taskId === 'differentiate') patch({ differentiation: parsed.differentiation || parsed });
    if (taskId === 'rewrite') {
      const rewrite = parsed.rewrite || parsed;
      const replacement = rewrite.text || rewrite.revisedText || '';
      if (replacement && selectedText && project.draft.includes(selectedText)) patch({ draft: project.draft.replace(selectedText, replacement), stage: 'revised' });
    }
    if (taskId === 'custom') {
      const value = parsed.customResult || parsed;
      if (value.revisedText) patch({ draft: value.revisedText, stage: 'revised' });
    }
    setShowAi(false); setAiResult(null);
  };

  const saveVersion = () => {
    const version = { id: uid('version'), label: `${STAGE_LABELS[project.stage]} · ${new Date().toLocaleString('vi-VN')}`, draft: project.draft, stage: project.stage, feedback: project.feedback, createdAt: Date.now(), wordCount: audit.wordCount };
    patch((current) => ({ versions: [version, ...(current.versions || [])].slice(0, 30) }));
    setShowVersions(true);
  };

  const restoreVersion = (version) => {
    patch({ draft: version.draft, stage: version.stage || 'revised', feedback: version.feedback || project.feedback });
    setShowVersions(false);
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    patch((current) => ({ comments: [{ id: uid('comment'), text: commentText.trim(), createdAt: Date.now(), author: currentUser?.name || currentUser?.email || 'Teacher' }, ...(current.comments || [])] }));
    setCommentText('');
  };

  const saveToVault = () => {
    const entry = { ...project, id: uid('vault'), savedAt: Date.now(), qualityScore: audit.score, wordCount: audit.wordCount };
    const next = [entry, ...vault].slice(0, 50); setVault(next);
    try { window.localStorage.setItem(vaultKey(currentUser), JSON.stringify(next)); } catch { /* optional */ }
    addHistoryEntry({ sourceApp: 'writing-studio', sourceAppTitle: 'Writing Studio', title: project.title, content: projectText(project, true), tags: [project.genre, project.level, project.stage] });
  };

  const loadVault = (entry) => { setProject({ ...entry, id: uid('writing'), updatedAt: Date.now() }); setShowVault(false); };

  const sendTo = (destination) => {
    const payload = {
      schema: 'bes-writing-pack/1.0', project: {
        title: project.title, mode: project.mode, genre: project.genre, level: project.level, topic: project.topic,
        prompt: project.prompt, audience: project.audience, purpose: project.purpose, tone: project.tone,
        wordTarget: project.wordTarget, requiredGrammar: project.requiredGrammar, planning: project.planning,
        draft: project.draft, feedback: project.feedback, rubric: project.rubric, stage: project.stage, qualityScore: audit.score,
      },
    };
    createTransfer(currentUser, { type: 'writing-pack', title: project.title, sourceApp: 'writing-studio', sourceTitle: 'Writing Studio', target: destination.id, content: JSON.stringify(payload, null, 2), metadata: { schema: payload.schema, genre: project.genre, level: project.level, stage: project.stage } });
    window.location.hash = destination.route;
  };

  const publish = () => patch({ stage: 'published', status: 'published' });

  const summaryDate = new Date(project.updatedAt || Date.now()).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const activeMode = BUILD_MODES.find((item) => item.id === project.mode) || BUILD_MODES[0];
  const taskAnalysis = project.taskAnalysis || {};

  return (
    <div className="ws-page bui-workbench" data-ui="workbench" data-workbench="writing-studio" data-design="modern-saas-process-writing">
      <section className="ws-product-bar bui-workbench-header">
        <button className="ws-back" type="button" onClick={() => window.history.back()}>← Quay lại</button>
        <div className="ws-brand"><span>WS</span><div><small>WRITING STUDIO · V2.0</small><input value={project.title} onChange={(event) => patch({ title: event.target.value })} aria-label="Tên dự án" /></div></div>
        <div className="ws-product-actions">
          <span className="ws-save-state">● Tự động lưu</span><b>{audit.wordCount} words</b><b>{audit.score}/100</b>
          <button type="button" onClick={() => scrollToCard('04', 'ws-card-rubric')}>Rubric</button>
          <button type="button" onClick={() => scrollToCard('06', 'ws-card-editor')}>Review</button>
          <button type="button" onClick={() => setShowVersions(true)}>Versions</button>
          <button type="button" className="primary" onClick={() => scrollToCard('07', 'ws-card-publish')}>Publish</button>
        </div>
      </section>

      {pendingTransfer ? <section className="ws-transfer-banner"><div><strong>Nội dung từ {pendingTransfer.sourceTitle}</strong><span>{pendingTransfer.title}</span></div><button type="button" onClick={applyTransfer}>Dùng nội dung</button><button type="button" onClick={() => { updateTransfer(currentUser, pendingTransfer.id, { status: 'dismissed' }); setPendingTransfer(null); }}>Bỏ qua</button></section> : null}

      <section className="ws-context-strip bui-workbench-metrics">
        <ContextMetric icon="▣" label="Genre" value={project.genre} />
        <ContextMetric icon="≡" label="Word target" value={`${project.wordTarget} từ`} />
        <ContextMetric icon="◷" label="Time limit" value={`${project.timeLimit} phút`} />
        <ContextMetric icon="●" label="Current stage" value={STAGE_LABELS[project.stage]} />
        <ContextMetric icon="□" label="Last updated" value={summaryDate} />
      </section>

      <nav className="ws-workflow bui-workbench-workflow" aria-label="Writing workflow">
        {WORKFLOW_STEPS.map(([number, label, id]) => <button type="button" key={number} className={activeStep === number ? 'active' : ''} onClick={() => scrollToCard(number, id)}><i>{number}</i><span>{label}</span></button>)}
      </nav>

      <section className="ws-setup-grid bui-workbench-canvas">
        <article id="ws-card-mode" className="ws-card ws-card-mode">
          <SectionHeader number="01" eyebrow="BUILD MODE" title="Chọn mục đích viết" desc="Mỗi chế độ thay đổi cách AI hướng dẫn và đầu ra." />
          <div className="ws-choice-grid mode-grid">{BUILD_MODES.map((mode) => <button type="button" key={mode.id} className={project.mode === mode.id ? 'active' : ''} onClick={() => patch({ mode: mode.id })}><i>{mode.icon}</i><span><strong>{mode.title}</strong><small>{mode.desc}</small></span>{project.mode === mode.id ? <b>✓</b> : null}</button>)}</div>
          <div className="ws-card-footer"><span>Đang chọn: <strong>{activeMode.title}</strong></span><button type="button" onClick={loadSample}>Xem sample</button></div>
        </article>

        <article id="ws-card-task" className="ws-card ws-card-task">
          <SectionHeader number="02" eyebrow="WRITING TASK & GENRE" title="Xác định nhiệm vụ viết" desc="Đặt rõ thể loại, người đọc, mục đích và giới hạn đầu ra." action={<button type="button" onClick={() => runAiTask('analyse-prompt')}>✦ AI phân tích đề</button>} />
          <div className="ws-form-grid two">
            <Field label="Thể loại"><select value={project.genre} onChange={(event) => patch({ genre: event.target.value })}>{GENRES.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="CEFR"><select value={project.level} onChange={(event) => patch({ level: event.target.value })}>{['A2', 'B1', 'B2', 'B2–C1', 'C1'].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Người đọc"><select value={project.audience} onChange={(event) => patch({ audience: event.target.value })}>{AUDIENCES.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Mục đích giao tiếp"><select value={project.purpose} onChange={(event) => patch({ purpose: event.target.value })}>{PURPOSES.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Tone"><select value={project.tone} onChange={(event) => patch({ tone: event.target.value })}>{TONES.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Số từ"><input type="number" min="40" max="1200" value={project.wordTarget} onChange={(event) => patch({ wordTarget: Number(event.target.value) || 0 })} /></Field>
            <Field label="Thời gian (phút)"><input type="number" min="5" max="180" value={project.timeLimit} onChange={(event) => patch({ timeLimit: Number(event.target.value) || 0 })} /></Field>
            <Field label="Target grammar"><input value={project.requiredGrammar} onChange={(event) => patch({ requiredGrammar: event.target.value })} /></Field>
          </div>
          <Field label="Đề bài / tình huống giao tiếp"><textarea rows={5} value={project.prompt} onChange={(event) => patch({ prompt: event.target.value })} /></Field>
          {taskAnalysis && Object.keys(taskAnalysis).length ? <div className="ws-analysis-note"><strong>AI task analysis</strong><p>{taskAnalysis.taskType || taskAnalysis.summary || 'Đã phân tích đề bài.'}</p><span>{normalizeArray(taskAnalysis.successChecklist).slice(0, 4).join(' · ')}</span></div> : null}
        </article>

        <article id="ws-card-learner" className="ws-card ws-card-learner">
          <SectionHeader number="03" eyebrow="LEARNER & CONTEXT" title="Thiết lập người học" desc="Cá nhân hóa nhiệm vụ theo lớp, trình độ và điều kiện dạy học." />
          <div className="ws-form-grid two">
            <Field label="Khối"><select value={project.grade} onChange={(event) => patch({ grade: event.target.value })}>{['10', '11', '12'].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Bộ sách"><select value={project.book} onChange={(event) => patch({ book: event.target.value })}>{['Global Success', 'Friends Global', 'Bright', 'i-Learn Smart World', 'Tự biên soạn'].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Unit"><input value={project.unit} onChange={(event) => patch({ unit: event.target.value })} /></Field>
            <Field label="Chủ đề"><input value={project.topic} onChange={(event) => patch({ topic: event.target.value })} /></Field>
          </div>
          <Field label="Đặc điểm lớp học"><textarea rows={7} value={project.learnerNotes} onChange={(event) => patch({ learnerNotes: event.target.value })} /></Field>
          <div className="ws-learner-summary"><span>{project.grade}</span><span>{project.level}</span><span>{project.book}</span><span>{project.topic}</span></div>
        </article>

        <article id="ws-card-source" className="ws-card ws-card-source">
          <SectionHeader number="04" eyebrow="SOURCE & INPUT" title="Nguồn đầu vào" desc="Nhận đề bài, bài mẫu, bài nháp, rubric hoặc dữ liệu từ ứng dụng khác." />
          <div className="ws-source-toolbar">
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}><option value="task">Đề bài</option><option value="model">Bài mẫu</option><option value="draft">Bài học sinh</option><option value="reference">Tài liệu tham khảo</option><option value="rubric">Rubric</option></select>
            <button type="button" onClick={() => fileRef.current?.click()}>↑ Upload DOCX / PDF / TXT</button>
            <input ref={fileRef} hidden type="file" accept=".docx,.pdf,.txt,.md" onChange={(event) => handleFile(event.target.files?.[0])} />
            <button type="button" onClick={() => patch({ sourceText: '', sourceName: '' })}>Xóa nguồn</button>
          </div>
          <Field label={project.sourceName ? `${project.sourceName} · ${project.sourceText.length.toLocaleString()} ký tự` : 'Manual input / Transfer Inbox'}><textarea rows={12} value={project.sourceText} onChange={(event) => patch({ sourceText: event.target.value, sourceKind: sourceType })} placeholder="Dán bài mẫu, bài học sinh, dữ liệu nền hoặc rubric tại đây…" /></Field>
          <div className="ws-source-types"><span className={project.sourceKind === 'task' ? 'active' : ''}>Task</span><span className={project.sourceKind === 'model' ? 'active' : ''}>Model</span><span className={project.sourceKind === 'draft' ? 'active' : ''}>Student draft</span><span className={project.sourceKind === 'transfer' ? 'active' : ''}>Transfer</span></div>
        </article>

        <article id="ws-card-rubric" className="ws-card ws-card-rubric">
          <SectionHeader number="05" eyebrow="SUCCESS CRITERIA & RUBRIC" title="Thiết lập tiêu chí thành công" desc="Giáo viên quyết định bài viết tốt phải đáp ứng những gì." action={<span className={rubricWeight === 100 ? 'ws-weight-ok' : 'ws-weight-warning'}>{rubricWeight}%</span>} />
          <div className="ws-rubric-scale"><label>Thang điểm<select value={project.rubricScale} onChange={(event) => patch({ rubricScale: event.target.value })}><option value="10">10</option><option value="100">100</option><option value="4">Rubric 4 mức</option><option value="5">Rubric 5 mức</option></select></label><button type="button" onClick={() => patch({ rubric: DEFAULT_RUBRIC })}>Khôi phục rubric chuẩn</button></div>
          <div className="ws-rubric-list">{project.rubric.map((criterion) => <div key={criterion.id}><div><strong>{criterion.label}</strong><small>{criterion.description}</small></div><input type="range" min="0" max="40" value={criterion.weight} onChange={(event) => patch((current) => ({ rubric: current.rubric.map((item) => item.id === criterion.id ? { ...item, weight: Number(event.target.value) } : item) }))} /><b>{criterion.weight}%</b></div>)}</div>
        </article>

        <article id="ws-card-ai" className="ws-card ws-card-ai">
          <SectionHeader number="07" eyebrow="AI WRITING COACH" title="AI theo tác vụ chuyên môn" desc="Chọn đúng tác vụ; AI không tự động thay toàn bộ bài viết." action={<div className="ws-ai-state"><span className={hasApiKey || providerConfig?.apiKey ? 'ready' : ''}>● {hasApiKey || providerConfig?.apiKey ? 'AI thật đang bật' : 'Chưa cấu hình AI'}</span><small>{providerInfo?.label || 'AI Provider'} · {providerConfig?.model || aiModel || 'No model'}</small></div>} />
          <div className="ws-ai-task-grid">{AI_TASKS.map((task) => <button type="button" key={task.id} onClick={() => runAiTask(task.id)} disabled={Boolean(aiLoading)}><i>{task.icon}</i><span><strong>{task.title}</strong><small>{task.desc}</small></span><b>{aiLoading === task.id ? '…' : '↗'}</b></button>)}</div>
          <Field label="Yêu cầu riêng"><textarea rows={3} value={project.customAiRequest} onChange={(event) => patch({ customAiRequest: event.target.value })} placeholder="Ví dụ: Chỉ sửa mạch lạc ở đoạn 2, giữ nguyên giọng viết của học sinh…" /></Field>
        </article>
      </section>

      <article id="ws-card-planning" className="ws-card ws-card-planning full-width">
        <SectionHeader number="06" eyebrow="PLANNING & LANGUAGE STUDIO" title="Chuẩn bị trước khi viết" desc="Tổ chức ý tưởng, dàn ý, ngôn ngữ và hỗ trợ phân hóa trong một workspace." action={<div className="ws-planning-actions"><button type="button" onClick={() => runAiTask('ideas')}>✦ Gợi ý ý</button><button type="button" onClick={() => runAiTask('outline')}>▦ Lập dàn ý</button><button type="button" onClick={() => runAiTask('language')}>Aa Language</button></div>} />
        <div className="ws-planning-tabs">{PLANNING_TABS.map(([id, label]) => <button type="button" key={id} className={activePlanningTab === id ? 'active' : ''} onClick={() => setActivePlanningTab(id)}>{label}</button>)}</div>
        {activePlanningTab === 'ideas' ? <div className="ws-planning-pane"><div className="ws-plan-visual"><i>✦</i><strong>Idea Bank</strong><p>Mỗi dòng là một luận điểm, ví dụ hoặc bằng chứng có thể phát triển.</p></div><Field label="Ý tưởng"><TextListEditor value={project.planning.ideas} onChange={(value) => patchPlanning({ ideas: value })} placeholder="Mỗi dòng một ý…" /></Field></div> : null}
        {activePlanningTab === 'outline' ? <div className="ws-outline-grid"><Field label="Introduction"><textarea rows={6} value={project.planning.outline.introduction} onChange={(event) => patchPlanning({ outline: { ...project.planning.outline, introduction: event.target.value } })} /></Field><Field label="Body paragraph 1"><textarea rows={6} value={project.planning.outline.body1} onChange={(event) => patchPlanning({ outline: { ...project.planning.outline, body1: event.target.value } })} /></Field><Field label="Body paragraph 2"><textarea rows={6} value={project.planning.outline.body2} onChange={(event) => patchPlanning({ outline: { ...project.planning.outline, body2: event.target.value } })} /></Field><Field label="Conclusion"><textarea rows={6} value={project.planning.outline.conclusion} onChange={(event) => patchPlanning({ outline: { ...project.planning.outline, conclusion: event.target.value } })} /></Field></div> : null}
        {activePlanningTab === 'language' ? <div className="ws-language-grid"><Field label="Vocabulary"><TextListEditor value={project.planning.vocabulary} onChange={(value) => patchPlanning({ vocabulary: value })} /></Field><Field label="Collocations"><TextListEditor value={project.planning.collocations} onChange={(value) => patchPlanning({ collocations: value })} /></Field><Field label="Sentence starters"><TextListEditor value={project.planning.sentenceStarters} onChange={(value) => patchPlanning({ sentenceStarters: value })} /></Field><Field label="Linking devices"><TextListEditor value={project.planning.linkingDevices} onChange={(value) => patchPlanning({ linkingDevices: value })} /></Field><Field label="Target grammar"><TextListEditor value={project.planning.grammarTargets} onChange={(value) => patchPlanning({ grammarTargets: value })} /></Field><Field label="Common learner errors"><TextListEditor value={project.planning.commonErrors} onChange={(value) => patchPlanning({ commonErrors: value })} /></Field></div> : null}
        {activePlanningTab === 'model' ? <div className="ws-model-grid"><Field label="Model text"><textarea rows={18} value={project.modelText || (project.sourceKind === 'model' ? project.sourceText : '')} onChange={(event) => patch({ modelText: event.target.value })} /></Field><div className="ws-model-analysis"><button type="button" onClick={() => runAiTask('model')}>✦ Phân tích bài mẫu</button>{Object.entries(project.planning.modelAnalysis || {}).map(([key, value]) => <div key={key}><strong>{key}</strong><ul>{normalizeArray(value).map((item, index) => <li key={`${key}-${index}`}>{item}</li>)}</ul></div>)}</div></div> : null}
        {activePlanningTab === 'support' ? <div className="ws-language-grid"><Field label="Support"><TextListEditor value={project.differentiation.support} onChange={(value) => patch({ differentiation: { ...project.differentiation, support: value } })} /></Field><Field label="Core"><TextListEditor value={project.differentiation.core} onChange={(value) => patch({ differentiation: { ...project.differentiation, core: value } })} /></Field><Field label="Stretch"><TextListEditor value={project.differentiation.stretch} onChange={(value) => patch({ differentiation: { ...project.differentiation, stretch: value } })} /></Field><Field label="Sentence frames"><TextListEditor value={project.differentiation.sentenceFrames} onChange={(value) => patch({ differentiation: { ...project.differentiation, sentenceFrames: value } })} /></Field><Field label="Word bank"><TextListEditor value={project.differentiation.wordBank} onChange={(value) => patch({ differentiation: { ...project.differentiation, wordBank: value } })} /></Field><div className="ws-support-callout"><i>≋</i><strong>AI Differentiation</strong><p>Tạo bản có scaffolding, bản chuẩn và nhiệm vụ stretch.</p><button type="button" onClick={() => runAiTask('differentiate')}>Tạo hỗ trợ bằng AI</button></div></div> : null}
      </article>

      <article id="ws-card-editor" className="ws-card ws-card-editor full-width">
        <SectionHeader number="08" eyebrow="DRAFT EDITOR & QUALITY REVIEW" title="Viết, phản hồi và chỉnh sửa" desc="Lưu nhiều phiên bản, đánh giá theo rubric và duyệt từng đề xuất AI." action={<div className="ws-stage-picker"><select value={project.stage} onChange={(event) => patch({ stage: event.target.value })}>{STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}</select><button type="button" onClick={saveVersion}>Lưu phiên bản</button></div>} />
        <div className="ws-editor-layout">
          <section className="ws-draft-pane">
            <div className="ws-editor-toolbar"><span>{audit.wordCount} words · {audit.paragraphs} paragraphs</span><button type="button" onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? 'Tạm dừng' : 'Bắt đầu timer'} · {formatTime(elapsed)}</button><button type="button" disabled={!selectedText} onClick={() => runAiTask('rewrite')}>AI viết lại vùng chọn</button><button type="button" onClick={() => runAiTask('feedback')}>AI review</button></div>
            <textarea ref={draftRef} rows={28} value={project.draft} onChange={(event) => patch({ draft: event.target.value, stage: project.stage === 'planning' ? 'first-draft' : project.stage })} onSelect={captureSelection} placeholder="Bắt đầu viết tại đây…" />
            {selectedText ? <div className="ws-selection-note"><strong>Đã chọn {words(selectedText).length} từ</strong><span>{selectedText.slice(0, 150)}{selectedText.length > 150 ? '…' : ''}</span><button type="button" onClick={() => setSelectedText('')}>Bỏ chọn</button></div> : null}
          </section>
          <aside className="ws-review-pane">
            <div className="ws-score-ring" style={{ '--score': audit.score }}><strong>{audit.score}</strong><span>Quality score</span></div>
            <div className="ws-audit-metrics">{audit.metrics.map((metric) => <div key={metric.id}><span><i style={{ width: `${metric.score}%` }} /></span><strong>{metric.label}</strong><b>{Math.round(metric.score)}</b><small>{metric.detail}</small></div>)}</div>
            <section className="ws-feedback-summary"><h3>Feedback</h3><p>{project.feedback.summary || 'Chưa có AI/teacher review. Chạy “AI review” hoặc thêm nhận xét bên dưới.'}</p>{(project.feedback.strengths || []).length ? <><strong>Điểm mạnh</strong><ul>{project.feedback.strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}</ul></> : null}{(project.feedback.priorities || []).length ? <><strong>Ưu tiên sửa</strong><ul>{project.feedback.priorities.map((item, index) => <li key={`priority-${index}`}>{item}</li>)}</ul></> : null}</section>
            <section className="ws-comments"><h3>Teacher comments</h3><div><input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Thêm nhận xét…" /><button type="button" onClick={addComment}>＋</button></div>{project.comments.slice(0, 5).map((comment) => <article key={comment.id}><strong>{comment.author}</strong><p>{comment.text}</p><small>{new Date(comment.createdAt).toLocaleString('vi-VN')}</small></article>)}</section>
          </aside>
        </div>
      </article>

      <article id="ws-card-publish" className="ws-card ws-card-publish full-width">
        <SectionHeader number="09" eyebrow="PUBLISH & CONNECTED WORKFLOW" title="Xuất bản và phân phối" desc="Tạo bản học sinh, bản giáo viên, lưu portfolio hoặc gửi sang ứng dụng khác." action={<span className={`ws-publish-state ${project.stage}`}>{STAGE_LABELS[project.stage]}</span>} />
        <div className="ws-publish-grid">
          <section><h3>Xuất tài liệu</h3><div className="ws-export-grid"><button type="button" onClick={() => exportAsWord(`${project.title} — Student`, projectText(project, false))}><i>W</i><span><strong>Bản học sinh</strong><small>DOC · task, planning và draft</small></span></button><button type="button" onClick={() => exportAsWord(`${project.title} — Teacher`, projectText(project, true))}><i>W+</i><span><strong>Bản giáo viên</strong><small>DOC · rubric và feedback</small></span></button><button type="button" onClick={() => exportAsHtml(project.title, projectText(project, true))}><i>H</i><span><strong>HTML / Print PDF</strong><small>Xem, in hoặc lưu PDF</small></span></button><button type="button" onClick={saveToVault}><i>V</i><span><strong>Teacher Vault</strong><small>Lưu dự án và lịch sử</small></span></button><button type="button" onClick={() => setShowVault(true)}><i>▣</i><span><strong>Mở Portfolio</strong><small>{vault.length} dự án đã lưu</small></span></button><button type="button" className="primary" onClick={publish}><i>✓</i><span><strong>Teacher Approved</strong><small>Đánh dấu sẵn sàng xuất bản</small></span></button></div></section>
          <section><h3>Connected Workflow</h3><div className="ws-destination-grid">{DESTINATIONS.map((destination) => <button type="button" key={destination.id} onClick={() => sendTo(destination)}><i>{destination.icon}</i><span><strong>{destination.label}</strong><small>{destination.desc}</small></span><b>↗</b></button>)}</div></section>
        </div>
      </article>

      {showAi ? <div className="ws-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !aiLoading) setShowAi(false); }}><section className="ws-modal ws-ai-modal"><header><div><span>AI WRITING COACH</span><h2>{AI_TASKS.find((task) => task.id === aiResult?.taskId || task.id === aiLoading)?.title || 'AI result'}</h2><p>{providerInfo?.label || 'AI Provider'} · {providerConfig?.model || aiModel || 'No model'}</p></div><button type="button" disabled={Boolean(aiLoading)} onClick={() => setShowAi(false)}>×</button></header>{aiLoading ? <div className="ws-ai-loading"><i>✦</i><strong>Đang xử lý tác vụ chuyên môn…</strong><span>AI đang đọc task, planning, draft và rubric hiện tại.</span></div> : null}{aiError ? <div className="ws-ai-error"><strong>Không thể chạy AI</strong><p>{aiError}</p></div> : null}{aiResult ? <div className="ws-ai-result"><pre>{JSON.stringify(aiResult.parsed, null, 2)}</pre><footer><button type="button" onClick={() => navigator.clipboard?.writeText(aiResult.raw)}>Sao chép</button><button type="button" className="primary" onClick={applyAiResult}>Áp dụng kết quả</button></footer></div> : null}</section></div> : null}

      {showVersions ? <div className="ws-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowVersions(false); }}><section className="ws-modal ws-version-modal"><header><div><span>VERSION HISTORY</span><h2>Lịch sử bản nháp</h2><p>{project.versions.length} phiên bản đã lưu.</p></div><button type="button" onClick={() => setShowVersions(false)}>×</button></header><div className="ws-version-list">{project.versions.length ? project.versions.map((version) => <article key={version.id}><div><span>{STAGE_LABELS[version.stage] || version.stage}</span><h3>{version.label}</h3><p>{version.wordCount} words</p></div><pre>{version.draft.slice(0, 450)}{version.draft.length > 450 ? '…' : ''}</pre><button type="button" onClick={() => restoreVersion(version)}>Khôi phục</button></article>) : <div className="ws-empty"><strong>Chưa có phiên bản.</strong><p>Nhấn “Lưu phiên bản” trước mỗi vòng phản hồi hoặc chỉnh sửa lớn.</p></div>}</div></section></div> : null}

      {showVault ? <div className="ws-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowVault(false); }}><section className="ws-modal ws-vault-modal"><header><div><span>TEACHER VAULT · WRITING PORTFOLIO</span><h2>Dự án Writing Studio</h2><p>{vault.length} dự án đã lưu trên tài khoản này.</p></div><button type="button" onClick={() => setShowVault(false)}>×</button></header><div className="ws-vault-list">{vault.length ? vault.map((entry) => <article key={entry.id}><div><span>{entry.genre} · {entry.level}</span><h3>{entry.title}</h3><p>{entry.wordCount} words · {STAGE_LABELS[entry.stage]}</p></div><strong>{entry.qualityScore || 0}</strong><button type="button" onClick={() => loadVault(entry)}>Mở</button><button type="button" className="danger" onClick={() => { const next = vault.filter((item) => item.id !== entry.id); setVault(next); window.localStorage.setItem(vaultKey(currentUser), JSON.stringify(next)); }}>Xóa</button></article>) : <div className="ws-empty"><strong>Portfolio đang trống.</strong><p>Lưu dự án hiện tại để tái sử dụng hoặc theo dõi tiến bộ.</p></div>}</div><footer><button type="button" className="primary" onClick={saveToVault}>＋ Lưu dự án hiện tại</button></footer></section></div> : null}
    </div>
  );
}
