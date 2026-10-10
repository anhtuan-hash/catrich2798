import React, { useEffect, useState } from 'react';
import { isDepartmentLeaderRole } from '../../utils/roles.js';
import {
  getGlobalChromeSettings,
  loadGlobalChromeSettings,
  saveGlobalChromeSetting,
} from '../../utils/globalChromeSettings.js';
import './GlobalChromeSettingsPanel.css';

const TEXT = {
  vi: {
    eyebrow: 'QUẢN TRỊ GIAO DIỆN',
    title: 'Hiển thị toàn hệ thống',
    description: 'Hai công tắc dùng chung cho mọi tài khoản. Khi tắt, thành phần sẽ được gỡ khỏi giao diện; có thể bật lại bất cứ lúc nào.',
    dock: 'Brian Action Dock (sidebar)',
    dockDescription: 'Thanh truy cập nhanh bên trái và bảng Action Dock.',
    news: 'Thanh tin vắn',
    newsDescription: 'Thanh BRIAN NEWSWIRE chạy bên dưới menu chính.',
    visible: 'Đang bật',
    hidden: 'Đang tắt',
    saving: 'Đang lưu…',
    synced: 'Đồng bộ Supabase · Áp dụng cho tất cả tài khoản',
    unavailable: 'Không thể tải cấu hình từ Supabase. Hãy kiểm tra kết nối.',
    success: 'Đã cập nhật toàn hệ thống. Các tài khoản đang mở sẽ được đồng bộ.',
    failed: 'Không thể lưu thay đổi. Cấu hình trước đó vẫn được giữ nguyên.',
  },
  en: {
    eyebrow: 'INTERFACE GOVERNANCE',
    title: 'Site-wide visibility',
    description: 'These two switches apply to every account. Hidden components are unmounted and can be re-enabled at any time.',
    dock: 'Brian Action Dock (sidebar)',
    dockDescription: 'The left quick-access rail and Action Dock panel.',
    news: 'News briefing',
    newsDescription: 'The BRIAN NEWSWIRE bar below the main navigation.',
    visible: 'Enabled',
    hidden: 'Disabled',
    saving: 'Saving…',
    synced: 'Supabase synced · Applies to all accounts',
    unavailable: 'Could not retrieve settings from Supabase. Check the connection.',
    success: 'Updated site-wide. Open sessions will receive the change.',
    failed: 'Could not save. The previous setting has been preserved.',
  },
};

export default function GlobalChromeSettingsPanel({ currentUser, language = 'vi' }) {
  const authorized = isDepartmentLeaderRole(currentUser?.role);
  const t = TEXT[language === 'en' ? 'en' : 'vi'];
  const [settings, setSettings] = useState(getGlobalChromeSettings);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    if (!authorized) return undefined;
    let active = true;
    const onUpdate = (event) => { if (active) setSettings(event?.detail || getGlobalChromeSettings()); };
    window.addEventListener('bes-global-chrome-settings-updated', onUpdate);
    loadGlobalChromeSettings().then((result) => {
      if (!active) return;
      setConnected(Boolean(result.ok));
      if (!result.ok) setError(result.message || t.unavailable);
      else setError('');
      setSettings(getGlobalChromeSettings());
    });
    return () => {
      active = false;
      window.removeEventListener('bes-global-chrome-settings-updated', onUpdate);
    };
  }, [authorized]);

  if (!authorized) return null;

  const toggle = async (key) => {
    if (busy) return;
    setBusy(key);
    setError('');
    setMessage('');
    const result = await saveGlobalChromeSetting(key, !settings[key]);
    setBusy('');
    if (result.ok) {
      setConnected(true);
      setSettings(result.settings);
      setMessage(t.success);
    } else {
      setError(result.message || t.failed);
    }
  };

  return (
    <article id="settings-global-chrome" className="settings-google-card global-chrome-settings" aria-labelledby="global-chrome-title">
      <header className="global-chrome-settings__header">
        <span className="global-chrome-settings__icon" aria-hidden="true">▦</span>
        <div>
          <span className="global-chrome-settings__eyebrow">{t.eyebrow}</span>
          <h2 id="global-chrome-title">{t.title}</h2>
          <p>{t.description}</p>
        </div>
      </header>
      {[
        { key: 'showActionDock', label: t.dock, description: t.dockDescription },
        { key: 'showNewswire', label: t.news, description: t.newsDescription },
      ].map((item) => (
        <div className="global-chrome-settings__row" key={item.key}>
          <div className="global-chrome-settings__row-copy">
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </div>
          <div className="global-chrome-settings__control">
            <span className={settings[item.key] ? 'is-on' : 'is-off'}>{busy === item.key ? t.saving : settings[item.key] ? t.visible : t.hidden}</span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings[item.key])}
              aria-label={item.label}
              className={settings[item.key] ? 'global-chrome-settings__switch is-on' : 'global-chrome-settings__switch'}
              disabled={Boolean(busy) || !connected}
              onClick={() => toggle(item.key)}
            ><span /></button>
          </div>
        </div>
      ))}
      {error ? <p className="global-chrome-settings__feedback is-error" role="alert">{error}</p> : null}
      {message ? <p className="global-chrome-settings__feedback is-success" role="status">{message}</p> : null}
      <footer className="global-chrome-settings__footer"><span aria-hidden="true">●</span>{t.synced}</footer>
    </article>
  );
}
