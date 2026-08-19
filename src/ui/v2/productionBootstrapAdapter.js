import { readPrivateOptIn, readRollbackLatch } from './releaseGate.js';
import { V2_RELEASE_CANDIDATE_ID } from './releaseCandidate.js';
import { evaluateBootstrapDecision } from './bootstrapDecision.js';

export function getPreparedProductionBootstrapPlan({ user, buildIdentity } = {}) {
  const rollback = readRollbackLatch();
  return evaluateBootstrapDecision({
    buildIdentity,
    policy: buildIdentity?.releasePolicy || {},
    candidateId: V2_RELEASE_CANDIDATE_ID,
    optIn: readPrivateOptIn(user),
    rollbackActive: Boolean(rollback.active),
    wired: false,
  });
}
