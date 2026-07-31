import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock3, Download, Edit3, Expand,
  Flame, Info, Lightbulb, Orbit, Play, Plus, Rocket, RotateCcw, Save, Sparkles,
  Star, Trash2, Upload, Volume2, VolumeX, X, Zap,
} from 'lucide-react';
import '../styles/WordOrbitGame.css';

const STORE_KEY = 'brian-word-orbit-draft-v1';
const RESULT_KEY = 'brian-word-orbit-results-v1';
const STATION_TONES = ['blue', 'purple', 'orange', 'green'];

const SAMPLE = {
  title: 'Word Orbit',
  subtitle: 'Điều khiển từ vựng vào đúng trạm nghĩa trước khi năng lượng cạn.',
  theme: 'Environment',
  words: [
    { id: 'w1', word: 'mitigate', meaning: 'reduce the severity of something', distractors: ['make something worse', 'ignore completely', 'predict accurately'], example: 'Trees can help mitigate urban heat.' },
    { id: 'w2', word: 'scarce', meaning: 'limited in quantity', distractors: ['easy to obtain', 'widely accepted', 'extremely harmful'], example: 'Clean water is scarce in some regions.' },
    { id: 'w3', word: 'sustainable', meaning: 'able to continue without damaging resources', distractors: ['temporary and unstable', 'very expensive', 'impossible to measure'], example: 'The city invested in sustainable transport.' },
    { id: 'w4', word: 'conserve', meaning: 'protect something from loss or waste', distractors: ['replace immediately', 'consume rapidly', 'divide equally'], example: 'We should conserve water during the dry season.' },
    { id: 'w5', word: 'habitat', meaning: 'the natural home of a plant or animal', distractors: ['a weather warning', 'a farming method', 'an energy source'], example: 'Wetlands provide habitat for many birds.' },
  ],
  settings: { timePerRound: 18, shuffle: true, sound: true },
};

const COPY = {
  vi: {
    back: 'Quay lại', edit: 'Soạn trò chơi', play: 'Chơi', save: 'Lưu bản soạn', import: 'Nhập JSON', export: 'Xuất JSON',
    reset: 'Làm lại', select: 'Chạm hoặc kéo viên nang từ vựng vào trạm nghĩa phù hợp.', score: 'Điểm', energy: 'Năng lượng',
    combo: 'Combo', round: 'Quỹ đạo', correct: 'Chính xác!', wrong: 'Sai quỹ đạo.', editor: 'Trình soạn Word Orbit',
    addWord: 'Thêm từ', title: 'Tên trò chơi', subtitle: 'Hướng dẫn', theme: 'Chủ đề', word: 'Từ / cụm từ',
    meaning: 'Nghĩa đúng', distractors: 'Ba phương án nhiễu, mỗi dòng một phương án', example: 'Câu ví dụ', settings: 'Cài đặt',
    time: 'Thời gian mỗi vòng', shuffle: 'Xáo trộn đáp án', sound: 'Âm thanh', loadSample: 'Nạp bài mẫu', saved: 'Đã lưu trên thiết bị.',
    invalid: 'Tệp JSON không hợp lệ.', empty: 'Cần ít nhất hai mục từ hợp lệ.', complete: 'Hoàn thành nhiệm vụ!',
    fullscreen: 'Toàn màn hình', close: 'Đóng', results: 'Kết quả gần đây', noResults: 'Chưa có kết quả.', remaining: 'Còn lại',
    seconds: 'giây', mission: 'Đưa viên nang từ vựng vào đúng trạm nghĩa trước khi hết năng lượng.', howTo: 'Cách chơi',
    howToText: 'Chọn một trạm nghĩa. Viên nang sẽ bay theo quỹ đạo đến cổng tiếp nhận.',
    tapHear: 'Nhấn để nghe · Chọn trạm', nextOrbit: 'Quỹ đạo tiếp theo', tip: 'Mẹo: Dựa vào ngữ cảnh để chọn nghĩa phù hợp nhất.',
    streak: 'Chuỗi đúng', correctMeaning: 'Nghĩa đúng', missionProgress: 'Tiến độ nhiệm vụ', flying: 'Đang bay theo quỹ đạo…',
  },
  en: {
    back: 'Back', edit: 'Edit game', play: 'Play', save: 'Save draft', import: 'Import JSON', export: 'Export JSON',
    reset: 'Restart', select: 'Tap or drag the word capsule into the matching meaning station.', score: 'Score', energy: 'Energy',
    combo: 'Combo', round: 'Orbit', correct: 'Correct!', wrong: 'Wrong orbit.', editor: 'Word Orbit composer', addWord: 'Add word',
    title: 'Game title', subtitle: 'Instruction', theme: 'Theme', word: 'Word / phrase', meaning: 'Correct meaning',
    distractors: 'Three distractors, one per line', example: 'Example sentence', settings: 'Settings', time: 'Seconds per round',
    shuffle: 'Shuffle answers', sound: 'Sound', loadSample: 'Load sample', saved: 'Saved on this device.', invalid: 'Invalid JSON file.',
    empty: 'Add at least two valid words.', complete: 'Mission complete!', fullscreen: 'Fullscreen', close: 'Close', results: 'Recent results',
    noResults: 'No results yet.', remaining: 'Remaining', seconds: 'seconds', mission: 'Guide the vocabulary capsule into the correct meaning station before energy runs out.',
    howTo: 'How to play', howToText: 'Choose a meaning station. The capsule will follow the orbit to the receiving gate.',
    tapHear: 'Tap to hear · Choose a station', nextOrbit: 'Next orbit', tip: 'Tip: Use context to choose the best meaning.',
    streak: 'Correct streak', correctMeaning: 'Correct meaning', missionProgress: 'Mission progress', flying: 'Flying along the orbit…',
  },
};

