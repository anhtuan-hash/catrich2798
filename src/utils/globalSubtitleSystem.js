import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const STORAGE_KEY = 'bes-global-subtitles-visible-v1';
const SETTINGS_TABLE = 'brian_global_display_settings';
const EVENT_NAME = 'bes-global-subtitles-updated';

let installed = false;
let realtimeUnsubscribe = null;
let scanFrame = 0;
let retryTimers = [];

const EXPLICIT_SUBTITLE_SELECTOR = [
  '[data-bes-subtitle]',
  '[data-subtitle]',
  '[class*="subtitle" i]',
  '[class*="sub-title" i]',
  '[class*="subheading" i]',
  '[class*="sub-heading" i]',
].join(',');

const DESCRIPTION_SELECTOR = [
  '[class*="description" i]',
  '[class*="desc" i]',
  '[class*="lead" i]',
  '[class*="summary" i]',
  '[class*="intro-copy" i]',
].join(',');

const HEADING_SELECTOR = 'h1,h2,h3,h4,[role="heading"]';
const PROTECTED_SELECTOR = [
  '[data-bes-subtitle-keep="true"]',
  '[data-subtitle-keep="true"]',
  'nav',
  'form',
  'table',
  '[role="alert"]',
  '[aria-live]',
  '[class*="error" i]',
  '[class*="warning" i]',
  '[class*="helper" i]',
  '[class*="hint" i]',
  '[class*="validation" i]',
  '[class*="toast" i]',
  '[class*="snackbar" i]',
].join(',');

function normalizeVisible(value) {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return true;
}

function readStored() {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw == null ? true : normalizeVisible(raw);
  } catch {
    return true;
  }
}

function writeStored(visible) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, visible ? 'true' : 'false'); }
  catch { /* local persistence is optional */ }
}

function textLength(node) {
  return String(node?.textContent || '').trim().length;
}

function isProtected(node) {
  if (!node?.isConnected) return true;
  if (node.closest?.(PROTECTED_SELECTOR)) return true;
  if (node.matches?.('button,a,input,select,textarea,label,option,code,pre,kbd')) return true;
  if (node.querySelector?.('button,a,input,select,textarea')) return true;
  return false;
}

function hasHeadingContext(node) {
  const parent = node?.parentElement;
  if (!parent) return false;

  const previous = node.previousElementSibling;
  if (previous?.matches?.(HEADING_SELECTOR)) return true;

  const parentClass = String(parent.className || '').toLowerCase();
  if (/(hero|page[-_ ]?head|section[-_ ]?head|panel[-_ ]?head|card[-_ ]?head|heading|title|intro)/.test(parentClass)) {
    return Boolean(parent.querySelector?.(HEADING_SELECTOR));
  }

  const heading = parent.querySelector?.(`:scope > ${HEADING_SELECTOR.replaceAll(',', ', :scope > ')}`);
  if (!heading) return false;
  const relation = heading.compareDocumentPosition(node);
  return Boolean(relation & Node.DOCUMENT_POSITION_FOLLOWING);
}

function shouldMark(node, explicit = false) {
  if (!node || node.nodeType !== 1 || isProtected(node)) return false;
  if (node.dataset?.besSubtitleKeep === 'true') return false;
  if (node.matches?.(HEADING_SELECTOR)) return false;

  const length = textLength(node);
  if (!length || length > 320) return false;

  if (explicit) return true;
  return hasHeadingContext(node);
}

function markNode(node, reason = 'auto') {
  if (!node || node.dataset?.besSubtitle === 'true') return;
  node.dataset.besSubtitle = 'true';
  node.dataset.besSubtitleReason = reason;
}

function scanRoot(root) {
  if (!root || root.nodeType !== 1) return;

  const explicitNodes = root.matches?.(EXPLICIT_SUBTITLE_SELECTOR)
    ? [root]
    : [...(root.querySelectorAll?.(EXPLICIT_SUBTITLE_SELECTOR) || [])];
  explicitNodes.forEach((node) => {
    if (shouldMark(node, true)) markNode(node, 'explicit');
  });

  const descriptionNodes = root.matches?.(DESCRIPTION_SELECTOR)
    ? [root]
    : [...(root.querySelectorAll?.(DESCRIPTION_SELECTOR) || [])];
  descriptionNodes.forEach((node) => {
    if (shouldMark(node, false)) markNode(node, 'heading-description');
  });

  const containers = [root, ...(root.querySelectorAll?.('header,[class*="hero" i],[class*="heading" i],[class*="title" i],[class*="section-head" i],[class*="page-head" i]') || [])];
  containers.slice(0, 160).forEach((container) => {
    const heading = container.querySelector?.(`:scope > ${HEADING_SELECTOR.replaceAll(',', ', :scope > ')}`);
    if (!heading) return;
    let sibling = heading.nextElementSibling;
    let inspected = 0;
    while (sibling && inspected < 2) {
      inspected += 1;
      if (sibling.matches?.('p,small,span,div') && shouldMark(sibling, false)) {
        markNode(sibling, 'structural');
        break;
      }
      if (sibling.matches?.(HEADING_SELECTOR)) break;
      sibling = sibling.nextElementSibling;
    }
  });
}

