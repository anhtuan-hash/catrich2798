import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';

export const UI_PREFERENCES_STORAGE_KEY = 'bes-ui-preferences-v12';
export const UI_PREFERENCES_CLOUD_KEY = 'brian_ui_preferences_v12';
export const UI_PREFERENCES_EVENT = 'brian:ui-preferences-change';
export const UI_PREFERENCES_SYNC_EVENT = 'brian:ui-preferences-sync';

export const DESIGN_LANGUAGES = Object.freeze({
  BRIAN: 'brian-unified',
  MATERIAL: 'material-3',
  APPLE: 'apple',
});

export const ACCENT_COLORS = Object.freeze({
  blue: '#315fc4',
  cyan: '#087f8c',
  mint: '#14866d',
  green: '#2e7d32',
  amber: '#b86a00',
  orange: '#d75d1f',
  coral: '#c94b55',
  rose: '#b33e70',
  violet: '#6d45c6',
  indigo: '#3f51b5',
  graphite: '#4b5563',
});

export const FONT_SCALE_LEVELS = Object.freeze([100, 110, 120, 130, 140]);

const ALLOWED_DESIGN_LANGUAGES = new Set(Object.values(DESIGN_LANGUAGES));
const ALLOWED_THEMES = new Set(['light', 'dark']);
const ALLOWED_LANGUAGES = new Set(['vi', 'en']);
const ALLOWED_DENSITIES = new Set(['relaxed', 'medium', 'compact']);
const ALLOWED_INTENSITIES = new Set(['soft', 'balanced', 'strong', 'bold']);
const ALLOWED_BORDERS = new Set(['off', 'soft', 'strong']);
const ALLOWED_INDICATORS = new Set(['on', 'off']);
const ALLOWED_MOTION = new Set(['lite', 'full', 'off']);
const ALLOWED_PERFORMANCE = new Set(['auto', 'low', 'balanced', 'high']);
const ALLOWED_FONT_SCALES = new Set(FONT_SCALE_LEVELS);
const ALLOWED_SURFACE_STYLES = new Set(['flat', 'soft', 'glass', 'contrast']);
const ALLOWED_CORNER_STYLES = new Set(['sharp', 'balanced', 'round']);
const ALLOWED_SHADOW_STYLES = new Set(['none', 'soft', 'floating']);
const ALLOWED_BACKGROUND_STYLES = new Set(['solid', 'gradient', 'mesh', 'paper']);
const ALLOWED_MOTION_STYLES = new Set(['fade', 'slide', 'tile', 'spring']);

export const DEFAULT_UI_PREFERENCES = Object.freeze({
  designLanguage: DESIGN_LANGUAGES.BRIAN,
  theme: 'light',
  language: 'vi',
  accentColor: 'blue',
  displayDensity: 'medium',
  themeIntensity: 'balanced',
  tileBorder: 'soft',
  indicatorMode: 'on',
  motionMode: 'lite',
  performanceMode: 'auto',
  fontScale: 100,
  surfaceStyle: 'soft',
  cornerStyle: 'balanced',
  shadowStyle: 'soft',
  backgroundStyle: 'gradient',
  motionStyle: 'tile',
  updatedAt: 0,
});

function allowed(value, values, fallback) {
  return values.has(value) ? value : fallback;
}

function readLegacyPreferences() {
  if (typeof window === 'undefined') return {};
  const safe = (key) => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  };
  return {
    designLanguage: safe('bes-design-language-v12'),
    theme: safe('bet-theme'),
    language: safe('bet-language'),
    accentColor: safe('bes-settings-accent'),
    displayDensity: safe('bes-settings-density'),
    themeIntensity: safe('bes-theme-intensity'),
    tileBorder: safe('bes-tile-border'),
    indicatorMode: safe('bes-windows-indicator'),
    motionMode: safe('bes-motion-mode'),
    performanceMode: safe('bes-performance-mode'),
    fontScale: Number(safe('bes-font-scale') || 0),
    surfaceStyle: safe('bes-surface-style'),
    cornerStyle: safe('bes-corner-style'),
    shadowStyle: safe('bes-shadow-style'),
    backgroundStyle: safe('bes-background-style'),
    motionStyle: safe('bes-motion-style'),
  };
}

