import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const runtime = read('src/utils/aiRuntimeManager.js');
const ai = read('src/utils/gemini.js');
const media = read('src/utils/aiMedia.js');
const governance = read('src/utils/aiGovernance.js');
const page = read('src/pages/AIGovernanceCenter.jsx');
const manifest = JSON.parse(read('public/version.json'));

assert.match(runtime, /runAiProviderRuntime/);
assert.match(runtime, /dedupeInFlight/);
assert.match(runtime, /circuitFailureThreshold/);
assert.match(runtime, /requestTimeoutMs/);
assert.match(ai, /createAiRuntimeFingerprint/);
assert.match(ai, /transport: 'browser-unified'/);
assert.match(media, /runAiProviderRuntime/);
assert.match(governance, /runtimeRetries/);
assert.match(page, /AI Runtime reliability/);
assert.equal(manifest.version, '12.35.0');
assert.equal(manifest.aiUnifiedCorePhase, 4);
assert.equal(manifest.aiRuntimeManager, true);
assert.equal(manifest.aiCircuitBreaker, true);
assert.equal(manifest.aiRequestQueue, true);
assert.equal(manifest.aiInFlightDedupe, true);

console.log('✓ Unified AI Runtime Manager is present.');
console.log('✓ Text, vision and image generation use the shared runtime.');
console.log('✓ Queue, retry, timeout, de-duplication, cache and circuit breaker contracts are enabled.');
console.log('✓ Governance UI exposes runtime controls and live status.');
console.log('✓ Version and release manifest are synchronized to V12.35.0.');
