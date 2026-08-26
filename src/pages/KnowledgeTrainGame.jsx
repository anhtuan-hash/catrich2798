import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Download, Edit3, Expand, GripVertical, Image as ImageIcon, ListRestart, MoveLeft,
  MoveRight, Play, Plus, RotateCcw, Save, Sparkles, Trash2, Upload, Volume2,
  VolumeX, WandSparkles, X,
} from 'lucide-react';
import '../styles/KnowledgeTrainGame.css';

const STORE_KEY = 'brian-knowledge-train-draft-v1';
const RESULT_KEY = 'brian-knowledge-train-results-v1';
const MAX_CARS = 14;
const MIN_CARS = 2;

const SAMPLE = {
  title: 'Đoàn Tàu Tri Thức',
  subtitle: 'Kéo toa từ kho lên đường ray sao cho nhãn trái khớp đáp án của toa trước.',
  starterQuestion: 'Thủ đô của Việt Nam là thành phố nào?',
  starterAnswer: 'Hà Nội',
  cars: [
    { id: 'car-hanoi', leftLabel: 'Hà Nội', question: 'Núi nào cao nhất Việt Nam?', nextAnswer: 'Fansipan', visualType: 'none', visual: '' },
    { id: 'car-fansipan', leftLabel: 'Fansipan', question: 'Tính diện tích hình tròn bán kính r = 5 cm?', nextAnswer: '25π cm²', visualType: 'math', visual: 'r = 5' },
    { id: 'car-circle', leftLabel: '25π cm²', question: 'Phương trình 2x + 6 = 0 có nghiệm là?', nextAnswer: 'x = −3', visualType: 'math', visual: '2x + 6 = 0' },
    { id: 'car-equation', leftLabel: 'x = −3', question: 'Đây là quốc kỳ của quốc gia nào?', nextAnswer: 'Việt Nam', visualType: 'emoji', visual: '🇻🇳' },
    { id: 'car-vietnam', leftLabel: 'Việt Nam', question: 'Đây là hình dạng hình học nào?', nextAnswer: 'Hình thang', visualType: 'emoji', visual: '⏢' },
    { id: 'car-trapezoid', leftLabel: 'Hình thang', question: '', nextAnswer: '', visualType: 'none', visual: '' },
  ],
  settings: {
    shuffle: true,
    penaltyPerCheck: 5,
    timeLimit: 0,
    showWrong: true,
    celebration: true,
  },
};

