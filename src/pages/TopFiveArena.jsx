import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Download,
  Eye, FileUp, Gauge, LockKeyhole, Maximize2, MoreHorizontal, Pause,
  Play, Plus, RotateCcw, Save, Settings2, Sparkles, Star, Trophy, Users,
  Volume2, VolumeX, X,
} from 'lucide-react';
import '../styles/TopFiveArena.css';

const STORAGE_KEY = 'brian-top-five-arena-v1';
const RESULTS_KEY = 'brian-top-five-arena-results-v1';
const RANK_COLORS = ['blue', 'mint', 'violet', 'orange', 'pink'];

const SAMPLE_GAME = {
  title: 'Brian Top 5 Arena',
  subtitle: 'Đoán 5 đáp án hàng đầu',
  settings: { secondsPerRound: 60, maxStrikes: 3, sound: true, autoAdvance: false, celebration: true },
  teams: [
    { id: 'team-a', name: 'Team A', score: 120, tone: 'blue' },
    { id: 'team-b', name: 'Team B', score: 85, tone: 'mint' },
    { id: 'team-c', name: 'Team C', score: 60, tone: 'orange' },
  ],
  rounds: [
    {
      id: 'conditional-openers',
      question: 'Kể tên 5 từ/cụm từ có thể mở đầu mệnh đề điều kiện',
      explanation: 'Mệnh đề điều kiện dùng để diễn tả một điều kiện có thể xảy ra và kết quả của nó. Các từ/cụm từ như “if”, “unless”, “provided that”, “as long as”, “in case” thường được dùng để mở đầu.',
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
      explanation: 'Những từ nối tương phản giúp người nói hoặc người viết đặt hai ý trái ngược cạnh nhau. Cần chú ý sự khác biệt về cấu trúc giữa although, despite và however.',
      answers: [
        { text: 'although', points: 10, aliases: ['although', 'though'] },
        { text: 'however', points: 7, aliases: ['however', 'nevertheless'] },
        { text: 'despite', points: 5, aliases: ['despite', 'in spite of'] },
        { text: 'whereas', points: 3, aliases: ['whereas', 'while'] },
        { text: 'on the other hand', points: 2, aliases: ['on the other hand'] },
      ],
    },
    {
      id: 'study-collocations',
      question: 'Kể tên 5 collocation phổ biến với từ “study”',
      explanation: 'Collocation là những từ thường xuất hiện cùng nhau. Học theo cụm giúp học sinh dùng từ tự nhiên hơn và hạn chế dịch từng từ.',
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
    round: 'Vòng', playing: 'Đang chơi', ready: 'Sẵn sàng', paused: 'Tạm dừng', mistakes: 'Sai lầm', scoreboard: 'Bảng điểm', explanation: 'Giải thích',
    start: 'Bắt đầu', pause: 'Tạm dừng', reveal: 'Lật đáp án', addPoints: 'Cộng điểm', fullscreen: 'Toàn màn hình', settings: 'Cài đặt', resetRound: 'Làm lại vòng',
    previous: 'Vòng trước', next: 'Vòng sau', editor: 'Biên soạn', save: 'Lưu', import: 'Nhập JSON', export: 'Xuất JSON', close: 'Đóng',
    strikes: 'Số lần sai', teams: 'Đội chơi', rounds: 'Câu hỏi', answer: 'Đáp án', points: 'điểm', addTeam: 'Thêm đội', addRound: 'Thêm câu hỏi',
    celebration: 'Hiệu ứng chiến thắng', autoAdvance: 'Tự chuyển vòng khi mở đủ đáp án', sound: 'Âm thanh', secondsPerRound: 'Thời gian mỗi vòng', delete: 'Xoá',
    saved: 'Đã lưu trên thiết bị.', invalidFile: 'Tệp JSON không hợp lệ.', noMoreHidden: 'Tất cả đáp án đã được mở.', chooseTeam: 'Chọn đội trước khi cộng điểm.',
    noNewPoints: 'Hãy mở thêm một đáp án trước khi cộng điểm.', roundComplete: 'Hoàn thành vòng', openAnswer: 'Mở đáp án', lockAnswer: 'Ẩn đáp án',
    keyboard: 'Phím tắt: Space bắt đầu/tạm dừng · 1–5 mở đáp án · X thêm lỗi · F toàn màn hình',
  },
  en: {
    round: 'Round', playing: 'Playing', ready: 'Ready', paused: 'Paused', mistakes: 'Strikes', scoreboard: 'Scoreboard', explanation: 'Explanation',
    start: 'Start', pause: 'Pause', reveal: 'Reveal answer', addPoints: 'Add points', fullscreen: 'Fullscreen', settings: 'Settings', resetRound: 'Reset round',
    previous: 'Previous round', next: 'Next round', editor: 'Edit game', save: 'Save', import: 'Import JSON', export: 'Export JSON', close: 'Close',
    strikes: 'Strikes', teams: 'Teams', rounds: 'Questions', answer: 'Answer', points: 'points', addTeam: 'Add team', addRound: 'Add question',
    celebration: 'Celebration effect', autoAdvance: 'Advance when all answers are revealed', sound: 'Sound', secondsPerRound: 'Seconds per round', delete: 'Delete',
    saved: 'Saved on this device.', invalidFile: 'Invalid JSON file.', noMoreHidden: 'Every answer has been revealed.', chooseTeam: 'Select a team before adding points.',
    noNewPoints: 'Reveal another answer before adding points.', roundComplete: 'Round complete', openAnswer: 'Reveal answer', lockAnswer: 'Hide answer',
    keyboard: 'Shortcuts: Space start/pause · 1–5 reveal · X add strike · F fullscreen',
  },
};

function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }

