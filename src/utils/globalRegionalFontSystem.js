import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { GLOBAL_FONT_PRESETS } from './globalFontSystem.js';

const STORAGE_KEY = 'bes-regional-font-settings-v1';
const SETTINGS_TABLE = 'brian_global_font_settings';
const EVENT_NAME = 'bes-regional-fonts-updated';
const LINK_PREFIX = 'bes-regional-font-';

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

function definitionFor(preset) {
  return GLOBAL_FONT_PRESETS.find((item) => item.id === preset) || null;
}

function normalizePreset(value) {
  const preset = String(value || '').trim().toLowerCase();
  return ALLOWED_PRESETS.has(preset) ? preset : 'inherit';
}

export function normalizeRegionalFontSettings(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const normalized = {};
  GLOBAL_FONT_REGIONS.forEach((region) => {
    const raw = typeof source[region.id] === 'string' ? source[region.id] : source[region.id]?.preset;
    const preset = normalizePreset(raw);
    if (preset !== 'inherit') normalized[region.id] = preset;
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
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeRegionalFontSettings(settings))); }
  catch { /* optional local persistence */ }
}

function syncRemoteAssets(settings) {
  if (typeof document === 'undefined') return;
  const required = new Set(Object.values(settings).filter((preset) => REMOTE_FONT_STYLESHEETS[preset]));

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

export function getRegionalFontSettings() {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const fromDom = {};
    GLOBAL_FONT_REGIONS.forEach((region) => {
      const value = root.dataset[`fontRegion${region.id.charAt(0).toUpperCase()}${region.id.slice(1)}`];
      if (value && ALLOWED_PRESETS.has(value)) fromDom[region.id] = value;
    });
    if (Object.keys(fromDom).length) return fromDom;
  }
  return readStoredSettings();
}

export function applyRegionalFontSettings(input = {}, options = {}) {
  const settings = normalizeRegionalFontSettings(input);
  const { persist = true, source = 'local', broadcast = true } = options;
  syncRemoteAssets(settings);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    GLOBAL_FONT_REGIONS.forEach((region) => {
      const attrKey = `fontRegion${region.id.charAt(0).toUpperCase()}${region.id.slice(1)}`;
      const preset = settings[region.id];
      const definition = preset ? definitionFor(preset) : null;
      if (definition) {
        root.dataset[attrKey] = preset;
        root.style.setProperty(`--bes-font-${region.id}`, definition.family);
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
  const settings = applyRegionalFontSettings(input, { source: 'admin-apply' });
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

export { EVENT_NAME as REGIONAL_FONT_EVENT, SETTINGS_TABLE as REGIONAL_FONT_SETTINGS_TABLE };
