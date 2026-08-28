import { AUTH_EVENT, getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  listLocalHomeroomWorkspaces,
  setCurrentHomeroomWorkspaceId,
} from './utils/homeroomClassWorkspaceStore.js';
import {
  normalizeSchoolClassName,
  normalizeSchoolClassRegistry,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';

let installed = false;
let previousHomeroomRoute = false;
let runningPromise = null;
let authoritativeHomeroomWorkspaceId = '';
let authoritativeHomeroomClassName = '';

function text(value) {
  return String(value ?? '').trim();
}

function identity(value) {
  return text(value).toLowerCase();
}

function isHomeroomRoute() {
  return /homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '');
}

function userAliases(user) {
  return new Set([
    identity(user?.id),
    identity(user?.authId),
    identity(user?.email),
  ].filter(Boolean));
}

function readLocalRegistry(user) {
  try {
    const raw = localStorage.getItem(schoolClassRegistryStorageKey(user));
    if (!raw) return null;
    return normalizeSchoolClassRegistry(JSON.parse(raw));
  } catch {
    return null;
  }
}

function assignedHomeroomClassName(user) {
  const registry = readLocalRegistry(user);
  if (!registry) return '';
  const aliases = userAliases(user);
  const assigned = (registry.classes || []).find((item) => (
    aliases.has(identity(item?.assignment?.homeroomTeacherId))
  ));
  return normalizeSchoolClassName(assigned?.className);
}

function authoritativePreferredWorkspace() {
  const globalId = typeof window !== 'undefined' ? text(window.__besAssignedHomeroomWorkspaceId) : '';
  const id = globalId || authoritativeHomeroomWorkspaceId;
  if (!id) return null;
  return {
    id,
    className: authoritativeHomeroomClassName,
    source: 'server-assignment',
  };
}

function preferredLocalWorkspace(user) {
  const authoritative = authoritativePreferredWorkspace();
  if (authoritative?.id) return authoritative;

  // Local data is fallback-only. It may be stale on first entry, so it is allowed
  // to select a class only when the registry explicitly assigns that exact class
  // to the current teacher. Never choose the first workspace merely because its
  // cached classType happens to be "homeroom".
  const assignedClassName = assignedHomeroomClassName(user);
  if (!assignedClassName) return null;

  const catalog = listLocalHomeroomWorkspaces(user)
    .filter((item) => item.status !== 'archived');
  const exact = catalog.find((item) => (
    normalizeSchoolClassName(item.className) === assignedClassName
  ));
  return exact?.id
    ? { id: exact.id, className: assignedClassName, source: 'registry-assignment' }
    : null;
}

function switchHomeroomWorkspaceInPlace(preferred) {
  if (!preferred?.id || typeof window === 'undefined' || !isHomeroomRoute()) return;
  window.dispatchEvent(new CustomEvent('bes-homeroom-command', {
    detail: {
      type: 'homeroom.navigate',
      workspaceId: preferred.id,
      tab: 'overview',
      source: preferred.source || 'preferred-homeroom',
    },
  }));
}

function publishPreferredSelection(preferred) {
  if (typeof window === 'undefined' || !preferred?.id) return;
  window.dispatchEvent(new CustomEvent('bes-preferred-homeroom-selected', {
    detail: {
      workspaceId: preferred.id,
      className: preferred.className,
      source: preferred.source,
    },
  }));
  window.dispatchEvent(new CustomEvent('bes-homeroom-store-updated'));
}

async function applyPreferredWorkspace(preferred, options = {}) {
  if (!preferred?.id) return { ok: true, changed: false, skipped: 'no-preferred-homeroom' };
  const user = options.user || await getCurrentUser();
  if (!user?.id || user.approved === false) {
    return { ok: true, changed: false, skipped: 'no-approved-user' };
  }

  const currentId = getCurrentHomeroomWorkspaceId(user);
  const changed = currentId !== preferred.id;
  if (changed) setCurrentHomeroomWorkspaceId(user, preferred.id);

  // Navigation is intentionally emitted even when storage already contains the
  // correct id. React may still be holding a stale workspaceId from an earlier
  // render, and this command makes the authoritative server selection idempotent.
  if (changed || options.forceNavigate === true) publishPreferredSelection(preferred);
  switchHomeroomWorkspaceInPlace(preferred);

  return {
    ok: true,
    changed,
    workspaceId: preferred.id,
    className: preferred.className,
    source: preferred.source,
  };
}

export async function preparePreferredHomeroomEntry() {
  if (!isHomeroomRoute()) return { ok: true, changed: false, skipped: 'outside-homeroom' };
  if (runningPromise) return runningPromise;

  runningPromise = (async () => {
    const user = await getCurrentUser();
    if (!user?.id || user.approved === false) {
      return { ok: true, changed: false, skipped: 'no-approved-user' };
    }

    const preferred = preferredLocalWorkspace(user);
    if (!preferred?.id) {
      return { ok: true, changed: false, skipped: 'no-explicit-homeroom-assignment' };
    }
    return applyPreferredWorkspace(preferred, { user, forceNavigate: preferred.source === 'server-assignment' });
  })().finally(() => { runningPromise = null; });

  return runningPromise;
}

function rememberServerAssignment(detail = {}) {
  const id = text(detail.homeroomWorkspaceId);
  if (!id) return null;
  authoritativeHomeroomWorkspaceId = id;
  authoritativeHomeroomClassName = normalizeSchoolClassName(detail.homeroomClassName || detail.className);
  if (typeof window !== 'undefined') window.__besAssignedHomeroomWorkspaceId = id;
  return {
    id,
    className: authoritativeHomeroomClassName,
    source: 'server-assignment',
  };
}

function enforceServerAssignment(event) {
  const preferred = rememberServerAssignment(event?.detail || {});
  if (!preferred?.id || !isHomeroomRoute()) return;
  applyPreferredWorkspace(preferred, { forceNavigate: true }).catch((error) => {
    console.warn('[PreferredHomeroomEntry] Không thể áp dụng lớp chủ nhiệm từ phân công server.', error);
  });
}

function enforceExplicitFallback() {
  preparePreferredHomeroomEntry().catch((error) => {
    console.warn('[PreferredHomeroomEntry] Không thể mở lớp chủ nhiệm đã phân công.', error);
  });
}

export function installPreferredHomeroomEntry() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  previousHomeroomRoute = isHomeroomRoute();

  window.addEventListener(AUTH_EVENT, () => {
    if (isHomeroomRoute()) enforceExplicitFallback();
  });
  window.addEventListener('hashchange', () => {
    const current = isHomeroomRoute();
    const entering = current && !previousHomeroomRoute;
    previousHomeroomRoute = current;
    if (entering) enforceExplicitFallback();
  });
  window.addEventListener('bes-school-class-assignment-synced', enforceServerAssignment);
  window.addEventListener('bes-school-class-registry-updated', enforceExplicitFallback);
}

installPreferredHomeroomEntry();
