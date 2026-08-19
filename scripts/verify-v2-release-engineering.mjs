import assert from 'node:assert/strict';
import { evaluateBootstrapDecision } from '../src/ui/v2/bootstrapDecision.js';
import { attachReleaseEvidenceIntegrity, verifyReleaseEvidencePack } from '../src/ui/v2/releaseEvidenceIntegrity.js';
import { V2_TOOL_BRIDGE } from '../src/ui/v2/toolBridgeRegistry.js';
import { TOOL_BEHAVIOR_MANIFEST, readToolBehaviorLedger } from '../src/ui/v2/toolBehaviorManifest.js';

const candidate = 'rc-ci-test';
const sha = 'a'.repeat(40);
const buildIdentity = { sha, shortSha: sha.slice(0, 10), environment: 'preview', ref: 'ui-v2-shadow' };

function policy(mode = 'on', overrides = {}) {
  return {
    mode,
    releaseApproved: true,
    approvedCandidate: candidate,
    approvedBuildSha: sha,
    ...overrides,
  };
}

const decisionCases = [
  { id: 'unbound', buildIdentity: { ...buildIdentity, sha: '', shortSha: '' }, policy: policy('on'), expected: [false, 'build-not-deploy-bound'] },
  { id: 'shadow', buildIdentity, policy: policy('shadow'), optIn: true, expected: [false, 'shadow-safe-default'] },
  { id: 'opt-in-required', buildIdentity, policy: policy('opt-in'), expected: [false, 'opt-in-required'] },
  { id: 'opt-in-approved', buildIdentity, policy: policy('opt-in'), optIn: true, expected: [true, 'approved-private-opt-in'] },
  { id: 'global-on', buildIdentity, policy: policy('on'), expected: [true, 'approved-global-rollout'] },
  { id: 'off', buildIdentity, policy: policy('off'), optIn: true, expected: [false, 'release-mode-off'] },
  { id: 'wrong-candidate', buildIdentity, policy: policy('on', { approvedCandidate: `${candidate}-wrong` }), optIn: true, expected: [false, 'release-manifest-not-approved-for-build'] },
  { id: 'wrong-build', buildIdentity, policy: policy('on', { approvedBuildSha: 'b'.repeat(40) }), optIn: true, expected: [false, 'release-manifest-not-approved-for-build'] },
  { id: 'rollback-wins', buildIdentity, policy: policy('on'), optIn: true, rollbackActive: true, expected: [false, 'rollback-latch-active'] },
];

for (const testCase of decisionCases) {
  const result = evaluateBootstrapDecision({
    buildIdentity: testCase.buildIdentity,
    policy: testCase.policy,
    candidateId: candidate,
    optIn: Boolean(testCase.optIn),
    rollbackActive: Boolean(testCase.rollbackActive),
    wired: false,
  });
  assert.equal(result.eligible, testCase.expected[0], `${testCase.id}: eligible mismatch`);
  assert.equal(result.reason, testCase.expected[1], `${testCase.id}: reason mismatch`);
}

const unsignedPack = {
  schema: 'brian-v2-release-evidence/ci-test',
  candidate,
  build: { sha, shortSha: sha.slice(0, 10), environment: 'preview' },
  candidateBinding: { id: candidate, buildSha: sha, scopeId: `${candidate}@${sha}` },
  structuralContracts: { sample: { status: 'pass' } },
  toolBehavior: { sample: { workflow: true } },
  routeQuality: { routes: {} },
  realDeviceEvidence: {},
};

const signedPack = await attachReleaseEvidenceIntegrity(unsignedPack);
const verified = await verifyReleaseEvidencePack(signedPack, { candidate, buildSha: sha });
assert.equal(verified.valid, true, 'fresh Evidence Pack must verify');
assert.equal(verified.digestMatch, true, 'fresh Evidence Pack digest must match');

const tampered = JSON.parse(JSON.stringify(signedPack));
tampered.structuralContracts.sample.status = 'fail';
const tamperResult = await verifyReleaseEvidencePack(tampered, { candidate, buildSha: sha });
assert.equal(tamperResult.valid, false, 'tampered Evidence Pack must fail');
assert.equal(tamperResult.digestMatch, false, 'tampering must produce digest mismatch');

const wrongScope = await verifyReleaseEvidencePack(signedPack, { candidate: `${candidate}-other`, buildSha: sha });
assert.equal(wrongScope.valid, false, 'wrong candidate scope must fail');
assert.equal(wrongScope.digestMatch, true, 'scope mismatch must not corrupt digest');
assert.equal(wrongScope.candidateMatch, false, 'wrong candidate must be identified');