function normalizeGame(raw) {
  const source = raw && typeof raw === 'object' ? raw : SAMPLE_GAME;
  const rounds = Array.isArray(source.rounds) && source.rounds.length ? source.rounds : SAMPLE_GAME.rounds;
  const teams = Array.isArray(source.teams) && source.teams.length ? source.teams : SAMPLE_GAME.teams;
  return {
    title: String(source.title || SAMPLE_GAME.title).slice(0, 80),
    subtitle: String(source.subtitle || SAMPLE_GAME.subtitle).slice(0, 120),
    settings: {
      secondsPerRound: clamp(source.settings?.secondsPerRound || 60, 10, 600),
      maxStrikes: clamp(source.settings?.maxStrikes || 3, 1, 5),
      sound: source.settings?.sound !== false,
      autoAdvance: Boolean(source.settings?.autoAdvance),
      celebration: source.settings?.celebration !== false,
    },
    teams: teams.slice(0, 8).map((team, index) => ({
      id: String(team?.id || uid('team')),
      name: String(team?.name || `Team ${index + 1}`).slice(0, 30),
      score: clamp(team?.score || 0, -9999, 999999),
      tone: ['blue', 'mint', 'orange', 'violet', 'pink'].includes(team?.tone) ? team.tone : RANK_COLORS[index % RANK_COLORS.length],
    })),
    rounds: rounds.slice(0, 50).map((round, roundIndex) => ({
      id: String(round?.id || uid('round')),
      question: String(round?.question || `Câu hỏi ${roundIndex + 1}`).slice(0, 260),
      explanation: String(round?.explanation || '').slice(0, 1200),
      answers: Array.from({ length: 5 }, (_, answerIndex) => {
        const answer = Array.isArray(round?.answers) ? round.answers[answerIndex] : null;
        return {
          text: String(answer?.text || `Đáp án ${answerIndex + 1}`).slice(0, 120),
          points: clamp(answer?.points ?? [10, 7, 5, 3, 2][answerIndex], 0, 999),
          aliases: Array.isArray(answer?.aliases) ? answer.aliases.map((item) => String(item).slice(0, 120)).slice(0, 8) : [],
        };
      }),
    })),
  };
}

function loadGame() {
  try { return normalizeGame(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || SAMPLE_GAME); }
  catch { return normalizeGame(SAMPLE_GAME); }
}

