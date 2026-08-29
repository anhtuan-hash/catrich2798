import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const STORAGE_KEY = 'bes-global-motion-config-v2';
const DRAFT_KEY = 'bes-global-motion-draft-v2';
const LEGACY_STORAGE_KEY = 'bes-global-motion-preset-v1';
const SETTINGS_TABLE = 'brian_global_motion_settings';
const HISTORY_TABLE = 'brian_global_motion_history';
const GLOBAL_EVENT = 'bes-global-motion-updated';
const CONFIG_VERSION = 2;

const SLOT_DATASETS = Object.freeze({
  page: 'motionPage',
  tab: 'motionTab',
  modal: 'motionModal',
  drawer: 'motionDrawer',
  popover: 'motionPopover',
  list: 'motionList',
  indicator: 'motionIndicator',
  loading: 'motionLoading',
  interaction: 'motionInteraction',
});

const SPEED_PROFILES = Object.freeze({
  fast: { fast: 95, base: 145, slow: 190, stagger: 18, labelVi: 'Nhanh', label: 'Fast' },
  compact: { fast: 115, base: 175, slow: 225, stagger: 22, labelVi: 'Gọn', label: 'Compact' },
  balanced: { fast: 135, base: 215, slow: 285, stagger: 28, labelVi: 'Cân bằng', label: 'Balanced' },
  smooth: { fast: 170, base: 265, slow: 350, stagger: 34, labelVi: 'Êm', label: 'Smooth' },
});

const EASING_PROFILES = Object.freeze({
  editorial: { css: 'cubic-bezier(.22,1,.36,1)', labelVi: 'Editorial', label: 'Editorial' },
  material: { css: 'cubic-bezier(.2,0,0,1)', labelVi: 'Material Standard', label: 'Material Standard' },
  emphasized: { css: 'cubic-bezier(.2,.8,.2,1)', labelVi: 'Material Emphasized', label: 'Material Emphasized' },
  fluent: { css: 'cubic-bezier(.16,1,.3,1)', labelVi: 'Fluent', label: 'Fluent' },
  linear: { css: 'linear', labelVi: 'Linear', label: 'Linear' },
  spring: { css: 'cubic-bezier(.18,1.25,.35,1)', labelVi: 'Spring Soft', label: 'Spring Soft' },
});

function option(id, labelVi, label, descriptionVi, description = descriptionVi) {
  return Object.freeze({ id, labelVi, label, descriptionVi, description });
}

