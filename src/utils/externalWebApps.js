import { subscribeTable } from '../services/runtime/core.js';
import {
  canManageAiWebsites,
  loadAiWebsiteSettings,
  normalizeAiWebsiteTool,
  safeAiWebsiteUrl,
  saveAiWebsiteSettings,
  subscribeAiWebsiteSettings,
} from './aiWebsiteSettings.js';
import { PERMISSION_REQUESTS_EVENT } from './permissionRequests.js';
import { supabase } from './supabase.js';

export const EXTERNAL_APP_PERMISSION_PREFIX = 'external-web-app:';
export const EXTERNAL_APP_KIND = 'external-app';
export const EXTERNAL_APP_GROUPS = [
  { id: 'plan', label: 'Soạn bài' },
  { id: 'create', label: 'Tạo học liệu' },
  { id: 'assess', label: 'Kiểm tra' },
  { id: 'manage', label: 'Quản lý' },
];

const REQUEST_TIMEOUT = 14000;
const APPROVED_ONLY_CACHE_MS = 6 * 60 * 60 * 1000;
const REQUEST_STATE_CACHE_MS = 30 * 60 * 1000;
const externalAppsCache = new Map();
const externalAppsPromises = new Map();
let externalAppsCacheGeneration = 0;
let externalAppsSubscriptionSerial = 0;

export function safeExternalWebAppUrl(value) {
  const normalized = safeAiWebsiteUrl(value);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:' || /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?$)/i.test(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function withEmbedModeParam(value) {
  const safe = safeExternalWebAppUrl(value);
  if (!safe) return '';
  const url = new URL(safe);
  url.searchParams.set('embed', '1');
  return url.toString();
}

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeEmbedView(value = {}) {
  const cropWidth = clamp(value.cropWidth, 18, 100, 88);
  const cropHeight = clamp(value.cropHeight, 18, 100, 78);
  const cropX = clamp(value.cropX, 0, 100 - cropWidth, (100 - cropWidth) / 2);
  const cropY = clamp(value.cropY, 0, 100 - cropHeight, (100 - cropHeight) / 2);
  return {
    zoom: clamp(value.zoom, 0.4, 2.4, 1),
    offsetX: clamp(value.offsetX, 0, 70, 0),
    offsetY: clamp(value.offsetY, 0, 85, 0),
    previewHeight: clamp(value.previewHeight, 420, 900, 620),
    canvasHeight: clamp(value.canvasHeight, 1000, 2600, 1600),
    cropX,
    cropY,
    cropWidth,
    cropHeight,
  };
}

export function embedTransformStyle(view = {}) {
  const clean = normalizeEmbedView(view);
  const reducedScale = Math.min(clean.zoom, 1);
  const xShift = clean.zoom >= 1
    ? clean.offsetX * ((clean.zoom - 1) / clean.zoom)
    : clean.offsetX;
  const yShift = clean.offsetY;
  return {
    '--embed-zoom': clean.zoom,
    '--embed-x': `${xShift}%`,
    '--embed-y': `${yShift}%`,
    '--embed-preview-height': `${clean.previewHeight}px`,
    '--embed-canvas-height': `${clean.canvasHeight}px`,
    '--embed-source-width': `${100 / reducedScale}%`,
    '--embed-source-height': `${clean.canvasHeight / reducedScale}px`,
    '--embed-crop-x': clean.cropX,
    '--embed-crop-y': clean.cropY,
    '--embed-crop-width': clean.cropWidth,
    '--embed-crop-height': clean.cropHeight,
    '--embed-crop-aspect': `${clean.cropWidth} / ${clean.cropHeight}`,
  };
}

export function normalizeExternalAppEmbedConfig(value = {}, sourceUrl = '') {
  const source = safeExternalWebAppUrl(sourceUrl);
  const embedUrl = safeExternalWebAppUrl(value?.embedUrl) || source;
  return {
    embedUrl,
    hideBrianHeader: Boolean(value?.hideBrianHeader),
    hideBrianFooter: Boolean(value?.hideBrianFooter),
    allowFullscreen: value?.allowFullscreen !== false,
  };
}

