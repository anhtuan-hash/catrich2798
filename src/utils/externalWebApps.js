import {
  loadAiWebsiteSettings,
  normalizeAiWebsiteTool,
  safeAiWebsiteUrl,
  saveAiWebsiteSettings,
  subscribeAiWebsiteSettings,
} from './aiWebsiteSettings.js';
import {
  getMyPermissionRequests,
  getPermissionRequests,
  PERMISSION_REQUESTS_EVENT,
  requestPermission,
  updatePermissionRequestStatus,
} from './permissionRequests.js';

export const EXTERNAL_APP_PERMISSION_PREFIX = 'external-web-app:';
export const EXTERNAL_APP_KIND = 'external-app';
export const EXTERNAL_APP_GROUPS = [
  { id: 'plan', label: 'Soạn bài' },
  { id: 'create', label: 'Tạo học liệu' },
  { id: 'assess', label: 'Kiểm tra' },
  { id: 'manage', label: 'Quản lý' },
];

export function safeExternalWebAppUrl(value) {
  const normalized = safeAiWebsiteUrl(value);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:') return '';
    if (/^(localhost|127\.|0\.0\.0\.0|\[?::1\]?$)/i.test(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeExternalAppDraft(value = {}) {
  const name = cleanText(value.name, 80);
  const url = safeExternalWebAppUrl(value.url);
  const groupId = EXTERNAL_APP_GROUPS.some((group) => group.id === value.groupId) ? value.groupId : 'create';
  return {
    name,
    url,
    icon: cleanText(value.icon || name.slice(0, 2) || 'WEB', 3).toUpperCase(),
    description: cleanText(value.description, 220),
    groupId,
  };
}

function parseRequestPayload(request = {}) {
  try {
    const payload = JSON.parse(String(request.message || '{}'));
    return normalizeExternalAppDraft(payload);
  } catch {
    return normalizeExternalAppDraft({ name: request.item_title, url: '', description: request.message });
  }
}

export function isExternalAppRequest(request = {}) {
  return request.item_type === EXTERNAL_APP_KIND
    || String(request.permission_id || '').startsWith(EXTERNAL_APP_PERMISSION_PREFIX);
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
  };
}

export async function loadExternalWebApps(user, { includeRequests = true } = {}) {
  const snapshot = await loadAiWebsiteSettings(user);
  const approved = (snapshot.tools || []).map(externalAppFromTool).filter(Boolean);
  let mine = [];
  let requests = [];
  if (includeRequests && user?.id) {
    try {
      mine = (await getMyPermissionRequests(user.id)).filter(isExternalAppRequest);
    } catch (error) {
      console.warn('[External apps] own submissions unavailable', error);
    }
    try {
      requests = (await getPermissionRequests()).filter(isExternalAppRequest);
    } catch {
      requests = [];
    }
  }
  return {
    approved,
    mine: mine.map((request) => ({ ...request, app: parseRequestPayload(request) })),
    requests: requests.map((request) => ({ ...request, app: parseRequestPayload(request) })),
    snapshot,
  };
}

export async function submitExternalWebApp(user, draft, language = 'vi') {
  const app = normalizeExternalAppDraft(draft);
  if (!app.name) throw new Error(language === 'vi' ? 'Vui lòng nhập tên ứng dụng.' : 'Please enter an app name.');
  if (!app.url) throw new Error(language === 'vi' ? 'Chỉ chấp nhận website HTTPS hợp lệ.' : 'Only valid HTTPS websites are accepted.');
  const requestId = `${EXTERNAL_APP_PERMISSION_PREFIX}${user?.id || 'user'}:${Date.now()}`;
  const result = await requestPermission({
    user,
    permissionId: requestId,
    item: { id: requestId, title: app.name, titleVi: app.name, type: EXTERNAL_APP_KIND },
    message: JSON.stringify({ ...app, version: 1 }),
    language,
  });
  if (!result.ok) throw new Error(result.message || 'Không thể gửi đề xuất ứng dụng.');
  return result;
}

export async function approveExternalWebApp(user, request) {
  const app = parseRequestPayload(request);
  if (!app.name || !app.url) throw new Error('Yêu cầu không có tên hoặc URL hợp lệ.');
  const snapshot = await loadAiWebsiteSettings(user);
  const duplicate = (snapshot.tools || []).find((tool) => tool.kind === EXTERNAL_APP_KIND && safeExternalWebAppUrl(tool.url) === app.url);
  const approvedTool = normalizeAiWebsiteTool({
    ...(duplicate || {}),
    id: duplicate?.id || `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: app.name,
    url: app.url,
    icon: app.icon,
    description: app.description,
    audience: 'all',
    enabled: true,
    pinned: false,
    kind: EXTERNAL_APP_KIND,
    groupId: app.groupId,
    requestId: request.id,
    submittedBy: request.requester_email || request.requester_name || '',
    approvedAt: new Date().toISOString(),
  });
  const kept = (snapshot.tools || []).filter((tool) => tool.id !== duplicate?.id);
  await saveAiWebsiteSettings(user, [...kept, approvedTool]);
  const status = await updatePermissionRequestStatus(request.id, 'approved');
  if (!status.ok) throw new Error(status.message || 'Đã thêm ứng dụng nhưng chưa cập nhật được trạng thái yêu cầu.');
  return approvedTool;
}

export async function rejectExternalWebApp(requestId) {
  const result = await updatePermissionRequestStatus(requestId, 'rejected');
  if (!result.ok) throw new Error(result.message || 'Không thể từ chối yêu cầu.');
  return result;
}

export async function removeApprovedExternalWebApp(user, appId) {
  const snapshot = await loadAiWebsiteSettings(user);
  const next = (snapshot.tools || []).filter((tool) => !(tool.kind === EXTERNAL_APP_KIND && tool.id === appId));
  await saveAiWebsiteSettings(user, next);
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
