import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const STORAGE_KEY = 'bes-global-motion-preset-v1';
const SETTINGS_TABLE = 'brian_global_motion_settings';
const GLOBAL_EVENT = 'bes-global-motion-updated';
const DEFAULT_PRESET = 'balanced';
const VALID_PRESETS = new Set(['off', 'subtle', 'balanced', 'expressive']);

export const GLOBAL_MOTION_PRESETS = Object.freeze([
  {
    id: 'off',
    labelVi: 'Tắt',
    label: 'Off',
    descriptionVi: 'Không dùng hiệu ứng chuyển động. Phù hợp khi cần tối đa hiệu năng hoặc trình chiếu ổn định.',
    description: 'Disable motion for maximum performance and presentation stability.',
    speedVi: '0 ms',
    tone: 'off',
  },
  {
    id: 'subtle',
    labelVi: 'Tinh tế',
    label: 'Subtle',
    descriptionVi: 'Chuyển cảnh rất nhẹ, ít dịch chuyển, phù hợp giao diện làm việc chuyên nghiệp.',
    description: 'Very light transitions with minimal movement for a professional workspace.',
    speedVi: '90–220 ms',
    tone: 'subtle',
  },
  {
    id: 'balanced',
    labelVi: 'Cân bằng',
    label: 'Balanced',
    descriptionVi: 'Mượt, rõ trạng thái nhưng không gây rối mắt. Đây là chế độ khuyến nghị cho toàn site.',
    description: 'Smooth and clear without being distracting. Recommended for the whole site.',
    speedVi: '120–320 ms',
    tone: 'balanced',
    recommended: true,
  },
  {
    id: 'expressive',
    labelVi: 'Sinh động',
    label: 'Expressive',
    descriptionVi: 'Hiệu ứng rõ hơn cho modal, drawer, menu, nút và chuyển trang; vẫn giới hạn ở transform/opacity an toàn.',
    description: 'More visible motion for dialogs, drawers, menus, buttons and page changes while staying GPU-friendly.',
    speedVi: '150–420 ms',
    tone: 'expressive',
  },
]);

let installed = false;
let realtimeUnsubscribe = null;
let runtimeRetryTimers = [];
let mutationFrame = 0;

function normalizePreset(value) {
  const preset = String(value || '').trim().toLowerCase();
  return VALID_PRESETS.has(preset) ? preset : DEFAULT_PRESET;
}

function storedPreset() {
  if (typeof window === 'undefined') return DEFAULT_PRESET;
  try { return normalizePreset(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return DEFAULT_PRESET; }
}

function writeStoredPreset(preset) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, normalizePreset(preset)); }
  catch { /* local persistence is optional */ }
}

export function getGlobalMotionPreset() {
  if (typeof document !== 'undefined') {
    const rootValue = document.documentElement?.dataset?.motionMode;
    if (rootValue) return normalizePreset(rootValue);
  }
  return storedPreset();
}

export function getGlobalMotionPresetDefinition(preset = getGlobalMotionPreset()) {
  const normalized = normalizePreset(preset);
  return GLOBAL_MOTION_PRESETS.find((entry) => entry.id === normalized) || GLOBAL_MOTION_PRESETS[2];
}

export function applyGlobalMotionPreset(preset, options = {}) {
  const normalized = normalizePreset(preset);
  const { persist = true, source = 'local', broadcast = true } = options;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.motionMode = normalized;
    root.dataset.motionEnabled = normalized === 'off' ? 'false' : 'true';
    root.dataset.motionSource = source;
  }
  if (persist) writeStoredPreset(normalized);

  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GLOBAL_EVENT, {
      detail: { preset: normalized, source, at: Date.now() },
    }));
  }
  return normalized;
}

function isMissingTableError(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || /brian_global_motion_settings|does not exist|schema cache/i.test(message);
}

export async function loadGlobalMotionPresetFromServer({ silent = true } = {}) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, unavailable: true, preset: getGlobalMotionPreset() };

  try {
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .select('preset,updated_at')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      if (!silent && !isMissingTableError(error)) console.warn('[MotionSystem] server load failed', error);
      return { ok: false, unavailable: isMissingTableError(error), error, preset: getGlobalMotionPreset() };
    }
    if (!data?.preset) return { ok: true, preset: getGlobalMotionPreset(), empty: true };

    const preset = applyGlobalMotionPreset(data.preset, { source: 'server' });
    return { ok: true, preset, updatedAt: data.updated_at || null };
  } catch (error) {
    if (!silent) console.warn('[MotionSystem] server load failed', error);
    return { ok: false, error, preset: getGlobalMotionPreset() };
  }
}

