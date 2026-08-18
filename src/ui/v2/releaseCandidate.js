import { readCachedBuildIdentity } from './buildIdentity.js';

export const V2_RELEASE_CANDIDATE_ID = 'rc-2026-08-19-01';
const BINDING_KEY = 'brian-v2-release-candidate-binding-v1';

const EVIDENCE_KEYS = [
  'brian-v2-tool-contract-ledger-v1',
  'brian-v2-tool-behavior-ledger-v1',
  'brian-v2-quality-ledger-v1',
  'brian-v2-real-device-evidence-v1',
  'brian-ui-v2-release-checklist-v1',
];

function readBinding() {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(BINDING_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function clearEvidence() {
  if (typeof window === 'undefined') return;
  EVIDENCE_KEYS.forEach((key) => {
    try { window.localStorage.removeItem(key); } catch { /* QA evidence reset is best-effort */ }
  });
}

function desiredScope(buildIdentity = readCachedBuildIdentity()) {
  const buildSha = String(buildIdentity?.sha || '').trim();
  return {
    id: V2_RELEASE_CANDIDATE_ID,
    buildSha,
    scopeId: buildSha ? `${V2_RELEASE_CANDIDATE_ID}@${buildSha}` : V2_RELEASE_CANDIDATE_ID,
  };
}

export function ensureReleaseCandidateEvidenceScope({ buildIdentity = readCachedBuildIdentity() } = {}) {
  if (typeof window === 'undefined') return { ...desiredScope(buildIdentity), reset: false, previousId: '', previousBuildSha: '', resetAt: '' };

  const previous = readBinding();
  const desired = desiredScope(buildIdentity);

  if (desired.buildSha && previous?.scopeId === desired.scopeId) {
    return { ...previous, reset: false, buildPending: false };
  }

  if (!desired.buildSha && previous?.id === V2_RELEASE_CANDIDATE_ID) {
    return { ...previous, reset: false, buildPending: true };
  }

  clearEvidence();
  const next = {
    ...desired,
    previousId: previous?.id || '',
    previousBuildSha: previous?.buildSha || '',
    reset: true,
    buildPending: !desired.buildSha,
    resetReason: previous?.id && previous.id !== desired.id ? 'candidate-changed' : previous?.buildSha && previous.buildSha !== desired.buildSha ? 'build-changed' : 'scope-initialized',
    resetAt: new Date().toISOString(),
  };
  try { window.localStorage.setItem(BINDING_KEY, JSON.stringify(next)); } catch { /* optional local binding */ }
  return next;
}

export function getReleaseCandidateBinding() {
  return readBinding() || { ...desiredScope(), previousId: '', previousBuildSha: '', reset: false, buildPending: true, resetAt: '' };
}
