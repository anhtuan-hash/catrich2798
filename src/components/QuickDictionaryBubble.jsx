import React, { useEffect, useRef, useState } from 'react';
import './QuickDictionaryBubble.css';

const HISTORY_KEY = 'bes-quick-dictionary-history-v1';
const MAX_HISTORY = 6;
const AUDIO_RATES = [0.75, 1, 1.25];
const WAVEFORM = [
  22, 30, 18, 38, 46, 27, 52, 63, 36, 72, 48, 82, 58, 92, 66, 78,
  54, 96, 70, 86, 61, 76, 50, 68, 44, 74, 56, 64, 40, 58, 34, 52,
  30, 46, 26, 42, 23, 37, 20, 34, 18, 31, 16, 28, 14, 25, 13, 22,
];

const EMPTY_AUDIO = { playing: false, currentTime: 0, duration: 0, mode: 'idle' };

function readHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.term === 'string').slice(0, MAX_HISTORY)
      : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch { /* optional */ }
}

function languageLabel(code, language) {
  if (language === 'vi') return code === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh';
  return code === 'vi' ? 'Vietnamese' : 'English';
}

function formatTime(value) {
  const seconds = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function DictionaryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.2 4.2h8.1a3.4 3.4 0 0 1 3.4 3.4v11H8.6a3.4 3.4 0 0 0-3.4 1.2V4.2Z" />
      <path d="M18.8 6.3h.1v12.3H9.5a3.4 3.4 0 0 0-3.1 1.9" />
      <path d="M8.4 8.3h5.2M8.4 11.4h4" />
    </svg>
  );
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4.2 4.2" /></svg>;
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6L8 10H4Z" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6M18.4 6.8a7.4 7.4 0 0 1 0 10.4" />
    </svg>
  );
}

function PlayPauseIcon({ playing }) {
  return playing
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.5v11M16 6.5v11" /></svg>
    : <VolumeIcon />;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.6v4.9l3.4 2" /></svg>;
}

