import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const STORAGE_KEY = 'bes-global-motion-preset-v1';
const SETTINGS_TABLE = 'brian_global_motion_settings';
const GLOBAL_EVENT = 'bes-global-motion-updated';
const DEFAULT_PRESET = 'balanced';
const VALID_PRESETS = new Set(['off', 'subtle', 'balanced', 'windows8', 'expressive']);

const TAB_TRIGGER_SELECTOR = [
  '[role="tab"]',
  '[data-tab]',
  '.tab-button',
  '.tab-btn',
  '.nav-tab',
  '.tabs button',
].join(',');

const TAB_PANEL_SELECTOR = [
  '[role="tabpanel"]',
  '[data-tab-panel]',
  '.tab-panel',
  '.tab-content',
  '[class*="tab-panel"]',
  '[class*="tab-content"]',
].join(',');

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
    labelVi: 'Google Material',
    label: 'Google Material',
    descriptionVi: 'Fade + dịch chuyển ngắn kiểu Material, indicator gạch chân gọn và nhẹ.',
    description: 'Material-style fade and short movement with a clean underline indicator.',
    speedVi: '110–240 ms · Underline',
    tone: 'subtle',
  },
  {
    id: 'balanced',
    labelVi: 'Windows 11',
    label: 'Windows 11',
    descriptionVi: 'Mở trang bằng scale + lift mềm kiểu Windows 11, indicator pill nổi khối và chuyển trạng thái rõ.',
    description: 'Windows 11-style soft scale/lift page entrance with a raised pill indicator.',
    speedVi: '130–360 ms · Sliding pill',
    tone: 'balanced',
    recommended: true,
  },
  {
  id: 'windows8',
  labelVi: 'Windows 8',
  label: 'Windows 8',
  descriptionVi: 'Metro chuyển ngang rõ nét, loader 5 chấm chạy và indicator phẳng kiểu Windows 8.',
  description: 'Metro horizontal page motion with five-dot loading progress and a flat Windows 8 indicator.',
  speedVi: '170–520 ms · Metro dots',
  tone: 'windows8',
},
  {
    id: 'expressive',
    labelVi: 'Fluent Dynamic',
    label: 'Fluent Dynamic',
    descriptionVi: 'Chuyển cảnh rõ hơn, có chiều sâu và indicator glow nhẹ; vẫn chỉ dùng transform/opacity để giữ hiệu năng.',
    description: 'More expressive depth with a soft glow indicator while staying transform/opacity only.',
    speedVi: '160–460 ms · Glow',
    tone: 'expressive',
  },
]);

let installed = false;
let realtimeUnsubscribe = null;
let runtimeRetryTimers = [];
let mutationFrame = 0;
let windows8LoaderTimer = 0;
let windows8HideTimer = 0;
const tabMotionTimestamps = new WeakMap();

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
  if (normalized !== 'windows8') hideWindows8RouteLoader({ immediate: true });
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

function isVisibleTabPanel(panel) {
  if (!panel?.isConnected || panel.hidden) return false;
  if (panel.getAttribute?.('aria-hidden') === 'true') return false;
  if (typeof window === 'undefined') return true;
  const style = window.getComputedStyle(panel);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function markTabPanelEntrance(panel) {
  if (!panel?.matches?.(TAB_PANEL_SELECTOR)) return;
  if (document.documentElement?.dataset?.motionEnabled !== 'true') return;
  if (!isVisibleTabPanel(panel)) return;

  const now = Date.now();
  const previous = tabMotionTimestamps.get(panel) || 0;
  if (now - previous < 120) return;
  tabMotionTimestamps.set(panel, now);

  panel.removeAttribute('data-global-tab-enter');
  window.requestAnimationFrame(() => {
    if (!isVisibleTabPanel(panel)) return;
    panel.dataset.globalTabEnter = 'true';
    window.setTimeout(() => {
      if (panel?.isConnected) delete panel.dataset.globalTabEnter;
    }, 760);
  });
}

function panelFromTargetValue(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw || !raw.startsWith('#')) return null;
  let id = raw.slice(1);
  try { id = decodeURIComponent(id); }
  catch { /* keep original id */ }
  return id ? document.getElementById(id) : null;
}

function resolveTabPanel(tab) {
  if (!tab) return null;

  const controls = tab.getAttribute?.('aria-controls');
  if (controls) {
    const controlled = document.getElementById(controls);
    if (controlled) return controlled;
  }

  const directTarget = tab.dataset?.tabTarget
    || tab.dataset?.target
    || tab.dataset?.bsTarget
    || tab.getAttribute?.('href');
  const targeted = panelFromTargetValue(directTarget);
  if (targeted) return targeted;

  const roots = [
    tab.closest?.('[data-tabs]'),
    tab.closest?.('.tabs'),
    tab.closest?.('[role="tablist"]')?.parentElement,
    tab.parentElement?.parentElement,
  ].filter(Boolean);

  for (const root of roots) {
    const panels = [...(root.querySelectorAll?.(TAB_PANEL_SELECTOR) || [])];
    const visible = panels.find(isVisibleTabPanel);
    if (visible) return visible;
  }

  return null;
}

