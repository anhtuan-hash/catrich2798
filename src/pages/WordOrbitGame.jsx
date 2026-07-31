import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Download, Edit3, Expand,
  Flame, Info, Lightbulb, Orbit, Play, Plus, Rocket, RotateCcw, Save, Sparkles,
  Star, Trash2, Upload, Volume2, VolumeX, X, Zap,
} from 'lucide-react';
import '../styles/WordOrbitGame.css';

const STORE_KEY = 'brian-word-orbit-draft-v1';
const RESULT_KEY = 'brian-word-orbit-results-v1';

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
    howToText: 'Kéo hoặc nhấp vào viên nang từ vựng, sau đó thả vào trạm nghĩa phù hợp trước khi hết thời gian!',
    tapHear: 'Nhấn để nghe · Kéo vào trạm', nextOrbit: 'Next orbit', tip: 'Mẹo: Hãy chú ý nghĩa của từ trong ngữ cảnh để chọn trạm phù hợp nhất!',
    streak: 'Chuỗi đúng', correctMeaning: 'Nghĩa đúng', missionProgress: 'Tiến độ nhiệm vụ',
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
    howTo: 'How to play', howToText: 'Drag or tap the vocabulary capsule, then send it to the matching meaning station before time runs out!',
    tapHear: 'Tap to hear · Drag to a station', nextOrbit: 'Next orbit', tip: 'Tip: Use the word in context to choose the best meaning station.',
    streak: 'Correct streak', correctMeaning: 'Correct meaning', missionProgress: 'Mission progress',
  },
};

const STATION_TONES = ['blue', 'purple', 'orange', 'green'];

