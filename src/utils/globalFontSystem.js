import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const STORAGE_KEY = 'bes-global-font-preset-v1';
const STORAGE_SOURCE_KEY = 'bes-global-font-preset-source-v2';
const SETTINGS_TABLE = 'brian_global_font_settings';
const GLOBAL_EVENT = 'bes-global-font-updated';
const DEFAULT_PRESET = 'system';
const FONT_LINK_ID = 'bes-global-font-runtime-link';
const VALID_PRESETS = new Set(['roboto', 'be-vietnam-pro', 'inter', 'noto-sans', 'arial', 'system', 'custom']);

const REMOTE_FONT_STYLESHEETS = Object.freeze({
  roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap',
  'be-vietnam-pro': 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap',
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'noto-sans': 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap',
});

export const GLOBAL_FONT_PRESETS = Object.freeze([
  {
    id: 'system',
    label: 'System UI',
    descriptionVi: 'Mặc định của Brian. Dùng font giao diện gốc của hệ điều hành trên từng thiết bị.',
    description: 'Brian default. Uses the native interface font supplied by each operating system.',
    family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    sample: 'Aa  Native UI · 123',
    recommended: true,
  },
  {
    id: 'roboto',
    label: 'Roboto',
    descriptionVi: 'Font Google Material; chỉ được tải và áp dụng khi Admin chủ động chọn.',
    description: 'Google Material typeface; loaded and applied only when selected by Admin.',
    family: "'Roboto', Arial, sans-serif",
    sample: 'Aa  Ă Â Ê Ô Ơ Ư  123',
  },
  {
    id: 'be-vietnam-pro',
    label: 'Be Vietnam Pro',
    descriptionVi: 'Tối ưu tiếng Việt, hiện đại và rõ nét cho môi trường giáo dục.',
    description: 'Vietnamese-first modern typeface with excellent diacritic support.',
    family: "'Be Vietnam Pro', Arial, sans-serif",
    sample: 'Aa  Trường học · Giáo viên',
  },
  {
    id: 'inter',
    label: 'Inter',
    descriptionVi: 'Gọn, hiện đại, phù hợp dashboard và bảng dữ liệu mật độ cao.',
    description: 'Clean modern UI font that works well for dashboards and dense tables.',
    family: "'Inter', Arial, sans-serif",
    sample: 'Aa  Dashboard · 2026–2027',
  },
  {
    id: 'noto-sans',
    label: 'Noto Sans',
    descriptionVi: 'Độ phủ ký tự rộng, ổn định với tiếng Việt và nội dung đa ngôn ngữ.',
    description: 'Wide language coverage and reliable Vietnamese rendering.',
    family: "'Noto Sans', Arial, sans-serif",
    sample: 'Aa  Thông báo · Tài liệu',
  },
  {
    id: 'arial',
    label: 'Arial',
    descriptionVi: 'Font phổ biến, tải nhanh và tương thích cao.',
    description: 'Fast, broadly compatible font.',
    family: 'Arial, Helvetica, sans-serif',
    sample: 'Aa  English · Tiếng Việt',
  },
  {
    id: 'custom',
    label: 'Font tùy chỉnh',
    descriptionVi: 'Font do Admin tải lên và đồng bộ đến toàn bộ tài khoản Brian.',
    description: 'A custom font uploaded by Admin and synchronized to all Brian accounts.',
    family: "'BrianGlobalCustom', Arial, sans-serif",
    sample: 'Aa  Font riêng · 123',
    custom: true,
  },
]);

let installed = false;
let realtimeUnsubscribe = null;
let retryTimers = [];

function normalizePreset(value) {
  const preset = String(value || '').trim().toLowerCase();
  return VALID_PRESETS.has(preset) ? preset : DEFAULT_PRESET;
}

function readStoredSource() {
  if (typeof window === 'undefined') return '';
  try { return String(window.localStorage.getItem(STORAGE_SOURCE_KEY) || ''); }
  catch { return ''; }
}

function storedPreset() {
  if (typeof window === 'undefined') return DEFAULT_PRESET;
  try {
    const preset = window.localStorage.getItem(STORAGE_KEY);
    const source = readStoredSource();
    // Legacy builds wrote Roboto to localStorage as a default. Values without an
    // explicit selection source are therefore ignored and Brian starts in System UI.
    if (!source) return DEFAULT_PRESET;
    return normalizePreset(preset);
  } catch { return DEFAULT_PRESET; }
}

function writeStoredPreset(preset, source = 'local') {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, normalizePreset(preset));
    window.localStorage.setItem(STORAGE_SOURCE_KEY, String(source || 'local'));
  } catch { /* persistence is optional */ }
}

function syncRemoteFontAsset(preset) {
  if (typeof document === 'undefined') return;
  const href = REMOTE_FONT_STYLESHEETS[preset] || '';
  let link = document.getElementById(FONT_LINK_ID);
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
}

