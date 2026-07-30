import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, BarChart3, BookOpen, Check, CheckCircle2, Clock3, Download,
  Edit3, Expand, Heart, KeyRound, Keyboard, Lightbulb, LockKeyhole,
  MessageCircleQuestion, MonitorPlay, MoreHorizontal, Play, RotateCcw,
  Save, Settings, Sparkles, Trophy, Upload, UserRound, UsersRound,
  Volume2, VolumeX, X,
} from 'lucide-react';
import '../styles/CrosswordTrialGame.css';

const STORE = 'brian-crossword-trial-v1';
const SCORE_STORE = 'brian-crossword-trial-scores-v1';
const MAX_COLS = 16;

const SAMPLE = {
  title: 'Ô CHỮ BÀN THỬ',
  subtitle: 'Khám phá từ khóa qua các câu hỏi hàng ngang',
  keyword: 'GIAOVIEN',
  keywordColumn: 5,
  duration: 600,
  rows: [
    { clue: 'Một phần trong tên môn học tiếng Anh.', answer: 'TIENG', hint: 'Gồm 5 chữ cái.' },
    { clue: 'Một đơn vị nội dung học tập trong sách giáo khoa.', answer: 'BAI', hint: 'Thường đi với từ “học”.' },
    { clue: 'Mặt phẳng trong lớp để giáo viên viết nội dung bài học.', answer: 'BANG', hint: 'Có thể dùng phấn hoặc bút lông.' },
    { clue: 'Tài liệu được dùng để ghi chép nội dung học tập.', answer: 'VO', hint: 'Học sinh thường mang theo mỗi ngày.' },
    { clue: 'Người trực tiếp tổ chức, hướng dẫn hoạt động học tập cho học sinh là ai?', answer: 'GIAOVIEN', hint: 'Liên quan đến nghề nghiệp trong nhà trường.' },
    { clue: 'Hoạt động dùng để kiểm tra, đánh giá năng lực học sinh.', answer: 'THI', hint: 'Đáp án gồm 3 chữ cái.' },
    { clue: 'Khả năng chuyên môn được hình thành qua đào tạo và thực hành.', answer: 'NGHE', hint: 'Thường đi với từ “nghiệp”.' },
    { clue: 'Hình thức học tập trong đó nhiều học sinh cùng hợp tác.', answer: 'HOCNHOM', hint: 'Không nhập khoảng trắng.' },
  ],
};

