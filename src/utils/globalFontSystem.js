import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const STORAGE_KEY = 'bes-global-font-preset-v1';
const STORAGE_SOURCE_KEY = 'bes-global-font-preset-source-v2';
const SETTINGS_TABLE = 'brian_global_font_settings';
const GLOBAL_EVENT = 'bes-global-font-updated';
const DEFAULT_PRESET = 'system';
const FONT_LINK_ID = 'bes-global-font-runtime-link';
const RESTORE_LOCAL_MIGRATION_KEY = 'bes-global-font-restore-migration-v1';
// During the temporary retired-font shim, Brian effectively ran in System UI
// even when an older Supabase row still contained another preset. Treat rows
// written before this recovery point as stale. Any Admin selection saved after
// this point remains authoritative and works normally.
const RESTORE_CUTOFF_MS = Date.parse('2026-08-27T16:12:00.000Z');

const VALID_PRESETS = new Set([
  'system',
  'roboto',
  'be-vietnam-pro',
  'inter',
  'noto-sans',
  'open-sans',
  'lato',
  'montserrat',
  'nunito-sans',
  'source-sans-3',
  'ibm-plex-sans',
  'fira-sans',
  'barlow',
  'poppins',
  'noto-serif',
  'merriweather',
  'playfair-display',
  'source-serif-4',
  'arial',
  'custom',
]);

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
    descriptionVi: 'Google Material, cân bằng và rất dễ đọc; hỗ trợ tiếng Việt tốt.',
    description: 'Google Material typeface with strong Vietnamese support and balanced readability.',
    family: "'Roboto', Arial, sans-serif",
    sample: 'Aa  Tiếng Việt rõ ràng · 123',
    google: true,
    vietnamese: true,
  },
  {
    id: 'be-vietnam-pro',
    label: 'Be Vietnam Pro',
    descriptionVi: 'Thiết kế ưu tiên tiếng Việt, hiện đại và rõ nét cho môi trường giáo dục.',
    description: 'Vietnamese-first modern typeface with excellent diacritic support.',
    family: "'Be Vietnam Pro', Arial, sans-serif",
    sample: 'Aa  Trường học · Giáo viên',
    google: true,
    vietnamese: true,
    recommended: true,
  },
  {
    id: 'inter',
    label: 'Inter',
    descriptionVi: 'Gọn, hiện đại, phù hợp dashboard và bảng dữ liệu mật độ cao.',
    description: 'Clean modern UI font that works well for dashboards and dense tables.',
    family: "'Inter', Arial, sans-serif",
    sample: 'Aa  Dữ liệu · Báo cáo · 2026',
    google: true,
    vietnamese: true,
  },
  {
    id: 'noto-sans',
    label: 'Noto Sans',
    descriptionVi: 'Độ phủ ký tự rộng, ổn định với tiếng Việt và nội dung đa ngôn ngữ.',
    description: 'Wide language coverage and reliable Vietnamese rendering.',
    family: "'Noto Sans', Arial, sans-serif",
    sample: 'Aa  Thông báo · Tài liệu',
    google: true,
    vietnamese: true,
  },
  {
    id: 'open-sans',
    label: 'Open Sans',
    descriptionVi: 'Dễ đọc ở cỡ nhỏ, thân thiện cho biểu mẫu, nội dung dài và trang quản trị.',
    description: 'Highly readable at small sizes for forms, long text and administration pages.',
    family: "'Open Sans', Arial, sans-serif",
    sample: 'Aa  Học tập tích cực · 123',
    google: true,
    vietnamese: true,
  },
  {
    id: 'lato',
    label: 'Lato',
    descriptionVi: 'Mềm mại nhưng chuyên nghiệp, phù hợp giao diện giáo viên và tài liệu học tập.',
    description: 'Friendly yet professional for teacher interfaces and learning content.',
    family: "'Lato', Arial, sans-serif",
    sample: 'Aa  Kế hoạch bài dạy · 123',
    google: true,
    vietnamese: true,
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    descriptionVi: 'Hình học, nổi bật, phù hợp tiêu đề lớn và giao diện có tính trình bày cao.',
    description: 'Geometric and distinctive, ideal for large headings and presentation-heavy interfaces.',
    family: "'Montserrat', Arial, sans-serif",
    sample: 'Aa  HOẠT ĐỘNG · CHỦ ĐỀ',
    google: true,
    vietnamese: true,
  },
  {
    id: 'nunito-sans',
    label: 'Nunito Sans',
    descriptionVi: 'Bo tròn nhẹ, thân thiện, dễ quan sát trên màn hình lớp học.',
    description: 'Softly rounded and friendly, with strong legibility on classroom displays.',
    family: "'Nunito Sans', Arial, sans-serif",
    sample: 'Aa  Học sinh · Giáo viên',
    google: true,
    vietnamese: true,
  },
  {
    id: 'source-sans-3',
    label: 'Source Sans 3',
    descriptionVi: 'Sạch, trung tính, rất hợp cho hệ thống quản trị, bảng và nội dung dài.',
    description: 'Neutral, clean and excellent for admin systems, tables and long-form content.',
    family: "'Source Sans 3', Arial, sans-serif",
    sample: 'Aa  Chuyên môn · Dữ liệu',
    google: true,
    vietnamese: true,
  },
  {
    id: 'ibm-plex-sans',
    label: 'IBM Plex Sans',
    descriptionVi: 'Kỹ thuật, hiện đại, phân cấp chữ rõ; phù hợp dashboard chuyên nghiệp.',
    description: 'Technical and modern with clear hierarchy for professional dashboards.',
    family: "'IBM Plex Sans', Arial, sans-serif",
    sample: 'Aa  Hệ thống · Phân quyền',
    google: true,
    vietnamese: true,
  },
  {
    id: 'fira-sans',
    label: 'Fira Sans',
    descriptionVi: 'Rõ nét trên màn hình, khoảng chữ cân bằng và đọc tốt ở nhiều kích thước.',
    description: 'Screen-optimized with balanced spacing and strong readability across sizes.',
    family: "'Fira Sans', Arial, sans-serif",
    sample: 'Aa  Nội dung · Kiểm tra',
    google: true,
    vietnamese: true,
  },
  {
    id: 'barlow',
    label: 'Barlow',
    descriptionVi: 'Hiện đại, hơi hẹp và tiết kiệm không gian; phù hợp thanh điều hướng và dashboard.',
    description: 'Modern and space-efficient, useful for navigation and dashboard interfaces.',
    family: "'Barlow', Arial, sans-serif",
    sample: 'Aa  Lịch làm việc · TTCM',
    google: true,
    vietnamese: true,
  },
  {
    id: 'poppins',
    label: 'Poppins',
    descriptionVi: 'Hình học, sáng và trẻ; phù hợp tiêu đề, thẻ ứng dụng và giao diện tương tác.',
    description: 'Bright geometric style suited to headings, app cards and interactive interfaces.',
    family: "'Poppins', Arial, sans-serif",
    sample: 'Aa  Ứng dụng sáng tạo · 123',
    google: true,
    vietnamese: true,
  },
  {
    id: 'noto-serif',
    label: 'Noto Serif',
    descriptionVi: 'Serif trang nhã, hỗ trợ tiếng Việt ổn định; phù hợp phong cách editorial và văn bản dài.',
    description: 'Elegant serif with reliable Vietnamese support for editorial and long-form reading.',
    family: "'Noto Serif', Georgia, serif",
    sample: 'Aa  Giáo dục & ngôn ngữ',
    google: true,
    vietnamese: true,
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    descriptionVi: 'Serif tối ưu cho màn hình, phù hợp bài đọc, bài báo và nội dung học thuật.',
    description: 'Screen-friendly serif suited to reading passages, articles and academic content.',
    family: "'Merriweather', Georgia, serif",
    sample: 'Aa  Nghiên cứu · Thảo luận',
    google: true,
    vietnamese: true,
  },
  {
    id: 'playfair-display',
    label: 'Playfair Display',
    descriptionVi: 'Serif tương phản cao dành cho tiêu đề editorial, trang bìa và khu vực hero.',
    description: 'High-contrast serif for editorial headings, cover-style layouts and hero areas.',
    family: "'Playfair Display', Georgia, serif",
    sample: 'Aa  Chuyên đề giáo dục',
    google: true,
    vietnamese: true,
  },
  {
    id: 'source-serif-4',
    label: 'Source Serif 4',
    descriptionVi: 'Serif linh hoạt, dễ đọc, phù hợp tài liệu dài và phong cách tạp chí hiện đại.',
    description: 'Flexible readable serif for long documents and modern editorial layouts.',
    family: "'Source Serif 4', Georgia, serif",
    sample: 'Aa  Tài liệu chuyên môn · 123',
    google: true,
    vietnamese: true,
  },
  {
    id: 'arial',
    label: 'Arial',
    descriptionVi: 'Font phổ biến, tải nhanh và tương thích cao; không cần tải từ Google.',
    description: 'Fast, broadly compatible local font with no Google Fonts request.',
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

function migrateLocalFontStateOnce() {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(RESTORE_LOCAL_MIGRATION_KEY) === '1') return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_SOURCE_KEY);
    window.localStorage.setItem(RESTORE_LOCAL_MIGRATION_KEY, '1');
  } catch { /* local persistence is optional */ }
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

function resolveServerPreset(row = {}) {
  const requested = normalizePreset(row?.font_preset);
  const updatedMs = Date.parse(String(row?.updated_at || ''));
  const stalePreRestore = requested !== 'system'
    && (!Number.isFinite(updatedMs) || updatedMs <= RESTORE_CUTOFF_MS);
  return {
    requested,
    preset: stalePreRestore ? 'system' : requested,
    stalePreRestore,
  };
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

    const resolved = resolveServerPreset(data);
    const source = resolved.stalePreRestore ? 'restore-migration' : 'server';
    const preset = applyGlobalFontPreset(resolved.preset, { source });
    return {
      ok: true,
      preset,
      requestedPreset: resolved.requested,
      migrated: resolved.stalePreRestore,
      updatedAt: data.updated_at || null,
    };
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
        if (row?.font_preset) {
          const resolved = resolveServerPreset(row);
          applyGlobalFontPreset(resolved.preset, {
            source: resolved.stalePreRestore ? 'restore-migration-realtime' : 'realtime',
          });
        } else {
          loadGlobalFontPresetFromServer();
        }
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
  migrateLocalFontStateOnce();
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
