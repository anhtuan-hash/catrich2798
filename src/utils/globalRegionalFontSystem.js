import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { GLOBAL_FONT_PRESETS } from './globalFontSystem.js';
import { GLOBAL_CUSTOM_FONT_BUCKET, validateGlobalCustomFont } from './globalCustomFont.js';

const STORAGE_KEY = 'bes-regional-font-settings-v1';
const SETTINGS_TABLE = 'brian_global_font_settings';
const EVENT_NAME = 'bes-regional-fonts-updated';
const LINK_PREFIX = 'bes-regional-font-';
const CUSTOM_STYLE_PREFIX = 'bes-regional-custom-font-face-';
const CUSTOM_FAMILY_PREFIX = 'BrianRegionalCustom';

export const GLOBAL_FONT_REGIONS = Object.freeze([
  { id: 'navigation', labelVi: 'Thanh điều hướng', label: 'Navigation', descriptionVi: 'Logo chữ, menu chính, tài khoản và nhãn trên thanh điều hướng.', description: 'Brand text, primary navigation, account and navigation labels.', sample: 'Brian English · Trang chủ · Dashboard' },
  { id: 'newswire', labelVi: 'Tin vắn / Newswire', label: 'Newswire', descriptionVi: 'Nhãn TIN VẮN, nguồn báo và tiêu đề chạy dưới thanh điều hướng.', description: 'Newswire label, sources and scrolling headlines.', sample: 'TIN VẮN · Tuổi Trẻ · Giáo dục hôm nay' },
  { id: 'pageTitle', labelVi: 'Tiêu đề trang / Hero', label: 'Page title / Hero', descriptionVi: 'H1, tiêu đề hero và tiêu đề lớn đầu trang.', description: 'H1, hero titles and large page headings.', sample: 'Xin chào, Nguyễn Anh Tuấn' },
  { id: 'sectionHeading', labelVi: 'Tiêu đề khu vực', label: 'Section headings', descriptionVi: 'H2–H4 và tiêu đề các section nội dung.', description: 'H2–H4 and content-section headings.', sample: 'Lịch làm việc tuần này' },
  { id: 'body', labelVi: 'Nội dung chính', label: 'Body copy', descriptionVi: 'Đoạn văn, mô tả, danh sách và nội dung đọc thông thường.', description: 'Paragraphs, descriptions, lists and ordinary reading text.', sample: 'Theo dõi lịch làm việc và các thông tin quan trọng.' },
  { id: 'cards', labelVi: 'Card / Widget', label: 'Cards / Widgets', descriptionVi: 'Nội dung chữ nằm trong card, widget, tile và panel.', description: 'Text inside cards, widgets, tiles and panels.', sample: 'Hoạt động gần đây · 17 sự kiện' },
  { id: 'controls', labelVi: 'Nút & biểu mẫu', label: 'Controls & forms', descriptionVi: 'Button, input, select, textarea, tab và control tương tác.', description: 'Buttons, inputs, selects, textareas, tabs and interactive controls.', sample: 'Làm mới · Lưu thay đổi · Tìm kiếm' },
  { id: 'data', labelVi: 'Bảng & dữ liệu', label: 'Tables & data', descriptionVi: 'Bảng, số liệu, thống kê, metadata và các vùng dữ liệu dày.', description: 'Tables, metrics, statistics, metadata and dense data surfaces.', sample: '12.6 · 28 học sinh · 97.5%' },
  { id: 'dashboard', labelVi: 'Dashboard', label: 'Dashboard', descriptionVi: 'Font nền riêng cho toàn bộ khu vực Dashboard; các mục semantic tùy chỉnh vẫn được ưu tiên.', description: 'Route-level Dashboard font; semantic overrides can still take priority.', sample: 'Dashboard · Tổng quan hôm nay' },
  { id: 'admin', labelVi: 'Admin & Cài đặt', label: 'Admin & Settings', descriptionVi: 'Font nền riêng cho trang quản trị và cài đặt hệ thống.', description: 'Route-level font for administration and settings.', sample: 'Cài đặt hệ thống · Quản trị tài khoản' },
]);

