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

export function ensureReleaseCandidateEvidenceScope() {
  if (typeof window === 'undefined') return { id: V2_RELEASE_CANDIDATE_ID, reset: false, previousId: '', resetAt: '' };
  const previous = readBinding();
  if (previous?.id === V2_RELEASE_CANDIDATE_ID) return { ...previous, reset: false, previousId: previous.previousId || '' };

  EVIDENCE_KEYS.forEach((key) => {
    try { window.localStorage.removeItem(key); } catch { /* QA evidence reset is best-effort */ }
  });

  const next = {
    id: V2_RELEASE_CANDIDATE_ID,
    previousId: previous?.id || '',
    reset: true,
    resetAt: new Date().toISOString(),
  };
  try { window.localStorage.setItem(BINDING_KEY, JSON.stringify(next)); } catch { /* optional local binding */ }
  return next;
}

export function getReleaseCandidateBinding() {
  return readBinding() || { id: V2_RELEASE_CANDIDATE_ID, previousId: '', reset: false, resetAt: '' };
}