export function normalizeExternalAppDraft(value = {}) {
  const name = cleanText(value.name, 80);
  const url = safeExternalWebAppUrl(value.url);
  return {
    name,
    url,
    embedUrl: safeExternalWebAppUrl(value.embedUrl),
    icon: cleanText(value.icon || name.slice(0, 2) || 'WEB', 3).toUpperCase(),
    description: cleanText(value.description, 220),
    groupId: EXTERNAL_APP_GROUPS.some((group) => group.id === value.groupId) ? value.groupId : 'create',
  };
}

function parseRequestPayload(request = {}) {
  try {
    return normalizeExternalAppDraft(JSON.parse(String(request.message || '{}')));
  } catch {
    return normalizeExternalAppDraft({ name: request.item_title, description: request.message });
  }
}

export function isExternalAppRequest(request = {}) {
  return request.item_type === EXTERNAL_APP_KIND || String(request.permission_id || '').startsWith(EXTERNAL_APP_PERMISSION_PREFIX);
}

export function externalAppFromTool(tool = {}) {
  if (tool.kind !== EXTERNAL_APP_KIND) return null;
  const url = safeExternalWebAppUrl(tool.url);
  if (!url || !tool.name) return null;
  const embedConfig = normalizeExternalAppEmbedConfig(tool.embedConfig, url);
  return {
    id: tool.id,
    slug: `external-${tool.id}`,
    title: tool.name,
    titleVi: tool.name,
    desc: tool.description || 'Embedded website application.',
    descVi: tool.description || 'Ứng dụng website chạy trực tiếp trong Brian.',
    status: 'Embedded website',
    statusVi: 'Website nhúng · Đã duyệt',
    icon: tool.icon || 'WEB',
    group: 'External website',
    groupVi: 'Ứng dụng website',
    groupId: tool.groupId || 'create',
    externalWebApp: true,
    externalUrl: url,
    embedUrl: embedConfig.embedUrl,
    requestId: tool.requestId || '',
    submittedBy: tool.submittedBy || '',
    approvedAt: tool.approvedAt || '',
    accent: tool.accent || '#1a73e8',
    embedConfig,
    embedView: normalizeEmbedView(tool.embedView),
  };
}

function externalAppsScope(user) {
  return String(user?.id || user?.email || 'guest').trim().toLowerCase() || 'guest';
}

function externalAppsCacheKey(user, includeRequests) {
  return `${externalAppsScope(user)}:${includeRequests ? 'requests' : 'approved-only'}`;
}

function cacheLifetime(includeRequests) {
  return includeRequests ? REQUEST_STATE_CACHE_MS : APPROVED_ONLY_CACHE_MS;
}

function readCachedExternalApps(user, includeRequests) {
  const entry = externalAppsCache.get(externalAppsCacheKey(user, includeRequests));
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    externalAppsCache.delete(externalAppsCacheKey(user, includeRequests));
    return null;
  }
  return entry.state;
}

function storeExternalApps(user, includeRequests, state) {
  externalAppsCache.set(externalAppsCacheKey(user, includeRequests), {
    state,
    expiresAt: Date.now() + cacheLifetime(includeRequests),
  });
  return state;
}

function invalidateExternalAppsCache() {
  externalAppsCacheGeneration += 1;
  externalAppsCache.clear();
  externalAppsPromises.clear();
}

function stateFromSnapshot(snapshot, previous = {}) {
  return {
    approved: (snapshot?.tools || []).map(externalAppFromTool).filter(Boolean),
    mine: Array.isArray(previous.mine) ? previous.mine : [],
    requests: Array.isArray(previous.requests) ? previous.requests : [],
    snapshot,
  };
}

async function accessToken() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token || '';
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  return token;
}