const REGION_IDS = new Set(GLOBAL_FONT_REGIONS.map((region) => region.id));
const ALLOWED_PRESETS = new Set(GLOBAL_FONT_PRESETS.filter((item) => !item.custom).map((item) => item.id));

const REMOTE_FONT_STYLESHEETS = Object.freeze({
  roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap',
  'be-vietnam-pro': 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap',
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'noto-sans': 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap',
  'open-sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
  lato: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
  'nunito-sans': 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700&display=swap',
  'source-sans-3': 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap',
  'ibm-plex-sans': 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
  'fira-sans': 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&display=swap',
  barlow: 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap',
  poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'noto-serif': 'https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;500;600;700&display=swap',
  merriweather: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
  'playfair-display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
  'source-serif-4': 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&display=swap',
});

let installed = false;
let realtimeUnsubscribe = null;
let retryTimers = [];
const previewObjectUrls = new Map();

function definitionFor(preset) {
  return GLOBAL_FONT_PRESETS.find((item) => item.id === preset) || null;
}

function safeRegionId(value = '') {
  const id = String(value || '').trim();
  return REGION_IDS.has(id) ? id : '';
}

function normalizePreset(value) {
  const preset = String(value || '').trim().toLowerCase();
  return ALLOWED_PRESETS.has(preset) ? preset : 'inherit';
}

function normalizeCustomEntry(value = {}) {
  const url = String(value?.url || value?.custom_font_url || '').trim();
  if (!url) return null;
  return {
    preset: 'custom',
    name: String(value?.name || value?.custom_font_name || 'Font cá nhân').trim() || 'Font cá nhân',
    url,
    path: String(value?.path || value?.custom_font_path || '').trim(),
    format: String(value?.format || value?.custom_font_format || '').trim().toLowerCase(),
    size: Number(value?.size || value?.custom_font_size || 0),
  };
}

function normalizeRegionValue(value) {
  if (typeof value === 'string') {
    const preset = normalizePreset(value);
    return preset === 'inherit' ? null : preset;
  }
  if (!value || typeof value !== 'object') return null;
  const requested = String(value.preset || '').trim().toLowerCase();
  if (requested === 'custom') return normalizeCustomEntry(value);
  const preset = normalizePreset(requested);
  return preset === 'inherit' ? null : preset;
}

export function normalizeRegionalFontSettings(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const normalized = {};
  GLOBAL_FONT_REGIONS.forEach((region) => {
    const value = normalizeRegionValue(source[region.id]);
    if (value) normalized[region.id] = value;
  });
  return normalized;
}

function readStoredSettings() {
  if (typeof window === 'undefined') return {};
  try { return normalizeRegionalFontSettings(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { return {}; }
}

function writeStoredSettings(settings) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeRegionalFontSettings(settings);
  if (Object.values(normalized).some((value) => value?.preset === 'custom' && String(value.url || '').startsWith('blob:'))) return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); }
  catch { /* optional local persistence */ }
}

function syncRemoteAssets(settings) {
  if (typeof document === 'undefined') return;
  const required = new Set(
    Object.values(settings)
      .filter((value) => typeof value === 'string' && REMOTE_FONT_STYLESHEETS[value]),
  );

  document.querySelectorAll(`link[id^="${LINK_PREFIX}"]`).forEach((link) => {
    const preset = String(link.id || '').slice(LINK_PREFIX.length);
    if (!required.has(preset)) link.remove();
  });

  required.forEach((preset) => {
    const id = `${LINK_PREFIX}${preset}`;
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    const href = REMOTE_FONT_STYLESHEETS[preset];
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  });
}

function cssUrl(value = '') {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]/g, '');
}