export default function QuickDictionaryBubble({ language = 'vi' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [languageMode, setLanguageMode] = useState('auto');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(readHistory);
  const [audioState, setAudioState] = useState(EMPTY_AUDIO);
  const [audioRate, setAudioRate] = useState(1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const audioRef = useRef(null);
  const speechRef = useRef(null);
  const speechTickerRef = useRef(null);
  const speechStartedAtRef = useRef(0);

  const text = language === 'vi'
    ? {
        title: 'Từ điển nhanh',
        subtitle: 'Tra Anh – Việt hoặc Việt – Anh',
        placeholder: 'Nhập từ tiếng Anh hoặc tiếng Việt…',
        lookup: 'Tra cứu',
        clearQuery: 'Xóa nội dung',
        close: 'Đóng từ điển',
        open: 'Mở từ điển nhanh',
        auto: 'Tự nhận diện',
        english: 'Tiếng Anh',
        vietnamese: 'Tiếng Việt',
        introTitle: 'Tra từ ngay trên mọi trang',
        introBody: 'Nhập một từ hoặc cụm từ. Hệ thống sẽ tự nhận diện ngôn ngữ, dịch nghĩa và hiển thị phát âm, từ loại, ví dụ khi có dữ liệu.',
        loading: 'Đang tra cứu…',
        translation: 'Nghĩa dịch',
        pronunciation: 'Phát âm',
        play: 'Nghe phát âm',
        pause: 'Tạm dừng phát âm',
        audioHint: 'Nhấn để nghe cách phát âm',
        dictionaryAudio: 'Âm thanh từ điển',
        deviceVoice: 'Giọng đọc thiết bị',
        rate: 'Tốc độ phát âm',
        definitions: 'Định nghĩa',
        examples: 'Ví dụ',
        synonyms: 'Từ đồng nghĩa',
        recent: 'Tra cứu gần đây',
        clear: 'Xóa lịch sử',
        retry: 'Thử lại',
        source: 'Nguồn: Free Dictionary API, MyMemory',
        genericError: 'Chưa thể tra cứu từ này. Vui lòng kiểm tra chính tả hoặc thử chọn ngôn ngữ thủ công.',
      }
    : {
        title: 'Quick dictionary',
        subtitle: 'English – Vietnamese lookup',
        placeholder: 'Enter an English or Vietnamese word…',
        lookup: 'Look up',
        clearQuery: 'Clear query',
        close: 'Close dictionary',
        open: 'Open quick dictionary',
        auto: 'Auto detect',
        english: 'English',
        vietnamese: 'Vietnamese',
        introTitle: 'Look up words anywhere',
        introBody: 'Enter a word or phrase. The system detects the language, translates it, and shows pronunciation, parts of speech and examples when available.',
        loading: 'Looking up…',
        translation: 'Translation',
        pronunciation: 'Pronunciation',
        play: 'Play pronunciation',
        pause: 'Pause pronunciation',
        audioHint: 'Tap to hear the pronunciation',
        dictionaryAudio: 'Dictionary audio',
        deviceVoice: 'Device voice',
        rate: 'Pronunciation speed',
        definitions: 'Definitions',
        examples: 'Examples',
        synonyms: 'Synonyms',
        recent: 'Recent lookups',
        clear: 'Clear history',
        retry: 'Try again',
        source: 'Sources: Free Dictionary API, MyMemory',
        genericError: 'This entry could not be found. Check the spelling or choose the source language manually.',
      };

  const stopPlayback = (reset = true) => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (reset) audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (speechTickerRef.current) window.clearInterval(speechTickerRef.current);
    speechTickerRef.current = null;
    speechRef.current = null;
    if (reset) setAudioState(EMPTY_AUDIO);
    else setAudioState((current) => ({ ...current, playing: false }));
  };

  useEffect(() => {
    if (!open) return undefined;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    stopPlayback(true);
    audioRef.current = null;
  }, [result?.audio, result?.lookupWord, result?.query]);

  useEffect(() => () => {
    requestRef.current?.abort();
    if (audioRef.current) audioRef.current.pause();
    if (speechTickerRef.current) window.clearInterval(speechTickerRef.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = audioRate;
  }, [audioRate]);

  const addHistory = (term, mode) => {
    const next = [
      { term, mode, savedAt: Date.now() },
      ...history.filter((item) => item.term.toLocaleLowerCase() !== term.toLocaleLowerCase()),
    ].slice(0, MAX_HISTORY);
    setHistory(next);
    saveHistory(next);
  };

  const lookupTerm = async (rawTerm, mode = languageMode) => {
    const term = String(rawTerm || '').trim();
    if (!term) {
      inputRef.current?.focus();
      return;
    }

    requestRef.current?.abort();
    stopPlayback(true);
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(`/api/dictionary?q=${encodeURIComponent(term)}&lang=${encodeURIComponent(mode)}`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || text.genericError);
      setResult(payload);
      setStatus('success');
      setQuery(term);
      addHistory(term, mode);
    } catch (lookupError) {
      if (lookupError?.name === 'AbortError') return;
      setResult(null);
      setStatus('error');
      setError(lookupError?.message || text.genericError);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    lookupTerm(query);
  };

  const startSpeechTicker = (duration, initialTime = 0) => {
    if (speechTickerRef.current) window.clearInterval(speechTickerRef.current);
    speechStartedAtRef.current = Date.now() - initialTime * 1000;
    speechTickerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - speechStartedAtRef.current) / 1000;
      setAudioState((current) => ({ ...current, currentTime: Math.min(duration, elapsed) }));
    }, 80);
  };

  const playWithDeviceVoice = () => {
    const spokenText = result?.lookupWord || result?.query;
    if (!spokenText || !('speechSynthesis' in window)) return;

    if (audioState.mode === 'speech' && speechRef.current) {
      if (audioState.playing) {
        window.speechSynthesis.pause();
        if (speechTickerRef.current) window.clearInterval(speechTickerRef.current);
        speechTickerRef.current = null;
        setAudioState((current) => ({ ...current, playing: false }));
      } else {
        window.speechSynthesis.resume();
        startSpeechTicker(audioState.duration || 1.6, audioState.currentTime);
        setAudioState((current) => ({ ...current, playing: true }));
      }
      return;
    }

    window.speechSynthesis.cancel();
    const words = Math.max(1, spokenText.trim().split(/\s+/).length);
    const duration = Math.max(1.2, Math.min(8, (words * 0.72) / audioRate));
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = result?.dictionaryLanguage === 'en' ? 'en-US' : 'vi-VN';
    utterance.rate = Math.max(0.6, Math.min(1.4, 0.88 * audioRate));
    speechRef.current = utterance;
    utterance.onstart = () => {
      setAudioState({ playing: true, currentTime: 0, duration, mode: 'speech' });
      startSpeechTicker(duration, 0);
    };
    utterance.onend = () => {
      if (speechTickerRef.current) window.clearInterval(speechTickerRef.current);
      speechTickerRef.current = null;
      speechRef.current = null;
      setAudioState({ playing: false, currentTime: duration, duration, mode: 'speech' });
    };
    utterance.onerror = () => {
      if (speechTickerRef.current) window.clearInterval(speechTickerRef.current);
      speechTickerRef.current = null;
      speechRef.current = null;
      setAudioState(EMPTY_AUDIO);
    };
    window.speechSynthesis.speak(utterance);
  };

  const toggleAudio = () => {
    if (!result) return;

    if (!result.audio) {
      playWithDeviceVoice();
      return;
    }

    let audio = audioRef.current;
    if (!audio || audio.src !== result.audio) {
      if (audio) audio.pause();
      audio = new Audio(result.audio);
      audio.preload = 'metadata';
      audio.playbackRate = audioRate;
      audio.addEventListener('loadedmetadata', () => {
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 1;
        setAudioState((current) => ({ ...current, duration, mode: 'audio' }));
      });
      audio.addEventListener('timeupdate', () => {
        setAudioState((current) => ({
          ...current,
          currentTime: audio.currentTime || 0,
          duration: Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : current.duration,
          mode: 'audio',
        }));
      });
      audio.addEventListener('play', () => setAudioState((current) => ({ ...current, playing: true, mode: 'audio' })));
      audio.addEventListener('pause', () => setAudioState((current) => ({ ...current, playing: false, mode: 'audio' })));
      audio.addEventListener('ended', () => setAudioState((current) => ({ ...current, playing: false, currentTime: current.duration, mode: 'audio' })));
      audio.addEventListener('error', () => {
        audioRef.current = null;
        playWithDeviceVoice();
      });
      audioRef.current = audio;
    }

    if (audio.paused) audio.play().catch(playWithDeviceVoice);
    else audio.pause();
  };

  const seekAudio = (event) => {
    const next = Number(event.target.value || 0);
    if (audioRef.current && audioState.mode === 'audio') {
      audioRef.current.currentTime = next;
      setAudioState((current) => ({ ...current, currentTime: next }));
    }
  };

  const cycleAudioRate = () => {
    const index = AUDIO_RATES.indexOf(audioRate);
    setAudioRate(AUDIO_RATES[(index + 1) % AUDIO_RATES.length]);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const audioDuration = audioState.duration || (result?.audio ? 1 : 1.6);
  const audioProgress = Math.max(0, Math.min(1, audioDuration ? audioState.currentTime / audioDuration : 0));
  const spokenWord = result?.lookupWord || result?.query || '';

  return (
    <div ref={rootRef} className={`bes-dictionary-root${open ? ' is-open' : ''}`}>
      {open ? (
        <section className="bes-dictionary-panel" role="dialog" aria-label={text.title} aria-modal="false">
          <header className="bes-dictionary-header">
            <span className="bes-dictionary-header-icon"><DictionaryIcon /></span>
            <div>
              <strong>{text.title}</strong>
              <small>{text.subtitle}</small>
            </div>
            <button type="button" className="bes-dictionary-close" onClick={() => setOpen(false)} aria-label={text.close}>×</button>
          </header>

          <form className="bes-dictionary-form" onSubmit={handleSubmit}>
            <label className="bes-dictionary-search-field">
              <SearchIcon />
              <span className="sr-only">{text.placeholder}</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.placeholder}
                maxLength={160}
                autoComplete="off"
                spellCheck="false"
              />
              {query ? (
                <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label={text.clearQuery}>×</button>
              ) : null}
            </label>
            <div className="bes-dictionary-form-actions">
              <select value={languageMode} onChange={(event) => setLanguageMode(event.target.value)} aria-label={text.auto}>
                <option value="auto">{text.auto}</option>
                <option value="en">{text.english}</option>
                <option value="vi">{text.vietnamese}</option>
              </select>
              <button type="submit" disabled={status === 'loading' || !query.trim()}><SearchIcon />{text.lookup}</button>
            </div>
          </form>

          <div className="bes-dictionary-body" aria-live="polite">
            {status === 'idle' ? (
              <div className="bes-dictionary-welcome">
                <span><DictionaryIcon /></span>
                <strong>{text.introTitle}</strong>
                <p>{text.introBody}</p>
              </div>
            ) : null}

            {status === 'loading' ? (
              <div className="bes-dictionary-loading">
                <i aria-hidden="true" />
                <span>{text.loading}</span>
              </div>
            ) : null}

            {status === 'error' ? (
              <div className="bes-dictionary-error">
                <strong>{error || text.genericError}</strong>
                <button type="button" onClick={() => lookupTerm(query)}>{text.retry}</button>
              </div>
            ) : null}

            {status === 'success' && result ? (
              <article className="bes-dictionary-result">
                <section className="bes-dictionary-audio-card">
                  <div className="bes-dictionary-audio-topline">
                    <button
                      type="button"
                      className={`bes-dictionary-audio-play${audioState.playing ? ' is-playing' : ''}`}
                      onClick={toggleAudio}
                      aria-label={audioState.playing ? text.pause : text.play}
                      title={audioState.playing ? text.pause : text.play}
                    >
                      <PlayPauseIcon playing={audioState.playing} />
                    </button>
                    <div className="bes-dictionary-audio-word">
                      <span>{languageLabel(result.detectedLanguage, language)}</span>
                      <strong>{spokenWord}</strong>
                      <small>{result.phonetic || text.pronunciation}</small>
                    </div>
                    <button type="button" className="bes-dictionary-rate-chip" onClick={cycleAudioRate} aria-label={text.rate} title={text.rate}>
                      <VolumeIcon />
                      <span>{audioRate}×</span>
                    </button>
                  </div>

                  <div className="bes-dictionary-audio-timeline">
                    <span>{formatTime(audioState.currentTime)}</span>
                    <div className="bes-dictionary-waveform-wrap">
                      <div className="bes-dictionary-waveform" aria-hidden="true">
                        {WAVEFORM.map((height, index) => (
                          <i
                            key={`${height}-${index}`}
                            className={(index + 1) / WAVEFORM.length <= audioProgress ? 'is-active' : ''}
                            style={{ '--bes-wave-height': `${height}%` }}
                          />
                        ))}
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={audioDuration}
                        step="0.01"
                        value={Math.min(audioState.currentTime, audioDuration)}
                        onChange={seekAudio}
                        disabled={audioState.mode !== 'audio'}
                        aria-label={text.pronunciation}
                      />
                    </div>
                    <span>{formatTime(audioDuration)}</span>
                  </div>

                  <div className="bes-dictionary-audio-caption">
                    <span>{text.audioHint}</span>
                    <b>{result.audio ? text.dictionaryAudio : text.deviceVoice}</b>
                  </div>
                </section>

                {result.translation ? (
                  <section className="bes-dictionary-translation">
                    <small>{text.translation}</small>
                    <strong>{result.translation}</strong>
                    {Array.isArray(result.alternatives) && result.alternatives.length ? (
                      <p>{result.alternatives.join(' · ')}</p>
                    ) : null}
                  </section>
                ) : null}

                {Array.isArray(result.meanings) && result.meanings.length ? (
                  <section className="bes-dictionary-meanings-card">
                    <header>
                      <span>{text.definitions}</span>
                      <b>{result.meanings.length}</b>
                    </header>
                    <div className="bes-dictionary-meanings">
                      {result.meanings.map((meaning, meaningIndex) => (
                        <div className="bes-dictionary-meaning" key={`${meaning.partOfSpeech}-${meaningIndex}`}>
                          <h4>{meaning.partOfSpeech || text.definitions}</h4>
                          <ol>
                            {(meaning.definitions || []).map((definition, definitionIndex) => (
                              <li key={`${definition.definition}-${definitionIndex}`}>
                                <p>{definition.definition}</p>
                                {definition.example ? <em><b>{text.examples}:</b> {definition.example}</em> : null}
                              </li>
                            ))}
                          </ol>
                          {Array.isArray(meaning.synonyms) && meaning.synonyms.length ? (
                            <p className="bes-dictionary-synonyms"><b>{text.synonyms}:</b> {meaning.synonyms.join(', ')}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <footer>{text.source}</footer>
                  </section>
                ) : (
                  <footer className="bes-dictionary-source-only">{text.source}</footer>
                )}
              </article>
            ) : null}
          </div>

          {history.length ? (
            <footer className="bes-dictionary-history">
              <div>
                <strong>{text.recent}</strong>
                <button type="button" onClick={clearHistory}>{text.clear}</button>
              </div>
              <nav aria-label={text.recent}>
                {history.map((item) => (
                  <button type="button" key={`${item.term}-${item.savedAt}`} onClick={() => {
                    setQuery(item.term);
                    setLanguageMode(item.mode || 'auto');
                    lookupTerm(item.term, item.mode || 'auto');
                  }}><ClockIcon />{item.term}</button>
                ))}
              </nav>
            </footer>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        className="bes-dictionary-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? text.close : text.open}
        title={open ? text.close : text.open}
      >
        <DictionaryIcon />
      </button>
    </div>
  );
}