const T = {
  vi: {
    back: 'Quay lại', student: 'Chế độ: Học sinh', teacher: 'Chế độ: Giáo viên',
    sound: 'Âm thanh', fullscreen: 'Toàn màn hình', settings: 'Cài đặt', edit: 'Soạn nội dung',
    keyword: 'Từ khóa', attempts: 'Lần đoán từ khóa', openKeyword: 'Mở từ khóa',
    question: 'CÂU HỎI', skip: 'Bỏ qua câu này', answer: 'Nhập đáp án của bạn',
    placeholder: 'Nhập đáp án tại đây…', check: 'Kiểm tra đáp án', hint: 'Gợi ý',
    progress: 'Tiến độ của bạn', solved: 'Hàng đã đúng', opened: 'Từ khóa đã mở', score: 'Điểm hiện tại',
    unopened: 'Chưa mở', correct: 'Đã đúng', keywordCol: 'Cột từ khóa', empty: 'Ô trống', selected: 'Đang chọn',
    solo: 'Chơi cá nhân', teacherControl: 'Giáo viên điều khiển', time: 'Thời gian', restart: 'Chơi lại',
    leaderboard: 'Bảng điểm', guide: 'Hướng dẫn', end: 'Kết thúc trò chơi',
    right: 'Chính xác! Bạn đã mở thêm một chữ của từ khóa.', wrong: 'Đáp án chưa chính xác. Hãy thử lại nhé!',
    enter: 'Hãy nhập đáp án trước khi kiểm tra.', noHint: 'Không còn chữ gợi ý để mở.',
    guess: 'Dự đoán từ khóa', guessBody: 'Bạn có thể đoán từ khóa trước khi giải hết các hàng.', cancel: 'Hủy', confirm: 'Xác nhận',
    won: 'Hoàn thành trò chơi!', timeUp: 'Hết thời gian!', ended: 'Trò chơi đã kết thúc.',
    editor: 'Trình soạn ô chữ', editorDesc: 'Nhập từ khóa, câu hỏi và đáp án. Brian sẽ tự căn các chữ giao.',
    title: 'Tên trò chơi', subtitle: 'Mô tả ngắn', secret: 'Từ khóa bí mật', column: 'Vị trí cột từ khóa', duration: 'Thời lượng',
    clue: 'Câu hỏi / gợi ý chính', rowAnswer: 'Đáp án', extraHint: 'Gợi ý bổ sung', save: 'Lưu bản soạn', sample: 'Dùng nội dung mẫu',
    import: 'Nhập JSON', export: 'Xuất JSON', start: 'Bắt đầu chơi', invalid: 'Đáp án phải chứa chữ giao của từ khóa.',
  },
  en: {
    back: 'Back', student: 'Mode: Student', teacher: 'Mode: Teacher', sound: 'Sound', fullscreen: 'Fullscreen', settings: 'Settings', edit: 'Edit content',
    keyword: 'Keyword', attempts: 'Keyword guesses', openKeyword: 'Guess keyword', question: 'QUESTION', skip: 'Skip this question', answer: 'Enter your answer',
    placeholder: 'Type your answer…', check: 'Check answer', hint: 'Hint', progress: 'Your progress', solved: 'Solved rows', opened: 'Keyword opened', score: 'Current score',
    unopened: 'Unopened', correct: 'Correct', keywordCol: 'Keyword column', empty: 'Empty cell', selected: 'Selected', solo: 'Individual play', teacherControl: 'Teacher control',
    time: 'Time', restart: 'Restart', leaderboard: 'Leaderboard', guide: 'Guide', end: 'End game', right: 'Correct! You revealed another keyword letter.',
    wrong: 'Not correct yet. Try again!', enter: 'Enter an answer before checking.', noHint: 'No more hint letters are available.', guess: 'Guess keyword',
    guessBody: 'You may guess the keyword before all rows are solved.', cancel: 'Cancel', confirm: 'Confirm', won: 'Game completed!', timeUp: 'Time is up!', ended: 'Game ended.',
    editor: 'Crossword composer', editorDesc: 'Enter the keyword, clues and answers. Brian aligns intersections automatically.', title: 'Game title', subtitle: 'Short description',
    secret: 'Secret keyword', column: 'Keyword column', duration: 'Duration', clue: 'Main clue', rowAnswer: 'Answer', extraHint: 'Extra hint', save: 'Save draft',
    sample: 'Load sample', import: 'Import JSON', export: 'Export JSON', start: 'Start game', invalid: 'The answer must contain its keyword letter.',
  },
};

function norm(value) {
  return String(value || '').trim().toUpperCase().replace(/Đ/g, 'D').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
}

function cleanDraft(raw) {
  const source = raw && typeof raw === 'object' ? raw : SAMPLE;
  const keyword = norm(source.keyword || SAMPLE.keyword).slice(0, 12) || SAMPLE.keyword;
  return {
    title: String(source.title || SAMPLE.title).slice(0, 80),
    subtitle: String(source.subtitle || SAMPLE.subtitle).slice(0, 140),
    keyword,
    keywordColumn: Math.min(12, Math.max(2, Number(source.keywordColumn) || 5)),
    duration: [0, 300, 600, 900, 1200].includes(Number(source.duration)) ? Number(source.duration) : 600,
    rows: Array.from({ length: keyword.length }, (_, i) => {
      const row = source.rows?.[i] || SAMPLE.rows[i] || {};
      return { clue: String(row.clue || ''), answer: norm(row.answer), hint: String(row.hint || '') };
    }),
  };
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; }
}