function formatForExtension(ext = '') {
  if (ext === 'woff2') return 'woff2';
  if (ext === 'woff') return 'woff';
  if (ext === 'ttf') return 'truetype';
  if (ext === 'otf') return 'opentype';
  return ext || 'woff2';
}

export function getRegionalCustomFontFamily(regionId) {
  const safe = safeRegionId(regionId) || 'region';
  return `${CUSTOM_FAMILY_PREFIX}-${safe}`;
}

export function getRegionalFontFamily(regionId, value) {
  if (value?.preset === 'custom' && value?.url) {
    return `'${getRegionalCustomFontFamily(regionId)}', Arial, sans-serif`;
  }
  const preset = typeof value === 'string' ? value : value?.preset;
  return definitionFor(preset)?.family || 'var(--bes-global-font-family)';
}

function injectRegionalCustomFontFace(regionId, config) {
  if (typeof document === 'undefined' || !config?.url) return;
  const safe = safeRegionId(regionId);
  if (!safe) return;
  const styleId = `${CUSTOM_STYLE_PREFIX}${safe}`;
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  const family = getRegionalCustomFontFamily(safe);
  const format = formatForExtension(config.format);
  style.textContent = `@font-face{font-family:'${family}';src:url("${cssUrl(config.url)}") format("${cssUrl(format)}");font-style:normal;font-weight:100 900;font-display:swap;}`;
}

function syncRegionalCustomAssets(settings) {
  if (typeof document === 'undefined') return;
  const required = new Set();
  GLOBAL_FONT_REGIONS.forEach((region) => {
    const value = settings[region.id];
    if (value?.preset === 'custom' && value?.url) {
      required.add(region.id);
      injectRegionalCustomFontFace(region.id, value);
    }
  });
  document.querySelectorAll(`style[id^="${CUSTOM_STYLE_PREFIX}"]`).forEach((style) => {
    const regionId = String(style.id || '').slice(CUSTOM_STYLE_PREFIX.length);
    if (!required.has(regionId)) style.remove();
  });
}

export function getRegionalFontSettings() {
  const stored = readStoredSettings();
  if (Object.keys(stored).length) return stored;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const fromDom = {};
    GLOBAL_FONT_REGIONS.forEach((region) => {
      const value = root.dataset[`fontRegion${region.id.charAt(0).toUpperCase()}${region.id.slice(1)}`];
      if (value && ALLOWED_PRESETS.has(value)) fromDom[region.id] = value;
    });
    if (Object.keys(fromDom).length) return fromDom;
  }
  return {};
}

export function applyRegionalFontSettings(input = {}, options = {}) {
  const settings = normalizeRegionalFontSettings(input);
  const { persist = true, source = 'local', broadcast = true } = options;
  syncRemoteAssets(settings);
  syncRegionalCustomAssets(settings);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    GLOBAL_FONT_REGIONS.forEach((region) => {
      const attrKey = `fontRegion${region.id.charAt(0).toUpperCase()}${region.id.slice(1)}`;
      const value = settings[region.id];
      if (value) {
        root.dataset[attrKey] = value?.preset === 'custom' ? 'custom' : String(value);
        root.style.setProperty(`--bes-font-${region.id}`, getRegionalFontFamily(region.id, value));
      } else {
        delete root.dataset[attrKey];
        root.style.removeProperty(`--bes-font-${region.id}`);
      }
    });
    root.dataset.regionalFontsSource = source;
    root.dataset.regionalFontsEnabled = Object.keys(settings).length ? 'true' : 'false';
  }

  if (persist) writeStoredSettings(settings);
  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { settings, source, at: Date.now() } }));
  }
  return settings;
}

function fileExtension(file) {
  const name = String(file?.name || '').trim().toLowerCase();
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1) : '';
}

function safeName(value = 'font') {
  return String(value || 'font')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'font';
}

