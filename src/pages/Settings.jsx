import React, { useMemo, useRef, useState } from 'react';
import { changeCurrentPassword } from '../utils/auth.js';

const DEFAULT_MUSIC_SETTINGS = {
  enabled: false,
  expanded: false,
  trackMode: 'default',
  customUrl: '',
  uploadName: '',
  volume: 0.42,
  loop: true,
};

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

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CardHeader({ icon, title, subtitle, tone = 'blue' }) {
  return (
    <header className="settings-v47-card-head">
      <div className="settings-v47-card-title">
        <span className={`settings-v47-card-icon tone-${tone}`}>{icon}</span>
        <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
      </div>
    </header>
  );
}

function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`settings-v47-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked} aria-label={label}><span /></button>;
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
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(() => readBoolean('bes-global-notice-live-sync', true));
  const [dataSyncEnabled, setDataSyncEnabled] = useState(() => readBoolean('bes-global-data-sync', true));
  const [musicSettings, setMusicSettings] = useState(() => readMusicSettings(currentUser));
  const [message, setMessage] = useState('');
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
  const toggleSound = (value) => { setSoundEnabled(value); writeBoolean('bes-global-notice-sound', value); };
  const toggleLiveSync = (value) => { setLiveSyncEnabled(value); writeBoolean('bes-global-notice-live-sync', value); };
  const toggleDataSync = (value) => { setDataSyncEnabled(value); writeBoolean('bes-global-data-sync', value); };

  const exportSettings = () => downloadJson('brian-english-studio-settings.json', {
    version: 'no-ai', exportedAt: new Date().toISOString(),
    interface: { language, theme, accentColor, displayDensity, motionMode, performanceMode, themeIntensity, tileBorder, indicatorMode, fontScale },
    system: { soundEnabled, liveSyncEnabled, dataSyncEnabled, musicSettings },
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
      if (typeof system.soundEnabled === 'boolean') toggleSound(system.soundEnabled);
      if (typeof system.liveSyncEnabled === 'boolean') toggleLiveSync(system.liveSyncEnabled);
      if (typeof system.dataSyncEnabled === 'boolean') toggleDataSync(system.dataSyncEnabled);
      if (system.musicSettings) patchMusic(system.musicSettings);
      setMessage(vi ? '✅ Đã nhập cài đặt hệ thống.' : '✅ System settings imported.');
    } catch {
      setMessage(vi ? '⚠️ Tệp cài đặt không hợp lệ.' : '⚠️ Invalid settings file.');
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
    setMessage(vi ? `✅ Đã xoá ${keys.length} mục dữ liệu tạm.` : `✅ Cleared ${keys.length} temporary items.`);
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
    toggleSound(true); toggleLiveSync(true); toggleDataSync(true);
    patchMusic(DEFAULT_MUSIC_SETTINGS);
    setMessage(vi ? '✅ Đã khôi phục cài đặt mặc định.' : '✅ Default settings restored.');
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

  const accents = [['blue','#4d7dff'],['violet','#7d57dd'],['green','#2aa96b'],['orange','#f18a18'],['pink','#db3977'],['teal','#0da6a0']];

  return (
    <div className="page settings-page-v47">
      <section className="settings-v47-hero">
        <div className="settings-v47-hero-copy">
          <span className="settings-v47-eyebrow">⚙ Settings</span>
          <h1>{vi ? 'Cài đặt hệ thống' : 'System settings'}</h1>
          <p>{vi ? 'Tùy chỉnh tài khoản, giao diện, chuyển cảnh, âm thanh, đồng bộ và hiệu năng.' : 'Customize account, appearance, motion, sound, sync and performance.'}</p>
          <div className="settings-v47-hero-chips">
            <span><b>{theme === 'dark' ? 'Dark' : 'Light'}</b><small>{vi ? 'Giao diện' : 'Theme'}</small></span>
            <span><b>{motionMode}</b><small>{vi ? 'Chuyển cảnh' : 'Motion'}</small></span>
            <span><b>{resolvedPerformance}</b><small>{vi ? 'Hiệu năng' : 'Performance'}</small></span>
          </div>
        </div>
        <div className="settings-v47-illustration" aria-hidden="true"><div className="settings-v47-slider-card"><i /><i /><b /><b /></div><div className="settings-v47-palette"><i /><i /><i /><i /><i /></div><div className="settings-v47-shield"><span>🔒</span></div></div>
      </section>

      <section className="settings-v47-dashboard">
        <article className="settings-v47-card settings-v65-account-card">
          <CardHeader icon="👤" tone="blue" title={vi ? 'Tài khoản & mật khẩu' : 'Account & password'} subtitle={vi ? 'Quản lý tài khoản đăng nhập hiện tại.' : 'Manage the current signed-in account.'} />
          <div className="settings-v65-profile-panel"><div className="settings-v65-avatar">{String(currentUser?.name || currentUser?.email || 'B').slice(0,1).toUpperCase()}</div><div className="settings-v65-profile-copy"><strong>{currentUser?.name || currentUser?.email || 'Brian English'}</strong><small>{currentUser?.email || '—'}</small><small>{authProviders.join(' · ') || currentUser?.provider || 'local'}</small></div></div>
          <form className="settings-v65-password-form" onSubmit={submitPasswordChange}>
            <input type="password" placeholder={vi ? 'Mật khẩu hiện tại' : 'Current password'} value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({...p,current:e.target.value}))} />
            <input type="password" placeholder={vi ? 'Mật khẩu mới' : 'New password'} value={passwordForm.next} onChange={(e) => setPasswordForm((p) => ({...p,next:e.target.value}))} />
            <input type="password" placeholder={vi ? 'Xác nhận mật khẩu mới' : 'Confirm new password'} value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({...p,confirm:e.target.value}))} />
            <button type="submit" disabled={passwordStatus.loading}>{vi ? 'Đổi mật khẩu' : 'Change password'}</button>
          </form>
          {passwordStatus.message ? <p>{passwordStatus.message}</p> : null}
        </article>

        <article className="settings-v47-card settings-v47-appearance-card">
          <CardHeader icon="◐" tone="violet" title={vi ? 'Giao diện & chữ' : 'Appearance & text'} subtitle={vi ? 'Điều chỉnh chế độ hiển thị và khả năng đọc.' : 'Adjust display and readability.'} />
          <div className="settings-v47-density-row"><button className={theme === 'light' ? 'active' : ''} onClick={() => applyTheme('light')}>Light</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => applyTheme('dark')}>Dark</button></div>
          <div className="settings-v47-color-row">{accents.map(([name,color]) => <button key={name} className={accentColor === name ? 'active' : ''} style={{'--swatch':color}} onClick={() => setAccent(name)} aria-label={name} />)}</div>
          <div className="settings-v47-density-row">{[['relaxed',vi?'Thoáng':'Relaxed'],['medium',vi?'Vừa':'Medium'],['compact',vi?'Gọn':'Compact']].map(([value,label]) => <button key={value} className={displayDensity === value ? 'active' : ''} onClick={() => setDensity(value)}>{label}</button>)}</div>
          <label>{vi ? 'Cỡ chữ' : 'Text size'} <select value={fontScale} onChange={(e) => setFontScale?.(Number(e.target.value))}><option value="100">100%</option><option value="110">110%</option><option value="120">120%</option><option value="130">130%</option></select></label>
          <div className="settings-v47-advanced-grid">
            <label><span>{vi ? 'Độ đậm giao diện' : 'Interface strength'}</span><select value={themeIntensity} onChange={(e) => setThemeIntensity?.(e.target.value)}><option value="soft">Soft</option><option value="balanced">Balanced</option><option value="strong">Strong</option><option value="bold">Bold</option></select></label>
            <label><span>{vi ? 'Viền thẻ' : 'Card border'}</span><select value={tileBorder} onChange={(e) => setTileBorder?.(e.target.value)}><option value="off">Off</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label>
            <label><span>Windows indicator</span><select value={indicatorMode} onChange={(e) => setIndicatorMode?.(e.target.value)}><option value="on">On</option><option value="off">Off</option></select></label>
          </div>
        </article>

        <article className="settings-v47-card settings-v47-audio-card">
          <CardHeader icon="♫" tone="green" title={vi ? 'Âm thanh & nhạc nền' : 'Sound & music'} subtitle={vi ? 'Điều khiển âm báo và nhạc nền.' : 'Control notifications and background music.'} />
          <div className="settings-v47-setting-list"><div><span>🔔</span><div><strong>{vi?'Âm báo':'Notification sound'}</strong></div><Toggle checked={soundEnabled} onChange={toggleSound} label="Sound" /></div><div><span>♫</span><div><strong>{vi?'Nhạc nền':'Background music'}</strong></div><Toggle checked={musicSettings.enabled} onChange={(next) => patchMusic({enabled:next,expanded:next})} label="Music" /></div></div>
          <div className="settings-v47-slider-row"><span>🔊</span><div><strong>{vi?'Âm lượng':'Volume'}</strong><input type="range" min="0" max="1" step="0.01" value={musicSettings.volume} onChange={(e) => patchMusic({volume:Number(e.target.value)})} /></div><b>{Math.round(musicSettings.volume*100)}%</b></div>
        </article>

        <article className="settings-v47-card settings-v47-sync-card">
          <CardHeader icon="☁" tone="mint" title={vi ? 'Đồng bộ & thông báo' : 'Sync & notifications'} subtitle={vi ? 'Kiểm soát đồng bộ dữ liệu hệ thống.' : 'Control system data synchronization.'} />
          <div className="settings-v47-setting-list"><div><span>↕</span><div><strong>{vi?'Đồng bộ dữ liệu':'Data sync'}</strong></div><Toggle checked={dataSyncEnabled} onChange={toggleDataSync} label="Data sync" /></div><div><span>⟳</span><div><strong>{vi?'Đồng bộ trực tiếp':'Live sync'}</strong></div><Toggle checked={liveSyncEnabled} onChange={toggleLiveSync} label="Live sync" /></div></div>
        </article>

        <article className="settings-v47-card settings-v47-summary-card">
          <CardHeader icon="▥" tone="sky" title={vi ? 'Tiện ích hệ thống' : 'System utilities'} subtitle={vi ? 'Xuất, nhập và đặt lại cài đặt.' : 'Export, import and reset settings.'} />
          <div className="settings-v47-quick-actions"><button onClick={clearCache}>⌫ {vi?'Xóa cache':'Clear cache'}</button><button onClick={exportSettings}>⇧ {vi?'Xuất cài đặt':'Export settings'}</button><button onClick={() => importInputRef.current?.click()}>⇩ {vi?'Nhập cài đặt':'Import settings'}</button><input ref={importInputRef} hidden type="file" accept="application/json,.json" onChange={importSettings} /></div>
          <div className="settings-v47-system-selects"><label><span>{vi?'Ngôn ngữ':'Language'}</span><select value={language} onChange={(e) => setLanguage?.(e.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label><label><span>{vi?'Chuyển cảnh':'Motion'}</span><select value={motionMode} onChange={(e) => setMotionMode?.(e.target.value)}><option value="lite">Lite</option><option value="full">Full</option><option value="off">Off</option></select></label><label><span>{vi?'Hiệu năng':'Performance'}</span><select value={performanceMode} onChange={(e) => setPerformanceMode?.(e.target.value)}><option value="auto">Auto</option><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label></div>
          <button className="settings-v47-reset" onClick={resetSettings}>⟳ {vi?'Đặt lại mặc định':'Reset defaults'}</button>
        </article>
      </section>
      {message ? <div className={`settings-v47-global-message ${message.startsWith('✅') ? 'ok' : ''}`}>{message}</div> : null}
      <footer className="settings-v47-footer">© 2026 Brian English Studio. All rights reserved.</footer>
    </div>
  );
}
