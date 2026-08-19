import { V2_RELEASE_CANDIDATE_ID, getReleaseCandidateBinding } from './releaseCandidate.js';
import { readCachedBuildIdentity } from './buildIdentity.js';
import { readBootstrapRehearsalLedger } from './bootstrapRehearsal.js';
import { attachReleaseEvidenceIntegrity } from './releaseEvidenceIntegrity.js';

function compactUser(user) {
  if (!user) return null;
  return { id: user.id || null, role: user.role || null };
}

function compactBuild(identity = {}) {
  return {
    provider: identity.provider || '',
    sha: identity.sha || '',
    shortSha: identity.shortSha || '',
    ref: identity.ref || '',
    environment: identity.environment || '',
    url: identity.url || '',
    resolvedAt: identity.resolvedAt || '',
    error: identity.error || '',
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
  buildIdentity = readCachedBuildIdentity(),
  candidateBinding = getReleaseCandidateBinding(),
  bootstrapPlan = null,
  bootstrapRehearsal = readBootstrapRehearsalLedger(),
} = {}) {
  return {
    schema: 'brian-v2-release-evidence/3',
    candidate: V2_RELEASE_CANDIDATE_ID,
    candidateBinding,
    build: compactBuild(buildIdentity),
    generatedAt: new Date().toISOString(),
    context: {
      user: compactUser(user),
      href: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 } : null,
    },
    productionBootstrap: bootstrapPlan ? {
      wired: Boolean(bootstrapPlan.wired),
      eligible: Boolean(bootstrapPlan.eligible),
      reason: bootstrapPlan.reason || '',
      mode: bootstrapPlan.mode || 'shadow',
      deployBound: Boolean(bootstrapPlan.deployBound),
      approvalMatch: Boolean(bootstrapPlan.approvalMatch),
      candidateMatch: Boolean(bootstrapPlan.candidateMatch),
      buildMatch: Boolean(bootstrapPlan.buildMatch),
    } : null,
    bootstrapRehearsal: bootstrapRehearsal || null,
    releaseGate: snapshot || null,
    checklist: checklist || {},
    structuralContracts: contractLedger || {},
    toolBehavior: behaviorLedger || {},
    routeQuality: qualityLedger || {},
    realDeviceEvidence: realDeviceEvidence || {},
    dataErrors: Array.isArray(dataErrors) ? dataErrors.map((item) => ({ source: item?.source || '', message: item?.message || String(item || '') })) : [],
  };
}

export async function downloadReleaseEvidencePack(args = {}) {
  if (typeof window === 'undefined') return false;
  const pack = await attachReleaseEvidenceIntegrity(buildReleaseEvidencePack(args));
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const buildSuffix = pack.build?.shortSha ? `-${pack.build.shortSha}` : '-unbound';
  anchor.href = url;
  anchor.download = `brian-v2-evidence-${V2_RELEASE_CANDIDATE_ID}${buildSuffix}.json`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
  return true;
}
