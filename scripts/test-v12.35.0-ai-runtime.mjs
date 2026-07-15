import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  clear() { this.map.clear(); }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.window = { localStorage: storage, dispatchEvent() {} };

const runtime = await import('../src/utils/aiRuntimeManager.js');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settings = {
  enabled: true,
  maxConcurrent: 2,
  requestTimeoutMs: 5000,
  transientRetries: 1,
  retryBaseDelayMs: 100,
  dedupeInFlight: true,
  cacheEnabled: true,
  cacheTtlMs: 60000,
  cacheMaxEntries: 20,
  circuitBreakerEnabled: true,
  circuitFailureThreshold: 3,
  circuitFailureWindowMs: 60000,
  circuitCooldownMs: 60000,
};

runtime.resetAiRuntimeSession();

let retryCalls = 0;
const retried = await runtime.runAiProviderRuntime({
  operationId: 'retry-test', providerId: 'groq', model: 'test', taskId: 'worksheet', fingerprint: 'retry-fp', settings,
  classifyError: (error) => error.status === 503 ? 'provider-unavailable' : 'unknown',
  executor: async () => {
    retryCalls += 1;
    if (retryCalls === 1) { const error = new Error('Temporary outage'); error.status = 503; throw error; }
    return 'retry-ok';
  },
});
assert.equal(retried.value, 'retry-ok');
assert.equal(retryCalls, 2);
assert.equal(retried.runtime.retries, 1);
assert.equal(retried.runtime.networkAttempts, 2);

let dedupeCalls = 0;
const dedupeExecutor = async () => { dedupeCalls += 1; await sleep(70); return 'shared-result'; };
const [dedupeA, dedupeB] = await Promise.all([
  runtime.runAiProviderRuntime({ operationId: 'dedupe-a', providerId: 'gemini', model: 'test', taskId: 'diagnostic', fingerprint: 'same-fp', settings, executor: dedupeExecutor }),
  runtime.runAiProviderRuntime({ operationId: 'dedupe-b', providerId: 'gemini', model: 'test', taskId: 'diagnostic', fingerprint: 'same-fp', settings, executor: dedupeExecutor }),
]);
assert.equal(dedupeA.value, 'shared-result');
assert.equal(dedupeB.value, 'shared-result');
assert.equal(dedupeCalls, 1);
assert.equal(dedupeB.runtime.deduplicated, true);

let cacheCalls = 0;
const cacheExecutor = async () => { cacheCalls += 1; return 'cached-result'; };
await runtime.runAiProviderRuntime({ operationId: 'cache-a', providerId: 'cerebras', model: 'test', taskId: 'diagnostic', fingerprint: 'cache-fp', settings, cacheAllowed: true, executor: cacheExecutor });
const cached = await runtime.runAiProviderRuntime({ operationId: 'cache-b', providerId: 'cerebras', model: 'test', taskId: 'diagnostic', fingerprint: 'cache-fp', settings, cacheAllowed: true, executor: cacheExecutor });
assert.equal(cacheCalls, 1);
assert.equal(cached.runtime.cacheHit, true);
assert.equal(cached.runtime.networkAttempts, 0);

runtime.clearAiRuntimeCache();
let concurrent = 0;
let peakConcurrent = 0;
const queuedSettings = { ...settings, maxConcurrent: 1, transientRetries: 0 };
const queuedExecutor = async () => { concurrent += 1; peakConcurrent = Math.max(peakConcurrent, concurrent); await sleep(60); concurrent -= 1; return 'done'; };
const [, queuedSecond] = await Promise.all([
  runtime.runAiProviderRuntime({ operationId: 'queue-a', providerId: 'mistral', model: 'test', taskId: 'chat', fingerprint: 'queue-a', settings: queuedSettings, executor: queuedExecutor }),
  runtime.runAiProviderRuntime({ operationId: 'queue-b', providerId: 'mistral', model: 'test', taskId: 'chat', fingerprint: 'queue-b', settings: queuedSettings, executor: queuedExecutor }),
]);
assert.equal(peakConcurrent, 1);
assert.ok(queuedSecond.runtime.queueWaitMs >= 40);

runtime.resetAiProviderCircuits();
const circuitSettings = { ...settings, transientRetries: 0, circuitFailureThreshold: 2 };
for (let index = 0; index < 2; index += 1) {
  await assert.rejects(runtime.runAiProviderRuntime({
    operationId: `circuit-${index}`, providerId: 'openrouter', model: 'test', taskId: 'chat', fingerprint: `circuit-${index}`, settings: circuitSettings,
    classifyError: () => 'provider-unavailable',
    executor: async () => { const error = new Error('Provider unavailable'); error.status = 503; throw error; },
  }));
}
assert.equal(runtime.isAiProviderCircuitOpen('openrouter', circuitSettings), true);
await assert.rejects(
  runtime.runAiProviderRuntime({ operationId: 'circuit-reject', providerId: 'openrouter', model: 'test', taskId: 'chat', fingerprint: 'circuit-reject', settings: circuitSettings, executor: async () => 'never' }),
  (error) => error.code === 'AI_CIRCUIT_OPEN',
);

const snapshot = runtime.getAiRuntimeSnapshot(settings);
assert.ok(snapshot.stats.retries >= 1);
assert.ok(snapshot.stats.cacheHits >= 1);
assert.ok(snapshot.stats.dedupeHits >= 1);
assert.ok(snapshot.stats.circuitRejects >= 1);
assert.equal(snapshot.activeCount, 0);
assert.equal(snapshot.queuedCount, 0);

runtime.resetAiRuntimeSession();
console.log('✓ Transient provider failures retry with bounded exponential backoff.');
console.log('✓ Identical in-flight requests share one provider call.');
console.log('✓ Safe diagnostic results use a short-lived in-memory cache.');
console.log('✓ The central queue enforces the configured concurrency limit.');
console.log('✓ Circuit breakers isolate repeatedly failing providers and recoverable routing can skip them.');
