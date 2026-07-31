import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, BookOpen, Check, ChevronRight, Clock3, Download, Expand,
  Eye, FileJson, Flame, Gamepad2, Link2, Pause, Play, RotateCcw,
  Scissors, Settings, Shield, Sparkles, Swords, TimerReset, Upload, Volume2, VolumeX, X, Zap,
} from 'lucide-react';
import '../styles/GrammarRiftGame.css';

const BANK_KEY = 'brian-grammar-rift-bank-v1';
const RESULT_KEY = 'brian-grammar-rift-results-v1';

const MODES = [
  { id: 'timeline', icon: Clock3, en: 'Timeline Repair', vi: 'Sửa Dòng Thời Gian' },
  { id: 'surgery', icon: Scissors, en: 'Sentence Surgery', vi: 'Phẫu Thuật Câu' },
  { id: 'intruder', icon: Swords, en: 'Grammar Intruder', vi: 'Kẻ Xâm Nhập' },
  { id: 'fusion', icon: Link2, en: 'Clause Fusion', vi: 'Hợp Nhất Mệnh Đề' },
  { id: 'storm', icon: Zap, en: 'Rule Storm', vi: 'Bão Quy Tắc' },
];

const SAMPLE_BANK = [
  {
    id: 't1', mode: 'timeline', level: 'B1',
    prompt: 'By the time the rescue team {0}, the villagers {1} the flooded area.',
    answers: ['arrived', 'had left'], options: ['arrived', 'had arrived', 'left', 'had left', 'were leaving'],
    explanation: 'The villagers left first, so that earlier past action uses the past perfect.',
    explanationVi: 'Người dân rời đi trước, nên hành động quá khứ xảy ra sớm hơn dùng quá khứ hoàn thành.',
    timeline: [{ label: 'The villagers had left', vi: 'Người dân đã rời đi', early: true }, { label: 'The rescue team arrived', vi: 'Đội cứu hộ đến', early: false }],
  },
  {
    id: 't2', mode: 'timeline', level: 'B2',
    prompt: 'She {0} at the laboratory for six years before she {1} the research team.',
    answers: ['had worked', 'joined'], options: ['worked', 'had worked', 'has worked', 'joined', 'had joined'],
    explanation: 'Past perfect marks the longer action completed before another past event.',
    explanationVi: 'Quá khứ hoàn thành đánh dấu hành động kéo dài nhưng xảy ra trước một sự kiện quá khứ khác.',
    timeline: [{ label: 'She had worked for six years', vi: 'Cô ấy đã làm việc sáu năm', early: true }, { label: 'She joined the team', vi: 'Cô ấy gia nhập nhóm', early: false }],
  },
  {
    id: 's1', mode: 'surgery', level: 'B1',
    prompt: 'If the weather {0} better tomorrow, the field trip will continue as planned.',
    answers: ['is'], options: ['will be', 'is', 'would be', 'were'],
    explanation: 'In the first conditional, the if-clause uses the present simple, not will.',
    explanationVi: 'Trong câu điều kiện loại 1, mệnh đề if dùng hiện tại đơn, không dùng will.',
  },
  {
    id: 's2', mode: 'surgery', level: 'B2',
    prompt: 'Neither the principal nor the teachers {0} willing to shorten the examination.',
    answers: ['are'], options: ['is', 'are', 'was', 'has been'],
    explanation: 'With neither...nor, the verb agrees with the nearer subject: teachers.',
    explanationVi: 'Với neither...nor, động từ hòa hợp với chủ ngữ gần nhất: teachers.',
  },
  {
    id: 'i1', mode: 'intruder', level: 'B1',
    tokens: ['Despite', 'of', 'facing', 'considerable', 'opposition,', 'the', 'committee', 'approved', 'the', 'proposal.'],
    intruders: ['of'],
    explanation: 'Despite is followed directly by a noun phrase or an -ing form; “of” is unnecessary.',
    explanationVi: 'Despite đi trực tiếp với cụm danh từ hoặc V-ing; “of” là từ thừa.',
  },
  {
    id: 'i2', mode: 'intruder', level: 'B2',
    tokens: ['The', 'new', 'policy', 'enables', 'students', 'to', 'can', 'access', 'digital', 'resources', 'from', 'home.'],
    intruders: ['can'],
    explanation: 'Enable + object + to-infinitive: “enables students to access”.',
    explanationVi: 'Cấu trúc enable + tân ngữ + to-infinitive: “enables students to access”.',
  },
  {
    id: 'f1', mode: 'fusion', level: 'B2',
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
    id: 'f2', mode: 'fusion', level: 'C1',
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
    id: 'r1', mode: 'storm', level: 'B2', rule: 'Begin with “Not until”.', ruleVi: 'Bắt đầu bằng “Not until”.',
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
    id: 'r2', mode: 'storm', level: 'C1', rule: 'Use a reduced perfect participle clause.', ruleVi: 'Dùng mệnh đề phân từ hoàn thành rút gọn.',
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
    instructionIntruder: 'Chạm vào từ xâm nhập đang phá hỏng câu.', instructionChoice: 'Chọn cấu trúc tốt nhất để ổn định cổng.',
    stabilize: 'Ổn định dòng thời gian', verify: 'Kiểm tra cấu trúc', next: 'Vết nứt tiếp theo', correct: 'Chính xác!', wrong: 'Cấu trúc chưa ổn định.',
    freeze: 'Đóng băng', reveal: 'Quét chức năng', remove: 'Loại hai', shield: 'Khiên ngữ pháp', rules: 'Quy tắc', settings: 'Thiết lập',
    mix: 'Nhiệm vụ hỗn hợp', restart: 'Chơi lại', fullscreen: 'Toàn màn hình', sound: 'Âm thanh', composer: 'Ngân hàng câu hỏi',
    finished: 'Nhiệm vụ hoàn thành', winner: 'Đội chiến thắng', draw: 'Hai đội hòa nhau', recent: 'Kết quả gần đây', close: 'Đóng',
    bankHelp: 'Dán ngân hàng JSON theo đúng cấu trúc hiện tại. Bản hợp lệ sẽ được lưu trên thiết bị.', apply: 'Áp dụng ngân hàng', sample: 'Khôi phục bài mẫu', export: 'Xuất JSON', import: 'Nhập JSON', invalid: 'Ngân hàng không hợp lệ.',
    frozen: 'Đã cộng thêm 10 giây.', revealed: 'Một đáp án đúng đang phát sáng.', removed: 'Đã loại hai phương án sai.', shielded: 'Lần mất điểm tiếp theo sẽ được chặn.', used: 'Quyền này đã được sử dụng.',
    teacherNote: 'Mẹo: học sinh nên giải thích quy tắc trước khi giáo viên chuyển vòng.', source: 'Câu gốc', challenge: 'Thử thách',
  },
  en: {
    back: 'Back', round: 'Round', time: 'Time', stability: 'Stability', energy: 'Energy', combo: 'Combo', score: 'Score',
    teamMode: 'Team Mode', instructionSlots: 'Drag or tap answers to repair the grammatical rift.',
    instructionIntruder: 'Tap the intruding word that breaks the sentence.', instructionChoice: 'Choose the strongest structure to stabilize the portal.',
    stabilize: 'Stabilize timeline', verify: 'Check structure', next: 'Next rift', correct: 'Correct!', wrong: 'Structure not stabilized.',
    freeze: 'Freeze Time', reveal: 'Reveal Function', remove: 'Remove Two', shield: 'Grammar Shield', rules: 'Rules', settings: 'Settings',
    mix: 'Mixed Mission', restart: 'Restart', fullscreen: 'Fullscreen', sound: 'Sound', composer: 'Question Bank',
    finished: 'Mission complete', winner: 'Winning team', draw: 'The teams are tied', recent: 'Recent results', close: 'Close',
    bankHelp: 'Paste a JSON bank using the current structure. A valid bank is stored on this device.', apply: 'Apply bank', sample: 'Restore sample', export: 'Export JSON', import: 'Import JSON', invalid: 'Invalid question bank.',
    frozen: 'Ten seconds added.', revealed: 'One correct answer is glowing.', removed: 'Two incorrect options removed.', shielded: 'The next penalty will be blocked.', used: 'This power has already been used.',
    teacherNote: 'Tip: ask students to explain the rule before advancing.', source: 'Source', challenge: 'Challenge',
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
function cleanBank(raw) {
  if (!Array.isArray(raw) || raw.length < 5) return null;
  const validModes = new Set(MODES.map((m) => m.id));
  const cleaned = raw.slice(0, 80).filter((q) => q && validModes.has(q.mode) && q.id);
  return cleaned.length >= 5 && MODES.every((mode) => cleaned.some((q) => q.mode === mode.id)) ? cleaned : null;
}
function uid() { return `gr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function makeTeam(name, accent) {
  return { name, accent, score: 0, stability: 78, energy: 70, combo: 0, powers: { freeze: 2, reveal: 2, remove: 1, shield: 1 }, shielded: false };
}
function playTone(ok, enabled) {
  if (!enabled || !window.AudioContext) return;
  const ctx = new window.AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = ok ? 'sine' : 'sawtooth';
  oscillator.frequency.setValueAtTime(ok ? 520 : 160, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(ok ? 820 : 90, ctx.currentTime + 0.18);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.24);
}

export default function GrammarRiftGame({ language = 'vi' }) {
  const tx = COPY[language] || COPY.vi;
  const fileRef = useRef(null);
  const [bank, setBank] = useState(() => cleanBank(loadJson(BANK_KEY, SAMPLE_BANK)) || SAMPLE_BANK);
  const [mission, setMission] = useState('mix');
  const [sequence, setSequence] = useState(() => shuffle(SAMPLE_BANK));
  const [round, setRound] = useState(0);
  const [activeTeam, setActiveTeam] = useState(0);
  const [teams, setTeams] = useState([makeTeam('TEAM A', 'cyan'), makeTeam('TEAM B', 'rose')]);
  const [timePerRound, setTimePerRound] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [sound, setSound] = useState(true);
  const [paused, setPaused] = useState(false);
  const [answers, setAnswers] = useState({});
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [revealedOption, setRevealedOption] = useState(null);
  const [toast, setToast] = useState('');
  const [finished, setFinished] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [bankText, setBankText] = useState(() => JSON.stringify(bank, null, 2));
  const [results, setResults] = useState(() => loadJson(RESULT_KEY, []));

  const current = sequence[round] || sequence[0];
  const currentMode = MODES.find((item) => item.id === current?.mode) || MODES[0];
  const progress = sequence.length ? ((round + 1) / sequence.length) * 100 : 0;

  const orderedOptions = useMemo(() => current?.options ? shuffle(current.options) : [], [current?.id]);

  useEffect(() => {
    if (finished || paused || feedback || !current) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => grade(true), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished, paused, feedback, current?.id, activeTeam]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2100);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const resetInput = () => {
    setAnswers({}); setSelectedTokens([]); setSelectedChoice(null); setFeedback(null); setHiddenOptions([]); setRevealedOption(null); setTimeLeft(timePerRound);
  };

  const startMission = (mode = mission) => {
    const source = mode === 'mix' ? bank : bank.filter((q) => q.mode === mode);
    setMission(mode); setSequence(shuffle(source)); setRound(0); setActiveTeam(0);
    setTeams([makeTeam('TEAM A', 'cyan'), makeTeam('TEAM B', 'rose')]); setFinished(false); setPaused(false);
    setAnswers({}); setSelectedTokens([]); setSelectedChoice(null); setFeedback(null); setHiddenOptions([]); setRevealedOption(null); setTimeLeft(timePerRound);
  };

  const setTeam = (index, transform) => setTeams((previous) => previous.map((team, i) => i === index ? transform(team) : team));

  const isCorrect = () => {
    if (current.mode === 'timeline' || current.mode === 'surgery') {
      return current.answers.every((answer, index) => answers[index] === answer);
    }
    if (current.mode === 'intruder') {
      const expected = [...current.intruders].sort();
      const actual = [...selectedTokens].sort();
      return expected.length === actual.length && expected.every((token, index) => token === actual[index]);
    }
    return selectedChoice === current.answer;
  };

  function grade(timeout = false) {
    if (feedback || !current) return;
    const ok = !timeout && isCorrect();
    const team = teams[activeTeam];
    const earned = ok ? 100 + timeLeft * 4 + team.combo * 25 : 0;
    setTeam(activeTeam, (old) => {
      if (ok) return { ...old, score: old.score + earned, combo: old.combo + 1, energy: Math.min(100, old.energy + 6), stability: Math.min(100, old.stability + 5) };
      if (old.shielded) return { ...old, shielded: false, combo: 0 };
      return { ...old, combo: 0, energy: Math.max(0, old.energy - 14), stability: Math.max(0, old.stability - 10) };
    });
    setFeedback({ ok, timeout, earned });
    playTone(ok, sound);
    if (ok) confetti({ particleCount: 70, spread: 62, origin: { y: 0.62 } });
  }

  const nextRound = () => {
    if (round >= sequence.length - 1) {
      const winner = teams[0].score === teams[1].score ? -1 : teams[0].score > teams[1].score ? 0 : 1;
      const item = { id: uid(), at: Date.now(), mission, winner, teams: teams.map((t) => ({ name: t.name, score: t.score })) };
      const nextResults = [item, ...results].slice(0, 12);
      setResults(nextResults); localStorage.setItem(RESULT_KEY, JSON.stringify(nextResults)); setFinished(true);
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.65 } });
      return;
    }
    setRound((value) => value + 1); setActiveTeam((value) => value === 0 ? 1 : 0); resetInput();
  };

  const chooseChip = (option) => {
    const emptyIndex = current.answers.findIndex((_, index) => !answers[index]);
    if (emptyIndex >= 0) setAnswers((old) => ({ ...old, [emptyIndex]: option }));
  };
  const onDrop = (index, event) => {
    event.preventDefault();
    const option = event.dataTransfer.getData('text/plain');
    if (option) setAnswers((old) => ({ ...old, [index]: option }));
  };

  const usePower = (power) => {
    const team = teams[activeTeam];
    if (team.powers[power] <= 0) { setToast(tx.used); return; }
    setTeam(activeTeam, (old) => ({ ...old, powers: { ...old.powers, [power]: old.powers[power] - 1 }, shielded: power === 'shield' ? true : old.shielded }));
    if (power === 'freeze') { setTimeLeft((value) => value + 10); setToast(tx.frozen); }
    if (power === 'reveal') {
      const correct = current.answers?.[0] ?? current.options?.[current.answer] ?? current.intruders?.[0];
      setRevealedOption(correct); setToast(tx.revealed);
    }
    if (power === 'remove' && current.options) {
      const correctOptions = current.answers || [current.options[current.answer]];
      setHiddenOptions(shuffle(current.options.filter((option) => !correctOptions.includes(option))).slice(0, 2)); setToast(tx.removed);
    }
    if (power === 'shield') setToast(tx.shielded);
  };

  const applyBank = () => {
    try {
      const cleaned = cleanBank(JSON.parse(bankText));
      if (!cleaned) throw new Error('invalid');
      setBank(cleaned); localStorage.setItem(BANK_KEY, JSON.stringify(cleaned)); setBankOpen(false); startMission('mix');
    } catch { window.alert(tx.invalid); }
  };
  const exportBank = () => {
    const blob = new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'grammar-rift-bank.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  const importBank = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const text = await file.text(); setBankText(text); setBankOpen(true); } catch { window.alert(tx.invalid); }
    event.target.value = '';
  };

  const renderPrompt = () => {
    if (!current.prompt) return null;
    const pieces = current.prompt.split(/(\{\d+\})/g);
    return <div className="gr-sentence">{pieces.map((piece, index) => {
      const match = piece.match(/^\{(\d+)\}$/);
      if (!match) return <span key={`${piece}-${index}`}>{piece}</span>;
      const slot = Number(match[1]);
      return <button key={piece} className={`gr-blank ${answers[slot] ? 'is-filled' : ''}`} onClick={() => setAnswers((old) => ({ ...old, [slot]: '' }))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(slot, e)}>{answers[slot] || current.answers[slot].replace(/./g, '•')}</button>;
    })}</div>;
  };

  const instruction = current.mode === 'intruder' ? tx.instructionIntruder : current.mode === 'timeline' || current.mode === 'surgery' ? tx.instructionSlots : tx.instructionChoice;
  const explanation = language === 'vi' ? current.explanationVi || current.explanation : current.explanation;

  return (
    <div className="gr-app">
      <div className="gr-stars gr-stars-one"/><div className="gr-stars gr-stars-two"/>
      <header className="gr-header">
        <div className="gr-meta">
          <button onClick={() => window.history.back()} title={tx.back}><ArrowLeft/></button>
          <div><span><TimerReset size={20}/>{tx.time}</span><strong>{String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</strong></div>
          <div><span>{tx.round}</span><strong>{round + 1} / {sequence.length}</strong></div>
        </div>
        <div className="gr-title"><small>BRIAN CLASSROOM MISSION</small><h1>GRAMMAR <b>RIFT</b></h1><span>Cổng không gian ngữ pháp</span></div>
        <div className="gr-status"><div><span>RIFT STABILITY</span><b>{Math.round((teams[0].stability + teams[1].stability) / 2)}%</b><i><em style={{ width: `${(teams[0].stability + teams[1].stability) / 2}%` }}/></i></div><button onClick={() => setRulesOpen(true)}><BookOpen/><span>{tx.rules}</span></button></div>
      </header>

      <main className="gr-arena">
        {[0, 1].map((index) => {
          const team = teams[index];
          return <aside key={team.name} className={`gr-team gr-team-${team.accent} ${activeTeam === index ? 'is-active' : ''}`}>
            <div className="gr-team-head"><span>{index === 0 ? 'A' : 'B'}</span><div><small>{activeTeam === index ? 'ACTIVE CREW' : 'STANDBY'}</small><h2>{team.name}</h2></div></div>
            <div className="gr-ship"><div className="gr-ship-core"/><i/><i/><i/></div>
            <div className="gr-stat"><span><Shield size={17}/>{tx.stability}</span><b>{team.stability}%</b><i><em style={{ width: `${team.stability}%` }}/></i></div>
            <div className="gr-stat"><span><Zap size={17}/>{tx.energy}</span><b>{team.energy}%</b><i><em style={{ width: `${team.energy}%` }}/></i></div>
            <div className="gr-stat"><span><Flame size={17}/>{tx.combo}</span><b>x{team.combo}</b><i><em style={{ width: `${Math.min(100, team.combo * 20)}%` }}/></i></div>
            <div className="gr-score"><small>{tx.score}</small><strong>{team.score.toLocaleString()}</strong></div>
            <div className="gr-powers">
              <button onClick={() => usePower('freeze')}><TimerReset/><span><b>{tx.freeze}</b><small>+10s</small></span><em>{team.powers.freeze}</em></button>
              <button onClick={() => usePower('reveal')}><Eye/><span><b>{tx.reveal}</b><small>Hint</small></span><em>{team.powers.reveal}</em></button>
              <button onClick={() => usePower('remove')}><Scissors/><span><b>{tx.remove}</b><small>Options</small></span><em>{team.powers.remove}</em></button>
              <button className={team.shielded ? 'is-on' : ''} onClick={() => usePower('shield')}><Shield/><span><b>{tx.shield}</b><small>Block penalty</small></span><em>{team.powers.shield}</em></button>
            </div>
          </aside>;
        })}

        <section className="gr-center">
          <div className="gr-portal"><div/><div/><div/><span/></div>
          <article className="gr-challenge">
            <div className="gr-challenge-top"><span>{React.createElement(currentMode.icon, { size: 18 })}{language === 'vi' ? currentMode.vi : currentMode.en}</span><b>{current.level}</b></div>
            {current.rule && <div className="gr-rule"><Sparkles size={18}/><div><small>{tx.challenge}</small><strong>{language === 'vi' ? current.ruleVi : current.rule}</strong></div></div>}
            {current.source && <div className="gr-source"><small>{tx.source}</small><p>{current.source}</p></div>}
            {current.stem && <div className="gr-source gr-fusion-source">{current.stem.map((line) => <p key={line}>{line}</p>)}</div>}
            {renderPrompt()}
            {current.tokens && <div className="gr-token-line">{current.tokens.map((token, index) => <button key={`${token}-${index}`} className={`${selectedTokens.includes(token) ? 'is-selected' : ''} ${revealedOption === token ? 'is-revealed' : ''}`} onClick={() => setSelectedTokens((old) => old.includes(token) ? old.filter((item) => item !== token) : [...old, token])}>{token}</button>)}</div>}
            <p className="gr-instruction">{instruction}</p>
            {current.answers && <div className="gr-options">{orderedOptions.map((option) => <button key={option} draggable={!hiddenOptions.includes(option)} onDragStart={(event) => event.dataTransfer.setData('text/plain', option)} className={`${hiddenOptions.includes(option) ? 'is-hidden' : ''} ${Object.values(answers).includes(option) ? 'is-used' : ''} ${revealedOption === option ? 'is-revealed' : ''}`} onClick={() => chooseChip(option)}>{option}</button>)}</div>}
            {!current.answers && current.options && <div className="gr-choice-list">{current.options.map((option, index) => <button key={option} className={`${selectedChoice === index ? 'is-selected' : ''} ${hiddenOptions.includes(option) ? 'is-hidden' : ''} ${revealedOption === option ? 'is-revealed' : ''}`} onClick={() => setSelectedChoice(index)}><span>{String.fromCharCode(65 + index)}</span><p>{option}</p></button>)}</div>}
            <button className="gr-submit" onClick={() => grade(false)}><Sparkles/>{current.mode === 'timeline' ? tx.stabilize : tx.verify}</button>
          </article>

          {current.mode === 'timeline' && current.timeline && <div className="gr-timeline"><small>TIMELINE VISUALIZATION</small><div className="gr-time-line"><i/><span className="gr-event gr-event-early"><em>1</em><b>{language === 'vi' ? current.timeline[0].vi : current.timeline[0].label}</b><small>EARLIER</small></span><span className="gr-event gr-event-late"><em>2</em><b>{language === 'vi' ? current.timeline[1].vi : current.timeline[1].label}</b><small>LATER</small></span></div></div>}

          <div className={`gr-feedback ${feedback ? (feedback.ok ? 'is-correct' : 'is-wrong') : ''}`}>
            {feedback ? <><span>{feedback.ok ? <Check/> : <X/>}</span><div><b>{feedback.ok ? tx.correct : tx.wrong}</b><p>{explanation}</p><small>{tx.teacherNote}</small></div><button onClick={nextRound}>{tx.next}<ChevronRight/></button></> : <><span><Gamepad2/></span><div><b>{teams[activeTeam].name}</b><p>{instruction}</p></div></>}
          </div>
        </section>
      </main>

      <footer className="gr-footer">
        <div className="gr-team-mode"><span><Swords/></span><div><b>{tx.teamMode}</b><small>{teams[activeTeam].name}</small></div></div>
        <nav>{MODES.map((mode) => { const Icon = mode.icon; return <button key={mode.id} className={current.mode === mode.id ? 'is-active' : ''} onClick={() => startMission(mode.id)}><Icon/><span>{language === 'vi' ? mode.vi : mode.en}</span></button>; })}<button className={mission === 'mix' ? 'is-active' : ''} onClick={() => startMission('mix')}><Sparkles/><span>{tx.mix}</span></button></nav>
        <div className="gr-tools"><button onClick={() => setPaused((value) => !value)}>{paused ? <Play/> : <Pause/>}</button><button onClick={() => document.documentElement.requestFullscreen?.()} title={tx.fullscreen}><Expand/></button><button onClick={() => setSound((value) => !value)} title={tx.sound}>{sound ? <Volume2/> : <VolumeX/>}</button><button onClick={() => { setBankText(JSON.stringify(bank, null, 2)); setBankOpen(true); }} title={tx.composer}><FileJson/></button><button onClick={() => setSettingsOpen(true)} title={tx.settings}><Settings/></button></div>
      </footer>
      <div className="gr-progress"><i style={{ width: `${progress}%` }}/></div>
      {toast && <div className="gr-toast">{toast}</div>}
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={importBank}/>

      {settingsOpen && <div className="gr-modal-backdrop"><section className="gr-modal"><button className="gr-modal-close" onClick={() => setSettingsOpen(false)}><X/></button><Settings size={34}/><h2>{tx.settings}</h2><label>Seconds per round / Thời gian mỗi vòng<input type="range" min="15" max="60" step="5" value={timePerRound} onChange={(e) => setTimePerRound(Number(e.target.value))}/><b>{timePerRound}s</b></label><label>Team A<input value={teams[0].name} onChange={(e) => setTeam(0, (team) => ({ ...team, name: e.target.value.slice(0, 18) }))}/></label><label>Team B<input value={teams[1].name} onChange={(e) => setTeam(1, (team) => ({ ...team, name: e.target.value.slice(0, 18) }))}/></label><button className="gr-primary" onClick={() => { setSettingsOpen(false); startMission(mission); }}><RotateCcw/>{tx.restart}</button><button onClick={() => setResultsOpen(true)}>{tx.recent}</button></section></div>}

      {rulesOpen && <div className="gr-modal-backdrop"><section className="gr-modal gr-rules"><button className="gr-modal-close" onClick={() => setRulesOpen(false)}><X/></button><BookOpen size={36}/><h2>{tx.rules}</h2>{MODES.map((mode) => { const Icon = mode.icon; return <article key={mode.id}><Icon/><div><b>{language === 'vi' ? mode.vi : mode.en}</b><p>{mode.id === 'timeline' ? tx.instructionSlots : mode.id === 'intruder' ? tx.instructionIntruder : tx.instructionChoice}</p></div></article>; })}</section></div>}

      {bankOpen && <div className="gr-modal-backdrop"><section className="gr-modal gr-bank"><button className="gr-modal-close" onClick={() => setBankOpen(false)}><X/></button><FileJson size={36}/><h2>{tx.composer}</h2><p>{tx.bankHelp}</p><textarea value={bankText} onChange={(e) => setBankText(e.target.value)} spellCheck="false"/><div className="gr-modal-actions"><button onClick={() => fileRef.current?.click()}><Upload/>{tx.import}</button><button onClick={exportBank}><Download/>{tx.export}</button><button onClick={() => setBankText(JSON.stringify(SAMPLE_BANK, null, 2))}><RotateCcw/>{tx.sample}</button><button className="gr-primary" onClick={applyBank}><Check/>{tx.apply}</button></div></section></div>}

      {resultsOpen && <div className="gr-modal-backdrop"><section className="gr-modal"><button className="gr-modal-close" onClick={() => setResultsOpen(false)}><X/></button><Swords size={36}/><h2>{tx.recent}</h2><div className="gr-results">{results.length ? results.map((item) => <article key={item.id}><div><b>{item.winner < 0 ? tx.draw : item.teams[item.winner]?.name}</b><small>{new Date(item.at).toLocaleString()}</small></div><span>{item.teams.map((team) => `${team.name}: ${team.score}`).join(' · ')}</span></article>) : <p>—</p>}</div></section></div>}

      {finished && <div className="gr-modal-backdrop"><section className="gr-modal gr-finish"><Sparkles size={44}/><h2>{tx.finished}</h2><div className="gr-podium">{teams.map((team, index) => <article key={team.name} className={team.score === Math.max(...teams.map((t) => t.score)) ? 'is-winner' : ''}><span>{index === 0 ? 'A' : 'B'}</span><b>{team.name}</b><strong>{team.score.toLocaleString()}</strong></article>)}</div><p>{teams[0].score === teams[1].score ? tx.draw : `${tx.winner}: ${teams[0].score > teams[1].score ? teams[0].name : teams[1].name}`}</p><button className="gr-primary" onClick={() => startMission(mission)}><RotateCcw/>{tx.restart}</button></section></div>}
    </div>
  );
}
