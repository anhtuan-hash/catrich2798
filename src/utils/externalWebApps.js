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
const FAST_APPROVAL_CACHE_MS = 4500;
let latestExternalAppsState = null;
let fastApprovalCacheUntil = 0;

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

export function normalizeExternalAppDraft(value = {}) {
  const name = cleanText(value.name, 80);
  return {
    name,
    url: safeExternalWebAppUrl(value.url),
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
    requestId: tool.requestId || '',
    submittedBy: tool.submittedBy || '',
    approvedAt: tool.approvedAt || '',
    accent: tool.accent || '#1a73e8',
    embedView: normalizeEmbedView(tool.embedView),
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

function updateRequestStatus(items = [], requestId, status) {
  return items.map((item) => item.id === requestId ? { ...item, status } : item);
}

export async function loadExternalWebApps(user, { includeRequests = true } = {}) {
  if (latestExternalAppsState && Date.now() < fastApprovalCacheUntil) {
    return latestExternalAppsState;
  }

  const manager = canManageAiWebsites(user);
  const snapshotPromise = loadAiWebsiteSettings(user);
  const minePromise = includeRequests && user?.id
    ? requestApi('?mode=mine')
    : Promise.resolve({ requests: [] });
  const allPromise = includeRequests && user?.id && manager
    ? requestApi('?mode=all')
    : Promise.resolve({ requests: [] });

  const [snapshot, minePayload, allPayload] = await Promise.all([
    snapshotPromise,
    minePromise,
    allPromise,
  ]);

  latestExternalAppsState = {
    approved: (snapshot.tools || []).map(externalAppFromTool).filter(Boolean),
    mine: hydrateRequests(minePayload.requests || []),
    requests: hydrateRequests(allPayload.requests || []),
    snapshot,
  };
  return latestExternalAppsState;
}

export async function submitExternalWebApp(user, draft, language = 'vi') {
  const app = normalizeExternalAppDraft(draft);
  if (!app.name) throw new Error(language === 'vi' ? 'Vui lòng nhập tên ứng dụng.' : 'Please enter an app name.');
  if (!app.url) throw new Error(language === 'vi' ? 'Chỉ chấp nhận website HTTPS hợp lệ.' : 'Only valid HTTPS websites are accepted.');
  const result = await requestApi('', { method: 'POST', body: JSON.stringify({ app }) });
  fastApprovalCacheUntil = 0;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PERMISSION_REQUESTS_EVENT));
  return result;
}

export async function approveExternalWebApp(user, request, embedView = {}) {
  const app = parseRequestPayload(request);
  if (!app.name || !app.url) throw new Error('Yêu cầu không có tên hoặc URL hợp lệ.');

  const payload = await requestApi('', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'approve',
      id: request.id,
      embedView: normalizeEmbedView(embedView),
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

  latestExternalAppsState = {
    approved: tools.map(externalAppFromTool).filter(Boolean),
    mine: updateRequestStatus(latestExternalAppsState?.mine || [], request.id, 'approved'),
    requests: updateRequestStatus(latestExternalAppsState?.requests || [], request.id, 'approved'),
    snapshot,
  };
  fastApprovalCacheUntil = Date.now() + FAST_APPROVAL_CACHE_MS;

  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PERMISSION_REQUESTS_EVENT));
  return {
    approvedTool,
    request: payload.request || { id: request.id, status: 'approved' },
    snapshot,
  };
}

export async function rejectExternalWebApp(requestId) {
  const result = await requestApi('', { method: 'PATCH', body: JSON.stringify({ id: requestId, status: 'rejected' }) });
  fastApprovalCacheUntil = 0;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PERMISSION_REQUESTS_EVENT));
  return result;
}

export async function updateApprovedExternalWebAppView(user, appId, embedView = {}) {
  const snapshot = await loadAiWebsiteSettings(user);
  const nextTools = (snapshot.tools || []).map((tool) => (
    tool.kind === EXTERNAL_APP_KIND && tool.id === appId
      ? normalizeAiWebsiteTool({ ...tool, embedView: normalizeEmbedView(embedView) })
      : tool
  ));
  fastApprovalCacheUntil = 0;
  return saveAiWebsiteSettings(user, nextTools);
}

export async function removeApprovedExternalWebApp(user, appId) {
  const snapshot = await loadAiWebsiteSettings(user);
  fastApprovalCacheUntil = 0;
  await saveAiWebsiteSettings(user, (snapshot.tools || []).filter(
    (tool) => !(tool.kind === EXTERNAL_APP_KIND && tool.id === appId),
  ));
}

export function subscribeExternalWebApps(user, listener) {
  const refresh = () => loadExternalWebApps(user).then(listener).catch((error) => console.warn('[External apps] refresh failed', error));
  const unsubscribeAi = subscribeAiWebsiteSettings(user, refresh);
  const requestHandler = () => refresh();
  if (typeof window !== 'undefined') window.addEventListener(PERMISSION_REQUESTS_EVENT, requestHandler);
  return () => {
    unsubscribeAi?.();
    if (typeof window !== 'undefined') window.removeEventListener(PERMISSION_REQUESTS_EVENT, requestHandler);
  };
}