function uid() {
  return `wo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
  return {
    title: String(source.title || SAMPLE.title).slice(0, 80),
    subtitle: String(source.subtitle || SAMPLE.subtitle).slice(0, 180),
    theme: String(source.theme || SAMPLE.theme).slice(0, 60),
    words: (Array.isArray(source.words) ? source.words : SAMPLE.words).slice(0, 30).map((item) => ({
      id: String(item?.id || uid()),
      word: String(item?.word || '').slice(0, 80),
      meaning: String(item?.meaning || '').slice(0, 180),
      distractors: (Array.isArray(item?.distractors) ? item.distractors : []).slice(0, 3).map((value) => String(value).slice(0, 180)),
      example: String(item?.example || '').slice(0, 240),
    })),
    settings: {
      timePerRound: Math.max(8, Math.min(45, Number(source.settings?.timePerRound) || 18)),
      shuffle: source.settings?.shuffle !== false,
      sound: source.settings?.sound !== false,
    },
  };
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
  } catch {
    return fallback;
  }
}

function speak(text, enabled) {
  if (!enabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}

function HighlightedExample({ text, word }) {
  const source = String(text || '');
  const target = String(word || '');
  const index = source.toLocaleLowerCase().indexOf(target.toLocaleLowerCase());
  if (!target || index < 0) return source;
  return <>{source.slice(0, index)}<mark>{source.slice(index, index + target.length)}</mark>{source.slice(index + target.length)}</>;
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function WordOrbitGame({ language = 'vi' }) {
  const tx = COPY[language] || COPY.vi;
  const fileRef = useRef(null);
  const capsuleRef = useRef(null);
  const targetDockRef = useRef(null);
  const flightCloneRef = useRef(null);
  const flightIdRef = useRef(0);

  const [draft, setDraft] = useState(() => cleanDraft(load(STORE_KEY, SAMPLE)));
  const [mode, setMode] = useState('play');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [combo, setCombo] = useState(0);
  const [selectedStation, setSelectedStation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(draft.settings.timePerRound);
  const [finished, setFinished] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState(() => load(RESULT_KEY, []));
  const [dragging, setDragging] = useState(false);
  const [isFlying, setIsFlying] = useState(false);

  const validWords = useMemo(() => draft.words.filter((item) => item.word.trim() && item.meaning.trim()), [draft.words]);
  const current = validWords[round] || null;
  const stations = useMemo(() => {
    if (!current) return [];
    const raw = [current.meaning, ...current.distractors.filter(Boolean).slice(0, 3)];
    return draft.settings.shuffle ? shuffle(raw) : raw;
  }, [current, draft.settings.shuffle, round]);

  const roundNumber = Math.min(round + 1, Math.max(validWords.length, 1));
  const missionProgress = validWords.length ? (roundNumber / validWords.length) * 100 : 0;
  const timerProgress = draft.settings.timePerRound ? (timeLeft / draft.settings.timePerRound) * 100 : 0;
  const selectedIndex = stations.indexOf(selectedStation);
  const targetTone = STATION_TONES[selectedIndex >= 0 ? selectedIndex : 3];

  useEffect(() => {
    if (mode !== 'play' || finished || feedback || isFlying || !current) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setEnergy((existing) => Math.max(0, existing - 18));
          setCombo(0);
          setFeedback({ ok: false, text: current.meaning, timedOut: true });
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, finished, feedback, isFlying, current]);

  useEffect(() => () => {
    flightIdRef.current += 1;
    flightCloneRef.current?.remove();
    flightCloneRef.current = null;
  }, []);

  const restart = useCallback(() => {
    flightIdRef.current += 1;
    flightCloneRef.current?.remove();
    flightCloneRef.current = null;
    setRound(0);
    setScore(0);
    setEnergy(100);
    setCombo(0);
    setSelectedStation('');
    setFeedback(null);
    setFinished(false);
    setDragging(false);
    setIsFlying(false);
    setTimeLeft(draft.settings.timePerRound);
  }, [draft.settings.timePerRound]);

  const animateCapsule = useCallback(async (ok) => {
    const source = capsuleRef.current;
    const target = targetDockRef.current;
    if (!source || !target) return false;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) return false;

    const clone = source.cloneNode(true);
    clone.className = 'wog-capsule wog-flight-capsule';
    clone.removeAttribute('draggable');
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      left: `${sourceRect.left}px`,
      top: `${sourceRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
    });
    document.body.appendChild(clone);
    flightCloneRef.current = clone;

    const flightId = flightIdRef.current + 1;
    flightIdRef.current = flightId;
    setIsFlying(true);

    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;
    const arc = Math.max(78, Math.min(190, Math.abs(dx) * 0.28));
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reduceMotion ? (ok ? 560 : 480) : (ok ? 940 : 760);

    const correctFrames = [
      { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)', offset: 0 },
      { transform: `translate3d(${dx * 0.16}px,${dy * 0.06 - arc * 0.5}px,0) scale(.99) rotate(-2deg)`, offset: 0.18 },
      { transform: `translate3d(${dx * 0.48}px,${dy * 0.34 - arc}px,0) scale(.84) rotate(-1deg)`, offset: 0.5 },
      { transform: `translate3d(${dx * 0.8}px,${dy * 0.72 - arc * 0.42}px,0) scale(.58) rotate(1deg)`, offset: 0.8 },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(.28) rotate(2deg)`, offset: 1 },
    ];

    const wrongFrames = [
      { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)', offset: 0 },
      { transform: `translate3d(${dx * 0.13}px,${dy * 0.04 - arc * 0.38}px,0) scale(.98) rotate(-2deg)`, offset: 0.2 },
      { transform: `translate3d(${dx * 0.46}px,${dy * 0.3 - arc * 0.75}px,0) scale(.82) rotate(1deg)`, offset: 0.48 },
      { transform: `translate3d(${dx * 0.62}px,${dy * 0.5 - arc * 0.3}px,0) scale(.7) rotate(3deg)`, offset: 0.62 },
      { transform: `translate3d(${dx * 0.22}px,${dy * 0.08 - arc * 0.28}px,0) scale(.94) rotate(-2deg)`, offset: 0.82 },
      { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)', offset: 1 },
    ];

    let completed = false;
    try {
      if (typeof clone.animate === 'function') {
        const animation = clone.animate(ok ? correctFrames : wrongFrames, {
          duration,
          easing: ok ? 'cubic-bezier(.18,.72,.2,1)' : 'cubic-bezier(.32,.62,.28,1)',
          fill: 'forwards',
        });
        await animation.finished;
      } else if (ok) {
        clone.style.transition = `transform ${duration}ms cubic-bezier(.18,.72,.2,1)`;
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        clone.style.transform = `translate3d(${dx}px,${dy}px,0) scale(.28) rotate(2deg)`;
        await wait(duration);
      } else {
        const outward = Math.round(duration * 0.58);
        clone.style.transition = `transform ${outward}ms cubic-bezier(.32,.62,.28,1)`;
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        clone.style.transform = `translate3d(${dx * 0.58}px,${dy * 0.42 - arc * 0.35}px,0) scale(.72) rotate(3deg)`;
        await wait(outward);
        clone.style.transition = `transform ${duration - outward}ms ease-out`;
        clone.style.transform = 'translate3d(0,0,0) scale(1) rotate(0deg)';
        await wait(duration - outward);
      }
      completed = flightIdRef.current === flightId;
    } catch {
      // Cancellation is expected when restarting or leaving the route.
    } finally {
      if (flightIdRef.current === flightId) {
        clone.remove();
        flightCloneRef.current = null;
        setIsFlying(false);
      }
    }
    return completed;
  }, []);

  const completeChoice = useCallback((station, ok) => {
    if (!current) return;
    if (ok) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setScore((value) => value + 100 + nextCombo * 20 + timeLeft * 3);
      setEnergy((value) => Math.min(100, value + 6));
      setFeedback({ ok: true, text: current.example });
      speak(current.word, draft.settings.sound);
      window.setTimeout(() => confetti({ particleCount: 52, spread: 58, origin: { x: 0.67, y: 0.54 }, scalar: 0.82 }), 40);
    } else {
      setCombo(0);
      setEnergy((value) => Math.max(0, value - 20));
      setFeedback({ ok: false, text: current.meaning, selected: station });
    }
  }, [combo, current, draft.settings.sound, timeLeft]);

  const chooseStation = useCallback(async (station) => {
    if (!station || feedback || isFlying || !current) return;
    setSelectedStation(station);
    setDragging(false);
    const ok = station === current.meaning;
    const completed = await animateCapsule(ok);
    if (!completed) return;
    completeChoice(station, ok);
  }, [animateCapsule, completeChoice, current, feedback, isFlying]);

  const nextRound = () => {
    if (round >= validWords.length - 1 || energy <= 0) {
      const item = { id: uid(), at: Date.now(), title: draft.title, score, energy, total: validWords.length };
      const nextResults = [item, ...results].slice(0, 12);
      setResults(nextResults);
      localStorage.setItem(RESULT_KEY, JSON.stringify(nextResults));
      setFinished(true);
      window.setTimeout(() => confetti({ particleCount: 120, spread: 72, origin: { y: 0.68 } }), 60);
      return;
    }
    setRound((value) => value + 1);
    setSelectedStation('');
    setFeedback(null);
    setDragging(false);
    setIsFlying(false);
    setTimeLeft(draft.settings.timePerRound);
  };

  const saveDraft = () => {
    localStorage.setItem(STORE_KEY, JSON.stringify(draft));
    window.alert(tx.saved);
  };

  const exportDraft = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'word-orbit.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importDraft = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setDraft(cleanDraft(JSON.parse(await file.text())));
      setMode('edit');
      restart();
    } catch {
      window.alert(tx.invalid);
    }
    event.target.value = '';
  };

  if (mode === 'edit') {
    return (
      <div className="wog-app wog-editor">
        <header className="wog-topbar">
          <button className="wog-back" onClick={() => window.history.back()}><ArrowLeft size={20}/>{tx.back}</button>
          <div className="wog-brand"><span><Orbit size={30}/></span><div><strong>{tx.editor}</strong><small>Navigate · Connect · Master</small></div></div>
          <div className="wog-actions">
            <button onClick={() => setDraft(cleanDraft(SAMPLE))}><Sparkles size={18}/>{tx.loadSample}</button>
            <button onClick={() => fileRef.current?.click()}><Upload size={18}/>{tx.import}</button>
            <button onClick={exportDraft}><Download size={18}/>{tx.export}</button>
            <button className="is-primary" onClick={saveDraft}><Save size={18}/>{tx.save}</button>
            <button className="is-primary" onClick={() => {
              if (validWords.length < 2) return window.alert(tx.empty);
              restart();
              setMode('play');
              return undefined;
            }}><Play size={18}/>{tx.play}</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importDraft}/>
        </header>

        <main className="wog-editor-grid">
          <section className="wog-panel wog-meta">
            <label>{tx.title}<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label>
            <label>{tx.subtitle}<textarea rows={2} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })}/></label>
            <label>{tx.theme}<input value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value })}/></label>
            <div className="wog-settings">
              <h3>{tx.settings}</h3>
              <label>{tx.time}<input type="number" min="8" max="45" value={draft.settings.timePerRound} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, timePerRound: Number(event.target.value) } })}/></label>
              <label className="wog-check"><input type="checkbox" checked={draft.settings.shuffle} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, shuffle: event.target.checked } })}/>{tx.shuffle}</label>
              <label className="wog-check"><input type="checkbox" checked={draft.settings.sound} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, sound: event.target.checked } })}/>{tx.sound}</label>
            </div>
          </section>

          <section className="wog-word-list">
            {draft.words.map((item, index) => (
              <article className="wog-word-card" key={item.id}>
                <div className="wog-word-index">{index + 1}</div>
                <button className="wog-delete" onClick={() => setDraft({ ...draft, words: draft.words.filter((wordItem) => wordItem.id !== item.id) })}><Trash2 size={18}/></button>
                <label>{tx.word}<input value={item.word} onChange={(event) => setDraft({ ...draft, words: draft.words.map((wordItem) => wordItem.id === item.id ? { ...wordItem, word: event.target.value } : wordItem) })}/></label>
                <label>{tx.meaning}<textarea rows={2} value={item.meaning} onChange={(event) => setDraft({ ...draft, words: draft.words.map((wordItem) => wordItem.id === item.id ? { ...wordItem, meaning: event.target.value } : wordItem) })}/></label>
                <label>{tx.distractors}<textarea rows={3} value={item.distractors.join('\n')} onChange={(event) => setDraft({ ...draft, words: draft.words.map((wordItem) => wordItem.id === item.id ? { ...wordItem, distractors: event.target.value.split('\n').slice(0, 3) } : wordItem) })}/></label>
                <label>{tx.example}<input value={item.example} onChange={(event) => setDraft({ ...draft, words: draft.words.map((wordItem) => wordItem.id === item.id ? { ...wordItem, example: event.target.value } : wordItem) })}/></label>
              </article>
            ))}
            <button className="wog-add" onClick={() => setDraft({ ...draft, words: [...draft.words, { id: uid(), word: '', meaning: '', distractors: ['', '', ''], example: '' }] })}><Plus size={20}/>{tx.addWord}</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`wog-app ${feedback?.ok ? 'is-success' : feedback ? 'is-error' : ''} ${dragging ? 'is-dragging' : ''} ${isFlying ? 'is-flying' : ''} ${feedback ? 'has-feedback' : ''}`}
      style={{ '--mission-progress': `${missionProgress}%`, '--timer-progress': `${timerProgress}%` }}
    >
      <header className="wog-topbar">
        <button className="wog-back" onClick={() => window.history.back()}><ArrowLeft size={20}/>{tx.back}</button>
        <div className="wog-brand"><span><Orbit size={32}/></span><div><strong>{draft.title}</strong><small>{draft.theme} · Navigate · Connect · Master</small></div></div>
        <div className="wog-hud" aria-label={tx.missionProgress}>
          <span className="wog-hud-card is-score"><small><Star size={15}/>{tx.score}</small><b>{score}</b></span>
          <span className="wog-hud-card is-combo"><small><Orbit size={15}/>{tx.combo}</small><b>x{combo}</b></span>
          <span className="wog-hud-card is-energy"><small><Zap size={15}/>{tx.energy}</small><b>{energy}%</b><i><em style={{ width: `${energy}%` }}/></i></span>
        </div>
        <div className="wog-actions">
          <button onClick={() => setMode('edit')}><Edit3 size={18}/>{tx.edit}</button>
          <button onClick={() => document.documentElement.requestFullscreen?.()}><Expand size={18}/>{tx.fullscreen}</button>
          <button className="is-icon" aria-label={tx.sound} onClick={() => setDraft({ ...draft, settings: { ...draft.settings, sound: !draft.settings.sound } })}>{draft.settings.sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button>
          <button onClick={restart}><RotateCcw size={18}/>{tx.reset}</button>
          <button onClick={() => setResultsOpen(true)}>{tx.results}</button>
        </div>
      </header>

      <main className="wog-stage">
        <section className="wog-space" aria-label={tx.select}>
          <div className="wog-stars" aria-hidden="true"/>
          <div className="wog-nebula" aria-hidden="true"/>
          <div className="wog-space-object object-one" aria-hidden="true"/>
          <div className="wog-space-object object-two" aria-hidden="true"/>
          <div className="wog-space-object object-three" aria-hidden="true"/>

          <div className="wog-progress-card"><div><strong>{tx.round} {roundNumber}/{Math.max(validWords.length, 1)}</strong><Rocket size={24}/></div><span><i/></span></div>
          <div className="wog-timer-card"><small>{tx.remaining}</small><div className="wog-timer-ring"><Clock3 size={17}/><b>{timeLeft}</b><em>{tx.seconds}</em></div></div>

          <div className="wog-orbit-ring ring-one" aria-hidden="true"/>
          <div className="wog-orbit-ring ring-two" aria-hidden="true"/>
          <div className="wog-orbit-ring ring-three" aria-hidden="true"/>
          <div className="wog-orbit-ring ring-four" aria-hidden="true"/>
          <svg className="wog-trajectory" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true"><path d="M250 205 C425 120 660 215 808 486"/></svg>

          <div className="wog-planet" aria-label={draft.theme}>
            <div className="wog-planet-atmosphere" aria-hidden="true"/>
            <div className="wog-planet-copy"><Orbit size={48}/><strong>{draft.theme}</strong><small>{tx.round} {roundNumber}/{Math.max(validWords.length, 1)}</small></div>
          </div>

          {current ? (
            <button
              ref={capsuleRef}
              className="wog-capsule wog-capsule-source"
              draggable={!feedback && !isFlying}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', current.word);
                setDragging(true);
              }}
              onDragEnd={() => setDragging(false)}
              onClick={() => speak(current.word, draft.settings.sound)}
              aria-label={`${current.word}. ${tx.tapHear}`}
            >
              <span className="wog-capsule-light"/><strong>{current.word}</strong><small>{isFlying ? tx.flying : tx.tapHear}</small><i aria-hidden="true"/>
            </button>
          ) : null}

          <div ref={targetDockRef} className={`wog-target-dock tone-${targetTone} ${isFlying ? 'is-receiving' : ''}`} aria-hidden="true"><i/><i/><span/></div>
          <aside className="wog-howto-card"><div><Info size={18}/><strong>{tx.howTo}</strong></div><p>{isFlying ? tx.flying : tx.howToText}</p><span className="wog-hand-cue" aria-hidden="true">☝</span></aside>
        </section>

        <aside className="wog-stations">
          <div className="wog-instruction"><Rocket size={24}/><span>{tx.mission}</span><div aria-hidden="true"><i/><i/></div></div>
          <div className="wog-station-grid">
            {stations.map((station, index) => {
              const isCorrectStation = Boolean(feedback && station === current?.meaning);
              const isWrongSelection = Boolean(feedback && selectedStation === station && station !== current?.meaning);
              const stationClass = ['wog-station', `tone-${STATION_TONES[index]}`, selectedStation === station && !feedback ? 'is-selected' : '', isCorrectStation ? 'is-correct' : '', isWrongSelection ? 'is-wrong' : '', dragging ? 'is-drop-ready' : ''].filter(Boolean).join(' ');
              return (
                <button
                  key={`${station}-${index}`}
                  className={stationClass}
                  disabled={Boolean(feedback) || isFlying}
                  onClick={() => chooseStation(station)}
                  onDragOver={(event) => { if (!feedback && !isFlying) event.preventDefault(); }}
                  onDrop={(event) => { event.preventDefault(); chooseStation(station); }}
                >
                  <span className="wog-station-letter">{String.fromCharCode(65 + index)}</span>
                  <strong>{station}</strong>
                  <span className="wog-dock" aria-hidden="true"><i/><i/><em/></span>
                  {isCorrectStation ? <CheckCircle2 className="wog-station-check" size={28}/> : null}
                </button>
              );
            })}
          </div>

          {feedback ? (
            <div className={feedback.ok ? 'wog-feedback is-correct' : 'wog-feedback is-wrong'} aria-live="polite">
              <div className="wog-feedback-copy"><strong>{feedback.ok ? tx.correct : tx.wrong}{feedback.ok ? ' 🎉' : ''}</strong><p>{feedback.ok ? <HighlightedExample text={feedback.text} word={current?.word}/> : <><b>{tx.correctMeaning}:</b> {feedback.text}</>}</p></div>
              <div className="wog-feedback-art" aria-hidden="true"><span/><i/><em/></div>
              <button onClick={nextRound}>{round >= validWords.length - 1 || energy <= 0 ? tx.complete : tx.nextOrbit}<ArrowRight size={20}/></button>
            </div>
          ) : (
            <div className={`wog-ready-note ${isFlying ? 'is-flying' : ''}`}><Orbit size={18}/><span>{isFlying ? tx.flying : tx.select}</span></div>
          )}
        </aside>
      </main>

      <footer className="wog-tipbar"><div><Lightbulb size={21}/><span>{tx.tip}</span></div><strong>{tx.streak}: <Flame size={18}/>{combo}</strong></footer>

      {finished ? (
        <div className="wog-modal-backdrop"><section className="wog-modal"><button onClick={() => setFinished(false)}><X/></button><Sparkles size={54}/><h2>{tx.complete}</h2><p>{score} points · {energy}% energy</p><button className="wog-modal-primary" onClick={restart}>{tx.reset}</button></section></div>
      ) : null}

      {resultsOpen ? (
        <div className="wog-modal-backdrop"><section className="wog-modal wog-results"><button onClick={() => setResultsOpen(false)}><X/></button><h2>{tx.results}</h2>{results.length ? results.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{new Date(item.at).toLocaleString()}</small></div><b>{item.score}</b></article>) : <p>{tx.noResults}</p>}</section></div>
      ) : null}
    </div>
  );
}
