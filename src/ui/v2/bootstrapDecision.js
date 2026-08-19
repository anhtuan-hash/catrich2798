function normalizeMode(value) {
  const mode = String(value || 'shadow').trim().toLowerCase();
  return ['off', 'shadow', 'opt-in', 'on'].includes(mode) ? mode : 'shadow';
}

function deployBound(identity = {}) {
  const environment = String(identity?.environment || '').trim().toLowerCase();
  return Boolean(identity?.sha && ['preview', 'production'].includes(environment));
}

export function evaluateBootstrapDecision({
  buildIdentity = {},
  policy = buildIdentity?.releasePolicy || {},
  candidateId = '',
  optIn = false,
  rollbackActive = false,
  wired = false,
} = {}) {
  const mode = normalizeMode(policy?.mode);
  const isDeployBound = deployBound(buildIdentity);
  const candidateMatch = Boolean(policy?.approvedCandidate && candidateId && policy.approvedCandidate === candidateId);
  const buildMatch = Boolean(buildIdentity?.sha && policy?.approvedBuildSha && policy.approvedBuildSha === buildIdentity.sha);
  const approvalMatch = Boolean(policy?.releaseApproved && candidateMatch && buildMatch);

  let eligible = false;
  let reason = 'shadow-safe-default';
  if (rollbackActive) reason = 'rollback-latch-active';
  else if (!isDeployBound) reason = 'build-not-deploy-bound';
  else if (!approvalMatch) reason = 'release-manifest-not-approved-for-build';
  else if (mode === 'on') {
    eligible = true;
    reason = 'approved-global-rollout';
  } else if (mode === 'opt-in' && optIn) {
    eligible = true;
    reason = 'approved-private-opt-in';
  } else if (mode === 'opt-in') reason = 'opt-in-required';
  else if (mode === 'off') reason = 'release-mode-off';

  return {
    wired: Boolean(wired),
    eligible,
    reason,
    mode,
    deployBound: isDeployBound,
    releaseApproved: Boolean(policy?.releaseApproved),
    candidateMatch,
    buildMatch,
    approvalMatch,
    optIn: Boolean(optIn),
    rollbackActive: Boolean(rollbackActive),
    candidate: candidateId,
    buildSha: String(buildIdentity?.sha || ''),
  };
}