function saveResult(result) {
  try {
    const previous = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    localStorage.setItem(RESULTS_KEY, JSON.stringify([result, ...previous].slice(0, 30)));
  } catch { /* optional local history */ }
}

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'brian-top-5-arena.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function playTone(enabled, kind = 'tap') {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = kind === 'win' ? 'triangle' : kind === 'wrong' ? 'sawtooth' : 'sine';
    oscillator.frequency.value = kind === 'win' ? 740 : kind === 'wrong' ? 150 : kind === 'reveal' ? 540 : 360;
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === 'win' ? 0.48 : 0.14));
    oscillator.stop(ctx.currentTime + (kind === 'win' ? 0.5 : 0.16));
  } catch { /* optional audio */ }
}

function AppMark() {
  return <span className="t5a-app-mark" aria-hidden="true"><span className="t5a-app-mark-letter">b</span><Sparkles className="t5a-app-mark-spark" /></span>;
}

function ToolbarButton({ label, children, active = false, ...props }) {
  return <button type="button" className={`t5a-toolbar-button ${active ? 'is-active' : ''}`} aria-label={label} title={label} {...props}>{children}</button>;
}

function ControlButton({ icon: Icon, children, primary = false, accent = false, ...props }) {
  return <button type="button" className={`t5a-control-button ${primary ? 'is-primary' : ''} ${accent ? 'is-accent' : ''}`} {...props}><Icon aria-hidden="true" /><span>{children}</span></button>;
}

function TeamRow({ team, selected, onSelect }) {
  return (
    <button type="button" className={`t5a-team-row ${selected ? 'is-selected' : ''}`} onClick={onSelect}>
      <span className={`t5a-team-avatar is-${team.tone}`}>{team.name.slice(0, 1).toUpperCase()}</span>
      <span className="t5a-team-name">{team.name}</span>
      <strong className={`t5a-team-score is-${team.tone}`}>{team.score}</strong>
    </button>
  );
}

