import React, { useEffect, useRef, useState } from 'react';
import './QuickDictionaryBubble.css';

const HISTORY_KEY = 'bes-quick-dictionary-history-v1';
const MAX_HISTORY = 6;

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

function DictionaryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.2 4.2h8.1a3.4 3.4 0 0 1 3.4 3.4v11H8.6a3.4 3.4 0 0 0-3.4 1.2V4.2Z" />
      <path d="M18.8 6.3h.1v12.3H9.5a3.4 3.4 0 0 0-3.1 1.9" />
      <path d="M8.4 8.3h5.2M8.4 11.4h4" />
    </svg>
  );
}

export default function QuickDictionaryBubble({ language = 'vi' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [languageMode, setLanguageMode] = useState('auto');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(readHistory);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);

  const text = language === 'vi'
    ? {
        title: 'Từ điển nhanh',
        subtitle: 'Tra Anh – Việt hoặc Việt – Anh',
        placeholder: 'Nhập từ tiếng Anh hoặc tiếng Việt…',
        lookup: 'Tra cứu',
        close: 'Đóng từ điển',
        open: 'Mở từ điển nhanh',
        auto: 'Tự nhận diện',
        english: 'Tiếng Anh',
        vietnamese: 'Tiếng Việt',
        introTitle: 'Tra từ ngay trên mọi trang',
        introBody: 'Nhập một từ hoặc cụm từ. Brian sẽ tự nhận diện ngôn ngữ, dịch nghĩa và hiển thị phát âm, từ loại, ví dụ khi có dữ liệu.',
        loading: 'Đang tra cứu…',
        translation: 'Nghĩa dịch',
        pronunciation: 'Phát âm',
        play: 'Nghe phát âm',
        definitions: 'Định nghĩa',
        examples: 'Ví dụ',
        synonyms: 'Từ đồng nghĩa',
        recent: 'Tra cứu gần đây',
        clear: 'Xóa lịch sử',
        retry: 'Thử lại',
        source: 'Nguồn tham khảo: Free Dictionary API và MyMemory.',
        genericError: 'Chưa thể tra cứu từ này. Vui lòng kiểm tra chính tả hoặc thử chọn ngôn ngữ thủ công.',
      }
    : {
        title: 'Quick dictionary',
        subtitle: 'English – Vietnamese lookup',
        placeholder: 'Enter an English or Vietnamese word…',
        lookup: 'Look up',
        close: 'Close dictionary',
        open: 'Open quick dictionary',
        auto: 'Auto detect',
        english: 'English',
        vietnamese: 'Vietnamese',
        introTitle: 'Look up words anywhere',
        introBody: 'Enter a word or phrase. Brian detects the language, translates it, and shows pronunciation, parts of speech and examples when available.',
        loading: 'Looking up…',
        translation: 'Translation',
        pronunciation: 'Pronunciation',
        play: 'Play pronunciation',
        definitions: 'Definitions',
        examples: 'Examples',
        synonyms: 'Synonyms',
        recent: 'Recent lookups',
        clear: 'Clear history',
        retry: 'Try again',
        source: 'Reference sources: Free Dictionary API and MyMemory.',
        genericError: 'This entry could not be found. Check the spelling or choose the source language manually.',
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

  useEffect(() => () => requestRef.current?.abort(), []);

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

  const speak = () => {
    const spokenText = result?.lookupWord || result?.query;
    if (!spokenText) return;

    const fallbackSpeech = () => {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = result?.dictionaryLanguage === 'en' ? 'en-US' : 'vi-VN';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    };

    if (result?.audio) {
      const audio = new Audio(result.audio);
      audio.play().catch(fallbackSpeech);
      return;
    }
    fallbackSpeech();
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

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
            <label>
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
            </label>
            <div className="bes-dictionary-form-actions">
              <select value={languageMode} onChange={(event) => setLanguageMode(event.target.value)} aria-label={text.auto}>
                <option value="auto">{text.auto}</option>
                <option value="en">{text.english}</option>
                <option value="vi">{text.vietnamese}</option>
              </select>
              <button type="submit" disabled={status === 'loading' || !query.trim()}>{text.lookup}</button>
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
                <div className="bes-dictionary-word-row">
                  <div>
                    <span>{languageLabel(result.detectedLanguage, language)}</span>
                    <h3>{result.query}</h3>
                    {result.lookupWord && result.lookupWord.toLocaleLowerCase() !== result.query.toLocaleLowerCase()
                      ? <small>{result.lookupWord}</small>
                      : null}
                  </div>
                  <button type="button" className="bes-dictionary-speak" onClick={speak} aria-label={text.play} title={text.play}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="M16 9.2a4 4 0 0 1 0 5.6M18.4 6.8a7.4 7.4 0 0 1 0 10.4" /></svg>
                  </button>
                </div>

                {result.translation ? (
                  <section className="bes-dictionary-translation">
                    <small>{text.translation}</small>
                    <strong>{result.translation}</strong>
                    {Array.isArray(result.alternatives) && result.alternatives.length ? (
                      <p>{result.alternatives.join(' · ')}</p>
                    ) : null}
                  </section>
                ) : null}

                {result.phonetic ? (
                  <div className="bes-dictionary-pronunciation">
                    <span>{text.pronunciation}</span>
                    <b>{result.phonetic}</b>
                  </div>
                ) : null}

                {Array.isArray(result.meanings) && result.meanings.length ? (
                  <section className="bes-dictionary-meanings">
                    <h4>{text.definitions}</h4>
                    {result.meanings.map((meaning, meaningIndex) => (
                      <div className="bes-dictionary-meaning" key={`${meaning.partOfSpeech}-${meaningIndex}`}>
                        <span>{meaning.partOfSpeech || text.definitions}</span>
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
                  </section>
                ) : null}

                <footer>{text.source}</footer>
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
                  }}>{item.term}</button>
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