export const MOTION_LIBRARY = Object.freeze({
  page: Object.freeze({
    labelVi: 'Chuyển trang', label: 'Page transition', icon: '↗',
    descriptionVi: 'Hiệu ứng khi chuyển giữa Trang chủ, Ứng dụng, Dashboard, Chủ nhiệm và các workspace.',
    options: Object.freeze([
      option('none', 'Không hiệu ứng', 'None', 'Hiển thị trang mới ngay lập tức.'),
      option('editorial-fade', 'Editorial Fade', 'Editorial Fade', 'Fade tinh gọn, phù hợp giao diện editorial.'),
      option('editorial-rise', 'Editorial Rise', 'Editorial Rise', 'Fade kết hợp nâng nhẹ nội dung; cân bằng và cao cấp.'),
      option('slide-left', 'Trượt sang trái', 'Slide left', 'Trang mới trượt nhẹ từ phải sang trái.'),
      option('slide-right', 'Trượt sang phải', 'Slide right', 'Trang mới trượt nhẹ từ trái sang phải.'),
      option('scale-fade', 'Scale Fade', 'Scale Fade', 'Phóng nhẹ kết hợp fade, không gây giật bố cục.'),
      option('shared-axis', 'Material Shared Axis', 'Material Shared Axis', 'Chuyển theo trục chung với scale và độ sâu nhẹ.'),
      option('fluent-depth', 'Fluent Depth', 'Fluent Depth', 'Cảm giác trang tiến vào theo chiều sâu kiểu Fluent.'),
      option('metro-sweep', 'Metro Sweep', 'Metro Sweep', 'Chuyển ngang phẳng, rõ nét kiểu Metro.'),
    ]),
  }),
  tab: Object.freeze({
    labelVi: 'Chuyển tab', label: 'Tab transition', icon: '⇄',
    descriptionVi: 'Hiệu ứng khi đổi tab trong Chủ nhiệm, Sổ điểm, TTCM và các workspace.',
    options: Object.freeze([
      option('none', 'Không hiệu ứng', 'None', 'Đổi tab ngay lập tức.'),
      option('instant', 'Instant', 'Instant', 'Không animate nội dung; chỉ giữ trạng thái indicator.'),
      option('crossfade', 'Crossfade', 'Crossfade', 'Fade ngắn, ổn định cho tab có nhiều dữ liệu.'),
      option('editorial-slide', 'Editorial Slide', 'Editorial Slide', 'Dịch ngang rất nhẹ kết hợp fade.'),
      option('directional', 'Directional', 'Directional', 'Chuyển ngang rõ hơn để thể hiện luồng trước/sau.'),
      option('material-shift', 'Material Shift', 'Material Shift', 'Translate + opacity theo nhịp Material.'),
    ]),
  }),
  modal: Object.freeze({
    labelVi: 'Modal & hộp thoại', label: 'Modal & dialog', icon: '▣',
    descriptionVi: 'Áp dụng cho form chỉnh sửa, xác nhận, hộp thoại và cửa sổ nổi.',
    options: Object.freeze([
      option('none', 'Không hiệu ứng', 'None', 'Modal xuất hiện ngay.'),
      option('fade', 'Fade', 'Fade', 'Chỉ thay đổi opacity.'),
      option('editorial-scale', 'Editorial Scale', 'Editorial Scale', 'Scale rất nhẹ kết hợp fade; phù hợp mặc định.'),
      option('rise', 'Rise Up', 'Rise Up', 'Modal nâng nhẹ từ dưới lên.'),
      option('drop', 'Drop Down', 'Drop Down', 'Modal hạ nhẹ từ trên xuống.'),
      option('fluent-zoom', 'Fluent Zoom', 'Fluent Zoom', 'Zoom mềm và có cảm giác chiều sâu.'),
    ]),
  }),
  drawer: Object.freeze({
    labelVi: 'Drawer & panel', label: 'Drawer & panel', icon: '▥',
    descriptionVi: 'Panel TTCM, sidebar, sheet, bảng tác vụ và các ngăn trượt.',
    options: Object.freeze([
      option('none', 'Không hiệu ứng', 'None', 'Panel xuất hiện ngay.'),
      option('slide-right', 'Trượt từ phải', 'Slide from right', 'Drawer đi vào từ cạnh phải.'),
      option('slide-left', 'Trượt từ trái', 'Slide from left', 'Drawer đi vào từ cạnh trái.'),
      option('rise', 'Trượt từ dưới', 'Rise from bottom', 'Sheet đi lên từ cạnh dưới.'),
      option('overlay-fade', 'Overlay Fade', 'Overlay Fade', 'Panel fade nhẹ, gần như không dịch chuyển.'),
      option('fluent-reveal', 'Fluent Reveal', 'Fluent Reveal', 'Slide ngắn + fade theo phong cách Fluent.'),
    ]),
  }),
  popover: Object.freeze({
    labelVi: 'Dropdown & popover', label: 'Dropdown & popover', icon: '⌄',
    descriptionVi: 'Menu tài khoản, bộ lọc, context menu, tooltip nâng cao và listbox.',
    options: Object.freeze([
      option('none', 'Không hiệu ứng', 'None', 'Menu xuất hiện ngay.'),
      option('fade', 'Fade', 'Fade', 'Fade ngắn.'),
      option('soft-pop', 'Soft Pop', 'Soft Pop', 'Scale nhẹ từ điểm neo.'),
      option('drop', 'Drop', 'Drop', 'Menu hạ xuống nhẹ.'),
      option('material-menu', 'Material Menu', 'Material Menu', 'Scale + fade kiểu Material.'),
      option('fluent-pop', 'Fluent Pop', 'Fluent Pop', 'Pop nhẹ với easing Fluent.'),
    ]),
  }),
  list: Object.freeze({
    labelVi: 'Card & danh sách', label: 'Cards & lists', icon: '≡',
    descriptionVi: 'Danh sách ứng dụng, học sinh, báo cáo, thẻ dashboard và nội dung mới được render.',
    options: Object.freeze([
      option('none', 'Không hiệu ứng', 'None', 'Danh sách hiển thị ngay.'),
      option('fade', 'Fade', 'Fade', 'Các mục fade nhẹ.'),
      option('fade-up', 'Fade Up', 'Fade Up', 'Mỗi mục nâng nhẹ từ dưới.'),
      option('editorial-cascade', 'Editorial Cascade', 'Editorial Cascade', 'Stagger rất ngắn, tối đa 8 mục để giữ hiệu năng.'),
      option('soft-stagger', 'Soft Stagger', 'Soft Stagger', 'Các mục xuất hiện lần lượt với fade.'),
      option('material-stagger', 'Material Stagger', 'Material Stagger', 'Scale + fade theo từng mục.'),
    ]),
  }),
  indicator: Object.freeze({
    labelVi: 'Indicator điều hướng', label: 'Navigation indicator', icon: '—',
    descriptionVi: 'Kiểu thể hiện mục đang active trên thanh điều hướng và tab.',
    options: Object.freeze([
      option('none', 'Không indicator phụ', 'None', 'Giữ nguyên trạng thái màu của component.'),
      option('underline', 'Underline', 'Underline', 'Gạch chân rõ, gọn.'),
      option('editorial-ink', 'Editorial Ink', 'Editorial Ink', 'Đường mực mảnh, tối giản và đậm chất editorial.'),
      option('sliding-pill', 'Sliding Pill', 'Sliding Pill', 'Nền pill mềm cho mục active.'),
      option('accent-bar', 'Accent Bar', 'Accent Bar', 'Thanh màu dọc/ngang nổi bật.'),
      option('metro-block', 'Metro Block', 'Metro Block', 'Khối phẳng rõ trạng thái kiểu Metro.'),
      option('dot', 'Dot', 'Dot', 'Chấm nhỏ đánh dấu mục active.'),
    ]),
  }),
  loading: Object.freeze({
    labelVi: 'Loading chuyển trạng thái', label: 'Loading transition', icon: '···',
    descriptionVi: 'Phản hồi khi mở route hoặc chuyển workspace; độc lập với page transition.',
    options: Object.freeze([
      option('none', 'Không loader', 'None', 'Không hiển thị loader toàn cục.'),
      option('thin-progress', 'Thin Progress', 'Thin Progress', 'Thanh tiến trình mảnh phía trên nội dung.'),
      option('editorial-line', 'Editorial Line', 'Editorial Line', 'Đường mực mảnh chạy ngang theo phong cách editorial.'),
      option('material-spinner', 'Material Spinner', 'Material Spinner', 'Spinner nhỏ, tối giản.'),
      option('metro-dots', 'Metro Dots', 'Metro Dots', 'Năm chấm chạy kiểu Metro.'),
      option('pulse', 'Pulse', 'Pulse', 'Chấm pulse nhẹ ở trung tâm.'),
    ]),
  }),
  interaction: Object.freeze({
    labelVi: 'Micro interaction', label: 'Micro interaction', icon: '◎',
    descriptionVi: 'Phản hồi hover/press cho button, card, chip và các control tương tác.',
    options: Object.freeze([
      option('none', 'Tĩnh', 'Static', 'Không scale hoặc lift.'),
      option('soft-press', 'Soft Press', 'Soft Press', 'Nhấn xuống rất nhẹ, ổn định.'),
      option('lift', 'Lift', 'Lift', 'Hover nâng 1–2 px.'),
      option('border', 'Border Emphasis', 'Border Emphasis', 'Nhấn mạnh viền thay vì dịch chuyển.'),
      option('highlight', 'Highlight', 'Highlight', 'Tăng nhẹ nền và độ tương phản khi hover.'),
    ]),
  }),
});

