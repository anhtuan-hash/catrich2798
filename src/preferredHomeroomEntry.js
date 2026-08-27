import { AUTH_EVENT, getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  listLocalHomeroomWorkspaces,
  setCurrentHomeroomWorkspaceId,
} from './utils/homeroomClassWorkspaceStore.js';
import { HOMEROOM_CLASS_TYPE } from './utils/homeroomClassTypes.js';
import {
  normalizeSchoolClassName,
  normalizeSchoolClassRegistry,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';

let installed = false;
let previousHomeroomRoute = false;
let runningPromise = null;

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

function preferredLocalWorkspace(user) {
  const catalog = listLocalHomeroomWorkspaces(user)
    .filter((item) => item.status !== 'archived');
  const assignedClassName = assignedHomeroomClassName(user);

  if (assignedClassName) {
    const exact = catalog.find((item) => (
      normalizeSchoolClassName(item.className) === assignedClassName
    ));
    if (exact?.id) return { id: exact.id, className: assignedClassName, source: 'registry-assignment' };
  }

  const typed = catalog.find((item) => item.classType === HOMEROOM_CLASS_TYPE);
  if (typed?.id) {
    return {
      id: typed.id,
      className: normalizeSchoolClassName(typed.className) || text(typed.className),
      source: 'workspace-class-type',
    };
  }
  return null;
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
      return { ok: true, changed: false, skipped: 'no-cached-homeroom' };
    }

    const currentId = getCurrentHomeroomWorkspaceId(user);
    if (currentId === preferred.id) {
      return { ok: true, changed: false, workspaceId: preferred.id, className: preferred.className };
    }

    setCurrentHomeroomWorkspaceId(user, preferred.id);
    window.dispatchEvent(new CustomEvent('bes-preferred-homeroom-selected', {
      detail: {
        workspaceId: preferred.id,
        className: preferred.className,
        source: preferred.source,
      },
    }));
    window.dispatchEvent(new CustomEvent('bes-homeroom-store-updated'));
    switchHomeroomWorkspaceInPlace(preferred);

    return {
      ok: true,
      changed: true,
      workspaceId: preferred.id,
      className: preferred.className,
      source: preferred.source,
    };
  })().finally(() => { runningPromise = null; });

  return runningPromise;
}

function enforceAfterAssignmentSync() {
  window.setTimeout(() => {
    preparePreferredHomeroomEntry().catch((error) => {
      console.warn('[PreferredHomeroomEntry] Không thể mở lớp chủ nhiệm sau đồng bộ.', error);
    });
  }, 80);
}

export function installPreferredHomeroomEntry() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  previousHomeroomRoute = isHomeroomRoute();

  window.addEventListener(AUTH_EVENT, () => {
    if (isHomeroomRoute()) enforceAfterAssignmentSync();
  });
  window.addEventListener('hashchange', () => {
    const current = isHomeroomRoute();
    const entering = current && !previousHomeroomRoute;
    previousHomeroomRoute = current;
    if (entering) enforceAfterAssignmentSync();
  });
  window.addEventListener('bes-school-class-assignment-synced', enforceAfterAssignmentSync);
  window.addEventListener('bes-school-class-registry-updated', enforceAfterAssignmentSync);
}

installPreferredHomeroomEntry();