const COPY = {
  vi: {
    back: 'Quay lại', edit: 'Soạn bài', play: 'Chơi thử', save: 'Lưu bản soạn',
    import: 'Nhập JSON', export: 'Xuất JSON', reset: 'Làm lại', check: 'Kiểm tra',
    instruction: 'Kéo toa từ kho lên đường ray sao cho nhãn trái của toa khớp đáp án toa trước.',
    placed: 'Đã đặt', allPlaced: 'Đã kéo hết toa lên đường ray ✓', warehouse: 'Kho toa',
    track: 'Đường ray', score: 'Điểm', attempts: 'Lần kiểm tra', correct: 'toa đúng',
    selectHint: 'Chạm một toa rồi chạm vị trí trên ray. Có thể kéo thả bằng chuột hoặc cảm ứng.',
    incomplete: 'Hãy đưa đủ tất cả toa lên đường ray trước khi kiểm tra.',
    partial: 'Một số khớp nối chưa đúng. Hãy đổi vị trí các toa được đánh dấu.',
    won: 'Chúc mừng! Em đã hoàn thành Đoàn tàu tri thức.',
    noCars: 'Bản soạn chưa có đủ toa hợp lệ.', editor: 'Trình soạn Đoàn Tàu Tri Thức',
    editorDesc: 'Mỗi toa có nhãn đáp án ở bên trái và câu hỏi dẫn tới toa kế tiếp ở bên phải.',
    title: 'Tên trò chơi', subtitle: 'Hướng dẫn ngắn', starterQuestion: 'Câu hỏi ở đầu tàu',
    starterAnswer: 'Đáp án dẫn tới toa đầu tiên', leftLabel: 'Nhãn trái của toa',
    question: 'Câu hỏi dẫn tới toa kế tiếp', nextAnswer: 'Đáp án của câu hỏi này',
    visualType: 'Minh hoạ', visual: 'Nội dung minh hoạ', none: 'Không dùng', emoji: 'Emoji',
    image: 'URL hình ảnh', math: 'Công thức / ký hiệu', addCar: 'Thêm toa', autoLink: 'Khớp nhãn tự động',
    loadSample: 'Nạp bài mẫu', settings: 'Cài đặt', shuffle: 'Xáo trộn kho toa khi bắt đầu',
    showWrong: 'Đánh dấu toa sai sau khi kiểm tra', celebration: 'Confetti và hoạt cảnh đoàn tàu',
    penalty: 'Điểm trừ từ lần kiểm tra thứ hai', timeLimit: 'Giới hạn thời gian', unlimited: 'Không giới hạn',
    saveSuccess: 'Đã lưu bản soạn trên thiết bị.', invalidJson: 'Tệp JSON không hợp lệ.',
    chainIssue: 'Chuỗi chưa khớp. Kiểm tra các nhãn được đánh dấu màu đỏ.',
    finalCar: 'Toa cuối không cần câu hỏi tiếp theo.', remove: 'Đưa về kho',
    moveLeft: 'Sang trái', moveRight: 'Sang phải', fullscreen: 'Toàn màn hình', sound: 'Âm thanh',
    history: 'Kết quả gần đây', emptyHistory: 'Chưa có kết quả nào được lưu.',
    close: 'Đóng', seconds: 'giây', minutes: 'phút', finish: 'Hoàn thành',
  },
  en: {
    back: 'Back', edit: 'Edit lesson', play: 'Play', save: 'Save draft', import: 'Import JSON',
    export: 'Export JSON', reset: 'Restart', check: 'Check', instruction: 'Drag cars onto the track so each left label answers the previous car.',
    placed: 'Placed', allPlaced: 'All cars are on the track ✓', warehouse: 'Car warehouse', track: 'Track',
    score: 'Score', attempts: 'Checks', correct: 'cars correct', selectHint: 'Tap a car, then tap a track position. Mouse and touch drag are also supported.',
    incomplete: 'Place every car on the track before checking.', partial: 'Some couplings are incorrect. Reorder the marked cars.',
    won: 'Great work! You completed the Knowledge Train.', noCars: 'The draft does not contain enough valid cars.',
    editor: 'Knowledge Train composer', editorDesc: 'Each car has a left answer label and a question that leads to the next car.',
    title: 'Game title', subtitle: 'Short instruction', starterQuestion: 'Locomotive question', starterAnswer: 'Answer leading to the first car',
    leftLabel: 'Car left label', question: 'Question leading to the next car', nextAnswer: 'Answer to this question',
    visualType: 'Visual', visual: 'Visual content', none: 'None', emoji: 'Emoji', image: 'Image URL', math: 'Formula / symbol',
    addCar: 'Add car', autoLink: 'Auto-match labels', loadSample: 'Load sample', settings: 'Settings', shuffle: 'Shuffle warehouse on start',
    showWrong: 'Mark incorrect cars after checking', celebration: 'Confetti and train animation', penalty: 'Penalty from the second check',
    timeLimit: 'Time limit', unlimited: 'Unlimited', saveSuccess: 'Draft saved on this device.', invalidJson: 'Invalid JSON file.',
    chainIssue: 'The chain is not connected. Review the red labels.', finalCar: 'The final car needs no next question.',
    remove: 'Return to warehouse', moveLeft: 'Move left', moveRight: 'Move right', fullscreen: 'Fullscreen', sound: 'Sound',
    history: 'Recent results', emptyHistory: 'No saved results yet.', close: 'Close', seconds: 'seconds', minutes: 'minutes', finish: 'Completed',
  },
};

