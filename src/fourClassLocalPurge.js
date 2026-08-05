const PURGE_MARKER = 'bes-four-class-local-purge-20260805-v2';
const TARGET_CLASSES = new Set(['11.3', '11.4', '12.3', '12.6']);
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';
const INDEX_PREFIX = 'bes-homeroom-workspace-index-v3:';
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const CLASS_TYPES_PREFIX = 'bes-homeroom-class-types-v1:';
const REGISTRY_PREFIX = 'bes-school-class-registry-v1:';
const PERMANENT_DELETION_PREFIX = 'bes-permanent-student-deletions-v1:';

function text(value) {
  return String(value ?? '').trim();
}

function normalizeClassName(value) {
  const raw = text(value)
    .replace(/^lớp\s*/i, '')
    .replace(/^lop\s*/i, '')
    .replace(/[,/_-]+/g, '.')
    .replace(/\s+/g, '');
  const match = raw.match(/^(10|11|12)\.(\d{1,2})$/);
  return match ? `${match[1]}.${Number(match[2])}` : '';
}

function parseJson(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isTargetClass(value) {
  return TARGET_CLASSES.has(normalizeClassName(value));
}

function workspaceClassName(workspace) {
  return workspace?.classProfile?.className || workspace?.className || '';
}

function cleanRegistryPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const next = { ...payload };
  if (Array.isArray(payload.classes)) {
    next.classes = payload.classes.filter((item) => !isTargetClass(item?.className));
  }
  if (Array.isArray(payload.deletionAudit)) {
    next.deletionAudit = payload.deletionAudit.filter((item) => !isTargetClass(item?.className));
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

function runLocalPurge() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (localStorage.getItem(PURGE_MARKER) === 'done') return;

  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) keys.push(key);
  }

  const removedWorkspaceIds = new Set();

  keys.filter((key) => key.startsWith(WORKSPACE_PREFIX)).forEach((key) => {
    const workspace = parseJson(localStorage.getItem(key), null);
    if (!workspace || !isTargetClass(workspaceClassName(workspace))) return;
    const workspaceId = text(workspace.id);
    if (workspaceId) removedWorkspaceIds.add(workspaceId);
    localStorage.removeItem(key);
  });

  keys.filter((key) => key.startsWith(INDEX_PREFIX)).forEach((key) => {
    const items = parseJson(localStorage.getItem(key), []);
    if (!Array.isArray(items)) return;
    const next = items.filter((item) => (
      !removedWorkspaceIds.has(text(item?.id))
      && !isTargetClass(item?.className)
    ));
    localStorage.setItem(key, JSON.stringify(next));
  });

  keys.filter((key) => key.startsWith(CURRENT_PREFIX)).forEach((key) => {
    const currentId = text(localStorage.getItem(key));
    if (removedWorkspaceIds.has(currentId)) localStorage.setItem(key, 'default');
  });

  keys.filter((key) => key.startsWith(CLASS_TYPES_PREFIX)).forEach((key) => {
    const classTypes = parseJson(localStorage.getItem(key), {});
    if (!classTypes || typeof classTypes !== 'object' || Array.isArray(classTypes)) return;
    removedWorkspaceIds.forEach((workspaceId) => { delete classTypes[workspaceId]; });
    localStorage.setItem(key, JSON.stringify(classTypes));
  });

  keys.filter((key) => key.startsWith(REGISTRY_PREFIX)).forEach((key) => {
    const payload = parseJson(localStorage.getItem(key), null);
    if (!payload || typeof payload !== 'object') return;
    localStorage.setItem(key, JSON.stringify(cleanRegistryPayload(payload)));
  });

  keys.filter((key) => key.startsWith(PERMANENT_DELETION_PREFIX)).forEach((key) => {
    const classToken = key.split(':').pop();
    if (isTargetClass(classToken)) localStorage.removeItem(key);
  });

  try {
    sessionStorage.removeItem('bes-class-12-6-recovery-notice-v1');
  } catch { /* session storage is optional */ }

  localStorage.setItem(PURGE_MARKER, 'done');
  window.__BES_FOUR_CLASS_LOCAL_PURGE__ = Object.freeze({
    completed: true,
    classes: [...TARGET_CLASSES],
    removedWorkspaceIds: [...removedWorkspaceIds],
  });
}

try {
  runLocalPurge();
} catch (error) {
  console.warn('[FourClassLocalPurge] Không thể làm sạch toàn bộ cache cục bộ.', error);
}
