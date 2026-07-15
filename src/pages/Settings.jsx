import React, { useEffect, useMemo, useRef, useState } from 'react';
import { callAI } from '../utils/gemini.js';
import { ACCENT_COLORS, UI_PREFERENCES_SYNC_EVENT } from '../ui-core/runtime/uiPreferences.js';
import { changeCurrentPassword } from '../utils/auth.js';
import {
  PROVIDERS,
  getAiConfigs,
  getAiProvider,
  getAiSettingsScope,
  getFallbackEnabled,
  getProviderInfo,
  saveAiConfigs,
  setAiProvider,
  setFallbackEnabled,
} from '../utils/aiProviders.js';

const PROVIDER_ICONS = {
  gemini: 'G', openai: '◎', groq: 'GQ', cerebras: 'C', mistral: 'M',
  sambanova: 'S', cohere: 'Co', openrouter: '↗', nvidia: 'N', cloudflare: '☁',
  claude: 'AI', custom: '⌘',
};

const PROVIDER_TONES = {
  gemini: 'blue', openai: 'mint', groq: 'violet', cerebras: 'cyan', mistral: 'amber',
  sambanova: 'peach', cohere: 'sky', openrouter: 'indigo', nvidia: 'green',
  cloudflare: 'orange', claude: 'rose', custom: 'slate',
};

const DEFAULT_MUSIC_SETTINGS = {
  enabled: false,
  expanded: false,
  trackMode: 'default',
  customUrl: '',
  uploadName: '',
  volume: 0.42,
  loop: true,
};

function getEmptyLocal() {
  return {
    provider: getAiProvider(),
    configs: getAiConfigs(),
    fallbackEnabled: getFallbackEnabled(),
  };
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
    // Ignore localStorage failures.
  }
}

function readBoolean(key, fallback = true) {
  const value = localStorage.getItem(key);
  if (value === null) return fallback;
  return value !== 'false';
}

function writeBoolean(key, value) {
  localStorage.setItem(key, value ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('bes-system-settings-updated', { detail: { key, value } }));
}

function maskKey(value = '') {
  const key = String(value || '').trim();
  if (!key) return 'Chưa thiết lập';
  if (key.length <= 8) return '•••• ••••';
  return `•••• •••• •••• ${key.slice(-4)}`;
}

const PROVIDER_PLAN_LABELS = {
  free: ['Miễn phí', 'Free'],
  'free-limited': ['Miễn phí giới hạn', 'Limited free'],
  'free-credit': ['Credit miễn phí', 'Free credits'],
  'free-daily': ['Quota hằng ngày', 'Daily free'],
  'dev-free': ['Miễn phí phát triển', 'Free for development'],
  trial: ['Trial miễn phí', 'Free trial'],
  paid: ['Trả phí', 'Paid'],
  custom: ['Tùy chỉnh', 'Custom'],
};

