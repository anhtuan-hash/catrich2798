import { evaluateBootstrapDecision } from './bootstrapDecision.js';
import { isDeployBoundBuild } from './buildIdentity.js';
import { V2_RELEASE_CANDIDATE_ID } from './releaseCandidate.js';

export const BOOTSTRAP_REHEARSAL_EVENT = 'brian-v2-bootstrap-rehearsal';
export const BOOTSTRAP_REHEARSAL_STORAGE_KEY = 'brian-v2-bootstrap-rehearsal-v1';

function readRaw() {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(BOOTSTRAP_REHEARSAL_STORAGE_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function persist(value) {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(BOOTSTRAP_REHEARSAL_STORAGE_KEY, JSON.stringify(value)); } catch { /* QA evidence is best-effort */ }
    window.dispatchEvent?.(new CustomEvent(BOOTSTRAP_REHEARSAL_EVENT, { detail: value }));
  }
  return value;
}

function approvedPolicy(buildIdentity, mode = 'on') {
  return {
    mode,
    releaseApproved: true,
    approvedCandidate: V2_RELEASE_CANDIDATE_ID,
    approvedBuildSha: buildIdentity.sha,
  };
}

function scenario({ id, label, buildIdentity, policy, optIn = false, rollbackActive = false, expectedEligible, expectedReason }) {
  const actual = evaluateBootstrapDecision({
    buildIdentity,
    policy,
    candidateId: V2_RELEASE_CANDIDATE_ID,
    optIn,
    rollbackActive,
    wired: false,
  });
  const pass = actual.eligible === expectedEligible && actual.reason === expectedReason;
  return {
    id,
    label,
    expected: { eligible: expectedEligible, reason: expectedReason },
    actual: { eligible: actual.eligible, reason: actual.reason, mode: actual.mode },
    pass,
  };
}

export function readBootstrapRehearsalLedger() {
  return readRaw();
}

export function resetBootstrapRehearsalLedger() {
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(BOOTSTRAP_REHEARSAL_STORAGE_KEY); } catch { /* optional */ }
    window.dispatchEvent?.(new CustomEvent(BOOTSTRAP_REHEARSAL_EVENT, { detail: { cleared: true } }));
  }
  return null;
}

export function runBootstrapRehearsal(buildIdentity = {}) {
  const candidate = V2_RELEASE_CANDIDATE_ID;
  const buildSha = String(buildIdentity?.sha || '');
  if (!isDeployBoundBuild(buildIdentity)) {
    return persist({
      schema: 'brian-v2-bootstrap-rehearsal/1',
      candidate,
      buildSha,
      status: 'blocked',
      checkedAt: new Date().toISOString(),
      passed: 0,
      required: 0,
      scenarios: [],
      reason: 'build-not-deploy-bound',
    });
  }

  const exactOn = approvedPolicy(buildIdentity, 'on');
  const exactOptIn = approvedPolicy(buildIdentity, 'opt-in');
  const exactShadow = approvedPolicy(buildIdentity, 'shadow');
  const exactOff = approvedPolicy(buildIdentity, 'off');
  const wrongCandidate = { ...exactOn, approvedCandidate: `${candidate}-wrong` };
  const wrongBuild = { ...exactOn, approvedBuildSha: `${buildSha.slice(0, 40)}x` };
  const unboundIdentity = { ...buildIdentity, sha: '', shortSha: '' };

  const scenarios = [
    scenario({ id: 'unbound-build', label: 'Unbound build falls back to V1', buildIdentity: unboundIdentity, policy: exactOn, expectedEligible: false, expectedReason: 'build-not-deploy-bound' }),
    scenario({ id: 'shadow-safe', label: 'Approved SHADOW still stays on V1', buildIdentity, policy: exactShadow, optIn: true, expectedEligible: false, expectedReason: 'shadow-safe-default' }),
    scenario({ id: 'opt-in-required', label: 'Approved OPT-IN without consent stays on V1', buildIdentity, policy: exactOptIn, expectedEligible: false, expectedReason: 'opt-in-required' }),
    scenario({ id: 'opt-in-approved', label: 'Approved OPT-IN with consent can select V2', buildIdentity, policy: exactOptIn, optIn: true, expectedEligible: true, expectedReason: 'approved-private-opt-in' }),
    scenario({ id: 'global-on', label: 'Approved ON can select V2', buildIdentity, policy: exactOn, expectedEligible: true, expectedReason: 'approved-global-rollout' }),
    scenario({ id: 'release-off', label: 'OFF always stays on V1', buildIdentity, policy: exactOff, optIn: true, expectedEligible: false, expectedReason: 'release-mode-off' }),
    scenario({ id: 'wrong-candidate', label: 'Wrong candidate is rejected', buildIdentity, policy: wrongCandidate, optIn: true, expectedEligible: false, expectedReason: 'release-manifest-not-approved-for-build' }),
    scenario({ id: 'wrong-build', label: 'Wrong build SHA is rejected', buildIdentity, policy: wrongBuild, optIn: true, expectedEligible: false, expectedReason: 'release-manifest-not-approved-for-build' }),
    scenario({ id: 'rollback-wins', label: 'Rollback latch overrides approved ON', buildIdentity, policy: exactOn, optIn: true, rollbackActive: true, expectedEligible: false, expectedReason: 'rollback-latch-active' }),
  ];

  const passed = scenarios.filter((item) => item.pass).length;
  return persist({
    schema: 'brian-v2-bootstrap-rehearsal/1',
    candidate,
    buildSha,
    status: passed === scenarios.length ? 'pass' : 'fail',
    checkedAt: new Date().toISOString(),
    passed,
    required: scenarios.length,
    scenarios,
    reason: passed === scenarios.length ? 'all-bootstrap-scenarios-pass' : 'bootstrap-scenario-regression',
  });
}

export function summarizeBootstrapRehearsal(ledger = readRaw(), { candidate = V2_RELEASE_CANDIDATE_ID, buildSha = '' } = {}) {
  const current = Boolean(ledger && ledger.candidate === candidate && buildSha && ledger.buildSha === buildSha);
  const passed = current && ledger.status === 'pass' && ledger.required > 0 && ledger.passed === ledger.required;
  return {
    current,
    passed,
    status: current ? ledger.status : 'stale',
    checkedAt: current ? ledger.checkedAt || '' : '',
    required: current ? Number(ledger.required || 0) : 0,
    completed: current ? Number(ledger.passed || 0) : 0,
    ledger: current ? ledger : null,
  };
}