const bridgeEntries = Object.entries(V2_TOOL_BRIDGE);
assert.equal(bridgeEntries.length, 14, 'expected exactly 14 release bridge tools');
for (const [slug, meta] of bridgeEntries) {
  assert.equal(meta.tested, true, `${slug}: bridge must remain tested`);
  assert.equal(Number(meta.level), 2, `${slug}: every release bridge must remain Level 2`);
  assert.ok(TOOL_BEHAVIOR_MANIFEST[slug], `${slug}: missing behavior manifest`);
  const checks = TOOL_BEHAVIOR_MANIFEST[slug].checks || [];
  assert.equal(checks.length, 3, `${slug}: expected three behavior checks`);
  assert.equal(new Set(checks.map((item) => item.id)).size, checks.length, `${slug}: duplicate behavior check id`);
}

const behaviorTotal = bridgeEntries.reduce((sum, [slug]) => sum + (TOOL_BEHAVIOR_MANIFEST[slug]?.checks?.length || 0), 0);
assert.equal(behaviorTotal, 42, 'expected 42 total release behavior checks');

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

const storage = new MemoryStorage();
globalThis.window = { localStorage: storage, dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
const { V2_RELEASE_CANDIDATE_ID } = await import('../src/ui/v2/releaseCandidate.js');
const realCandidate = V2_RELEASE_CANDIDATE_ID;
storage.setItem('brian-v2-release-candidate-binding-v1', JSON.stringify({
  id: realCandidate,
  buildSha: sha,
  scopeId: `${realCandidate}@${sha}`,
}));
storage.setItem('brian-ui-v2-release-checklist-v1', JSON.stringify({
  responsive: true,
  accessibility: true,
  performance: true,
  behavior: true,
  ci: true,
  ownerApproval: true,
}));

const { readReleaseChecklist } = await import('../src/ui/v2/releaseGate.js');
const staleChecklist = readReleaseChecklist();
assert.equal(staleChecklist.ownerApproval, false, 'stale rehearsal must invalidate owner approval');
const persistedAfterInvalidation = JSON.parse(storage.getItem('brian-ui-v2-release-checklist-v1'));
assert.equal(persistedAfterInvalidation.ownerApproval, false, 'owner approval invalidation must persist to storage');

storage.setItem('brian-v2-bootstrap-rehearsal-v1', JSON.stringify({
  schema: 'brian-v2-bootstrap-rehearsal/1',
  candidate: realCandidate,
  buildSha: sha,
  status: 'pass',
  checkedAt: new Date().toISOString(),
  passed: 9,
  required: 9,
  scenarios: [],
  reason: 'all-bootstrap-scenarios-pass',
}));
const afterRehearsalReturns = readReleaseChecklist();
assert.equal(afterRehearsalReturns.ownerApproval, false, 'old owner approval must not resurrect when rehearsal later passes');

const { readToolBehaviorDetailLedger, setToolBehaviorEvidence } = await import('../src/ui/v2/toolBehaviorEvidence.js');
let detailLedger = setToolBehaviorEvidence('knowledge-train', 'edit-play', 'pass', 'CI behavior evidence');
assert.equal(detailLedger['knowledge-train']['edit-play'].status, 'pass', 'detailed behavior PASS must persist');
assert.equal(readToolBehaviorLedger()['knowledge-train']['edit-play'], true, 'detailed PASS must set core behavior ledger true');
detailLedger = setToolBehaviorEvidence('knowledge-train', 'edit-play', 'fail', 'CI forced failure');
assert.equal(detailLedger['knowledge-train']['edit-play'].status, 'fail', 'detailed behavior FAIL must persist');
assert.equal(readToolBehaviorLedger()['knowledge-train']['edit-play'], false, 'detailed FAIL must clear core behavior PASS');
assert.equal(readToolBehaviorDetailLedger()['knowledge-train']['edit-play'].note, 'CI forced failure', 'detailed behavior note must persist');

delete globalThis.window;
delete globalThis.CustomEvent;

console.log(`Brian V2 release engineering contracts PASS: ${decisionCases.length} boot cases · 14 Level-2 tools · ${behaviorTotal} behavior checks · SHA-256 tamper detection · stale owner approval protection · detailed behavior evidence bridge`);
