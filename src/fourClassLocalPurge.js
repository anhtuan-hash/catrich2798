import { getCurrentUser } from './utils/auth.js';
import { schoolClassRegistryStorageKey } from './utils/schoolClassRegistry.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

// Legacy destructive purge retired permanently.
// Fresh browsers / Incognito sessions must never erase or shadow a valid cloud
// class-assignment registry just because localStorage is empty.
const LEGACY_PURGE_MARKERS = [
  'bes-all-class-local-purge-20260805-v1',
  'bes-all-class-local-purge-v2026-08-05',
  'bes-four-class-local-purge-20260805-v1',
  'bes-four-class-local-purge-20260805-v2',
];
const REGISTRY_TABLE = 'school_class_registries';
const RECOVERY_GUARD_PREFIX = 'bes-school-class-cloud-recovery-v2:';

function safeJson(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function isBrianTeamRoute() {
  if (typeof window === 'undefined') return false;
  return /brian-team|personnel-hub|work-hub/i.test(window.location.hash || '');
}

function explicitPurgeState(registry) {
  const purge = registry?.classDataPurge;
  return purge?.scope === 'all-classes' || purge?.state === 'purged';
}

function assignmentScore(registry) {
  const classes = Array.isArray(registry?.classes) ? registry.classes : [];
  return classes.reduce((score, item) => {
    const homeroom = String(item?.homeroomTeacherId || '').trim() ? 1 : 0;
    const subjects = Array.isArray(item?.subjectTeacherIds)
      ? item.subjectTeacherIds.filter((value) => String(value || '').trim()).length
      : 0;
    const locked = item?.assignmentLocked === true ? 1 : 0;
    return score + homeroom + subjects + locked;
  }, 0);
}

function classCount(registry) {
  return Array.isArray(registry?.classes) ? registry.classes.length : 0;
}

function retireLegacyPurge() {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_PURGE_MARKERS) {
    try { window.localStorage.removeItem(key); } catch { /* optional storage */ }
    try { window.sessionStorage.removeItem(key); } catch { /* optional storage */ }
  }
  window.__BES_CLASS_DATA_PURGE_RETIRED__ = true;
}

function writeRecoveryDiagnostic(detail) {
  if (typeof window === 'undefined') return;
  window.__BES_CLASS_REGISTRY_RECOVERY__ = {
    ...(detail || {}),
    at: new Date().toISOString(),
  };
}

async function recoverCloudRegistry() {
  if (!isBrianTeamRoute() || !isSupabaseConfigured || !supabase) return;

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.warn('[SchoolClassRecovery] Could not resolve current user.', error);
    return;
  }
  if (!user?.id) return;

  const storageKey = schoolClassRegistryStorageKey(user);
  let localRegistry = null;
  try {
    localRegistry = safeJson(window.localStorage.getItem(storageKey), null);
  } catch {
    localRegistry = null;
  }

  let data = null;
  try {
    const response = await supabase
      .from(REGISTRY_TABLE)
      .select('payload,updated_at')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (response.error) {
      console.warn('[SchoolClassRecovery] Cloud registry read failed.', response.error.message || response.error);
      return;
    }
    data = response.data;
  } catch (error) {
    console.warn('[SchoolClassRecovery] Cloud registry read failed.', error);
    return;
  }

  const cloudRegistry = data?.payload && typeof data.payload === 'object' ? data.payload : null;
  if (!cloudRegistry) return;

  const cloudAssignments = assignmentScore(cloudRegistry);
  const localAssignments = assignmentScore(localRegistry);
  const localMissing = !localRegistry || typeof localRegistry !== 'object';
  const localPurged = explicitPurgeState(localRegistry);
  const localEmptyAgainstCloud = cloudAssignments > 0 && localAssignments === 0;
  const localHasNoClassesAgainstCloud = classCount(localRegistry) === 0 && classCount(cloudRegistry) > 0;

  // normalizeSchoolClassRegistry() can manufacture a blank local registry with
  // updatedAt=now. The old bootstrap then treats that synthetic blank snapshot as
  // newer than the real Supabase payload. Prefer cloud whenever the local state is
  // missing/purged or clearly blank while cloud still contains assignments/locks.
  const shouldRecover = localMissing || localPurged || localEmptyAgainstCloud || localHasNoClassesAgainstCloud;
  if (!shouldRecover) {
    writeRecoveryDiagnostic({
      state: 'cloud-and-local-valid',
      cloudAssignments,
      localAssignments,
      cloudClasses: classCount(cloudRegistry),
      localClasses: classCount(localRegistry),
    });
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cloudRegistry));
  } catch (error) {
    console.warn('[SchoolClassRecovery] Could not seed local registry from cloud.', error);
    return;
  }

  writeRecoveryDiagnostic({
    state: 'recovered-from-cloud',
    reason: localPurged
      ? 'legacy-local-purge'
      : localEmptyAgainstCloud
        ? 'blank-local-shadowed-cloud'
        : localHasNoClassesAgainstCloud
          ? 'local-classes-missing'
          : 'local-registry-missing',
    cloudAssignments,
    previousLocalAssignments: localAssignments,
    cloudClasses: classCount(cloudRegistry),
    previousLocalClasses: classCount(localRegistry),
    cloudUpdatedAt: data?.updated_at || cloudRegistry?.updatedAt || '',
  });

  // Brian Team may already have mounted from the synthetic blank snapshot. Reload
  // once so normal bootstrap starts from the recovered cloud payload.
  const guardKey = `${RECOVERY_GUARD_PREFIX}${user.id}`;
  let alreadyReloaded = false;
  try {
    alreadyReloaded = window.sessionStorage.getItem(guardKey) === 'done';
    if (!alreadyReloaded) window.sessionStorage.setItem(guardKey, 'done');
  } catch {
    // On the next pass localStorage is already recovered, so a reload loop cannot occur.
  }

  if (!alreadyReloaded) {
    window.setTimeout(() => window.location.reload(), 0);
  }
}

let recoveryScheduled = false;
function scheduleRecovery() {
  if (!isBrianTeamRoute() || recoveryScheduled) return;
  recoveryScheduled = true;
  Promise.resolve()
    .then(recoverCloudRegistry)
    .catch((error) => console.warn('[SchoolClassRecovery] Unexpected recovery failure.', error))
    .finally(() => { recoveryScheduled = false; });
}

retireLegacyPurge();

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRecovery, { once: true });
  } else {
    scheduleRecovery();
  }
  window.addEventListener('hashchange', scheduleRecovery);
}

export { recoverCloudRegistry, retireLegacyPurge };
