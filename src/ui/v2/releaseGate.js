const OPT_IN_KEY = 'brian-ui-v2-private-opt-in-v1';
const ROLLBACK_KEY = 'brian-ui-v2-rollback-latch-v1';
const CHECKLIST_KEY = 'brian-ui-v2-release-checklist-v1';

export const V2_RELEASE_MODE = (() => {
  const raw = String(import.meta?.env?.VITE_BRIAN_UI_V2_MODE || 'shadow').trim().toLowerCase();
  return ['off', 'shadow', 'opt-in', 'on'].includes(raw) ? raw : 'shadow';
})();

function ownerToken(user) {
  return String(user?.id || user?.email || 'guest').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'guest';
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* local release QA is best-effort */ }
}

export function readPrivateOptIn(user) {
  const state = readJson(OPT_IN_KEY, {});
  return Boolean(state?.[ownerToken(user)]);
}

export function setPrivateOptIn(user, enabled) {
  const state = readJson(OPT_IN_KEY, {});
  state[ownerToken(user)] = Boolean(enabled);
  writeJson(OPT_IN_KEY, state);
  return Boolean(enabled);
}

export function readRollbackLatch() {
  const value = readJson(ROLLBACK_KEY, null);
  return value && value.active ? value : { active: false, reason: '', at: '' };
}

export function setRollbackLatch(active, reason = '') {
  const value = active
    ? { active: true, reason: String(reason || 'Manual rollback latch'), at: new Date().toISOString() }
    : { active: false, reason: '', at: new Date().toISOString() };
  writeJson(ROLLBACK_KEY, value);
  return value;
}

const DEFAULT_CHECKLIST = Object.freeze({
  responsive: false,
  accessibility: false,
  performance: false,
  behavior: false,
  ci: false,
  ownerApproval: false,
});

export function readReleaseChecklist() {
  const current = readJson(CHECKLIST_KEY, {});
  return { ...DEFAULT_CHECKLIST, ...(current && typeof current === 'object' ? current : {}) };
}

export function setReleaseChecklistItem(key, value) {
  if (!Object.hasOwn(DEFAULT_CHECKLIST, key)) return readReleaseChecklist();
  const current = readReleaseChecklist();
  current[key] = Boolean(value);
  writeJson(CHECKLIST_KEY, current);
  return current;
}

export function resetReleaseChecklist() {
  writeJson(CHECKLIST_KEY, DEFAULT_CHECKLIST);
  return { ...DEFAULT_CHECKLIST };
}

export function shouldBootV2({ user, releaseApproved = false } = {}) {
  const rollback = readRollbackLatch();
  if (rollback.active || !releaseApproved) return false;
  if (V2_RELEASE_MODE === 'on') return true;
  if (V2_RELEASE_MODE === 'opt-in') return readPrivateOptIn(user);
  return false;
}

export function getReleaseGateSnapshot({
  user,
  contractLedger = {},
  level2Slugs = [],
  dataErrors = [],
  behaviorSummary = null,
  qualitySummary = null,
} = {}) {
  const optIn = readPrivateOptIn(user);
  const rollback = readRollbackLatch();
  const checklist = readReleaseChecklist();
  const level2Results = level2Slugs.map((slug) => contractLedger?.[slug]).filter(Boolean);
  const passedLevel2 = level2Results.filter((item) => item.status === 'pass').length;
  const contractComplete = level2Slugs.length > 0 && passedLevel2 === level2Slugs.length;
  const toolBehaviorComplete = Boolean(behaviorSummary?.complete);
  const qualityReady = Boolean(qualitySummary?.qualityReady);
  const manualComplete = Object.values(checklist).every(Boolean);
  const releaseApproved = contractComplete
    && toolBehaviorComplete
    && qualityReady
    && manualComplete
    && !rollback.active
    && (dataErrors?.length || 0) === 0;
  const bootV2 = shouldBootV2({ user, releaseApproved });

  return {
    mode: V2_RELEASE_MODE,
    optIn,
    rollback,
    checklist,
    level2Required: level2Slugs.length,
    level2Passed: passedLevel2,
    contractComplete,
    toolBehaviorComplete,
    behaviorPassed: behaviorSummary?.passed || 0,
    behaviorRequired: behaviorSummary?.required || 0,
    qualityReady,
    routeAuditComplete: Boolean(qualitySummary?.routeAuditComplete),
    accessibilityReady: Boolean(qualitySummary?.accessibilityReady),
    performanceReady: Boolean(qualitySummary?.performanceReady),
    viewportComplete: Boolean(qualitySummary?.viewportComplete),
    dataErrorCount: dataErrors?.length || 0,
    manualComplete,
    releaseApproved,
    bootV2,
    safeDefault: V2_RELEASE_MODE === 'off' || V2_RELEASE_MODE === 'shadow',
  };
}
