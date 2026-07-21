import React, { useEffect, useRef, useState } from 'react';
import './IndependentAIChatbot.css';
import { isAdminRole } from '../utils/roles.js';
import {
  clearSharedChatbotSettings,
  loadSharedChatbotSettings,
  readChatbotSettingsLocal,
  saveSharedChatbotSettings,
  subscribeSharedChatbotSettings,
} from '../utils/independentChatbotSettings.js';

function getHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export default function IndependentAIChatbot({ language = 'vi', currentUser = null }) {
  const vi = language === 'vi';
  const admin = isAdminRole(currentUser?.role);
  const frameShellRef = useRef(null);
  const [settings, setSettings] = useState(() => readChatbotSettingsLocal());
  const [draftUrl, setDraftUrl] = useState(() => readChatbotSettingsLocal().url);
  const [editing, setEditing] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(Boolean(settings.url));
  const [slowLoad, setSlowLoad] = useState(false);
  const [message, setMessage] = useState('');

  const chatbotUrl = settings.url;

  useEffect(() => {
    let active = true;
    setSettingsLoading(true);
    const apply = (next) => {
      if (!active) return;
      setSettings(next);
      setDraftUrl(next.url || '');
      setLoading(Boolean(next.url));
      setFrameKey((current) => current + 1);
    };
    const unsubscribe = subscribeSharedChatbotSettings(currentUser, apply);
    loadSharedChatbotSettings(currentUser)
      .then((next) => {
        apply(next);
        if (active && admin && !next.url) setEditing(true);
      })
      .catch((error) => {
        if (active) setMessage(vi ? `Không thể đọc cấu hình chatbot dùng chung: ${error.message || error}` : `Could not load shared chatbot settings: ${error.message || error}`);
      })
      .finally(() => { if (active) setSettingsLoading(false); });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role, currentUser?.provider]);

  useEffect(() => {
    if (!loading) return undefined;
    setSlowLoad(false);
    const timer = window.setTimeout(() => setSlowLoad(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loading, frameKey, chatbotUrl]);

  const saveUrl = async (event) => {
    event.preventDefault();
    if (!admin || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const result = await saveSharedChatbotSettings(currentUser, draftUrl);
      setSettings(result.settings);
      setDraftUrl(result.settings.url);
      setEditing(false);
      setLoading(true);
      setSlowLoad(false);
      setFrameKey((current) => current + 1);
      setMessage(result.cloud
        ? (vi ? 'Đã lưu website chatbot dùng chung cho toàn bộ giáo viên.' : 'Shared chatbot website saved for all teachers.')
        : (vi ? 'Đã lưu cấu hình trên thiết bị này. Cần Supabase để đồng bộ giữa các tài khoản.' : 'Saved on this device. Supabase is required for cross-account sync.'));
    } catch (error) {
      const detail = String(error?.message || error || '');
      setMessage(vi
        ? `Không thể lưu cấu hình dùng chung. Hãy bảo đảm đã chạy file supabase/brian_shared_chatbot_settings.sql. ${detail}`
        : `Could not save shared settings. Make sure supabase/brian_shared_chatbot_settings.sql has been applied. ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const removeUrl = async () => {
    if (!admin || saving) return;
    if (!window.confirm(vi ? 'Xoá website chatbot dùng chung cho tất cả giáo viên?' : 'Remove the shared chatbot website for every teacher?')) return;
    setSaving(true);
    setMessage('');
    try {
      const result = await clearSharedChatbotSettings(currentUser);
      setSettings(result.settings);
      setDraftUrl('');
      setEditing(true);
      setLoading(false);
      setSlowLoad(false);
      setMessage(vi ? 'Đã xoá cấu hình chatbot dùng chung.' : 'Shared chatbot configuration removed.');
    } catch (error) {
      setMessage(vi ? `Không thể xoá cấu hình dùng chung: ${error.message || error}` : `Could not remove shared settings: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
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
          <span className="independent-chatbot-kicker">SHARED INDEPENDENT AI APP</span>
          <h1>{vi ? 'Chatbot AI đa nền tảng' : 'Cross-platform AI Chatbot'}</h1>
          <p>
            {vi
              ? 'Quản trị viên chọn website chatbot dùng chung. Giáo viên chỉ sử dụng cấu hình đã được quản trị viên phê duyệt.'
              : 'An administrator selects the shared chatbot website. Teachers only use the administrator-approved configuration.'}
          </p>
        </div>
        <div className="independent-chatbot-badges" aria-label={vi ? 'Trạng thái tích hợp' : 'Integration status'}>
          <span><b>01</b>{vi ? 'Website riêng' : 'Separate website'}</span>
          <span><b>02</b>{vi ? 'Cấu hình dùng chung' : 'Shared configuration'}</span>
          <span><b>03</b>{admin ? (vi ? 'Admin quản lý' : 'Admin managed') : (vi ? 'Giáo viên sử dụng' : 'Teacher access')}</span>
        </div>
      </section>

      {admin && editing ? (
        <form className="independent-chatbot-config" onSubmit={saveUrl}>
          <div className="independent-chatbot-config-copy">
            <span>{vi ? 'CHỈ TÀI KHOẢN QUẢN TRỊ' : 'ADMINISTRATORS ONLY'}</span>
            <h2>{vi ? 'Cấu hình website chatbot dùng chung' : 'Configure the shared chatbot website'}</h2>
            <p>
              {vi
                ? 'URL được đồng bộ qua Supabase. Mọi tài khoản giáo viên sẽ tự nhận đúng website này và không có quyền thay đổi.'
                : 'The URL is synchronized through Supabase. Every teacher account receives this website and cannot change it.'}
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
                disabled={saving}
              />
              <button type="submit" className="independent-chatbot-primary" disabled={saving}>
                {saving ? (vi ? 'Đang lưu…' : 'Saving…') : chatbotUrl ? (vi ? 'Lưu cho toàn hệ thống' : 'Save for everyone') : (vi ? 'Kết nối chatbot' : 'Connect chatbot')}
              </button>
            </div>
            <div className="independent-chatbot-config-actions">
              {chatbotUrl ? <button type="button" disabled={saving} onClick={() => { setDraftUrl(chatbotUrl); setEditing(false); }}>{vi ? 'Huỷ' : 'Cancel'}</button> : null}
              {chatbotUrl ? <button type="button" disabled={saving} className="danger" onClick={removeUrl}>{vi ? 'Xoá cấu hình dùng chung' : 'Remove shared configuration'}</button> : null}
            </div>
          </div>
        </form>
      ) : null}

      {!admin && chatbotUrl ? (
        <div className="independent-chatbot-message" role="status">
          {vi ? 'Cấu hình này do tài khoản quản trị quản lý. Tài khoản giáo viên chỉ có quyền sử dụng chatbot.' : 'This configuration is managed by an administrator. Teacher accounts can only use the chatbot.'}
        </div>
      ) : null}

      {message ? <p className="independent-chatbot-message" role="status">{message}</p> : null}

      {settingsLoading ? (
        <section className="independent-chatbot-empty">
          <div className="independent-chatbot-empty-icon">AI</div>
          <h2>{vi ? 'Đang đọc cấu hình quản trị…' : 'Loading administrator settings…'}</h2>
          <p>{vi ? 'Brian đang đồng bộ website chatbot dùng chung.' : 'Brian is synchronizing the shared chatbot website.'}</p>
        </section>
      ) : chatbotUrl ? (
        <section className="independent-chatbot-workspace">
          <header className="independent-chatbot-toolbar">
            <div className="independent-chatbot-site">
              <span className="independent-chatbot-live-dot" aria-hidden="true" />
              <div>
                <small>{vi ? 'CHATBOT DÙNG CHUNG' : 'SHARED CHATBOT'}</small>
                <strong>{getHostname(chatbotUrl)}</strong>
              </div>
            </div>
            <div className="independent-chatbot-toolbar-actions">
              {admin ? <button type="button" onClick={() => { setDraftUrl(chatbotUrl); setEditing(true); }}>{vi ? 'Cấu hình website' : 'Configure website'}</button> : null}
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
              title={vi ? 'Website Chatbot AI đa nền tảng' : 'Cross-platform AI chatbot website'}
              src={chatbotUrl}
              allow="microphone; camera; clipboard-read; clipboard-write; fullscreen; autoplay"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads allow-modals allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => { setLoading(false); setSlowLoad(false); }}
            />

            {slowLoad ? (
              <div className="independent-chatbot-slow">
                <strong>{vi ? 'Website tải lâu hoặc chặn iframe' : 'The website is slow or may block iframe embedding'}</strong>
                <p>{vi ? 'Một số chatbot chỉ cho phép mở ở cửa sổ riêng. Hãy dùng nút bên dưới để tiếp tục.' : 'Some chatbot sites only allow a separate window. Use the button below to continue.'}</p>
                <button type="button" onClick={openExternal}>{vi ? 'Mở website chatbot ↗' : 'Open chatbot website ↗'}</button>
              </div>
            ) : null}
          </div>

          <footer className="independent-chatbot-note">
            <span>i</span>
            <p>
              {vi
                ? 'Brian đồng bộ URL do quản trị viên thiết lập. Phiên đăng nhập bên trong website chatbot vẫn do chính website đó quản lý theo giới hạn bảo mật của trình duyệt.'
                : 'Brian synchronizes the administrator-selected URL. Sign-in sessions inside the chatbot website remain controlled by that website under browser security rules.'}
            </p>
          </footer>
        </section>
      ) : (
        <section className="independent-chatbot-empty">
          <div className="independent-chatbot-empty-icon">AI</div>
          <h2>{admin ? (vi ? 'Chưa có website chatbot' : 'No chatbot website configured') : (vi ? 'Quản trị viên chưa cấu hình chatbot' : 'The administrator has not configured the chatbot')}</h2>
          <p>{admin
            ? (vi ? 'Nhập URL ở khung cấu hình để cấp chatbot dùng chung cho giáo viên.' : 'Enter a URL above to provide a shared chatbot for teachers.')
            : (vi ? 'Tài khoản giáo viên không thể tự thêm hoặc đổi website. Hãy liên hệ quản trị viên.' : 'Teacher accounts cannot add or change the website. Contact an administrator.')}</p>
        </section>
      )}
    </div>
  );
}