const PRESET_DEFINITIONS = [
  {
    id: 'editorial-calm', labelVi: 'Editorial Calm', label: 'Editorial Calm', recommended: true,
    descriptionVi: 'Nhẹ, tĩnh, sang và ưu tiên nội dung. Phù hợp phong cách editorial hiện tại của Brian.',
    speed: 'balanced', easing: 'editorial',
    slots: { page: 'editorial-rise', tab: 'crossfade', modal: 'editorial-scale', drawer: 'slide-right', popover: 'soft-pop', list: 'editorial-cascade', indicator: 'editorial-ink', loading: 'thin-progress', interaction: 'soft-press' },
  },
  {
    id: 'material-clean', labelVi: 'Material Clean', label: 'Material Clean',
    descriptionVi: 'Chuyển động rõ cấu trúc, gọn và quen thuộc theo Material.',
    speed: 'compact', easing: 'material',
    slots: { page: 'shared-axis', tab: 'material-shift', modal: 'editorial-scale', drawer: 'slide-right', popover: 'material-menu', list: 'material-stagger', indicator: 'underline', loading: 'material-spinner', interaction: 'soft-press' },
  },
  {
    id: 'fluent', labelVi: 'Fluent', label: 'Fluent',
    descriptionVi: 'Mềm, có chiều sâu và phù hợp các workspace hiện đại.',
    speed: 'balanced', easing: 'fluent',
    slots: { page: 'fluent-depth', tab: 'crossfade', modal: 'fluent-zoom', drawer: 'fluent-reveal', popover: 'fluent-pop', list: 'fade-up', indicator: 'sliding-pill', loading: 'thin-progress', interaction: 'lift' },
  },
  {
    id: 'metro', labelVi: 'Metro', label: 'Metro',
    descriptionVi: 'Chuyển ngang phẳng, indicator khối và loader chấm kiểu Metro.',
    speed: 'balanced', easing: 'fluent',
    slots: { page: 'metro-sweep', tab: 'directional', modal: 'fade', drawer: 'slide-left', popover: 'drop', list: 'soft-stagger', indicator: 'metro-block', loading: 'metro-dots', interaction: 'border' },
  },
  {
    id: 'no-motion', labelVi: 'No Motion', label: 'No Motion',
    descriptionVi: 'Tắt mọi animation nhưng vẫn giữ giao diện và trạng thái truy cập.',
    speed: 'fast', easing: 'linear',
    slots: { page: 'none', tab: 'none', modal: 'none', drawer: 'none', popover: 'none', list: 'none', indicator: 'none', loading: 'none', interaction: 'none' },
  },
];

