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
import { isSupabaseConfigured, supabase } from './utils/supabase.js';
import { selectServerAssignedHomeroom } from './utils/homeroomAssignmentSelection.js';
import { fastPreferredHomeroom, rememberAssignedHomeroom } from './utils/homeroomFastEntry.js';

const ASSIGNED_HOMEROOM_RPC = 'bes_get_my_assigned_homeroom';
const ASSIGNED_HOMEROOM_TIMEOUT_MS = 5500;

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
  const fast = fastPreferredHomeroom(user);
  if (fast?.id) return fast;
  const authoritative = authoritativePreferredWorkspace();
  if (authoritative?.id) return authoritative;

  // Local data is fallback-only. It may be stale on first entry, so it is allowed
  // to select a class only when the registry explicitly assigns that exact class
  // to the current teacher. Never choose the first workspace merely because its
  // cached classType happens to be "homeroom".
  const assignedClassName = assignedHomeroomClassName(user);
  const catalog = listLocalHomeroomWorkspaces(user)
    .filter((item) => item.status !== 'archived');
  const exact = assignedClassName && catalog.find((item) => (
    normalizeSchoolClassName(item.className) === assignedClassName
  ));
  if (exact?.id) return { id: exact.id, className: assignedClassName, source: 'registry-assignment' };

  // On an offline/slow entry a teacher may not have the admin-owned registry
  // cached locally. One explicitly typed homeroom is a safer fallback than the
  // last opened subject class. Ambiguous catalogs are never guessed.
  const typedHomerooms = catalog.filter((item) => item.classType === 'homeroom');
  return typedHomerooms.length === 1
    ? { id: typedHomerooms[0].id, className: typedHomerooms[0].className, source: 'local-homeroom-type' }
    : null;
}

// Read a tiny, account-scoped, server-authoritative GVCN mapping before the
// Homeroom UI mounts. The existing full roster sync is intentionally not awaited:
// an admin with many assigned/managed classes should never open a random subject
// class while the expensive roster hydration is still running.
async function loadServerPreferredWorkspace(user) {
  if (!user?.id || !isSupabaseConfigured || !supabase) return null;
  let timer;
  try {
    const response = await Promise.race([
      Promise.resolve(supabase.rpc(ASSIGNED_HOMEROOM_RPC)),
      new Promise((resolve) => {
        timer = window.setTimeout(() => resolve({ error: { message: 'Assigned homeroom lookup timed out.' } }), ASSIGNED_HOMEROOM_TIMEOUT_MS);
      }),
    ]);
    if (response?.error) {
      console.warn('[PreferredHomeroomEntry] Không tải được phân công GVCN nhanh.', response.error.message);
      return null;
    }
    const selected = selectServerAssignedHomeroom(response?.data);
    if (!selected) return null;
    return rememberServerAssignment({
      homeroomWorkspaceId: selected.id,
      homeroomClassName: selected.className,
    });
  } catch (error) {
    console.warn('[PreferredHomeroomEntry] Lỗi truy vấn lớp GVCN.', error);
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function switchHomeroomWorkspaceInPlace(preferred, options = {}) {
  if (!preferred?.id || typeof window === 'undefined' || !isHomeroomRoute()) return;
  window.dispatchEvent(new CustomEvent('bes-homeroom-command', {
    detail: {
      type: 'homeroom.navigate',
      workspaceId: preferred.id,
      tab: 'overview',
      preserveTab: options.preserveTab === true,
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
  // Re-confirming the same server-assigned class must not reset the user's
  // current Homeroom tab. Only a real workspace change gets the default Overview.
  switchHomeroomWorkspaceInPlace(preferred, { preserveTab: !changed });

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

    // Open the last server-verified GVCN (or a uniquely typed indexed GVCN)
    // immediately. Refresh the authoritative assignment in the background;
    // a 5.5-second RPC must never decide first paint.
    const cached = preferredLocalWorkspace(user);
    if (cached?.id) {
      if (cached.source === 'cached-server-assignment') {
        rememberServerAssignment({ homeroomWorkspaceId: cached.id, homeroomClassName: cached.className });
      }
      await applyPreferredWorkspace(cached, { user });
    }
    const fresh = await loadServerPreferredWorkspace(user);
    if (fresh?.id) {
      rememberAssignedHomeroom(user, fresh);
      return applyPreferredWorkspace(fresh, { user, forceNavigate: fresh.id !== cached?.id });
    }
    if (cached?.id) return { ok: true, changed: false, workspaceId: cached.id, source: cached.source };
    return { ok: true, changed: false, skipped: 'no-explicit-homeroom-assignment' };
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
  getCurrentUser().then((user) => {
    if (!user?.id || user.approved === false) return;
    rememberAssignedHomeroom(user, preferred);
    return applyPreferredWorkspace(preferred, { user, forceNavigate: true });
  }).catch((error) => {
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
