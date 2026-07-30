import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, Check, Download, Edit3, Expand, Orbit, Play, Plus, RotateCcw,
  Save, Sparkles, Trash2, Upload, Volume2, VolumeX, X,
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
    reset: 'Làm lại', launch: 'Phóng vào trạm', select: 'Chạm một viên nang, sau đó chọn trạm nghĩa phù hợp.',
    score: 'Điểm', energy: 'Năng lượng', combo: 'Combo', round: 'Vòng', correct: 'Chính xác!', wrong: 'Sai quỹ đạo.',
    editor: 'Trình soạn Word Orbit', addWord: 'Thêm từ', title: 'Tên trò chơi', subtitle: 'Hướng dẫn', theme: 'Chủ đề',
    word: 'Từ / cụm từ', meaning: 'Nghĩa đúng', distractors: 'Ba phương án nhiễu, mỗi dòng một phương án', example: 'Câu ví dụ',
    settings: 'Cài đặt', time: 'Thời gian mỗi vòng', shuffle: 'Xáo trộn đáp án', sound: 'Âm thanh', loadSample: 'Nạp bài mẫu',
    saved: 'Đã lưu trên thiết bị.', invalid: 'Tệp JSON không hợp lệ.', empty: 'Cần ít nhất hai mục từ hợp lệ.',
    complete: 'Hoàn thành nhiệm vụ!', fullscreen: 'Toàn màn hình', close: 'Đóng', results: 'Kết quả gần đây', noResults: 'Chưa có kết quả.',
  },
  en: {
    back: 'Back', edit: 'Edit game', play: 'Play', save: 'Save draft', import: 'Import JSON', export: 'Export JSON',
    reset: 'Restart', launch: 'Launch to station', select: 'Tap a capsule, then choose the matching meaning station.',
    score: 'Score', energy: 'Energy', combo: 'Combo', round: 'Round', correct: 'Correct!', wrong: 'Wrong orbit.',
    editor: 'Word Orbit composer', addWord: 'Add word', title: 'Game title', subtitle: 'Instruction', theme: 'Theme',
    word: 'Word / phrase', meaning: 'Correct meaning', distractors: 'Three distractors, one per line', example: 'Example sentence',
    settings: 'Settings', time: 'Seconds per round', shuffle: 'Shuffle answers', sound: 'Sound', loadSample: 'Load sample',
    saved: 'Saved on this device.', invalid: 'Invalid JSON file.', empty: 'Add at least two valid words.',
    complete: 'Mission complete!', fullscreen: 'Fullscreen', close: 'Close', results: 'Recent results', noResults: 'No results yet.',
  },
};