export const GLOBAL_MOTION_PRESETS = Object.freeze(PRESET_DEFINITIONS.map((item) => Object.freeze(item)));
export const GLOBAL_MOTION_SPEEDS = SPEED_PROFILES;
export const GLOBAL_MOTION_EASINGS = EASING_PROFILES;

const LEGACY_PRESET_MAP = Object.freeze({
  off: 'no-motion', subtle: 'material-clean', balanced: 'editorial-calm', windows8: 'metro', expressive: 'fluent',
});

const TAB_TRIGGER_SELECTOR = '[role="tab"],[data-tab],.tab-button,.tab-btn,.nav-tab,.tabs button';
const TAB_PANEL_SELECTOR = '[role="tabpanel"],[data-tab-panel],.tab-panel,.tab-content,[class*="tab-panel"],[class*="tab-content"]';
const MODAL_SELECTOR = '[role="dialog"],dialog,[class*="modal"],[class*="dialog"]';
const DRAWER_SELECTOR = '[class*="drawer"],[class*="sheet"],[data-drawer]';
const POPOVER_SELECTOR = '[role="menu"],[role="listbox"],[role="tooltip"],[class*="popover"],[class*="dropdown"],[class*="menu-popover"]';
const LIST_SELECTOR = '[data-motion-list-item],.app-card,.student-card,.report-card,.dashboard-card,.summary-card,[class*="list-item"],[role="row"]';

let installed = false;
let realtimeUnsubscribe = null;
let runtimeRetryTimers = [];
let mutationFrame = 0;
let loaderHideTimer = 0;
let currentAppliedConfig = null;
const tabMotionTimestamps = new WeakMap();

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function presetById(id) {
  const normalized = LEGACY_PRESET_MAP[String(id || '').trim().toLowerCase()] || String(id || '').trim().toLowerCase();
  return GLOBAL_MOTION_PRESETS.find((entry) => entry.id === normalized) || GLOBAL_MOTION_PRESETS[0];
}

function optionIds(slot) {
  return new Set((MOTION_LIBRARY[slot]?.options || []).map((entry) => entry.id));
}

export function configFromMotionPreset(id = 'editorial-calm') {
  const preset = presetById(id);
  return normalizeGlobalMotionConfig({
    version: CONFIG_VERSION,
    preset: preset.id,
    speed: preset.speed,
    easing: preset.easing,
    slots: preset.slots,
  });
}

