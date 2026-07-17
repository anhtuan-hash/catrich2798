import React, { useEffect, useMemo, useRef, useState } from 'react';
import './IndependentAIChatbot.css';

const STORAGE_KEY = 'brian-independent-ai-chatbot-url';

function readConfiguredUrl() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)?.trim();
    if (saved) return saved;
  } catch {
    // Local storage may be unavailable in private or restricted browsing modes.
  }
  return String(import.meta.env?.VITE_INDEPENDENT_CHATBOT_URL || '').trim();
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('empty');
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
  return parsed.toString();
}

function getHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export default function IndependentAIChatbot({ language = 'vi' }) {
  const vi = language === 'vi';
  const initialUrl = useMemo(() => readConfiguredUrl(), []);
  const frameShellRef = useRef(null);
  const [chatbotUrl, setChatbotUrl] = useState(initialUrl);
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [editing, setEditing] = useState(!initialUrl);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(Boolean(initialUrl));
  const [slowLoad, setSlowLoad] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading) return undefined;
    setSlowLoad(false);
    const timer = window.setTimeout(() => setSlowLoad(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loading, frameKey, chatbotUrl]);

  const saveUrl = (event) => {
    event.preventDefault();
    try {
      const normalized = normalizeUrl(draftUrl);
      try {
        window.localStorage.setItem(STORAGE_KEY, normalized);
      } catch {
        // The active session still works when persistent storage is unavailable.
      }
      setChatbotUrl(normalized);
      setDraftUrl(normalized);
      setEditing(false);
      setLoading(true);
      setSlowLoad(false);
      setFrameKey((current) => current + 1);
      setMessage(vi ? 'Đã lưu website chatbot độc lập.' : 'Independent chatbot website saved.');
    } catch {
      setMessage(vi ? 'Hãy nhập một địa chỉ website hợp lệ bắt đầu bằng http:// hoặc https://.' : 'Enter a valid website address beginning with http:// or https://.');
    }
  };

  const removeUrl = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors and clear the active session.
    }
    setChatbotUrl('');
    setDraftUrl('');
    setEditing(true);
    setLoading(false);
    setSlowLoad(false);
    setMessage(vi ? 'Đã xoá cấu hình chatbot khỏi trình duyệt này.' : 'Chatbot configuration removed from this browser.');
  };

  const reloadFrame = () => {
    if (!chatbotUrl) return;
    setLoading(true);
    setSlowLoad(false);
    setFrameKey((current) => current + 1);
  };

  const openExternal = () => {
    if (!chatbotUrl) return;
    window.open(chatbotUrl, '_blank', 'noopener,noreferrer');
  };

  const openFullscreen = async () => {
    if (!frameShellRef.current?.requestFullscreen) return;
    try {
      await frameShellRef.current.requestFullscreen();
    } catch {
      setMessage(vi ? 'Trình duyệt không cho phép mở toàn màn hình lúc này.' : 'The browser could not enter full screen.');
    }
  };

  return (
    <div className="independent-chatbot-page">
      <section className="independent-chatbot-hero">
        <div className="independent-chatbot-title">
          <span className="independent-chatbot-kicker">INDEPENDENT AI APP</span>
          <h1>{vi ? 'Chatbot AI độc lập' : 'Independent AI Chatbot'}</h1>
          <p>
            {vi
              ? 'Website chatbot chạy trong vùng riêng, không sử dụng API key, lịch sử trò chuyện hay cơ chế AI của Brian.'
              : 'The chatbot website runs in its own isolated area without using Brian’s API key, chat history or AI gateway.'}
          </p>
        </div>
        <div className="independent-chatbot-badges" aria-label={vi ? 'Trạng thái tích hợp' : 'Integration status'}>
          <span><b>01</b>{vi ? 'Website riêng' : 'Separate website'}</span>
          <span><b>02</b>{vi ? 'API riêng' : 'Separate API'}</span>
          <span><b>03</b>{vi ? 'Dữ liệu riêng' : 'Separate data'}</span>
        </div>
      </section>

      {editing ? (
        <form className="independent-chatbot-config" onSubmit={saveUrl}>
          <div className="independent-chatbot-config-copy">
            <span>{vi ? 'CẤU HÌNH MỘT LẦN' : 'ONE-TIME SETUP'}</span>
            <h2>{vi ? 'Dán địa chỉ website chatbot' : 'Paste the chatbot website address'}</h2>
            <p>
              {vi
                ? 'Brian chỉ lưu URL trên trình duyệt này. Chatbot vẫn đăng nhập, lưu dữ liệu và gọi AI bằng hệ thống của chính nó.'
                : 'Brian stores only the URL in this browser. The chatbot keeps its own login, data and AI requests.'}
            </p>
          </div>
          <div className="independent-chatbot-config-fields">
            <label htmlFor="independent-chatbot-url">{vi ? 'URL website chatbot' : 'Chatbot website URL'}</label>
            <div className="independent-chatbot-url-row">
              <input
                id="independent-chatbot-url"
                value={draftUrl}
                onChange={(event) => setDraftUrl(event.target.value)}
                placeholder="https://your-chatbot.vercel.app"
                inputMode="url"
                autoComplete="url"
                spellCheck="false"
              />
              <button type="submit" className="independent-chatbot-primary">
                {chatbotUrl ? (vi ? 'Lưu & tải lại' : 'Save & reload') : (vi ? 'Kết nối chatbot' : 'Connect chatbot')}
              </button>
            </div>
            <div className="independent-chatbot-config-actions">
              {chatbotUrl ? <button type="button" onClick={() => setEditing(false)}>{vi ? 'Huỷ' : 'Cancel'}</button> : null}
              {chatbotUrl ? <button type="button" className="danger" onClick={removeUrl}>{vi ? 'Xoá cấu hình' : 'Remove configuration'}</button> : null}
            </div>
          </div>
        </form>
      ) : null}

      {message ? <p className="independent-chatbot-message" role="status">{message}</p> : null}

      {chatbotUrl ? (
        <section className="independent-chatbot-workspace">
          <header className="independent-chatbot-toolbar">
            <div className="independent-chatbot-site">
              <span className="independent-chatbot-live-dot" aria-hidden="true" />
              <div>
                <small>{vi ? 'ĐANG NHÚNG WEBSITE' : 'EMBEDDED WEBSITE'}</small>
                <strong>{getHostname(chatbotUrl)}</strong>
              </div>
            </div>
            <div className="independent-chatbot-toolbar-actions">
              <button type="button" onClick={() => { setDraftUrl(chatbotUrl); setEditing(true); }}>{vi ? 'Đổi website' : 'Change website'}</button>
              <button type="button" onClick={reloadFrame}>{vi ? 'Tải lại' : 'Reload'}</button>
              <button type="button" onClick={openFullscreen}>{vi ? 'Toàn màn hình' : 'Full screen'}</button>
              <button type="button" className="independent-chatbot-open" onClick={openExternal}>{vi ? 'Mở cửa sổ riêng ↗' : 'Open separately ↗'}</button>
            </div>
          </header>

          <div ref={frameShellRef} className="independent-chatbot-frame-shell">
            {loading ? (
              <div className="independent-chatbot-loading" aria-live="polite">
                <span aria-hidden="true" />
                <strong>{vi ? 'Đang mở chatbot…' : 'Opening chatbot…'}</strong>
                <p>{vi ? 'Website đang được tải từ hệ thống độc lập.' : 'The website is loading from its independent system.'}</p>
              </div>
            ) : null}

            <iframe
              key={`${chatbotUrl}-${frameKey}`}
              title={vi ? 'Website Chatbot AI độc lập' : 'Independent AI chatbot website'}
              src={chatbotUrl}
              allow="microphone; camera; clipboard-read; clipboard-write; fullscreen; autoplay"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads allow-modals allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => { setLoading(false); setSlowLoad(false); }}
            />

            {slowLoad ? (
              <div className="independent-chatbot-slow">
                <strong>{vi ? 'Website tải lâu hoặc chặn iframe' : 'The website is slow or may block iframe embedding'}</strong>
                <p>{vi ? 'Một số chatbot chỉ cho phép mở ở cửa sổ riêng. Nội dung và tài khoản của chatbot vẫn không liên kết với Brian.' : 'Some chatbot sites only allow a separate window. Its content and account remain disconnected from Brian.'}</p>
                <button type="button" onClick={openExternal}>{vi ? 'Mở website chatbot ↗' : 'Open chatbot website ↗'}</button>
              </div>
            ) : null}
          </div>

          <footer className="independent-chatbot-note">
            <span>i</span>
            <p>
              {vi
                ? 'Nếu màn hình trắng hoặc báo “refused to connect”, website chatbot đang chặn iframe bằng X-Frame-Options hoặc Content-Security-Policy. Khi đó hãy dùng nút “Mở cửa sổ riêng” hoặc cho phép tên miền Brian trong cấu hình của chatbot.'
                : 'A blank screen or “refused to connect” means the chatbot blocks iframe embedding through X-Frame-Options or Content-Security-Policy. Use “Open separately” or allow Brian’s domain in the chatbot configuration.'}
            </p>
          </footer>
        </section>
      ) : (
        <section className="independent-chatbot-empty">
          <div className="independent-chatbot-empty-icon">AI</div>
          <h2>{vi ? 'Chưa có website chatbot' : 'No chatbot website configured'}</h2>
          <p>{vi ? 'Nhập URL ở khung cấu hình để biến chatbot thành một ứng dụng riêng trong Brian.' : 'Enter a URL above to turn the chatbot into a separate app inside Brian.'}</p>
        </section>
      )}
    </div>
  );
}