function build(draft) {
  const rows = draft.rows.map((row, i) => {
    const letter = draft.keyword[i];
    const answer = norm(row.answer);
    const hits = [...answer].map((char, index) => char === letter ? index : -1).filter((index) => index >= 0);
    const choices = hits.map((hit) => ({ hit, start: draft.keywordColumn - hit, end: draft.keywordColumn - hit + answer.length - 1 }))
      .filter((item) => item.start >= 1 && item.end <= MAX_COLS).sort((a, b) => a.end - b.end);
    const pick = choices[0];
    return { ...row, answer, letter, hit: pick?.hit ?? -1, start: pick?.start ?? 1, end: pick?.end ?? answer.length, valid: Boolean(pick && row.clue.trim()) };
  });
  const cols = Math.max(8, draft.keywordColumn, ...rows.map((row) => row.end));
  return { keyword: draft.keyword, rows, cols: Math.min(MAX_COLS, cols), valid: rows.length === draft.keyword.length && rows.every((row) => row.valid) };
}

function clock(seconds) {
  if (!seconds) return '00:00';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function Btn({ icon: Icon, children, tone = 'outline', className = '', ...props }) {
  return <button type="button" className={`bcg-btn is-${tone} ${className}`} {...props}>{Icon ? <Icon aria-hidden="true" /> : null}<span>{children}</span></button>;
}

function Modal({ open, title, icon: Icon, onClose, children, actions }) {
  if (!open) return null;
  return <div className="bcg-modal" onMouseDown={onClose}><section onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
    <header><div>{Icon ? <Icon aria-hidden="true" /> : null}<h2>{title}</h2></div><button type="button" onClick={onClose}><X /></button></header>
    <div className="bcg-modal-body">{children}</div>{actions ? <footer>{actions}</footer> : null}
  </section></div>;
}

export default function CrosswordTrialGame({ language = 'vi' }) {
  const lang = language === 'en' ? 'en' : 'vi';
  const tx = T[lang];
  const [draft, setDraft] = useState(() => cleanDraft(load(STORE, SAMPLE)));
  const board = useMemo(() => build(draft), [draft]);
  const [view, setView] = useState('play');
  const [mode, setMode] = useState('student');
  const [selectedRow, setSelectedRow] = useState(0);
  const [solved, setSolved] = useState(new Set());
  const [revealed, setRevealed] = useState(new Map());
  const [hints, setHints] = useState(new Set());
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(draft.duration);
  const [attempts, setAttempts] = useState(3);
  const [sound, setSound] = useState(true);
  const [ended, setEnded] = useState(false);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null);
  const [guess, setGuess] = useState('');
  const [scores, setScores] = useState(() => load(SCORE_STORE, []));
  const fileRef = useRef(null);

  const beep = (kind = 'tap') => {
    if (!sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.frequency.value = kind === 'right' ? 760 : kind === 'wrong' ? 180 : 480;
      gain.gain.value = 0.06; oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + .16); oscillator.stop(ctx.currentTime + .18);
    } catch { /* sound is optional */ }
  };

  const reset = (play = true) => {
    if (!board.valid) { setView('edit'); return; }
    setSolved(new Set()); setRevealed(new Map()); setHints(new Set()); setSelectedRow(0); setAnswer('');
    setScore(0); setAttempts(3); setTimeLeft(draft.duration); setEnded(false); setMessage(''); setModal(null);
    if (play) setView('play');
  };

  useEffect(() => {
    if (view !== 'play' || ended || draft.duration === 0) return undefined;
    const id = window.setInterval(() => setTimeLeft((value) => {
      if (value <= 1) { window.clearInterval(id); setEnded(true); setModal('result'); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [view, ended, draft.duration]);

  const row = board.rows[selectedRow] || board.rows[0];

  const solve = (index, teacher = false) => {
    if (solved.has(index) || ended) return;
    const next = new Set(solved); next.add(index); setSolved(next); setScore((value) => value + (teacher ? 0 : 100));
    setMessage(tx.right); setAnswer(''); beep('right');
    if (next.size === board.rows.length) {
      setEnded(true); setModal('result'); confetti({ particleCount: 110, spread: 75, origin: { y: .7 } });
      const item = { id: Date.now(), title: draft.title, score: score + (teacher ? 0 : 100), at: new Date().toISOString() };
      const nextScores = [item, ...scores].slice(0, 8); setScores(nextScores); localStorage.setItem(SCORE_STORE, JSON.stringify(nextScores));
    } else {
      const nextRow = board.rows.findIndex((_, i) => i > index && !next.has(i));
      setSelectedRow(nextRow >= 0 ? nextRow : board.rows.findIndex((_, i) => !next.has(i)));
    }
  };

  const checkAnswer = () => {
    if (!answer.trim()) { setMessage(tx.enter); return; }
    if (norm(answer) === row.answer) solve(selectedRow);
    else { setScore((value) => Math.max(0, value - 10)); setMessage(tx.wrong); beep('wrong'); }
  };

  const revealLetter = () => {
    const current = new Set(revealed.get(selectedRow) || []);
    const candidates = [...row.answer].map((_, i) => i).filter((i) => i !== row.hit && !current.has(i));
    if (!candidates.length) { setMessage(tx.noHint); return; }
    current.add(candidates[Math.floor(Math.random() * candidates.length)]);
    const next = new Map(revealed); next.set(selectedRow, current); setRevealed(next); setScore((value) => Math.max(0, value - 20)); beep();
  };

  const useHint = () => {
    if (!hints.has(selectedRow)) { const next = new Set(hints); next.add(selectedRow); setHints(next); setScore((v) => Math.max(0, v - 10)); }
    else revealLetter();
  };

  const submitGuess = () => {
    if (norm(guess) === board.keyword) {
      setSolved(new Set(board.rows.map((_, i) => i))); setScore((v) => v + (board.rows.length - solved.size) * 50);
      setEnded(true); setModal('result'); setGuess(''); confetti({ particleCount: 140, spread: 80, origin: { y: .7 } });
    } else {
      const left = attempts - 1; setAttempts(left); setScore((v) => Math.max(0, v - 50)); setGuess(''); beep('wrong');
      if (left <= 0) setModal(null);
    }
  };

  const saveDraft = () => { const clean = cleanDraft(draft); setDraft(clean); localStorage.setItem(STORE, JSON.stringify(clean)); };
  const exportDraft = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'brian-crossword.json'; a.click(); URL.revokeObjectURL(url);
  };
  const importDraft = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const clean = cleanDraft(JSON.parse(await file.text())); setDraft(clean); localStorage.setItem(STORE, JSON.stringify(clean)); } catch { setMessage('JSON không hợp lệ.'); }
    event.target.value = '';
  };

  if (view === 'edit') {
    return <div className="bcg-app bcg-editor-app">
      <header className="bcg-topbar">
        <button type="button" className="bcg-back" onClick={() => window.location.hash = '#/games'}><ArrowLeft />{tx.back}</button>
        <div className="bcg-brand"><span><Edit3 /></span><div><small>Brian Classroom Game</small><strong>{tx.editor}</strong></div></div>
        <div className="bcg-top-actions"><Btn icon={Upload} onClick={() => fileRef.current?.click()}>{tx.import}</Btn><Btn icon={Download} onClick={exportDraft}>{tx.export}</Btn><Btn icon={Play} tone="primary" onClick={() => { saveDraft(); reset(true); }}>{tx.start}</Btn></div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importDraft} />
      </header>
      <main className="bcg-editor-shell">
        <section className="bcg-editor-form">
          <div className="bcg-editor-intro"><span><Sparkles /></span><div><h1>{tx.editor}</h1><p>{tx.editorDesc}</p></div></div>
          <div className="bcg-fields">
            <label><span>{tx.title}</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label><span>{tx.subtitle}</span><input value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></label>
            <label><span>{tx.secret}</span><input value={draft.keyword} maxLength="12" onChange={(e) => {
              const keyword = norm(e.target.value).slice(0, 12); setDraft({ ...draft, keyword, rows: Array.from({ length: keyword.length }, (_, i) => draft.rows[i] || { clue: '', answer: '', hint: '' }) });
            }} /></label>
            <label><span>{tx.column}</span><input type="number" min="2" max="12" value={draft.keywordColumn} onChange={(e) => setDraft({ ...draft, keywordColumn: Math.min(12, Math.max(2, Number(e.target.value) || 5)) })} /></label>
            <label><span>{tx.duration}</span><select value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })}><option value="300">5 phút</option><option value="600">10 phút</option><option value="900">15 phút</option><option value="1200">20 phút</option><option value="0">Không giới hạn</option></select></label>
          </div>
          <div className="bcg-row-list">{draft.rows.map((item, i) => <article key={i} className={board.rows[i]?.valid ? 'is-valid' : 'is-invalid'}>
            <header><span>{i + 1}</span><div><strong>{tx.question} {i + 1}</strong><small>{draft.keyword[i] || '?'}</small></div>{board.rows[i]?.valid ? <CheckCircle2 /> : <Lightbulb />}</header>
            <label><span>{tx.clue}</span><textarea rows="2" value={item.clue} onChange={(e) => { const rows = [...draft.rows]; rows[i] = { ...item, clue: e.target.value }; setDraft({ ...draft, rows }); }} /></label>
            <div><label><span>{tx.rowAnswer}</span><input value={item.answer} onChange={(e) => { const rows = [...draft.rows]; rows[i] = { ...item, answer: norm(e.target.value) }; setDraft({ ...draft, rows }); }} /></label>
            <label><span>{tx.extraHint}</span><input value={item.hint} onChange={(e) => { const rows = [...draft.rows]; rows[i] = { ...item, hint: e.target.value }; setDraft({ ...draft, rows }); }} /></label></div>
            {!board.rows[i]?.valid ? <p>{tx.invalid}</p> : null}
          </article>)}</div>
          <div className="bcg-editor-footer"><Btn icon={RotateCcw} onClick={() => setDraft(cleanDraft(SAMPLE))}>{tx.sample}</Btn><Btn icon={Save} tone="primary" onClick={saveDraft}>{tx.save}</Btn></div>
        </section>
        <aside className="bcg-editor-preview"><small>LIVE PREVIEW</small><h2>{draft.title}</h2><div className="bcg-preview-keyword">{[...board.keyword].map((letter, i) => <span key={i}>{letter}</span>)}</div><Crossword board={board} selected={-1} solved={new Set(board.rows.map((_, i) => i))} revealed={new Map()} onSelect={() => {}} /></aside>
      </main>
    </div>;
  }

  return <div className="bcg-app">
    <header className="bcg-topbar">
      <button type="button" className="bcg-back" onClick={() => window.location.hash = '#/games'}><ArrowLeft />{tx.back}</button>
      <div className="bcg-brand"><span><KeyRound /></span><div><small>Brian Classroom Game</small><strong>{draft.title}</strong></div></div>
      <button type="button" className="bcg-mode" onClick={() => setMode(mode === 'teacher' ? 'student' : 'teacher')}><MonitorPlay />{mode === 'teacher' ? tx.teacher : tx.student}</button>
      <div className="bcg-top-actions">
        <Btn icon={sound ? Volume2 : VolumeX} onClick={() => setSound(!sound)}>{tx.sound}</Btn>
        <Btn icon={Expand} onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}>{tx.fullscreen}</Btn>
        <Btn icon={Settings} onClick={() => setModal('settings')}>{tx.settings}</Btn>
        <Btn icon={Edit3} onClick={() => setView('edit')}>{tx.edit}</Btn>
        <Btn icon={LockKeyhole} tone="danger" onClick={() => { if (attempts && !ended) setModal('guess'); }}>{tx.openKeyword}</Btn>
      </div>
    </header>

    <section className="bcg-keyword-band">
      <article><div className="bcg-section-label"><KeyRound />{tx.keyword}</div><div className="bcg-keyword-letters">{[...board.keyword].map((letter, i) => <span key={i} className={solved.has(i) ? 'is-open' : ''}>{solved.has(i) ? letter : '?'}</span>)}</div></article>
      <article className="bcg-attempts"><strong>{tx.attempts}</strong><div>{[0, 1, 2].map((i) => <Heart key={i} className={i < attempts ? 'is-active' : ''} fill={i < attempts ? 'currentColor' : 'none'} />)}</div><small>{attempts} / 3</small></article>
    </section>

    <main className="bcg-game-shell">
      <section className="bcg-board-wrap"><Crossword board={board} selected={selectedRow} solved={solved} revealed={revealed} onSelect={(i) => { if (!ended) { setSelectedRow(i); setAnswer(''); setMessage(''); beep(); } }} />
        <div className="bcg-legend"><span><i className="u">?</i>{tx.unopened}</span><span><i className="s"><Check /></i>{tx.correct}</span><span><i className="k" />{tx.keywordCol}</span><span><i className="e" />{tx.empty}</span><span><i className="a" />{tx.selected}</span></div>
      </section>
      <aside className="bcg-side">
        <section className="bcg-question-card">
          <header><span>{tx.question} {selectedRow + 1}/{board.rows.length}</span><button type="button" onClick={() => setSelectedRow((selectedRow + 1) % board.rows.length)}><MoreHorizontal />{tx.skip}</button></header>
          <div className="bcg-question"><span><MessageCircleQuestion /></span><h2>{row.clue}</h2></div>
          <div className="bcg-hint"><Lightbulb /><span><strong>{tx.hint}:</strong> {hints.has(selectedRow) ? (row.hint || `${row.answer.length} chữ cái`) : '••••••••'}</span></div>
          <label>{tx.answer}</label><div className="bcg-answer-input"><input value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') checkAnswer(); }} placeholder={tx.placeholder} disabled={solved.has(selectedRow) || ended} /><Keyboard /></div>
          <div className="bcg-answer-actions"><Btn icon={Check} tone="primary" onClick={checkAnswer}>{tx.check}</Btn><Btn icon={Lightbulb} tone="warning" onClick={useHint}>{tx.hint}</Btn></div>
          {mode === 'teacher' ? <div className="bcg-teacher-actions"><Btn icon={CheckCircle2} tone="success" onClick={() => solve(selectedRow, true)}>Mở hàng</Btn><Btn icon={Sparkles} onClick={revealLetter}>Mở một chữ</Btn></div> : null}
          {message ? <p className="bcg-message">{message}</p> : null}
        </section>
        <section className="bcg-progress-card"><div className="bcg-coach"><Sparkles /><p>{solved.has(selectedRow) ? `Hàng ${selectedRow + 1} đã hoàn thành.` : `Hàng ${selectedRow + 1} gồm ${row.answer.length} chữ cái và mở chữ “${row.letter}” của từ khóa.`}</p></div>
          <h3>{tx.progress}</h3><div className="bcg-progress"><div><small>{tx.solved}</small><strong>{solved.size}/{board.rows.length}</strong></div><div><small>{tx.opened}</small><strong>{solved.size}/{board.keyword.length}</strong></div><div><small>{tx.score}</small><strong>{score}</strong></div></div>
        </section>
      </aside>
    </main>

    <footer className="bcg-statusbar"><div className="bcg-player"><span>{mode === 'teacher' ? <UsersRound /> : <UserRound />}</span><strong>{mode === 'teacher' ? tx.teacherControl : tx.solo}</strong></div><div className="bcg-metric"><Trophy /><div><small>{tx.score}</small><strong>{score}</strong></div></div><div className="bcg-metric"><Clock3 /><div><small>{tx.time}</small><strong>{draft.duration === 0 ? '∞' : clock(timeLeft)}</strong></div></div><div className="bcg-footer-actions"><Btn icon={RotateCcw} onClick={() => reset(true)}>{tx.restart}</Btn><Btn icon={BarChart3} onClick={() => setModal('scores')}>{tx.leaderboard}</Btn><Btn icon={BookOpen} tone="tonal" onClick={() => setModal('guide')}>{tx.guide}</Btn><Btn icon={Trophy} tone="danger" onClick={() => { setEnded(true); setModal('result'); }}>{tx.end}</Btn></div></footer>

    <Modal open={modal === 'guess'} title={tx.guess} icon={KeyRound} onClose={() => setModal(null)} actions={<><Btn onClick={() => setModal(null)}>{tx.cancel}</Btn><Btn icon={LockKeyhole} tone="danger" onClick={submitGuess}>{tx.confirm}</Btn></>}><p>{tx.guessBody}</p><div className="bcg-guess-letters">{[...board.keyword].map((letter, i) => <span key={i}>{solved.has(i) ? letter : '?'}</span>)}</div><input className="bcg-guess-input" value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitGuess(); }} autoFocus /></Modal>
    <Modal open={modal === 'settings'} title={tx.settings} icon={Settings} onClose={() => setModal(null)} actions={<Btn icon={Save} tone="primary" onClick={() => setModal(null)}>{tx.save}</Btn>}><label className="bcg-setting"><div><strong>{tx.duration}</strong><small>{draft.duration === 0 ? '∞' : clock(draft.duration)}</small></div><select value={draft.duration} onChange={(e) => { const duration = Number(e.target.value); setDraft({ ...draft, duration }); setTimeLeft(duration); }}><option value="300">5 phút</option><option value="600">10 phút</option><option value="900">15 phút</option><option value="1200">20 phút</option><option value="0">∞</option></select></label></Modal>
    <Modal open={modal === 'guide'} title={tx.guide} icon={BookOpen} onClose={() => setModal(null)}><ol className="bcg-guide"><li>Chọn một hàng ngang để xem câu hỏi.</li><li>Nhập đáp án và kiểm tra. Hệ thống không phân biệt chữ hoa, chữ thường và dấu.</li><li>Mỗi hàng đúng mở một chữ của từ khóa.</li><li>Giáo viên có thể mở chữ hoặc mở cả hàng.</li></ol></Modal>
    <Modal open={modal === 'scores'} title={tx.leaderboard} icon={BarChart3} onClose={() => setModal(null)}>{scores.length ? <div className="bcg-scores">{scores.map((item, i) => <div key={item.id}><span>{i + 1}</span><div><strong>{item.title}</strong><small>{new Date(item.at).toLocaleString()}</small></div><b>{item.score}</b></div>)}</div> : <p>Chưa có kết quả được lưu.</p>}</Modal>
    <Modal open={modal === 'result'} title={timeLeft === 0 ? tx.timeUp : (solved.size === board.rows.length ? tx.won : tx.ended)} icon={Trophy} onClose={() => setModal(null)} actions={<Btn icon={RotateCcw} tone="primary" onClick={() => reset(true)}>{tx.restart}</Btn>}><div className="bcg-result"><span><Trophy /></span><strong>{score}</strong><p>{solved.size}/{board.rows.length} hàng đã hoàn thành</p></div></Modal>
  </div>;
}