export function normalizeGlobalMotionConfig(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const requestedPreset = LEGACY_PRESET_MAP[String(source.preset || '').toLowerCase()] || source.preset || 'editorial-calm';
  const basePreset = presetById(requestedPreset);
  const sourceSlots = source.slots && typeof source.slots === 'object' ? source.slots : {};
  const slots = {};
  Object.keys(MOTION_LIBRARY).forEach((slot) => {
    const allowed = optionIds(slot);
    const candidate = String(sourceSlots[slot] || basePreset.slots[slot] || 'none');
    slots[slot] = allowed.has(candidate) ? candidate : (basePreset.slots[slot] || 'none');
  });
  const speed = SPEED_PROFILES[source.speed] ? source.speed : basePreset.speed;
  const easing = EASING_PROFILES[source.easing] ? source.easing : basePreset.easing;
  const presetMatches = GLOBAL_MOTION_PRESETS.some((preset) => preset.id === requestedPreset &&
    preset.speed === speed && preset.easing === easing && Object.keys(slots).every((slot) => preset.slots[slot] === slots[slot]));
  return {
    version: CONFIG_VERSION,
    preset: presetMatches ? requestedPreset : (requestedPreset === 'custom' ? 'custom' : 'custom'),
    speed,
    easing,
    slots,
  };
}

function readJson(key) {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch { return null; }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* local persistence is optional */ }
}

function storedConfig() {
  const current = readJson(STORAGE_KEY);
  if (current) return normalizeGlobalMotionConfig(current);
  if (typeof window !== 'undefined') {
    try {
      const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) return configFromMotionPreset(legacy);
    } catch { /* ignore legacy cache */ }
  }
  return configFromMotionPreset('editorial-calm');
}

export function getGlobalMotionConfig() {
  return deepClone(currentAppliedConfig || storedConfig());
}

export function getGlobalMotionPreset() {
  return getGlobalMotionConfig().preset;
}

export function getGlobalMotionPresetDefinition(preset = getGlobalMotionPreset()) {
  return presetById(preset);
}

export function getGlobalMotionDraft() {
  const draft = readJson(DRAFT_KEY);
  return draft ? normalizeGlobalMotionConfig(draft) : null;
}

export function saveGlobalMotionDraft(config) {
  const normalized = normalizeGlobalMotionConfig({ ...config, preset: 'custom' });
  writeJson(DRAFT_KEY, normalized);
  return normalized;
}

export function clearGlobalMotionDraft() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* optional */ }
}

function applyTimingVariables(root, config) {
  const speed = SPEED_PROFILES[config.speed] || SPEED_PROFILES.balanced;
  const easing = EASING_PROFILES[config.easing] || EASING_PROFILES.editorial;
  root.style.setProperty('--gm-fast', `${speed.fast}ms`);
  root.style.setProperty('--gm-base', `${speed.base}ms`);
  root.style.setProperty('--gm-slow', `${speed.slow}ms`);
  root.style.setProperty('--gm-stagger', `${speed.stagger}ms`);
  root.style.setProperty('--gm-ease', easing.css);
  root.style.setProperty('--gm-ease-emphasized', easing.css);
}

function motionIsEnabled(config) {
  return Object.entries(config.slots).some(([slot, effect]) => slot !== 'indicator' && effect !== 'none' && effect !== 'instant');
}

export function applyGlobalMotionConfig(config, options = {}) {
  const normalized = normalizeGlobalMotionConfig(config);
  const { persist = true, source = 'local', broadcast = true } = options;
  currentAppliedConfig = normalized;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.motionMode = normalized.preset;
    root.dataset.motionEnabled = motionIsEnabled(normalized) ? 'true' : 'false';
    root.dataset.motionSource = source;
    root.dataset.motionSpeed = normalized.speed;
    root.dataset.motionEasing = normalized.easing;
    Object.entries(SLOT_DATASETS).forEach(([slot, dataset]) => { root.dataset[dataset] = normalized.slots[slot]; });
    applyTimingVariables(root, normalized);
  }

  if (persist) writeJson(STORAGE_KEY, normalized);
  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GLOBAL_EVENT, { detail: { config: deepClone(normalized), preset: normalized.preset, source, at: Date.now() } }));
  }
  return deepClone(normalized);
}

export function applyGlobalMotionPreset(preset, options = {}) {
  return applyGlobalMotionConfig(configFromMotionPreset(preset), options).preset;
}

function isMissingTableError(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || /does not exist|schema cache|brian_global_motion_settings/i.test(message);
}

function isLegacySchemaError(error) {
  const message = String(error?.message || '');
  return /column .*config|column .*version|config.*does not exist|version.*does not exist/i.test(message);
}

