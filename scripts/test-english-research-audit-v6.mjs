import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { evaluateLearner } from '../src/features/english-early-warning/earlyWarningEngine.js';
import { buildResearchEvidence, researchReportMarkdown } from '../src/features/english-early-warning/researchEvidence.js';
import { createAuditManifest, verifyAuditManifest, researchReadiness, sha256Text } from '../src/features/english-early-warning/researchAudit.js';

const ids=['P001','P002','P003','P004','P005'];
const results=ids.map((studentId,index)=>evaluateLearner({
  studentId,
  scores:{listening:45,speaking:55,reading:55,writing:55},
  post:{listening:55+index,speaking:60,reading:65,writing:60},
  recent1:50,recent2:50,missing14d:2,
}));
const evidence=buildResearchEvidence(results,{},[]);
const report=researchReportMarkdown(evidence,'2026-11-14T10:00:00.000Z');
const manifest=await createAuditManifest(report,evidence,'2026-11-14T10:00:00.000Z',webcrypto);
assert.match(manifest.reportSha256,/^[0-9a-f]{64}$/);
assert.equal(manifest.reportSizeBytes,new TextEncoder().encode(report).byteLength);
assert.equal(manifest.sample.completePaired,5);
assert.equal(manifest.attestations.effectCausalityEstablished,false);
assert.equal(manifest.attestations.institutionalDataProcessingApprovalVerifiedBySystem,false);
assert.ok(!JSON.stringify(manifest).includes('P001'));
assert.equal((await verifyAuditManifest(report,manifest,webcrypto)).ok,true);
assert.equal((await verifyAuditManifest(report+'edited',manifest,webcrypto)).ok,false);
assert.equal((await verifyAuditManifest('X'+report.slice(1),manifest,webcrypto)).ok,false);
assert.equal((await verifyAuditManifest(report,{...manifest, reportSha256:'bad'},webcrypto)).ok,false);
assert.equal(await sha256Text('abc',webcrypto),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
const readiness=researchReadiness(evidence);
assert.equal(readiness.total,4);
assert.equal(readiness.eligibleForOfficialSubmission,false);
assert.equal(readiness.tasks.find(x=>x.key==='baseline').done,true);
assert.equal(readiness.tasks.find(x=>x.key==='review').done,false);
assert.equal(readiness.tasks.find(x=>x.key==='intervention').done,false);
assert.equal(readiness.tasks.find(x=>x.key==='outcomes').done,true);
assert.equal(readiness.minimumPairsForRestrictedExport,true);
const none=researchReadiness(buildResearchEvidence([]));
assert.equal(none.completed,0);
assert.equal(none.eligibleForOfficialSubmission,false);
console.log('[PASS] V6: SHA-256 verification, tampering detection, no student IDs in manifest and submission gate');