function uid() { return `wo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
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
      id: String(item?.id || uid()), word: String(item?.word || '').slice(0, 80), meaning: String(item?.meaning || '').slice(0, 180),
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
function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
function speak(text, enabled) {
  if (!enabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
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

  const validWords = useMemo(() => draft.words.filter((w) => w.word.trim() && w.meaning.trim()), [draft.words]);
  const current = validWords[round] || null;
  const stations = useMemo(() => {
    if (!current) return [];
    const raw = [current.meaning, ...current.distractors.filter(Boolean).slice(0, 3)];
    return draft.settings.shuffle ? shuffle(raw) : raw;
  }, [current, draft.settings.shuffle, round]);

  useEffect(() => {
    if (mode !== 'play' || finished || feedback || !current) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setEnergy((e) => Math.max(0, e - 18));
          setCombo(0);
          setFeedback({ ok: false, text: current.meaning });
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, finished, feedback, current]);

  const restart = () => {
    setRound(0); setScore(0); setEnergy(100); setCombo(0); setSelectedStation(''); setFeedback(null); setFinished(false);
    setTimeLeft(draft.settings.timePerRound);
  };

  const nextRound = () => {
    if (round >= validWords.length - 1 || energy <= 0) {
      const item = { id: uid(), at: Date.now(), title: draft.title, score, energy, total: validWords.length };
      const nextResults = [item, ...results].slice(0, 12);
      setResults(nextResults); localStorage.setItem(RESULT_KEY, JSON.stringify(nextResults));
      setFinished(true); confetti({ particleCount: 120, spread: 72, origin: { y: 0.68 } });
      return;
    }
    setRound((r) => r + 1); setSelectedStation(''); setFeedback(null); setTimeLeft(draft.settings.timePerRound);
  };

  const submit = () => {
    if (!selectedStation || feedback || !current) return;
    const ok = selectedStation === current.meaning;
    if (ok) {
      const nextCombo = combo + 1;
      setCombo(nextCombo); setScore((s) => s + 100 + nextCombo * 20 + timeLeft * 3);
      setEnergy((e) => Math.min(100, e + 6)); setFeedback({ ok: true, text: current.example });
      speak(current.word, draft.settings.sound);
      confetti({ particleCount: 40, spread: 48, origin: { y: 0.55 } });
    } else {
      setCombo(0); setEnergy((e) => Math.max(0, e - 20)); setFeedback({ ok: false, text: current.meaning });
    }
  };

  const saveDraft = () => { localStorage.setItem(STORE_KEY, JSON.stringify(draft)); window.alert(tx.saved); };
  const exportDraft = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'word-orbit.json'; a.click(); URL.revokeObjectURL(url);
  };
  const importDraft = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { setDraft(cleanDraft(JSON.parse(await file.text()))); setMode('edit'); restart(); } catch { window.alert(tx.invalid); }
    event.target.value = '';
  };

  if (mode === 'edit') {
    return (
      <div className="wog-app wog-editor">
        <header className="wog-topbar">
          <button onClick={() => window.history.back()}><ArrowLeft size={20}/>{tx.back}</button>
          <div className="wog-brand"><span><Orbit size={28}/></span><div><strong>{tx.editor}</strong><small>Navigate · Connect · Master</small></div></div>
          <div className="wog-actions">
            <button onClick={() => setDraft(cleanDraft(SAMPLE))}><Sparkles size={18}/>{tx.loadSample}</button>
            <button onClick={() => fileRef.current?.click()}><Upload size={18}/>{tx.import}</button>
            <button onClick={exportDraft}><Download size={18}/>{tx.export}</button>
            <button className="is-primary" onClick={saveDraft}><Save size={18}/>{tx.save}</button>
            <button className="is-primary" onClick={() => { if (validWords.length < 2) return window.alert(tx.empty); restart(); setMode('play'); }}><Play size={18}/>{tx.play}</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importDraft}/>
        </header>

        <main className="wog-editor-grid">
          <section className="wog-panel wog-meta">
            <label>{tx.title}<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}/></label>
            <label>{tx.subtitle}<textarea rows={2} value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}/></label>
            <label>{tx.theme}<input value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value })}/></label>
            <div className="wog-settings"><h3>{tx.settings}</h3>
              <label>{tx.time}<input type="number" min="8" max="45" value={draft.settings.timePerRound} onChange={(e) => setDraft({ ...draft, settings: { ...draft.settings, timePerRound: Number(e.target.value) } })}/></label>
              <label className="wog-check"><input type="checkbox" checked={draft.settings.shuffle} onChange={(e) => setDraft({ ...draft, settings: { ...draft.settings, shuffle: e.target.checked } })}/>{tx.shuffle}</label>
              <label className="wog-check"><input type="checkbox" checked={draft.settings.sound} onChange={(e) => setDraft({ ...draft, settings: { ...draft.settings, sound: e.target.checked } })}/>{tx.sound}</label>
            </div>
          </section>

          <section className="wog-word-list">
            {draft.words.map((item, index) => (
              <article className="wog-word-card" key={item.id}>
                <div className="wog-word-index">{index + 1}</div>
                <button className="wog-delete" onClick={() => setDraft({ ...draft, words: draft.words.filter((w) => w.id !== item.id) })}><Trash2 size={18}/></button>
                <label>{tx.word}<input value={item.word} onChange={(e) => setDraft({ ...draft, words: draft.words.map((w) => w.id === item.id ? { ...w, word: e.target.value } : w) })}/></label>
                <label>{tx.meaning}<textarea rows={2} value={item.meaning} onChange={(e) => setDraft({ ...draft, words: draft.words.map((w) => w.id === item.id ? { ...w, meaning: e.target.value } : w) })}/></label>
                <label>{tx.distractors}<textarea rows={3} value={item.distractors.join('\n')} onChange={(e) => setDraft({ ...draft, words: draft.words.map((w) => w.id === item.id ? { ...w, distractors: e.target.value.split('\n').slice(0, 3) } : w) })}/></label>
                <label>{tx.example}<input value={item.example} onChange={(e) => setDraft({ ...draft, words: draft.words.map((w) => w.id === item.id ? { ...w, example: e.target.value } : w) })}/></label>
              </article>
            ))}
            <button className="wog-add" onClick={() => setDraft({ ...draft, words: [...draft.words, { id: uid(), word: '', meaning: '', distractors: ['', '', ''], example: '' }] })}><Plus size={20}/>{tx.addWord}</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="wog-app">
      <header className="wog-topbar">
        <button onClick={() => window.history.back()}><ArrowLeft size={20}/>{tx.back}</button>
        <div className="wog-brand"><span><Orbit size={28}/></span><div><strong>{draft.title}</strong><small>{draft.theme} · Navigate · Connect · Master</small></div></div>
        <div className="wog-hud"><span>{tx.score}<b>{score}</b></span><span>{tx.combo}<b>x{combo}</b></span><span>{tx.energy}<b>{energy}%</b></span></div>
        <div className="wog-actions">
          <button onClick={() => setMode('edit')}><Edit3 size={18}/>{tx.edit}</button>
          <button onClick={() => document.documentElement.requestFullscreen?.()}><Expand size={18}/>{tx.fullscreen}</button>
          <button onClick={() => setDraft({ ...draft, settings: { ...draft.settings, sound: !draft.settings.sound } })}>{draft.settings.sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>
          <button onClick={restart}><RotateCcw size={18}/>{tx.reset}</button>
          <button onClick={() => setResultsOpen(true)}>{tx.results}</button>
        </div>
      </header>

      <main className="wog-stage">
        <div className="wog-space" aria-label={tx.select}>
          <div className="wog-stars"/>
          <div className="wog-orbit-ring ring-one"/><div className="wog-orbit-ring ring-two"/><div className="wog-orbit-ring ring-three"/>
          <div className="wog-planet"><Orbit size={42}/><strong>{draft.theme}</strong><small>{tx.round} {Math.min(round + 1, validWords.length)}/{validWords.length}</small></div>
          {current ? (
            <button className="wog-capsule" onClick={() => speak(current.word, draft.settings.sound)}>
              <span className="wog-capsule-light"/><strong>{current.word}</strong><small>Tap to hear</small>
            </button>
          ) : null}
          <div className="wog-timer" style={{ '--progress': `${(timeLeft / draft.settings.timePerRound) * 100}%` }}><b>{timeLeft}</b><small>s</small></div>
        </div>

        <section className="wog-stations">
          <div className="wog-instruction"><Sparkles size={20}/><span>{draft.subtitle || tx.select}</span></div>
          <div className="wog-station-grid">
            {stations.map((station, index) => (
              <button key={`${station}-${index}`} className={selectedStation === station ? 'wog-station is-selected' : 'wog-station'} onClick={() => !feedback && setSelectedStation(station)}>
                <span>{String.fromCharCode(65 + index)}</span><strong>{station}</strong>
              </button>
            ))}
          </div>
          {!feedback ? <button className="wog-launch" disabled={!selectedStation} onClick={submit}><Orbit size={22}/>{tx.launch}</button> : (
            <div className={feedback.ok ? 'wog-feedback is-correct' : 'wog-feedback is-wrong'}>
              <div><strong>{feedback.ok ? tx.correct : tx.wrong}</strong><p>{feedback.text}</p></div>
              <button onClick={nextRound}><Check size={20}/>{round >= validWords.length - 1 || energy <= 0 ? tx.complete : 'Next orbit'}</button>
            </div>
          )}
        </section>
      </main>

      {finished ? <div className="wog-modal-backdrop"><section className="wog-modal"><button onClick={() => setFinished(false)}><X/></button><Sparkles size={54}/><h2>{tx.complete}</h2><p>{score} points · {energy}% energy</p><button className="wog-launch" onClick={restart}>{tx.reset}</button></section></div> : null}
      {resultsOpen ? <div className="wog-modal-backdrop"><section className="wog-modal wog-results"><button onClick={() => setResultsOpen(false)}><X/></button><h2>{tx.results}</h2>{results.length ? results.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{new Date(item.at).toLocaleString()}</small></div><b>{item.score}</b></article>) : <p>{tx.noResults}</p>}</section></div> : null}
    </div>
  );
}