export function clearRegionalCustomFontPreview(regionId = '') {
  const safe = safeRegionId(regionId);
  if (safe) {
    const url = previewObjectUrls.get(safe);
    if (url && typeof URL !== 'undefined') URL.revokeObjectURL(url);
    previewObjectUrls.delete(safe);
    return;
  }
  previewObjectUrls.forEach((url) => {
    if (url && typeof URL !== 'undefined') URL.revokeObjectURL(url);
  });
  previewObjectUrls.clear();
}

export function previewRegionalCustomFont(regionId, file, displayName = '') {
  const safe = safeRegionId(regionId);
  if (!safe) return { ok: false, message: 'Khu vực font không hợp lệ.' };
  const validation = validateGlobalCustomFont(file);
  if (!validation.ok) return validation;
  clearRegionalCustomFontPreview(safe);
  const url = URL.createObjectURL(file);
  previewObjectUrls.set(safe, url);
  const config = {
    preset: 'custom',
    name: String(displayName || file.name.replace(/\.[^.]+$/, '') || 'Font cá nhân').trim(),
    url,
    path: '',
    format: validation.ext || fileExtension(file),
    size: Number(file.size || 0),
  };
  injectRegionalCustomFontFace(safe, config);
  return { ok: true, config };
}

export async function uploadRegionalCustomFont(regionId, file, displayName = '', currentUser = null) {
  const safe = safeRegionId(regionId);
  if (!safe) return { ok: false, message: 'Khu vực font không hợp lệ.' };
  const validation = validateGlobalCustomFont(file);
  if (!validation.ok) return validation;
  const client = getRuntimeClient();
  if (!client) return { ok: false, localOnly: true, message: 'Chưa có kết nối Supabase để tải font khu vực.' };

  const ext = validation.ext || fileExtension(file);
  const name = String(displayName || file.name.replace(/\.[^.]+$/, '') || 'Font cá nhân').trim();
  const path = `regions/${safe}/${Date.now()}-${safeName(name || file.name)}.${ext}`;
  const { error: uploadError } = await client.storage.from(GLOBAL_CUSTOM_FONT_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) {
    return {
      ok: false,
      error: uploadError,
      message: /bucket|not found/i.test(String(uploadError.message || ''))
        ? 'Kho font dùng chung chưa sẵn sàng.'
        : (uploadError.message || 'Không thể tải font khu vực lên hệ thống.'),
    };
  }

  const { data: publicData } = client.storage.from(GLOBAL_CUSTOM_FONT_BUCKET).getPublicUrl(path);
  const url = publicData?.publicUrl || '';
  if (!url) {
    client.storage.from(GLOBAL_CUSTOM_FONT_BUCKET).remove([path]).catch(() => {});
    return { ok: false, message: 'Không thể tạo đường dẫn font khu vực.' };
  }

  return {
    ok: true,
    config: {
      preset: 'custom',
      name,
      url,
      path,
      format: ext,
      size: Number(file.size || 0),
      updatedBy: String(currentUser?.email || currentUser?.id || 'admin'),
    },
  };
}