export async function saveGlobalMotionPreset(preset, currentUser = null) {
  const normalized = applyGlobalMotionPreset(preset, { source: 'admin-preview' });
  const client = getRuntimeClient();
  if (!client) {
    return {
      ok: false,
      localOnly: true,
      preset: normalized,
      message: 'Đã áp dụng trên thiết bị này; chưa có kết nối máy chủ để đồng bộ toàn site.',
    };
  }

  try {
    const payload = {
      id: true,
      preset: normalized,
      updated_by: String(currentUser?.email || currentUser?.id || 'admin'),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('preset,updated_at')
      .single();

    if (error) {
      return {
        ok: false,
        localOnly: true,
        unavailable: isMissingTableError(error),
        preset: normalized,
        error,
        message: isMissingTableError(error)
          ? 'Đã áp dụng trên thiết bị này. Cần cài bảng brian_global_motion_settings trong Supabase để đồng bộ đến mọi tài khoản.'
          : (error.message || 'Không thể đồng bộ cấu hình chuyển động lên máy chủ.'),
      };
    }

    const saved = applyGlobalMotionPreset(data?.preset || normalized, { source: 'admin-server' });
    return { ok: true, preset: saved, updatedAt: data?.updated_at || payload.updated_at };
  } catch (error) {
    return {
      ok: false,
      localOnly: true,
      preset: normalized,
      error,
      message: error?.message || 'Không thể đồng bộ cấu hình chuyển động lên máy chủ.',
    };
  }
}

function markMotionEntrants(root) {
  if (!root || root.nodeType !== 1) return;
  const selector = [
    '[role="dialog"]',
    'dialog',
    '[role="menu"]',
    '[role="listbox"]',
    '[role="tooltip"]',
    '[class*="modal"]',
    '[class*="drawer"]',
    '[class*="popover"]',
    '[class*="dropdown"]',
    '[class*="toast"]',
    '[class*="snackbar"]',
  ].join(',');

  const nodes = root.matches?.(selector) ? [root] : [...(root.querySelectorAll?.(selector) || [])];
  nodes.slice(0, 80).forEach((node) => {
    if (node.dataset.globalMotionEnter === 'true') return;
    node.dataset.globalMotionEnter = 'true';
    window.setTimeout(() => {
      if (node?.isConnected) delete node.dataset.globalMotionEnter;
    }, 700);
  });
}

function installMutationMotionObserver() {
  if (typeof document === 'undefined' || !document.body) return () => {};
  const pending = new Set();
  const flush = () => {
    mutationFrame = 0;
    [...pending].forEach(markMotionEntrants);
    pending.clear();
  };
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node?.nodeType === 1) pending.add(node);
    }));
    if (!mutationFrame && pending.size) mutationFrame = window.requestAnimationFrame(flush);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    if (mutationFrame) window.cancelAnimationFrame(mutationFrame);
    mutationFrame = 0;
    pending.clear();
  };
}

function installRealtimeSync() {
  if (realtimeUnsubscribe) return;
  try {
    realtimeUnsubscribe = subscribeTable({
      key: 'global-motion-settings',
      table: SETTINGS_TABLE,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
        if (row?.preset) applyGlobalMotionPreset(row.preset, { source: 'realtime' });
        else loadGlobalMotionPresetFromServer();
      },
    });
  } catch {
    realtimeUnsubscribe = null;
  }
}

function scheduleRuntimeSync() {
  const run = async () => {
    const result = await loadGlobalMotionPresetFromServer();
    if (result.ok) installRealtimeSync();
  };
  [0, 900, 2800, 8000].forEach((delay) => {
    runtimeRetryTimers.push(window.setTimeout(run, delay));
  });
}

export function installGlobalMotionSystem() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;

  applyGlobalMotionPreset(storedPreset(), { source: 'bootstrap', broadcast: false });

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      applyGlobalMotionPreset(event.newValue, { persist: false, source: 'storage' });
    }
  };
  window.addEventListener('storage', onStorage);

  const startObserver = () => installMutationMotionObserver();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  else startObserver();

  scheduleRuntimeSync();
}

export { GLOBAL_EVENT as GLOBAL_MOTION_EVENT, SETTINGS_TABLE as GLOBAL_MOTION_SETTINGS_TABLE };
