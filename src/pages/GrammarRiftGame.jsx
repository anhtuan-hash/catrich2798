import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, BookOpen, Check, ChevronRight, Clock3, Download, Expand,
  Eye, FileJson, Flame, Gamepad2, Link2, Pause, Play, RotateCcw,
  Scissors, Settings, Shield, Sparkles, Swords, TimerReset, Upload,
  Volume2, VolumeX, X, Zap,
} from 'lucide-react';
import '../styles/GrammarRiftGame.css';
import '../styles/GrammarRiftGameEnhancements.css';

const BANK_KEY = 'brian-grammar-rift-bank-v2';
const RESULT_KEY = 'brian-grammar-rift-results-v2';
const SETTINGS_KEY = 'brian-grammar-rift-settings-v2';

const MODES = [
  { id: 'timeline', icon: Clock3, en: 'Timeline Repair', vi: 'Sửa Dòng Thời Gian' },
  { id: 'surgery', icon: Scissors, en: 'Sentence Surgery', vi: 'Phẫu Thuật Câu' },
  { id: 'intruder', icon: Swords, en: 'Grammar Intruder', vi: 'Kẻ Xâm Nhập' },
  { id: 'fusion', icon: Link2, en: 'Clause Fusion', vi: 'Hợp Nhất Mệnh Đề' },
  { id: 'storm', icon: Zap, en: 'Rule Storm', vi: 'Bão Quy Tắc' },
];

const SAMPLE_BANK = [
  {
    id: 't1', mode: 'timeline', level: 'B1', focus: 'Past perfect', focusVi: 'Quá khứ hoàn thành',
    prompt: 'By the time the rescue team {0}, the villagers {1} the flooded area.',
    answers: ['arrived', 'had left'], options: ['arrived', 'had arrived', 'left', 'had left', 'were leaving'],
    explanation: 'The villagers left first, so that earlier past action uses the past perfect.',
    explanationVi: 'Người dân rời đi trước, nên hành động quá khứ xảy ra sớm hơn dùng quá khứ hoàn thành.',
    timeline: [{ label: 'The villagers had left', vi: 'Người dân đã rời đi' }, { label: 'The rescue team arrived', vi: 'Đội cứu hộ đến' }],
  },
  {
    id: 't2', mode: 'timeline', level: 'B2', focus: 'Past perfect and past simple', focusVi: 'Quá khứ hoàn thành và quá khứ đơn',
    prompt: 'She {0} at the laboratory for six years before she {1} the research team.',
    answers: ['had worked', 'joined'], options: ['worked', 'had worked', 'has worked', 'joined', 'had joined'],
    explanation: 'Past perfect marks the longer action completed before another past event.',
    explanationVi: 'Quá khứ hoàn thành đánh dấu hành động kéo dài nhưng xảy ra trước một sự kiện quá khứ khác.',
    timeline: [{ label: 'She had worked for six years', vi: 'Cô ấy đã làm việc sáu năm' }, { label: 'She joined the team', vi: 'Cô ấy gia nhập nhóm' }],
  },
  {
    id: 's1', mode: 'surgery', level: 'B1', focus: 'First conditional', focusVi: 'Câu điều kiện loại 1',
    prompt: 'If the weather {0} better tomorrow, the field trip will continue as planned.',
    answers: ['is'], options: ['will be', 'is', 'would be', 'were'],
    explanation: 'In the first conditional, the if-clause uses the present simple, not will.',
    explanationVi: 'Trong câu điều kiện loại 1, mệnh đề if dùng hiện tại đơn, không dùng will.',
  },
  {
    id: 's2', mode: 'surgery', level: 'B2', focus: 'Subject–verb agreement', focusVi: 'Hòa hợp chủ ngữ – động từ',
    prompt: 'Neither the principal nor the teachers {0} willing to shorten the examination.',
    answers: ['are'], options: ['is', 'are', 'was', 'has been'],
    explanation: 'With neither...nor, the verb agrees with the nearer subject: teachers.',
    explanationVi: 'Với neither...nor, động từ hòa hợp với chủ ngữ gần nhất: teachers.',
  },
  {
    id: 'i1', mode: 'intruder', level: 'B1', focus: 'Despite + noun / V-ing', focusVi: 'Despite + danh từ / V-ing',
    tokens: ['Despite', 'of', 'facing', 'considerable', 'opposition,', 'the', 'committee', 'approved', 'the', 'proposal.'],
    intruderIndexes: [1],
    explanation: 'Despite is followed directly by a noun phrase or an -ing form; “of” is unnecessary.',
    explanationVi: 'Despite đi trực tiếp với cụm danh từ hoặc V-ing; “of” là từ thừa.',
  },
  {
    id: 'i2', mode: 'intruder', level: 'B2', focus: 'Enable + object + to-infinitive', focusVi: 'Enable + tân ngữ + to-infinitive',
    tokens: ['The', 'new', 'policy', 'enables', 'students', 'to', 'can', 'access', 'digital', 'resources', 'from', 'home.'],
    intruderIndexes: [6],
    explanation: 'Enable + object + to-infinitive: “enables students to access”.',
    explanationVi: 'Cấu trúc enable + tân ngữ + to-infinitive: “enables students to access”.',
  },
  {
    id: 'f1', mode: 'fusion', level: 'B2', focus: 'Defining relative clause', focusVi: 'Mệnh đề quan hệ xác định',
    stem: ['The scientist developed a low-cost filter.', 'The filter removes microplastics from water.'],
    options: [
      'The scientist developed a low-cost filter that removes microplastics from water.',
      'The scientist developed a low-cost filter, it removes microplastics from water.',
      'The scientist who developed a low-cost filter removes microplastics from water.',
      'Developing a low-cost filter and microplastics are removed from water.',
    ],
    answer: 0,
    explanation: 'A defining relative clause modifies “filter” without creating a comma splice.',
    explanationVi: 'Mệnh đề quan hệ xác định bổ nghĩa cho “filter” và không tạo lỗi nối hai mệnh đề bằng dấu phẩy.',
  },
  {
    id: 'f2', mode: 'fusion', level: 'C1', focus: 'Result participle clause', focusVi: 'Mệnh đề phân từ chỉ kết quả',
    stem: ['The city expanded the metro system.', 'This decision reduced traffic congestion significantly.'],
    options: [
      'Expanding the metro system, traffic congestion was reduced significantly.',
      'The city expanded the metro system, thereby significantly reducing traffic congestion.',
      'The city expanded the metro system despite traffic congestion significantly reduced.',
      'Traffic congestion significantly reducing, the city expanded the metro system.',
    ],
    answer: 1,
    explanation: '“Thereby + V-ing” clearly expresses the result of the preceding action with the correct logical subject.',
    explanationVi: '“Thereby + V-ing” diễn đạt rõ kết quả của hành động trước và giữ đúng chủ thể logic.',
  },
  {
    id: 'r1', mode: 'storm', level: 'B2', focus: 'Negative inversion', focusVi: 'Đảo ngữ phủ định',
    rule: 'Begin with “Not until”.', ruleVi: 'Bắt đầu bằng “Not until”.',
    source: 'The students understood the concept only after the teacher drew a timeline.',
    options: [
      'Not until the teacher drew a timeline did the students understand the concept.',
      'Not until the teacher drew a timeline the students understood the concept.',
      'Not until did the teacher draw a timeline, the students understood the concept.',
      'Not until the students understood the concept did the teacher draw a timeline.',
    ], answer: 0,
    explanation: 'A negative adverbial at the beginning triggers subject–auxiliary inversion in the main clause.',
    explanationVi: 'Trạng ngữ phủ định ở đầu câu buộc đảo trợ động từ và chủ ngữ trong mệnh đề chính.',
  },
  {
    id: 'r2', mode: 'storm', level: 'C1', focus: 'Perfect participle clause', focusVi: 'Mệnh đề phân từ hoàn thành',
    rule: 'Use a reduced perfect participle clause.', ruleVi: 'Dùng mệnh đề phân từ hoàn thành rút gọn.',
    source: 'Because she had completed the survey, she began analysing the data.',
    options: [
      'Completing the survey, she began analysing the data.',
      'Having completed the survey, she began analysing the data.',
      'Completed the survey, the data began to be analysed.',
      'Having been completed the survey, she began analysing the data.',
    ], answer: 1,
    explanation: '“Having completed” shows that the first action was finished before the main action.',
    explanationVi: '“Having completed” cho thấy hành động đầu hoàn tất trước hành động chính.',
  },
];

