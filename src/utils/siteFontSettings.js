import { isSupabaseConfigured, supabase } from './supabase.js';
import { isAdminRole } from './roles.js';

const STORAGE_KEY = 'bes-global-font-id-v1';
const EVENT_NAME = 'bes-global-font-changed';
const STYLE_ID = 'bes-global-font-runtime';
const QUICKSAND_LINK_ID = 'bes-global-font-quicksand';
const SETTING_APP_ID = 'system:global-font';
const DEFAULT_FONT_ID = 'brian-gesco';
const SHARED_FONT_READ_TIMEOUT_MS = 4500;
const FONT_READY_TIMEOUT_MS = 3500;

export const SITE_FONT_OPTIONS = [
  {
    id: 'brian-gesco',
    labelVi: 'BrianGesco · Font cá nhân',
    label: 'BrianGesco · Personal font',
    family: "'BrianGescoExact', 'BrianGesco', 'Brian Personal', '1FTV HF Gesco', sans-serif",
    noteVi: 'Font nhận diện riêng đang được đóng gói trong hệ thống.',
    note: 'The bundled signature font used across Brian English Studio.',
  },
  {
    id: 'quicksand',
    labelVi: 'Quicksand · 5 độ đậm',
    label: 'Quicksand · 5 weights',
    family: "'Quicksand', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    noteVi: 'Gồm Light 300, Regular 400, Medium 500, SemiBold 600 và Bold 700; hỗ trợ đầy đủ tiếng Việt.',
    note: 'Includes Light 300, Regular 400, Medium 500, SemiBold 600 and Bold 700 with Vietnamese support.',
  },
  {
    id: 'mj-bexdroga',
    labelVi: 'MJ Bexdroga',
    label: 'MJ Bexdroga',
    family: "'MJ Bexdroga BES', 'MJ Bexdroga', sans-serif",
    noteVi: 'Font trang trí mềm mại, phù hợp tiêu đề và các điểm nhấn trực quan.',
    note: 'A soft decorative typeface for headings and visual accents.',
  },
  {
    id: '1ftv-nasi',
    labelVi: '1FTV Nasi',
    label: '1FTV Nasi',
    family: "'1FTV Nasi BES', '1FTV Nasi', sans-serif",
    noteVi: 'Font cá tính với hình dáng chữ nổi bật, đã được đóng gói trực tiếp trong website.',
    note: 'A distinctive display face bundled directly with the website.',
  },
  {
    id: 'vl-monologue',
    labelVi: 'VL Monologue',
    label: 'VL Monologue',
    family: "'VL Monologue BES', 'VL Monologue', cursive",
    noteVi: 'Font viết tay giàu biểu cảm, thích hợp cho nội dung sáng tạo.',
    note: 'An expressive handwritten font for creative content.',
  },
  {
    id: 'system-ui',
    labelVi: 'Hệ thống hiện đại',
    label: 'Modern system font',
    family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    noteVi: 'Rõ ràng, nhẹ và hiển thị tốt trên macOS, Windows, iOS, Android.',
    note: 'Clean and lightweight across macOS, Windows, iOS and Android.',
  },
  {
    id: 'arial-vietnamese',
    labelVi: 'Arial Việt',
    label: 'Arial Vietnamese',
    family: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    noteVi: 'Dễ đọc, đầy đủ dấu tiếng Việt và quen thuộc trong tài liệu giáo dục.',
    note: 'Familiar, readable and fully compatible with Vietnamese diacritics.',
  },
  {
    id: 'tahoma-vietnamese',
    labelVi: 'Tahoma Việt',
    label: 'Tahoma Vietnamese',
    family: "Tahoma, 'Segoe UI', sans-serif",
    noteVi: 'Nét chữ gọn, phù hợp bảng biểu và giao diện quản trị.',
    note: 'Compact letterforms suited to dashboards and data tables.',
  },
  {
    id: 'trebuchet-vietnamese',
    labelVi: 'Trebuchet Việt',
    label: 'Trebuchet Vietnamese',
    family: "'Trebuchet MS', Arial, sans-serif",
    noteVi: 'Thân thiện, mềm mại nhưng vẫn rõ ràng trên màn hình.',
    note: 'Friendly screen typography with clear Vietnamese marks.',
  },
  {
    id: 'georgia-vietnamese',
    labelVi: 'Georgia Việt',
    label: 'Georgia Vietnamese',
    family: "Georgia, 'Times New Roman', serif",
    noteVi: 'Phong cách học thuật, phù hợp bài đọc và nội dung dài.',
    note: 'An academic serif choice for reading and long-form content.',
  },
  {
    id: 'times-vietnamese',
    labelVi: 'Times New Roman Việt',
    label: 'Times New Roman Vietnamese',
    family: "'Times New Roman', Times, serif",
    noteVi: 'Chuẩn văn bản hành chính và tài liệu in ấn.',
    note: 'A conventional choice for formal documents and print-oriented content.',
  },
  {
    id: 'verdana-vietnamese',
    labelVi: 'Verdana Việt',
    label: 'Verdana Vietnamese',
    family: "Verdana, Geneva, sans-serif",
    noteVi: 'Khoảng chữ thoáng, dễ đọc trên màn hình nhỏ và máy chiếu.',
    note: 'Open spacing for small screens and classroom projectors.',
  },
];

