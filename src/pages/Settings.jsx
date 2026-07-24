import React, { useMemo, useRef, useState } from 'react';
import { changeCurrentPassword } from '../utils/auth.js';
import '../styles/SettingsGoogleM3.css';

const DEFAULT_MUSIC_SETTINGS = {
  enabled: false,
  expanded: false,
  trackMode: 'default',
  customUrl: '',
  uploadName: '',
  volume: 0.42,
  loop: true,
};

const ICON_PATHS = {
  search: 'M9.5 3a6.5 6.5 0 1 0 4.06 11.58L19 20l1-1-5.42-5.44A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z',
  palette: 'M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h4.3A4.7 4.7 0 0 0 21 7.3C21 4.92 17 3 12 3ZM7 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  bell: 'M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-5-2-2v-4a5 5 0 0 0-4-4.9V5a1 1 0 1 0-2 0v1.1A5 5 0 0 0 7 11v4l-2 2v1h14v-1Z',
  sync: 'M17.65 6.35A7.95 7.95 0 0 0 5.2 8H2l4 4 4-4H7.22a6 6 0 0 1 9.02-.24L18 6l-.35.35ZM14 12l4 4h-3.22a6 6 0 0 1-9.02.24L4 18l.35-.35A7.95 7.95 0 0 0 18.8 16H22l-4-4-4 4h2.78A6 6 0 0 1 7.76 16.24L6 18l.35-.35A7.95 7.95 0 0 0 18.8 16H22l-4-4-4 4Z',
  shield: 'm12 2 8 3v6c0 5.05-3.41 9.77-8 11-4.59-1.23-8-5.95-8-11V5l8-3Zm0 3.12L6 7.37V11c0 3.87 2.47 7.55 6 8.75 3.53-1.2 6-4.88 6-8.75V7.37l-6-2.25Z',
  settings: 'M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58-2-3.46-2.39.96a7.1 7.1 0 0 0-1.62-.94L14.8 3.5h-4l-.36 2.54c-.58.23-1.12.54-1.62.94l-2.39-.96-2 3.46 2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58 2 3.46 2.39-.96c.5.4 1.04.71 1.62.94l.36 2.54h4l.35-2.54c.58-.23 1.12-.54 1.62-.94l2.39.96 2-3.46-2.02-1.58ZM12.8 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
  volume: 'M4 9v6h4l5 4V5L8 9H4Zm11.5 3a3.5 3.5 0 0 0-2-3.16v6.32A3.5 3.5 0 0 0 15.5 12Zm-2-8.5v2.06a7 7 0 0 1 0 12.88v2.06a9 9 0 0 0 0-17Z',
  speed: 'M12 4a9 9 0 0 0-9 9c0 2.3.86 4.4 2.27 6h13.46A8.96 8.96 0 0 0 21 13a9 9 0 0 0-9-9Zm0 2a7 7 0 0 1 6.92 8H17a5.05 5.05 0 0 0-.64-1.94l1.36-1.36-1.42-1.42-1.36 1.36A5.05 5.05 0 0 0 13 10V8h-2v2a5 5 0 0 0-4 4H5.08A7 7 0 0 1 12 6Zm-1 7h2v4h-2v-4Z',
  help: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-.1-5.1h1.9v2h-1.9v-2Zm.1-8.3c2.1 0 3.5 1.18 3.5 3 0 1.45-.78 2.18-1.8 2.84-.88.57-1.2.92-1.2 1.76h-1.8c0-1.4.55-2.05 1.65-2.77.84-.55 1.25-.95 1.25-1.73 0-.85-.65-1.45-1.65-1.45-1.08 0-1.72.58-1.83 1.62H8.25C8.4 7.85 9.85 6.6 12 6.6Z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5h1v3h-2V2h1Zm0 17h1v3h-2v-3h1ZM2 11h3v2H2v-2Zm17 0h3v2h-3v-2ZM4.22 5.64l1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12Zm12.02 12.02 1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12ZM18.36 4.22l1.42 1.42-2.12 2.12-1.42-1.42 2.12-2.12ZM6.34 16.24l1.42 1.42-2.12 2.12-1.42-1.42 2.12-2.12Z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.92 9h-3.04a15.7 15.7 0 0 0-1.38-5.05A8.03 8.03 0 0 1 18.92 11ZM12 4c.83 1.2 1.56 3.23 1.83 7h-3.66C10.44 7.23 11.17 5.2 12 4ZM9.5 5.95A15.7 15.7 0 0 0 8.12 11H5.08A8.03 8.03 0 0 1 9.5 5.95ZM5.08 13h3.04c.2 1.94.68 3.7 1.38 5.05A8.03 8.03 0 0 1 5.08 13ZM12 20c-.83-1.2-1.56-3.23-1.83-7h3.66C13.56 16.77 12.83 18.8 12 20Zm2.5-1.95A15.7 15.7 0 0 0 15.88 13h3.04a8.03 8.03 0 0 1-4.42 5.05Z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-13h-2v6l5 3 1-1.73-4-2.27V7Z',
  storage: 'M12 3C7.03 3 3 4.34 3 6s4.03 3 9 3 9-1.34 9-3-4.03-3-9-3Zm-9 6v4c0 1.66 4.03 3 9 3s9-1.34 9-3V9c-1.96 1.4-5.55 2-9 2S4.96 10.4 3 9Zm0 7v2c0 1.66 4.03 3 9 3s9-1.34 9-3v-2c-1.96 1.4-5.55 2-9 2s-7.04-.6-9-2Z',
};