async function readServerRow(client) {
  let response = await client.from(SETTINGS_TABLE).select('config,preset,version,updated_at,updated_by').eq('id', true).maybeSingle();
  if (response.error && isLegacySchemaError(response.error)) {
    const legacy = await client.from(SETTINGS_TABLE).select('preset,updated_at,updated_by').eq('id', true).maybeSingle();
    if (!legacy.error && legacy.data) return { ...legacy, legacySchema: true };
  }
  return response;
}

export async function loadGlobalMotionConfigFromServer({ silent = true } = {}) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, unavailable: true, config: getGlobalMotionConfig() };
  try {
    const { data, error, legacySchema } = await readServerRow(client);
    if (error) {
      if (!silent && !isMissingTableError(error)) console.warn('[MotionV2] server load failed', error);
      return { ok: false, unavailable: isMissingTableError(error), error, config: getGlobalMotionConfig() };
    }
    if (!data) return { ok: true, empty: true, config: getGlobalMotionConfig() };
    const config = data.config && typeof data.config === 'object'
      ? normalizeGlobalMotionConfig(data.config)
      : configFromMotionPreset(data.preset || 'editorial-calm');
    applyGlobalMotionConfig(config, { source: legacySchema ? 'server-legacy' : 'server' });
    return { ok: true, config, preset: config.preset, updatedAt: data.updated_at || null, updatedBy: data.updated_by || null, legacySchema: Boolean(legacySchema) };
  } catch (error) {
    if (!silent) console.warn('[MotionV2] server load failed', error);
    return { ok: false, error, config: getGlobalMotionConfig() };
  }
}

export async function loadGlobalMotionPresetFromServer(options = {}) {
  const result = await loadGlobalMotionConfigFromServer(options);
  return { ...result, preset: result.config?.preset || getGlobalMotionPreset() };
}

async function recordHistory(client, currentRow, currentUser) {
  if (!currentRow) return;
  const config = currentRow.config && typeof currentRow.config === 'object'
    ? normalizeGlobalMotionConfig(currentRow.config)
    : configFromMotionPreset(currentRow.preset || 'editorial-calm');
  try {
    await client.from(HISTORY_TABLE).insert({
      config,
      preset: config.preset,
      version: CONFIG_VERSION,
      updated_by: String(currentRow.updated_by || currentUser?.email || currentUser?.id || 'admin'),
    });
  } catch { /* history is optional until migration is installed */ }
}

export async function saveGlobalMotionConfig(config, currentUser = null, { recordPrevious = true } = {}) {
  const normalized = normalizeGlobalMotionConfig(config);
  applyGlobalMotionConfig(normalized, { source: 'admin-preview' });
  const client = getRuntimeClient();
  if (!client) {
    return { ok: false, localOnly: true, unavailable: true, config: normalized, preset: normalized.preset, message: 'Đã xem trước trên thiết bị này; chưa có kết nối máy chủ để xuất bản toàn site.' };
  }

  try {
    const current = await readServerRow(client);
    if (current.error && isLegacySchemaError(current.error)) {
      return { ok: false, unavailable: true, legacySchema: true, config: normalized, preset: normalized.preset, message: 'Cần chạy migration Motion Library v2 trong Supabase trước khi xuất bản cấu hình theo từng thành phần.' };
    }
    if (recordPrevious && current.data) await recordHistory(client, current.data, currentUser);

    const payload = {
      id: true,
      preset: normalized.preset,
      config: normalized,
      version: CONFIG_VERSION,
      updated_by: String(currentUser?.email || currentUser?.id || 'admin'),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('config,preset,version,updated_at,updated_by')
      .single();

    if (error) {
      return {
        ok: false,
        unavailable: isMissingTableError(error) || isLegacySchemaError(error),
        legacySchema: isLegacySchemaError(error),
        config: normalized,
        preset: normalized.preset,
        error,
        message: isLegacySchemaError(error)
          ? 'Cần chạy migration Motion Library v2 trong Supabase trước khi xuất bản toàn hệ thống.'
          : (error.message || 'Không thể đồng bộ Motion Library lên máy chủ.'),
      };
    }

    const saved = normalizeGlobalMotionConfig(data?.config || normalized);
    applyGlobalMotionConfig(saved, { source: 'admin-server' });
    clearGlobalMotionDraft();
    return { ok: true, config: saved, preset: saved.preset, updatedAt: data?.updated_at || payload.updated_at, updatedBy: data?.updated_by || payload.updated_by };
  } catch (error) {
    return { ok: false, localOnly: true, config: normalized, preset: normalized.preset, error, message: error?.message || 'Không thể đồng bộ Motion Library lên máy chủ.' };
  }
}

export async function saveGlobalMotionPreset(preset, currentUser = null) {
  return saveGlobalMotionConfig(configFromMotionPreset(preset), currentUser);
}

export async function listGlobalMotionHistory(limit = 8) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, items: [] };
  try {
    const { data, error } = await client
      .from(HISTORY_TABLE)
      .select('id,config,preset,version,updated_by,created_at')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(20, Number(limit) || 8)));
    if (error) return { ok: false, unavailable: isMissingTableError(error), error, items: [] };
    return { ok: true, items: (data || []).map((row) => ({ ...row, config: normalizeGlobalMotionConfig(row.config || configFromMotionPreset(row.preset)) })) };
  } catch (error) { return { ok: false, error, items: [] }; }
}

