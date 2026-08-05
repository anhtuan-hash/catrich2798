const PURGE_MARKER = 'bes-all-class-local-purge-20260805-v1';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';
const INDEX_PREFIX = 'bes-homeroom-workspace-index-v3:';
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const CLASS_TYPES_PREFIX = 'bes-homeroom-class-types-v1:';
const REGISTRY_PREFIX = 'bes-school-class-registry-v1:';
const PERMANENT_DELETION_PREFIX = 'bes-permanent-student-deletions-v1:';
const PURGE_VERSION = '2026-08-05-all-v1';

function parseJson(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function emptyRegistryPayload(payload) {
  const updatedAt = new Date().toISOString();
  return {
    ...(payload && typeof payload === 'object' ? payload : {}),
    version: Math.max(Number(payload?.version) || 1, 3),
    sourceLabel: '',
    importedAt: '',
    updatedAt,
    deletionAudit: [],
    classes: [],
    classDataPurge: {
      scope: 'all-classes',
      version: PURGE_VERSION,
      completedAt: updatedAt,
    },
  };
}

function runLocalPurge() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (localStorage.getItem(PURGE_MARKER) === 'done') return;

  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) keys.push(key);
  }

  let removedWorkspaceCount = 0;
  keys.filter((key) => key.startsWith(WORKSPACE_PREFIX)).forEach((key) => {
    localStorage.removeItem(key);
    removedWorkspaceCount += 1;
  });

  keys.filter((key) => key.startsWith(INDEX_PREFIX)).forEach((key) => {
    localStorage.setItem(key, '[]');
  });

  keys.filter((key) => key.startsWith(CURRENT_PREFIX)).forEach((key) => {
    localStorage.setItem(key, 'default');
  });

  keys.filter((key) => key.startsWith(CLASS_TYPES_PREFIX)).forEach((key) => {
    localStorage.setItem(key, '{}');
  });

  keys.filter((key) => key.startsWith(REGISTRY_PREFIX)).forEach((key) => {
    const payload = parseJson(localStorage.getItem(key), {});
    localStorage.setItem(key, JSON.stringify(emptyRegistryPayload(payload)));
  });

  keys.filter((key) => key.startsWith(PERMANENT_DELETION_PREFIX)).forEach((key) => {
    localStorage.removeItem(key);
  });

  try {
    sessionStorage.removeItem('bes-class-12-6-recovery-notice-v1');
  } catch { /* session storage is optional */ }

  localStorage.removeItem('bes-four-class-local-purge-20260805-v1');
  localStorage.removeItem('bes-four-class-local-purge-20260805-v2');
  localStorage.setItem(PURGE_MARKER, 'done');
  window.__BES_ALL_CLASS_LOCAL_PURGE__ = Object.freeze({
    completed: true,
    removedWorkspaceCount,
    completedAt: new Date().toISOString(),
  });
}

try {
  runLocalPurge();
} catch (error) {
  console.warn('[AllClassLocalPurge] Không thể làm sạch toàn bộ dữ liệu lớp cục bộ.', error);
}