async function requestApi(path = '', options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const token = await accessToken();
    const response = await fetch(`/api/external-app-requests${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.message || `Không thể xử lý yêu cầu (${response.status}).`);
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Gửi yêu cầu quá thời gian. Vui lòng kiểm tra mạng và thử lại.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function hydrateRequests(requests = []) {
  return requests.filter(isExternalAppRequest).map((request) => ({ ...request, app: parseRequestPayload(request) }));
}

export async function loadExternalWebApps(user, {
  includeRequests = true,
  force = false,
  snapshot: suppliedSnapshot = null,
} = {}) {
  const key = externalAppsCacheKey(user, includeRequests);
  const cached = !force ? readCachedExternalApps(user, includeRequests) : null;
  if (cached) return cached;
  if (externalAppsPromises.has(key)) return externalAppsPromises.get(key);

  const generation = externalAppsCacheGeneration;
  const task = (async () => {
    const manager = canManageAiWebsites(user);
    const snapshotPromise = suppliedSnapshot
      ? Promise.resolve(suppliedSnapshot)
      : loadAiWebsiteSettings(user);

    let requestPromise = Promise.resolve({ mine: [], requests: [] });
    if (includeRequests && user?.id) {
      if (manager) {
        requestPromise = requestApi('?mode=all').then((payload) => {
          const requests = hydrateRequests(payload.requests || []);
          return {
            requests,
            mine: requests.filter((request) => String(request.requester_id || '') === String(user.id)),
          };
        });
      } else {
        requestPromise = requestApi('?mode=mine').then((payload) => ({
          mine: hydrateRequests(payload.requests || []),
          requests: [],
        }));
      }
    }

    const [snapshot, requestState] = await Promise.all([snapshotPromise, requestPromise]);
    const state = {
      approved: (snapshot.tools || []).map(externalAppFromTool).filter(Boolean),
      mine: requestState.mine || [],
      requests: requestState.requests || [],
      snapshot,
    };
    if (generation === externalAppsCacheGeneration) storeExternalApps(user, includeRequests, state);
    return state;
  })().finally(() => {
    if (externalAppsPromises.get(key) === task) externalAppsPromises.delete(key);
  });

  externalAppsPromises.set(key, task);
  return task;
}

export async function submitExternalWebApp(user, draft, language = 'vi') {
  const app = normalizeExternalAppDraft(draft);
  if (!app.name) throw new Error(language === 'vi' ? 'Vui lòng nhập tên ứng dụng.' : 'Please enter an app name.');
  if (!app.url) throw new Error(language === 'vi' ? 'Chỉ chấp nhận website HTTPS hợp lệ.' : 'Only valid HTTPS websites are accepted.');
  const result = await requestApi('', { method: 'POST', body: JSON.stringify({ app }) });
  invalidateExternalAppsCache();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PERMISSION_REQUESTS_EVENT));
  return result;
}

export async function approveExternalWebApp(user, request, embedConfig = {}) {
  const app = parseRequestPayload(request);
  if (!app.name || !app.url) throw new Error('Yêu cầu không có tên hoặc URL hợp lệ.');

  const payload = await requestApi('', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'approve',
      id: request.id,
      embedConfig: normalizeExternalAppEmbedConfig(embedConfig, app.url),
    }),
  });

  const approvedTool = normalizeAiWebsiteTool(payload.approvedTool || {});
  const tools = Array.isArray(payload.tools)
    ? payload.tools.map(normalizeAiWebsiteTool)
    : [approvedTool];
  const snapshot = {
    tools,
    updatedAt: payload.updatedAt || new Date().toISOString(),
    updatedBy: user?.email || user?.id || '',
    source: 'supabase-fast-approval',
    error: '',
    setupRequired: false,
  };

  invalidateExternalAppsCache();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PERMISSION_REQUESTS_EVENT));
  return {
    approvedTool,
    request: payload.request || { id: request.id, status: 'approved' },
    snapshot,
  };
}

export async function rejectExternalWebApp(requestId) {
  const result = await requestApi('', { method: 'PATCH', body: JSON.stringify({ id: requestId, status: 'rejected' }) });
  invalidateExternalAppsCache();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PERMISSION_REQUESTS_EVENT));
  return result;
}

export async function updateApprovedExternalWebAppConfig(user, appId, embedConfig = {}) {
  const snapshot = await loadAiWebsiteSettings(user);
  const nextTools = (snapshot.tools || []).map((tool) => (
    tool.kind === EXTERNAL_APP_KIND && tool.id === appId
      ? normalizeAiWebsiteTool({
        ...tool,
        embedConfig: normalizeExternalAppEmbedConfig(embedConfig, tool.url),
      })
      : tool
  ));
  invalidateExternalAppsCache();
  return saveAiWebsiteSettings(user, nextTools);
}

export async function updateApprovedExternalWebAppView(user, appId, embedView = {}) {
  const snapshot = await loadAiWebsiteSettings(user);
  const nextTools = (snapshot.tools || []).map((tool) => (
    tool.kind === EXTERNAL_APP_KIND && tool.id === appId
      ? normalizeAiWebsiteTool({ ...tool, embedView: normalizeEmbedView(embedView) })
      : tool
  ));
  invalidateExternalAppsCache();
  return saveAiWebsiteSettings(user, nextTools);
}

export async function removeApprovedExternalWebApp(user, appId) {
  const snapshot = await loadAiWebsiteSettings(user);
  invalidateExternalAppsCache();
  await saveAiWebsiteSettings(user, (snapshot.tools || []).filter(
    (tool) => !(tool.kind === EXTERNAL_APP_KIND && tool.id === appId),
  ));
}

function realtimeRow(payload) {
  return payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
}

export function subscribeExternalWebApps(user, listener, { includeRequests = true } = {}) {
  let active = true;
  let lastState = readCachedExternalApps(user, includeRequests);
  let lastSnapshot = lastState?.snapshot || null;
  const safeListener = typeof listener === 'function' ? listener : () => {};
  const emit = (state) => {
    if (!active || !state) return;
    lastState = state;
    lastSnapshot = state.snapshot || lastSnapshot;
    safeListener(state);
  };
  const refresh = () => loadExternalWebApps(user, {
    includeRequests,
    force: true,
    snapshot: lastSnapshot,
  }).then(emit).catch((error) => console.warn('[External apps] refresh failed', error));

  const unsubscribeAi = subscribeAiWebsiteSettings(user, (snapshot) => {
    lastSnapshot = snapshot;
    const next = stateFromSnapshot(snapshot, lastState || readCachedExternalApps(user, includeRequests) || {});
    storeExternalApps(user, includeRequests, next);
    emit(next);
  });

  let unsubscribeRequests = () => {};
  if (includeRequests && user?.id) {
    externalAppsSubscriptionSerial += 1;
    const manager = canManageAiWebsites(user);
    unsubscribeRequests = subscribeTable({
      key: `external-app-requests-${externalAppsScope(user)}-${externalAppsSubscriptionSerial}`,
      table: 'permission_requests',
      filter: manager ? '' : `requester_id=eq.${user.id}`,
      onChange: (payload) => {
        const row = realtimeRow(payload);
        if (!row || !isExternalAppRequest(row)) return;
        invalidateExternalAppsCache();
        refresh();
      },
    });
  }

  const requestHandler = () => {
    invalidateExternalAppsCache();
    refresh();
  };
  if (typeof window !== 'undefined') window.addEventListener(PERMISSION_REQUESTS_EVENT, requestHandler);

  return () => {
    active = false;
    unsubscribeAi?.();
    unsubscribeRequests?.();
    if (typeof window !== 'undefined') window.removeEventListener(PERMISSION_REQUESTS_EVENT, requestHandler);
  };
}
