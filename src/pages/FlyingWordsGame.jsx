import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Expand,
  FileText,
  Gauge,
  Home,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  TimerReset,
  Trash2,
  Trophy,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import '../styles/FlyingWordsGame.css';

const STORAGE_KEY = 'brian-flying-words-draft-v1';
const RESULT_KEY = 'brian-flying-words-last-result-v1';

const DEFAULT_SENTENCES = [
  'Hà Nội là thủ đô của Việt Nam.',
  'Students should protect the environment.',
  'My brother has lived here for five years.',
  'Learning English opens many opportunities.',
  'We are preparing for the final examination.',
].join('\n');

const DEFAULT_DRAFT = {
  title: 'Từ Ngữ Biết Bay',
  subtitle: 'Bắn chạm để sắp xếp câu',
  sentences: DEFAULT_SENTENCES,
  seconds: 30,
  speed: 1,
  wrongPenalty: 3,
  autoAdvance: false,
  sound: true,
};

const TOKEN_COLORS = [
  ['#ff9d38', '#e78316'],
  ['#55c9e5', '#1697bd'],
  ['#6aa9ff', '#3278da'],
  ['#ef6d78', '#ce4454'],
  ['#31ce9b', '#159c73'],
  ['#f4c552', '#d99c17'],
  ['#e85b9d', '#bf3576'],
  ['#7b55df', '#5631b7'],
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function tokenizeSentence(sentence) {
  const raw = String(sentence || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];

  const tokens = [];
  const pattern = /\[([^\]]+)\]|(\S+)/g;
  let match;
  while ((match = pattern.exec(raw))) {
    const text = String(match[1] || match[2] || '').trim();
    if (text) tokens.push(text);
  }
  return tokens;
}