export async function restoreGlobalMotionHistory(entry, currentUser = null) {
  if (!entry?.config) return { ok: false, message: 'Không tìm thấy cấu hình để khôi phục.' };
  return saveGlobalMotionConfig(entry.config, currentUser, { recordPrevious: true });
}

function isVisible(node) {
  if (!node?.isConnected || node.hidden || node.getAttribute?.('aria-hidden') === 'true') return false;
  if (typeof window === 'undefined') return true;
  const style = window.getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function markTabPanel(panel) {
  if (!panel?.matches?.(TAB_PANEL_SELECTOR) || !isVisible(panel)) return;
  const now = Date.now();
  const previous = tabMotionTimestamps.get(panel) || 0;
  if (now - previous < 100) return;
  tabMotionTimestamps.set(panel, now);
  panel.removeAttribute('data-global-tab-enter');
  window.requestAnimationFrame(() => {
    if (!isVisible(panel)) return;
    panel.dataset.globalTabEnter = 'true';
    window.setTimeout(() => { if (panel?.isConnected) delete panel.dataset.globalTabEnter; }, 720);
  });
}

function resolveTabPanel(tab) {
  if (!tab) return null;
  const controls = tab.getAttribute?.('aria-controls');
  if (controls && document.getElementById(controls)) return document.getElementById(controls);
  const target = tab.dataset?.tabTarget || tab.dataset?.target || tab.dataset?.bsTarget || tab.getAttribute?.('href');
  if (String(target || '').startsWith('#')) {
    try { return document.getElementById(decodeURIComponent(String(target).slice(1))); } catch { return document.getElementById(String(target).slice(1)); }
  }
  const root = tab.closest?.('[data-tabs],.tabs,[role="tablist"]')?.parentElement || tab.parentElement?.parentElement;
  return [...(root?.querySelectorAll?.(TAB_PANEL_SELECTOR) || [])].find(isVisible) || null;
}

function installTabActivationListener() {
  const onClick = (event) => {
    const tab = event.target?.closest?.(TAB_TRIGGER_SELECTOR);
    if (!tab) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => markTabPanel(resolveTabPanel(tab))));
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}

function markEntrant(node, kind) {
  if (!node?.isConnected || !isVisible(node)) return;
  node.dataset.globalMotionEnter = kind;
  window.setTimeout(() => { if (node?.isConnected && node.dataset.globalMotionEnter === kind) delete node.dataset.globalMotionEnter; }, 760);
}

function collectEntrants(root) {
  if (!root || root.nodeType !== 1) return;
  const groups = [
    [MODAL_SELECTOR, 'modal'],
    [DRAWER_SELECTOR, 'drawer'],
    [POPOVER_SELECTOR, 'popover'],
  ];
  groups.forEach(([selector, kind]) => {
    const nodes = root.matches?.(selector) ? [root] : [...(root.querySelectorAll?.(selector) || [])];
    nodes.slice(0, 24).forEach((node) => markEntrant(node, kind));
  });

  const panels = root.matches?.(TAB_PANEL_SELECTOR) ? [root] : [...(root.querySelectorAll?.(TAB_PANEL_SELECTOR) || [])];
  panels.slice(0, 16).forEach(markTabPanel);

  const listNodes = root.matches?.(LIST_SELECTOR) ? [root] : [...(root.querySelectorAll?.(LIST_SELECTOR) || [])];
  listNodes.slice(0, 8).forEach((node, index) => {
    node.dataset.globalListEnter = 'true';
    node.style.setProperty('--gm-list-index', String(index));
    window.setTimeout(() => { if (node?.isConnected) delete node.dataset.globalListEnter; }, 900);
  });
}