export async function removeRegionalCustomFontAsset(config) {
  const path = String(config?.path || '').trim();
  if (!path) return { ok: true, skipped: true };
  const client = getRuntimeClient();
  if (!client) return { ok: false, unavailable: true };
  try {
    const { error } = await client.storage.from(GLOBAL_CUSTOM_FONT_BUCKET).remove([path]);
    return error ? { ok: false, error } : { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function isMissingRegionColumn(error) {
  const message = String(error?.message || '');
  return error?.code === '42703'
    || error?.code === 'PGRST204'
    || /region_fonts|schema cache|column.*does not exist/i.test(message);
}

export async function loadRegionalFontSettingsFromServer({ silent = true } = {}) {
  const client = getRuntimeClient();
  if (!client) {
    const settings = applyRegionalFontSettings(readStoredSettings(), { persist: false, source: 'cache' });
    return { ok: false, unavailable: true, settings };
  }

  try {
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .select('*')
      .eq('id', true)
      .maybeSingle();
    if (error) {
      if (!silent) console.warn('[RegionalFontSystem] server load failed', error);
      const settings = applyRegionalFontSettings(readStoredSettings(), { persist: false, source: 'cache' });
      return { ok: false, error, settings };
    }

    const hasServerRegions = data && Object.prototype.hasOwnProperty.call(data, 'region_fonts');
    const settings = hasServerRegions
      ? applyRegionalFontSettings(data.region_fonts || {}, { source: 'server' })
      : applyRegionalFontSettings(readStoredSettings(), { persist: false, source: 'legacy-server' });
    return { ok: true, settings, schemaReady: hasServerRegions, updatedAt: data?.updated_at || null };
  } catch (error) {
    if (!silent) console.warn('[RegionalFontSystem] server load failed', error);
    const settings = applyRegionalFontSettings(readStoredSettings(), { persist: false, source: 'cache' });
    return { ok: false, error, settings };
  }
}

export async function saveRegionalFontSettings(input = {}, currentUser = null) {
  const settings = normalizeRegionalFontSettings(input);
  const transientCustom = Object.values(settings).find(
    (value) => value?.preset === 'custom' && String(value.url || '').startsWith('blob:'),
  );
  if (transientCustom) {
    return {
      ok: false,
      settings,
      message: 'Có font cá nhân theo khu vực mới chỉ đang xem thử. Hãy tải font lên trước khi lưu cấu hình.',
    };
  }

  applyRegionalFontSettings(settings, { source: 'admin-apply' });
  const client = getRuntimeClient();
  if (!client) return { ok: false, localOnly: true, settings, message: 'Đã áp dụng trên thiết bị này; chưa có kết nối Supabase để đồng bộ font theo khu vực.' };

  try {
    const payload = {
      id: true,
      region_fonts: settings,
      updated_by: String(currentUser?.email || currentUser?.id || 'admin'),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      return {
        ok: false,
        localOnly: true,
        unavailable: isMissingRegionColumn(error),
        settings,
        error,
        message: isMissingRegionColumn(error)
          ? 'Đã áp dụng trên thiết bị Admin. Cần chạy migration region_fonts trong Supabase để đồng bộ font theo khu vực đến mọi tài khoản.'
          : (error.message || 'Không thể đồng bộ font theo khu vực lên máy chủ.'),
      };
    }

    const saved = applyRegionalFontSettings(data?.region_fonts || settings, { source: 'admin-server' });
    return { ok: true, settings: saved, updatedAt: data?.updated_at || payload.updated_at };
  } catch (error) {
    return { ok: false, localOnly: true, settings, error, message: error?.message || 'Không thể đồng bộ font theo khu vực lên máy chủ.' };
  }
}

function installRealtimeSync() {
  if (realtimeUnsubscribe) return;
  try {
    realtimeUnsubscribe = subscribeTable({
      key: 'regional-font-settings',
      table: SETTINGS_TABLE,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
        if (row && Object.prototype.hasOwnProperty.call(row, 'region_fonts')) {
          applyRegionalFontSettings(row.region_fonts || {}, { source: 'realtime' });
        } else {
          loadRegionalFontSettingsFromServer();
        }
      },
    });
  } catch {
    realtimeUnsubscribe = null;
  }
}

export function installRegionalFontSystem() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  applyRegionalFontSettings(readStoredSettings(), { persist: false, broadcast: false, source: 'bootstrap' });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) applyRegionalFontSettings(readStoredSettings(), { persist: false, source: 'storage' });
  });

  const run = async () => {
    const result = await loadRegionalFontSettingsFromServer();
    if (result.ok) installRealtimeSync();
  };
  [0, 900, 2800, 8000].forEach((delay) => retryTimers.push(window.setTimeout(run, delay)));
}

export {
  EVENT_NAME as REGIONAL_FONT_EVENT,
  SETTINGS_TABLE as REGIONAL_FONT_SETTINGS_TABLE,
};