function AnswerRow({ answer, index, revealed, credited, onToggle, language }) {
  const copy = COPY[language] || COPY.vi;
  const tone = RANK_COLORS[index];
  return (
    <button type="button" className={`t5a-answer-row is-${tone} ${revealed ? 'is-revealed' : 'is-hidden'} ${credited ? 'is-credited' : ''}`} onClick={onToggle} aria-label={`${revealed ? copy.lockAnswer : copy.openAnswer} ${index + 1}`}>
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
  const fileRef = useRef(null);

  const updateRound = (roundIndex, patch) => setDraft((current) => ({ ...current, rounds: current.rounds.map((round, index) => index === roundIndex ? { ...round, ...patch } : round) }));
  const updateAnswer = (roundIndex, answerIndex, patch) => setDraft((current) => ({
    ...current,
    rounds: current.rounds.map((round, index) => index === roundIndex ? { ...round, answers: round.answers.map((answer, itemIndex) => itemIndex === answerIndex ? { ...answer, ...patch } : answer) } : round),
  }));

  const addTeam = () => setDraft((current) => current.teams.length >= 8 ? current : ({
    ...current,
    teams: [...current.teams, { id: uid('team'), name: `Team ${current.teams.length + 1}`, score: 0, tone: RANK_COLORS[current.teams.length % RANK_COLORS.length] }],
  }));

  const addRound = () => setDraft((current) => ({
    ...current,
    rounds: [...current.rounds, {
      id: uid('round'), question: `Câu hỏi ${current.rounds.length + 1}`, explanation: '',
      answers: [10, 7, 5, 3, 2].map((points, index) => ({ text: `Đáp án ${index + 1}`, points, aliases: [] })),
    }],
  }));

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setDraft(normalizeGame(JSON.parse(await file.text()))); }
    catch { window.alert(copy.invalidFile); }
    finally { event.target.value = ''; }
  };

  return (
    <div className="t5a-modal-layer" role="dialog" aria-modal="true" aria-label={copy.editor}>
      <div className="t5a-editor-window">
        <header className="t5a-editor-header">
          <div><span className="t5a-editor-eyebrow">Brian Top 5 Arena</span><h2>{copy.editor}</h2></div>
          <button type="button" className="t5a-modal-close" onClick={onClose}><X /></button>
        </header>
        <div className="t5a-editor-toolbar">
          <button type="button" onClick={() => fileRef.current?.click()}><FileUp />{copy.import}</button>
          <button type="button" onClick={() => downloadJson(draft)}><Download />{copy.export}</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importFile} />
        </div>
        <div className="t5a-editor-scroll">
          <section className="t5a-editor-section">
            <div className="t5a-editor-section-title"><Settings2 /><h3>{copy.settings}</h3></div>
            <div className="t5a-editor-grid is-two">
              <label><span>Title</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label><span>Subtitle</span><input value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
              <label><span>{copy.secondsPerRound}</span><input type="number" min="10" max="600" value={draft.settings.secondsPerRound} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, secondsPerRound: clamp(event.target.value, 10, 600) } })} /></label>
              <label><span>{copy.strikes}</span><input type="number" min="1" max="5" value={draft.settings.maxStrikes} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, maxStrikes: clamp(event.target.value, 1, 5) } })} /></label>
            </div>
            <div className="t5a-editor-switches">
              <label><input type="checkbox" checked={draft.settings.sound} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, sound: event.target.checked } })} /><span>{copy.sound}</span></label>
              <label><input type="checkbox" checked={draft.settings.celebration} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, celebration: event.target.checked } })} /><span>{copy.celebration}</span></label>
              <label><input type="checkbox" checked={draft.settings.autoAdvance} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, autoAdvance: event.target.checked } })} /><span>{copy.autoAdvance}</span></label>
            </div>
          </section>
          <section className="t5a-editor-section">
            <div className="t5a-editor-section-title"><Users /><h3>{copy.teams}</h3><button type="button" onClick={addTeam}><Plus />{copy.addTeam}</button></div>
            <div className="t5a-team-editor-list">
              {draft.teams.map((team, index) => (
                <div className="t5a-team-editor-row" key={team.id}>
                  <span className={`t5a-team-avatar is-${team.tone}`}>{team.name.slice(0, 1).toUpperCase()}</span>
                  <input value={team.name} onChange={(event) => setDraft((current) => ({ ...current, teams: current.teams.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} />
                  <input type="number" value={team.score} onChange={(event) => setDraft((current) => ({ ...current, teams: current.teams.map((item, itemIndex) => itemIndex === index ? { ...item, score: clamp(event.target.value, -9999, 999999) } : item) }))} />
                  <button type="button" disabled={draft.teams.length <= 2} onClick={() => setDraft((current) => ({ ...current, teams: current.teams.filter((_, itemIndex) => itemIndex !== index) }))}><X /></button>
                </div>
              ))}
            </div>
          </section>
          <section className="t5a-editor-section">
            <div className="t5a-editor-section-title"><CircleHelp /><h3>{copy.rounds}</h3><button type="button" onClick={addRound}><Plus />{copy.addRound}</button></div>
            <div className="t5a-round-editor-list">
              {draft.rounds.map((round, roundIndex) => (
                <details className="t5a-round-editor" key={round.id} open={roundIndex === 0}>
                  <summary><span>{roundIndex + 1}</span><strong>{round.question || `Câu hỏi ${roundIndex + 1}`}</strong><ChevronDown /></summary>
                  <div className="t5a-round-editor-body">
                    <label><span>Question</span><textarea rows="2" value={round.question} onChange={(event) => updateRound(roundIndex, { question: event.target.value })} /></label>
                    <label><span>{copy.explanation}</span><textarea rows="3" value={round.explanation} onChange={(event) => updateRound(roundIndex, { explanation: event.target.value })} /></label>
                    <div className="t5a-answer-editor-list">
                      {round.answers.map((answer, answerIndex) => (
                        <div className="t5a-answer-editor-row" key={`${round.id}-${answerIndex}`}>
                          <span className={`t5a-mini-rank is-${RANK_COLORS[answerIndex]}`}>{answerIndex + 1}</span>
                          <input aria-label={`${copy.answer} ${answerIndex + 1}`} value={answer.text} onChange={(event) => updateAnswer(roundIndex, answerIndex, { text: event.target.value })} />
                          <input aria-label={copy.points} type="number" min="0" max="999" value={answer.points} onChange={(event) => updateAnswer(roundIndex, answerIndex, { points: clamp(event.target.value, 0, 999) })} />
                        </div>
                      ))}
                    </div>
                    <button type="button" className="t5a-danger-button" disabled={draft.rounds.length <= 1} onClick={() => setDraft((current) => ({ ...current, rounds: current.rounds.filter((_, itemIndex) => itemIndex !== roundIndex) }))}><X />{copy.delete}</button>
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
        <footer className="t5a-editor-footer">
          <button type="button" className="t5a-secondary-action" onClick={onClose}>{copy.close}</button>
          <button type="button" className="t5a-primary-action" onClick={() => onSave(normalizeGame(draft))}><Save />{copy.save}</button>
        </footer>
      </div>
    </div>
  );
}

export default function TopFiveArena({ language = 'vi' }) {
  const copy = COPY[language] || COPY.vi;
  const [game, setGame] = useState(loadGame);
  const [roundIndex, setRoundIndex] = useState(0);
  const [revealed, setRevealed] = useState(() => new Set([0, 1]));
  const [credited, setCredited] = useState(() => new Set());
  const [strikes, setStrikes] = useState(2);
  const [secondsLeft, setSecondsLeft] = useState(() => game.settings.secondsPerRound === 60 ? 28 : game.settings.secondsPerRound);
  const [running, setRunning] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(() => game.teams[0]?.id || '');
  const [lastRevealedIndex, setLastRevealedIndex] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [explanationOpen, setExplanationOpen] = useState(true);
  const windowRef = useRef(null);

  const round = game.rounds[Math.min(roundIndex, game.rounds.length - 1)] || game.rounds[0];
  const selectedTeam = game.teams.find((team) => team.id === selectedTeamId);
  const progress = Math.max(0, Math.min(100, (secondsLeft / game.settings.secondsPerRound) * 100));
  const statusLabel = running ? copy.playing : secondsLeft < game.settings.secondsPerRound && secondsLeft > 0 ? copy.paused : copy.ready;

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(window.__t5aNoticeTimer);
    window.__t5aNoticeTimer = window.setTimeout(() => setNotice(''), 2400);
  }, []);

  const resetRound = useCallback((index = roundIndex, preserveScores = true) => {
    setRoundIndex(Math.max(0, Math.min(game.rounds.length - 1, index)));
    setRevealed(new Set()); setCredited(new Set()); setStrikes(0);
    setSecondsLeft(game.settings.secondsPerRound); setRunning(false); setLastRevealedIndex(null);
    if (!preserveScores) setGame((current) => ({ ...current, teams: current.teams.map((team) => ({ ...team, score: 0 })) }));
  }, [game.rounds.length, game.settings.secondsPerRound, roundIndex]);

  const celebrate = useCallback(() => {
    if (!game.settings.celebration) return;
    confetti({ particleCount: 120, spread: 72, origin: { y: 0.72 }, scalar: 0.9 });
    window.setTimeout(() => confetti({ particleCount: 70, spread: 95, origin: { x: 0.15, y: 0.62 }, scalar: 0.75 }), 180);
    window.setTimeout(() => confetti({ particleCount: 70, spread: 95, origin: { x: 0.85, y: 0.62 }, scalar: 0.75 }), 260);
  }, [game.settings.celebration]);

  const finishRound = useCallback(() => {
    setRunning(false); playTone(game.settings.sound, 'win'); celebrate();
    saveResult({ id: uid('result'), createdAt: new Date().toISOString(), roundId: round.id, round: roundIndex + 1, strikes, secondsLeft, teams: game.teams });
    showNotice(copy.roundComplete);
  }, [celebrate, copy.roundComplete, game.settings.sound, game.teams, round.id, roundIndex, secondsLeft, showNotice, strikes]);

  const toggleAnswer = useCallback((index) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
        setCredited((currentCredited) => { const nextCredited = new Set(currentCredited); nextCredited.delete(index); return nextCredited; });
      } else {
        next.add(index); setLastRevealedIndex(index); playTone(game.settings.sound, 'reveal');
        if (next.size === 5) window.setTimeout(finishRound, 260);
      }
      return next;
    });
  }, [finishRound, game.settings.sound]);

  const revealNext = useCallback(() => {
    const nextIndex = [0, 1, 2, 3, 4].find((index) => !revealed.has(index));
    if (nextIndex === undefined) { showNotice(copy.noMoreHidden); return; }
    toggleAnswer(nextIndex);
  }, [copy.noMoreHidden, revealed, showNotice, toggleAnswer]);

  const addPoints = useCallback(() => {
    if (!selectedTeam) { showNotice(copy.chooseTeam); return; }
    const candidate = lastRevealedIndex !== null && revealed.has(lastRevealedIndex) && !credited.has(lastRevealedIndex)
      ? lastRevealedIndex : [4, 3, 2, 1, 0].find((index) => revealed.has(index) && !credited.has(index));
    if (candidate === undefined) { showNotice(copy.noNewPoints); return; }
    const points = round.answers[candidate]?.points || 0;
    setGame((current) => ({ ...current, teams: current.teams.map((team) => team.id === selectedTeam.id ? { ...team, score: team.score + points } : team) }));
    setCredited((current) => new Set(current).add(candidate));
    playTone(game.settings.sound, 'tap'); showNotice(`+${points} ${copy.points} · ${selectedTeam.name}`);
  }, [copy.chooseTeam, copy.noNewPoints, copy.points, credited, game.settings.sound, lastRevealedIndex, revealed, round.answers, selectedTeam, showNotice]);

  const addStrike = useCallback(() => {
    setStrikes((current) => { const next = Math.min(game.settings.maxStrikes, current + 1); if (next !== current) playTone(game.settings.sound, 'wrong'); return next; });
  }, [game.settings.maxStrikes, game.settings.sound]);

  const goToRound = useCallback((nextIndex) => resetRound((nextIndex + game.rounds.length) % game.rounds.length), [game.rounds.length, resetRound]);
  const toggleFullscreen = useCallback(async () => { try { if (!document.fullscreenElement) await windowRef.current?.requestFullscreen?.(); else await document.exitFullscreen?.(); } catch { /* blocked */ } }, []);

  const saveEditor = (nextGame) => {
    setGame(nextGame);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextGame)); } catch { /* optional */ }
    setSelectedTeamId(nextGame.teams[0]?.id || ''); setRoundIndex(0); setRevealed(new Set()); setCredited(new Set()); setStrikes(0);
    setSecondsLeft(nextGame.settings.secondsPerRound); setRunning(false); setEditorOpen(false); showNotice(copy.saved);
  };

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) { window.clearInterval(timer); setRunning(false); playTone(game.settings.sound, 'wrong'); return 0; }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game.settings.sound, running]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (editorOpen || ['input', 'textarea', 'select'].includes(tag)) return;
      if (event.code === 'Space') { event.preventDefault(); setRunning((current) => !current && secondsLeft > 0); }
      if (/^Digit[1-5]$/.test(event.code)) toggleAnswer(Number(event.code.slice(-1)) - 1);
      if (event.key.toLowerCase() === 'x') addStrike();
      if (event.key.toLowerCase() === 'f') toggleFullscreen();
      if (event.key === 'ArrowRight') goToRound(roundIndex + 1);
      if (event.key === 'ArrowLeft') goToRound(roundIndex - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [addStrike, editorOpen, goToRound, roundIndex, secondsLeft, toggleAnswer, toggleFullscreen]);

  useEffect(() => () => window.clearTimeout(window.__t5aNoticeTimer), []);

  const formattedTime = useMemo(() => `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`, [secondsLeft]);

  return (
    <div className="t5a-page">
      <div className="t5a-desktop-glow" aria-hidden="true" />
      <main className="t5a-window" ref={windowRef}>
        <header className="t5a-titlebar">
          <div className="t5a-window-controls" aria-hidden="true"><span className="is-close" /><span className="is-minimize" /><span className="is-maximize" /></div>
          <div className="t5a-brand"><AppMark /><div><h1>{game.title}</h1><p>{game.subtitle}</p></div></div>
          <div className="t5a-titlebar-actions">
            <div className="t5a-round-nav">
              <button type="button" onClick={() => goToRound(roundIndex - 1)} aria-label={copy.previous}><ChevronLeft /></button>
              <span><Gauge />{copy.round} {roundIndex + 1}/{game.rounds.length}</span>
              <button type="button" onClick={() => goToRound(roundIndex + 1)} aria-label={copy.next}><ChevronRight /></button>
            </div>
            <span className={`t5a-status-chip ${running ? 'is-live' : ''}`}><i />{statusLabel}</span>
            <ToolbarButton label={copy.sound} onClick={() => setGame((current) => ({ ...current, settings: { ...current.settings, sound: !current.settings.sound } }))}>{game.settings.sound ? <Volume2 /> : <VolumeX />}</ToolbarButton>
            <ToolbarButton label={copy.settings} onClick={() => setEditorOpen(true)}><Settings2 /></ToolbarButton>
            <ToolbarButton label={copy.editor} onClick={() => setEditorOpen(true)}><MoreHorizontal /></ToolbarButton>
          </div>
        </header>

        <div className="t5a-content-grid">
          <section className="t5a-board-panel">
            <div className="t5a-question-zone"><span className="t5a-question-icon"><CircleHelp /></span><h2>{round.question}</h2></div>
            <div className="t5a-answer-list">
              {round.answers.map((answer, index) => <AnswerRow key={`${round.id}-${index}`} answer={answer} index={index} revealed={revealed.has(index)} credited={credited.has(index)} onToggle={() => toggleAnswer(index)} language={language} />)}
            </div>
          </section>

          <aside className="t5a-sidebar">
            <section className="t5a-side-card t5a-timer-card">
              <div className="t5a-timer-line"><span className="t5a-timer-icon"><Clock3 /></span><strong>{formattedTime}</strong></div>
              <div className="t5a-progress-track"><span style={{ width: `${progress}%` }} /></div>
            </section>
            <section className="t5a-side-card t5a-strike-card">
              <h3>{copy.mistakes}</h3>
              <div className="t5a-strike-list">{Array.from({ length: game.settings.maxStrikes }, (_, index) => <button type="button" key={index} className={index < strikes ? 'is-used' : ''} onClick={() => setStrikes(index < strikes ? index : index + 1)} aria-label={`${copy.mistakes} ${index + 1}`}><X /></button>)}</div>
            </section>
            <section className="t5a-side-card t5a-score-card">
              <div className="t5a-card-heading"><Users /><h3>{copy.scoreboard}</h3></div>
              <div className="t5a-team-list">{game.teams.map((team) => <TeamRow key={team.id} team={team} selected={team.id === selectedTeamId} onSelect={() => setSelectedTeamId(team.id)} />)}</div>
            </section>
            <section className={`t5a-side-card t5a-explanation-card ${explanationOpen ? 'is-open' : ''}`}>
              <button type="button" className="t5a-card-heading t5a-explanation-toggle" onClick={() => setExplanationOpen((current) => !current)}><CircleHelp /><h3>{copy.explanation}</h3><ChevronDown /></button>
              <div className="t5a-explanation-copy"><p>{round.explanation}</p></div>
            </section>
          </aside>
        </div>

        <footer className="t5a-controlbar">
          <ControlButton icon={running ? Pause : Play} primary onClick={() => { if (secondsLeft === 0) setSecondsLeft(game.settings.secondsPerRound); setRunning((current) => !current); playTone(game.settings.sound, 'tap'); }}>{running ? copy.pause : copy.start}</ControlButton>
          <ControlButton icon={Eye} onClick={revealNext}>{copy.reveal}</ControlButton>
          <ControlButton icon={Star} accent onClick={addPoints}>{copy.addPoints}</ControlButton>
          <ControlButton icon={Maximize2} onClick={toggleFullscreen}>{copy.fullscreen}</ControlButton>
          <button type="button" className="t5a-reset-button" onClick={() => resetRound()} title={copy.resetRound}><RotateCcw /></button>
        </footer>
        <div className="t5a-shortcut-note">{copy.keyboard}</div>
        {notice ? <div className="t5a-toast"><Trophy />{notice}</div> : null}
      </main>
      {editorOpen ? <EditorModal game={game} language={language} onClose={() => setEditorOpen(false)} onSave={saveEditor} /> : null}
    </div>
  );
}
