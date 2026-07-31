import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Download,
  Eye, FileUp, Gauge, History, Keyboard, LockKeyhole, Maximize2, Medal, Minus,
  Pause, Play, Plus, Redo2, RotateCcw, Save, Settings2, Shuffle, Sparkles,
  Star, Trophy, Undo2, Users, Volume2, VolumeX, WandSparkles, X, Zap,
} from 'lucide-react';
import '../styles/TopFiveArena.css';

const STORAGE_KEY = 'brian-top-five-arena-v2';
const RESULTS_KEY = 'brian-top-five-arena-results-v2';
const RANK_COLORS = ['blue', 'mint', 'violet', 'orange', 'pink'];
const TEAM_TONES = ['blue', 'mint', 'orange', 'violet', 'pink'];
const DEFAULT_POINTS = [10, 7, 5, 3, 2];

const SAMPLE_GAME = {
  title: 'Brian Top 5 Arena',
  subtitle: 'Đoán 5 đáp án hàng đầu',
  settings: {
    secondsPerRound: 60,
    maxStrikes: 3,
    sound: true,
    autoAward: true,
    autoRotateAfterWrong: true,
    fuzzyMatch: true,
    celebration: true,
    showExplanationAfterRound: true,
  },
  teams: [
    { id: 'team-a', name: 'Team A', score: 0, tone: 'blue' },
    { id: 'team-b', name: 'Team B', score: 0, tone: 'mint' },
    { id: 'team-c', name: 'Team C', score: 0, tone: 'orange' },
  ],
  rounds: [
    {
      id: 'conditional-openers',
      question: 'Kể tên 5 từ/cụm từ có thể mở đầu mệnh đề điều kiện',
      explanation: 'Mệnh đề điều kiện dùng để diễn tả một điều kiện và kết quả của nó. Những từ/cụm từ như “if”, “unless”, “provided that”, “as long as” và “in case” thường được dùng để mở đầu.',
      multiplier: 1,
      answers: [
        { text: 'if', points: 10, aliases: ['if'] },
        { text: 'unless', points: 7, aliases: ['unless'] },
        { text: 'provided that', points: 5, aliases: ['provided that', 'providing that'] },
        { text: 'as long as', points: 3, aliases: ['as long as', 'so long as'] },
        { text: 'in case', points: 2, aliases: ['in case'] },
      ],
    },
    {
      id: 'contrast-linkers',
      question: 'Kể tên 5 từ/cụm từ thường dùng để diễn đạt sự tương phản',
      explanation: 'Những từ nối tương phản giúp đặt hai ý trái ngược cạnh nhau. Cần chú ý khác biệt về cấu trúc giữa although, despite và however.',
      multiplier: 1,
      answers: [
        { text: 'although', points: 10, aliases: ['although', 'though', 'even though'] },
        { text: 'however', points: 7, aliases: ['however', 'nevertheless', 'nonetheless'] },
        { text: 'despite', points: 5, aliases: ['despite', 'in spite of'] },
        { text: 'whereas', points: 3, aliases: ['whereas', 'while'] },
        { text: 'on the other hand', points: 2, aliases: ['on the other hand'] },
      ],
    },
    {
      id: 'study-collocations',
      question: 'Kể tên 5 collocation phổ biến với từ “study”',
      explanation: 'Collocation là những từ thường xuất hiện cùng nhau. Học theo cụm giúp học sinh dùng từ tự nhiên hơn và hạn chế dịch từng từ.',
      multiplier: 2,
      answers: [
        { text: 'conduct a study', points: 10, aliases: ['conduct a study'] },
        { text: 'carry out a study', points: 7, aliases: ['carry out a study'] },
        { text: 'a recent study', points: 5, aliases: ['recent study', 'a recent study'] },
        { text: 'a detailed study', points: 3, aliases: ['detailed study', 'a detailed study'] },
        { text: 'study findings', points: 2, aliases: ['study findings', 'findings of a study'] },
      ],
    },
  ],
};