function normalizeFontId(value) {
  const id = String(value || '').trim().toLowerCase();
  return SITE_FONT_OPTIONS.some((option) => option.id === id) ? id : DEFAULT_FONT_ID;
}

export function getSiteFontOption(value) {
  const id = normalizeFontId(value);
  return SITE_FONT_OPTIONS.find((option) => option.id === id) || SITE_FONT_OPTIONS[0];
}

export function readSiteFontLocal() {
  if (typeof window === 'undefined') return DEFAULT_FONT_ID;
  try { return normalizeFontId(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return DEFAULT_FONT_ID; }
}

function ensureQuicksandStylesheet() {
  if (typeof document === 'undefined') return Promise.resolve();
  const existing = document.getElementById(QUICKSAND_LINK_ID);
  if (existing) {
    if (existing.dataset.loaded === 'true' || existing.sheet) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      existing.addEventListener('load', done, { once: true });
      existing.addEventListener('error', done, { once: true });
      window.setTimeout(done, FONT_READY_TIMEOUT_MS);
    });
  }
  const link = document.createElement('link');
  link.id = QUICKSAND_LINK_ID;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap';
  const ready = new Promise((resolve) => {
    const done = () => resolve();
    link.addEventListener('load', () => {
      link.dataset.loaded = 'true';
      done();
    }, { once: true });
    link.addEventListener('error', done, { once: true });
    window.setTimeout(done, FONT_READY_TIMEOUT_MS);
  });
  document.head.appendChild(link);
  return ready;
}

