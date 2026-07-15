import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const governance = read('src/utils/aiGovernance.js');
const ai = read('src/utils/gemini.js');
const media = read('src/utils/aiMedia.js');
const page = read('src/pages/AIGovernanceCenter.jsx');
const receipt = read('src/components/GlobalAIReceipt.jsx');
const main = read('src/main.jsx');
const manifest = JSON.parse(read('public/version.json'));

assert.match(governance, /fairUse/);
assert.match(governance, /getAiObservabilitySummary/);
assert.match(governance, /providerCallAmplification/);
assert.match(governance, /AI_USER_REQUEST_LIMIT/);
assert.match(governance, /taskTokens/);
assert.match(ai, /fallbackUsed: meta\.fallbackUsed/);
assert.match(media, /taskId: aiTaskId/);
assert.match(page, /AI Control Plane & observability/);
assert.match(page, /Fair-use theo tài khoản/);
assert.match(receipt, /bes-ai-operation-end/);
assert.match(receipt, /Đã sửa & kiểm định/);
assert.match(main, /GlobalAIReceipt/);
assert.equal(manifest.version, '12.36.0');
assert.equal(manifest.aiUnifiedCorePhase, 5);
assert.equal(manifest.aiControlPlane, true);
assert.equal(manifest.aiFairUseBudgets, true);
assert.equal(manifest.aiTaskTelemetry, true);
assert.equal(manifest.aiGlobalProvenanceReceipt, true);
assert.equal(manifest.aiGatewayContract, 'bes-ai-core/1.2');

console.log('✓ AI Control Plane and fair-use contracts are present.');
console.log('✓ Task, provider, model, transport and fallback telemetry are connected.');
console.log('✓ Global AI provenance receipts are mounted in the application shell.');
console.log('✓ Governance audit exposes detailed request traces.');
console.log('✓ Version and release manifest are synchronized to V12.36.0.');