const COPY = {
  vi: {
    round: 'Vòng', playing: 'Đang chơi', ready: 'Sẵn sàng', paused: 'Tạm dừng', finished: 'Hoàn tất',
    mistakes: 'Sai lầm', scoreboard: 'Bảng điểm', explanation: 'Giải thích', start: 'Bắt đầu', pause: 'Tạm dừng',
    reveal: 'Mở đáp án', fullscreen: 'Toàn màn hình', settings: 'Cài đặt', resetRound: 'Làm lại vòng', resetGame: 'Chơi lại',
    previous: 'Vòng trước', next: 'Vòng sau', editor: 'Biên soạn', save: 'Lưu', import: 'Nhập JSON', export: 'Xuất JSON', close: 'Đóng',
    teams: 'Đội chơi', rounds: 'Câu hỏi', answer: 'Đáp án', points: 'điểm', addTeam: 'Thêm đội', addRound: 'Thêm câu hỏi',
    sound: 'Âm thanh', secondsPerRound: 'Thời gian mỗi vòng', fuzzyMatch: 'Nhận đáp án gần đúng', autoAward: 'Tự cộng điểm',
    autoRotateAfterWrong: 'Tự chuyển lượt khi sai', celebration: 'Hiệu ứng chiến thắng', delete: 'Xoá',
    submitAnswer: 'Kiểm tra', answerPlaceholder: 'Nhập câu trả lời của học sinh…', currentTurn: 'Đang đến lượt',
    correct: 'Chính xác!', almost: 'Gần đúng — giáo viên có thể duyệt', wrong: 'Chưa có trong Top 5', duplicate: 'Đáp án này đã được mở',
    timeUp: 'Hết giờ!', roundComplete: 'Hoàn thành vòng', gameComplete: 'Kết thúc trò chơi', winner: 'Đội chiến thắng', tie: 'Đồng hạng',
    undo: 'Hoàn tác', redo: 'Làm lại', history: 'Lịch sử', randomRound: 'Vòng ngẫu nhiên', addStrike: 'Thêm lỗi', removeStrike: 'Bớt lỗi',
    manualReveal: 'Mở thủ công', approve: 'Duyệt đáp án', reject: 'Tính sai', multiplier: 'Hệ số', roundPot: 'Quỹ điểm vòng',
    answered: 'đã tìm thấy', remaining: 'còn lại', shortcuts: 'Phím tắt', compact: 'Chế độ trình chiếu', editScore: 'Điều chỉnh điểm',
    noHistory: 'Chưa có thao tác nào.', saved: 'Đã lưu trên thiết bị.', invalidFile: 'Tệp JSON không hợp lệ.',
    keyboardHelp: 'Space: chạy/dừng · Enter: kiểm tra · 1–5: mở ô · X: lỗi · U: hoàn tác · F: toàn màn hình · ←/→: đổi vòng',
  },
  en: {
    round: 'Round', playing: 'Playing', ready: 'Ready', paused: 'Paused', finished: 'Finished',
    mistakes: 'Strikes', scoreboard: 'Scoreboard', explanation: 'Explanation', start: 'Start', pause: 'Pause',
    reveal: 'Reveal', fullscreen: 'Fullscreen', settings: 'Settings', resetRound: 'Reset round', resetGame: 'Restart game',
    previous: 'Previous', next: 'Next', editor: 'Edit game', save: 'Save', import: 'Import JSON', export: 'Export JSON', close: 'Close',
    teams: 'Teams', rounds: 'Questions', answer: 'Answer', points: 'points', addTeam: 'Add team', addRound: 'Add question',
    sound: 'Sound', secondsPerRound: 'Seconds per round', fuzzyMatch: 'Accept close answers', autoAward: 'Auto award points',
    autoRotateAfterWrong: 'Rotate after a wrong answer', celebration: 'Celebration effect', delete: 'Delete',
    submitAnswer: 'Check', answerPlaceholder: 'Type the student answer…', currentTurn: 'Current turn',
    correct: 'Correct!', almost: 'Close — teacher approval needed', wrong: 'Not in the Top 5', duplicate: 'That answer is already open',
    timeUp: 'Time is up!', roundComplete: 'Round complete', gameComplete: 'Game complete', winner: 'Winner', tie: 'Tie',
    undo: 'Undo', redo: 'Redo', history: 'History', randomRound: 'Random round', addStrike: 'Add strike', removeStrike: 'Remove strike',
    manualReveal: 'Manual reveal', approve: 'Approve', reject: 'Count wrong', multiplier: 'Multiplier', roundPot: 'Round pot',
    answered: 'found', remaining: 'remaining', shortcuts: 'Shortcuts', compact: 'Presentation mode', editScore: 'Adjust score',
    noHistory: 'No actions yet.', saved: 'Saved on this device.', invalidFile: 'Invalid JSON file.',
    keyboardHelp: 'Space: start/pause · Enter: check · 1–5: reveal · X: strike · U: undo · F: fullscreen · ←/→: change round',
  },
};

function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  const parsed = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : min));
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left) return right.length;
  if (!right) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = row[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
      previous = saved;
    }
  }
  return row[right.length];
}

function similarity(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length);
}

function normalizeGame(raw) {
  const source = raw && typeof raw === 'object' ? raw : SAMPLE_GAME;
  const rawTeams = Array.isArray(source.teams) && source.teams.length ? source.teams : SAMPLE_GAME.teams;
  const rawRounds = Array.isArray(source.rounds) && source.rounds.length ? source.rounds : SAMPLE_GAME.rounds;
  return {
    title: String(source.title || SAMPLE_GAME.title).slice(0, 80),
    subtitle: String(source.subtitle || SAMPLE_GAME.subtitle).slice(0, 120),
    settings: {
      secondsPerRound: clamp(source.settings?.secondsPerRound ?? 60, 10, 600),
      maxStrikes: clamp(source.settings?.maxStrikes ?? 3, 1, 5),
      sound: source.settings?.sound !== false,
      autoAward: source.settings?.autoAward !== false,
      autoRotateAfterWrong: source.settings?.autoRotateAfterWrong !== false,
      fuzzyMatch: source.settings?.fuzzyMatch !== false,
      celebration: source.settings?.celebration !== false,
      showExplanationAfterRound: source.settings?.showExplanationAfterRound !== false,
    },
    teams: rawTeams.slice(0, 8).map((team, index) => ({
      id: String(team?.id || uid('team')),
      name: String(team?.name || `Team ${index + 1}`).slice(0, 30),
      score: clamp(team?.score ?? 0, -9999, 999999),
      tone: TEAM_TONES.includes(team?.tone) ? team.tone : TEAM_TONES[index % TEAM_TONES.length],
    })),
    rounds: rawRounds.slice(0, 60).map((round, roundIndex) => ({
      id: String(round?.id || uid('round')),
      question: String(round?.question || `Câu hỏi ${roundIndex + 1}`).slice(0, 260),
      explanation: String(round?.explanation || '').slice(0, 1600),
      multiplier: clamp(round?.multiplier ?? 1, 1, 5),
      answers: Array.from({ length: 5 }, (_, answerIndex) => {
        const item = Array.isArray(round?.answers) ? round.answers[answerIndex] : null;
        const text = String(item?.text || `Đáp án ${answerIndex + 1}`).slice(0, 120);
        const aliases = Array.isArray(item?.aliases) ? item.aliases : [];
        return {
          text,
          points: clamp(item?.points ?? DEFAULT_POINTS[answerIndex], 0, 999),
          aliases: [...new Set([text, ...aliases].map((value) => String(value).slice(0, 120)).filter(Boolean))].slice(0, 12),
        };
      }),
    })),
  };
}

function loadGame() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return normalizeGame(stored ? JSON.parse(stored) : SAMPLE_GAME);
  } catch {
    return normalizeGame(SAMPLE_GAME);
  }
}

