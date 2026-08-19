import { V2_RELEASE_CANDIDATE_ID, getReleaseCandidateBinding } from './releaseCandidate.js';
import { summarizeBootstrapRehearsal } from './bootstrapRehearsal.js';

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

function currentRehearsalSummary() {
  const binding = getReleaseCandidateBinding();
  return summarizeBootstrapRehearsal(undefined, {
    candidate: V2_RELEASE_CANDIDATE_ID,
    buildSha: binding.buildSha || '',
  });
}

export function isCurrentBootstrapRehearsalReady() {
  return Boolean(currentRehearsalSummary()?.passed);
}

export function readReleaseChecklist() {
  const current = readJson(CHECKLIST_KEY, {});
  const normalized = { ...DEFAULT_CHECKLIST, ...(current && typeof current === 'object' ? current : {}) };
  if (normalized.ownerApproval && !isCurrentBootstrapRehearsalReady()) {
    normalized.ownerApproval = false;
    writeJson(CHECKLIST_KEY, normalized);
  }
  return normalized;
}

export function setReleaseChecklistItem(key, value) {
  if (!Object.hasOwn(DEFAULT_CHECKLIST, key)) return readReleaseChecklist();
  const current = readReleaseChecklist();
  if (key === 'ownerApproval' && Boolean(value) && !isCurrentBootstrapRehearsalReady()) {
    current.ownerApproval = false;
    writeJson(CHECKLIST_KEY, current);
    return current;
  }
  current[key] = Boolean(value);
  if (!current[key] && key !== 'ownerApproval') current.ownerApproval = false;
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
  structuralSlugs = [],
  level2Slugs = [],
  dataErrors = [],
  behaviorSummary = null,
  qualitySummary = null,
  realEvidenceSummary = null,
} = {}) {
  const requiredStructuralSlugs = structuralSlugs.length ? structuralSlugs : level2Slugs;
  const optIn = readPrivateOptIn(user);
  const rollback = readRollbackLatch();
  const checklist = readReleaseChecklist();
  const rehearsalSummary = currentRehearsalSummary();
  const structuralResults = requiredStructuralSlugs.map((slug) => contractLedger?.[slug]).filter(Boolean);
  const passedStructural = structuralResults.filter((item) => item.status === 'pass').length;
  const contractComplete = requiredStructuralSlugs.length > 0 && passedStructural === requiredStructuralSlugs.length;
  const toolBehaviorComplete = Boolean(behaviorSummary?.complete);
  const qualityReady = Boolean(qualitySummary?.qualityReady);
  const realEvidenceComplete = Boolean(realEvidenceSummary?.complete);
  const bootstrapRehearsalReady = Boolean(rehearsalSummary?.passed);
  const manualComplete = Object.values(checklist).every(Boolean);
  const releaseApproved = contractComplete
    && toolBehaviorComplete
    && qualityReady
    && realEvidenceComplete
    && bootstrapRehearsalReady
    && manualComplete
    && !rollback.active
    && (dataErrors?.length || 0) === 0;
  const bootV2 = shouldBootV2({ user, releaseApproved });

  return {
    mode: V2_RELEASE_MODE,
    optIn,
    rollback,
    checklist,
    structuralRequired: requiredStructuralSlugs.length,
    structuralPassed: passedStructural,
    level2Required: requiredStructuralSlugs.length,
    level2Passed: passedStructural,
    contractComplete,
    toolBehaviorComplete,
    behaviorPassed: behaviorSummary?.passed || 0,
    behaviorRequired: behaviorSummary?.required || 0,
    qualityReady,
    realEvidenceComplete,
    realEvidencePassed: realEvidenceSummary?.passed || 0,
    realEvidenceRequired: realEvidenceSummary?.required || 0,
    realEvidenceFailed: realEvidenceSummary?.failed || 0,
    bootstrapRehearsalReady,
    bootstrapRehearsalStatus: rehearsalSummary?.status || 'stale',
    bootstrapRehearsalCompleted: rehearsalSummary?.completed || 0,
    bootstrapRehearsalRequired: rehearsalSummary?.required || 0,
    dataErrorCount: dataErrors?.length || 0,
    manualComplete,
    releaseApproved,
    bootV2,
    safeDefault: V2_RELEASE_MODE === 'off' || V2_RELEASE_MODE === 'shadow',
  };
}