function uid() {
  return `car-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('vi-VN').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9π=+−\-]/g, '');
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function cleanDraft(raw) {
  const source = raw && typeof raw === 'object' ? raw : SAMPLE;
  const cars = Array.isArray(source.cars) ? source.cars.slice(0, MAX_CARS) : SAMPLE.cars;
  return {
    title: String(source.title || SAMPLE.title).slice(0, 90),
    subtitle: String(source.subtitle || SAMPLE.subtitle).slice(0, 220),
    starterQuestion: String(source.starterQuestion || '').slice(0, 320),
    starterAnswer: String(source.starterAnswer || '').slice(0, 120),
    cars: cars.map((car, index) => ({
      id: String(car?.id || uid()),
      leftLabel: String(car?.leftLabel || '').slice(0, 120),
      question: String(car?.question || '').slice(0, 320),
      nextAnswer: String(car?.nextAnswer || '').slice(0, 120),
      visualType: ['none', 'emoji', 'image', 'math'].includes(car?.visualType) ? car.visualType : 'none',
      visual: String(car?.visual || '').slice(0, 600),
      order: index,
    })),
    settings: {
      shuffle: source.settings?.shuffle !== false,
      penaltyPerCheck: Math.max(0, Math.min(25, Number(source.settings?.penaltyPerCheck) || 5)),
      timeLimit: [0, 180, 300, 600, 900].includes(Number(source.settings?.timeLimit)) ? Number(source.settings.timeLimit) : 0,
      showWrong: source.settings?.showWrong !== false,
      celebration: source.settings?.celebration !== false,
    },
  };
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; }
}

function validateDraft(draft) {
  const issues = new Set();
  let expected = draft.starterAnswer;
  draft.cars.forEach((car, index) => {
    if (!normalize(car.leftLabel) || normalize(car.leftLabel) !== normalize(expected)) issues.add(index);
    const isLast = index === draft.cars.length - 1;
    if (!isLast && (!car.question.trim() || !car.nextAnswer.trim())) issues.add(index);
    expected = car.nextAnswer;
  });
  const labels = draft.cars.map((car) => normalize(car.leftLabel)).filter(Boolean);
  labels.forEach((label, index) => { if (labels.indexOf(label) !== index) issues.add(index); });
  return issues;
}

function playSound(enabled, kind = 'tap') {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = kind === 'win' ? 'triangle' : 'sine';
    oscillator.frequency.value = kind === 'wrong' ? 180 : kind === 'win' ? 780 : 480;
    gain.gain.value = 0.045;
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === 'win' ? 0.45 : 0.14));
    oscillator.stop(ctx.currentTime + (kind === 'win' ? 0.48 : 0.16));
  } catch { /* optional audio */ }
}

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'brian-knowledge-train.json'; anchor.click();
  URL.revokeObjectURL(url);
}

function TrainMark() {
  return <svg viewBox="0 0 96 72" aria-hidden="true"><path d="M20 18h38a10 10 0 0 1 10 10v21H13V25a7 7 0 0 1 7-7Z" fill="currentColor"/><path d="M30 9h25v12H30z" fill="currentColor" opacity=".75"/><path d="M13 48h62v8H13z" fill="currentColor" opacity=".7"/><circle cx="27" cy="60" r="8" fill="currentColor"/><circle cx="60" cy="60" r="8" fill="currentColor"/><path d="M68 34h12l9 15H68z" fill="currentColor" opacity=".9"/><path d="M23 25h17v14H23zM45 25h15v14H45z" fill="#fff" opacity=".85"/></svg>;
}

function Button({ icon: Icon, children, tone = 'outline', className = '', ...props }) {
  return <button type="button" className={`ktg-btn is-${tone} ${className}`} {...props}>{Icon ? <Icon aria-hidden="true" /> : null}<span>{children}</span></button>;
}

function CarVisual({ car }) {
  if (!car.visual || car.visualType === 'none') return null;
  if (car.visualType === 'image') return <img src={car.visual} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />;
  if (car.visualType === 'math') return <code>{car.visual}</code>;
  return <span className="ktg-emoji">{car.visual}</span>;
}

function TrainCar({ car, status, selected, dragging, origin, onPointerDown, onPointerMove, onPointerUp, onClick, onReturn, onMove }) {
  return <article
    className={`ktg-car ${status ? `is-${status}` : ''} ${selected ? 'is-selected' : ''} ${dragging ? 'is-dragging' : ''}`}
    tabIndex="0"
    role="button"
    aria-label={`${car.leftLabel}. ${car.question || ''}`}
    data-car-id={car.id}
    onPointerDown={(event) => onPointerDown(event, car.id, origin)}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onClick={() => onClick(car.id, origin)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(car.id, origin); }
      if (origin === 'track' && event.key === 'Delete') onReturn(car.id);
      if (origin === 'track' && event.key === 'ArrowLeft') onMove(car.id, -1);
      if (origin === 'track' && event.key === 'ArrowRight') onMove(car.id, 1);
    }}
  >
    <div className="ktg-car-grip"><GripVertical /></div>
    <div className="ktg-car-label">{car.leftLabel || '—'}</div>
    <div className="ktg-car-question">
      {car.question ? <p>{car.question}</p> : <p className="ktg-final-label">FINISH</p>}
      <CarVisual car={car} />
    </div>
    <span className="ktg-coupler left" /><span className="ktg-coupler right" />
    <span className="ktg-wheel one" /><span className="ktg-wheel two" />
    {status === 'correct' ? <span className="ktg-status"><Check /></span> : null}
    {origin === 'track' ? <button type="button" className="ktg-return" title="Return" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onReturn(car.id); }}><X /></button> : null}
  </article>;
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return <div className="ktg-modal" onMouseDown={onClose}><section role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><h2>{title}</h2><button type="button" onClick={onClose}><X /></button></header><div>{children}</div></section></div>;
}

export default function KnowledgeTrainGame({ language = 'vi' }) {
  const lang = language === 'en' ? 'en' : 'vi';
  const tx = COPY[lang];
  const [draft, setDraft] = useState(() => cleanDraft(load(STORE_KEY, SAMPLE)));
  const [view, setView] = useState('play');
  const [trackIds, setTrackIds] = useState([]);
  const [warehouseIds, setWarehouseIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState(false);
  const [sound, setSound] = useState(true);
  const [timeLeft, setTimeLeft] = useState(draft.settings.timeLimit);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [results, setResults] = useState(() => load(RESULT_KEY, []));
  const [editorMessage, setEditorMessage] = useState('');
  const [issueCars, setIssueCars] = useState(new Set());
  const fileRef = useRef(null);
  const trackScrollRef = useRef(null);
  const warehouseScrollRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const carMap = useMemo(() => new Map(draft.cars.map((car) => [car.id, car])), [draft.cars]);
  const correctIds = useMemo(() => draft.cars.map((car) => car.id), [draft.cars]);

  const initialize = (nextDraft = draft) => {
    const ids = nextDraft.cars.map((car) => car.id);
    setTrackIds([]);
    setWarehouseIds(nextDraft.settings.shuffle ? shuffle(ids) : ids);
    setSelectedId(null); setDraggingId(null); setDropIndex(null); setStatuses({});
    setAttempts(0); setScore(0); setMessage(''); setCompleted(false);
    setTimeLeft(nextDraft.settings.timeLimit);
  };

  useEffect(() => { initialize(draft); }, []);

  useEffect(() => {
    if (view !== 'play' || completed || draft.settings.timeLimit === 0 || trackIds.length === 0) return undefined;
    const timer = window.setInterval(() => setTimeLeft((value) => {
      if (value <= 1) { window.clearInterval(timer); setMessage(lang === 'vi' ? 'Đã hết thời gian.' : 'Time is up.'); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [view, completed, draft.settings.timeLimit, trackIds.length, lang]);

  const placeAt = (id, requestedIndex) => {
    const index = Math.max(0, Math.min(requestedIndex, draft.cars.length - 1));
    setTrackIds((current) => {
      const without = current.filter((item) => item !== id);
      const next = [...without];
      next.splice(Math.min(index, next.length), 0, id);
      return next;
    });
    setWarehouseIds((current) => current.filter((item) => item !== id));
    setStatuses({}); setMessage(''); setCompleted(false); setSelectedId(id); playSound(sound);
  };

  const returnToWarehouse = (id) => {
    setTrackIds((current) => current.filter((item) => item !== id));
    setWarehouseIds((current) => current.includes(id) ? current : [...current, id]);
    setStatuses({}); setMessage(''); setCompleted(false); if (selectedId === id) setSelectedId(null); playSound(sound);
  };

  const moveOnTrack = (id, delta) => {
    setTrackIds((current) => {
      const from = current.indexOf(id); if (from < 0) return current;
      const to = Math.max(0, Math.min(current.length - 1, from + delta));
      const next = [...current]; next.splice(from, 1); next.splice(to, 0, id); return next;
    });
    setStatuses({}); setMessage(''); setCompleted(false); playSound(sound);
  };

  const cardClick = (id, origin) => {
    if (suppressClickRef.current) return;
    if (origin === 'warehouse') {
      if (selectedId === id) placeAt(id, trackIds.length);
      else { setSelectedId(id); playSound(sound); }
    } else setSelectedId(id);
  };

  const slotClick = (index) => {
    if (!selectedId) return;
    placeAt(selectedId, index);
  };

  const pointerDown = (event, id, origin) => {
    if (event.button !== undefined && event.button !== 0) return;
    dragRef.current = { id, origin, x: event.clientX, y: event.clientY, moved: false };
    setSelectedId(id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const pointerMove = (event) => {
    const active = dragRef.current; if (!active) return;
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) < 7 && !active.moved) return;
    active.moved = true; setDraggingId(active.id);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const slot = target?.closest?.('[data-track-slot]');
    setDropIndex(slot ? Number(slot.dataset.trackSlot) : null);
  };

  const pointerUp = (event) => {
    const active = dragRef.current; dragRef.current = null;
    if (!active) return;
    if (active.moved) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const slot = target?.closest?.('[data-track-slot]');
      const warehouse = target?.closest?.('[data-warehouse-drop]');
      if (slot) placeAt(active.id, Number(slot.dataset.trackSlot));
      else if (warehouse) returnToWarehouse(active.id);
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    setDraggingId(null); setDropIndex(null);
  };

  const checkTrain = () => {
    if (trackIds.length !== draft.cars.length) { setMessage(tx.incomplete); playSound(sound, 'wrong'); return; }
    const nextStatuses = {};
    let expected = draft.starterAnswer;
    let correct = 0;
    trackIds.forEach((id, index) => {
      const car = carMap.get(id);
      const linked = normalize(car?.leftLabel) === normalize(expected) && id === correctIds[index];
      nextStatuses[id] = linked ? 'correct' : 'wrong';
      if (linked) correct += 1;
      expected = car?.nextAnswer || '';
    });
    const nextAttempts = attempts + 1;
    const penalty = Math.max(0, nextAttempts - 1) * draft.settings.penaltyPerCheck;
    const nextScore = Math.max(0, Math.round((correct / draft.cars.length) * 100) - penalty);
    setAttempts(nextAttempts); setScore(nextScore);
    setStatuses(draft.settings.showWrong ? nextStatuses : {});
    if (correct === draft.cars.length) {
      setCompleted(true); setMessage(tx.won); playSound(sound, 'win');
      if (draft.settings.celebration) confetti({ particleCount: 150, spread: 85, origin: { y: 0.62 } });
      const result = { id: Date.now(), title: draft.title, score: nextScore, attempts: nextAttempts, at: new Date().toISOString() };
      const nextResults = [result, ...results].slice(0, 10); setResults(nextResults); localStorage.setItem(RESULT_KEY, JSON.stringify(nextResults));
    } else { setMessage(tx.partial); playSound(sound, 'wrong'); }
  };

  const saveDraft = () => {
    const clean = cleanDraft(draft);
    if (clean.cars.length < MIN_CARS) { setEditorMessage(tx.noCars); return false; }
    const issues = validateDraft(clean);
    setIssueCars(issues);
    if (issues.size) { setEditorMessage(tx.chainIssue); return false; }
    setDraft(clean); localStorage.setItem(STORE_KEY, JSON.stringify(clean));
    setEditorMessage(tx.saveSuccess); return true;
  };

  const startPlay = () => {
    if (!saveDraft()) return;
    const clean = cleanDraft(draft); setDraft(clean); initialize(clean); setView('play');
  };

  const updateCar = (index, patch) => {
    const cars = draft.cars.map((car, carIndex) => carIndex === index ? { ...car, ...patch } : car);
    setDraft({ ...draft, cars }); setIssueCars(new Set()); setEditorMessage('');
  };

  const addCar = () => {
    if (draft.cars.length >= MAX_CARS) return;
    const previous = draft.cars[draft.cars.length - 1];
    const cars = [...draft.cars, { id: uid(), leftLabel: previous?.nextAnswer || '', question: '', nextAnswer: '', visualType: 'none', visual: '' }];
    setDraft({ ...draft, cars });
  };

  const removeCar = (index) => {
    if (draft.cars.length <= MIN_CARS) return;
    setDraft({ ...draft, cars: draft.cars.filter((_, carIndex) => carIndex !== index) });
  };

  const moveEditorCar = (index, delta) => {
    const target = index + delta; if (target < 0 || target >= draft.cars.length) return;
    const cars = [...draft.cars]; [cars[index], cars[target]] = [cars[target], cars[index]]; setDraft({ ...draft, cars });
  };

  const autoLink = () => {
    const cars = draft.cars.map((car, index, all) => ({ ...car, leftLabel: index === 0 ? draft.starterAnswer : all[index - 1].nextAnswer }));
    setDraft({ ...draft, cars }); setIssueCars(new Set()); setEditorMessage('');
  };

  const importDraft = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const clean = cleanDraft(JSON.parse(await file.text())); setDraft(clean); setIssueCars(new Set()); setEditorMessage(''); }
    catch { setEditorMessage(tx.invalidJson); }
    event.target.value = '';
  };

  const scroll = (ref, amount) => ref.current?.scrollBy({ left: amount, behavior: 'auto' });
  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  if (view === 'edit') {
    return <div className="ktg-app ktg-editor-app">
      <header className="ktg-topbar">
        <button type="button" className="ktg-back" onClick={() => window.location.hash = '#/games'}><ArrowLeft />{tx.back}</button>
        <div className="ktg-brand"><span><TrainMark /></span><div><small>Brian Classroom Game</small><strong>{tx.editor}</strong></div></div>
        <div className="ktg-top-actions"><Button icon={Upload} onClick={() => fileRef.current?.click()}>{tx.import}</Button><Button icon={Download} onClick={() => downloadJson(draft)}>{tx.export}</Button><Button icon={Play} tone="primary" onClick={startPlay}>{tx.play}</Button></div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importDraft} />
      </header>
      <main className="ktg-editor-shell">
        <section className="ktg-editor-main">
          <div className="ktg-editor-intro"><span><WandSparkles /></span><div><h1>{tx.editor}</h1><p>{tx.editorDesc}</p></div></div>
          <div className="ktg-editor-fields">
            <label><span>{tx.title}</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label><span>{tx.subtitle}</span><textarea rows="2" value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
            <label><span>{tx.starterQuestion}</span><textarea rows="2" value={draft.starterQuestion} onChange={(event) => setDraft({ ...draft, starterQuestion: event.target.value })} /></label>
            <label><span>{tx.starterAnswer}</span><input value={draft.starterAnswer} onChange={(event) => setDraft({ ...draft, starterAnswer: event.target.value })} /></label>
          </div>
          <div className="ktg-editor-toolbar"><Button icon={WandSparkles} onClick={autoLink}>{tx.autoLink}</Button><Button icon={Plus} tone="tonal" onClick={addCar} disabled={draft.cars.length >= MAX_CARS}>{tx.addCar}</Button></div>
          <div className="ktg-editor-cars">{draft.cars.map((car, index) => {
            const isLast = index === draft.cars.length - 1;
            return <article key={car.id} className={issueCars.has(index) ? 'has-issue' : ''}>
              <header><span>{index + 1}</span><div><strong>{lang === 'vi' ? `Toa ${index + 1}` : `Car ${index + 1}`}</strong><small>{isLast ? tx.finalCar : car.leftLabel || '—'}</small></div><div><button type="button" onClick={() => moveEditorCar(index, -1)} disabled={index === 0}><ArrowUp /></button><button type="button" onClick={() => moveEditorCar(index, 1)} disabled={isLast}><ArrowDown /></button><button type="button" onClick={() => removeCar(index)} disabled={draft.cars.length <= MIN_CARS}><Trash2 /></button></div></header>
              <div className="ktg-car-form">
                <label><span>{tx.leftLabel}</span><input value={car.leftLabel} onChange={(event) => updateCar(index, { leftLabel: event.target.value })} /></label>
                <label className="wide"><span>{tx.question}</span><textarea rows="2" value={car.question} disabled={isLast} onChange={(event) => updateCar(index, { question: event.target.value })} /></label>
                <label><span>{tx.nextAnswer}</span><input value={car.nextAnswer} disabled={isLast} onChange={(event) => updateCar(index, { nextAnswer: event.target.value })} /></label>
                <label><span>{tx.visualType}</span><select value={car.visualType} onChange={(event) => updateCar(index, { visualType: event.target.value })}><option value="none">{tx.none}</option><option value="emoji">{tx.emoji}</option><option value="image">{tx.image}</option><option value="math">{tx.math}</option></select></label>
                <label className="wide"><span>{tx.visual}</span><input value={car.visual} disabled={car.visualType === 'none'} onChange={(event) => updateCar(index, { visual: event.target.value })} /></label>
              </div>
            </article>;
          })}</div>
          <section className="ktg-settings"><h2>{tx.settings}</h2><label><input type="checkbox" checked={draft.settings.shuffle} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, shuffle: event.target.checked } })} /><span>{tx.shuffle}</span></label><label><input type="checkbox" checked={draft.settings.showWrong} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, showWrong: event.target.checked } })} /><span>{tx.showWrong}</span></label><label><input type="checkbox" checked={draft.settings.celebration} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, celebration: event.target.checked } })} /><span>{tx.celebration}</span></label><label><span>{tx.penalty}</span><input type="number" min="0" max="25" value={draft.settings.penaltyPerCheck} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, penaltyPerCheck: Number(event.target.value) } })} /></label><label><span>{tx.timeLimit}</span><select value={draft.settings.timeLimit} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, timeLimit: Number(event.target.value) } })}><option value="0">{tx.unlimited}</option><option value="180">3 {tx.minutes}</option><option value="300">5 {tx.minutes}</option><option value="600">10 {tx.minutes}</option><option value="900">15 {tx.minutes}</option></select></label></section>
          {editorMessage ? <p className={`ktg-editor-message ${issueCars.size ? 'is-error' : ''}`}>{editorMessage}</p> : null}
          <footer className="ktg-editor-footer"><Button icon={RotateCcw} onClick={() => { const sample = cleanDraft(SAMPLE); setDraft(sample); setIssueCars(new Set()); setEditorMessage(''); }}>{tx.loadSample}</Button><Button icon={Save} tone="primary" onClick={saveDraft}>{tx.save}</Button></footer>
        </section>
        <aside className="ktg-editor-preview"><small>LIVE PREVIEW</small><h2>{draft.title}</h2><div className="ktg-mini-engine"><TrainMark /></div><div className="ktg-mini-chain">{draft.cars.slice(0, 5).map((car, index) => <span key={car.id} className={issueCars.has(index) ? 'bad' : ''}>{car.leftLabel || '?'}</span>)}</div><p>{draft.starterQuestion}</p></aside>
      </main>
    </div>;
  }

  const allPlaced = trackIds.length === draft.cars.length;
  return <div className={`ktg-app ${completed ? 'is-completed' : ''}`}>
    <header className="ktg-topbar">
      <button type="button" className="ktg-back" onClick={() => window.location.hash = '#/games'}><ArrowLeft />{tx.back}</button>
      <div className="ktg-title"><strong>{draft.title}</strong><span>{draft.subtitle}</span></div>
      <div className="ktg-score-pill"><small>{tx.score}</small><b>{score}</b></div>
      <div className="ktg-top-actions"><Button icon={sound ? Volume2 : VolumeX} onClick={() => setSound(!sound)}>{tx.sound}</Button><Button icon={Expand} onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}>{tx.fullscreen}</Button><Button icon={Edit3} onClick={() => setView('edit')}>{tx.edit}</Button></div>
    </header>

    <section className="ktg-instruction"><Sparkles /><span>{tx.instruction}</span>{draft.settings.timeLimit ? <b>{formatTime(timeLeft)}</b> : null}</section>

    <main className="ktg-playfield">
      <section className="ktg-track-zone">
        <div className="ktg-sky"><span className="cloud one"/><span className="cloud two"/><span className="hill one"/><span className="hill two"/></div>
        <button type="button" className="ktg-scroll left" onClick={() => scroll(trackScrollRef, -520)}><ChevronLeft /></button>
        <div className="ktg-track-scroll" ref={trackScrollRef}>
          <div className="ktg-track-line">
            <article className="ktg-engine"><div className="ktg-engine-art"><TrainMark /></div><div className="ktg-engine-question">{draft.starterQuestion}</div></article>
            {Array.from({ length: draft.cars.length }, (_, index) => {
              const id = trackIds[index]; const car = carMap.get(id);
              return <div key={`slot-${index}`} data-track-slot={index} className={`ktg-track-slot ${dropIndex === index ? 'is-drop' : ''}`} onClick={() => slotClick(index)}><span className="ktg-slot-number">{index + 1}</span>{car ? <TrainCar car={car} status={statuses[id]} selected={selectedId === id} dragging={draggingId === id} origin="track" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onClick={cardClick} onReturn={returnToWarehouse} onMove={moveOnTrack} /> : <span className="ktg-empty-slot">+</span>}</div>;
            })}
          </div>
        </div>
        <button type="button" className="ktg-scroll right" onClick={() => scroll(trackScrollRef, 520)}><ChevronRight /></button>
        <div className="ktg-rail"><i/><i/><i/></div>
      </section>

      <section className="ktg-warehouse-zone" data-warehouse-drop>
        <header><div><strong>{tx.warehouse}</strong><span>{tx.selectHint}</span></div><b>{tx.placed} {trackIds.length}/{draft.cars.length}</b></header>
        <button type="button" className="ktg-warehouse-arrow left" onClick={() => scroll(warehouseScrollRef, -480)}><ChevronLeft /></button>
        <div className="ktg-warehouse-scroll" ref={warehouseScrollRef}><div>{warehouseIds.map((id) => { const car = carMap.get(id); return <TrainCar key={id} car={car} status={null} selected={selectedId === id} dragging={draggingId === id} origin="warehouse" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onClick={cardClick} onReturn={returnToWarehouse} onMove={moveOnTrack} />; })}{warehouseIds.length === 0 ? <p className="ktg-empty-warehouse">{tx.allPlaced}</p> : null}</div></div>
        <button type="button" className="ktg-warehouse-arrow right" onClick={() => scroll(warehouseScrollRef, 480)}><ChevronRight /></button>
      </section>
    </main>

    <footer className="ktg-actions"><div className="ktg-progress"><span>{allPlaced ? tx.allPlaced : `${tx.placed} ${trackIds.length}/${draft.cars.length}`}</span><b>{Object.values(statuses).filter((status) => status === 'correct').length}/{draft.cars.length} {tx.correct}</b></div><Button icon={ListRestart} onClick={() => initialize(draft)}>{tx.reset}</Button><Button icon={CheckCircle2} tone="primary" onClick={checkTrain}>{tx.check}</Button><button type="button" className="ktg-history-link" onClick={() => setHistoryOpen(true)}>{tx.history}</button></footer>
    {message ? <div className={`ktg-toast ${completed ? 'is-success' : ''}`}>{message}<small>{tx.score}: {score}/100 · {tx.attempts}: {attempts}</small></div> : null}

    {completed && draft.settings.celebration ? <div className="ktg-celebration" aria-hidden="true"><div className="ktg-running-train"><TrainMark/><span/><span/><span/></div></div> : null}

    <Modal open={historyOpen} title={tx.history} onClose={() => setHistoryOpen(false)}>{results.length ? <div className="ktg-results">{results.map((item, index) => <article key={item.id}><span>{index + 1}</span><div><strong>{item.title}</strong><small>{new Date(item.at).toLocaleString()}</small></div><b>{item.score}</b></article>)}</div> : <p>{tx.emptyHistory}</p>}</Modal>
  </div>;
}