function uid() {
  return `wo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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
      distractors: (Array.isArray(item?.distractors) ? item.distractors : []).slice(0, 3).map((x) => String(x).slice(0, 180)),
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
  return (
    <>
      {source.slice(0, index)}
      <mark>{source.slice(index, index + target.length)}</mark>
      {source.slice(index + target.length)}
    </>
  );
}

export default function WordOrbitGame({ language = 'vi' }) {
  const tx = COPY[language] || COPY.vi;
  const fileRef = useRef(null);
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

  const validWords = useMemo(() => draft.words.filter((w) => w.word.trim() && w.meaning.trim()), [draft.words]);
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
    if (mode !== 'play' || finished || feedback || !current) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setEnergy((e) => Math.max(0, e - 18));
          setCombo(0);
          setFeedback({ ok: false, text: current.meaning, timedOut: true });
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, finished, feedback, current]);

  const restart = () => {
    setRound(0);
    setScore(0);
    setEnergy(100);
    setCombo(0);
    setSelectedStation('');
    setFeedback(null);
    setFinished(false);
    setDragging(false);
    setTimeLeft(draft.settings.timePerRound);
  };

  const nextRound = () => {
    if (round >= validWords.length - 1 || energy <= 0) {
      const item = { id: uid(), at: Date.now(), title: draft.title, score, energy, total: validWords.length };
      const nextResults = [item, ...results].slice(0, 12);
      setResults(nextResults);
      localStorage.setItem(RESULT_KEY, JSON.stringify(nextResults));
      setFinished(true);
      confetti({ particleCount: 120, spread: 72, origin: { y: 0.68 } });
      return;
    }
    setRound((value) => value + 1);
    setSelectedStation('');
    setFeedback(null);
    setDragging(false);
    setTimeLeft(draft.settings.timePerRound);
  };

  const chooseStation = (station) => {
    if (!station || feedback || !current) return;
    setSelectedStation(station);
    setDragging(false);
    const ok = station === current.meaning;
    if (ok) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setScore((value) => value + 100 + nextCombo * 20 + timeLeft * 3);
      setEnergy((value) => Math.min(100, value + 6));
      setFeedback({ ok: true, text: current.example });
      speak(current.word, draft.settings.sound);
      confetti({ particleCount: 46, spread: 54, origin: { x: 0.72, y: 0.58 } });
    } else {
      setCombo(0);
      setEnergy((value) => Math.max(0, value - 20));
      setFeedback({ ok: false, text: current.meaning });
    }
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
          <div className="wog-brand">
            <span><Orbit size={30}/></span>
            <div><strong>{tx.editor}</strong><small>Navigate · Connect · Master</small></div>
          </div>
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
      className={`wog-app ${feedback?.ok ? 'is-success' : feedback ? 'is-error' : ''} ${dragging ? 'is-dragging' : ''}`}
      style={{ '--mission-progress': `${missionProgress}%`, '--timer-progress': `${timerProgress}%` }}
    >
      <header className="wog-topbar">
        <button className="wog-back" onClick={() => window.history.back()}><ArrowLeft size={20}/>{tx.back}</button>
        <div className="wog-brand">
          <span><Orbit size={32}/></span>
          <div><strong>{draft.title}</strong><small>{draft.theme} · Navigate · Connect · Master</small></div>
        </div>
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

          <div className="wog-progress-card">
            <div><strong>{tx.round} {roundNumber}/{Math.max(validWords.length, 1)}</strong><Rocket size={24}/></div>
            <span><i/></span>
          </div>

          <div className="wog-timer-card">
            <small>{tx.remaining}</small>
            <div className="wog-timer-ring"><Clock3 size={17}/><b>{timeLeft}</b><em>{tx.seconds}</em></div>
          </div>

          <div className="wog-orbit-ring ring-one" aria-hidden="true"/>
          <div className="wog-orbit-ring ring-two" aria-hidden="true"/>
          <div className="wog-orbit-ring ring-three" aria-hidden="true"/>
          <div className="wog-orbit-ring ring-four" aria-hidden="true"/>

          <svg className="wog-trajectory" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="wog-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L8,3 z"/>
              </marker>
            </defs>
            <path d="M265 205 C430 185 610 250 790 470" markerEnd="url(#wog-arrow)"/>
          </svg>

          <div className="wog-planet" aria-label={draft.theme}>
            <div className="wog-planet-atmosphere" aria-hidden="true"/>
            <div className="wog-planet-copy"><Orbit size={48}/><strong>{draft.theme}</strong><small>{tx.round} {roundNumber}/{Math.max(validWords.length, 1)}</small></div>
          </div>

          {current ? (
            <button
              className={`wog-capsule ${feedback?.ok ? 'is-launched' : feedback ? 'is-rejected' : ''}`}
              draggable={!feedback}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', current.word);
                setDragging(true);
              }}
              onDragEnd={() => setDragging(false)}
              onClick={() => speak(current.word, draft.settings.sound)}
              aria-label={`${current.word}. ${tx.tapHear}`}
            >
              <span className="wog-capsule-light"/>
              <strong>{current.word}</strong>
              <small>{tx.tapHear}</small>
              <i aria-hidden="true"/>
            </button>
          ) : null}

          <div className={`wog-target-dock tone-${targetTone}`} aria-hidden="true"><i/><i/><span/></div>

          <aside className="wog-howto-card">
            <div><Info size={18}/><strong>{tx.howTo}</strong></div>
            <p>{tx.howToText}</p>
            <span className="wog-hand-cue" aria-hidden="true">☝</span>
          </aside>
        </section>

        <aside className="wog-stations">
          <div className="wog-instruction"><Rocket size={24}/><span>{tx.mission}</span><div aria-hidden="true"><i/><i/></div></div>
          <div className="wog-station-grid">
            {stations.map((station, index) => {
              const isCorrectStation = Boolean(feedback && station === current?.meaning);
              const isWrongSelection = Boolean(feedback && selectedStation === station && station !== current?.meaning);
              const stationClass = [
                'wog-station',
                `tone-${STATION_TONES[index]}`,
                selectedStation === station && !feedback ? 'is-selected' : '',
                isCorrectStation ? 'is-correct' : '',
                isWrongSelection ? 'is-wrong' : '',
                dragging ? 'is-drop-ready' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={`${station}-${index}`}
                  className={stationClass}
                  disabled={Boolean(feedback)}
                  onClick={() => chooseStation(station)}
                  onDragOver={(event) => {
                    if (!feedback) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    chooseStation(station);
                  }}
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
              <div className="wog-feedback-copy">
                <strong>{feedback.ok ? tx.correct : tx.wrong}{feedback.ok ? ' 🎉' : ''}</strong>
                <p>{feedback.ok ? <HighlightedExample text={feedback.text} word={current?.word}/> : <><b>{tx.correctMeaning}:</b> {feedback.text}</>}</p>
              </div>
              <div className="wog-feedback-art" aria-hidden="true"><span/><i/><em/></div>
              <button onClick={nextRound}>
                {round >= validWords.length - 1 || energy <= 0 ? tx.complete : tx.nextOrbit}
                <ArrowRight size={20}/>
              </button>
            </div>
          ) : (
            <div className="wog-ready-note"><Orbit size={18}/><span>{tx.select}</span></div>
          )}
        </aside>
      </main>

      <footer className="wog-tipbar">
        <div><Lightbulb size={21}/><span>{tx.tip}</span></div>
        <strong>{tx.streak}: <Flame size={18}/>{combo}</strong>
      </footer>

      {finished ? (
        <div className="wog-modal-backdrop">
          <section className="wog-modal">
            <button onClick={() => setFinished(false)}><X/></button>
            <Sparkles size={54}/>
            <h2>{tx.complete}</h2>
            <p>{score} points · {energy}% energy</p>
            <button className="wog-modal-primary" onClick={restart}>{tx.reset}</button>
          </section>
        </div>
      ) : null}

      {resultsOpen ? (
        <div className="wog-modal-backdrop">
          <section className="wog-modal wog-results">
            <button onClick={() => setResultsOpen(false)}><X/></button>
            <h2>{tx.results}</h2>
            {results.length ? results.map((item) => (
              <article key={item.id}>
                <div><strong>{item.title}</strong><small>{new Date(item.at).toLocaleString()}</small></div>
                <b>{item.score}</b>
              </article>
            )) : <p>{tx.noResults}</p>}
          </section>
        </div>
      ) : null}
    </div>
  );
}