function loadResults() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function saveResult(result) {
  try {
    const previous = loadResults();
    localStorage.setItem(RESULTS_KEY, JSON.stringify([result, ...previous].slice(0, 20)));
  } catch {
    // Optional local result history.
  }
}

function downloadJson(data, filename = 'brian-top-5-arena.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function playTone(enabled, kind = 'tap') {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const notes = kind === 'win' ? [523, 659, 784] : kind === 'wrong' ? [180, 130] : kind === 'reveal' ? [440, 660] : [360];
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = kind === 'wrong' ? 'sawtooth' : 'sine';
      oscillator.frequency.value = frequency;
      const start = ctx.currentTime + index * 0.08;
      const localGain = ctx.createGain();
      localGain.gain.setValueAtTime(0.035, start);
      localGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      oscillator.connect(localGain);
      localGain.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
    });
    window.setTimeout(() => ctx.close?.(), 800);
  } catch {
    // Audio is an enhancement only.
  }
}

function AppMark() {
  return (
    <span className="t5a-app-mark" aria-hidden="true">
      <span className="t5a-app-mark-letter">b</span>
      <Sparkles className="t5a-app-mark-spark" />
    </span>
  );
}

function ToolbarButton({ label, children, active = false, ...props }) {
  return (
    <button type="button" className={`t5a-toolbar-button ${active ? 'is-active' : ''}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

function ControlButton({ icon: Icon, children, primary = false, accent = false, ...props }) {
  return (
    <button type="button" className={`t5a-control-button ${primary ? 'is-primary' : ''} ${accent ? 'is-accent' : ''}`} {...props}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

function TeamRow({ team, selected, current, onSelect, onAdjust, copy }) {
  return (
    <div className={`t5a-team-row ${selected ? 'is-selected' : ''} ${current ? 'is-current' : ''}`}>
      <button type="button" className="t5a-team-main" onClick={onSelect}>
        <span className={`t5a-team-avatar is-${team.tone}`}>{team.name.slice(0, 1).toUpperCase()}</span>
        <span className="t5a-team-name">{team.name}</span>
        {current ? <span className="t5a-turn-dot" title={copy.currentTurn}><Zap /></span> : null}
        <strong className={`t5a-team-score is-${team.tone}`}>{team.score}</strong>
      </button>
      <div className="t5a-score-stepper" aria-label={copy.editScore}>
        <button type="button" onClick={() => onAdjust(-1)} aria-label="-1"><Minus /></button>
        <button type="button" onClick={() => onAdjust(1)} aria-label="+1"><Plus /></button>
      </div>
    </div>
  );
}

function AnswerRow({ answer, index, revealed, credited, newlyRevealed, onToggle, copy }) {
  const tone = RANK_COLORS[index];
  return (
    <button
      type="button"
      className={`t5a-answer-row is-${tone} ${revealed ? 'is-revealed' : 'is-hidden'} ${credited ? 'is-credited' : ''} ${newlyRevealed ? 'is-new' : ''}`}
      onClick={onToggle}
      aria-label={`${revealed ? copy.manualReveal : copy.reveal} ${index + 1}`}
    >
      <span className="t5a-rank-badge">{index + 1}</span>
      <span className="t5a-answer-surface">
        <span className="t5a-answer-copy">{revealed ? answer.text : <LockKeyhole aria-hidden="true" />}</span>
        {revealed ? <span className="t5a-point-pill">{answer.points} {copy.points}</span> : null}
        {credited ? <span className="t5a-credited-mark"><Check aria-hidden="true" /></span> : null}
      </span>
    </button>
  );
}

function EditorModal({ game, language, onClose, onSave }) {
  const copy = COPY[language] || COPY.vi;
  const [draft, setDraft] = useState(() => normalizeGame(game));
  const [activeRound, setActiveRound] = useState(0);
  const fileRef = useRef(null);
  const round = draft.rounds[activeRound];

  const updateRound = (patch) => setDraft((current) => ({
    ...current,
    rounds: current.rounds.map((item, index) => index === activeRound ? { ...item, ...patch } : item),
  }));

  const updateAnswer = (answerIndex, patch) => setDraft((current) => ({
    ...current,
    rounds: current.rounds.map((item, index) => index === activeRound
      ? { ...item, answers: item.answers.map((answer, position) => position === answerIndex ? { ...answer, ...patch } : answer) }
      : item),
  }));

  const addTeam = () => setDraft((current) => current.teams.length >= 8 ? current : ({
    ...current,
    teams: [...current.teams, { id: uid('team'), name: `Team ${current.teams.length + 1}`, score: 0, tone: TEAM_TONES[current.teams.length % TEAM_TONES.length] }],
  }));

  const addRound = () => setDraft((current) => {
    if (current.rounds.length >= 60) return current;
    const next = {
      id: uid('round'), question: `Câu hỏi ${current.rounds.length + 1}`, explanation: '', multiplier: 1,
      answers: DEFAULT_POINTS.map((points, index) => ({ text: `Đáp án ${index + 1}`, points, aliases: [] })),
    };
    window.setTimeout(() => setActiveRound(current.rounds.length), 0);
    return { ...current, rounds: [...current.rounds, next] };
  });

  const removeRound = (index) => setDraft((current) => {
    if (current.rounds.length <= 1) return current;
    const rounds = current.rounds.filter((_, position) => position !== index);
    window.setTimeout(() => setActiveRound((value) => Math.max(0, Math.min(value, rounds.length - 1))), 0);
    return { ...current, rounds };
  });

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setDraft(normalizeGame(JSON.parse(await file.text())));
      setActiveRound(0);
    } catch {
      window.alert(copy.invalidFile);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="t5a-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="t5a-editor-modal" role="dialog" aria-modal="true" aria-label={copy.editor}>
        <header className="t5a-modal-header">
          <div><span className="t5a-eyebrow"><WandSparkles /> Arena Studio</span><h2>{copy.editor}</h2></div>
          <button type="button" className="t5a-icon-button" onClick={onClose}><X /></button>
        </header>

        <div className="t5a-editor-layout">
          <aside className="t5a-editor-sidebar">
            <label>{copy.rounds}</label>
            <div className="t5a-round-list">
              {draft.rounds.map((item, index) => (
                <button type="button" key={item.id} className={activeRound === index ? 'is-active' : ''} onClick={() => setActiveRound(index)}>
                  <span>{index + 1}</span><strong>{item.question}</strong>
                </button>
              ))}
            </div>
            <button type="button" className="t5a-secondary-action" onClick={addRound}><Plus />{copy.addRound}</button>
          </aside>

          <div className="t5a-editor-content">
            <div className="t5a-form-grid two-columns">
              <label><span>Title</span><input value={draft.title} onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))} /></label>
              <label><span>Subtitle</span><input value={draft.subtitle} onChange={(e) => setDraft((current) => ({ ...current, subtitle: e.target.value }))} /></label>
            </div>

            <section className="t5a-editor-section">
              <div className="t5a-section-heading">
                <div><span>{copy.round} {activeRound + 1}</span><h3>{round?.question}</h3></div>
                <button type="button" className="t5a-danger-text" onClick={() => removeRound(activeRound)}>{copy.delete}</button>
              </div>
              <label><span>Question</span><textarea rows="2" value={round?.question || ''} onChange={(e) => updateRound({ question: e.target.value })} /></label>
              <div className="t5a-form-grid two-columns">
                <label><span>{copy.multiplier}</span><input type="number" min="1" max="5" value={round?.multiplier || 1} onChange={(e) => updateRound({ multiplier: clamp(e.target.value, 1, 5) })} /></label>
                <label><span>{copy.secondsPerRound}</span><input type="number" min="10" max="600" value={draft.settings.secondsPerRound} onChange={(e) => setDraft((current) => ({ ...current, settings: { ...current.settings, secondsPerRound: clamp(e.target.value, 10, 600) } }))} /></label>
              </div>
              <label><span>{copy.explanation}</span><textarea rows="3" value={round?.explanation || ''} onChange={(e) => updateRound({ explanation: e.target.value })} /></label>

              <div className="t5a-answer-editor-list">
                {round?.answers.map((answer, index) => (
                  <div className="t5a-answer-editor" key={`${round.id}-${index}`}>
                    <span className={`t5a-mini-rank is-${RANK_COLORS[index]}`}>{index + 1}</span>
                    <label><span>{copy.answer}</span><input value={answer.text} onChange={(e) => updateAnswer(index, { text: e.target.value })} /></label>
                    <label className="points"><span>{copy.points}</span><input type="number" min="0" max="999" value={answer.points} onChange={(e) => updateAnswer(index, { points: clamp(e.target.value, 0, 999) })} /></label>
                    <label className="aliases"><span>Aliases</span><input value={answer.aliases.join(', ')} onChange={(e) => updateAnswer(index, { aliases: e.target.value.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 12) })} placeholder="synonym, accepted form" /></label>
                  </div>
                ))}
              </div>
            </section>

            <section className="t5a-editor-section">
              <div className="t5a-section-heading"><div><span>{copy.teams}</span><h3>{draft.teams.length} teams</h3></div><button type="button" className="t5a-secondary-action compact" onClick={addTeam}><Plus />{copy.addTeam}</button></div>
              <div className="t5a-team-editor-grid">
                {draft.teams.map((team, index) => (
                  <div className="t5a-team-editor" key={team.id}>
                    <span className={`t5a-team-avatar is-${team.tone}`}>{team.name.slice(0, 1).toUpperCase()}</span>
                    <input value={team.name} onChange={(e) => setDraft((current) => ({ ...current, teams: current.teams.map((item, position) => position === index ? { ...item, name: e.target.value } : item) }))} />
                    <input type="number" value={team.score} onChange={(e) => setDraft((current) => ({ ...current, teams: current.teams.map((item, position) => position === index ? { ...item, score: clamp(e.target.value, -9999, 999999) } : item) }))} />
                    <button type="button" disabled={draft.teams.length <= 2} onClick={() => setDraft((current) => ({ ...current, teams: current.teams.filter((_, position) => position !== index) }))}><X /></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="t5a-editor-section">
              <div className="t5a-settings-grid">
                {[
                  ['sound', copy.sound], ['fuzzyMatch', copy.fuzzyMatch], ['autoAward', copy.autoAward],
                  ['autoRotateAfterWrong', copy.autoRotateAfterWrong], ['celebration', copy.celebration],
                ].map(([key, label]) => (
                  <label className="t5a-switch-row" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(draft.settings[key])} onChange={(e) => setDraft((current) => ({ ...current, settings: { ...current.settings, [key]: e.target.checked } }))} /></label>
                ))}
                <label className="t5a-number-row"><span>Max strikes</span><input type="number" min="1" max="5" value={draft.settings.maxStrikes} onChange={(e) => setDraft((current) => ({ ...current, settings: { ...current.settings, maxStrikes: clamp(e.target.value, 1, 5) } }))} /></label>
              </div>
            </section>
          </div>
        </div>

        <footer className="t5a-modal-footer">
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importFile} />
          <button type="button" className="t5a-secondary-action" onClick={() => fileRef.current?.click()}><FileUp />{copy.import}</button>
          <button type="button" className="t5a-secondary-action" onClick={() => downloadJson(draft)}><Download />{copy.export}</button>
          <span className="t5a-footer-spacer" />
          <button type="button" className="t5a-secondary-action" onClick={onClose}>{copy.close}</button>
          <button type="button" className="t5a-primary-action" onClick={() => onSave(normalizeGame(draft))}><Save />{copy.save}</button>
        </footer>
      </section>
    </div>
  );
}

function HistoryPanel({ actions, copy, onClose }) {
  return (
    <div className="t5a-popover t5a-history-popover">
      <header><div><History /><strong>{copy.history}</strong></div><button type="button" onClick={onClose}><X /></button></header>
      <div className="t5a-history-list">
        {actions.length ? actions.slice().reverse().map((action, index) => (
          <div key={`${action.id}-${index}`} className={`t5a-history-item is-${action.kind}`}>
            <span>{action.icon || '•'}</span><div><strong>{action.label}</strong><small>{action.detail}</small></div>
          </div>
        )) : <p>{copy.noHistory}</p>}
      </div>
    </div>
  );
}

function ResultModal({ teams, copy, onRestart, onClose }) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const winners = sorted.filter((team) => team.score === sorted[0]?.score);
  return (
    <div className="t5a-modal-backdrop t5a-result-backdrop">
      <section className="t5a-result-modal">
        <div className="t5a-result-trophy"><Trophy /></div>
        <span className="t5a-eyebrow">{copy.gameComplete}</span>
        <h2>{winners.length > 1 ? copy.tie : copy.winner}</h2>
        <div className="t5a-winner-names">{winners.map((team) => team.name).join(' · ')}</div>
        <div className="t5a-final-board">
          {sorted.map((team, index) => (
            <div key={team.id}><span>{index === 0 ? <Medal /> : index + 1}</span><strong>{team.name}</strong><b>{team.score}</b></div>
          ))}
        </div>
        <div className="t5a-result-actions">
          <button type="button" className="t5a-secondary-action" onClick={onClose}>{copy.close}</button>
          <button type="button" className="t5a-primary-action" onClick={onRestart}><RotateCcw />{copy.resetGame}</button>
        </div>
      </section>
    </div>
  );
}

export default function TopFiveArena({ language = 'vi' }) {
  const lang = language === 'en' ? 'en' : 'vi';
  const copy = COPY[lang];
  const [game, setGame] = useState(loadGame);
  const [roundIndex, setRoundIndex] = useState(0);
  const [revealed, setRevealed] = useState(() => Array(5).fill(false));
  const [credited, setCredited] = useState(() => Array(5).fill(false));
  const [strikes, setStrikes] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => game.settings.secondsPerRound);
  const [running, setRunning] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(() => game.teams[0]?.id || '');
  const [answerInput, setAnswerInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [pendingMatch, setPendingMatch] = useState(null);
  const [lastReveal, setLastReveal] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [actions, setActions] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const round = game.rounds[roundIndex] || game.rounds[0];
  const activeTeamIndex = Math.max(0, game.teams.findIndex((team) => team.id === activeTeamId));
  const activeTeam = game.teams[activeTeamIndex] || game.teams[0];
  const allRevealed = revealed.every(Boolean);
  const foundCount = revealed.filter(Boolean).length;
  const multiplier = round?.multiplier || 1;
  const roundPot = useMemo(() => (round?.answers || []).reduce((sum, answer, index) => sum + (revealed[index] ? 0 : answer.points * multiplier), 0), [round, revealed, multiplier]);
  const progress = game.settings.secondsPerRound ? secondsLeft / game.settings.secondsPerRound : 0;

  const snapshot = useCallback(() => ({
    game: JSON.parse(JSON.stringify(game)), roundIndex, revealed: [...revealed], credited: [...credited], strikes,
    secondsLeft, running, activeTeamId, answerInput, feedback, pendingMatch,
  }), [game, roundIndex, revealed, credited, strikes, secondsLeft, running, activeTeamId, answerInput, feedback, pendingMatch]);

  const restore = useCallback((state) => {
    setGame(normalizeGame(state.game));
    setRoundIndex(state.roundIndex);
    setRevealed(state.revealed);
    setCredited(state.credited);
    setStrikes(state.strikes);
    setSecondsLeft(state.secondsLeft);
    setRunning(state.running);
    setActiveTeamId(state.activeTeamId);
    setAnswerInput(state.answerInput || '');
    setFeedback(state.feedback || null);
    setPendingMatch(state.pendingMatch || null);
  }, []);

  const commitAction = useCallback((action, previousState) => {
    setUndoStack((current) => [...current.slice(-39), previousState]);
    setRedoStack([]);
    setActions((current) => [...current.slice(-49), { id: uid('action'), ...action }]);
  }, []);

  const rotateTurn = useCallback((offset = 1) => {
    if (!game.teams.length) return;
    const current = Math.max(0, game.teams.findIndex((team) => team.id === activeTeamId));
    const next = (current + offset + game.teams.length) % game.teams.length;
    setActiveTeamId(game.teams[next].id);
  }, [game.teams, activeTeamId]);

  const celebrate = useCallback(() => {
    if (!game.settings.celebration) return;
    confetti({ particleCount: 150, spread: 85, origin: { y: 0.65 }, scalar: 0.9 });
    window.setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.55 }, scalar: 0.7 }), 220);
  }, [game.settings.celebration]);

  const revealAnswer = useCallback((answerIndex, options = {}) => {
    if (!round?.answers?.[answerIndex] || revealed[answerIndex]) return;
    const previousState = snapshot();
    const nextRevealed = revealed.map((value, index) => index === answerIndex ? true : value);
    const amount = round.answers[answerIndex].points * multiplier;
    const shouldAward = options.award ?? game.settings.autoAward;
    const teamId = options.teamId || activeTeamId;
    const team = game.teams.find((item) => item.id === teamId);

    setRevealed(nextRevealed);
    setLastReveal(answerIndex);
    setFeedback({ type: 'correct', title: copy.correct, detail: round.answers[answerIndex].text });
    setPendingMatch(null);
    setAnswerInput('');
    if (shouldAward && teamId && !credited[answerIndex]) {
      setGame((current) => ({
        ...current,
        teams: current.teams.map((item) => item.id === teamId ? { ...item, score: item.score + amount } : item),
      }));
      setCredited((current) => current.map((value, index) => index === answerIndex ? true : value));
    }
    playTone(game.settings.sound, 'reveal');
    commitAction({
      kind: 'correct', icon: '✓',
      label: shouldAward ? `${team?.name || ''} +${amount}` : round.answers[answerIndex].text,
      detail: `${round.answers[answerIndex].text} · ${copy.round} ${roundIndex + 1}`,
    }, previousState);

    if (nextRevealed.every(Boolean)) {
      setRunning(false);
      setExplanationOpen(game.settings.showExplanationAfterRound);
      playTone(game.settings.sound, 'win');
      celebrate();
    }
  }, [activeTeamId, celebrate, commitAction, copy.correct, copy.round, credited, game.settings.autoAward, game.settings.showExplanationAfterRound, game.settings.sound, game.teams, multiplier, revealed, round, roundIndex, snapshot]);

  const addStrike = useCallback((rotate = true, label = copy.wrong) => {
    const previousState = snapshot();
    const next = Math.min(game.settings.maxStrikes, strikes + 1);
    setStrikes(next);
    setFeedback({ type: 'wrong', title: label, detail: `${next}/${game.settings.maxStrikes}` });
    setPendingMatch(null);
    setAnswerInput('');
    playTone(game.settings.sound, 'wrong');
    commitAction({ kind: 'wrong', icon: '×', label, detail: `${activeTeam?.name || ''} · ${next}/${game.settings.maxStrikes}` }, previousState);
    if (rotate && game.settings.autoRotateAfterWrong) rotateTurn(1);
    if (next >= game.settings.maxStrikes) setRunning(false);
  }, [activeTeam?.name, commitAction, copy.wrong, game.settings.autoRotateAfterWrong, game.settings.maxStrikes, game.settings.sound, rotateTurn, snapshot, strikes]);

  const removeStrike = useCallback(() => {
    if (!strikes) return;
    const previousState = snapshot();
    setStrikes((value) => Math.max(0, value - 1));
    setFeedback(null);
    commitAction({ kind: 'adjust', icon: '−', label: copy.removeStrike, detail: `${strikes} → ${strikes - 1}` }, previousState);
  }, [commitAction, copy.removeStrike, snapshot, strikes]);

  const submitAnswer = useCallback(() => {
    const input = normalizeText(answerInput);
    if (!input || !round) return;
    const candidates = round.answers.map((answer, index) => {
      const forms = [...new Set([answer.text, ...(answer.aliases || [])])];
      const exact = forms.some((form) => normalizeText(form) === input);
      const score = Math.max(...forms.map((form) => similarity(input, form)));
      return { index, exact, score, answer };
    }).sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score);

    const best = candidates[0];
    if (!best) return;
    if (revealed[best.index] && (best.exact || best.score >= 0.9)) {
      setFeedback({ type: 'duplicate', title: copy.duplicate, detail: best.answer.text });
      playTone(game.settings.sound, 'tap');
      return;
    }
    if (best.exact && !revealed[best.index]) {
      revealAnswer(best.index);
      return;
    }

    const inputLength = input.replace(/\s/g, '').length;
    const fuzzyThreshold = inputLength <= 4 ? 0.95 : inputLength <= 7 ? 0.86 : 0.78;
    if (game.settings.fuzzyMatch && !revealed[best.index] && best.score >= fuzzyThreshold) {
      setPendingMatch(best);
      setFeedback({ type: 'almost', title: copy.almost, detail: `${answerInput} → ${best.answer.text} (${Math.round(best.score * 100)}%)` });
      playTone(game.settings.sound, 'tap');
      return;
    }
    addStrike(true, copy.wrong);
  }, [addStrike, answerInput, copy.almost, copy.duplicate, copy.wrong, game.settings.fuzzyMatch, game.settings.sound, revealAnswer, revealed, round]);

  const adjustTeamScore = useCallback((teamId, delta) => {
    const previousState = snapshot();
    const team = game.teams.find((item) => item.id === teamId);
    setGame((current) => ({
      ...current,
      teams: current.teams.map((item) => item.id === teamId ? { ...item, score: clamp(item.score + delta, -9999, 999999) } : item),
    }));
    commitAction({ kind: 'adjust', icon: delta > 0 ? '+' : '−', label: `${team?.name || ''} ${delta > 0 ? '+' : ''}${delta}`, detail: copy.editScore }, previousState);
  }, [commitAction, copy.editScore, game.teams, snapshot]);

  const resetRound = useCallback((index = roundIndex) => {
    setRoundIndex(Math.max(0, Math.min(index, game.rounds.length - 1)));
    setRevealed(Array(5).fill(false));
    setCredited(Array(5).fill(false));
    setStrikes(0);
    setSecondsLeft(game.settings.secondsPerRound);
    setRunning(false);
    setAnswerInput('');
    setFeedback(null);
    setPendingMatch(null);
    setLastReveal(null);
    setExplanationOpen(false);
    setActiveTeamId((current) => game.teams.some((team) => team.id === current) ? current : game.teams[0]?.id || '');
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [game.rounds.length, game.settings.secondsPerRound, game.teams, roundIndex]);

  const changeRound = useCallback((nextIndex) => {
    const bounded = Math.max(0, Math.min(nextIndex, game.rounds.length - 1));
    if (bounded === roundIndex) return;
    resetRound(bounded);
  }, [game.rounds.length, resetRound, roundIndex]);

  const randomRound = useCallback(() => {
    if (game.rounds.length <= 1) return;
    let next = roundIndex;
    while (next === roundIndex) next = Math.floor(Math.random() * game.rounds.length);
    resetRound(next);
  }, [game.rounds.length, resetRound, roundIndex]);

  const revealNext = useCallback(() => {
    const hidden = revealed.findIndex((value) => !value);
    if (hidden >= 0) revealAnswer(hidden, { award: false });
  }, [revealAnswer, revealed]);

  const undo = useCallback(() => {
    if (!undoStack.length) return;
    const current = snapshot();
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((items) => items.slice(0, -1));
    setRedoStack((items) => [...items.slice(-39), current]);
    restore(previous);
    setActions((items) => [...items.slice(-49), { id: uid('action'), kind: 'adjust', icon: '↶', label: copy.undo, detail: '' }]);
  }, [copy.undo, restore, snapshot, undoStack]);

  const redo = useCallback(() => {
    if (!redoStack.length) return;
    const current = snapshot();
    const next = redoStack[redoStack.length - 1];
    setRedoStack((items) => items.slice(0, -1));
    setUndoStack((items) => [...items.slice(-39), current]);
    restore(next);
    setActions((items) => [...items.slice(-49), { id: uid('action'), kind: 'adjust', icon: '↷', label: copy.redo, detail: '' }]);
  }, [copy.redo, redoStack, restore, snapshot]);

  const resetGame = useCallback(() => {
    setGame((current) => ({ ...current, teams: current.teams.map((team) => ({ ...team, score: 0 })) }));
    setRoundIndex(0);
    setUndoStack([]);
    setRedoStack([]);
    setActions([]);
    setShowResult(false);
    window.setTimeout(() => resetRound(0), 0);
  }, [resetRound]);

  const finishGame = useCallback(() => {
    setRunning(false);
    setShowResult(true);
    const sorted = [...game.teams].sort((a, b) => b.score - a.score);
    saveResult({ id: uid('result'), at: new Date().toISOString(), title: game.title, winner: sorted[0]?.name || '', teams: sorted });
    playTone(game.settings.sound, 'win');
    celebrate();
  }, [celebrate, game.settings.sound, game.teams, game.title]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await rootRef.current?.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {
      // Fullscreen can be blocked by the browser.
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); } catch { /* local save is optional */ }
  }, [game]);

  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          setFeedback({ type: 'wrong', title: copy.timeUp, detail: '' });
          setStrikes((current) => Math.min(game.settings.maxStrikes, current + 1));
          setActions((current) => [...current.slice(-49), { id: uid('action'), kind: 'wrong', icon: '⏱', label: copy.timeUp, detail: activeTeam?.name || '' }]);
          if (game.settings.autoRotateAfterWrong) window.setTimeout(() => rotateTurn(1), 0);
          playTone(game.settings.sound, 'wrong');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeTeam?.name, copy.timeUp, game.settings.autoRotateAfterWrong, game.settings.maxStrikes, game.settings.sound, rotateTurn, running]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (typing) {
        if (event.key === 'Enter' && target === inputRef.current) {
          event.preventDefault();
          submitAnswer();
        }
        return;
      }
      if (event.code === 'Space') { event.preventDefault(); setRunning((value) => !value); }
      else if (/^[1-5]$/.test(event.key)) revealAnswer(Number(event.key) - 1, { award: false });
      else if (event.key.toLowerCase() === 'x') addStrike();
      else if (event.key.toLowerCase() === 'u') undo();
      else if (event.key.toLowerCase() === 'f') toggleFullscreen();
      else if (event.key === 'ArrowLeft') changeRound(roundIndex - 1);
      else if (event.key === 'ArrowRight') changeRound(roundIndex + 1);
      else if (event.key === 'Enter') inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [addStrike, changeRound, revealAnswer, roundIndex, submitAnswer, toggleFullscreen, undo]);

  const statusLabel = allRevealed ? copy.finished : running ? copy.playing : secondsLeft < game.settings.secondsPerRound ? copy.paused : copy.ready;

  return (
    <div ref={rootRef} className={`t5a-page ${presentationMode ? 'is-presentation' : ''}`}>
      <div className="t5a-ambient t5a-ambient-one" /><div className="t5a-ambient t5a-ambient-two" />
      <section className="t5a-window">
        <header className="t5a-titlebar">
          <div className="t5a-window-controls" aria-hidden="true"><span className="red" /><span className="yellow" /><span className="green" /></div>
          <div className="t5a-brand"><AppMark /><div><h1>{game.title}</h1><p>{game.subtitle}</p></div></div>
          <div className="t5a-title-status">
            <span className="t5a-status-pill"><Gauge />{copy.round} {roundIndex + 1}/{game.rounds.length}</span>
            <span className={`t5a-status-pill is-state ${running ? 'is-live' : ''}`}><i />{statusLabel}</span>
          </div>
          <div className="t5a-toolbar">
            <ToolbarButton label={copy.sound} active={game.settings.sound} onClick={() => setGame((current) => ({ ...current, settings: { ...current.settings, sound: !current.settings.sound } }))}>{game.settings.sound ? <Volume2 /> : <VolumeX />}</ToolbarButton>
            <ToolbarButton label={copy.history} active={showHistory} onClick={() => setShowHistory((value) => !value)}><History /></ToolbarButton>
            <ToolbarButton label={copy.shortcuts} active={showHelp} onClick={() => setShowHelp((value) => !value)}><Keyboard /></ToolbarButton>
            <ToolbarButton label={copy.editor} onClick={() => setShowEditor(true)}><Settings2 /></ToolbarButton>
            <ToolbarButton label={copy.fullscreen} onClick={toggleFullscreen}><Maximize2 /></ToolbarButton>
          </div>
          {showHistory ? <HistoryPanel actions={actions} copy={copy} onClose={() => setShowHistory(false)} /> : null}
          {showHelp ? <div className="t5a-popover t5a-help-popover"><header><div><Keyboard /><strong>{copy.shortcuts}</strong></div><button type="button" onClick={() => setShowHelp(false)}><X /></button></header><p>{copy.keyboardHelp}</p></div> : null}
        </header>

        <main className="t5a-workspace">
          <section className="t5a-board-card">
            <div className="t5a-question-area">
              <span className="t5a-question-icon"><CircleHelp /></span>
              <div className="t5a-question-copy"><span>{copy.round} {roundIndex + 1} · x{multiplier}</span><h2>{round?.question}</h2></div>
              <div className="t5a-round-metrics"><span><Check />{foundCount}/5 {copy.answered}</span><span><Star />{roundPot} {copy.remaining}</span></div>
            </div>

            <div className="t5a-answer-board">
              {round?.answers.map((answer, index) => (
                <AnswerRow key={`${round.id}-${index}`} answer={answer} index={index} revealed={revealed[index]} credited={credited[index]} newlyRevealed={lastReveal === index} onToggle={() => revealAnswer(index, { award: false })} copy={copy} />
              ))}
            </div>

            <div className="t5a-answer-console">
              <div className="t5a-active-turn">
                <span className={`t5a-team-avatar is-${activeTeam?.tone || 'blue'}`}>{activeTeam?.name?.slice(0, 1).toUpperCase() || '?'}</span>
                <div><small>{copy.currentTurn}</small><strong>{activeTeam?.name || ''}</strong></div>
                <button type="button" onClick={() => rotateTurn(-1)}><ChevronLeft /></button>
                <button type="button" onClick={() => rotateTurn(1)}><ChevronRight /></button>
              </div>
              <div className={`t5a-answer-entry ${feedback ? `has-${feedback.type}` : ''}`}>
                <input ref={inputRef} value={answerInput} onChange={(event) => { setAnswerInput(event.target.value); setFeedback(null); setPendingMatch(null); }} placeholder={copy.answerPlaceholder} disabled={allRevealed} />
                <button type="button" className="t5a-check-button" onClick={submitAnswer} disabled={!answerInput.trim() || allRevealed}><WandSparkles />{copy.submitAnswer}</button>
              </div>
              {feedback ? (
                <div className={`t5a-feedback is-${feedback.type}`}>
                  <span>{feedback.type === 'correct' ? <Check /> : feedback.type === 'almost' ? <Sparkles /> : <X />}</span>
                  <div><strong>{feedback.title}</strong><small>{feedback.detail}</small></div>
                  {pendingMatch ? <div className="t5a-feedback-actions"><button type="button" onClick={() => revealAnswer(pendingMatch.index)}>{copy.approve}</button><button type="button" onClick={() => addStrike()}>{copy.reject}</button></div> : null}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="t5a-sidebar">
            <section className="t5a-side-card t5a-timer-card">
              <div className="t5a-timer-top"><span className="t5a-side-icon"><Clock3 /></span><strong>{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</strong><button type="button" onClick={() => setRunning((value) => !value)}>{running ? <Pause /> : <Play />}</button></div>
              <div className="t5a-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} /></div>
            </section>

            <section className="t5a-side-card t5a-strike-card">
              <div className="t5a-card-heading"><span>{copy.mistakes}</span><div><button type="button" onClick={removeStrike} disabled={!strikes}><Minus /></button><button type="button" onClick={() => addStrike(false)} disabled={strikes >= game.settings.maxStrikes}><Plus /></button></div></div>
              <div className="t5a-strikes">
                {Array.from({ length: game.settings.maxStrikes }, (_, index) => <span key={index} className={index < strikes ? 'is-used' : ''}><X /></span>)}
              </div>
            </section>

            <section className="t5a-side-card t5a-scoreboard-card">
              <div className="t5a-card-heading"><span><Users />{copy.scoreboard}</span><small>{copy.currentTurn}</small></div>
              <div className="t5a-team-list">
                {game.teams.map((team) => <TeamRow key={team.id} team={team} selected={team.id === activeTeamId} current={team.id === activeTeamId} onSelect={() => setActiveTeamId(team.id)} onAdjust={(delta) => adjustTeamScore(team.id, delta)} copy={copy} />)}
              </div>
            </section>

            <section className={`t5a-side-card t5a-explanation-card ${explanationOpen ? 'is-open' : ''}`}>
              <button type="button" className="t5a-card-heading t5a-explanation-toggle" onClick={() => setExplanationOpen((value) => !value)}><span><CircleHelp />{copy.explanation}</span><ChevronDown /></button>
              <div className="t5a-explanation-body"><p>{round?.explanation || '—'}</p></div>
            </section>
          </aside>
        </main>

        <footer className="t5a-controlbar">
          <ControlButton icon={ChevronLeft} onClick={() => changeRound(roundIndex - 1)} disabled={roundIndex === 0}>{copy.previous}</ControlButton>
          <ControlButton icon={running ? Pause : Play} primary onClick={() => setRunning((value) => !value)} disabled={allRevealed}>{running ? copy.pause : copy.start}</ControlButton>
          <ControlButton icon={Shuffle} onClick={randomRound}>{copy.randomRound}</ControlButton>
          <ControlButton icon={Eye} onClick={revealNext} disabled={allRevealed}>{copy.reveal}</ControlButton>
          <ControlButton icon={Undo2} onClick={undo} disabled={!undoStack.length}>{copy.undo}</ControlButton>
          <ControlButton icon={Redo2} onClick={redo} disabled={!redoStack.length}>{copy.redo}</ControlButton>
          <ControlButton icon={RotateCcw} onClick={() => resetRound()}>{copy.resetRound}</ControlButton>
          <button type="button" className={`t5a-presentation-toggle ${presentationMode ? 'is-active' : ''}`} onClick={() => setPresentationMode((value) => !value)} title={copy.compact}><Maximize2 /></button>
          {roundIndex < game.rounds.length - 1
            ? <ControlButton icon={ChevronRight} accent onClick={() => changeRound(roundIndex + 1)}>{copy.next}</ControlButton>
            : <ControlButton icon={Trophy} accent onClick={finishGame}>{copy.gameComplete}</ControlButton>}
        </footer>
      </section>

      {showEditor ? <EditorModal game={game} language={lang} onClose={() => setShowEditor(false)} onSave={(nextGame) => {
        setGame(nextGame);
        setShowEditor(false);
        setRoundIndex(0);
        setRevealed(Array(5).fill(false));
        setCredited(Array(5).fill(false));
        setStrikes(0);
        setSecondsLeft(nextGame.settings.secondsPerRound);
        setRunning(false);
        setAnswerInput('');
        setFeedback(null);
        setPendingMatch(null);
        setActiveTeamId(nextGame.teams[0]?.id || '');
      }} /> : null}
      {showResult ? <ResultModal teams={game.teams} copy={copy} onRestart={resetGame} onClose={() => setShowResult(false)} /> : null}
    </div>
  );
}