function Crossword({ board, selected, solved, revealed, onSelect }) {
  const style = { gridTemplateColumns: `64px repeat(${board.cols}, minmax(52px, 1fr))` };
  return <div className="bcg-grid-scroll"><div className="bcg-grid" style={style}>
    <div className="bcg-cell head corner" />{Array.from({ length: board.cols }, (_, c) => <div key={`h${c}`} className={`bcg-cell head ${c + 1 === board.rows[0]?.start + board.rows[0]?.hit ? 'keyword-head' : ''}`}>{c + 1 === board.rows[0]?.start + board.rows[0]?.hit ? `${c + 1}★` : c + 1}</div>)}
    {board.rows.map((row, r) => <React.Fragment key={r}><button type="button" className={`bcg-cell row-label ${solved.has(r) ? 'solved' : ''} ${selected === r ? 'selected' : ''}`} onClick={() => onSelect(r)}><span>{r + 1}</span><b>{solved.has(r) ? <Check /> : '?'}</b></button>
      {Array.from({ length: board.cols }, (_, c) => { const column = c + 1; const index = column - row.start; const used = row.valid && index >= 0 && index < row.answer.length; if (!used) return <div key={`${r}-${c}`} className="bcg-cell blank" />; const keyword = column === row.start + row.hit; const show = solved.has(r) || (revealed.get(r) || new Set()).has(index); return <button type="button" key={`${r}-${c}`} onClick={() => onSelect(r)} className={`bcg-cell letter ${keyword ? 'keyword' : ''} ${solved.has(r) ? 'solved' : ''} ${selected === r ? 'selected' : ''}`}>{show ? row.answer[index] : '?'}</button>; })}
    </React.Fragment>)}
  </div></div>;
}