function M3Icon({ name, size = 22 }) {
  return (
    <svg className="settings-m3-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={ICON_PATHS[name] || ICON_PATHS.settings} />
    </svg>
  );
}

function userKey(currentUser) {
  return currentUser?.id || currentUser?.email || 'guest';
}

function musicStorageKey(currentUser) {
  return `bes-global-music-v1:${userKey(currentUser)}`;
}

function readMusicSettings(currentUser) {
  try {
    return { ...DEFAULT_MUSIC_SETTINGS, ...JSON.parse(localStorage.getItem(musicStorageKey(currentUser)) || '{}') };
  } catch {
    return { ...DEFAULT_MUSIC_SETTINGS };
  }
}

function saveMusicSettings(currentUser, value) {
  try {
    localStorage.setItem(musicStorageKey(currentUser), JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('bes-global-music-settings-updated'));
  } catch {
    // Storage is optional.
  }
}

function readBoolean(key, fallback = true) {
  const value = localStorage.getItem(key);
  return value === null ? fallback : value !== 'false';
}

function writeBoolean(key, value) {
  localStorage.setItem(key, value ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('bes-system-settings-updated', { detail: { key, value } }));
}

function readText(key, fallback = '') {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function writeText(key, value) {
  try { localStorage.setItem(key, value); } catch { /* optional */ }
  window.dispatchEvent(new CustomEvent('bes-system-settings-updated', { detail: { key, value } }));
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`settings-m3-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={label}
    >
      <span />
    </button>
  );
}

function CardHeader({ icon, title, subtitle, tone = 'blue' }) {
  return (
    <header className="settings-m3-card-head">
      <span className={`settings-m3-card-icon tone-${tone}`}><M3Icon name={icon} /></span>
      <div><h2>{title}</h2><p>{subtitle}</p></div>
    </header>
  );
}

function SettingRow({ title, description, children }) {
  return (
    <div className="settings-m3-row">
      <div><strong>{title}</strong>{description ? <small>{description}</small> : null}</div>
      <div className="settings-m3-row-control">{children}</div>
    </div>
  );
}

function SelectControl({ value, onChange, children, ariaLabel }) {
  return <select className="settings-m3-select" value={value} onChange={onChange} aria-label={ariaLabel}>{children}</select>;
}

function Segmented({ value, onChange, options, ariaLabel }) {
  return (
    <div className="settings-m3-segmented" role="group" aria-label={ariaLabel}>
      {options.map(([optionValue, label]) => (
        <button key={optionValue} type="button" className={value === optionValue ? 'is-active' : ''} onClick={() => onChange(optionValue)}>{label}</button>
      ))}
    </div>
  );
}

export default function Settings({
  currentUser,
  language = 'vi', setLanguage,
  theme = 'light', setTheme,
  motionMode = 'lite', setMotionMode,
  performanceMode = 'auto', setPerformanceMode,
  resolvedPerformance = 'auto',
  themeIntensity = 'balanced', setThemeIntensity,
  tileBorder = 'soft', setTileBorder,
  indicatorMode = 'on', setIndicatorMode,
  fontScale = 100, setFontScale,
  setGlobalLoading,
}) {
  const vi = language === 'vi';
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('bes-accent-color') || 'blue');
  const [displayDensity, setDisplayDensity] = useState(() => localStorage.getItem('bes-display-density') || 'medium');
  const [soundEnabled, setSoundEnabled] = useState(() => readBoolean('bes-global-notice-sound', true));
  const [completionSound, setCompletionSound] = useState(() => readBoolean('bes-completion-sound', true));
  const [hapticFeedback, setHapticFeedback] = useState(() => readBoolean('bes-haptic-feedback', false));
  const [pushNotifications, setPushNotifications] = useState(() => readBoolean('bes-push-notifications', true));
  const [emailNotifications, setEmailNotifications] = useState(() => readBoolean('bes-email-notifications', false));
  const [studyReminders, setStudyReminders] = useState(() => readBoolean('bes-study-reminders', true));
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(() => readBoolean('bes-global-notice-live-sync', true));
  const [dataSyncEnabled, setDataSyncEnabled] = useState(() => readBoolean('bes-global-data-sync', true));
  const [wifiOnly, setWifiOnly] = useState(() => readBoolean('bes-sync-wifi-only', true));
  const [activeStatus, setActiveStatus] = useState(() => readBoolean('bes-active-status', true));
  const [emailDiscovery, setEmailDiscovery] = useState(() => readBoolean('bes-email-discovery', false));
  const [summaryFrequency, setSummaryFrequency] = useState(() => readText('bes-summary-frequency', 'daily'));
  const [autoCleanup, setAutoCleanup] = useState(() => readText('bes-auto-cleanup', '30'));
  const [musicSettings, setMusicSettings] = useState(() => readMusicSettings(currentUser));
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, message: '', ok: false });
  const importInputRef = useRef(null);
  const authProviders = useMemo(() => Array.isArray(currentUser?.authProviders) ? currentUser.authProviders : [], [currentUser?.authProviders]);
  const canChangePassword = currentUser?.provider === 'supabase';

  const setAccent = (value) => {
    setAccentColor(value);
    localStorage.setItem('bes-accent-color', value);
    document.documentElement.dataset.accent = value;
  };
  const setDensity = (value) => {
    setDisplayDensity(value);
    localStorage.setItem('bes-display-density', value);
    document.documentElement.dataset.density = value;
  };
  const applyTheme = (value) => {
    setTheme?.(value);
    localStorage.setItem('bet-theme', value);
    localStorage.setItem('bes-theme-mode', value);
  };
  const patchMusic = (patch) => {
    const next = { ...musicSettings, ...patch };
    setMusicSettings(next);
    saveMusicSettings(currentUser, next);
  };
  const toggleBoolean = (setter, key) => (value) => { setter(value); writeBoolean(key, value); };
  const updateTextSetting = (setter, key) => (value) => { setter(value); writeText(key, value); };

  const exportSettings = () => downloadJson('brian-english-studio-settings.json', {
    version: 'google-m3', exportedAt: new Date().toISOString(),
    interface: { language, theme, accentColor, displayDensity, motionMode, performanceMode, themeIntensity, tileBorder, indicatorMode, fontScale },
    system: {
      soundEnabled, completionSound, hapticFeedback, pushNotifications, emailNotifications, studyReminders,
      liveSyncEnabled, dataSyncEnabled, wifiOnly, activeStatus, emailDiscovery, summaryFrequency, autoCleanup, musicSettings,
    },
  });

  const importSettings = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const ui = payload.interface || {};
      const system = payload.system || {};
      if (ui.language) setLanguage?.(ui.language);
      if (ui.theme) applyTheme(ui.theme);
      if (ui.accentColor) setAccent(ui.accentColor);
      if (ui.displayDensity) setDensity(ui.displayDensity);
      if (ui.motionMode) setMotionMode?.(ui.motionMode);
      if (ui.performanceMode) setPerformanceMode?.(ui.performanceMode);
      if (ui.themeIntensity) setThemeIntensity?.(ui.themeIntensity);
      if (ui.tileBorder) setTileBorder?.(ui.tileBorder);
      if (ui.indicatorMode) setIndicatorMode?.(ui.indicatorMode);
      if (ui.fontScale) setFontScale?.(Number(ui.fontScale));
      const booleanSettings = [
        ['soundEnabled', setSoundEnabled, 'bes-global-notice-sound'],
        ['completionSound', setCompletionSound, 'bes-completion-sound'],
        ['hapticFeedback', setHapticFeedback, 'bes-haptic-feedback'],
        ['pushNotifications', setPushNotifications, 'bes-push-notifications'],
        ['emailNotifications', setEmailNotifications, 'bes-email-notifications'],
        ['studyReminders', setStudyReminders, 'bes-study-reminders'],
        ['liveSyncEnabled', setLiveSyncEnabled, 'bes-global-notice-live-sync'],
        ['dataSyncEnabled', setDataSyncEnabled, 'bes-global-data-sync'],
        ['wifiOnly', setWifiOnly, 'bes-sync-wifi-only'],
        ['activeStatus', setActiveStatus, 'bes-active-status'],
        ['emailDiscovery', setEmailDiscovery, 'bes-email-discovery'],
      ];
      booleanSettings.forEach(([field, setter, key]) => {
        if (typeof system[field] === 'boolean') { setter(system[field]); writeBoolean(key, system[field]); }
      });
      if (system.summaryFrequency) updateTextSetting(setSummaryFrequency, 'bes-summary-frequency')(system.summaryFrequency);
      if (system.autoCleanup) updateTextSetting(setAutoCleanup, 'bes-auto-cleanup')(system.autoCleanup);
      if (system.musicSettings) patchMusic(system.musicSettings);
      setMessage(vi ? 'Đã nhập cài đặt hệ thống.' : 'System settings imported.');
    } catch {
      setMessage(vi ? 'Tệp cài đặt không hợp lệ.' : 'Invalid settings file.');
    } finally {
      event.target.value = '';
    }
  };

  const clearCache = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('bes-cache:') || key?.startsWith('bes-temp:') || key?.startsWith('bes-ai-') || key?.startsWith('brian-ai')) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    setMessage(vi ? `Đã xoá ${keys.length} mục dữ liệu tạm.` : `Cleared ${keys.length} temporary items.`);
  };

  const resetSettings = () => {
    applyTheme('light');
    setAccent('blue');
    setDensity('medium');
    setMotionMode?.('lite');
    setPerformanceMode?.('auto');
    setThemeIntensity?.('balanced');
    setTileBorder?.('soft');
    setIndicatorMode?.('on');
    setFontScale?.(100);
    const resetBooleans = [
      [setSoundEnabled, 'bes-global-notice-sound', true], [setCompletionSound, 'bes-completion-sound', true],
      [setHapticFeedback, 'bes-haptic-feedback', false], [setPushNotifications, 'bes-push-notifications', true],
      [setEmailNotifications, 'bes-email-notifications', false], [setStudyReminders, 'bes-study-reminders', true],
      [setLiveSyncEnabled, 'bes-global-notice-live-sync', true], [setDataSyncEnabled, 'bes-global-data-sync', true],
      [setWifiOnly, 'bes-sync-wifi-only', true], [setActiveStatus, 'bes-active-status', true],
      [setEmailDiscovery, 'bes-email-discovery', false],
    ];
    resetBooleans.forEach(([setter, key, value]) => { setter(value); writeBoolean(key, value); });
    updateTextSetting(setSummaryFrequency, 'bes-summary-frequency')('daily');
    updateTextSetting(setAutoCleanup, 'bes-auto-cleanup')('30');
    patchMusic(DEFAULT_MUSIC_SETTINGS);
    setMessage(vi ? 'Đã khôi phục cài đặt mặc định.' : 'Default settings restored.');
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    if (!canChangePassword) {
      setPasswordStatus({ loading: false, ok: false, message: vi ? 'Chức năng đổi mật khẩu cần Supabase Auth.' : 'Password changes require Supabase Auth.' });
      return;
    }
    if (passwordForm.next.length < 8 || passwordForm.next !== passwordForm.confirm) {
      setPasswordStatus({ loading: false, ok: false, message: vi ? 'Kiểm tra mật khẩu mới và phần xác nhận.' : 'Check the new password and confirmation.' });
      return;
    }
    setPasswordStatus({ loading: true, ok: false, message: '' });
    setGlobalLoading?.(true, vi ? 'Đang cập nhật mật khẩu...' : 'Updating password...');
    const result = await changeCurrentPassword({ currentPassword: passwordForm.current, newPassword: passwordForm.next });
    setGlobalLoading?.(false);
    setPasswordStatus({ loading: false, ok: Boolean(result.ok), message: result.ok ? (vi ? 'Đã đổi mật khẩu.' : 'Password updated.') : (result.message || (vi ? 'Không thể đổi mật khẩu.' : 'Could not update password.')) });
    if (result.ok) setPasswordForm({ current: '', next: '', confirm: '' });
  };

  const accents = [['blue','#1a73e8'],['indigo','#5f6fff'],['violet','#8e63e9'],['pink','#e85d8e'],['orange','#f2994a'],['green','#34a853']];
  const queryValue = query.trim().toLowerCase();
  const matches = (...terms) => !queryValue || terms.some((term) => String(term || '').toLowerCase().includes(queryValue));
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const navItems = [
    ['settings-account', 'person', vi ? 'Tài khoản' : 'Account', vi ? 'Hồ sơ & bảo mật' : 'Profile & security'],
    ['settings-appearance', 'palette', vi ? 'Giao diện' : 'Appearance', vi ? 'Chủ đề & bố cục' : 'Theme & layout'],
    ['settings-notifications', 'bell', vi ? 'Thông báo' : 'Notifications', vi ? 'Email & ứng dụng' : 'Email & app'],
    ['settings-sync', 'sync', vi ? 'Đồng bộ' : 'Sync', vi ? 'Dữ liệu & thiết bị' : 'Data & devices'],
    ['settings-privacy', 'shield', vi ? 'Bảo mật' : 'Security', vi ? 'Quyền riêng tư' : 'Privacy'],
    ['settings-system', 'settings', vi ? 'Hệ thống' : 'System', vi ? 'Hiệu năng & nâng cao' : 'Performance & advanced'],
  ];

  return (
    <div className="page settings-google-page">
      <div className="settings-google-shell">
        <aside className="settings-google-sidebar" aria-label={vi ? 'Các mục cài đặt' : 'Settings sections'}>
          <div className="settings-google-sidebar-title"><span>{vi ? 'CÀI ĐẶT' : 'SETTINGS'}</span></div>
          <nav>
            {navItems.map(([id, icon, title, subtitle], index) => (
              <button key={id} type="button" className={index === 0 ? 'is-active' : ''} onClick={() => scrollTo(id)}>
                <span><M3Icon name={icon} /></span><div><strong>{title}</strong><small>{subtitle}</small></div>
              </button>
            ))}
          </nav>
          <div className="settings-google-help-card">
            <span><M3Icon name="help" /></span>
            <div><strong>{vi ? 'Cần hỗ trợ?' : 'Need help?'}</strong><small>{vi ? 'Xem hướng dẫn hoặc liên hệ đội ngũ.' : 'Open guides or contact support.'}</small></div>
            <button type="button" onClick={() => { window.location.hash = '#/contact'; }}>{vi ? 'Trung tâm trợ giúp' : 'Help center'} <b>→</b></button>
          </div>
        </aside>

        <main className="settings-google-main">
          <header className="settings-google-commandbar">
            <label className="settings-google-search">
              <M3Icon name="search" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={vi ? 'Tìm kiếm cài đặt' : 'Search settings'} />
              <kbd>⌘ K</kbd>
            </label>
            <button type="button" className="settings-google-icon-button" onClick={() => scrollTo('settings-notifications')} aria-label={vi ? 'Thông báo' : 'Notifications'}><M3Icon name="bell" /><i>3</i></button>
            <button type="button" className="settings-google-icon-button" onClick={() => { window.location.hash = '#/contact'; }} aria-label={vi ? 'Trợ giúp' : 'Help'}><M3Icon name="help" /></button>
          </header>

          <section className="settings-google-hero">
            <div className="settings-google-hero-copy">
              <span>{vi ? 'TRUNG TÂM CÀI ĐẶT' : 'SETTINGS CENTER'}</span>
              <h1>{vi ? 'Cài đặt hệ thống' : 'System settings'}</h1>
              <p>{vi ? 'Tùy chỉnh trải nghiệm English Hub để phù hợp với công việc giảng dạy và cách bạn sử dụng thiết bị.' : 'Customize English Hub for your teaching workflow and the way you use your devices.'}</p>
              <div className="settings-google-quick-chips">
                <button type="button" onClick={() => scrollTo('settings-appearance')}><M3Icon name="sun" size={18} />{theme === 'dark' ? (vi ? 'Giao diện tối' : 'Dark theme') : (vi ? 'Giao diện sáng' : 'Light theme')}</button>
                <button type="button" onClick={() => scrollTo('settings-system')}><M3Icon name="globe" size={18} />{vi ? 'Ngôn ngữ: Tiếng Việt' : 'Language: English'}</button>
                <span><M3Icon name="clock" size={18} />GMT+07:00</span>
              </div>
            </div>
            <div className="settings-google-hero-art" aria-hidden="true">
              <div className="settings-google-art-panel"><i /><i /><i /><b /><b /><b /></div>
              <div className="settings-google-art-colors">{accents.slice(0,5).map(([name,color]) => <i key={name} style={{ '--art-color': color }} />)}</div>
              <div className="settings-google-art-shield"><M3Icon name="shield" size={32} /></div>
            </div>
          </section>

          {matches('tài khoản', 'account', 'hồ sơ', 'profile', 'mật khẩu', 'password') ? (
            <section id="settings-account" className="settings-v47-card settings-v65-account-card settings-google-profile-card">
              <div className="settings-google-section-heading">
                <span><M3Icon name="person" /></span><div><h2>{vi ? 'Tài khoản & hồ sơ' : 'Account & profile'}</h2><p>{vi ? 'Thông tin nhận diện và bảo mật tài khoản hiện tại.' : 'Identity and security for the current account.'}</p></div>
              </div>
              <div className="settings-v65-profile-panel settings-google-profile-fallback">
                <div className="settings-v65-avatar">{String(currentUser?.name || currentUser?.email || 'B').slice(0,1).toUpperCase()}</div>
                <div className="settings-v65-profile-copy"><strong>{currentUser?.name || currentUser?.email || 'Brian English'}</strong><small>{currentUser?.email || '—'}</small><small>{authProviders.join(' · ') || currentUser?.provider || 'local'}</small></div>
              </div>
              <form className="settings-v65-password-form settings-google-password-form" onSubmit={submitPasswordChange}>
                <div className="settings-google-password-title"><M3Icon name="shield" /><div><strong>{vi ? 'Đổi mật khẩu' : 'Change password'}</strong><small>{vi ? 'Mật khẩu mới cần ít nhất 8 ký tự.' : 'Use at least 8 characters.'}</small></div></div>
                <input type="password" placeholder={vi ? 'Mật khẩu hiện tại' : 'Current password'} value={passwordForm.current} onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))} />
                <input type="password" placeholder={vi ? 'Mật khẩu mới' : 'New password'} value={passwordForm.next} onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))} />
                <input type="password" placeholder={vi ? 'Xác nhận mật khẩu mới' : 'Confirm new password'} value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} />
                <button type="submit" disabled={passwordStatus.loading}>{passwordStatus.loading ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Cập nhật mật khẩu' : 'Update password')}</button>
              </form>
              {passwordStatus.message ? <p className={`settings-google-inline-message ${passwordStatus.ok ? 'is-ok' : 'is-error'}`}>{passwordStatus.message}</p> : null}
            </section>
          ) : null}

          <section className="settings-google-card-grid">
            {matches('giao diện', 'appearance', 'chủ đề', 'theme', 'màu', 'font', 'chữ') ? (
              <article id="settings-appearance" className="settings-google-card tone-violet">
                <CardHeader icon="palette" tone="violet" title={vi ? 'Giao diện & chủ đề' : 'Appearance & theme'} subtitle={vi ? 'Tùy chỉnh cách English Hub hiển thị.' : 'Customize how English Hub looks.'} />
                <SettingRow title={vi ? 'Chế độ giao diện' : 'Theme mode'}><Segmented value={theme} onChange={applyTheme} ariaLabel={vi ? 'Chế độ giao diện' : 'Theme mode'} options={[["light",vi?'Sáng':'Light'],["dark",vi?'Tối':'Dark']]} /></SettingRow>
                <SettingRow title={vi ? 'Màu nhấn' : 'Accent color'}><div className="settings-m3-color-row">{accents.map(([name,color]) => <button type="button" key={name} className={accentColor === name ? 'is-active' : ''} style={{ '--swatch': color }} onClick={() => setAccent(name)} aria-label={name} />)}</div></SettingRow>
                <div className="settings-m3-two-columns">
                  <label><span>{vi ? 'Mật độ hiển thị' : 'Display density'}</span><SelectControl value={displayDensity} onChange={(event) => setDensity(event.target.value)}><option value="relaxed">{vi?'Thoáng':'Relaxed'}</option><option value="medium">{vi?'Vừa':'Medium'}</option><option value="compact">{vi?'Gọn':'Compact'}</option></SelectControl></label>
                  <label><span>{vi ? 'Kích thước chữ' : 'Text size'}</span><SelectControl value={fontScale} onChange={(event) => setFontScale?.(Number(event.target.value))}><option value="100">100%</option><option value="110">110%</option><option value="120">120%</option><option value="130">130%</option></SelectControl></label>
                  <label><span>{vi ? 'Độ đậm giao diện' : 'Interface strength'}</span><SelectControl value={themeIntensity} onChange={(event) => setThemeIntensity?.(event.target.value)}><option value="soft">Soft</option><option value="balanced">Balanced</option><option value="strong">Strong</option><option value="bold">Bold</option></SelectControl></label>
                  <label><span>{vi ? 'Viền thẻ' : 'Card border'}</span><SelectControl value={tileBorder} onChange={(event) => setTileBorder?.(event.target.value)}><option value="off">Off</option><option value="soft">Soft</option><option value="strong">Strong</option></SelectControl></label>
                </div>
              </article>
            ) : null}

            {matches('thông báo', 'notification', 'email', 'nhắc nhở') ? (
              <article id="settings-notifications" className="settings-google-card tone-blue">
                <CardHeader icon="bell" tone="blue" title={vi ? 'Thông báo' : 'Notifications'} subtitle={vi ? 'Quản lý thông báo và nhắc nhở.' : 'Manage alerts and reminders.'} />
                <SettingRow title={vi ? 'Thông báo trên ứng dụng' : 'In-app notifications'}><Toggle checked={pushNotifications} onChange={toggleBoolean(setPushNotifications, 'bes-push-notifications')} label="Push notifications" /></SettingRow>
                <SettingRow title={vi ? 'Thông báo qua email' : 'Email notifications'}><Toggle checked={emailNotifications} onChange={toggleBoolean(setEmailNotifications, 'bes-email-notifications')} label="Email notifications" /></SettingRow>
                <SettingRow title={vi ? 'Nhắc nhở học tập' : 'Study reminders'}><Toggle checked={studyReminders} onChange={toggleBoolean(setStudyReminders, 'bes-study-reminders')} label="Study reminders" /></SettingRow>
                <SettingRow title={vi ? 'Tần suất tổng hợp' : 'Summary frequency'}><SelectControl value={summaryFrequency} onChange={(event) => updateTextSetting(setSummaryFrequency, 'bes-summary-frequency')(event.target.value)}><option value="daily">{vi?'Hàng ngày':'Daily'}</option><option value="weekly">{vi?'Hàng tuần':'Weekly'}</option><option value="never">{vi?'Không gửi':'Never'}</option></SelectControl></SettingRow>
              </article>
            ) : null}

            {matches('đồng bộ', 'sync', 'dữ liệu', 'thiết bị', 'wifi') ? (
              <article id="settings-sync" className="settings-google-card tone-green">
                <CardHeader icon="sync" tone="green" title={vi ? 'Đồng bộ & tài khoản' : 'Sync & account'} subtitle={vi ? 'Đồng bộ dữ liệu trên các thiết bị.' : 'Keep data synchronized across devices.'} />
                <SettingRow title={vi ? 'Đồng bộ tự động' : 'Automatic sync'}><Toggle checked={dataSyncEnabled} onChange={toggleBoolean(setDataSyncEnabled, 'bes-global-data-sync')} label="Data sync" /></SettingRow>
                <SettingRow title={vi ? 'Đồng bộ trực tiếp' : 'Live sync'}><Toggle checked={liveSyncEnabled} onChange={toggleBoolean(setLiveSyncEnabled, 'bes-global-notice-live-sync')} label="Live sync" /></SettingRow>
                <SettingRow title={vi ? 'Chỉ đồng bộ khi có Wi-Fi' : 'Sync on Wi-Fi only'}><Toggle checked={wifiOnly} onChange={toggleBoolean(setWifiOnly, 'bes-sync-wifi-only')} label="Wi-Fi only" /></SettingRow>
                <SettingRow title={vi ? 'Thiết bị đã kết nối' : 'Connected devices'}><button type="button" className="settings-m3-text-button">{vi ? 'Thiết bị hiện tại' : 'Current device'} <b>›</b></button></SettingRow>
              </article>
            ) : null}

            {matches('âm thanh', 'sound', 'nhạc', 'music', 'rung', 'volume') ? (
              <article className="settings-google-card tone-mint">
                <CardHeader icon="volume" tone="mint" title={vi ? 'Âm thanh & phản hồi' : 'Sound & feedback'} subtitle={vi ? 'Tùy chỉnh âm báo và phản hồi.' : 'Adjust sounds and feedback.'} />
                <SettingRow title={vi ? 'Âm thanh thông báo' : 'Notification sound'}><Toggle checked={soundEnabled} onChange={toggleBoolean(setSoundEnabled, 'bes-global-notice-sound')} label="Notification sound" /></SettingRow>
                <SettingRow title={vi ? 'Âm thanh khi hoàn thành' : 'Completion sound'}><Toggle checked={completionSound} onChange={toggleBoolean(setCompletionSound, 'bes-completion-sound')} label="Completion sound" /></SettingRow>
                <SettingRow title={vi ? 'Phản hồi rung' : 'Haptic feedback'}><Toggle checked={hapticFeedback} onChange={toggleBoolean(setHapticFeedback, 'bes-haptic-feedback')} label="Haptic feedback" /></SettingRow>
                <SettingRow title={vi ? 'Nhạc nền' : 'Background music'}><Toggle checked={musicSettings.enabled} onChange={(value) => patchMusic({ enabled: value, expanded: value })} label="Background music" /></SettingRow>
                <div className="settings-m3-volume"><M3Icon name="volume" size={19} /><input type="range" min="0" max="1" step="0.01" value={musicSettings.volume} onChange={(event) => patchMusic({ volume: Number(event.target.value) })} /><b>{Math.round(musicSettings.volume * 100)}%</b></div>
              </article>
            ) : null}

            {matches('bảo mật', 'privacy', 'quyền riêng tư', 'trạng thái', 'email') ? (
              <article id="settings-privacy" className="settings-google-card tone-indigo">
                <CardHeader icon="shield" tone="indigo" title={vi ? 'Quyền riêng tư & bảo mật' : 'Privacy & security'} subtitle={vi ? 'Bảo vệ dữ liệu và quyền riêng tư.' : 'Protect your data and privacy.'} />
                <SettingRow title={vi ? 'Hiển thị trạng thái hoạt động' : 'Show active status'}><Toggle checked={activeStatus} onChange={toggleBoolean(setActiveStatus, 'bes-active-status')} label="Active status" /></SettingRow>
                <SettingRow title={vi ? 'Cho phép tìm kiếm qua email' : 'Allow email discovery'}><Toggle checked={emailDiscovery} onChange={toggleBoolean(setEmailDiscovery, 'bes-email-discovery')} label="Email discovery" /></SettingRow>
                <SettingRow title={vi ? 'Mã hóa dữ liệu' : 'Data encryption'}><span className="settings-m3-status-chip">{vi ? 'Đang bật' : 'Enabled'}</span></SettingRow>
                <SettingRow title={vi ? 'Xem và tải dữ liệu của bạn' : 'View and download your data'}><button type="button" className="settings-m3-outlined-button" onClick={exportSettings}>{vi ? 'Xuất dữ liệu' : 'Export data'}</button></SettingRow>
              </article>
            ) : null}

            {matches('hệ thống', 'system', 'hiệu năng', 'performance', 'cache', 'ngôn ngữ', 'motion') ? (
              <article id="settings-system" className="settings-google-card tone-orange">
                <CardHeader icon="speed" tone="orange" title={vi ? 'Hiệu năng hệ thống' : 'System performance'} subtitle={vi ? 'Tối ưu hiệu năng và lưu trữ.' : 'Optimize performance and storage.'} />
                <SettingRow title={vi ? 'Chế độ hiệu năng' : 'Performance mode'} description={`${vi?'Đang áp dụng':'Active'}: ${resolvedPerformance}`}><SelectControl value={performanceMode} onChange={(event) => setPerformanceMode?.(event.target.value)}><option value="auto">Auto</option><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></SelectControl></SettingRow>
                <SettingRow title={vi ? 'Chuyển cảnh' : 'Motion'}><SelectControl value={motionMode} onChange={(event) => setMotionMode?.(event.target.value)}><option value="lite">Lite</option><option value="full">Full</option><option value="off">Off</option></SelectControl></SettingRow>
                <SettingRow title={vi ? 'Ngôn ngữ' : 'Language'}><SelectControl value={language} onChange={(event) => setLanguage?.(event.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></SelectControl></SettingRow>
                <div className="settings-m3-storage">
                  <div><span><M3Icon name="storage" size={19} />{vi ? 'Dung lượng đã dùng' : 'Storage used'}</span><b>2.4 GB / 10 GB</b></div><progress value="24" max="100" />
                </div>
                <SettingRow title={vi ? 'Tự động dọn dẹp' : 'Automatic cleanup'}><SelectControl value={autoCleanup} onChange={(event) => updateTextSetting(setAutoCleanup, 'bes-auto-cleanup')(event.target.value)}><option value="7">7 {vi?'ngày':'days'}</option><option value="30">30 {vi?'ngày':'days'}</option><option value="90">90 {vi?'ngày':'days'}</option><option value="never">{vi?'Không tự động':'Never'}</option></SelectControl></SettingRow>
                <div className="settings-m3-utility-actions">
                  <button type="button" onClick={clearCache}>{vi ? 'Xóa bộ nhớ đệm' : 'Clear cache'}</button>
                  <button type="button" onClick={exportSettings}>{vi ? 'Xuất cài đặt' : 'Export settings'}</button>
                  <button type="button" onClick={() => importInputRef.current?.click()}>{vi ? 'Nhập cài đặt' : 'Import settings'}</button>
                  <input ref={importInputRef} hidden type="file" accept="application/json,.json" onChange={importSettings} />
                </div>
                <div className="settings-m3-reset-row"><label><span>Windows indicator</span><SelectControl value={indicatorMode} onChange={(event) => setIndicatorMode?.(event.target.value)}><option value="on">On</option><option value="off">Off</option></SelectControl></label><button type="button" onClick={resetSettings}>{vi ? 'Đặt lại mặc định' : 'Reset defaults'}</button></div>
              </article>
            ) : null}
          </section>

          {queryValue && !document.querySelector ? null : null}
          {message ? <div className="settings-google-snackbar" role="status"><span>✓</span>{message}<button type="button" onClick={() => setMessage('')}>×</button></div> : null}
          <footer className="settings-google-footer">English Hub · Google Material experience · 2026</footer>
        </main>
      </div>
    </div>
  );
}
