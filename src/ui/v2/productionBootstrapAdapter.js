import { readPrivateOptIn, readRollbackLatch } from './releaseGate.js';
import { V2_RELEASE_CANDIDATE_ID } from './releaseCandidate.js';
import { isDeployBoundBuild } from './buildIdentity.js';

function normalizeMode(value) {
  const mode = String(value || 'shadow').toLowerCase();
  return ['off', 'shadow', 'opt-in', 'on'].includes(mode) ? mode : 'shadow';
}

export function getPreparedProductionBootstrapPlan({ user, buildIdentity } = {}) {
  const policy = buildIdentity?.releasePolicy || {};
  const mode = normalizeMode(policy.mode);
  const rollback = readRollbackLatch();
  const optIn = readPrivateOptIn(user);
  const deployBound = isDeployBoundBuild(buildIdentity);
  const candidateMatch = Boolean(policy.approvedCandidate && policy.approvedCandidate === V2_RELEASE_CANDIDATE_ID);
  const buildMatch = Boolean(buildIdentity?.sha && policy.approvedBuildSha && policy.approvedBuildSha === buildIdentity.sha);
  const approvalMatch = Boolean(policy.releaseApproved && candidateMatch && buildMatch);

  let eligible = false;
  let reason = 'shadow-safe-default';
  if (rollback.active) reason = 'rollback-latch-active';
  else if (!deployBound) reason = 'build-not-deploy-bound';
  else if (!approvalMatch) reason = 'release-manifest-not-approved-for-build';
  else if (mode === 'on') { eligible = true; reason = 'approved-global-rollout'; }
  else if (mode === 'opt-in' && optIn) { eligible = true; reason = 'approved-private-opt-in'; }
  else if (mode === 'opt-in') reason = 'opt-in-required';
  else if (mode === 'off') reason = 'release-mode-off';

  return {
    wired: false,
    eligible,
    reason,
    mode,
    deployBound,
    releaseApproved: Boolean(policy.releaseApproved),
    candidateMatch,
    buildMatch,
    approvalMatch,
    optIn,
    rollbackActive: Boolean(rollback.active),
    candidate: V2_RELEASE_CANDIDATE_ID,
    buildSha: buildIdentity?.sha || '',
  };
}
