import React, { useEffect, useMemo, useState } from 'react';
import './TextLabExternalAISidebar.css';

const PLATFORMS = Object.freeze({
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    shortName: 'ChatGPT',
    url: 'https://chatgpt.com/',
    domain: 'chatgpt.com',
    mark: '◎',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    url: 'https://gemini.google.com/app',
    domain: 'gemini.google.com',
    mark: '✦',
  },
});

function createBrowserState(platform) {
  return {
    history: [PLATFORMS[platform].url],
    index: 0,
    reloadKey: 0,
  };
}

function normaliseAddress(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function BrowserMark({ platform }) {
  const item = PLATFORMS[platform];
  return <span className={`textlab-browser-mark ${platform}`} aria-hidden="true">{item.mark}</span>;
}

export default function TextLabExternalAISidebar({
  language = 'vi',
  open = true,
  onToggle,
}) {
  const vi = language === 'vi';
  const [platform, setPlatform] = useState('chatgpt');
  const [browser, setBrowser] = useState(() => ({
    chatgpt: createBrowserState('chatgpt'),
    gemini: createBrowserState('gemini'),
  }));
  const [address, setAddress] = useState(PLATFORMS.chatgpt.url);
  const [loading, setLoading] = useState({ chatgpt: true, gemini: true });

  const activeBrowser = browser[platform];
  const currentUrl = activeBrowser.history[activeBrowser.index];
  const canGoBack = activeBrowser.index > 0;
  const canGoForward = activeBrowser.index < activeBrowser.history.length - 1;

  useEffect(() => {
    setAddress(currentUrl);
  }, [currentUrl, platform]);

  const updateActive = (updater) => {
    setBrowser((current) => ({
      ...current,
      [platform]: updater(current[platform]),
    }));
  };

  const navigate = (nextUrl) => {
    const safeUrl = normaliseAddress(nextUrl, PLATFORMS[platform].url);
    updateActive((state) => {
      const history = state.history.slice(0, state.index + 1);
      if (history[history.length - 1] !== safeUrl) history.push(safeUrl);
      return {
        ...state,
        history,
        index: history.length - 1,
        reloadKey: state.reloadKey + 1,
      };
    });
    setLoading((current) => ({ ...current, [platform]: true }));
  };

  const submitAddress = (event) => {
    event.preventDefault();
    navigate(address);
  };

  const goBack = () => {
    if (!canGoBack) return;
    updateActive((state) => ({ ...state, index: state.index - 1, reloadKey: state.reloadKey + 1 }));
    setLoading((current) => ({ ...current, [platform]: true }));
  };

  const goForward = () => {
    if (!canGoForward) return;
    updateActive((state) => ({ ...state, index: state.index + 1, reloadKey: state.reloadKey + 1 }));
    setLoading((current) => ({ ...current, [platform]: true }));
  };

  const reload = () => {
    updateActive((state) => ({ ...state, reloadKey: state.reloadKey + 1 }));
    setLoading((current) => ({ ...current, [platform]: true }));
  };

  const goHome = () => navigate(PLATFORMS[platform].url);

  const platformFrames = useMemo(() => Object.keys(PLATFORMS), []);

  return (
    <>
      <aside
        className={`textlab-browser-sidebar ${open ? 'is-visible' : 'is-hidden'}`}
        aria-label={vi ? 'Trình duyệt AI bên ngoài' : 'External AI browser'}
        aria-hidden={!open}
      >
        <div className="textlab-browser-titlebar">
          <div>
            <span>EXTERNAL AI BROWSER</span>
            <strong>{vi ? 'Trợ lý AI bên ngoài' : 'External AI assistant'}</strong>
          </div>
          <button type="button" onClick={onToggle} title={vi ? 'Ẩn thanh bên' : 'Hide sidebar'}>
            <span aria-hidden="true">»</span>{vi ? 'Ẩn thanh bên' : 'Hide sidebar'}
          </button>
        </div>

        <div className="textlab-browser-tabs" role="tablist" aria-label={vi ? 'Nền tảng AI' : 'AI platforms'}>
          {platformFrames.map((id) => {
            const item = PLATFORMS[id];
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={platform === id}
                className={platform === id ? 'is-active' : ''}
                onClick={() => setPlatform(id)}
              >
                <BrowserMark platform={id} />
                <span><strong>{item.name}</strong><small>{item.domain}</small></span>
              </button>
            );
          })}
        </div>

        <div className="textlab-browser-toolbar" aria-label={vi ? 'Điều khiển trình duyệt' : 'Browser controls'}>
          <button type="button" onClick={goBack} disabled={!canGoBack} title={vi ? 'Quay lại' : 'Back'} aria-label={vi ? 'Quay lại' : 'Back'}>←</button>
          <button type="button" onClick={goForward} disabled={!canGoForward} title={vi ? 'Đi tới' : 'Forward'} aria-label={vi ? 'Đi tới' : 'Forward'}>→</button>
          <button type="button" onClick={reload} title={vi ? 'Tải lại' : 'Reload'} aria-label={vi ? 'Tải lại' : 'Reload'}>↻</button>
          <button type="button" onClick={goHome} title={vi ? 'Trang chủ nền tảng' : 'Platform home'} aria-label={vi ? 'Trang chủ nền tảng' : 'Platform home'}>⌂</button>
          <form onSubmit={submitAddress}>
            <span aria-hidden="true">🔒</span>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              onFocus={(event) => event.target.select()}
              aria-label={vi ? 'Địa chỉ website' : 'Website address'}
              spellCheck="false"
            />
          </form>
          <button
            type="button"
            className="external-fallback"
            onClick={() => window.open(currentUrl, '_blank', 'noopener,noreferrer')}
            title={vi ? 'Mở cửa sổ riêng khi nền tảng không cho phép nhúng' : 'Open separately if embedding is blocked'}
            aria-label={vi ? 'Mở cửa sổ riêng' : 'Open separately'}
          >↗</button>
        </div>

        <div className="textlab-browser-viewport">
          {loading[platform] ? (
            <div className="textlab-browser-loading" aria-live="polite">
              <span />
              <strong>{vi ? `Đang kết nối ${PLATFORMS[platform].name}…` : `Connecting to ${PLATFORMS[platform].name}…`}</strong>
            </div>
          ) : null}

          {platformFrames.map((id) => {
            const state = browser[id];
            const src = state.history[state.index];
            return (
              <iframe
                key={`${id}:${state.reloadKey}`}
                className={platform === id ? 'is-active' : ''}
                title={`${PLATFORMS[id].name} embedded browser`}
                src={src}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
                onLoad={() => setLoading((current) => ({ ...current, [id]: false }))}
              />
            );
          })}
        </div>

        <div className="textlab-browser-statusbar">
          <span><i className={loading[platform] ? 'is-loading' : ''} />{loading[platform] ? (vi ? 'Đang tải' : 'Loading') : (vi ? 'Đã kết nối' : 'Connected')}</span>
          <p>{vi
            ? 'ChatGPT hoặc Gemini có thể chặn iframe theo chính sách của nhà cung cấp. Khi đó dùng nút ↗ ở thanh địa chỉ.'
            : 'ChatGPT or Gemini may block iframe embedding. Use the ↗ button when that happens.'}</p>
        </div>
      </aside>

      {!open ? (
        <button
          type="button"
          className="textlab-browser-reopen"
          onClick={onToggle}
          aria-label={vi ? 'Hiện trình duyệt AI' : 'Show AI browser'}
        >
          <span>AI</span>
          <b>{vi ? 'Mở trợ lý' : 'Open assistant'}</b>
          <i aria-hidden="true">‹</i>
        </button>
      ) : null}
    </>
  );
}