function scanDocument() {
  if (typeof document === 'undefined' || !document.body) return;
  scanRoot(document.body);
}

function scheduleScan(root = null) {
  if (typeof window === 'undefined') return;
  if (scanFrame) window.cancelAnimationFrame(scanFrame);
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    if (root?.isConnected) scanRoot(root);
    else scanDocument();
  });
}

export function getGlobalSubtitlesVisible() {
  if (typeof document !== 'undefined') {
    const value = document.documentElement?.dataset?.subtitlesVisible;
    if (value === 'true' || value === 'false') return value === 'true';
  }
  return readStored();
}

export function applyGlobalSubtitlesVisible(value, options = {}) {
  const visible = normalizeVisible(value);
  const { persist = true, source = 'local', broadcast = true } = options;

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.subtitlesVisible = visible ? 'true' : 'false';
    document.documentElement.dataset.subtitlesSource = source;
    if (!visible) scanDocument();
  }
  if (persist) writeStored(visible);
  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { visible, source, at: Date.now() } }));
  }
  return visible;
}

function isMissingTable(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || /brian_global_display_settings|does not exist|schema cache/i.test(message);
}

export async function loadGlobalSubtitlesFromServer({ silent = true } = {}) {
  const client = getRuntimeClient();
  if (!client) {
    const visible = applyGlobalSubtitlesVisible(readStored(), { persist: false, source: 'cache' });
    return { ok: false, unavailable: true, visible };
  }

  try {
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .select('show_subtitles,updated_at')
      .eq('id', true)
      .maybeSingle();
    if (error) {
      if (!silent && !isMissingTable(error)) console.warn('[SubtitleSystem] server load failed', error);
      const visible = applyGlobalSubtitlesVisible(readStored(), { persist: false, source: 'cache' });
      return { ok: false, unavailable: isMissingTable(error), error, visible };
    }

    const visible = applyGlobalSubtitlesVisible(data?.show_subtitles ?? true, { source: 'server' });
    return { ok: true, schemaReady: true, visible, updatedAt: data?.updated_at || null };
  } catch (error) {
    if (!silent) console.warn('[SubtitleSystem] server load failed', error);
    const visible = applyGlobalSubtitlesVisible(readStored(), { persist: false, source: 'cache' });
    return { ok: false, error, visible };
  }
}

export async function saveGlobalSubtitlesVisible(value, currentUser = null) {
  const visible = applyGlobalSubtitlesVisible(value, { source: 'admin-preview' });
  const client = getRuntimeClient();
  if (!client) {
    return { ok: false, localOnly: true, visible, message: 'Đã áp dụng trên thiết bị này; chưa có kết nối Supabase để đồng bộ toàn hệ thống.' };
  }

  try {
    const payload = {
      id: true,
      show_subtitles: visible,
      updated_by: String(currentUser?.email || currentUser?.id || 'admin'),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('show_subtitles,updated_at')
      .single();

    if (error) {
      return {
        ok: false,
        localOnly: true,
        unavailable: isMissingTable(error),
        visible,
        error,
        message: isMissingTable(error)
          ? 'Đã áp dụng trên thiết bị Admin. Cần chạy migration brian_global_display_settings để đồng bộ đến mọi tài khoản.'
          : (error.message || 'Không thể đồng bộ cấu hình tiêu đề phụ.'),
      };
    }

    const saved = applyGlobalSubtitlesVisible(data?.show_subtitles ?? visible, { source: 'admin-server' });
    return { ok: true, visible: saved, updatedAt: data?.updated_at || payload.updated_at };
  } catch (error) {
    return { ok: false, localOnly: true, visible, error, message: error?.message || 'Không thể đồng bộ cấu hình tiêu đề phụ.' };
  }
}

function installRealtime() {
  if (realtimeUnsubscribe) return;
  try {
    realtimeUnsubscribe = subscribeTable({
      key: 'global-display-settings-subtitles',
      table: SETTINGS_TABLE,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
        if (row && Object.prototype.hasOwnProperty.call(row, 'show_subtitles')) {
          applyGlobalSubtitlesVisible(row.show_subtitles, { source: 'realtime' });
        } else {
          loadGlobalSubtitlesFromServer();
        }
      },
    });
  } catch {
    realtimeUnsubscribe = null;
  }
}

export function installGlobalSubtitleSystem() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;

  applyGlobalSubtitlesVisible(readStored(), { persist: false, broadcast: false, source: 'bootstrap' });
  scanDocument();

  const pendingRoots = new Set();
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node?.nodeType === 1) pendingRoots.add(node);
      });
    });
    if (!pendingRoots.size) return;
    const roots = [...pendingRoots];
    pendingRoots.clear();
    roots.slice(0, 80).forEach((root) => scheduleScan(root));
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) applyGlobalSubtitlesVisible(readStored(), { persist: false, source: 'storage' });
  });

  const run = async () => {
    const result = await loadGlobalSubtitlesFromServer();
    if (result.ok) installRealtime();
  };
  [0, 900, 2800, 8000].forEach((delay) => retryTimers.push(window.setTimeout(run, delay)));
}

export { EVENT_NAME as GLOBAL_SUBTITLE_EVENT, SETTINGS_TABLE as GLOBAL_DISPLAY_SETTINGS_TABLE };