function parseQuestions(raw) {
  return String(raw || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((sentence, index) => {
      const words = tokenizeSentence(sentence);
      return {
        id: `question-${index + 1}`,
        sentence,
        words,
        valid: words.length >= 2,
      };
    });
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  if (copy.length > 2 && copy.every((item, index) => item.order === index)) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}

function createRoundTokens(question, speed) {
  const velocity = 0.035 + Number(speed || 1) * 0.025;
  return shuffle(question.words.map((text, order) => {
    const palette = TOKEN_COLORS[order % TOKEN_COLORS.length];
    const directionX = Math.random() > 0.5 ? 1 : -1;
    const directionY = Math.random() > 0.5 ? 1 : -1;
    return {
      id: `${question.id}-token-${order}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      order,
      x: 7 + Math.random() * 77,
      y: 10 + Math.random() * 67,
      vx: directionX * (velocity + Math.random() * velocity),
      vy: directionY * (velocity * 0.65 + Math.random() * velocity * 0.7),
      rotation: -4 + Math.random() * 8,
      primary: palette[0],
      secondary: palette[1],
    };
  }));
}

function sanitizeDraft(value) {
  const next = value && typeof value === 'object' ? value : {};
  return {
    title: String(next.title || DEFAULT_DRAFT.title).slice(0, 80),
    subtitle: String(next.subtitle || DEFAULT_DRAFT.subtitle).slice(0, 120),
    sentences: String(next.sentences || DEFAULT_DRAFT.sentences),
    seconds: clamp(Number(next.seconds) || DEFAULT_DRAFT.seconds, 10, 120),
    speed: clamp(Number(next.speed) || DEFAULT_DRAFT.speed, 0.5, 2),
    wrongPenalty: clamp(Number(next.wrongPenalty) || DEFAULT_DRAFT.wrongPenalty, 0, 10),
    autoAdvance: Boolean(next.autoAdvance),
    sound: next.sound !== false,
  };
}

function loadDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return sanitizeDraft(parsed || DEFAULT_DRAFT);
  } catch {
    return DEFAULT_DRAFT;
  }
}

function downloadText(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function useGeneratedSound(enabled) {
  const audioContextRef = useRef(null);

  return useCallback((kind = 'tap') => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      const settings = {
        tap: [520, 0.06, 'sine'],
        undo: [310, 0.07, 'triangle'],
        wrong: [180, 0.18, 'sawtooth'],
        correct: [760, 0.15, 'sine'],
        timeout: [120, 0.25, 'square'],
      };
      const [frequency, duration, type] = settings[kind] || settings.tap;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (kind === 'correct') oscillator.frequency.exponentialRampToValueAtTime(1040, now + duration);
      if (kind === 'wrong') oscillator.frequency.exponentialRampToValueAtTime(110, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {
      // Sound is optional; the game continues silently when the browser blocks audio.
    }
  }, [enabled]);
}

function ReadyOverlay({ draft, questionCount, onStart, onFullscreen, onBack }) {
  return (
    <div className="fwg-overlay fwg-ready-overlay" role="dialog" aria-modal="true" aria-labelledby="fwg-ready-title">
      <div className="fwg-ready-card">
        <div className="fwg-ready-logo" aria-hidden="true">〰</div>
        <span className="fwg-ready-kicker">{questionCount} câu · {draft.seconds} giây/câu</span>
        <h2 id="fwg-ready-title">Sẵn sàng chơi?</h2>
        <p className="fwg-ready-subtitle">{draft.title} – {draft.subtitle}</p>

        <div className="fwg-ready-guide">
          <div>
            <CheckCircle2 aria-hidden="true" />
            <span>
              <strong>Sắp xếp câu</strong>
              <small>Bắt các từ theo đúng thứ tự để tạo thành câu hoàn chỉnh.</small>
            </span>
          </div>
          <div>
            <MousePointer2 aria-hidden="true" />
            <span>
              <strong>Dùng chuột hoặc chạm</strong>
              <small>Nhấn vào thẻ từ đang bay; dùng Backspace để hoàn tác.</small>
            </span>
          </div>
        </div>

        <div className="fwg-ready-actions">
          <button type="button" className="fwg-button fwg-button-secondary" onClick={onFullscreen}>
            <Expand aria-hidden="true" /> Toàn màn hình
          </button>
          <button type="button" className="fwg-button fwg-button-primary" onClick={onStart}>
            <Play aria-hidden="true" fill="currentColor" /> Bắt đầu
          </button>
        </div>
        <button type="button" className="fwg-ready-back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Quay lại soạn nội dung
        </button>
      </div>
    </div>
  );
}

function FeedbackOverlay({
  type,
  sentence,
  score,
  timeLeft,
  isLast,
  onNext,
  onRetry,
}) {
  const correct = type === 'correct';
  return (
    <div className={`fwg-overlay fwg-feedback-overlay is-${type}`} role="dialog" aria-modal="true">
      <div className="fwg-feedback-card">
        <div className="fwg-feedback-icon" aria-hidden="true">
          {correct ? <CheckCircle2 /> : <Clock3 />}
        </div>
        <span className="fwg-feedback-kicker">{correct ? `+${score} điểm` : 'Hết thời gian'}</span>
        <h2>{correct ? 'Chính xác!' : 'Đáp án đúng'}</h2>
        <p className="fwg-correct-sentence">{sentence}</p>
        {correct ? <small>Còn {timeLeft} giây · Câu đã được sắp xếp hoàn chỉnh.</small> : <small>Quan sát đáp án rồi tiếp tục hoặc chơi lại câu này.</small>}
        <div className="fwg-feedback-actions">
          {!correct ? (
            <button type="button" className="fwg-button fwg-button-secondary" onClick={onRetry}>
              <RotateCcw aria-hidden="true" /> Chơi lại câu
            </button>
          ) : null}
          <button type="button" className="fwg-button fwg-button-primary" onClick={onNext}>
            {isLast ? <Trophy aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
            {isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupScreen({
  draft,
  setDraft,
  questions,
  validQuestions,
  onStart,
  onReset,
  onImport,
  onExport,
  onLoadSample,
}) {
  const invalidCount = questions.length - validQuestions.length;
  const totalTokens = validQuestions.reduce((sum, item) => sum + item.words.length, 0);

  return (
    <div className="fwg-setup">
      <header className="fwg-app-header">
        <button type="button" className="fwg-icon-button" onClick={() => { window.location.hash = '#/games'; }} aria-label="Quay lại Trò chơi">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="fwg-app-brand">
          <div className="fwg-brand-mark">FW</div>
          <div>
            <span>Brian Classroom Game</span>
            <strong>Từ Ngữ Biết Bay</strong>
          </div>
        </div>
        <div className="fwg-header-actions">
          <button type="button" className="fwg-header-button" onClick={onImport}>
            <Upload aria-hidden="true" /> Nhập
          </button>
          <button type="button" className="fwg-header-button" onClick={onExport}>
            <Download aria-hidden="true" /> Xuất
          </button>
          <button type="button" className="fwg-header-button is-danger" onClick={onReset}>
            <Trash2 aria-hidden="true" /> Làm mới
          </button>
        </div>
      </header>

      <section className="fwg-setup-hero">
        <div className="fwg-hero-copy">
          <span className="fwg-eyebrow"><Sparkles aria-hidden="true" /> Trò chơi sắp xếp câu tương tác</span>
          <h1>Soạn câu một lần.<br /><em>Cho từ bay ngay.</em></h1>
          <p>Giáo viên nhập mỗi câu trên một dòng, Brian tự tách từ, tạo thẻ chuyển động và chấm điểm theo thời gian.</p>
          <div className="fwg-hero-stats">
            <div><strong>{validQuestions.length}</strong><span>Câu hợp lệ</span></div>
            <div><strong>{totalTokens}</strong><span>Thẻ từ</span></div>
            <div><strong>{draft.seconds}s</strong><span>Mỗi câu</span></div>
          </div>
        </div>
        <div className="fwg-hero-visual" aria-hidden="true">
          <div className="fwg-mini-board">
            <span className="is-orange">Learning</span>
            <span className="is-blue">English</span>
            <span className="is-green">opens</span>
            <span className="is-pink">opportunities.</span>
          </div>
          <div className="fwg-hero-orbit orbit-one" />
          <div className="fwg-hero-orbit orbit-two" />
        </div>
      </section>

      <div className="fwg-builder-grid">
        <section className="fwg-builder-card fwg-content-card">
          <div className="fwg-section-heading">
            <span className="fwg-step">1</span>
            <div>
              <span>Nội dung trò chơi</span>
              <h2>Nhập câu cần sắp xếp</h2>
            </div>
          </div>

          <div className="fwg-field-row">
            <label className="fwg-field">
              <span>Tên trò chơi</span>
              <input
                value={draft.title}
                maxLength={80}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ví dụ: Từ Ngữ Biết Bay"
              />
            </label>
            <label className="fwg-field">
              <span>Phụ đề</span>
              <input
                value={draft.subtitle}
                maxLength={120}
                onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Ví dụ: Bắn chạm để sắp xếp câu"
              />
            </label>
          </div>

          <label className="fwg-field">
            <span>Danh sách câu <b>Mỗi dòng là một câu hỏi</b></span>
            <textarea
              value={draft.sentences}
              onChange={(event) => setDraft((current) => ({ ...current, sentences: event.target.value }))}
              rows={12}
              spellCheck="false"
              placeholder="Hà Nội là thủ đô của Việt Nam.&#10;Students should protect the environment."
            />
          </label>

          <div className="fwg-authoring-tip">
            <FileText aria-hidden="true" />
            <p>
              <strong>Giữ một cụm từ trên cùng một thẻ:</strong> đặt cụm đó trong ngoặc vuông, ví dụ
              <code>[New York] is a large city.</code>
            </p>
          </div>

          <div className="fwg-inline-actions">
            <button type="button" className="fwg-link-button" onClick={onLoadSample}>
              <Sparkles aria-hidden="true" /> Nạp bộ câu mẫu
            </button>
            <span>{invalidCount ? `${invalidCount} dòng bị bỏ qua vì có dưới 2 từ.` : 'Tất cả câu đều sẵn sàng.'}</span>
          </div>
        </section>

        <aside className="fwg-builder-card fwg-settings-card">
          <div className="fwg-section-heading">
            <span className="fwg-step">2</span>
            <div>
              <span>Thiết lập vòng chơi</span>
              <h2>Điều chỉnh trải nghiệm</h2>
            </div>
          </div>

          <label className="fwg-range-field">
            <span><Clock3 aria-hidden="true" /> Thời gian mỗi câu <strong>{draft.seconds} giây</strong></span>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={draft.seconds}
              onChange={(event) => setDraft((current) => ({ ...current, seconds: Number(event.target.value) }))}
            />
            <small>10 giây</small><small>120 giây</small>
          </label>

          <label className="fwg-range-field">
            <span><Gauge aria-hidden="true" /> Tốc độ thẻ bay <strong>{Number(draft.speed).toFixed(1)}×</strong></span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={draft.speed}
              onChange={(event) => setDraft((current) => ({ ...current, speed: Number(event.target.value) }))}
            />
            <small>Chậm</small><small>Nhanh</small>
          </label>

          <label className="fwg-range-field">
            <span><TimerReset aria-hidden="true" /> Trừ thời gian khi sai <strong>{draft.wrongPenalty} giây</strong></span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={draft.wrongPenalty}
              onChange={(event) => setDraft((current) => ({ ...current, wrongPenalty: Number(event.target.value) }))}
            />
            <small>Không trừ</small><small>10 giây</small>
          </label>

          <div className="fwg-toggle-list">
            <label>
              <span>
                <strong>Âm thanh phản hồi</strong>
                <small>Âm “pop”, đúng, sai và hết giờ.</small>
              </span>
              <input
                type="checkbox"
                checked={draft.sound}
                onChange={(event) => setDraft((current) => ({ ...current, sound: event.target.checked }))}
              />
              <i />
            </label>
            <label>
              <span>
                <strong>Tự chuyển câu</strong>
                <small>Sang câu kế tiếp sau khi trả lời đúng.</small>
              </span>
              <input
                type="checkbox"
                checked={draft.autoAdvance}
                onChange={(event) => setDraft((current) => ({ ...current, autoAdvance: event.target.checked }))}
              />
              <i />
            </label>
          </div>

          <div className="fwg-save-state">
            <Save aria-hidden="true" />
            <span><strong>Tự động lưu trên thiết bị</strong><small>Bản soạn được khôi phục khi mở lại.</small></span>
          </div>
        </aside>
      </div>

      <section className="fwg-preview-card">
        <div className="fwg-section-heading">
          <span className="fwg-step">3</span>
          <div>
            <span>Kiểm tra trước khi chơi</span>
            <h2>Xem cách Brian tách từ</h2>
          </div>
          <button
            type="button"
            className="fwg-start-button"
            onClick={onStart}
            disabled={!validQuestions.length}
          >
            <Play aria-hidden="true" fill="currentColor" />
            Mở màn hình chơi
          </button>
        </div>

        <div className="fwg-question-preview-list">
          {validQuestions.length ? validQuestions.map((question, index) => (
            <article key={question.id}>
              <div className="fwg-preview-number">{String(index + 1).padStart(2, '0')}</div>
              <div>
                <p>{question.sentence}</p>
                <div className="fwg-preview-tokens">
                  {question.words.map((word, wordIndex) => <span key={`${question.id}-${wordIndex}`}>{word}</span>)}
                </div>
              </div>
              <span>{question.words.length} thẻ</span>
            </article>
          )) : (
            <div className="fwg-empty-preview">
              <FileText aria-hidden="true" />
              <strong>Chưa có câu hợp lệ</strong>
              <span>Nhập ít nhất một câu gồm từ hai thẻ trở lên.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ResultsScreen({ draft, result, onReplay, onEdit }) {
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 0;
  return (
    <div className="fwg-results">
      <div className="fwg-results-card">
        <div className="fwg-results-trophy"><Trophy aria-hidden="true" /></div>
        <span className="fwg-results-kicker">Hoàn thành trò chơi</span>
        <h1>{draft.title}</h1>
        <p>{accuracy >= 80 ? 'Xuất sắc! Bạn đã sắp xếp câu rất chính xác.' : 'Bạn đã hoàn thành tất cả câu. Hãy chơi lại để tăng điểm.'}</p>

        <div className="fwg-score-display">
          <strong>{result.score.toLocaleString('vi-VN')}</strong>
          <span>điểm</span>
        </div>

        <div className="fwg-result-metrics">
          <div><CheckCircle2 /><strong>{result.correct}/{result.total}</strong><span>Câu đúng</span></div>
          <div><Gauge /><strong>{accuracy}%</strong><span>Chính xác</span></div>
          <div><Clock3 /><strong>{result.averageTime}s</strong><span>Trung bình</span></div>
        </div>

        <div className="fwg-results-actions">
          <button type="button" className="fwg-button fwg-button-secondary" onClick={onEdit}>
            <ArrowLeft aria-hidden="true" /> Chỉnh sửa nội dung
          </button>
          <button type="button" className="fwg-button fwg-button-primary" onClick={onReplay}>
            <RotateCcw aria-hidden="true" /> Chơi lại
          </button>
          <button type="button" className="fwg-icon-button" onClick={() => { window.location.hash = '#/games'; }} aria-label="Về trang Trò chơi">
            <Home aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FlyingWordsGame() {
  const [draft, setDraft] = useState(loadDraft);
  const [screen, setScreen] = useState('setup');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [roundState, setRoundState] = useState('ready');
  const [flyingTokens, setFlyingTokens] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [timeLeft, setTimeLeft] = useState(draft.seconds);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [mistakePulse, setMistakePulse] = useState(0);
  const [elapsedByQuestion, setElapsedByQuestion] = useState([]);
  const [result, setResult] = useState({ score: 0, correct: 0, total: 0, averageTime: 0 });
  const shellRef = useRef(null);
  const animationRef = useRef(0);
  const previousFrameRef = useRef(0);
  const autoAdvanceRef = useRef(0);
  const importInputRef = useRef(null);

  const questions = useMemo(() => parseQuestions(draft.sentences), [draft.sentences]);
  const validQuestions = useMemo(() => questions.filter((item) => item.valid), [questions]);
  const currentQuestion = validQuestions[questionIndex] || null;
  const playSound = useGeneratedSound(draft.sound);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Local persistence is optional.
    }
  }, [draft]);

  const seedRound = useCallback((index = questionIndex) => {
    const question = validQuestions[index];
    if (!question) return;
    setFlyingTokens(createRoundTokens(question, draft.speed));
    setSelectedTokens([]);
    setTimeLeft(draft.seconds);
    setRoundScore(0);
    setMistakePulse(0);
  }, [draft.seconds, draft.speed, questionIndex, validQuestions]);

  const openGame = useCallback(() => {
    if (!validQuestions.length) return;
    window.clearTimeout(autoAdvanceRef.current);
    setQuestionIndex(0);
    setScore(0);
    setCorrectCount(0);
    setElapsedByQuestion([]);
    setResult({ score: 0, correct: 0, total: validQuestions.length, averageTime: 0 });
    setScreen('game');
    setRoundState('ready');
    setFlyingTokens(createRoundTokens(validQuestions[0], draft.speed));
    setSelectedTokens([]);
    setTimeLeft(draft.seconds);
    setRoundScore(0);
  }, [draft.seconds, draft.speed, validQuestions]);

  const startRound = useCallback(() => {
    setRoundState('running');
    playSound('tap');
  }, [playSound]);

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await shellRef.current?.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {
      // Fullscreen can be denied by browser policy.
    }
  }, []);

  const finishGame = useCallback((finalScore = score, finalCorrect = correctCount, elapsed = elapsedByQuestion) => {
    const averageTime = elapsed.length
      ? Math.round(elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length)
      : 0;
    const nextResult = {
      score: finalScore,
      correct: finalCorrect,
      total: validQuestions.length,
      averageTime,
    };
    setResult(nextResult);
    try {
      localStorage.setItem(RESULT_KEY, JSON.stringify(nextResult));
    } catch {
      // Result persistence is optional.
    }
    setScreen('results');
    setRoundState('complete');
  }, [correctCount, elapsedByQuestion, score, validQuestions.length]);

  const moveNext = useCallback(() => {
    window.clearTimeout(autoAdvanceRef.current);
    const nextIndex = questionIndex + 1;
    if (nextIndex >= validQuestions.length) {
      finishGame();
      return;
    }
    setQuestionIndex(nextIndex);
    setRoundState('running');
    setFlyingTokens(createRoundTokens(validQuestions[nextIndex], draft.speed));
    setSelectedTokens([]);
    setTimeLeft(draft.seconds);
    setRoundScore(0);
    setMistakePulse(0);
  }, [draft.seconds, draft.speed, finishGame, questionIndex, validQuestions]);

  const markCorrect = useCallback((orderedTokens) => {
    const earned = 100 + timeLeft * 5 + Math.max(0, 40 - mistakePulse * 10);
    const nextScore = score + earned;
    const nextCorrect = correctCount + 1;
    const elapsed = [...elapsedByQuestion, Math.max(0, draft.seconds - timeLeft)];

    setSelectedTokens(orderedTokens);
    setFlyingTokens([]);
    setRoundScore(earned);
    setScore(nextScore);
    setCorrectCount(nextCorrect);
    setElapsedByQuestion(elapsed);
    setRoundState('correct');
    playSound('correct');

    try {
      confetti({
        particleCount: 90,
        spread: 72,
        origin: { y: 0.58 },
        scalar: 0.9,
        disableForReducedMotion: true,
      });
    } catch {
      // Confetti is decorative.
    }

    if (draft.autoAdvance) {
      autoAdvanceRef.current = window.setTimeout(() => {
        const nextIndex = questionIndex + 1;
        if (nextIndex >= validQuestions.length) finishGame(nextScore, nextCorrect, elapsed);
        else {
          setQuestionIndex(nextIndex);
          setRoundState('running');
          setFlyingTokens(createRoundTokens(validQuestions[nextIndex], draft.speed));
          setSelectedTokens([]);
          setTimeLeft(draft.seconds);
          setRoundScore(0);
          setMistakePulse(0);
        }
      }, 1800);
    }
  }, [
    correctCount,
    draft.autoAdvance,
    draft.seconds,
    draft.speed,
    elapsedByQuestion,
    finishGame,
    mistakePulse,
    playSound,
    questionIndex,
    score,
    timeLeft,
    validQuestions,
  ]);

  const selectToken = useCallback((token) => {
    if (roundState !== 'running' || !currentQuestion) return;
    playSound('tap');
    const ordered = [...selectedTokens, token];
    setSelectedTokens(ordered);
    setFlyingTokens((current) => current.filter((item) => item.id !== token.id));

    if (ordered.length !== currentQuestion.words.length) return;
    const correct = ordered.every((item, index) => item.order === index);
    if (correct) {
      markCorrect(ordered);
      return;
    }

    playSound('wrong');
    setRoundState('wrong');
    setMistakePulse((current) => current + 1);
    setTimeLeft((current) => Math.max(0, current - draft.wrongPenalty));
    window.setTimeout(() => {
      setFlyingTokens(createRoundTokens(currentQuestion, draft.speed));
      setSelectedTokens([]);
      setRoundState('running');
    }, 760);
  }, [
    currentQuestion,
    draft.speed,
    draft.wrongPenalty,
    markCorrect,
    playSound,
    roundState,
    selectedTokens,
  ]);

  const undoLast = useCallback(() => {
    if (roundState !== 'running' || !selectedTokens.length) return;
    const returning = selectedTokens[selectedTokens.length - 1];
    playSound('undo');
    setSelectedTokens((current) => current.slice(0, -1));
    setFlyingTokens((current) => [
      ...current,
      {
        ...returning,
        x: 10 + Math.random() * 75,
        y: 12 + Math.random() * 62,
        vx: returning.vx || 0.08,
        vy: returning.vy || 0.06,
      },
    ]);
  }, [playSound, roundState, selectedTokens]);

  const togglePause = useCallback(() => {
    if (roundState === 'running') setRoundState('paused');
    else if (roundState === 'paused') setRoundState('running');
  }, [roundState]);

  const retryCurrent = useCallback(() => {
    seedRound(questionIndex);
    setRoundState('running');
  }, [questionIndex, seedRound]);

  useEffect(() => {
    if (screen !== 'game') return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        undoLast();
      }
      if (event.key === ' ' && ['running', 'paused'].includes(roundState)) {
        event.preventDefault();
        togglePause();
      }
      if (event.key === 'Escape' && document.fullscreenElement) document.exitFullscreen?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [roundState, screen, togglePause, undoLast]);

  useEffect(() => {
    if (roundState !== 'running') return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRoundState('timeout');
          setFlyingTokens([]);
          setSelectedTokens([]);
          setElapsedByQuestion((elapsed) => [...elapsed, draft.seconds]);
          playSound('timeout');
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [draft.seconds, playSound, questionIndex, roundState]);

  useEffect(() => {
    if (roundState !== 'running' || !flyingTokens.length) {
      cancelAnimationFrame(animationRef.current);
      previousFrameRef.current = 0;
      return undefined;
    }

    const animate = (timestamp) => {
      const previous = previousFrameRef.current || timestamp;
      const delta = Math.min(2.1, (timestamp - previous) / 16.67);
      previousFrameRef.current = timestamp;
      setFlyingTokens((current) => current.map((token) => {
        let x = token.x + token.vx * delta;
        let y = token.y + token.vy * delta;
        let vx = token.vx;
        let vy = token.vy;
        if (x <= 3 || x >= 88) {
          vx *= -1;
          x = clamp(x, 3, 88);
        }
        if (y <= 5 || y >= 78) {
          vy *= -1;
          y = clamp(y, 5, 78);
        }
        return { ...token, x, y, vx, vy };
      }));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationRef.current);
      previousFrameRef.current = 0;
    };
  }, [flyingTokens.length, roundState]);

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        setDraft(sanitizeDraft(JSON.parse(text)));
      } else {
        setDraft((current) => ({ ...current, sentences: text }));
      }
    } catch {
      window.alert('Không thể đọc file. Hãy dùng file TXT hoặc JSON hợp lệ.');
    }
  };

  const exportDraft = () => {
    const safeName = (draft.title || 'flying-words').replace(/[^\p{L}\p{N}\-_]+/gu, '-').replace(/^-+|-+$/g, '') || 'flying-words';
    downloadText(`${safeName}.json`, JSON.stringify({ app: 'brian-flying-words', version: 1, ...draft }, null, 2));
  };

  const resetDraft = () => {
    if (!window.confirm('Xóa nội dung hiện tại và khôi phục bộ câu mặc định?')) return;
    setDraft(DEFAULT_DRAFT);
  };

  const exitToSetup = () => {
    window.clearTimeout(autoAdvanceRef.current);
    if (document.fullscreenElement) document.exitFullscreen?.();
    setScreen('setup');
    setRoundState('ready');
  };

  const progress = validQuestions.length ? ((questionIndex + 1) / validQuestions.length) * 100 : 0;
  const isLastQuestion = questionIndex >= validQuestions.length - 1;
  const timerUrgent = timeLeft <= 5;

  return (
    <section className="flying-words-app" ref={shellRef}>
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.json,text/plain,application/json"
        hidden
        onChange={handleImportFile}
      />

      {screen === 'setup' ? (
        <SetupScreen
          draft={draft}
          setDraft={setDraft}
          questions={questions}
          validQuestions={validQuestions}
          onStart={openGame}
          onReset={resetDraft}
          onImport={handleImportClick}
          onExport={exportDraft}
          onLoadSample={() => setDraft((current) => ({ ...current, sentences: DEFAULT_SENTENCES }))}
        />
      ) : null}

      {screen === 'results' ? (
        <ResultsScreen
          draft={draft}
          result={result}
          onReplay={openGame}
          onEdit={exitToSetup}
        />
      ) : null}

      {screen === 'game' && currentQuestion ? (
        <div className={`fwg-game ${roundState === 'wrong' ? 'is-wrong' : ''} ${roundState === 'paused' ? 'is-paused' : ''}`}>
          <header className="fwg-game-toolbar">
            <div className="fwg-game-progress-copy">
              <span>Câu {questionIndex + 1}/{validQuestions.length} · Điểm: {score.toLocaleString('vi-VN')}</span>
              <strong>Sắp xếp các từ dưới đây thành câu hoàn chỉnh</strong>
            </div>
            <div className="fwg-game-toolbar-actions">
              <button type="button" onClick={requestFullscreen}><Expand /> <span>Toàn màn hình</span></button>
              <button type="button" className="is-round" onClick={() => setDraft((current) => ({ ...current, sound: !current.sound }))} aria-label={draft.sound ? 'Tắt âm thanh' : 'Bật âm thanh'}>
                {draft.sound ? <Volume2 /> : <VolumeX />}
              </button>
              <button type="button" className="is-round" onClick={togglePause} aria-label={roundState === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}>
                {roundState === 'paused' ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}
              </button>
              <button type="button" className="is-exit" onClick={exitToSetup}><X /> <span>Thoát</span></button>
            </div>
            <div className="fwg-progress-line"><i style={{ width: `${progress}%` }} /></div>
          </header>

          <div className="fwg-arena-wrap">
            <div className="fwg-arena" aria-label="Sân chơi các từ đang bay">
              <div className="fwg-arena-glow glow-one" />
              <div className="fwg-arena-glow glow-two" />
              {flyingTokens.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  className="fwg-flying-token"
                  style={{
                    '--x': `${token.x}%`,
                    '--y': `${token.y}%`,
                    '--rotation': `${token.rotation}deg`,
                    '--token-primary': token.primary,
                    '--token-secondary': token.secondary,
                  }}
                  onClick={() => selectToken(token)}
                >
                  <i aria-hidden="true" />
                  <span>{token.text}</span>
                </button>
              ))}
              {roundState === 'paused' ? (
                <div className="fwg-pause-panel">
                  <Pause aria-hidden="true" />
                  <h2>Đã tạm dừng</h2>
                  <p>Nhấn phím Space hoặc nút tiếp tục để quay lại trò chơi.</p>
                  <button type="button" className="fwg-button fwg-button-primary" onClick={togglePause}><Play fill="currentColor" /> Tiếp tục</button>
                </div>
              ) : null}
            </div>

            <div className={`fwg-timer ${timerUrgent ? 'is-urgent' : ''}`}>
              <strong>{timeLeft}</strong>
              <span>giây</span>
            </div>
          </div>

          <div className="fwg-answer-dock">
            <button
              type="button"
              className="fwg-undo-button"
              onClick={undoLast}
              disabled={!selectedTokens.length || roundState !== 'running'}
            >
              <Undo2 aria-hidden="true" /> Hoàn tác
            </button>
            <div className={`fwg-answer-slots ${roundState === 'wrong' ? 'is-shaking' : ''}`}>
              {currentQuestion.words.map((_, index) => {
                const token = selectedTokens[index];
                return (
                  <button
                    key={`${currentQuestion.id}-slot-${index}`}
                    type="button"
                    className={token ? 'is-filled' : ''}
                    onClick={token && index === selectedTokens.length - 1 ? undoLast : undefined}
                    aria-label={token ? `Từ đã chọn: ${token.text}` : `Ô trống ${index + 1}`}
                  >
                    {token ? token.text : <i />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="fwg-next-placeholder"
              disabled={!['correct', 'timeout'].includes(roundState)}
              onClick={moveNext}
            >
              Câu tiếp theo <ChevronRight aria-hidden="true" />
            </button>
          </div>

          {roundState === 'ready' ? (
            <ReadyOverlay
              draft={draft}
              questionCount={validQuestions.length}
              onStart={startRound}
              onFullscreen={requestFullscreen}
              onBack={exitToSetup}
            />
          ) : null}

          {roundState === 'correct' ? (
            <FeedbackOverlay
              type="correct"
              sentence={currentQuestion.sentence}
              score={roundScore}
              timeLeft={timeLeft}
              isLast={isLastQuestion}
              onNext={moveNext}
              onRetry={retryCurrent}
            />
          ) : null}

          {roundState === 'timeout' ? (
            <FeedbackOverlay
              type="timeout"
              sentence={currentQuestion.sentence}
              score={0}
              timeLeft={0}
              isLast={isLastQuestion}
              onNext={moveNext}
              onRetry={retryCurrent}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