function installMutationMotionObserver() {
  if (!document.body) return () => {};
  const pending = new Set();
  const flush = () => {
    mutationFrame = 0;
    [...pending].forEach(collectEntrants);
    pending.clear();
  };
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') mutation.addedNodes.forEach((node) => { if (node?.nodeType === 1) pending.add(node); });
      if (mutation.type === 'attributes' && mutation.target?.matches?.(TAB_PANEL_SELECTOR) && isVisible(mutation.target)) markTabPanel(mutation.target);
    });
    if (!mutationFrame && pending.size) mutationFrame = window.requestAnimationFrame(flush);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden', 'aria-selected', 'style'] });
  return () => { observer.disconnect(); if (mutationFrame) window.cancelAnimationFrame(mutationFrame); mutationFrame = 0; pending.clear(); };
}

function ensureRouteLoader() {
  let loader = document.getElementById('bes-global-route-loader');
  if (loader) return loader;
  loader = document.createElement('div');
  loader.id = 'bes-global-route-loader';
  loader.className = 'gm-route-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  loader.setAttribute('aria-label', 'Đang mở trang');
  loader.innerHTML = '<span class="gm-loader-line"></span><span class="gm-loader-spinner"></span><span class="gm-loader-pulse"></span><span class="gm-loader-dots"><i></i><i></i><i></i><i></i><i></i></span>';
  document.body.appendChild(loader);
  return loader;
}

function hideRouteLoader(immediate = false) {
  window.clearTimeout(loaderHideTimer);
  const loader = document.getElementById('bes-global-route-loader');
  if (!loader) return;
  if (immediate) { loader.classList.remove('is-visible'); return; }
  loader.classList.add('is-leaving');
  window.setTimeout(() => loader.classList.remove('is-visible', 'is-leaving'), 150);
}

function showRouteLoader() {
  const config = getGlobalMotionConfig();
  if (config.slots.loading === 'none') return;
  const loader = ensureRouteLoader();
  loader.classList.remove('is-leaving');
  loader.classList.add('is-visible');
  void loader.offsetWidth;
  loaderHideTimer = window.setTimeout(() => hideRouteLoader(), Math.max(260, (SPEED_PROFILES[config.speed]?.slow || 285) + 180));
}

function installRouteLoadingExperience() {
  window.addEventListener('bes-navigation-start', showRouteLoader);
  window.addEventListener('hashchange', showRouteLoader);
  window.addEventListener('popstate', showRouteLoader);
}

function installRealtimeSync() {
  if (realtimeUnsubscribe) return;
  try {
    realtimeUnsubscribe = subscribeTable({
      key: 'global-motion-settings-v2',
      table: SETTINGS_TABLE,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
        if (row?.config) applyGlobalMotionConfig(row.config, { source: 'realtime' });
        else if (row?.preset) applyGlobalMotionConfig(configFromMotionPreset(row.preset), { source: 'realtime-legacy' });
        else loadGlobalMotionConfigFromServer();
      },
    });
  } catch { realtimeUnsubscribe = null; }
}

function scheduleRuntimeSync() {
  const run = async () => {
    const result = await loadGlobalMotionConfigFromServer();
    if (result.ok) installRealtimeSync();
  };
  [0, 900, 2800, 8000].forEach((delay) => runtimeRetryTimers.push(window.setTimeout(run, delay)));
}

function syncReducedMotionDataset() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const apply = () => { document.documentElement.dataset.motionReduced = query?.matches ? 'true' : 'false'; };
  apply();
  query?.addEventListener?.('change', apply);
}

export function installGlobalMotionSystem() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  applyGlobalMotionConfig(storedConfig(), { source: 'bootstrap', broadcast: false });
  syncReducedMotionDataset();

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try { applyGlobalMotionConfig(JSON.parse(event.newValue), { persist: false, source: 'storage' }); } catch { /* ignore malformed external cache */ }
    }
  };
  window.addEventListener('storage', onStorage);

  const start = () => {
    installMutationMotionObserver();
    installTabActivationListener();
    collectEntrants(document.body);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  installRouteLoadingExperience();
  scheduleRuntimeSync();
}

export {
  GLOBAL_EVENT as GLOBAL_MOTION_EVENT,
  SETTINGS_TABLE as GLOBAL_MOTION_SETTINGS_TABLE,
  HISTORY_TABLE as GLOBAL_MOTION_HISTORY_TABLE,
};