function planLabel(provider, language = 'vi') {
  const labels = PROVIDER_PLAN_LABELS[provider?.plan] || PROVIDER_PLAN_LABELS.custom;
  return labels[language === 'vi' ? 0 : 1];
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

function SettingsHeroIllustration() {
  return (
    <div className="settings-v47-illustration" aria-hidden="true">
      <span className="settings-v47-orb orb-a" />
      <span className="settings-v47-orb orb-b" />
      <span className="settings-v47-orb orb-c" />
      <div className="settings-v47-slider-card"><i /><i /><b /><b /></div>
      <div className="settings-v47-mini-status"><span>••••••</span><b>✓</b></div>
      <div className="settings-v47-palette"><i /><i /><i /><i /><i /></div>
      <div className="settings-v47-ai-chip">
        <strong>AI</strong>
        {Array.from({ length: 5 }).map((_, index) => <i key={`l-${index}`} className={`left p${index}`} />)}
        {Array.from({ length: 5 }).map((_, index) => <i key={`r-${index}`} className={`right p${index}`} />)}
      </div>
      <div className="settings-v47-provider-node node-google">G</div>
      <div className="settings-v47-provider-node node-openai">◎</div>
      <div className="settings-v47-provider-node node-ai">AI</div>
      <div className="settings-v47-provider-node node-sun">✺</div>
      <div className="settings-v47-key-card">🔑 <span>••••••••</span></div>
      <div className="settings-v47-shield"><span>🔒</span></div>
    </div>
  );
}

function CardHeader({ icon, title, subtitle, tone = 'blue', action = null }) {
  return (
    <header className="settings-v47-card bui-settings-card-head">
      <div className="settings-v47-card-title">
        <span className={`settings-v47-card-icon tone-${tone}`}>{icon}</span>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </header>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" className={`settings-v47-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked} aria-label={label}>
      <span />
    </button>
  );
}

export default function Settings({
  language,
  setLanguage,
  theme,
  setTheme,
  setApiKey,
  setAiModel,
  aiProvider,
  setAiProviderState,
  providerConfigs,
  setProviderConfigs,
  currentUser,
  motionMode = 'lite',
  setMotionMode,
  effectiveMotionMode = motionMode,
  performanceMode = 'auto',
  setPerformanceMode,
  resolvedPerformance = 'balanced',
  themeIntensity = 'balanced',
  setThemeIntensity,
  tileBorder = 'soft',
  setTileBorder,
  indicatorMode = 'on',
  setIndicatorMode,
  setGlobalLoading,
  designLanguage = 'brian-unified',
  setDesignLanguage,
  accentColor = 'blue',
  setAccentColor,
  displayDensity = 'medium',
  setDisplayDensity,
  surfaceStyle = 'soft',
  setSurfaceStyle,
  cornerStyle = 'balanced',
  setCornerStyle,
  shadowStyle = 'soft',
  setShadowStyle,
  backgroundStyle = 'gradient',
  setBackgroundStyle,
  motionStyle = 'tile',
  setMotionStyle,
}) {
  const initial = getEmptyLocal();
  const [selectedProvider, setSelectedProvider] = useState(aiProvider || initial.provider);
  const [configs, setConfigs] = useState(providerConfigs || initial.configs);
  const [fallback, setFallback] = useState(initial.fallbackEnabled);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => readBoolean('bes-global-notice-sound', true));
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(() => readBoolean('bes-global-notice-live-sync', true));
  const [dataSyncEnabled, setDataSyncEnabled] = useState(() => readBoolean('bes-global-data-sync', true));
  const [musicSettings, setMusicSettings] = useState(() => readMusicSettings(currentUser));
  const [uiSyncState, setUiSyncState] = useState({ status: currentUser?.provider === 'supabase' ? 'loading' : 'local', message: '' });
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [providerSearch, setProviderSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, message: '', ok: false });
  const [showPasswords, setShowPasswords] = useState(false);
  const importInputRef = useRef(null);
  const providerEditorRef = useRef(null);

  const currentProvider = useMemo(() => getProviderInfo(selectedProvider), [selectedProvider]);
  const currentConfig = configs[selectedProvider] || {};
  const accountScope = getAiSettingsScope();
  const configuredProviders = useMemo(
    () => PROVIDERS.filter((provider) => Boolean(String(configs[provider.id]?.apiKey || '').trim())),
    [configs],
  );
  const visibleProviders = useMemo(() => {
    const query = providerSearch.trim().toLowerCase();
    return [...PROVIDERS]
      .filter((provider) => {
        const ready = Boolean(String(configs[provider.id]?.apiKey || '').trim());
        if (providerFilter === 'recommended' && !provider.recommended) return false;
        if (providerFilter === 'configured' && !ready) return false;
        if (providerFilter === 'free' && !String(provider.plan || '').startsWith('free') && provider.plan !== 'trial') return false;
        if (!query) return true;
        return [provider.label, provider.shortLabel, provider.descriptionVi, provider.descriptionEn, provider.defaultModel]
          .some((value) => String(value || '').toLowerCase().includes(query));
      })
      .sort((left, right) => {
        if (left.id === aiProvider) return -1;
        if (right.id === aiProvider) return 1;
        const leftReady = Boolean(String(configs[left.id]?.apiKey || '').trim());
        const rightReady = Boolean(String(configs[right.id]?.apiKey || '').trim());
        if (leftReady !== rightReady) return leftReady ? -1 : 1;
        if (Boolean(left.recommended) !== Boolean(right.recommended)) return left.recommended ? -1 : 1;
        return left.label.localeCompare(right.label);
      });
  }, [aiProvider, configs, providerFilter, providerSearch]);

  const authProviders = useMemo(() => Array.isArray(currentUser?.authProviders) ? currentUser.authProviders : [], [currentUser?.authProviders]);
  const googleConnected = authProviders.includes('google');
  const emailPasswordEnabled = authProviders.includes('email') || (currentUser?.provider === 'supabase' && authProviders.length === 0);
  const canChangePassword = currentUser?.provider === 'supabase';

  useEffect(() => {
    const onUpdate = () => {
      setSelectedProvider(getAiProvider());
      setConfigs(getAiConfigs());
      setFallback(getFallbackEnabled());
    };
    window.addEventListener('bes-ai-settings-updated', onUpdate);
    return () => window.removeEventListener('bes-ai-settings-updated', onUpdate);
  }, []);

  useEffect(() => {
    setMusicSettings(readMusicSettings(currentUser));
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const onSync = (event) => {
      const detail = event?.detail || {};
      setUiSyncState({ status: detail.status || 'local', message: detail.message || '' });
    };
    window.addEventListener(UI_PREFERENCES_SYNC_EVENT, onSync);
    return () => window.removeEventListener(UI_PREFERENCES_SYNC_EVENT, onSync);
  }, []);

  const updateConfig = (patch) => {
    setConfigs((previous) => ({
      ...previous,
      [selectedProvider]: {
        ...(previous[selectedProvider] || {}),
        ...patch,
      },
    }));
  };

  const patchMusicSettings = (patch) => {
    setMusicSettings((previous) => {
      const next = { ...previous, ...patch };
      saveMusicSettings(currentUser, next);
      return next;
    });
  };

  const saveSettings = () => {
    const normalized = saveAiConfigs(configs);
    setAiProvider(selectedProvider);
    setFallbackEnabled(fallback);
    setProviderConfigs?.(normalized);
    setAiProviderState?.(selectedProvider);
    const active = normalized[selectedProvider] || {};
    setApiKey?.(active.apiKey || '');
    setAiModel?.(active.model || currentProvider.defaultModel);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const activateProvider = (providerId) => {
    const provider = getProviderInfo(providerId);
    const normalized = saveAiConfigs(configs);
    const config = normalized[providerId] || {};
    setSelectedProvider(providerId);
    setAiProvider(providerId);
    setFallbackEnabled(fallback);
    setProviderConfigs?.(normalized);
    setAiProviderState?.(providerId);
    setApiKey?.(config.apiKey || '');
    setAiModel?.(config.model || provider.defaultModel);
    setSaved(true);
    setTestResult(language === 'vi' ? `✅ ${provider.label} đã được đặt làm provider mặc định.` : `✅ ${provider.label} is now the default provider.`);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const testProvider = async (providerId = selectedProvider, useFallback = false) => {
    const providerInfo = getProviderInfo(providerId);
    const config = configs[providerId] || {};
    setTestResult('');
    setTesting(true);
    try {
      const text = await callAI({
        provider: providerId,
        apiKey: config.apiKey,
        model: config.model || providerInfo.defaultModel,
        baseUrl: config.baseUrl || providerInfo.baseUrl,
        prompt: 'Reply with exactly: Brian English Studio API OK',
        temperature: 0,
        maxOutputTokens: 48,
        governanceProfile: 'diagnostic',
        loadingLabel: language === 'vi' ? `Kiểm tra kết nối ${providerInfo.label}` : `Testing ${providerInfo.label}`,
        fallback: useFallback,
      });
      setTestResult(`✅ ${providerInfo.label}: ${text}`);
    } catch (error) {
      setTestResult(`⚠️ ${providerInfo.label}: ${error.message || String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const applyThemeMode = (mode) => {
    if (mode === 'auto') {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      localStorage.setItem('bes-theme-mode', 'auto');
      return;
    }
    localStorage.setItem('bes-theme-mode', mode);
    setTheme(mode);
  };

  const toggleSound = (next) => {
    setSoundEnabled(next);
    writeBoolean('bes-global-notice-sound', next);
  };

  const toggleLiveSync = (next) => {
    setLiveSyncEnabled(next);
    writeBoolean('bes-global-notice-live-sync', next);
  };

  const toggleDataSync = (next) => {
    setDataSyncEnabled(next);
    writeBoolean('bes-global-data-sync', next);
  };

  const exportSettings = () => {
    downloadJson('brian-english-studio-settings.json', {
      version: '10.47.0',
      exportedAt: new Date().toISOString(),
      ai: {
        provider: selectedProvider,
        configs,
        fallback,
      },
      interface: {
        language,
        theme,
        accentColor,
        displayDensity,
        designLanguage,
        themeIntensity,
        tileBorder,
        indicatorMode,
        motionMode,
        performanceMode,
        surfaceStyle,
        cornerStyle,
        shadowStyle,
        backgroundStyle,
        motionStyle,
      },
      system: {
        soundEnabled,
        liveSyncEnabled,
        dataSyncEnabled,
        musicSettings,
      },
    });
  };

  const importSettings = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.ai?.configs) setConfigs(payload.ai.configs);
      if (payload.ai?.provider) setSelectedProvider(payload.ai.provider);
      if (typeof payload.ai?.fallback === 'boolean') setFallback(payload.ai.fallback);
      if (payload.interface?.language) setLanguage?.(payload.interface.language);
      if (payload.interface?.theme) setTheme?.(payload.interface.theme);
      if (payload.interface?.accentColor) setAccentColor(payload.interface.accentColor);
      if (payload.interface?.displayDensity) setDisplayDensity(payload.interface.displayDensity);
      if (payload.interface?.designLanguage) setDesignLanguage?.(payload.interface.designLanguage);
      if (payload.interface?.themeIntensity) setThemeIntensity?.(payload.interface.themeIntensity);
      if (payload.interface?.tileBorder) setTileBorder?.(payload.interface.tileBorder);
      if (payload.interface?.indicatorMode) setIndicatorMode?.(payload.interface.indicatorMode);
      if (payload.interface?.motionMode) setMotionMode?.(payload.interface.motionMode);
      if (payload.interface?.performanceMode) setPerformanceMode?.(payload.interface.performanceMode);
      if (payload.interface?.surfaceStyle) setSurfaceStyle?.(payload.interface.surfaceStyle);
      if (payload.interface?.cornerStyle) setCornerStyle?.(payload.interface.cornerStyle);
      if (payload.interface?.shadowStyle) setShadowStyle?.(payload.interface.shadowStyle);
      if (payload.interface?.backgroundStyle) setBackgroundStyle?.(payload.interface.backgroundStyle);
      if (payload.interface?.motionStyle) setMotionStyle?.(payload.interface.motionStyle);
      if (typeof payload.system?.soundEnabled === 'boolean') toggleSound(payload.system.soundEnabled);
      if (typeof payload.system?.liveSyncEnabled === 'boolean') toggleLiveSync(payload.system.liveSyncEnabled);
      if (typeof payload.system?.dataSyncEnabled === 'boolean') toggleDataSync(payload.system.dataSyncEnabled);
      if (payload.system?.musicSettings) {
        setMusicSettings(payload.system.musicSettings);
        saveMusicSettings(currentUser, payload.system.musicSettings);
      }
      setTestResult(language === 'vi' ? '✅ Đã nhập cài đặt. Bấm Lưu để áp dụng cấu hình AI.' : '✅ Settings imported. Save to apply AI configuration.');
    } catch {
      setTestResult(language === 'vi' ? '⚠️ Tệp cài đặt không hợp lệ.' : '⚠️ Invalid settings file.');
    } finally {
      event.target.value = '';
    }
  };

  const resetSettings = () => {
    const defaults = getEmptyLocal();
    setSelectedProvider(defaults.provider);
    setConfigs(defaults.configs);
    setFallback(defaults.fallbackEnabled);
    applyThemeMode('light');
    setAccentColor('blue');
    setDisplayDensity('medium');
    setThemeIntensity?.('balanced');
    setTileBorder?.('soft');
    setIndicatorMode?.('on');
    setMotionMode?.('lite');
    setPerformanceMode?.('auto');
    setSurfaceStyle?.('soft');
    setCornerStyle?.('balanced');
    setShadowStyle?.('soft');
    setBackgroundStyle?.('gradient');
    setMotionStyle?.('tile');
    toggleSound(true);
    toggleLiveSync(true);
    toggleDataSync(true);
    const nextMusic = { ...DEFAULT_MUSIC_SETTINGS };
    setMusicSettings(nextMusic);
    saveMusicSettings(currentUser, nextMusic);
    setTestResult(language === 'vi' ? '✅ Đã khôi phục giao diện mặc định.' : '✅ Default settings restored.');
  };

  const clearCache = () => {
    const protectedKeys = new Set([
      'bet-theme',
      'bes-theme-intensity',
      'bes-tile-border',
      'bes-windows-indicator',
    ]);
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('bes-cache:') || key?.startsWith('bes-temp:')) keys.push(key);
    }
    keys.forEach((key) => { if (!protectedKeys.has(key)) localStorage.removeItem(key); });
    setTestResult(language === 'vi' ? `✅ Đã xoá ${keys.length} mục cache tạm.` : `✅ Cleared ${keys.length} temporary cache items.`);
  };

  const openNotifications = () => window.dispatchEvent(new CustomEvent('bes-global-notice-open'));

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setPasswordStatus({ loading: false, message: '', ok: false });
    if (!canChangePassword) {
      setPasswordStatus({ loading: false, ok: false, message: language === 'vi' ? 'Chức năng đổi mật khẩu chỉ dùng khi Supabase Auth đang hoạt động.' : 'Password changes require Supabase Auth.' });
      return;
    }
    if (passwordForm.next.length < 8) {
      setPasswordStatus({ loading: false, ok: false, message: language === 'vi' ? 'Mật khẩu mới phải có ít nhất 8 kí tự.' : 'The new password must contain at least 8 characters.' });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordStatus({ loading: false, ok: false, message: language === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Password confirmation does not match.' });
      return;
    }
    setPasswordStatus({ loading: true, message: '', ok: false });
    setGlobalLoading?.(true, language === 'vi' ? 'Đang cập nhật mật khẩu tài khoản...' : 'Updating account password...');
    const result = await changeCurrentPassword({ currentPassword: passwordForm.current, newPassword: passwordForm.next });
    setGlobalLoading?.(false);
    if (!result.ok) {
      const translated = String(result.message || '').includes('Current password')
        ? (language === 'vi' ? 'Mật khẩu hiện tại không chính xác.' : result.message)
        : result.message;
      setPasswordStatus({ loading: false, ok: false, message: translated || (language === 'vi' ? 'Không thể đổi mật khẩu.' : 'Could not change password.') });
      return;
    }
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordStatus({
      loading: false,
      ok: true,
      message: result.createdPassword
        ? (language === 'vi' ? 'Đã tạo mật khẩu cho tài khoản Google. Từ giờ có thể đăng nhập bằng Google hoặc email/mật khẩu.' : 'A password was created for the Google account. You can now use Google or email/password sign-in.')
        : (language === 'vi' ? 'Đã đổi mật khẩu thành công.' : 'Password changed successfully.'),
    });
  };

  const accentOptions = Object.entries(ACCENT_COLORS);

  const uiSyncLabel = {
    loading: language === 'vi' ? 'Đang đọc giao diện từ tài khoản…' : 'Loading appearance from your account…',
    saving: language === 'vi' ? 'Đang đồng bộ giao diện…' : 'Syncing appearance…',
    synced: language === 'vi' ? 'Đã đồng bộ giao diện trên tài khoản' : 'Appearance synced to your account',
    local: language === 'vi' ? 'Đã lưu giao diện trên trình duyệt này' : 'Appearance saved on this browser',
    error: language === 'vi' ? 'Đã lưu cục bộ; chưa đồng bộ được tài khoản' : 'Saved locally; account sync is unavailable',
  }[uiSyncState.status] || (language === 'vi' ? 'Đã lưu giao diện' : 'Appearance saved');

  const currentThemeMode = localStorage.getItem('bes-theme-mode') || theme;

  return (
    <div className="page settings-page-v47 bui-settings-page" data-ui="settings-page" data-ui-layout="settings">
      <section className="settings-v47-hero bui-settings-hero" data-ui="settings-hero">
        <div className="settings-v47-hero-copy">
          <span className="settings-v47-eyebrow">⚙ Settings</span>
          <h1>{language === 'vi' ? 'Cài đặt AI & hệ thống' : 'AI & system settings'}</h1>
          <p>
            {language === 'vi'
              ? 'Chọn nhà cung cấp AI, quản lý API key, tùy chỉnh giao diện, âm thanh, đồng bộ và thiết lập fallback thông minh.'
              : 'Choose AI providers, manage API keys, customize appearance, audio, sync, and smart fallback settings.'}
          </p>
          <div className="settings-v47-hero-chips">
            <span><b>{PROVIDERS.length}</b><small>Provider</small></span>
            <span><b>{configuredProviders.length}</b><small>API key</small></span>
            <span><b>{theme === 'dark' ? 'Dark' : 'Light'}</b><small>{language === 'vi' ? 'Giao diện' : 'Theme'}</small></span>
          </div>
        </div>
        <SettingsHeroIllustration />
      </section>

      <section className="settings-v47-dashboard bui-settings-grid" data-ui="settings-grid">
        <article className="settings-v47-card settings-v65-account-card">
          <CardHeader
            icon="👤"
            tone="blue"
            title={language === 'vi' ? 'Tài khoản & mật khẩu' : 'Account & password'}
            subtitle={language === 'vi' ? 'Quản lý phương thức đăng nhập và thay đổi mật khẩu tài khoản.' : 'Manage sign-in methods and change your account password.'}
            action={<span className="settings-v47-account-pill">{currentUser?.role || 'teacher'}</span>}
          />

          <div className="settings-v65-account-layout">
            <div className="settings-v65-profile-panel">
              <div className="settings-v65-avatar">{currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" /> : String(currentUser?.name || currentUser?.email || 'B').slice(0, 1).toUpperCase()}</div>
              <div className="settings-v65-profile-copy">
                <strong>{currentUser?.name || (language === 'vi' ? 'Tài khoản giáo viên' : 'Teacher account')}</strong>
                <span>{currentUser?.email || '—'}</span>
                <small>{currentUser?.school || 'Brian English Studio'}</small>
              </div>
              <div className="settings-v65-provider-badges">
                <span className={emailPasswordEnabled ? 'active' : ''}>✉ {language === 'vi' ? 'Email / mật khẩu' : 'Email / password'}</span>
                <span className={googleConnected ? 'active google' : ''}>G {googleConnected ? (language === 'vi' ? 'Google đã kết nối' : 'Google connected') : (language === 'vi' ? 'Google chưa kết nối' : 'Google not connected')}</span>
              </div>
              <p>{language === 'vi'
                ? (emailPasswordEnabled ? 'Nhập mật khẩu hiện tại để xác minh trước khi thay đổi.' : 'Tài khoản đang dùng Google. Có thể tạo thêm mật khẩu để đăng nhập bằng email khi cần.')
                : (emailPasswordEnabled ? 'Enter the current password to verify the change.' : 'This account uses Google. You can create a password for email sign-in as well.')}</p>
            </div>

            <form className="settings-v65-password-form" onSubmit={submitPasswordChange}>
              {emailPasswordEnabled ? (
                <label>
                  <span>{language === 'vi' ? 'Mật khẩu hiện tại' : 'Current password'}</span>
                  <input type={showPasswords ? 'text' : 'password'} value={passwordForm.current} onChange={(event) => setPasswordForm((previous) => ({ ...previous, current: event.target.value }))} autoComplete="current-password" placeholder={language === 'vi' ? 'Nhập mật khẩu hiện tại' : 'Enter current password'} />
                </label>
              ) : null}
              <div className="settings-v65-password-grid">
                <label>
                  <span>{emailPasswordEnabled ? (language === 'vi' ? 'Mật khẩu mới' : 'New password') : (language === 'vi' ? 'Tạo mật khẩu mới' : 'Create a password')}</span>
                  <input type={showPasswords ? 'text' : 'password'} value={passwordForm.next} onChange={(event) => setPasswordForm((previous) => ({ ...previous, next: event.target.value }))} autoComplete="new-password" placeholder={language === 'vi' ? 'Ít nhất 8 kí tự' : 'At least 8 characters'} />
                </label>
                <label>
                  <span>{language === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm password'}</span>
                  <input type={showPasswords ? 'text' : 'password'} value={passwordForm.confirm} onChange={(event) => setPasswordForm((previous) => ({ ...previous, confirm: event.target.value }))} autoComplete="new-password" placeholder={language === 'vi' ? 'Nhập lại mật khẩu mới' : 'Repeat the new password'} />
                </label>
              </div>
              <div className="settings-v65-password-actions">
                <label className="settings-v65-show-password"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /> <span>{language === 'vi' ? 'Hiện mật khẩu' : 'Show passwords'}</span></label>
                <button type="submit" className="primary" disabled={passwordStatus.loading || !canChangePassword}>{passwordStatus.loading ? (language === 'vi' ? 'Đang cập nhật...' : 'Updating...') : emailPasswordEnabled ? (language === 'vi' ? 'Đổi mật khẩu' : 'Change password') : (language === 'vi' ? 'Tạo mật khẩu' : 'Create password')}</button>
              </div>
              {passwordStatus.message ? <div className={`settings-v65-password-message ${passwordStatus.ok ? 'ok' : ''}`}>{passwordStatus.ok ? '✓ ' : '⚠ '}{passwordStatus.message}</div> : null}
            </form>
          </div>
        </article>

        <article className="settings-v47-card settings-v47-provider-card settings-v125-provider-command">
          <CardHeader
            icon="⚡"
            tone="blue"
            title={language === 'vi' ? 'AI Provider Command Center' : 'AI Provider Command Center'}
            subtitle={language === 'vi' ? 'Chọn provider mặc định bằng một lần bấm, lọc nhanh và kiểm tra cấu hình ngay tại chỗ.' : 'Choose the default provider in one click, filter quickly, and validate configuration in place.'}
            action={<span className="settings-v47-account-pill">{currentUser?.email || accountScope}</span>}
          />

          <div className="settings-v125-active-provider">
            <span className={`provider-logo large tone-${PROVIDER_TONES[aiProvider] || 'slate'}`}>{PROVIDER_ICONS[aiProvider] || 'AI'}</span>
            <div><small>{language === 'vi' ? 'Provider mặc định hiện tại' : 'Current default provider'}</small><strong>{getProviderInfo(aiProvider).label}</strong><code>{(configs[aiProvider] || {}).model || getProviderInfo(aiProvider).defaultModel}</code></div>
            <span className={String((configs[aiProvider] || {}).apiKey || '').trim() ? 'ready' : 'warning'}>{String((configs[aiProvider] || {}).apiKey || '').trim() ? '● ' + (language === 'vi' ? 'Đã có API key' : 'API key ready') : '○ ' + (language === 'vi' ? 'Chưa có API key' : 'No API key')}</span>
            <button type="button" onClick={() => testProvider(aiProvider, false)} disabled={testing}>⌁ {language === 'vi' ? 'Kiểm tra nhanh' : 'Quick test'}</button>
          </div>

          <div className="settings-v125-provider-toolbar">
            <label className="settings-v125-provider-search"><span>⌕</span><input value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} placeholder={language === 'vi' ? 'Tìm provider, model hoặc tính năng...' : 'Search provider, model, or capability...'} /></label>
            <div className="settings-v125-provider-filters" role="tablist">
              {[
                ['all', language === 'vi' ? 'Tất cả' : 'All'],
                ['recommended', language === 'vi' ? 'Nên dùng' : 'Recommended'],
                ['configured', language === 'vi' ? 'Đã có key' : 'Configured'],
                ['free', language === 'vi' ? 'Miễn phí' : 'Free'],
              ].map(([value, label]) => <button key={value} type="button" className={providerFilter === value ? 'active' : ''} onClick={() => setProviderFilter(value)}>{label}</button>)}
            </div>
          </div>

          <div className="settings-v47-provider-layout settings-v125-provider-layout">
            <div className="settings-v47-provider-list settings-v125-provider-list" aria-label={language === 'vi' ? 'Danh sách AI provider' : 'AI provider list'}>
              {visibleProviders.map((provider) => {
                const config = configs[provider.id] || {};
                const active = selectedProvider === provider.id;
                const isDefault = aiProvider === provider.id;
                const ready = Boolean(String(config.apiKey || '').trim());
                const description = language === 'vi' ? provider.descriptionVi : provider.descriptionEn;
                return (
                  <article key={provider.id} className={`settings-v47-provider-row settings-v125-provider-row ${active ? 'active' : ''} ${ready ? 'configured' : ''} ${isDefault ? 'is-default' : ''}`}>
                    <button type="button" className="settings-v47-provider-select" onClick={() => setSelectedProvider(provider.id)} aria-pressed={active}>
                      <span className={`provider-logo tone-${PROVIDER_TONES[provider.id] || 'slate'}`}>{PROVIDER_ICONS[provider.id] || 'AI'}</span>
                      <span className="provider-row-copy">
                        <span className="provider-row-title"><strong>{provider.label}</strong>{provider.recommended ? <i>{language === 'vi' ? 'Nên dùng' : 'Recommended'}</i> : null}{isDefault ? <i className="default-chip">{language === 'vi' ? 'Mặc định' : 'Default'}</i> : null}</span>
                        <small>{description}</small>
                        <code>{config.model || provider.defaultModel}</code>
                      </span>
                      <span className={`provider-plan plan-${provider.plan || 'custom'}`}>{planLabel(provider, language)}</span>
                      <b className={ready ? 'ready' : ''}>{ready ? '●' : '○'}</b>
                    </button>
                    <div className="settings-v125-provider-actions-inline">
                      <button type="button" className={isDefault ? 'current' : 'make-default'} onClick={() => activateProvider(provider.id)} disabled={isDefault}>{isDefault ? '✓ ' + (language === 'vi' ? 'Đang mặc định' : 'Default') : '★ ' + (language === 'vi' ? 'Dùng mặc định' : 'Set default')}</button>
                      <button type="button" className="edit" onClick={() => { setSelectedProvider(provider.id); providerEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>{ready ? (language === 'vi' ? 'Sửa cấu hình' : 'Edit') : (language === 'vi' ? 'Cấu hình' : 'Configure')}</button>
                    </div>
                    {(provider.helpUrl || provider.keyUrl) ? (
                      <div className="settings-v47-provider-links">
                        {provider.helpUrl ? <a href={provider.helpUrl} target="_blank" rel="noreferrer noopener">▤ {language === 'vi' ? 'Hướng dẫn' : 'Guide'}</a> : null}
                        {provider.keyUrl ? <a className="get-key" href={provider.keyUrl} target="_blank" rel="noreferrer noopener">↗ {language === 'vi' ? 'Lấy API key' : 'Get API key'}</a> : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {!visibleProviders.length ? <div className="settings-v125-provider-empty">{language === 'vi' ? 'Không tìm thấy provider phù hợp.' : 'No matching providers found.'}</div> : null}
            </div>

            <div className="settings-v47-provider-detail settings-v125-provider-detail" ref={providerEditorRef}>
              <div className="settings-v47-provider-detail-head">
                <span className={`provider-logo large tone-${PROVIDER_TONES[selectedProvider] || 'slate'}`}>{PROVIDER_ICONS[selectedProvider] || 'AI'}</span>
                <div><strong>{currentProvider.label}</strong><small>{selectedProvider === aiProvider ? (language === 'vi' ? 'Provider mặc định' : 'Default provider') : (language === 'vi' ? 'Đang chỉnh sửa' : 'Editing')}</small></div>
                <span className={`provider-plan plan-${currentProvider.plan || 'custom'}`}>{planLabel(currentProvider, language)}</span>
              </div>
              <p>{language === 'vi' ? currentProvider.descriptionVi : currentProvider.descriptionEn}</p>
              <div className="settings-v47-detail-links">
                {currentProvider.helpUrl ? <a href={currentProvider.helpUrl} target="_blank" rel="noreferrer noopener">▤ {language === 'vi' ? 'Xem hướng dẫn chính thức' : 'Official setup guide'}</a> : null}
                {currentProvider.keyUrl ? <a className="get-key" href={currentProvider.keyUrl} target="_blank" rel="noreferrer noopener">↗ {language === 'vi' ? 'Mở trang lấy API key' : 'Open API key page'}</a> : null}
              </div>
              <label>API key</label>
              <input type="password" value={currentConfig.apiKey || ''} onChange={(event) => updateConfig({ apiKey: event.target.value })} placeholder={`${currentProvider.label} API key...`} autoComplete="off" spellCheck="false" />
              <div className="settings-v47-field-grid">
                <div><label>Model</label><input list={`models-${currentProvider.id}`} value={currentConfig.model || currentProvider.defaultModel} onChange={(event) => updateConfig({ model: event.target.value })} /><datalist id={`models-${currentProvider.id}`}>{(currentProvider.models || []).map((model) => <option key={model} value={model} />)}</datalist></div>
                <div><label>Base URL</label><input value={currentConfig.baseUrl || currentProvider.baseUrl} onChange={(event) => updateConfig({ baseUrl: event.target.value })} />{currentProvider.requiresBaseUrlEdit ? <small className="settings-v47-field-help">{language === 'vi' ? 'Thay YOUR_ACCOUNT_ID bằng Account ID Cloudflare của anh.' : 'Replace YOUR_ACCOUNT_ID with your Cloudflare Account ID.'}</small> : null}</div>
              </div>
              <div className="settings-v47-inline-toggle"><div><strong>{language === 'vi' ? 'Fallback thông minh' : 'Smart fallback'}</strong><small>{language === 'vi' ? 'Tự thử provider khác đã có key khi provider chính lỗi hoặc hết quota.' : 'Try another configured provider if the primary fails or reaches quota.'}</small></div><Toggle checked={fallback} onChange={setFallback} label="Fallback" /></div>
              <div className="settings-v47-provider-actions settings-v125-detail-actions">
                <button type="button" className="primary" onClick={() => { saveSettings(); activateProvider(selectedProvider); }}>{language === 'vi' ? 'Lưu & dùng mặc định' : 'Save & set default'}</button>
                <button type="button" className="secondary" onClick={saveSettings}>{language === 'vi' ? 'Chỉ lưu cấu hình' : 'Save only'}</button>
                <button type="button" className="secondary" disabled={testing} onClick={() => testProvider(selectedProvider, false)}>{testing ? (language === 'vi' ? 'Đang kiểm tra...' : 'Testing...') : (language === 'vi' ? 'Kiểm tra kết nối' : 'Test connection')}</button>
              </div>
              {saved ? <div className="settings-v47-message ok">✅ {language === 'vi' ? 'Đã lưu cấu hình AI.' : 'AI configuration saved.'}</div> : null}
            </div>
          </div>
        </article>

        <article className="settings-v47-card settings-v47-appearance-card settings-v125-appearance-studio">
          <CardHeader icon="🎨" tone="violet" title={language === 'vi' ? 'Appearance Studio' : 'Appearance Studio'} subtitle={language === 'vi' ? 'Tùy biến giao diện và hiệu ứng đa phong cách với bản xem trước trực tiếp.' : 'Customize a multi-style interface and motion system with live preview.'} />
          <div className="settings-v125-appearance-layout">
            <div className="settings-v125-appearance-controls">
              <section>
                <label>{language === 'vi' ? 'Chế độ màu' : 'Color mode'}</label>
                <div className="settings-v47-theme-grid">
                  <button className={currentThemeMode === 'dark' ? 'active' : ''} onClick={() => applyThemeMode('dark')}>☾<span>{language === 'vi' ? 'Tối' : 'Dark'}</span></button>
                  <button className={currentThemeMode === 'light' ? 'active' : ''} onClick={() => applyThemeMode('light')}>☀<span>{language === 'vi' ? 'Sáng' : 'Light'}</span></button>
                  <button className={currentThemeMode === 'auto' ? 'active' : ''} onClick={() => applyThemeMode('auto')}>◐<span>{language === 'vi' ? 'Tự động' : 'Auto'}</span></button>
                </div>
              </section>
              <section>
                <label>{language === 'vi' ? 'Ngôn ngữ thiết kế' : 'Design language'}</label>
                <div className="bui-language-picker" role="radiogroup">
                  {[
                    ['brian-unified', 'Brian Unified', language === 'vi' ? 'Ấm, rõ nét, đậm bản sắc Brian.' : 'Warm, clear, distinctly Brian.'],
                    ['material-3', 'Android · Material 3', language === 'vi' ? 'Tonal, biểu cảm, bo tròn linh hoạt.' : 'Tonal, expressive, adaptable.'],
                    ['apple', 'Apple · iOS/iPadOS', language === 'vi' ? 'Tinh gọn, phân lớp và trong trẻo.' : 'Restrained, layered, translucent.'],
                  ].map(([value, title, description]) => <button key={value} type="button" role="radio" aria-checked={designLanguage === value} className={`bui-language-option ${designLanguage === value ? 'is-active' : ''}`} onClick={() => setDesignLanguage?.(value)}><strong>{title}</strong><small>{description}</small><span className={`bui-language-preview bui-language-preview--${value === 'material-3' ? 'material' : value === 'apple' ? 'apple' : 'brian'}`} aria-hidden="true" /></button>)}
                </div>
              </section>
              <section>
                <label>{language === 'vi' ? 'Phong cách bề mặt' : 'Surface style'}</label>
                <div className="settings-v125-style-picker">
                  {[
                    ['flat', '▭', language === 'vi' ? 'Phẳng' : 'Flat'],
                    ['soft', '▱', language === 'vi' ? 'Mềm' : 'Soft'],
                    ['glass', '◫', 'Glass'],
                    ['contrast', '◩', language === 'vi' ? 'Tương phản' : 'Contrast'],
                  ].map(([value, icon, label]) => <button key={value} type="button" className={surfaceStyle === value ? 'active' : ''} onClick={() => setSurfaceStyle?.(value)}><span>{icon}</span><b>{label}</b></button>)}
                </div>
              </section>
              <section className="settings-v125-compact-section">
                <label>{language === 'vi' ? 'Màu nhấn' : 'Accent color'}</label>
                <div className="settings-v47-accent-row">{accentOptions.map(([name, color]) => <button key={name} type="button" className={accentColor === name ? 'active' : ''} style={{ '--swatch': color }} onClick={() => setAccentColor?.(name)} aria-label={name} title={name} />)}</div>
              </section>
              <section>
                <label>{language === 'vi' ? 'Mật độ hiển thị' : 'Display density'}</label>
                <div className="settings-v47-density-row">{[['relaxed', language === 'vi' ? 'Thoáng' : 'Relaxed'], ['medium', language === 'vi' ? 'Vừa' : 'Medium'], ['compact', language === 'vi' ? 'Gọn' : 'Compact']].map(([value, label]) => <button key={value} type="button" className={displayDensity === value ? 'active' : ''} onClick={() => setDisplayDensity?.(value)}>{label}</button>)}</div>
              </section>
              <button type="button" className="settings-v47-text-button" onClick={() => setAdvancedOpen((value) => !value)}>{advancedOpen ? '−' : '+'} {language === 'vi' ? 'Công cụ nâng cao' : 'Advanced tools'}</button>
              {advancedOpen ? <div className="settings-v125-advanced-style-grid">
                <label><span>{language === 'vi' ? 'Độ bo góc' : 'Corner style'}</span><select value={cornerStyle} onChange={(event) => setCornerStyle?.(event.target.value)}><option value="sharp">Sharp</option><option value="balanced">Balanced</option><option value="round">Round</option></select></label>
                <label><span>{language === 'vi' ? 'Độ nổi' : 'Shadow style'}</span><select value={shadowStyle} onChange={(event) => setShadowStyle?.(event.target.value)}><option value="none">None</option><option value="soft">Soft</option><option value="floating">Floating</option></select></label>
                <label><span>{language === 'vi' ? 'Nền hệ thống' : 'System background'}</span><select value={backgroundStyle} onChange={(event) => setBackgroundStyle?.(event.target.value)}><option value="solid">Solid</option><option value="gradient">Gradient</option><option value="mesh">Mesh</option><option value="paper">Paper</option></select></label>
                <label><span>{language === 'vi' ? 'Kiểu chuyển cảnh' : 'Motion style'}</span><select value={motionStyle} onChange={(event) => setMotionStyle?.(event.target.value)}><option value="fade">Fade</option><option value="slide">Slide</option><option value="tile">Windows Tile</option><option value="spring">Spring</option></select></label>
                <label><span>{language === 'vi' ? 'Cường độ màu' : 'Color strength'}</span><select value={themeIntensity} onChange={(event) => setThemeIntensity?.(event.target.value)}><option value="soft">Soft</option><option value="balanced">Balanced</option><option value="strong">Strong</option><option value="bold">Bold</option></select></label>
                <label><span>{language === 'vi' ? 'Viền thành phần' : 'Component border'}</span><select value={tileBorder} onChange={(event) => setTileBorder?.(event.target.value)}><option value="off">Off</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label>
              </div> : null}
              <div className="bui-ui-sync-status" data-status={uiSyncState.status} role="status" title={uiSyncState.message || uiSyncLabel}><span aria-hidden="true">{uiSyncState.status === 'synced' ? '✓' : uiSyncState.status === 'error' ? '!' : uiSyncState.status === 'saving' || uiSyncState.status === 'loading' ? '↻' : '•'}</span><span>{uiSyncLabel}</span></div>
            </div>

            <aside className="settings-v125-live-preview" data-preview-surface={surfaceStyle} data-preview-corners={cornerStyle} data-preview-shadow={shadowStyle} data-preview-background={backgroundStyle}>
              <header><span>{language === 'vi' ? 'Xem trước trực tiếp' : 'Live preview'}</span><b>{designLanguage.replace('-', ' · ')}</b></header>
              <div className="settings-v125-preview-canvas">
                <nav><i /><i /><i /><i /></nav>
                <section><span className="hero-line wide" /><span className="hero-line" /><div className="preview-actions"><b /><b /></div></section>
                <div className="preview-grid"><article><i /><span /><small /></article><article><i /><span /><small /></article><article><i /><span /><small /></article></div>
              </div>
              <footer><span>● {accentColor}</span><span>{displayDensity}</span><span>{motionStyle}</span></footer>
            </aside>
          </div>
        </article>

        <article className="settings-v47-card settings-v47-audio-card">
          <CardHeader icon="♫" tone="green" title={language === 'vi' ? 'Âm thanh & nhạc nền' : 'Sound & background music'} subtitle={language === 'vi' ? 'Quản lý âm thanh và nhạc nền trong studio.' : 'Manage system sound and background music.'} />
          <div className="settings-v47-setting-list">
            <div><span>🔔</span><div><strong>{language === 'vi' ? 'Âm báo' : 'Notification sound'}</strong><small>{language === 'vi' ? 'Phát âm khi có thông báo mới.' : 'Play a sound for new notifications.'}</small></div><Toggle checked={soundEnabled} onChange={toggleSound} label="Sound" /></div>
            <div><span>♫</span><div><strong>{language === 'vi' ? 'Nhạc nền' : 'Background music'}</strong><small>{language === 'vi' ? 'Phát nhạc xuyên suốt hệ thống.' : 'Play music across the system.'}</small></div><Toggle checked={musicSettings.enabled} onChange={(next) => { patchMusicSettings({ enabled: next, expanded: next }); window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: next ? 'toggle' : 'toggle' } })); }} label="Music" /></div>
          </div>
          <div className="settings-v47-slider-row"><span>🔊</span><div><strong>{language === 'vi' ? 'Âm lượng tổng' : 'Master volume'}</strong><input type="range" min="0" max="1" step="0.01" value={musicSettings.volume} onChange={(event) => patchMusicSettings({ volume: Number(event.target.value) })} /></div><b>{Math.round(musicSettings.volume * 100)}%</b></div>
          <div className="settings-v47-slider-row"><span>↻</span><div><strong>{language === 'vi' ? 'Lặp lại nhạc nền' : 'Loop background music'}</strong><input type="range" min="0" max="1" step="1" value={musicSettings.loop ? 1 : 0} onChange={(event) => patchMusicSettings({ loop: event.target.value === '1' })} /></div><b>{musicSettings.loop ? 'ON' : 'OFF'}</b></div>
          <button type="button" className="settings-v47-text-button" onClick={() => window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'expand' } }))}>{language === 'vi' ? 'Mở bảng điều khiển nhạc' : 'Open music controls'} →</button>
        </article>

        <article className="settings-v47-card settings-v47-sync-card">
          <CardHeader icon="☁" tone="mint" title={language === 'vi' ? 'Đồng bộ & thông báo' : 'Sync & notifications'} subtitle={language === 'vi' ? 'Đồng bộ dữ liệu và tùy chỉnh thông báo.' : 'Control data sync and notifications.'} />
          <div className="settings-v47-setting-list">
            <div><span>↕</span><div><strong>{language === 'vi' ? 'Đồng bộ dữ liệu' : 'Data sync'}</strong><small>{language === 'vi' ? 'Tự động đồng bộ giữa các thiết bị.' : 'Automatically sync across devices.'}</small></div><Toggle checked={dataSyncEnabled} onChange={toggleDataSync} label="Data sync" /></div>
            <div><span>⟳</span><div><strong>{language === 'vi' ? 'Đồng bộ live (real-time)' : 'Live sync'}</strong><small>{language === 'vi' ? 'Cập nhật dữ liệu tức thì.' : 'Refresh data in real time.'}</small></div><Toggle checked={liveSyncEnabled} onChange={toggleLiveSync} label="Live sync" /></div>
            <button type="button" className="settings-v47-notice-row" onClick={openNotifications}><span>♧</span><div><strong>{language === 'vi' ? 'Trung tâm thông báo' : 'Notification center'}</strong><small>{language === 'vi' ? 'Quản lý tất cả thông báo hệ thống.' : 'Manage all system notifications.'}</small></div><b>{language === 'vi' ? 'Mở' : 'Open'} ›</b></button>
          </div>
        </article>

        <article className="settings-v47-card settings-v47-security-card">
          <CardHeader icon="🛡" tone="amber" title={language === 'vi' ? 'Bảo mật & API key' : 'Security & API keys'} subtitle={language === 'vi' ? 'Quản lý API key và trạng thái bảo mật.' : 'Manage API keys and security status.'} />
          <div className="settings-v47-key-list">
            {PROVIDERS.slice(0, 4).map((provider) => {
              const config = configs[provider.id] || {};
              const ready = Boolean(String(config.apiKey || '').trim());
              return (
                <button key={provider.id} type="button" onClick={() => { setSelectedProvider(provider.id); providerEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                  <span className={`provider-logo small tone-${PROVIDER_TONES[provider.id]}`}>{PROVIDER_ICONS[provider.id]}</span>
                  <strong>{provider.label}</strong>
                  <code>{maskKey(config.apiKey)}</code>
                  <em className={ready ? 'active' : ''}>{ready ? (language === 'vi' ? 'Hoạt động' : 'Active') : (language === 'vi' ? 'Chưa có key' : 'No key')}</em>
                  <b>⋮</b>
                </button>
              );
            })}
          </div>
          <button type="button" className="settings-v47-add-key" onClick={() => providerEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>＋ {language === 'vi' ? 'Thêm API key mới' : 'Add a new API key'}</button>
          <div className="settings-v47-security-note">🔒 {language === 'vi' ? 'API key được lưu riêng theo tài khoản trên trình duyệt này.' : 'API keys are stored per account in this browser.'}</div>
        </article>

        <article className="settings-v47-card settings-v47-summary-card">
          <CardHeader icon="▥" tone="sky" title={language === 'vi' ? 'Tóm tắt hệ thống' : 'System summary'} subtitle={language === 'vi' ? 'Thông tin nhanh và thao tác tiện ích.' : 'Quick status and utility actions.'} />
          <div className="settings-v47-summary-stats">
            <span><b>{PROVIDERS.length}</b><small>Provider</small></span>
            <span><b>{configuredProviders.length}</b><small>API key</small></span>
            <span><b>{resolvedPerformance}</b><small>Profile</small></span>
            <span><b>99.9%</b><small>Uptime</small></span>
          </div>
          <div className="settings-v47-quick-actions">
            <button type="button" disabled={testing} onClick={() => testProvider(selectedProvider, true)}>⌁ {language === 'vi' ? 'Kiểm tra kết nối' : 'Test connection'}</button>
            <button type="button" onClick={clearCache}>⌫ {language === 'vi' ? 'Xóa cache' : 'Clear cache'}</button>
            <button type="button" onClick={exportSettings}>⇧ {language === 'vi' ? 'Xuất cài đặt' : 'Export settings'}</button>
            <button type="button" onClick={() => importInputRef.current?.click()}>⇩ {language === 'vi' ? 'Nhập cài đặt' : 'Import settings'}</button>
            <input ref={importInputRef} hidden type="file" accept="application/json,.json" onChange={importSettings} />
          </div>
          <div className="settings-v47-system-selects">
            <label><span>{language === 'vi' ? 'Ngôn ngữ' : 'Language'}</span><select value={language} onChange={(event) => setLanguage?.(event.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
            <label><span>{language === 'vi' ? 'Chuyển cảnh' : 'Motion'}</span><select value={motionMode} onChange={(event) => setMotionMode?.(event.target.value)}><option value="lite">Lite</option><option value="full">Full</option><option value="off">Off</option></select></label>
            <label><span>{language === 'vi' ? 'Hiệu năng' : 'Performance'}</span><select value={performanceMode} onChange={(event) => setPerformanceMode?.(event.target.value)}><option value="auto">Auto</option><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label>
          </div>
          <button type="button" className="settings-v47-reset" onClick={resetSettings}>⟳ {language === 'vi' ? 'Đặt lại về mặc định' : 'Reset to defaults'}</button>
        </article>
      </section>

      {testResult ? <div className={`settings-v47-global-message ${testResult.startsWith('✅') ? 'ok' : ''}`}>{testResult}</div> : null}
      <footer className="settings-v47-footer">© 2026 Brian English Studio. All rights reserved.</footer>
    </div>
  );
}