const COPY = {
  vi: {
    back: 'Quay lại', round: 'Vòng', time: 'Thời gian', stability: 'Ổn định', energy: 'Năng lượng', combo: 'Combo', score: 'Điểm',
    teamMode: 'Chế độ: Theo đội', instructionSlots: 'Kéo hoặc chạm đáp án để lấp đầy vết nứt.',
    instructionIntruder: 'Chạm đúng từ xâm nhập đang phá hỏng câu.', instructionChoice: 'Chọn cấu trúc tốt nhất để ổn định cổng.',
    stabilize: 'Ổn định dòng thời gian', verify: 'Kiểm tra cấu trúc', next: 'Vết nứt tiếp theo', correct: 'Chính xác!', wrong: 'Cấu trúc chưa ổn định.',
    freeze: 'Đóng băng', reveal: 'Quét quy tắc', remove: 'Loại hai', shield: 'Khiên ngữ pháp', rules: 'Quy tắc', settings: 'Thiết lập',
    mix: 'Nhiệm vụ hỗn hợp', restart: 'Chơi lại', fullscreen: 'Toàn màn hình', sound: 'Âm thanh', composer: 'Ngân hàng câu hỏi',
    finished: 'Nhiệm vụ hoàn thành', winner: 'Đội chiến thắng', draw: 'Hai đội hòa nhau', recent: 'Kết quả gần đây', close: 'Đóng',
    bankHelp: 'Dán ngân hàng JSON theo đúng cấu trúc hiện tại. Dữ liệu được kiểm tra trước khi lưu trên thiết bị.', apply: 'Áp dụng ngân hàng', sample: 'Khôi phục bài mẫu', export: 'Xuất JSON', import: 'Nhập JSON', invalid: 'Ngân hàng không hợp lệ hoặc thiếu một chế độ chơi.',
    frozen: 'Đã cộng thêm 10 giây.', revealed: 'Gợi ý ngữ pháp đã được mở.', removed: 'Đã loại hai phương án an toàn.', shielded: 'Lần mất điểm tiếp theo sẽ được chặn.', used: 'Quyền này đã hết hoặc chưa thể dùng lúc này.',
    teacherNote: 'Yêu cầu học sinh giải thích quy tắc trước khi chuyển vòng.', source: 'Câu gốc', challenge: 'Thử thách', focus: 'Trọng tâm',
    paused: 'Trò chơi đang tạm dừng', resume: 'Tiếp tục', earned: 'điểm', timeout: 'Hết giờ', keyboard: 'Phím nhanh: 1–9 chọn · Enter kiểm tra/tiếp tục · Space tạm dừng',
    questions: 'Số câu mỗi nhiệm vụ', seconds: 'Giây mỗi vòng', accuracy: 'Độ chính xác', attempts: 'Lượt trả lời', noResults: 'Chưa có kết quả.',
  },
  en: {
    back: 'Back', round: 'Round', time: 'Time', stability: 'Stability', energy: 'Energy', combo: 'Combo', score: 'Score',
    teamMode: 'Team Mode', instructionSlots: 'Drag or tap answers to repair the grammatical rift.',
    instructionIntruder: 'Tap the exact intruding word that breaks the sentence.', instructionChoice: 'Choose the strongest structure to stabilize the portal.',
    stabilize: 'Stabilize timeline', verify: 'Check structure', next: 'Next rift', correct: 'Correct!', wrong: 'Structure not stabilized.',
    freeze: 'Freeze Time', reveal: 'Rule Scan', remove: 'Remove Two', shield: 'Grammar Shield', rules: 'Rules', settings: 'Settings',
    mix: 'Mixed Mission', restart: 'Restart', fullscreen: 'Fullscreen', sound: 'Sound', composer: 'Question Bank',
    finished: 'Mission complete', winner: 'Winning team', draw: 'The teams are tied', recent: 'Recent results', close: 'Close',
    bankHelp: 'Paste a JSON bank using the current structure. Data is validated before it is saved on this device.', apply: 'Apply bank', sample: 'Restore sample', export: 'Export JSON', import: 'Import JSON', invalid: 'Invalid bank or one game mode is missing.',
    frozen: 'Ten seconds added.', revealed: 'The grammar focus has been revealed.', removed: 'Two safe options removed.', shielded: 'The next penalty will be blocked.', used: 'This power is empty or unavailable right now.',
    teacherNote: 'Ask students to explain the rule before advancing.', source: 'Source', challenge: 'Challenge', focus: 'Focus',
    paused: 'Game paused', resume: 'Resume', earned: 'points', timeout: 'Time is up', keyboard: 'Shortcuts: 1–9 select · Enter check/continue · Space pause',
    questions: 'Questions per mission', seconds: 'Seconds per round', accuracy: 'Accuracy', attempts: 'Attempts', noResults: 'No results yet.',
  },
};

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
function loadJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
function text(value, max = 240) { return String(value ?? '').trim().slice(0, max); }
function textArray(value, min, max, itemMax = 240) {
  if (!Array.isArray(value)) return null;
  const result = value.slice(0, max).map((item) => text(item, itemMax)).filter(Boolean);
  return result.length >= min ? result : null;
}
function cleanQuestion(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const mode = text(raw.mode, 20);
  if (!MODES.some((item) => item.id === mode)) return null;
  const base = {
    id: text(raw.id, 80) || `question-${index + 1}`,
    mode, level: text(raw.level, 12) || 'B1', focus: text(raw.focus, 100), focusVi: text(raw.focusVi, 100),
    explanation: text(raw.explanation, 500), explanationVi: text(raw.explanationVi, 500),
  };
  if (!base.explanation) return null;
  if (mode === 'timeline' || mode === 'surgery') {
    const prompt = text(raw.prompt, 500); const answers = textArray(raw.answers, 1, 5, 100); const options = textArray(raw.options, 2, 10, 120);
    if (!prompt || !answers || !options || !answers.every((answer) => options.includes(answer))) return null;
    if ((prompt.match(/\{\d+\}/g) || []).length !== answers.length) return null;
    const question = { ...base, prompt, answers, options };
    if (mode === 'timeline') {
      const timeline = Array.isArray(raw.timeline) ? raw.timeline.slice(0, 2).map((item) => ({ label: text(item?.label, 160), vi: text(item?.vi, 160) })) : [];
      if (timeline.length !== 2 || timeline.some((item) => !item.label)) return null;
      question.timeline = timeline;
    }
    return question;
  }
  if (mode === 'intruder') {
    const tokens = textArray(raw.tokens, 4, 40, 80);
    const indexes = Array.isArray(raw.intruderIndexes) ? [...new Set(raw.intruderIndexes.map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value < (tokens?.length || 0)))] : [];
    return tokens && indexes.length ? { ...base, tokens, intruderIndexes: indexes } : null;
  }
  const options = textArray(raw.options, 2, 8, 500); const answer = Number(raw.answer);
  if (!options || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  if (mode === 'fusion') {
    const stem = textArray(raw.stem, 2, 4, 300);
    return stem ? { ...base, stem, options, answer } : null;
  }
  const rule = text(raw.rule, 200); const source = text(raw.source, 500);
  return rule && source ? { ...base, rule, ruleVi: text(raw.ruleVi, 200), source, options, answer } : null;
}
function cleanBank(raw) {
  if (!Array.isArray(raw)) return null;
  const cleaned = raw.slice(0, 120).map(cleanQuestion).filter(Boolean);
  return cleaned.length >= 5 && MODES.every((mode) => cleaned.some((question) => question.mode === mode.id)) ? cleaned : null;
}
function uid() { return `gr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function makeTeam(name, accent) {
  return { name, accent, score: 0, stability: 78, energy: 70, combo: 0, attempts: 0, correct: 0, powers: { freeze: 2, reveal: 2, remove: 1, shield: 1 }, shielded: false };
}
function playTone(ok, enabled) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!enabled || !AudioContextClass) return;
  const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.type = ok ? 'sine' : 'sawtooth'; oscillator.frequency.setValueAtTime(ok ? 520 : 160, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(ok ? 820 : 90, context.currentTime + 0.18);
  gain.gain.setValueAtTime(0.07, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.24);
  window.setTimeout(() => context.close().catch(() => {}), 400);
}

export default function GrammarRiftGame({ language = 'vi' }) {
  const tx = COPY[language] || COPY.vi;
  const fileRef = useRef(null);
  const savedSettings = useMemo(() => loadJson(SETTINGS_KEY, {}), []);
  const [bank, setBank] = useState(() => cleanBank(loadJson(BANK_KEY, SAMPLE_BANK)) || SAMPLE_BANK);
  const [mission, setMission] = useState('mix');
  const [questionLimit, setQuestionLimit] = useState(() => Math.max(5, Math.min(30, Number(savedSettings.questionLimit) || 10)));
  const [timePerRound, setTimePerRound] = useState(() => Math.max(15, Math.min(90, Number(savedSettings.timePerRound) || 30)));
  const [sequence, setSequence] = useState(() => shuffle(SAMPLE_BANK).slice(0, 10));
  const [round, setRound] = useState(0); const [activeTeam, setActiveTeam] = useState(0);
  const [teams, setTeams] = useState([makeTeam('TEAM A', 'cyan'), makeTeam('TEAM B', 'rose')]);
  const [timeLeft, setTimeLeft] = useState(timePerRound); const [sound, setSound] = useState(true); const [paused, setPaused] = useState(false); const [documentHidden, setDocumentHidden] = useState(false);
  const [answers, setAnswers] = useState({}); const [selectedTokenIndexes, setSelectedTokenIndexes] = useState([]); const [selectedChoice, setSelectedChoice] = useState(null);
  const [feedback, setFeedback] = useState(null); const [hiddenOptions, setHiddenOptions] = useState([]); const [hiddenTokenIndexes, setHiddenTokenIndexes] = useState([]);
  const [showFocus, setShowFocus] = useState(false); const [revealedOption, setRevealedOption] = useState(null); const [revealedTokenIndex, setRevealedTokenIndex] = useState(null);
  const [toast, setToast] = useState(''); const [finished, setFinished] = useState(false); const [settingsOpen, setSettingsOpen] = useState(false); const [bankOpen, setBankOpen] = useState(false); const [rulesOpen, setRulesOpen] = useState(false); const [resultsOpen, setResultsOpen] = useState(false);
  const [bankText, setBankText] = useState(() => JSON.stringify(bank, null, 2)); const [results, setResults] = useState(() => loadJson(RESULT_KEY, []));

  const current = sequence[round] || null; const currentMode = MODES.find((item) => item.id === current?.mode) || MODES[0];
  const progress = sequence.length ? ((round + 1) / sequence.length) * 100 : 0; const modalOpen = settingsOpen || bankOpen || rulesOpen || resultsOpen;
  const gameBlocked = paused || documentHidden || modalOpen || finished; const orderedOptions = useMemo(() => current?.options ? shuffle(current.options) : [], [current?.id]);
  const setTeam = (index, transform) => setTeams((previous) => previous.map((team, teamIndex) => teamIndex === index ? transform(team) : team));
  const resetInput = () => { setAnswers({}); setSelectedTokenIndexes([]); setSelectedChoice(null); setFeedback(null); setHiddenOptions([]); setHiddenTokenIndexes([]); setShowFocus(false); setRevealedOption(null); setRevealedTokenIndex(null); setTimeLeft(timePerRound); };
  const startMission = (mode = mission, sourceBank = bank) => {
    const source = mode === 'mix' ? sourceBank : sourceBank.filter((question) => question.mode === mode);
    setMission(mode); setSequence(shuffle(source).slice(0, Math.min(questionLimit, source.length))); setRound(0); setActiveTeam(0);
    setTeams([makeTeam(teams[0]?.name || 'TEAM A', 'cyan'), makeTeam(teams[1]?.name || 'TEAM B', 'rose')]); setFinished(false); setPaused(false); resetInput();
  };
  const isCorrect = () => {
    if (!current) return false;
    if (current.mode === 'timeline' || current.mode === 'surgery') return current.answers.every((answer, index) => answers[index] === answer);
    if (current.mode === 'intruder') {
      const expected = [...current.intruderIndexes].sort((a, b) => a - b); const actual = [...selectedTokenIndexes].sort((a, b) => a - b);
      return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
    }
    return selectedChoice === current.answer;
  };
  const canSubmit = useMemo(() => {
    if (!current || feedback || gameBlocked) return false;
    if (current.mode === 'timeline' || current.mode === 'surgery') return current.answers.every((_, index) => Boolean(answers[index]));
    if (current.mode === 'intruder') return selectedTokenIndexes.length > 0;
    return selectedChoice !== null;
  }, [current, feedback, gameBlocked, answers, selectedTokenIndexes, selectedChoice]);
  function grade(timeout = false) {
    if (feedback || !current || finished) return;
    const ok = !timeout && isCorrect(); const team = teams[activeTeam]; const earned = ok ? 100 + timeLeft * 4 + team.combo * 25 : 0;
    setTeam(activeTeam, (old) => {
      const attemptBase = { ...old, attempts: old.attempts + 1 };
      if (ok) return { ...attemptBase, correct: old.correct + 1, score: old.score + earned, combo: old.combo + 1, energy: Math.min(100, old.energy + 6), stability: Math.min(100, old.stability + 5) };
      if (old.shielded) return { ...attemptBase, shielded: false, combo: 0 };
      return { ...attemptBase, combo: 0, energy: Math.max(0, old.energy - 14), stability: Math.max(0, old.stability - 10) };
    });
    setFeedback({ ok, timeout, earned }); playTone(ok, sound); if (ok) confetti({ particleCount: 70, spread: 62, origin: { y: 0.62 } });
  }
  const nextRound = () => {
    if (round >= sequence.length - 1) {
      const winner = teams[0].score === teams[1].score ? -1 : teams[0].score > teams[1].score ? 0 : 1;
      const item = { id: uid(), at: Date.now(), mission, winner, teams: teams.map((team) => ({ name: team.name, score: team.score, correct: team.correct, attempts: team.attempts })) };
      const nextResults = [item, ...results].slice(0, 16); setResults(nextResults); localStorage.setItem(RESULT_KEY, JSON.stringify(nextResults)); setFinished(true); confetti({ particleCount: 180, spread: 90, origin: { y: 0.65 } }); return;
    }
    setRound((value) => value + 1); setActiveTeam((value) => value === 0 ? 1 : 0); resetInput();
  };
  const chooseChip = (option) => { if (feedback || gameBlocked) return; const emptyIndex = current.answers.findIndex((_, index) => !answers[index]); if (emptyIndex >= 0) setAnswers((old) => ({ ...old, [emptyIndex]: option })); };
  const onDrop = (index, event) => { event.preventDefault(); if (feedback || gameBlocked) return; const option = event.dataTransfer.getData('text/plain'); if (option) setAnswers((old) => ({ ...old, [index]: option })); };
  const usePower = (power) => {
    const team = teams[activeTeam]; if (!current || feedback || gameBlocked || team.powers[power] <= 0) { setToast(tx.used); return; }
    setTeam(activeTeam, (old) => ({ ...old, powers: { ...old.powers, [power]: old.powers[power] - 1 }, shielded: power === 'shield' ? true : old.shielded }));
    if (power === 'freeze') { setTimeLeft((value) => value + 10); setToast(tx.frozen); return; }
    if (power === 'reveal') { setShowFocus(true); if (current.answers) setRevealedOption(current.answers[0]); else if (current.mode === 'intruder') setRevealedTokenIndex(current.intruderIndexes[0]); else setRevealedOption(current.options[current.answer]); setToast(tx.revealed); return; }
    if (power === 'remove') { if (current.mode === 'intruder') { const safeIndexes = current.tokens.map((_, index) => index).filter((index) => !current.intruderIndexes.includes(index)); setHiddenTokenIndexes(shuffle(safeIndexes).slice(0, 2)); } else { const correctOptions = current.answers || [current.options[current.answer]]; setHiddenOptions(shuffle(current.options.filter((option) => !correctOptions.includes(option))).slice(0, 2)); } setToast(tx.removed); return; }
    setToast(tx.shielded);
  };
  const applyBank = () => { try { const cleaned = cleanBank(JSON.parse(bankText)); if (!cleaned) throw new Error('invalid'); setBank(cleaned); localStorage.setItem(BANK_KEY, JSON.stringify(cleaned)); setBankOpen(false); startMission('mix', cleaned); } catch { window.alert(tx.invalid); } };
  const exportBank = () => { const blob = new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'grammar-rift-bank.json'; anchor.click(); URL.revokeObjectURL(url); };
  const importBank = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setBankText(await file.text()); setBankOpen(true); } catch { window.alert(tx.invalid); } event.target.value = ''; };
  const toggleFullscreen = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); };

  useEffect(() => { const onVisibility = () => setDocumentHidden(document.hidden); document.addEventListener('visibilitychange', onVisibility); return () => document.removeEventListener('visibilitychange', onVisibility); }, []);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ timePerRound, questionLimit })); }, [timePerRound, questionLimit]);
  useEffect(() => {
    if (finished || paused || documentHidden || modalOpen || feedback || !current) return undefined;
    const timer = window.setInterval(() => setTimeLeft((value) => { if (value <= 1) { window.clearInterval(timer); window.setTimeout(() => grade(true), 0); return 0; } return value - 1; }), 1000);
    return () => window.clearInterval(timer);
  }, [finished, paused, documentHidden, modalOpen, feedback, current?.id, activeTeam]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 2200); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'Space' && !modalOpen && !finished) { event.preventDefault(); setPaused((value) => !value); return; }
      if (modalOpen || finished || paused || !current) return;
      if (event.key === 'Enter') { event.preventDefault(); if (feedback) nextRound(); else if (canSubmit) grade(false); return; }
      if (event.key === 'Backspace' && current.answers && !feedback) { event.preventDefault(); const filled = Object.keys(answers).map(Number).filter((index) => answers[index]).sort((a, b) => b - a)[0]; if (Number.isInteger(filled)) setAnswers((old) => ({ ...old, [filled]: '' })); return; }
      const number = Number(event.key); if (!Number.isInteger(number) || number < 1 || number > 9 || feedback) return; const index = number - 1;
      if (current.answers && orderedOptions[index] && !hiddenOptions.includes(orderedOptions[index])) chooseChip(orderedOptions[index]);
      else if (current.mode === 'intruder' && current.tokens[index] && !hiddenTokenIndexes.includes(index)) setSelectedTokenIndexes((old) => old.includes(index) ? old.filter((value) => value !== index) : [...old, index]);
      else if (current.options?.[index] && !hiddenOptions.includes(current.options[index])) setSelectedChoice(index);
    };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, finished, paused, current, feedback, canSubmit, answers, orderedOptions, hiddenOptions, hiddenTokenIndexes]);

  const renderPrompt = () => {
    if (!current?.prompt) return null;
    return <div className="gr-sentence">{current.prompt.split(/(\{\d+\})/g).map((piece, index) => {
      const match = piece.match(/^\{(\d+)\}$/); if (!match) return <span key={`${piece}-${index}`}>{piece}</span>; const slot = Number(match[1]);
      return <button key={`${piece}-${index}`} className={`gr-blank ${answers[slot] ? 'is-filled' : ''}`} onClick={() => !feedback && setAnswers((old) => ({ ...old, [slot]: '' }))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(slot, event)} aria-label={`Grammar slot ${slot + 1}`}>{answers[slot] || current.answers[slot].replace(/./g, '•')}</button>;
    })}</div>;
  };
  if (!current) return null;
  const instruction = current.mode === 'intruder' ? tx.instructionIntruder : current.mode === 'timeline' || current.mode === 'surgery' ? tx.instructionSlots : tx.instructionChoice;
  const explanation = language === 'vi' ? current.explanationVi || current.explanation : current.explanation; const focus = language === 'vi' ? current.focusVi || current.focus : current.focus;

  return (
    <div className="gr-app">
      <div className="gr-stars gr-stars-one"/><div className="gr-stars gr-stars-two"/>
      <header className="gr-header">
        <div className="gr-meta"><button onClick={() => window.history.back()} title={tx.back} aria-label={tx.back}><ArrowLeft/></button><div><span><TimerReset size={20}/>{tx.time}</span><strong>{String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</strong></div><div><span>{tx.round}</span><strong>{round + 1} / {sequence.length}</strong></div></div>
        <div className="gr-title"><small>BRIAN CLASSROOM MISSION</small><h1>GRAMMAR <b>RIFT</b></h1><span>Cổng không gian ngữ pháp</span></div>
        <div className="gr-status"><div><span>RIFT STABILITY</span><b>{Math.round((teams[0].stability + teams[1].stability) / 2)}%</b><i><em style={{ width: `${(teams[0].stability + teams[1].stability) / 2}%` }}/></i></div><button onClick={() => setRulesOpen(true)}><BookOpen/><span>{tx.rules}</span></button></div>
      </header>
      <main className="gr-arena">
        {[0, 1].map((index) => { const team = teams[index]; const accuracy = team.attempts ? Math.round((team.correct / team.attempts) * 100) : 0; return <aside key={`${team.accent}-${index}`} className={`gr-team gr-team-${team.accent} ${activeTeam === index ? 'is-active' : ''}`}><div className="gr-team-head"><span>{index === 0 ? 'A' : 'B'}</span><div><small>{activeTeam === index ? 'ACTIVE CREW' : 'STANDBY'}</small><h2>{team.name}</h2></div></div><div className="gr-ship" aria-hidden="true"><div className="gr-ship-core"/><i/><i/><i/></div><div className="gr-stat"><span><Shield size={17}/>{tx.stability}</span><b>{team.stability}%</b><i><em style={{ width: `${team.stability}%` }}/></i></div><div className="gr-stat"><span><Zap size={17}/>{tx.energy}</span><b>{team.energy}%</b><i><em style={{ width: `${team.energy}%` }}/></i></div><div className="gr-stat"><span><Flame size={17}/>{tx.combo}</span><b>x{team.combo}</b><i><em style={{ width: `${Math.min(100, team.combo * 20)}%` }}/></i></div><div className="gr-score"><small>{tx.score}</small><strong>{team.score.toLocaleString()}</strong></div><div className="gr-team-mini"><span>{tx.accuracy}<b>{accuracy}%</b></span><span>{tx.attempts}<b>{team.attempts}</b></span></div><div className="gr-powers"><button disabled={gameBlocked || Boolean(feedback) || team.powers.freeze <= 0} onClick={() => usePower('freeze')}><TimerReset/><span><b>{tx.freeze}</b><small>+10s</small></span><em>{team.powers.freeze}</em></button><button disabled={gameBlocked || Boolean(feedback) || team.powers.reveal <= 0} onClick={() => usePower('reveal')}><Eye/><span><b>{tx.reveal}</b><small>Hint</small></span><em>{team.powers.reveal}</em></button><button disabled={gameBlocked || Boolean(feedback) || team.powers.remove <= 0} onClick={() => usePower('remove')}><Scissors/><span><b>{tx.remove}</b><small>Options</small></span><em>{team.powers.remove}</em></button><button disabled={gameBlocked || Boolean(feedback) || team.powers.shield <= 0 || team.shielded} className={team.shielded ? 'is-on' : ''} onClick={() => usePower('shield')}><Shield/><span><b>{tx.shield}</b><small>Block penalty</small></span><em>{team.powers.shield}</em></button></div></aside>; })}
        <section className="gr-center">
          <div className="gr-portal" aria-hidden="true"><div/><div/><div/><span/></div>
          <article className="gr-challenge"><div className="gr-challenge-top"><span>{React.createElement(currentMode.icon, { size: 18 })}{language === 'vi' ? currentMode.vi : currentMode.en}</span><b>{current.level}</b></div>{showFocus && focus && <div className="gr-focus"><Eye size={18}/><span><small>{tx.focus}</small><b>{focus}</b></span></div>}{current.rule && <div className="gr-rule"><Sparkles size={18}/><div><small>{tx.challenge}</small><strong>{language === 'vi' ? current.ruleVi || current.rule : current.rule}</strong></div></div>}{current.source && <div className="gr-source"><small>{tx.source}</small><p>{current.source}</p></div>}{current.stem && <div className="gr-source gr-fusion-source">{current.stem.map((line) => <p key={line}>{line}</p>)}</div>}{renderPrompt()}{current.tokens && <div className="gr-token-line">{current.tokens.map((token, index) => <button key={`${token}-${index}`} disabled={hiddenTokenIndexes.includes(index) || Boolean(feedback)} className={`${selectedTokenIndexes.includes(index) ? 'is-selected' : ''} ${revealedTokenIndex === index ? 'is-revealed' : ''} ${hiddenTokenIndexes.includes(index) ? 'is-hidden' : ''}`} onClick={() => setSelectedTokenIndexes((old) => old.includes(index) ? old.filter((value) => value !== index) : [...old, index])}><small>{index + 1}</small>{token}</button>)}</div>}<p className="gr-instruction">{instruction}</p>{current.answers && <div className="gr-options">{orderedOptions.map((option, index) => <button key={`${option}-${index}`} draggable={!hiddenOptions.includes(option) && !feedback} disabled={hiddenOptions.includes(option) || Boolean(feedback)} onDragStart={(event) => event.dataTransfer.setData('text/plain', option)} className={`${hiddenOptions.includes(option) ? 'is-hidden' : ''} ${Object.values(answers).includes(option) ? 'is-used' : ''} ${revealedOption === option ? 'is-revealed' : ''}`} onClick={() => chooseChip(option)}><small>{index + 1}</small>{option}</button>)}</div>}{!current.answers && current.options && <div className="gr-choice-list">{current.options.map((option, index) => <button key={`${option}-${index}`} disabled={hiddenOptions.includes(option) || Boolean(feedback)} className={`${selectedChoice === index ? 'is-selected' : ''} ${hiddenOptions.includes(option) ? 'is-hidden' : ''} ${revealedOption === option ? 'is-revealed' : ''}`} onClick={() => setSelectedChoice(index)}><span>{String.fromCharCode(65 + index)}</span><p>{option}</p><small>{index + 1}</small></button>)}</div>}<button className="gr-submit" disabled={!canSubmit} onClick={() => grade(false)}><Sparkles/>{current.mode === 'timeline' ? tx.stabilize : tx.verify}</button></article>
          {current.mode === 'timeline' && current.timeline && <div className="gr-timeline"><small>TIMELINE VISUALIZATION</small><div className="gr-time-line"><i/><span className="gr-event gr-event-early"><em>1</em><b>{language === 'vi' ? current.timeline[0].vi || current.timeline[0].label : current.timeline[0].label}</b><small>EARLIER</small></span><span className="gr-event gr-event-late"><em>2</em><b>{language === 'vi' ? current.timeline[1].vi || current.timeline[1].label : current.timeline[1].label}</b><small>LATER</small></span></div></div>}
          <div className={`gr-feedback ${feedback ? (feedback.ok ? 'is-correct' : 'is-wrong') : ''}`}>{feedback ? <><span>{feedback.ok ? <Check/> : <X/>}</span><div><b>{feedback.timeout ? tx.timeout : feedback.ok ? tx.correct : tx.wrong}{feedback.ok ? ` +${feedback.earned} ${tx.earned}` : ''}</b><p>{explanation}</p><small>{tx.teacherNote}</small></div><button onClick={nextRound}>{tx.next}<ChevronRight/></button></> : <><span><Gamepad2/></span><div><b>{teams[activeTeam].name}</b><p>{instruction}</p><small>{tx.keyboard}</small></div></>}</div>
        </section>
      </main>
      <footer className="gr-footer"><div className="gr-team-mode"><span><Swords/></span><div><b>{tx.teamMode}</b><small>{teams[activeTeam].name}</small></div></div><nav>{MODES.map((mode) => { const Icon = mode.icon; return <button key={mode.id} className={mission === mode.id ? 'is-active' : ''} onClick={() => startMission(mode.id)}><Icon/><span>{language === 'vi' ? mode.vi : mode.en}</span></button>; })}<button className={mission === 'mix' ? 'is-active' : ''} onClick={() => startMission('mix')}><Sparkles/><span>{tx.mix}</span></button></nav><div className="gr-tools"><button onClick={() => setPaused((value) => !value)} aria-label={paused ? tx.resume : tx.paused}>{paused ? <Play/> : <Pause/>}</button><button onClick={toggleFullscreen} title={tx.fullscreen} aria-label={tx.fullscreen}><Expand/></button><button onClick={() => setSound((value) => !value)} title={tx.sound} aria-label={tx.sound}>{sound ? <Volume2/> : <VolumeX/>}</button><button onClick={() => { setBankText(JSON.stringify(bank, null, 2)); setBankOpen(true); }} title={tx.composer} aria-label={tx.composer}><FileJson/></button><button onClick={() => setSettingsOpen(true)} title={tx.settings} aria-label={tx.settings}><Settings/></button></div></footer>
      <div className="gr-progress"><i style={{ width: `${progress}%` }}/></div>{toast && <div className="gr-toast" role="status">{toast}</div>}<input ref={fileRef} type="file" accept="application/json" hidden onChange={importBank}/>
      {(paused || documentHidden) && !modalOpen && !finished && <div className="gr-pause-overlay"><section><Pause size={48}/><h2>{tx.paused}</h2><button onClick={() => setPaused(false)}><Play/>{tx.resume}</button></section></div>}
      {settingsOpen && <div className="gr-modal-backdrop"><section className="gr-modal"><button className="gr-modal-close" onClick={() => setSettingsOpen(false)}><X/></button><Settings size={34}/><h2>{tx.settings}</h2><label>{tx.seconds}<input type="range" min="15" max="90" step="5" value={timePerRound} onChange={(event) => setTimePerRound(Number(event.target.value))}/><b>{timePerRound}s</b></label><label>{tx.questions}<input type="range" min="5" max="30" step="1" value={questionLimit} onChange={(event) => setQuestionLimit(Number(event.target.value))}/><b>{questionLimit}</b></label><label>Team A<input value={teams[0].name} onChange={(event) => setTeam(0, (team) => ({ ...team, name: event.target.value.slice(0, 18) || 'TEAM A' }))}/></label><label>Team B<input value={teams[1].name} onChange={(event) => setTeam(1, (team) => ({ ...team, name: event.target.value.slice(0, 18) || 'TEAM B' }))}/></label><button className="gr-primary" onClick={() => { setSettingsOpen(false); startMission(mission); }}><RotateCcw/>{tx.restart}</button><button onClick={() => { setSettingsOpen(false); setResultsOpen(true); }}>{tx.recent}</button></section></div>}
      {rulesOpen && <div className="gr-modal-backdrop"><section className="gr-modal gr-rules"><button className="gr-modal-close" onClick={() => setRulesOpen(false)}><X/></button><BookOpen size={36}/><h2>{tx.rules}</h2>{MODES.map((mode) => { const Icon = mode.icon; return <article key={mode.id}><Icon/><div><b>{language === 'vi' ? mode.vi : mode.en}</b><p>{mode.id === 'timeline' ? tx.instructionSlots : mode.id === 'intruder' ? tx.instructionIntruder : tx.instructionChoice}</p></div></article>; })}<small>{tx.keyboard}</small></section></div>}
      {bankOpen && <div className="gr-modal-backdrop"><section className="gr-modal gr-bank"><button className="gr-modal-close" onClick={() => setBankOpen(false)}><X/></button><FileJson size={36}/><h2>{tx.composer}</h2><p>{tx.bankHelp}</p><textarea value={bankText} onChange={(event) => setBankText(event.target.value)} spellCheck="false"/><div className="gr-modal-actions"><button onClick={() => fileRef.current?.click()}><Upload/>{tx.import}</button><button onClick={exportBank}><Download/>{tx.export}</button><button onClick={() => setBankText(JSON.stringify(SAMPLE_BANK, null, 2))}><RotateCcw/>{tx.sample}</button><button className="gr-primary" onClick={applyBank}><Check/>{tx.apply}</button></div></section></div>}
      {resultsOpen && <div className="gr-modal-backdrop"><section className="gr-modal"><button className="gr-modal-close" onClick={() => setResultsOpen(false)}><X/></button><Swords size={36}/><h2>{tx.recent}</h2><div className="gr-results">{results.length ? results.map((item) => <article key={item.id}><div><b>{item.winner < 0 ? tx.draw : item.teams[item.winner]?.name}</b><small>{new Date(item.at).toLocaleString()}</small></div><span>{item.teams.map((team) => `${team.name}: ${team.score} (${team.correct || 0}/${team.attempts || 0})`).join(' · ')}</span></article>) : <p>{tx.noResults}</p>}</div></section></div>}
      {finished && <div className="gr-modal-backdrop"><section className="gr-modal gr-finish"><Sparkles size={44}/><h2>{tx.finished}</h2><div className="gr-podium">{teams.map((team, index) => <article key={`${team.name}-${index}`} className={team.score === Math.max(...teams.map((item) => item.score)) ? 'is-winner' : ''}><span>{index === 0 ? 'A' : 'B'}</span><b>{team.name}</b><strong>{team.score.toLocaleString()}</strong><small>{team.correct}/{team.attempts} · {team.attempts ? Math.round((team.correct / team.attempts) * 100) : 0}%</small></article>)}</div><p>{teams[0].score === teams[1].score ? tx.draw : `${tx.winner}: ${teams[0].score > teams[1].score ? teams[0].name : teams[1].name}`}</p><button className="gr-primary" onClick={() => startMission(mission)}><RotateCcw/>{tx.restart}</button></section></div>}
    </div>
  );
}