export function normalizeUiPreferences(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const accentColor = Object.prototype.hasOwnProperty.call(ACCENT_COLORS, source.accentColor)
    ? source.accentColor
    : DEFAULT_UI_PREFERENCES.accentColor;
  const fontScale = Number(source.fontScale);
  return {
    designLanguage: allowed(source.designLanguage, ALLOWED_DESIGN_LANGUAGES, DEFAULT_UI_PREFERENCES.designLanguage),
    theme: allowed(source.theme, ALLOWED_THEMES, DEFAULT_UI_PREFERENCES.theme),
    language: allowed(source.language, ALLOWED_LANGUAGES, DEFAULT_UI_PREFERENCES.language),
    accentColor,
    displayDensity: allowed(source.displayDensity, ALLOWED_DENSITIES, DEFAULT_UI_PREFERENCES.displayDensity),
    themeIntensity: allowed(source.themeIntensity, ALLOWED_INTENSITIES, DEFAULT_UI_PREFERENCES.themeIntensity),
    tileBorder: allowed(source.tileBorder, ALLOWED_BORDERS, DEFAULT_UI_PREFERENCES.tileBorder),
    indicatorMode: allowed(source.indicatorMode, ALLOWED_INDICATORS, DEFAULT_UI_PREFERENCES.indicatorMode),
    motionMode: allowed(source.motionMode, ALLOWED_MOTION, DEFAULT_UI_PREFERENCES.motionMode),
    performanceMode: allowed(source.performanceMode, ALLOWED_PERFORMANCE, DEFAULT_UI_PREFERENCES.performanceMode),
    fontScale: ALLOWED_FONT_SCALES.has(fontScale) ? fontScale : DEFAULT_UI_PREFERENCES.fontScale,
    surfaceStyle: allowed(source.surfaceStyle, ALLOWED_SURFACE_STYLES, DEFAULT_UI_PREFERENCES.surfaceStyle),
    cornerStyle: allowed(source.cornerStyle, ALLOWED_CORNER_STYLES, DEFAULT_UI_PREFERENCES.cornerStyle),
    shadowStyle: allowed(source.shadowStyle, ALLOWED_SHADOW_STYLES, DEFAULT_UI_PREFERENCES.shadowStyle),
    backgroundStyle: allowed(source.backgroundStyle, ALLOWED_BACKGROUND_STYLES, DEFAULT_UI_PREFERENCES.backgroundStyle),
    motionStyle: allowed(source.motionStyle, ALLOWED_MOTION_STYLES, DEFAULT_UI_PREFERENCES.motionStyle),
    updatedAt: Math.max(0, Number(source.updatedAt || 0)),
  };
}

export function readLocalUiPreferences() {
  if (typeof window === 'undefined') return { ...DEFAULT_UI_PREFERENCES };
  let parsed = {};
  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch { /* use legacy values */ }
  return normalizeUiPreferences({
    ...DEFAULT_UI_PREFERENCES,
    ...readLegacyPreferences(),
    ...(parsed || {}),
  });
}

function setDataset(name, value) {
  if (typeof document === 'undefined') return;
  if (value === undefined || value === null || value === '') delete document.documentElement.dataset[name];
  else document.documentElement.dataset[name] = String(value);
}

function writeLegacyKeys(preferences) {
  if (typeof window === 'undefined') return;
  const entries = [
    ['bes-design-language-v12', preferences.designLanguage],
    ['bet-theme', preferences.theme],
    ['bet-language', preferences.language],
    ['bes-settings-accent', preferences.accentColor],
    ['bes-settings-density', preferences.displayDensity],
    ['bes-theme-intensity', preferences.themeIntensity],
    ['bes-tile-border', preferences.tileBorder],
    ['bes-windows-indicator', preferences.indicatorMode],
    ['bes-motion-mode', preferences.motionMode],
    ['bes-performance-mode', preferences.performanceMode],
    ['bes-font-scale', String(preferences.fontScale)],
    ['bes-surface-style', preferences.surfaceStyle],
    ['bes-corner-style', preferences.cornerStyle],
    ['bes-shadow-style', preferences.shadowStyle],
    ['bes-background-style', preferences.backgroundStyle],
    ['bes-motion-style', preferences.motionStyle],
  ];
  try { entries.forEach(([key, value]) => window.localStorage.setItem(key, value)); } catch { /* optional */ }
}

export function persistLocalUiPreferences(value, { touch = true } = {}) {
  const normalized = normalizeUiPreferences({
    ...value,
    updatedAt: touch ? Date.now() : Number(value?.updatedAt || 0),
  });
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* optional */ }
    writeLegacyKeys(normalized);
  }
  return normalized;
}

function roundedPx(value) {
  return `${Number(value.toFixed(3))}px`;
}

function applyTypographyScale(fontScale) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const contentScale = Number(fontScale) / 100;
  const displayScale = 1 + ((contentScale - 1) * .5);
  const shellScale = 1 + ((contentScale - 1) * .4);
  const setPx = (name, base, scale = contentScale) => root.style.setProperty(name, roundedPx(base * scale));

  /* Keep rem geometry stable; BURS scales text semantically instead. */
  root.style.fontSize = '100%';
  root.style.setProperty('--ui-font-scale-factor', String(contentScale));
  root.style.setProperty('--ui-font-scale-display', String(displayScale));
  root.style.setProperty('--ui-font-scale-shell', String(shellScale));
  setPx('--burs-font-micro', 13);
  setPx('--burs-font-caption', 14);
  setPx('--burs-font-label', 15);
  setPx('--burs-font-body', 16);
  setPx('--burs-font-body-large', 18);
  setPx('--burs-font-control', 15);
  setPx('--burs-font-card-title', 21);
  setPx('--burs-font-section-title', 32, displayScale);
  setPx('--burs-font-page-title', 52, displayScale);
  setPx('--burs-font-display', 68, displayScale);
  setPx('--burs-touch-size', 44, shellScale);
}

