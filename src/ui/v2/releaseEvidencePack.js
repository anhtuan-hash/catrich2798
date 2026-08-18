import { V2_RELEASE_CANDIDATE_ID } from './releaseCandidate.js';

function compactUser(user) {
  if (!user) return null;
  return {
    id: user.id || null,
    role: user.role || null,
  };
}

export function buildReleaseEvidencePack({
  user,
  snapshot,
  checklist,
  contractLedger,
  behaviorLedger,
  qualityLedger,
  realDeviceEvidence,
  dataErrors,
} = {}) {
  return {
    schema: 'brian-v2-release-evidence/1',
    candidate: V2_RELEASE_CANDIDATE_ID,
    generatedAt: new Date().toISOString(),
    context: {
      user: compactUser(user),
      href: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 } : null,
    },
    releaseGate: snapshot || null,
    checklist: checklist || {},
    structuralContracts: contractLedger || {},
    toolBehavior: behaviorLedger || {},
    routeQuality: qualityLedger || {},
    realDeviceEvidence: realDeviceEvidence || {},
    dataErrors: Array.isArray(dataErrors) ? dataErrors.map((item) => ({ source: item?.source || '', message: item?.message || String(item || '') })) : [],
  };
}

export function downloadReleaseEvidencePack(args = {}) {
  if (typeof window === 'undefined') return false;
  const pack = buildReleaseEvidencePack(args);
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `brian-v2-evidence-${V2_RELEASE_CANDIDATE_ID}.json`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
  return true;
}