export function getGlobalFontPreset() {
  if (typeof document !== 'undefined') {
    const rootValue = document.documentElement?.dataset?.globalFont;
    if (rootValue) return normalizePreset(rootValue);
  }
  return storedPreset();
}

export function getGlobalFontPresetDefinition(preset = getGlobalFontPreset()) {
  const normalized = normalizePreset(preset);
  return GLOBAL_FONT_PRESETS.find((entry) => entry.id === normalized) || GLOBAL_FONT_PRESETS[0];
}

export function applyGlobalFontPreset(preset, options = {}) {
  const normalized = normalizePreset(preset);
  const definition = getGlobalFontPresetDefinition(normalized);
  const { persist = true, source = 'local', broadcast = true } = options;

  syncRemoteFontAsset(normalized);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.globalFont = normalized;
    root.dataset.globalFontSource = source;
    root.style.setProperty('--bes-global-font-family', definition.family);
  }
  if (persist) writeStoredPreset(normalized, source);

  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GLOBAL_EVENT, {
      detail: { preset: normalized, source, at: Date.now() },
    }));
  }
  return normalized;
}

function isMissingTableError(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || /brian_global_font_settings|does not exist|schema cache/i.test(message);
}

export async function loadGlobalFontPresetFromServer({ silent = true } = {}) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, unavailable: true, preset: getGlobalFontPreset() };

  try {
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .select('font_preset,updated_at')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      if (!silent && !isMissingTableError(error)) console.warn('[FontSystem] server load failed', error);
      return { ok: false, unavailable: isMissingTableError(error), error, preset: getGlobalFontPreset() };
    }
    if (!data?.font_preset) return { ok: true, preset: getGlobalFontPreset(), empty: true };

    const preset = applyGlobalFontPreset(data.font_preset, { source: 'server' });
    return { ok: true, preset, updatedAt: data.updated_at || null };
  } catch (error) {
    if (!silent) console.warn('[FontSystem] server load failed', error);
    return { ok: false, error, preset: getGlobalFontPreset() };
  }
}

export async function saveGlobalFontPreset(preset, currentUser = null) {
  const normalized = applyGlobalFontPreset(preset, { source: 'admin-apply' });
  const client = getRuntimeClient();
  if (!client) {
    return {
      ok: false,
      localOnly: true,
      preset: normalized,
      message: 'Đã áp dụng trên thiết bị này; chưa có kết nối máy chủ để đồng bộ đến giáo viên.',
    };
  }

  try {
    const payload = {
      id: true,
      font_preset: normalized,
      updated_by: String(currentUser?.email || currentUser?.id || 'admin'),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('font_preset,updated_at')
      .single();

    if (error) {
      return {
        ok: false,
        localOnly: true,
        unavailable: isMissingTableError(error),
        preset: normalized,
        error,
        message: isMissingTableError(error)
          ? 'Đã áp dụng trên thiết bị Admin. Cần cài bảng brian_global_font_settings trong Supabase để đồng bộ đến toàn bộ tài khoản giáo viên.'
          : (error.message || 'Không thể đồng bộ font lên máy chủ.'),
      };
    }

    const saved = applyGlobalFontPreset(data?.font_preset || normalized, { source: 'admin-server' });
    return { ok: true, preset: saved, updatedAt: data?.updated_at || payload.updated_at };
  } catch (error) {
    return {
      ok: false,
      localOnly: true,
      preset: normalized,
      error,
      message: error?.message || 'Không thể đồng bộ font lên máy chủ.',
    };
  }
}

function installRealtimeSync() {
  if (realtimeUnsubscribe) return;
  try {
    realtimeUnsubscribe = subscribeTable({
      key: 'global-font-settings',
      table: SETTINGS_TABLE,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
        if (row?.font_preset) applyGlobalFontPreset(row.font_preset, { source: 'realtime' });
        else loadGlobalFontPresetFromServer();
      },
    });
  } catch {
    realtimeUnsubscribe = null;
  }
}

function scheduleRuntimeSync() {
  const run = async () => {
    const result = await loadGlobalFontPresetFromServer();
    if (result.ok) installRealtimeSync();
  };
  [0, 900, 2800, 8000].forEach((delay) => {
    retryTimers.push(window.setTimeout(run, delay));
  });
}

export function installGlobalFontSystem() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  applyGlobalFontPreset(storedPreset(), { source: 'bootstrap', broadcast: false, persist: false });

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      applyGlobalFontPreset(event.newValue, { persist: false, source: 'storage' });
    }
  };
  window.addEventListener('storage', onStorage);
  scheduleRuntimeSync();
  import('./globalCustomFont.js')
    .then(({ installGlobalCustomFontRuntime }) => installGlobalCustomFontRuntime())
    .catch(() => {});
  import('./globalPageMotion.js')
    .then(({ installGlobalPageMotion }) => installGlobalPageMotion())
    .catch(() => {});
}

export { GLOBAL_EVENT as GLOBAL_FONT_EVENT, SETTINGS_TABLE as GLOBAL_FONT_SETTINGS_TABLE };