function ensureRuntimeStyle() {
  if (typeof document === 'undefined') return;
  void ensureQuicksandStylesheet();
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
@font-face {
  font-family: 'MJ Bexdroga BES';
  src: url('/fonts/system/mj-bexdroga.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: '1FTV Nasi BES';
  src: url('/fonts/system/1ftv-nasi.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'VL Monologue BES';
  src: url('/fonts/system/vl-monologue.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
html, body, #root, .app-shell, .metro-shell {
  font-family: var(--font-ui) !important;
}
button, input, textarea, select, option, dialog {
  font-family: inherit !important;
}
.material-icons { font-family: 'Material Icons' !important; }
.material-icons-outlined { font-family: 'Material Icons Outlined' !important; }
.material-symbols-rounded { font-family: 'Material Symbols Rounded' !important; }
.material-symbols-outlined { font-family: 'Material Symbols Outlined' !important; }
[class^='fa'], [class*=' fa'] { font-family: 'Font Awesome 6 Free', 'Font Awesome 5 Free', FontAwesome !important; }
`;
}

export function applySiteFont(fontId, { persist = true, emit = true } = {}) {
  if (typeof document === 'undefined') return getSiteFontOption(fontId);
  const option = getSiteFontOption(fontId);
  ensureRuntimeStyle();
  const root = document.documentElement;
  root.style.setProperty('--font-ui', option.family);
  root.style.setProperty('--metro-font', 'var(--font-ui)');
  root.style.setProperty('--english-hub-personal-font', 'var(--font-ui)');
  root.style.setProperty('--bes-font-personal', 'var(--font-ui)');
  root.style.setProperty('--font-sans', 'var(--font-ui)');
  root.style.setProperty('--font-display', 'var(--font-ui)');
  root.style.setProperty('--font-body', 'var(--font-ui)');
  root.dataset.siteFont = option.id;
  if (persist && typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, option.id); } catch { /* local cache is optional */ }
  }
  if (emit && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { fontId: option.id, option } }));
  }
  return option;
}

export function installSiteFontFromCache() {
  return applySiteFont(readSiteFontLocal(), { persist: false, emit: false });
}

export async function waitForSiteFontReady(value, { timeoutMs = FONT_READY_TIMEOUT_MS } = {}) {
  const option = getSiteFontOption(value?.id || value);
  if (typeof document === 'undefined') return option;
  ensureRuntimeStyle();
  if (option.id === 'quicksand') await ensureQuicksandStylesheet();
  if (!document.fonts?.load) return option;
  const timeout = new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(timeoutMs) || 0)));
  try {
    await Promise.race([
      document.fonts.load(`400 16px ${option.family}`, 'Brian English Studio Tiếng Việt'),
      timeout,
    ]);
  } catch { /* the chosen CSS stack remains active even when font readiness cannot be measured */ }
  return option;
}

function fontIdFromRow(row) {
  return normalizeFontId(row?.reason || row?.slug || row?.title_vi || row?.title);
}

export async function loadSiteFontSetting(user, { timeoutMs = SHARED_FONT_READ_TIMEOUT_MS } = {}) {
  const localId = readSiteFontLocal();
  applySiteFont(localId, { persist: false, emit: false });
  if (!isSupabaseConfigured || !supabase) return getSiteFontOption(localId);
  try {
    let timedOut = false;
    const request = supabase
      .from('app_visibility_settings')
      .select('app_id,slug,title,title_vi,reason,updated_at')
      .eq('app_id', SETTING_APP_ID)
      .maybeSingle()
      .then(({ data, error }) => ({ data, error }))
      .catch((error) => ({ data: null, error }));
    const timeout = new Promise((resolve) => window.setTimeout(() => {
      timedOut = true;
      resolve({ data: null, error: null });
    }, Math.max(0, Number(timeoutMs) || 0)));
    const { data, error } = await Promise.race([request, timeout]);
    if (timedOut) {
      console.warn('[Global font] Shared setting read timed out; using local cache.');
      return getSiteFontOption(localId);
    }
    if (error) throw error;
    if (!data) return getSiteFontOption(localId);
    return applySiteFont(fontIdFromRow(data));
  } catch (error) {
    console.warn('[Global font] Could not load shared setting; using local cache.', error);
    return getSiteFontOption(localId);
  }
}

export async function saveSiteFontSetting(user, fontId) {
  if (!user || !isAdminRole(user.role)) throw new Error('Chỉ tài khoản Admin được thay đổi font mặc định toàn website.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình nên chưa thể lưu font dùng chung.');
  const option = getSiteFontOption(fontId);
  const now = new Date().toISOString();
  const payload = {
    app_id: SETTING_APP_ID,
    app_kind: 'tool',
    slug: option.id,
    route: 'global-font',
    title: option.label,
    title_vi: option.labelVi,
    is_hidden: false,
    hidden_roles: [],
    reason: option.id,
    updated_by: user.id || null,
    updated_at: now,
  };
  const { error } = await supabase
    .from('app_visibility_settings')
    .upsert(payload, { onConflict: 'app_id' });
  if (error) throw error;
  applySiteFont(option.id);
  return option;
}

export function subscribeSiteFontSetting(user, listener) {
  if (typeof window === 'undefined') return () => {};
  const notify = (fontId) => {
    const option = applySiteFont(fontId, { emit: false });
    listener?.(option);
  };
  const localHandler = (event) => notify(event?.detail?.fontId || readSiteFontLocal());
  const storageHandler = (event) => { if (event.key === STORAGE_KEY) notify(event.newValue); };
  window.addEventListener(EVENT_NAME, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(`bes-global-font-${String(user?.id || 'public')}-${Date.now().toString(36)}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'app_visibility_settings', filter: `app_id=eq.${SETTING_APP_ID}`,
        }, (payload) => {
          if (payload?.new) notify(fontIdFromRow(payload.new));
          else loadSiteFontSetting(user).then(listener).catch(() => {});
        })
        .subscribe();
    } catch (error) {
      console.warn('[Global font] Realtime subscription unavailable.', error);
    }
  }

  return () => {
    window.removeEventListener(EVENT_NAME, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) supabase.removeChannel(channel).catch(() => {});
  };
}