export function applyUiPreferences(value, { persist = false, touch = false, notify = true } = {}) {
  const preferences = persist ? persistLocalUiPreferences(value, { touch }) : normalizeUiPreferences(value);
  if (typeof document !== 'undefined') {
    setDataset('designLanguage', preferences.designLanguage);
    setDataset('theme', preferences.theme);
    setDataset('language', preferences.language);
    setDataset('settingsAccent', preferences.accentColor);
    setDataset('uiDensity', preferences.displayDensity);
    setDataset('settingsDensity', preferences.displayDensity);
    setDataset('themeIntensity', preferences.themeIntensity);
    setDataset('tileBorder', preferences.tileBorder);
    setDataset('windowsIndicator', preferences.indicatorMode);
    setDataset('motion', preferences.motionMode);
    setDataset('performanceMode', preferences.performanceMode);
    setDataset('fontScale', preferences.fontScale);
    setDataset('surfaceStyle', preferences.surfaceStyle);
    setDataset('cornerStyle', preferences.cornerStyle);
    setDataset('shadowStyle', preferences.shadowStyle);
    setDataset('backgroundStyle', preferences.backgroundStyle);
    setDataset('motionStyle', preferences.motionStyle);
    document.documentElement.style.colorScheme = preferences.theme;
    applyTypographyScale(preferences.fontScale);
    document.documentElement.style.setProperty('--ui-user-accent', ACCENT_COLORS[preferences.accentColor]);
  }
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UI_PREFERENCES_EVENT, { detail: { preferences } }));
    window.dispatchEvent(new CustomEvent('brian:design-language-change', {
      detail: { language: preferences.designLanguage, preferences },
    }));
    window.dispatchEvent(new CustomEvent('bes:font-scale-changed', {
      detail: { scale: preferences.fontScale },
    }));
  }
  return preferences;
}

export function installUiPreferencesBootstrap() {
  const preferences = applyUiPreferences(readLocalUiPreferences(), { persist: false, notify: false });
  if (typeof window !== 'undefined' && !window.__besUiPreferencesStorageListener) {
    window.__besUiPreferencesStorageListener = true;
    window.addEventListener('storage', (event) => {
      if (event.key === UI_PREFERENCES_STORAGE_KEY || event.key === 'bes-design-language-v12') {
        applyUiPreferences(readLocalUiPreferences(), { persist: false });
      }
    });
  }
  return preferences;
}

function emitSync(status, detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(UI_PREFERENCES_SYNC_EVENT, { detail: { status, ...detail } }));
}

function canCloudSync(currentUser) {
  return Boolean(isSupabaseConfigured && supabase && currentUser?.id && currentUser?.provider === 'supabase');
}

export async function hydrateUiPreferencesFromCloud(currentUser) {
  const local = readLocalUiPreferences();
  if (!canCloudSync(currentUser)) {
    emitSync('local', { preferences: local });
    return { preferences: local, source: 'local' };
  }
  emitSync('loading');
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const cloudRaw = data?.user?.user_metadata?.[UI_PREFERENCES_CLOUD_KEY];
    if (!cloudRaw || typeof cloudRaw !== 'object') {
      const seeded = persistLocalUiPreferences(local, { touch: true });
      await saveUiPreferencesToCloud(currentUser, seeded, { silentStart: true });
      emitSync('synced', { source: 'local-seed', preferences: seeded });
      return { preferences: seeded, source: 'local-seed' };
    }
    const cloud = normalizeUiPreferences(cloudRaw);
    const selected = cloud.updatedAt >= local.updatedAt ? cloud : local;
    const source = cloud.updatedAt >= local.updatedAt ? 'cloud' : 'local-newer';
    const persisted = persistLocalUiPreferences(selected, { touch: false });
    applyUiPreferences(persisted, { persist: false });
    if (source === 'local-newer') await saveUiPreferencesToCloud(currentUser, persisted, { silentStart: true });
    emitSync('synced', { source, preferences: persisted });
    return { preferences: persisted, source };
  } catch (error) {
    emitSync('error', { message: error?.message || String(error), preferences: local });
    return { preferences: local, source: 'local-error', error };
  }
}

export async function saveUiPreferencesToCloud(currentUser, value, { silentStart = false } = {}) {
  const preferences = normalizeUiPreferences(value);
  if (!canCloudSync(currentUser)) {
    emitSync('local', { preferences });
    return { ok: false, localOnly: true, preferences };
  }
  if (!silentStart) emitSync('saving', { preferences });
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { [UI_PREFERENCES_CLOUD_KEY]: preferences },
    });
    if (error) throw error;
    emitSync('synced', { source: 'cloud-save', preferences, user: data?.user || null });
    return { ok: true, preferences };
  } catch (error) {
    emitSync('error', { message: error?.message || String(error), preferences });
    return { ok: false, error, preferences };
  }
}