function markAddedTabPanels(root) {
  if (!root || root.nodeType !== 1) return;
  const panels = root.matches?.(TAB_PANEL_SELECTOR)
    ? [root]
    : [...(root.querySelectorAll?.(TAB_PANEL_SELECTOR) || [])];
  panels.slice(0, 24).forEach((panel) => {
    if (isVisibleTabPanel(panel)) markTabPanelEntrance(panel);
  });
}

function scheduleTabEntranceFromTrigger(tab) {
  if (!tab) return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const panel = resolveTabPanel(tab);
      if (panel) markTabPanelEntrance(panel);
    });
  });
}

function installTabActivationListener() {
  if (typeof document === 'undefined') return () => {};

  const onClick = (event) => {
    const tab = event.target?.closest?.(TAB_TRIGGER_SELECTOR);
    if (!tab) return;
    scheduleTabEntranceFromTrigger(tab);
  };

  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
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
  const pendingRoots = new Set();
  const pendingPanels = new Set();

  const flush = () => {
    mutationFrame = 0;
    [...pendingRoots].forEach((root) => {
      markMotionEntrants(root);
      markAddedTabPanels(root);
    });
    [...pendingPanels].forEach(markTabPanelEntrance);
    pendingRoots.clear();
    pendingPanels.clear();
  };

  const queueFlush = () => {
    if (!mutationFrame && (pendingRoots.size || pendingPanels.size)) {
      mutationFrame = window.requestAnimationFrame(flush);
    }
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node?.nodeType === 1) pendingRoots.add(node);
        });
        return;
      }

      const target = mutation.target;
      if (target?.matches?.(TAB_PANEL_SELECTOR) && isVisibleTabPanel(target)) {
        pendingPanels.add(target);
      }

      if (target?.matches?.(TAB_TRIGGER_SELECTOR)) {
        const selected = target.getAttribute?.('aria-selected') === 'true'
          || target.classList?.contains('active')
          || target.classList?.contains('selected')
          || target.classList?.contains('current');
        if (selected) {
          const panel = resolveTabPanel(target);
          if (panel) pendingPanels.add(panel);
        }
      }
    });
    queueFlush();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'aria-hidden', 'aria-selected', 'style'],
  });

  return () => {
    observer.disconnect();
    if (mutationFrame) window.cancelAnimationFrame(mutationFrame);
    mutationFrame = 0;
    pendingRoots.clear();
    pendingPanels.clear();
  };
}

function windows8MotionActive() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.documentElement?.dataset?.motionMode !== 'windows8') return false;
  if (document.documentElement?.dataset?.motionEnabled !== 'true') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

function ensureWindows8RouteLoader() {
  if (typeof document === 'undefined' || !document.body) return null;
  let loader = document.getElementById('bes-windows8-route-loader');
  if (loader) return loader;
  loader = document.createElement('div');
  loader.id = 'bes-windows8-route-loader';
  loader.className = 'gm-w8-route-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  loader.setAttribute('aria-label', 'Đang mở trang');
  loader.innerHTML = `
    <div class="gm-w8-loader-inner">
      <div class="gm-w8-progress" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <strong>BRIAN ENGLISH</strong>
      <small>Đang mở trang…</small>
    </div>`;
  document.body.appendChild(loader);
  return loader;
}

function hideWindows8RouteLoader({ immediate = false } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.clearTimeout(windows8LoaderTimer);
  window.clearTimeout(windows8HideTimer);
  const loader = document.getElementById('bes-windows8-route-loader');
  delete document.documentElement.dataset.windows8Loading;
  if (!loader) return;
  if (immediate) {
    loader.classList.remove('is-visible', 'is-running', 'is-leaving');
    loader.setAttribute('aria-hidden', 'true');
    return;
  }
  loader.classList.add('is-leaving');
  loader.classList.remove('is-running');
  windows8HideTimer = window.setTimeout(() => {
    loader.classList.remove('is-visible', 'is-leaving');
    loader.setAttribute('aria-hidden', 'true');
  }, 150);
}

function showWindows8RouteLoader() {
  if (!windows8MotionActive()) return;
  const loader = ensureWindows8RouteLoader();
  if (!loader) return;
  window.clearTimeout(windows8LoaderTimer);
  window.clearTimeout(windows8HideTimer);
  loader.classList.remove('is-leaving');
  loader.classList.add('is-visible');
  loader.setAttribute('aria-hidden', 'false');
  document.documentElement.dataset.windows8Loading = 'true';
  void loader.offsetWidth;
  loader.classList.add('is-running');
  windows8LoaderTimer = window.setTimeout(() => hideWindows8RouteLoader(), 620);
}

function installWindows8RouteExperience() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const onNavigate = () => showWindows8RouteLoader();
  window.addEventListener('bes-navigation-start', onNavigate);
  window.addEventListener('hashchange', onNavigate);
  window.addEventListener('popstate', onNavigate);
  const showInitial = () => {
    if (windows8MotionActive()) window.setTimeout(showWindows8RouteLoader, 30);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showInitial, { once: true });
  else showInitial();
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

  const startObservers = () => {
    installMutationMotionObserver();
    installTabActivationListener();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObservers, { once: true });
  else startObservers();

  installWindows8RouteExperience();
  scheduleRuntimeSync();
}

export { GLOBAL_EVENT as GLOBAL_MOTION_EVENT, SETTINGS_TABLE as GLOBAL_MOTION_SETTINGS_TABLE };
