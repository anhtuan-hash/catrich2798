import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { changeCurrentPassword } from '../utils/auth.js';
import GlobalMotionAdminPanel from '../components/admin/GlobalMotionAdminPanel.jsx';
import GlobalChromeSettingsPanel from '../components/admin/GlobalChromeSettingsPanel.jsx';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import '../styles/SettingsGoogleM3.css';
import '../styles/SettingsLauncher2.css';
import '../styles/SettingsLauncherDrawerRedesign.css';
import '../styles/SettingsLauncherPortalCompat.css';
import SettingsLauncherHome, { SETTINGS_LAUNCHER_TILES } from '../components/settings/SettingsLauncherHome.jsx';
const SettingsTeacherManagement = lazy(() => import('../components/settings/SettingsTeacherManagement.jsx'));
const GlobalFontAdminPanel = lazy(() => import('../components/admin/GlobalFontAdminPanel.jsx'));
const RegionalFontAdminPanel = lazy(() => import('../components/admin/RegionalFontAdminPanel.jsx'));

const ICON_PATHS = {
  search: 'M9.5 3a6.5 6.5 0 1 0 4.06 11.58L19 20l1-1-5.42-5.44A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z',
  bell: 'M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-5-2-2v-4a5 5 0 0 0-4-4.9V5a1 1 0 1 0-2 0v1.1A5 5 0 0 0 7 11v4l-2 2v1h14v-1Z',
  sync: 'M17.65 6.35A7.95 7.95 0 0 0 5.2 8H2l4 4 4-4H7.22a6 6 0 0 1 9.02-.24L18 6l-.35.35ZM14 12l4 4h-3.22a6 6 0 0 1-9.02.24L4 18l.35-.35A7.95 7.95 0 0 0 18.8 16H22l-4-4-4 4h2.78A6 6 0 0 1 7.76 16.24L6 18l.35-.35A7.95 7.95 0 0 0 18.8 16H22l-4-4-4 4Z',
  shield: 'm12 2 8 3v6c0 5.05-3.41 9.77-8 11-4.59-1.23-8-5.95-8-11V5l8-3Zm0 3.12L6 7.37V11c0 3.87 2.47 7.55 6 8.75 3.53-1.2 6-4.88 6-8.75V7.37l-6-2.25Z',
  settings: 'M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58-2-3.46-2.39.96a7.1 7.1 0 0 0-1.62-.94L14.8 3.5h-4l-.36 2.54c-.58.23-1.12.54-1.62.94l-2.39-.96-2 3.46 2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58 2 3.46 2.39-.96c.5.4 1.04.71 1.62.94l.36 2.54h4l.35-2.54c.58-.23 1.12-.54 1.62-.94l2.39.96 2-3.46-2.02-1.58ZM12.8 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
  volume: 'M4 9v6h4l5 4V5L8 9H4Zm11.5 3a3.5 3.5 0 0 0-2-3.16v6.32A3.5 3.5 0 0 0 15.5 12Zm-2-8.5v2.06a7 7 0 0 1 0 12.88v2.06a9 9 0 0 0 0-17Z',
  speed: 'M12 4a9 9 0 0 0-9 9c0 2.3.86 4.4 2.27 6h13.46A8.96 8.96 0 0 0 21 13a9 9 0 0 0-9-9Zm0 2a7 7 0 0 1 6.92 8H17a5.05 5.05 0 0 0-.64-1.94l1.36-1.36-1.42-1.42-1.36 1.36A5.05 5.05 0 0 0 13 10V8h-2v2a5 5 0 0 0-4 4H5.08A7 7 0 0 1 12 6Zm-1 7h2v4h-2v-4Z',
  help: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-.1-5.1h1.9v2h-1.9v-2Zm.1-8.3c2.1 0 3.5 1.18 3.5 3 0 1.45-.78 2.18-1.8 2.84-.88.57-1.2.92-1.2 1.76h-1.8c0-1.4.55-2.05 1.65-2.77.84-.55 1.25-.95 1.25-1.73 0-.85-.65-1.45-1.65-1.45-1.08 0-1.72.58-1.83 1.62H8.25C8.4 7.85 9.85 6.6 12 6.6Z',
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
    <button type="button" className={`settings-m3-toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked} aria-label={label}>
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

export default function Settings({
  currentUser,
  language = 'vi',
  setLanguage,
  performanceMode = 'auto',
  setPerformanceMode,
  resolvedPerformance = 'auto',
  indicatorMode = 'on',
  setIndicatorMode,
  setGlobalLoading,
}) {
  const vi = language === 'vi';
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
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [activeModule, setActiveModule] = useState(null);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const [appearanceTab, setAppearanceTab] = useState('global-font');
  const [motionDirty, setMotionDirty] = useState(false);
  const [fontDirty, setFontDirty] = useState(false);
  const [regionalFontDirty, setRegionalFontDirty] = useState(false);
  const drawerRef = useRef(null);
  const drawerCloseRef = useRef(null);
  const previousTriggerRef = useRef(null);
  const moduleTitle = SETTINGS_LAUNCHER_TILES.find(item => item.id === activeModule);
  const openModule = (id) => {
    if (!SETTINGS_LAUNCHER_TILES.some(item => item.id === id)) return;
    if (['permissions','teacher-create'].includes(id) && !['admin','administrator'].includes(String(currentUser?.role || '').toLowerCase())) return;
    previousTriggerRef.current = document.activeElement;
    setDetailFullscreen(['appearance','permissions','teacher-create'].includes(id));
    setAppearanceTab(['admin','administrator'].includes(String(currentUser?.role||'').toLowerCase()) ? 'global-font' : 'language');
    setActiveModule(id);
  };
  const closeModule = () => {
    if (activeModule === 'appearance' && (motionDirty || fontDirty || regionalFontDirty) && !window.confirm(vi ? 'Bạn có tùy chỉnh giao diện chưa lưu. Đóng và bỏ phần xem trước?' : 'You have unsaved appearance changes. Close and discard previews?')) return;
    if (passwordForm.current || passwordForm.next || passwordForm.confirm) {
      if (!window.confirm(vi ? 'Bạn có thông tin mật khẩu chưa gửi. Đóng và bỏ nội dung đang nhập?' : 'Discard your unsent password changes?')) return;
      setPasswordForm({ current: '', next: '', confirm: '' });
    }
    setActiveModule(null);
    setDetailFullscreen(false);
    setMotionDirty(false);
    setFontDirty(false);
    setRegionalFontDirty(false);
    requestAnimationFrame(() => previousTriggerRef.current?.focus?.());
  };
  useEffect(() => {
    if (!activeModule) return undefined;
    drawerCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeys = (event) => {
      // Nested authentication portals manage their own Escape keys.
      if (!event.target?.closest?.('.settings-launcher-drawer')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeModule(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...(drawerRef.current?.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])]
        .filter(element => element.getClientRects().length > 0);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault(); controls[controls.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
        event.preventDefault(); controls[0].focus();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', handleKeys); };
  }, [activeModule, motionDirty, passwordForm.current, passwordForm.next, passwordForm.confirm]);
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, message: '', ok: false });
  const importInputRef = useRef(null);
  const authProviders = useMemo(() => Array.isArray(currentUser?.authProviders) ? currentUser.authProviders : [], [currentUser?.authProviders]);
  const canChangePassword = currentUser?.provider === 'supabase';

  const toggleBoolean = (setter, key) => (value) => {
    setter(value);
    writeBoolean(key, value);
  };

  const updateTextSetting = (setter, key) => (value) => {
    setter(value);
    writeText(key, value);
  };

  const exportSettings = () => downloadJson('brian-english-studio-settings.json', {
    version: 'google-m3-no-appearance',
    exportedAt: new Date().toISOString(),
    system: {
      language,
      performanceMode,
      indicatorMode,
      soundEnabled,
      completionSound,
      hapticFeedback,
      pushNotifications,
      emailNotifications,
      studyReminders,
      liveSyncEnabled,
      dataSyncEnabled,
      wifiOnly,
      activeStatus,
      emailDiscovery,
      summaryFrequency,
      autoCleanup,
    },
  });

  const importSettings = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const system = payload.system || {};
      const legacyInterface = payload.interface || {};
      if (system.language || legacyInterface.language) setLanguage?.(system.language || legacyInterface.language);
      if (system.performanceMode || legacyInterface.performanceMode) setPerformanceMode?.(system.performanceMode || legacyInterface.performanceMode);
      if (system.indicatorMode || legacyInterface.indicatorMode) setIndicatorMode?.(system.indicatorMode || legacyInterface.indicatorMode);
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
        if (typeof system[field] === 'boolean') {
          setter(system[field]);
          writeBoolean(key, system[field]);
        }
      });
      if (system.summaryFrequency) updateTextSetting(setSummaryFrequency, 'bes-summary-frequency')(system.summaryFrequency);
      if (system.autoCleanup) updateTextSetting(setAutoCleanup, 'bes-auto-cleanup')(system.autoCleanup);
      setMessage(vi ? 'Đã nhập cài đặt hệ thống.' : 'System settings imported.');
    } catch {
      setMessage(vi ? 'Tệp cài đặt không hợp lệ.' : 'Invalid settings file.');
    } finally {
      event.target.value = '';
    }
  };

  const clearCache = () => {
    if (!window.confirm(vi ? 'Xóa bộ nhớ đệm và dữ liệu tạm trên thiết bị này?' : 'Clear local cache and temporary data on this device?')) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('bes-cache:') || key?.startsWith('bes-temp:') || key?.startsWith('bes-ai-') || key?.startsWith('brian-ai')) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    setMessage(vi ? `Đã xoá ${keys.length} mục dữ liệu tạm.` : `Cleared ${keys.length} temporary items.`);
  };

  const resetSettings = () => {
    if (!window.confirm(vi ? 'Khôi phục các tùy chọn thiết bị về mặc định?' : 'Reset device preferences to defaults?')) return;
    setPerformanceMode?.('auto');
    setIndicatorMode?.('on');
    const resetBooleans = [
      [setSoundEnabled, 'bes-global-notice-sound', true],
      [setCompletionSound, 'bes-completion-sound', true],
      [setHapticFeedback, 'bes-haptic-feedback', false],
      [setPushNotifications, 'bes-push-notifications', true],
      [setEmailNotifications, 'bes-email-notifications', false],
      [setStudyReminders, 'bes-study-reminders', true],
      [setLiveSyncEnabled, 'bes-global-notice-live-sync', true],
      [setDataSyncEnabled, 'bes-global-data-sync', true],
      [setWifiOnly, 'bes-sync-wifi-only', true],
      [setActiveStatus, 'bes-active-status', true],
      [setEmailDiscovery, 'bes-email-discovery', false],
    ];
    resetBooleans.forEach(([setter, key, value]) => {
      setter(value);
      writeBoolean(key, value);
    });
    updateTextSetting(setSummaryFrequency, 'bes-summary-frequency')('daily');
    updateTextSetting(setAutoCleanup, 'bes-auto-cleanup')('30');
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
    setPasswordStatus({
      loading: false,
      ok: Boolean(result.ok),
      message: result.ok ? (vi ? 'Đã đổi mật khẩu.' : 'Password updated.') : (result.message || (vi ? 'Không thể đổi mật khẩu.' : 'Could not update password.')),
    });
    if (result.ok) setPasswordForm({ current: '', next: '', confirm: '' });
  };

  const queryValue = query.trim().toLowerCase();
  const matches = (...terms) => !queryValue || terms.some((term) => String(term || '').toLowerCase().includes(queryValue));
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
  const navItems = [
    ['settings-account', 'person', vi ? 'Tài khoản' : 'Account', vi ? 'Hồ sơ & bảo mật' : 'Profile & security'],
    ['settings-notifications', 'bell', vi ? 'Thông báo' : 'Notifications', vi ? 'Email & ứng dụng' : 'Email & app'],
    ['settings-sync', 'sync', vi ? 'Đồng bộ' : 'Sync', vi ? 'Dữ liệu & thiết bị' : 'Data & devices'],
    ['settings-privacy', 'shield', vi ? 'Bảo mật' : 'Security', vi ? 'Quyền riêng tư' : 'Privacy'],
    ...(['admin', 'administrator'].includes(String(currentUser?.role || '').toLowerCase()) ? [['settings-mfa', 'shield', vi ? 'Xác thực hai lớp' : 'Two-factor authentication', 'MFA / 2FA']] : []),
    ['settings-system', 'settings', vi ? 'Hệ thống' : 'System', vi ? 'Hiệu năng & nâng cao' : 'Performance & advanced'],
    ...(isDepartmentLeaderRole(currentUser?.role) ? [['settings-global-chrome', 'settings', vi ? 'Hiển thị chung' : 'Global display', vi ? 'Sidebar & tin vắn' : 'Sidebar & news']] : []),
  ];

  return (
    <div className="page settings-google-page settings-launcher-v2">
      <div className="settings-google-shell settings-launcher-shell">
        <main className="settings-google-main settings-launcher-stage">
          <SettingsLauncherHome
            currentUser={currentUser} language={language}
            dataSyncEnabled={dataSyncEnabled} liveSyncEnabled={liveSyncEnabled}
            onOpen={openModule}
          />
          {activeModule && typeof document !== 'undefined' ? createPortal(
            <div className={`settings-launcher-portal ${document.documentElement.dataset.theme === "dark" || document.querySelector('.app-shell[data-route="settings"]')?.dataset.theme === "dark" ? "is-dark" : ""}`} data-module={activeModule}>
              <button type="button" className="settings-launcher-backdrop"
                onClick={closeModule} aria-label={vi ? 'Đóng bảng cài đặt' : 'Close settings panel'} />
            <section ref={drawerRef} className={`settings-launcher-drawer ${detailFullscreen ? 'is-fullscreen' : ''}`} role="dialog" aria-modal="true"
              aria-label={vi ? moduleTitle?.vi || 'Cài đặt' : moduleTitle?.en || 'Settings'}>
              <header className="settings-launcher-drawer-header">
                <span><M3Icon name={activeModule === 'account' ? 'person' : activeModule === 'notifications' ? 'bell' : activeModule === 'data' ? 'storage' : activeModule === 'security' ? 'shield' : 'settings'} /></span>
                <div><small>BRIAN ENGLISH · SETTINGS</small><strong>{vi ? moduleTitle?.vi : moduleTitle?.en}</strong><span className="settings-launcher-drawer-subtitle">{activeModule === 'appearance' ? (vi ? 'Không gian tùy chỉnh giao diện' : 'Personalize the entire experience') : (vi ? 'Quản lý cài đặt' : 'Manage settings')}</span></div>
                <button type="button" className="settings-launcher-expand" onClick={() => setDetailFullscreen(value => !value)} aria-pressed={detailFullscreen} title={vi ? (detailFullscreen ? 'Thu gọn' : 'Mở rộng') : (detailFullscreen ? 'Reduce' : 'Expand')} aria-label={vi ? (detailFullscreen ? 'Thu gọn bảng cài đặt' : 'Mở rộng bảng cài đặt') : (detailFullscreen ? 'Reduce settings panel' : 'Expand settings panel')}>{detailFullscreen ? '↙' : '⤢'}</button>
                <button ref={drawerCloseRef} type="button" onClick={closeModule} aria-label={vi ? 'Đóng' : 'Close'} title={vi ? 'Đóng' : 'Close'}>✕</button>
              </header>
              <div className="settings-launcher-drawer-body">
                {activeModule === 'appearance' ? (
                  <div className="settings-appearance-workspace">
                    <nav className="settings-appearance-tabs" role="tablist" aria-label={vi ? 'Nhóm cài đặt giao diện' : 'Appearance categories'}>
                      {[
                        ...( ['admin','administrator'].includes(String(currentUser?.role || '').toLowerCase()) ? [
                          ['global-font', vi ? 'Font toàn hệ thống' : 'Global fonts'],
                          ['regional-font', vi ? 'Font từng khu vực' : 'Regional fonts'],
                          ['motion', vi ? 'Hiệu ứng' : 'Motion']
                        ] : []),
                        ['language', vi ? 'Ngôn ngữ' : 'Language'],
                      ].map(([id,label]) => (
                        <button key={id} type="button" role="tab" aria-selected={appearanceTab === id}
                          className={appearanceTab === id ? 'is-selected' : ''}
                          onClick={() => setAppearanceTab(id)}>{label}</button>
                      ))}
                    </nav>
                    {['admin','administrator'].includes(String(currentUser?.role || '').toLowerCase()) ? (
                      <Suspense fallback={<p className="settings-launcher-loading">{vi ? 'Đang tải tùy chỉnh…' : 'Loading customization…'}</p>}>
                        <section className="settings-appearance-panel" role="tabpanel" hidden={appearanceTab !== 'global-font'}>
                          <GlobalFontAdminPanel currentUser={currentUser} language={language} onDirtyChange={setFontDirty} />
                        </section>
                        <section className="settings-appearance-panel" role="tabpanel" hidden={appearanceTab !== 'regional-font'}>
                          <RegionalFontAdminPanel currentUser={currentUser} language={language} onDirtyChange={setRegionalFontDirty} />
                        </section>
                        <section className="settings-appearance-panel" role="tabpanel" hidden={appearanceTab !== 'motion'}>
                          <div className="settings-motion-admin-hub">
                            <GlobalMotionAdminPanel currentUser={currentUser} language={language} onDirtyChange={setMotionDirty} />
                          </div>
                        </section>
                      </Suspense>
                    ) : null}
                    <section className="settings-appearance-panel" role="tabpanel" hidden={appearanceTab !== 'language'}>
                      <div className="settings-appearance-language">
                        <CardHeader icon="globe" tone="orange" title={vi ? 'Ngôn ngữ hiển thị' : 'Display language'}
                          subtitle={vi ? 'Ngôn ngữ áp dụng cho giao diện Brian English.' : 'Choose the language used across Brian English.'} />
                        <SettingRow title={vi ? 'Ngôn ngữ' : 'Language'}>
                          <SelectControl value={language} onChange={(event) => setLanguage?.(event.target.value)}>
                            <option value="vi">Tiếng Việt</option><option value="en">English</option>
                          </SelectControl>
                        </SettingRow>
                      </div>
                    </section>
                  </div>
                ) : null}
                {activeModule === 'hero' ? (
                  <div className="settings-launcher-links">
                    <p>{vi ? 'Mỗi ứng dụng có ảnh nền Hero độc lập. Mở ứng dụng tương ứng và sử dụng biểu tượng bút chì nếu tài khoản có quyền.' : 'Hero backgrounds are independent. Open an app and use the edit pencil if authorized.'}</p>
                    <a href="#/dashboard">Dashboard <b>↗</b></a>
                    <a href="#/homeroom">{vi ? 'Chủ nhiệm' : 'Homeroom'} <b>↗</b></a>
                    <a href="#/tool/gradebook-studio">{vi ? 'Sổ điểm' : 'Gradebook'} <b>↗</b></a>
                  </div>
                ) : null}
                {activeModule === 'apps' ? (
                  <div className="settings-launcher-links">
                    <p>{vi ? 'Quản lý và mở ứng dụng tại kho ứng dụng hiện có.' : 'Open your existing application directory.'}</p>
                    <a href="#/apps">{vi ? 'Đi tới Kho ứng dụng' : 'Open App directory'} <b>↗</b></a>
                  </div>
                ) : null}
                {(['permissions','teacher-create'].includes(activeModule)) && ['admin','administrator'].includes(String(currentUser?.role || '').toLowerCase()) ? (
                  <Suspense fallback={<p className="settings-launcher-loading">{vi ? 'Đang tải quản lý giáo viên…' : 'Loading teacher management…'}</p>}>
                    <SettingsTeacherManagement key={activeModule} currentUser={currentUser} language={language} initialTab={activeModule === 'teacher-create' ? 'create' : 'permissions'} />
                  </Suspense>
                ) : null}
          {activeModule === 'account' && matches('tài khoản', 'account', 'hồ sơ', 'profile', 'mật khẩu', 'password') ? (
            <section id="settings-account" className="settings-v47-card settings-v65-account-card settings-google-profile-card">
              <div className="settings-google-section-heading">
                <span><M3Icon name="person" /></span><div><h2>{vi ? 'Tài khoản & hồ sơ' : 'Account & profile'}</h2><p>{vi ? 'Thông tin nhận diện và bảo mật tài khoản hiện tại.' : 'Identity and security for the current account.'}</p></div>
              </div>
              <div className="settings-v65-profile-panel settings-google-profile-fallback">
                <div className="settings-v65-avatar">{String(currentUser?.name || currentUser?.email || 'B').slice(0, 1).toUpperCase()}</div>
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

          {activeModule !== 'appearance' ? <section className="settings-google-card-grid">
            {activeModule === 'notifications' && matches('thông báo', 'notification', 'email', 'nhắc nhở') ? (
              <article id="settings-notifications" className="settings-google-card tone-blue">
                <CardHeader icon="bell" tone="blue" title={vi ? 'Thông báo' : 'Notifications'} subtitle={vi ? 'Quản lý thông báo và nhắc nhở.' : 'Manage alerts and reminders.'} />
                <SettingRow title={vi ? 'Thông báo trên ứng dụng' : 'In-app notifications'}><Toggle checked={pushNotifications} onChange={toggleBoolean(setPushNotifications, 'bes-push-notifications')} label="Push notifications" /></SettingRow>
                <SettingRow title={vi ? 'Thông báo qua email' : 'Email notifications'}><Toggle checked={emailNotifications} onChange={toggleBoolean(setEmailNotifications, 'bes-email-notifications')} label="Email notifications" /></SettingRow>
                <SettingRow title={vi ? 'Nhắc nhở học tập' : 'Study reminders'}><Toggle checked={studyReminders} onChange={toggleBoolean(setStudyReminders, 'bes-study-reminders')} label="Study reminders" /></SettingRow>
                <SettingRow title={vi ? 'Tần suất tổng hợp' : 'Summary frequency'}><SelectControl value={summaryFrequency} onChange={(event) => updateTextSetting(setSummaryFrequency, 'bes-summary-frequency')(event.target.value)}><option value="daily">{vi ? 'Hàng ngày' : 'Daily'}</option><option value="weekly">{vi ? 'Hàng tuần' : 'Weekly'}</option><option value="never">{vi ? 'Không gửi' : 'Never'}</option></SelectControl></SettingRow>
              </article>
            ) : null}

            {activeModule === 'data' && matches('đồng bộ', 'sync', 'dữ liệu', 'thiết bị', 'wifi') ? (
              <article id="settings-sync" className="settings-google-card tone-green">
                <CardHeader icon="sync" tone="green" title={vi ? 'Đồng bộ & tài khoản' : 'Sync & account'} subtitle={vi ? 'Đồng bộ dữ liệu trên các thiết bị.' : 'Keep data synchronized across devices.'} />
                <SettingRow title={vi ? 'Đồng bộ tự động' : 'Automatic sync'}><Toggle checked={dataSyncEnabled} onChange={toggleBoolean(setDataSyncEnabled, 'bes-global-data-sync')} label="Data sync" /></SettingRow>
                <SettingRow title={vi ? 'Đồng bộ trực tiếp' : 'Live sync'}><Toggle checked={liveSyncEnabled} onChange={toggleBoolean(setLiveSyncEnabled, 'bes-global-notice-live-sync')} label="Live sync" /></SettingRow>
                <SettingRow title={vi ? 'Chỉ đồng bộ khi có Wi-Fi' : 'Sync on Wi-Fi only'}><Toggle checked={wifiOnly} onChange={toggleBoolean(setWifiOnly, 'bes-sync-wifi-only')} label="Wi-Fi only" /></SettingRow>
                <SettingRow title={vi ? 'Phạm vi cài đặt' : 'Settings scope'} description={vi ? 'Các công tắc trên đang được lưu trên thiết bị này.' : 'These preferences are stored on this device.'}><span className="settings-m3-status-chip">{vi ? 'Thiết bị hiện tại' : 'Current device'}</span></SettingRow>
              </article>
            ) : null}

            {activeModule === 'notifications' && matches('âm thanh', 'sound', 'rung', 'haptic') ? (
              <article className="settings-google-card tone-mint">
                <CardHeader icon="volume" tone="mint" title={vi ? 'Âm thanh & phản hồi' : 'Sound & feedback'} subtitle={vi ? 'Tùy chỉnh âm báo và phản hồi.' : 'Adjust sounds and feedback.'} />
                <SettingRow title={vi ? 'Âm thanh thông báo' : 'Notification sound'}><Toggle checked={soundEnabled} onChange={toggleBoolean(setSoundEnabled, 'bes-global-notice-sound')} label="Notification sound" /></SettingRow>
                <SettingRow title={vi ? 'Âm thanh khi hoàn thành' : 'Completion sound'}><Toggle checked={completionSound} onChange={toggleBoolean(setCompletionSound, 'bes-completion-sound')} label="Completion sound" /></SettingRow>
                <SettingRow title={vi ? 'Phản hồi rung' : 'Haptic feedback'}><Toggle checked={hapticFeedback} onChange={toggleBoolean(setHapticFeedback, 'bes-haptic-feedback')} label="Haptic feedback" /></SettingRow>
              </article>
            ) : null}

            {activeModule === 'security' && matches('bảo mật', 'privacy', 'quyền riêng tư', 'trạng thái', 'email') ? (
              <article id="settings-privacy" className="settings-google-card tone-indigo">
                <CardHeader icon="shield" tone="indigo" title={vi ? 'Quyền riêng tư & bảo mật' : 'Privacy & security'} subtitle={vi ? 'Bảo vệ dữ liệu và quyền riêng tư.' : 'Protect your data and privacy.'} />
                <SettingRow title={vi ? 'Hiển thị trạng thái hoạt động' : 'Show active status'}><Toggle checked={activeStatus} onChange={toggleBoolean(setActiveStatus, 'bes-active-status')} label="Active status" /></SettingRow>
                <SettingRow title={vi ? 'Cho phép tìm kiếm qua email' : 'Allow email discovery'}><Toggle checked={emailDiscovery} onChange={toggleBoolean(setEmailDiscovery, 'bes-email-discovery')} label="Email discovery" /></SettingRow>
                <SettingRow title={vi ? 'Bảo vệ dữ liệu' : 'Data protection'} description={vi ? 'Cơ chế bảo vệ do dịch vụ xác thực và lưu trữ quản lý.' : 'Managed by the authentication and storage providers.'}><span className="settings-m3-status-chip">{vi ? 'Theo nhà cung cấp' : 'Provider managed'}</span></SettingRow>
                <SettingRow title={vi ? 'Xuất cài đặt thiết bị' : 'Export device preferences'}><button type="button" className="settings-m3-outlined-button" onClick={exportSettings}>{vi ? 'Xuất cấu hình' : 'Export configuration'}</button></SettingRow>
              </article>
            ) : null}

            {/* MFA portal host exists exclusively in Security. AdminMfaSecurity observes mounts and attaches on demand. */}
            {activeModule === 'security' && ['admin', 'administrator'].includes(String(currentUser?.role || '').toLowerCase()) ? (
              <article
                id="settings-mfa"
                className="settings-google-card tone-indigo settings-mfa-card"
                style={{
                  gridColumn: '1 / -1',
                  display: undefined,
                }}
              >
                <CardHeader icon="shield" tone="indigo" title={vi ? 'Xác thực hai lớp (MFA)' : 'Two-factor authentication (MFA)'} subtitle={vi ? 'Bảo vệ tài khoản Admin bằng mã xác thực từ điện thoại.' : 'Protect administrator access with an authenticator app.'} />
                <div id="bes-admin-mfa-settings-target" className="bes-admin-mfa-settings-target" />
              </article>
            ) : null}

            {activeModule === 'navigation' && isDepartmentLeaderRole(currentUser?.role) && matches('hệ thống', 'system', 'toàn hệ thống', 'hiển thị', 'display', 'sidebar', 'action dock', 'tin vắn', 'newswire') ? (
              <GlobalChromeSettingsPanel currentUser={currentUser} language={language} />
            ) : null}

            {activeModule === 'data' && matches('hệ thống', 'system', 'hiệu năng', 'performance', 'cache', 'ngôn ngữ') ? (
              <article id="settings-system" className="settings-google-card tone-orange">
                <CardHeader icon={activeModule === 'appearance' ? 'globe' : 'speed'} tone="orange" title={activeModule === 'appearance' ? (vi ? 'Ngôn ngữ hiển thị' : 'Display language') : (vi ? 'Hiệu năng hệ thống' : 'System performance')} subtitle={activeModule === 'appearance' ? (vi ? 'Tùy chỉnh ngôn ngữ giao diện.' : 'Choose the application language.') : (vi ? 'Tối ưu hiệu năng và lưu trữ.' : 'Optimize performance and storage.')} />
                {activeModule === 'data' ? <SettingRow title={vi ? 'Chế độ hiệu năng' : 'Performance mode'} description={`${vi ? 'Đang áp dụng' : 'Active'}: ${resolvedPerformance}`}><SelectControl value={performanceMode} onChange={(event) => setPerformanceMode?.(event.target.value)}><option value="auto">Auto</option><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></SelectControl></SettingRow> : null}
                {activeModule === 'appearance' ? <SettingRow title={vi ? 'Ngôn ngữ' : 'Language'}><SelectControl value={language} onChange={(event) => setLanguage?.(event.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></SelectControl></SettingRow> : null}
                {activeModule === 'data' ? <><div className="settings-m3-storage"><div><span><M3Icon name="storage" size={19} />{vi ? 'Dung lượng lưu trữ' : 'Storage usage'}</span><b>{vi ? 'Chưa có số liệu xác minh' : 'No verified measurement'}</b></div></div>
                <SettingRow title={vi ? 'Tự động dọn dẹp' : 'Automatic cleanup'}><SelectControl value={autoCleanup} onChange={(event) => updateTextSetting(setAutoCleanup, 'bes-auto-cleanup')(event.target.value)}><option value="7">7 {vi ? 'ngày' : 'days'}</option><option value="30">30 {vi ? 'ngày' : 'days'}</option><option value="90">90 {vi ? 'ngày' : 'days'}</option><option value="never">{vi ? 'Không tự động' : 'Never'}</option></SelectControl></SettingRow>
                <div className="settings-m3-utility-actions">
                  <button type="button" onClick={clearCache}>{vi ? 'Xóa bộ nhớ đệm' : 'Clear cache'}</button>
                  <button type="button" onClick={exportSettings}>{vi ? 'Xuất cài đặt' : 'Export settings'}</button>
                  <button type="button" onClick={() => importInputRef.current?.click()}>{vi ? 'Nhập cài đặt' : 'Import settings'}</button>
                  <input ref={importInputRef} hidden type="file" accept="application/json,.json" onChange={importSettings} />
                </div>
                <div className="settings-m3-reset-row"><span>{vi ? 'Chuyển động và indicator được quản lý tại Hub phía trên.' : 'Motion and indicators are managed in the hub above.'}</span><button type="button" onClick={resetSettings}>{vi ? 'Đặt lại mặc định' : 'Reset defaults'}</button></div></> : null}
              </article>
            ) : null}
          </section> : null}

                {message ? <div className="settings-google-snackbar" role="status"><span>✓</span>{message}<button type="button" onClick={() => setMessage('')}>×</button></div> : null}
              </div>
            </section>
            </div>, document.body
          ) : null}
        </main>
      </div>
    </div>
  );
}
